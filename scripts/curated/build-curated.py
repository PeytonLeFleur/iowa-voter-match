#!/usr/bin/env python3
"""
Editorial layer for Iowa Voter Match, drafted from
research/raw/candidate-positions-2026-10-12.md.

Writes data/candidates.json, sources.json, statements.json, questions.json and
positions.json. Every record here is an editorial DRAFT (reviewStatus "draft")
until a human reviewer signs off on /internal/audit.

Rules applied while drafting:
  * A `quote` is only the candidate's own words, copied verbatim from the research.
    Reported paraphrases go in `summary` with attribution "paraphrase".
  * A statement is "verified" only when the research names its source outlet.
    Statements the research does not attribute are "unverified".
  * A position is "verified" only when at least one verified statement supports it.
  * Option relations are given only for EP/SP/DA evidence and only where the
    documented stance speaks to that option; otherwise "unaddressed".
  * Evidence is never transferred between questions (a general principle does
    not establish a position on a specific bill).

Run: python3 scripts/curated/build-curated.py
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
CUTOFF = "2026-10-12"
RAW = (ROOT / "research/raw/candidate-positions-2026-10-12.md").read_text()

SAND, LAHN = "rob-sand", "zach-lahn"

# --------------------------------------------------------------------------
# Candidates
# --------------------------------------------------------------------------
candidates = [
    {
        "id": SAND, "slug": SAND, "name": "Rob Sand", "sortName": "Sand",
        "party": "Democratic",
        "role": "Iowa State Auditor since January 2019",
        "runningMate": "Dave Muhlbauer",
        "summary": "Democratic nominee; the only Democrat to qualify for the primary ballot. State Auditor since January 2019 (reelected in 2022 by 2,893 votes); assistant attorney general 2010 to 2017, prosecuting public corruption. Decorah native.",
        "campaignUrl": "https://robsand.com",
        "unansweredTopics": [
            "Pipelines: HF 2104 and IUC criteria.",
            "Medicaid: work rule timing, and the cost of ending managed care.",
            "Water: HF 2771.",
            "Elections: voting laws.",
            "Immigration: ICE and 287(g).",
            "Guns: a current firearms position.",
            "Civil rights and schools: SF 579 and SF 496.",
            "Labor: public-sector bargaining.",
            "Costs: pre-K, school meals and the 5% aid increase.",
        ],
    },
    {
        "id": LAHN, "slug": LAHN, "name": "Zach Lahn", "sortName": "Lahn",
        "party": "Republican",
        "role": "Businessman and farmer; first run for office",
        "runningMate": "State Rep. Derek Wulf",
        "summary": "Republican nominee; won the June 2, 2026 five-way primary with 37.97% of the vote. No elected office. Former interim state director of Americans for Prosperity Montana; co-founded the Wonder private school in Wichita, Kansas, in 2018; family farm near Belle Plaine.",
        "campaignUrl": "https://zachlahn.com",
        "unansweredTopics": [
            "Abortion: exceptions in his own words, and HF 2788.",
            "Contraception.",
            "Civil rights: SF 418 and SF 579.",
            "Guns.",
            "Immigration: ICE and E-Verify.",
            "Labor: minimum wage and public-sector bargaining.",
            "Child care.",
            "Medicaid: work rule timing.",
            "Taxes: offsets for eliminating taxes.",
            "Pipelines: HF 2104.",
            "Water: HF 2771.",
            "Elections: voting laws.",
            "Legal questions: how land confiscation would work, and the H-1B ban.",
        ],
    },
]

# --------------------------------------------------------------------------
# Sources. URLs only where the research gives them; never constructed.
# --------------------------------------------------------------------------
def src(id, title, publisher, type_, url=None, date=None, citation=None):
    return {
        "id": id, "title": title, "publisher": publisher, "sourceType": type_,
        "url": url, "publishedDate": date, "accessedDate": CUTOFF if url else None,
        "availability": "unknown", "archiveUrl": None, "originalCitation": citation,
    }

sources = [
    src("src-ipr-debate", "Lahn and Sand fire off personal attacks", "Iowa Public Radio", "news",
        "https://www.iowapublicradio.org/political-news/2026-10-07/rob-sand-zach-lahn-governor-debate-2026-election",
        "2026-10-07", "October 6 KWQC debate, as reported by IPR"),
    src("src-cbs2-sand", "Beyond the Podium: Rob Sand", "CBS2 Iowa", "interview",
        "https://cbs2iowa.com/news/local/beyond-the-podium-rob-sand-addresses-high-costs-medicaid-marijuana-legalization",
        "2026", "CBS2"),
    src("src-itr", "Rob Sand and Zach Lahn Outline Tax Agendas", "ITR Foundation (taxpayer advocacy group)", "research",
        "https://itrfoundation.org/rob-sand-and-zach-lahn-outline-tax-agendas/", "2026", "ITR Foundation summary"),
    src("src-lahn-policy", "Policy | Zach Lahn For Governor", "Zach Lahn campaign", "campaign",
        "https://www.zachlahn.com/policy/", "2026", "zachlahn.com/policy"),
    src("src-sand-affordable", "Making Life More Affordable", "Rob Sand campaign", "campaign",
        "https://robsand.com/issues/making-life-more-affordable/", "2026", "robsand.com"),
    src("src-iowapress-lahn", "Republican Nominee for Governor Zach Lahn", "Iowa PBS, Iowa Press", "interview",
        "https://www.iowapbs.org/shows/iowapress/episode/14348/republican-nominee-governor-zach-lahn",
        "2026-07-10", "Iowa Press, July 10, 2026"),
    src("src-iowapress-sand", "Democratic Candidate for Governor Rob Sand", "Iowa PBS, Iowa Press", "interview",
        "http://www.iowapbs.org/shows/iowapress/iowa-press/episode/13411/democratic-candidate-governor-rob-sand",
        "2025", "Iowa Press, 2025"),
    src("src-x-lahn", "Zach Lahn on X", "Zach Lahn (official account)", "social",
        "https://x.com/ZachLahn/status/2024560019375571399", "2026-02-19", "X, February 19, 2026"),
    src("src-sand-accountability", "The Truer Better Agenda: Accountability for All", "Rob Sand campaign", "campaign", "https://robsand.com/issues/accountability-for-all", "2026", "Accountability plan"),
    src("src-sand-healthier", "A Healthier Iowa for All", "Rob Sand campaign", "campaign", "https://robsand.com/issues/healthier-iowa", "2026", "A Healthier Iowa for All"),
    src("src-sand-datacenters", "Data centers plan", "Rob Sand campaign", "campaign", "https://robsand.com/issues/data-centers", "2026", "data centers plan"),
    src("src-sand-opportunities", "Opportunities for All", "Rob Sand campaign", "campaign", "https://robsand.com/issues/opportunities-for-all", "2026", "Opportunities for All"),
    src("src-kcau", "Iowa Governor candidates oppose eminent domain for private use", "KCAU", "news", "https://www.kcau9.com/news/your-local-election-hq/iowa-governor-candidates-oppose-eminent-domain-for-private-use/", "2026-10-08", "KCAU"),
    src("src-icd-2026-08-01", "Lahn clarifies position on privatized Medicaid, defends attack ad against Sand", "Iowa Capital Dispatch", "news", "https://iowacapitaldispatch.com/2026/08/01/lahn-advocates-for-privatized-medicaid-defends-attack-ad-against-sand/", "2026-08-01", "Iowa Capital Dispatch, August 1, 2026"),
    src("src-icd-2026-05-19", "GOP gubernatorial candidates debate legal immigration, cancer prevention", "Iowa Capital Dispatch", "news", "https://iowacapitaldispatch.com/2026/05/19/gop-gubernatorial-candidates-debate-legal-immigration-cancer-prevention/", "2026-05-19", "Iowa Capital Dispatch, May 19, 2026"),
    src("src-icd-2026-05-05", "Q&A: Iowa GOP gubernatorial candidates on abortion, eminent domain, ESAs", "Iowa Capital Dispatch", "news", "https://iowacapitaldispatch.com/2026/05/05/qa-iowa-gop-gubernatorial-candidates-on-abortion-eminent-domain-esas/", "2026-05-05", "Iowa Capital Dispatch, May 5, 2026"),
    src("src-icd-2026-08-24", "Zach Lahn calls for state regulation of data centers, surveillance cameras", "Iowa Capital Dispatch", "news", "https://iowacapitaldispatch.com/?p=59243", "2026-08-24", "Iowa Capital Dispatch, August 24"),
    src("src-icd-2026-06-04", "Democratic governor candidate Rob Sand warns that Iowa faces 'fiscal time bomb'", "Iowa Capital Dispatch", "news", "https://iowacapitaldispatch.com/2026/06/04/democratic-governor-candidate-rob-sand-warns-that-iowa-faces-fiscal-time-bomb/", "2026-06-04", "June 4, 2026"),
    src("src-kff-2026-07-30", "Medicaid insurer contracts in the Iowa governor's race", "KFF Health News", "news", "https://kffhealthnews.org/health-industry/medicaid-insurer-contracts-iowa-governor-race/", "2026-07-30", None),
    src("src-radio-iowa-2026-08-12", "Rob Sand, Democratic candidate for governor, releases economic agenda", "Radio Iowa", "news", "https://www.radioiowa.com/2026/08/12/rob-sand-democratic-candidate-for-governor-releases-economic-agenda/", "2026-08-12", "Radio Iowa, August 12, 2026"),
    src("src-times-republican", "Gather 'round the table", "Times-Republican", "news", "https://www.timesrepublican.com/news/todays-news/2026/10/gather-round-the-table/", "2026-10-10", "Times-Republican, October 2026"),
    src("src-nbc-debate", "Zach Lahn's residency history and Rob Sand's party come under fire in first Iowa governor debate", "NBC News", "news", "https://www.nbcnews.com/politics/2026-election/zach-lahns-residency-history-rob-sands-party-come-fire-first-iowa-gove-rcna601347", "2026-10-06", "NBC News paraphrase of the debate"),
    src("src-radio-iowa-2026-01-31", "Four GOP candidates for Iowa governor back mRNA vaccine ban", "Radio Iowa", "news", "https://www.radioiowa.com/2026/01/31/four-gop-candidates-for-iowa-governor-back-mrna-vaccine-ban/", "2026-01-31", "Radio Iowa, January 27, 2026 (article dated January 31)"),
    src("src-kcci-transcript", "KCCI interview transcript", "Published by the Iowa Democratic Party (partisan); corroborated by Studio 31", "interview", None, "2026-09", "KCCI interview, September 2026"),
    src("src-cbs2-lahn", "CBS2 interview (vaccines)", "CBS2 Iowa", "interview", None, "2026", "CBS2"),
    src("src-gazette-2025", "Iowa gubernatorial candidate Sand pitches unity, faces pointed questions on transgender rights", "The Gazette", "news", "https://www.thegazette.com/multimedia/videos/iowa-gubernatorial-candidate-sand-pitches-unity-faces-pointed-questions-on-transgender-rights/article_bc98635a-9948-5caf-a9a2-8ec6325e0b4d.html", "2025", "The Gazette, 2025, via The Hill"),
    src("src-hill-debate", "Sparks fly in first Iowa governor's debate between Rob Sand and Zach Lahn", "The Hill", "news", "https://thehill.com/homenews/campaign/6133056-iowa-governor-debate-lahn-sand/", "2026-10", "The Hill"),
    src("src-iowapress-lahn-primary", "Republican Candidate for Governor, Zach Lahn", "Iowa PBS, Iowa Press", "interview", "https://www.iowapbs.org/shows/iowapress/episode/13995/republican-candidate-governor-zach-lahn", "2026-04-02", "Iowa Press, primary"),
    src("src-radio-iowa-2026-01-28", "4 Iowa GOP candidates for governor call for life at conception law", "Radio Iowa", "news", "https://www.radioiowa.com/2026/01/28/4-iowa-gop-candidates-for-governor-call-for-life-at-conception-law/", "2026-01-28", "Radio Iowa, January 28, 2026"),
    src("src-radio-iowa-2025-05-12", "Iowa State Auditor Rob Sand kicks off 2026 campaign for governor", "Radio Iowa", "news", "https://www.radioiowa.com/2025/05/12/iowa-state-auditor-rob-sand-kicks-off-2026-campaign-for-governor/", "2025-05-12", "Radio Iowa, May 12, 2025"),
    src("src-politifact-2026-09-17", "In governor's race, Zach Lahn says Rob Sand wants to raise Iowans' taxes", "PolitiFact", "news", "https://politifact.com/factchecks/2026/sep/17/zach-lahn/rob-sand-7500-tax-increase-iowa-governor/", "2026-09-17", "PolitiFact, September 17, 2026"),
    src("src-isl-townhall", "Town hall video, via Iowa Starting Line", "Iowa Starting Line (Democratic-leaning)", "video", None, None, "town hall video, via Iowa Starting Line"),
    src("src-kcrg-2026-10-07", "FACT CHECK: How do Lahn and Sand's approaches to the cancer crisis differ?", "KCRG", "news", "https://www.kcrg.com/2026/10/07/fact-check-how-do-lahn-sands-approaches-cancer-crisis-differ/", "2026-10-07", "KCRG, October 7"),
    src("src-ipr-water", "Rob Sand announces water quality and health plan, with emphasis on farmer support", "Iowa Public Radio", "news", "https://www.iowapublicradio.org/political-news/2026-04-30/rob-sand-announces-water-quality-and-health-plan-with-emphasis-on-farmer-support", "2026-04-30", "IPR"),
    src("src-esa-report-coverage", "Auditor: School choice cost Iowans $258 million", "Iowa Capital Dispatch (via Little Village)", "news", "https://littlevillagemag.com/auditor-school-choice-cost-258-million/", "2026-06-18", "via WHO13 and Iowa Capital Dispatch; also The Gazette and CBS2"),
    src("src-research-uncited", "Cited in the research without a specific source", None, "research", None, None,
        "Statement listed in the research without a named source"),
]

# --------------------------------------------------------------------------
# Statements
# --------------------------------------------------------------------------
statements = []

def stmt(id, cand, summary, source, date, cls, issues, questions, quote=None, attribution="direct",
         verified=None, reported_via=None, conflicts=()):
    if verified is None:
        verified = source != "src-research-uncited"
    statements.append({
        "id": id, "candidateId": cand, "quote": quote, "summary": summary,
        "attribution": attribution, "reportedVia": reported_via, "date": date,
        "sourceId": source, "videoTimestamp": None, "issueIds": issues, "questionIds": questions,
        "evidenceClass": cls, "verificationStatus": "verified" if verified else "unverified",
        "supersededByIds": [], "conflictsWithIds": list(conflicts),
    })
    return id

# Q1 Property taxes
stmt("st-sand-property-play-out", SAND,
     "Said the recent property tax changes should be given time to play out before they are adjusted, and that local officials “know their communities.”",
     "src-ipr-debate", "2026-10-06", "EP", ["1.01"], ["q01"], attribution="paraphrase")
stmt("st-lahn-rent-home", LAHN,
     "Supports eliminating property taxes on primary residences over the long term.",
     "src-ipr-debate", "2026-10-06", "EP", ["1.01"], ["q01"],
     quote="You shouldn't have to rent your home from the government")
stmt("st-lahn-dc-5x", LAHN,
     "Proposed that data centers pay five times the normal property tax rate, with the revenue used for residential property tax relief.",
     "src-x-lahn", "2026-02-19", "SP", ["1.01", "6.59", "11.101"], ["q01", "q17"],
     quote="Want to build a data center in Iowa when I'm Governor? Plan to pay 5x the normal property tax rate.")

# Q2 Income tax (Sand: conflicting evidence, presented chronologically)
stmt("st-sand-tax-2025", SAND,
     "Said the flat tax is “of tremendous benefit” to the wealthiest and that some high earners “would feel some sense of patriotic willingness” given that “the budget's upside down.” He proposed no rate change.",
     "src-radio-iowa-2025-05-12", "2025-05-12", "EP", ["1.02"], ["q02"], attribution="paraphrase")
stmt("st-sand-tax-2026-06", SAND,
     "Said some reforms “have been necessary” and that “you want to see where you are before you decide what direction you want to go in.”",
     "src-icd-2026-06-04", "2026-06-04", "EP", ["1.02"], ["q02"], attribution="paraphrase")
stmt("st-sand-tax-reasonable", SAND,
     "Called the income tax cuts reasonable and said his criticism was of the resulting budget deficit.",
     "src-cbs2-sand", "2026", "EP", ["1.02"], ["q02"],
     quote="Those income cuts, I think, were reasonable. My criticism was not of the cuts, it was the fact that they have left us with a $1.3 billion budget deficit")
stmt("st-sand-tax-politifact", SAND,
     "His campaign told PolitiFact he would not repeal the income tax cuts.",
     "src-politifact-2026-09-17", "2026-09-17", "EP", ["1.02"], ["q02"], attribution="paraphrase",
     reported_via="Sand campaign statement to PolitiFact")
stmt("st-lahn-income-zero", LAHN,
     "Wants to eliminate the state income tax over time, paid for by cutting waste. No timeline given.",
     "src-itr", "2026", "EP", ["1.02"], ["q02"],
     quote="I would like to find a way to get the income taxes to zero")

# Q3 Housing
stmt("st-sand-housing", SAND,
     "Proposes zoning that allows duplexes, quadplexes and accessory dwelling units, faster permitting, and interest-free down payment aid.",
     "src-sand-affordable", "2026", "SP", ["1.08"], ["q03"], attribution="paraphrase")
stmt("st-lahn-housing", LAHN,
     "Proposes banning hedge fund purchases of single-family homes, and tax rebates for down payment assistance.",
     "src-lahn-policy", "2026", "SP", ["1.08", "8.79"], ["q03"], attribution="paraphrase")

# Q4 Farm economy
stmt("st-sand-farm", SAND,
     "Proposes higher taxes on out-of-state landowners, a ban on hedge funds and LLCs making large-scale land purchases, and an Office of Rural Prosperity.",
     "src-sand-opportunities", "2026", "SP", ["2.11", "2.12", "2.13"], ["q04"], attribution="paraphrase")
stmt("st-sand-tariffs", SAND, "Criticized tariffs' effect on farmers.",
     "src-ipr-debate", "2026-10-06", "EP", ["2.18"], ["q04"], quote="Farmers can't wait anymore")
stmt("st-lahn-antitrust", LAHN,
     "Proposes state antitrust suits against large agricultural input companies.",
     "src-lahn-policy", "2026", "SP", ["2.11", "2.12", "2.13"], ["q04"],
     quote="File antitrust suits against the big agricultural input companies that have formed monopolies and are extorting our farmers")
stmt("st-lahn-ag-funding", LAHN, "Said he would give the Attorney General more funding to pursue antitrust cases.",
     "src-ipr-debate", "2026-10-06", "SP", ["2.11", "2.12", "2.13"], ["q04"], attribution="paraphrase")
stmt("st-lahn-land", LAHN,
     "Proposes confiscating land illegally owned by China and reselling it to young families and veterans, and higher property tax rates on institutional investors.",
     "src-lahn-policy", "2026", "SP", ["2.11", "2.12", "2.13", "10.97"], ["q04"], attribution="paraphrase")

# Q5 Eminent domain
stmt("st-sand-eminent", SAND, "Opposes taking private property when it is not for public use.",
     "src-kcau", "2026-10-08", "EP", ["2.15"], ["q05"],
     quote="The idea that you would have your private property taken just because there's someone who thinks they can put it to better use, but it's not for public use, doesn't sit right with me")
stmt("st-lahn-eminent", LAHN, "Opposes eminent domain for private company profit.",
     "src-lahn-policy", "2026", "EP", ["2.15"], ["q05"],
     quote="Absolutely oppose use of eminent domain for private company profit")
stmt("st-lahn-eminent-legal", LAHN, "Said he is still examining legal options and expects to work with the legislature.",
     "src-kcau", "2026-10-08", "GS", ["2.15"], ["q05"],
     quote="We'll see what the exact options are for that, and what the legality is of that... I think I can work with the Republican legislature")

# Q6 Water quality
stmt("st-sand-water", SAND,
     "Proposes restoring water monitoring funding; income and per-acre property tax credits for farms with approved nutrient plans; verified, transparent manure plans; digesters; wetlands; and a “dirty water” alert.",
     "src-sand-healthier", "2026", "SP", ["6.51", "6.52", "6.53"], ["q06"], attribution="paraphrase")
stmt("st-sand-water-regulation", SAND,
     "Did not say whether he would support regulation when announcing his April 2026 water plan. The research also reports he did not rule regulation out in August 2025.",
     "src-ipr-water", "2026-04", "GS", ["6.51", "6.52", "6.53"], ["q06"], attribution="paraphrase")
stmt("st-lahn-water", LAHN,
     "Proposes incentives for farmers to adopt proven conservation practices.",
     "src-lahn-policy", "2026", "SP", ["6.51", "6.52", "6.53"], ["q06"],
     quote="Give incentives to our farmers to use proven solutions")
stmt("st-lahn-water-practices", LAHN,
     "The research lists refundable credits for deep-banding fertilizer, aid for buffer strips, and more monitoring; these were not found on his campaign site or in a cited source.",
     "src-research-uncited", None, "SP", ["6.51", "6.52", "6.53"], ["q06"], attribution="paraphrase")
stmt("st-lahn-water-right-thing", LAHN, "Expressed confidence in voluntary action by farmers.",
     "src-research-uncited", None, "GS", ["6.51", "6.52", "6.53"], ["q06"],
     quote="I believe that people want to do the right thing in the first place")

# Q7 Cancer
stmt("st-sand-cancer", SAND,
     "Proposes a cabinet-level cancer task force, $20 million for cancer research, higher tobacco and nicotine taxes, nitrate alerts, and radon disclosure by home inspectors.",
     "src-ipr-debate", "2026-10-06", "SP", ["3.24"], ["q07"], attribution="paraphrase")
stmt("st-lahn-cancer", LAHN,
     "Proposes independent state safety testing of products used in Iowa and refocusing University of Iowa research.",
     "src-lahn-policy", "2026", "SP", ["3.24"], ["q07"],
     quote="Conduct independent state safety tests on products used in Iowa")
stmt("st-lahn-cancer-env", LAHN,
     "Said environmental factors are “absolutely” involved in Iowa's cancer rates, citing nitrates and glyphosate.",
     "src-icd-2026-05-19", "2026-05-19", "EP", ["3.24"], ["q07"], attribution="paraphrase")
stmt("st-lahn-screening", LAHN, "Supports expanded cancer screenings.",
     "src-kcrg-2026-10-07", "2026-10-07", "SP", ["3.24"], ["q07"], attribution="paraphrase")

# Q8 Rural hospitals
stmt("st-sand-reimbursement", SAND, "Proposes raising Medicaid reimbursement rates.",
     "src-sand-affordable", "2026", "SP", ["3.21", "3.22"], ["q08", "q09"], attribution="paraphrase")
stmt("st-lahn-prompt-payment", LAHN, "Called for prompt payment for providers.",
     "src-kff-2026-07-30", "2026-07-30", "GS", ["3.21"], ["q08"], attribution="paraphrase")

# Q9 Medicaid
stmt("st-sand-medicaid", SAND, "Would begin ending privatized Medicaid managed care on his first day.",
     "src-sand-affordable", "2026", "SP", ["3.22"], ["q09"],
     quote="As governor, I'll get started ending the privatization of Medicaid on day one of my administration")
stmt("st-lahn-medicaid", LAHN,
     "Opposes government-delivered health care and would bar managed care companies from using AI to deny coverage.",
     "src-icd-2026-08-01", "2026-08-01", "EP", ["3.22", "3.28"], ["q09"],
     quote="I don't think the government would do a good job of delivering healthcare for the people of Iowa... I will not allow any of these companies to use AI in denying coverage from people")

# Q10 School funding
stmt("st-sand-school-aid", SAND, "Proposes a 5% increase in state school aid in his first year.",
     "src-ipr-debate", "2026-10-06", "SP", ["4.31"], ["q10"], attribution="paraphrase")
stmt("st-lahn-public-school", LAHN, "Campaign site heading on public schools.",
     "src-lahn-policy", "2026", "GS", ["4.31"], ["q10"],
     quote="The Governor Must Be the #1 Advocate for Public School Kids")

# Q11 ESAs
stmt("st-sand-esa-rules", SAND,
     "Proposes requiring annual audits, limiting tuition increases, implementing income limits, and ending the Odyssey arrangement for ESAs.",
     "src-sand-accountability", "2026", "SP", ["4.32"], ["q11"], attribution="paraphrase")
stmt("st-sand-esa-wealthiest", SAND, "Said the wealthiest families do not need help paying private school tuition.",
     "src-ipr-debate", "2026-10-06", "EP", ["4.32"], ["q11"],
     quote="The wealthiest folks in Iowa, God bless them, good for them, they don't need help to send their kids to private school")
stmt("st-sand-esa-no-repeal", SAND, "His accountability plan proposes changes to ESAs, not repeal.",
     "src-sand-accountability", "2026", "EP", ["4.32"], ["q11"], attribution="paraphrase")
stmt("st-sand-esa-report", SAND,
     "As State Auditor, issued an ESA Policy Impact Report estimating that taxpayers paid about $258.7 million in FY26 for private school tuition that would otherwise have been paid privately.",
     "src-esa-report-coverage", "2026-06", "DA", ["4.32"], ["q11"], attribution="paraphrase")
stmt("st-lahn-esa-freedom", LAHN, "Called ESAs a foundational freedom for Iowa families.",
     "src-iowapress-lahn", "2026-07-10", "EP", ["4.32"], ["q11"],
     quote="Education savings accounts are a foundational freedom for Iowa's families")
stmt("st-lahn-esa-expand", LAHN, "Said he would expand ESAs.",
     "src-icd-2026-05-05", "2026-05-05", "EP", ["4.32"], ["q11"], attribution="paraphrase")
stmt("st-lahn-esa-audits", LAHN, "Supports third-party audits of the ESA program.",
     "src-ipr-debate", "2026-10-06", "EP", ["4.32", "9.83"], ["q11", "q19"], attribution="paraphrase")

# Q12 School vaccine requirements
stmt("st-lahn-vaccine-jan", LAHN,
     "Radio Iowa reported he “would pull all COVID shots off the market in Iowa and end all childhood vaccine requirements connected to enrollment in Iowa schools.”",
     "src-radio-iowa-2026-01-31", "2026-01-27", "EP", ["3.30", "5.48"], ["q12"], attribution="paraphrase")
stmt("st-lahn-vaccine-iowapress", LAHN,
     "Answered “Yes” on Iowa Press when asked whether vaccine mandates should be repealed.",
     "src-iowapress-lahn-primary", "2026-04-02", "EP", ["3.30", "5.48"], ["q12"], attribution="paraphrase")
stmt("st-lahn-vaccine-kcci", LAHN,
     "Answered “Yes” when asked if he would support eliminating school vaccine requirements.",
     "src-kcci-transcript", "2026-09", "EP", ["3.30", "5.48"], ["q12"], attribution="paraphrase", verified=False)
stmt("st-lahn-vaccine-benefits", LAHN,
     "Has said vaccination has benefits. The research attributes this to CBS2; an independent check could not locate the exact wording, though he expressed a similar view on Iowa Press.",
     "src-cbs2-lahn", "2026", "GS", ["3.30"], ["q12"], attribution="paraphrase", verified=False)

# Q13 Abortion
stmt("st-sand-abortion", SAND, "Opposes the six-week abortion ban and would veto further restrictions.",
     "src-iowapress-sand", "2025", "EP", ["5.41"], ["q13"],
     quote="I think that the six-week abortion ban goes too far... I can't unilaterally repeal a six-week ban, but I can stop us from making it worse")
stmt("st-sand-roe", SAND,
     "His campaign says he would veto “culture war bills” that threaten surrogacy, contraception, and IVF.",
     "src-sand-healthier", "2026", "EP", ["5.41", "5.42"], ["q13"], attribution="paraphrase")
stmt("st-lahn-protect-life", LAHN, "Wants to continue protecting life in Iowa.",
     "src-iowapress-lahn-primary", "2026-04-02", "EP", ["5.41"], ["q13"],
     quote="Yes, I would like to continue to protect life in our state.")
stmt("st-lahn-conception", LAHN, "Holds that life begins at conception.",
     "src-iowapress-lahn-primary", "2026-04-02", "EP", ["5.41"], ["q13"],
     quote="If you believe that life begins at conception, then that decision is made for you.")
stmt("st-lahn-ivf", LAHN, "Said IVF should be examined for regulation to protect life.",
     "src-iowapress-lahn-primary", "2026-04-02", "EP", ["5.42"], ["q13"],
     quote="I think we need to look at regulating that to promote and protect life")

# Q14 Firearms
stmt("st-sand-firearms", SAND,
     "Is a gun owner and hunter. Reported 2021 posts against permitless carry come from a GOP-aligned site and are not verified.",
     "src-research-uncited", None, "IND", ["5.45"], ["q14"], attribution="paraphrase", verified=False)

# Q15 Civil rights (SF 418)
stmt("st-sand-sf418", SAND, "Opposes SF 418's removal of gender identity from the Iowa Civil Rights Act.",
     "src-gazette-2025", "2025", "EP", ["5.46"], ["q15"],
     quote="You should not be fired from your job in the state of Iowa for being different. You should not be evicted from your apartment")
stmt("st-sand-sf418-limits", SAND, "Said a governor cannot unilaterally restore the protections; it would take the Legislature.",
     "src-gazette-2025", "2025", "EP", ["5.46"], ["q15"], attribution="paraphrase")
stmt("st-lahn-book", LAHN,
     "At the debate, said Sand “would allow a book on transgenderism to be put in an elementary school.” No documented statement on SF 418.",
     "src-hill-debate", "2026-10-06", "IND", ["5.46", "4.37"], ["q15"], attribution="paraphrase")

# Q16 Immigration
stmt("st-sand-immigration", SAND,
     "Questioned why law-abiding, working immigrants should feel unsafe in Iowa.",
     "src-isl-townhall", None, "GS", ["7.67"], ["q16"], verified=False,
     quote="If you are working, if you are following the rules, and have no criminal record, if you're paying your taxes, why would you want people who are doing those things to feel unsafe in the state of Iowa?")
stmt("st-lahn-immigration", LAHN,
     "Would ban state benefits for people in the country illegally and stop H-1B hiring in state government and universities.",
     "src-lahn-policy", "2026", "SP", ["7.67"], ["q16"],
     quote="We will ban benefits for illegal immigrants, and stop issuing H1B visas for jobs that Iowans can do in state government and in our universities.")

stmt("st-lahn-immigration-contractors", LAHN,
     "Said state contractors should disclose how many Iowans they hire, and supported ending H-1B hiring in state government.",
     "src-icd-2026-05-19", "2026-05-19", "SP", ["7.67"], ["q16"], attribution="paraphrase")

# Q17 Data centers
stmt("st-sand-dc", SAND,
     "Would end data center tax breaks and require data centers to cover their own costs, including utility cost increases; would block NDAs.",
     "src-sand-datacenters", "2026", "SP", ["6.59", "11.101", "1.04"], ["q17"],
     quote="I will end these tax breaks")
stmt("st-lahn-dc-moratorium", LAHN,
     "Called for a data center moratorium, said each county should assess its own situation, and said there should be no incentives.",
     "src-iowapress-lahn", "2026-07-10", "SP", ["6.59", "11.101"], ["q17"],
     quote="I'm the candidate that's called for a moratorium on data centers within the state")
stmt("st-lahn-dc-state", LAHN, "Called for data center regulation at the state level.",
     "src-icd-2026-08-24", "2026-08-24", "SP", ["6.59", "11.101"], ["q17"], attribution="paraphrase")

# Q18 Minimum wage
stmt("st-sand-min-wage", SAND, "Proposes raising the minimum wage from $7.25 to $12 in phases, then indexing it.",
     "src-radio-iowa-2026-08-12", "2026-08-12", "SP", ["8.71"], ["q18"], attribution="paraphrase")
stmt("st-sand-min-wage-phases", SAND, "Said the increase would be phased in.",
     "src-times-republican", "2026-10-10", "SP", ["8.71"], ["q18"],
     quote="You don't just flip the switch and say now it's $12")
stmt("st-lahn-min-wage", LAHN,
     "NBC News reported that he “wouldn't commit to raise the minimum wage” at the October 6 debate.",
     "src-nbc-debate", "2026-10-06", "GS", ["8.71"], ["q18"], attribution="paraphrase")

# Q19 Oversight
stmt("st-sand-auditor", SAND,
     "Proposes restoring the full powers of the Auditor's Office by reversing the 2023 law, making the PIE program mandatory, and extending whistleblower protections to all Iowans.",
     "src-sand-accountability", "2026", "SP", ["9.83"], ["q19"], attribution="paraphrase")

# Q20 State vs local
stmt("st-sand-local", SAND, "Called for more local control at the October 6 debate.",
     "src-ipr-debate", "2026-10-06", "EP", ["9.88"], ["q20"], attribution="paraphrase")
stmt("st-lahn-local", LAHN,
     "Said counties “should have far more control” and proposed suing the federal government on 10th Amendment grounds.",
     "src-ipr-debate", "2026-10-06", "EP", ["9.88"], ["q20"], attribution="paraphrase")
stmt("st-lahn-centralized", LAHN, "Favors decentralizing power.",
     "src-iowapress-lahn", "2026-07-10", "EP", ["9.88"], ["q20"],
     quote="I want to make sure that we do not have centralized power as much as possible")

# --------------------------------------------------------------------------
# Questions (configuration for the 20 assessment screens)
# --------------------------------------------------------------------------
def opt(id, label, description, issues=(), legislation=(), explanation=None):
    return {"id": id, "label": label, "description": description, "relatedIssueIds": list(issues),
            "legislationIds": list(legislation), "sourceIds": [], "explanation": explanation}

questions = []

def question(n, slug, title, category, domain, prompt, context, issues, options, learn_more=None, unanswered=()):
    qid = f"q{n:02d}"
    questions.append({
        "id": qid, "order": n, "slug": slug, "title": title, "categoryId": category, "domain": domain,
        "prompt": prompt, "context": context, "learnMore": learn_more, "issueIds": issues,
        "options": options, "unansweredQuestions": list(unanswered), "reviewStatus": "draft",
    })
    return qid

question(1, "property-taxes", "Property taxes", "economy", "economy",
    "What should Iowa do about property taxes?",
    "Property taxes are what you pay each year on a home or land. They pay for local things like roads, police, fire departments, and schools. Iowa recently passed a law that limits how fast most city and county property taxes can grow and gives homeowners a tax break.",
    ["1.01"], [
        opt("reduce-further", "Cut them more", "Lower property taxes more, even if cities and counties have to cut some spending.", ["1.01"]),
        opt("relief-preserve", "Cut them, but protect local services", "Lower property taxes, but make sure things like police, fire, and roads keep their funding.", ["1.01"]),
        opt("maintain-evaluate", "Wait and see", "Leave the new law alone for now and see how it works before changing anything.", ["1.01"], ["leg-sf-2472"]),
        opt("local-flexibility", "Let local governments decide", "Give cities and counties more freedom to decide how to pay for their services.", ["1.01", "9.88"]),
    ],
    learn_more="The new law is SF 2472. It caps yearly growth in most city and county property taxes at 2% and takes 10% of a home's value off its taxable value (at least $5,500 and at most $20,000).",
    unanswered=["Neither candidate addressed the levy cap rate, its exceptions, the EMS levy, or the state backfill."])

question(2, "income-tax-and-spending", "State income taxes and government spending", "economy", "economy",
    "What should Iowa do with the state income tax?",
    "The state income tax comes out of your paycheck. Iowa recently cut it to one rate for everyone: 3.8%. Lower taxes leave more money in your pocket, but also less money for state services.",
    ["1.02", "1.05", "11.103"], [
        opt("eliminate", "Get rid of it over time", "Lower the income tax step by step until it's gone, and cut state spending to make up for it.", ["1.02"]),
        opt("keep-rate", "Keep it at 3.8%", "Keep the income tax where it is now.", ["1.02"]),
        opt("pause-cuts", "No more cuts for now", "Don't cut it any further until the state budget is balanced.", ["1.02", "1.05"]),
        opt("raise-higher-incomes", "Raise it for high earners", "Have people who make the most money pay a higher rate.", ["1.02"]),
    ],
    unanswered=["SJR 11: no documented position for either candidate.", "Neither candidate has a plan for the FY2027 budget gap."])

question(3, "housing-affordability", "Cost of living and housing affordability", "economy", "economy",
    "What's the best way to make homes more affordable in Iowa?",
    "Buying or renting a home costs more than it used to. Ideas include building more homes, limiting big investors, and helping first-time buyers.",
    ["1.08", "1.09"], [
        opt("zoning", "Build more homes", "Change local rules so more kinds of homes, like duplexes and small backyard houses, can be built.", ["1.08"]),
        opt("investor-limits", "Limit big investors", "Stop large investment companies from buying up houses.", ["1.08"]),
        opt("buyer-aid", "Help first-time buyers", "Give first-time buyers help with their down payment.", ["1.08"]),
        opt("private-market", "Let the market handle it", "Keep government mostly out of it and let builders and buyers sort it out.", ["1.08"]),
    ])

question(4, "farm-profitability", "Farm profitability and agricultural policy", "agriculture", "agriculture",
    "What should Iowa do first to help farmers make a living?",
    "What farmers earn depends on what they pay for seed, fertilizer, and equipment, what land costs, and how much they can sell to other countries.",
    ["2.11", "2.12", "2.13", "2.18"], [
        opt("antitrust", "Go after big farm-supply companies", "Use laws against monopolies on the large companies that sell farmers seed, fertilizer, and equipment.", ["2.11", "2.12", "2.13"]),
        opt("ownership-limits", "Limit who can buy farmland", "Stop outside investors and big corporations from buying up Iowa farmland.", ["2.11", "2.12", "2.13"]),
        opt("trade", "Push for open trade", "Press the federal government to lower tariffs (taxes on imports and exports) so farmers can sell more overseas.", ["2.18"]),
        opt("limited-role", "Stay out of it", "Keep the state's role small and let the market decide.", ["2.11"]),
    ],
    unanswered=["Neither candidate named Iowa Code ch. 9H or 10B, or explained how land confiscation or antitrust suits would work legally."])

question(5, "eminent-domain", "Eminent domain and landowner protections", "agriculture", "agriculture",
    "Should landowners be forced to sell their land for a project that mainly helps a private company?",
    "“Eminent domain” lets the government make someone sell their land for a public project, like a road, as long as they're paid for it. In Iowa, people have argued about using it for privately owned projects, like carbon dioxide (CO2) pipelines.",
    ["2.15"], [
        opt("prohibit-private", "No, never", "Don't allow it when the project mainly benefits a private company.", ["2.15"]),
        opt("stricter-standards", "Only with stricter rules", "Allow it only with tougher rules and better pay for landowners.", ["2.15"]),
        opt("case-by-case", "Decide case by case", "Keep the current law and let state regulators decide each project.", ["2.15"]),
    ],
    learn_more="Being against something in general is not the same as backing a specific bill. Both candidates have said they oppose taking land for private gain. Neither has said whether he would sign HF 2104, a bill on this issue.",
    unanswered=["Neither candidate said whether he would sign HF 2104.", "Neither addressed the Utilities Commission, Summit's permit, or IUC appointment criteria."])

question(6, "water-quality", "Drinking water, nitrates, and environmental regulation", "environment-energy", "environment",
    "What's the best way to keep farm runoff out of Iowa's drinking water?",
    "Fertilizer from farm fields can wash into rivers and wells. At high levels, a chemical from it called nitrate can make drinking water unsafe. Right now, Iowa mostly relies on farmers taking voluntary steps.",
    ["6.51", "6.52", "6.53", "6.60"], [
        opt("incentives", "Pay farmers to help", "Give farmers more money and tax breaks for practices that reduce runoff.", ["6.51", "2.19"]),
        opt("enforceable-limits", "Set rules farmers must follow", "Set limits on farm runoff that farmers are required to meet.", ["6.51"]),
        opt("monitoring", "Test the water more", "Test water more often and warn people when it isn't safe.", ["6.52"]),
        opt("current-approach", "Keep things as they are", "Keep the current voluntary approach.", ["6.51"]),
    ],
    unanswered=["Neither candidate addressed HF 2771 water treatment funding or Iowa Flood Center funding."])

question(7, "cancer-prevention", "Cancer prevention and public health", "health", "health",
    "What should Iowa focus on to fight cancer?",
    "Cancer is a major concern in Iowa, and both candidates call it a top priority.",
    ["3.24"], [
        opt("research-task-force", "Research and a state team", "Spend more on cancer research and set up a state team to lead the effort.", ["3.24"]),
        opt("environmental-testing", "Look for causes in the environment", "Study and test things people are exposed to, like farm chemicals and everyday products.", ["3.24"]),
        opt("prevention", "Prevention and checkups", "Focus on prevention, like higher tobacco taxes, cancer screenings, and testing homes for radon gas.", ["3.24"]),
        opt("existing-programs", "Use programs we already have", "Rely mostly on current federal and university programs.", ["3.24"]),
    ])

question(8, "rural-health-care", "Rural hospitals and health care access", "health", "health",
    "How should Iowa help hospitals and clinics in small towns?",
    "Many rural hospitals depend on payments from Medicaid and Medicare, which are government health programs.",
    ["3.21"], [
        opt("reimbursement", "Pay them more for Medicaid patients", "Raise how much the state pays doctors and hospitals to treat Medicaid patients.", ["3.21", "3.22"]),
        opt("prompt-payment", "Make insurers pay faster", "Require insurance companies to pay hospitals on time and make billing simpler.", ["3.21"]),
        opt("regional-care", "Combine into regional centers", "Support larger regional hospitals instead of keeping every small one open.", ["3.21"]),
        opt("deregulate", "Cut red tape", "Reduce rules and let health care providers compete.", ["3.21"]),
    ],
    unanswered=["HF 2635: no documented position for either candidate."])

question(9, "medicaid", "Medicaid and health coverage", "health", "health",
    "Who should run Iowa's Medicaid program?",
    "Medicaid is government health coverage for people with low incomes and people with disabilities. Right now, Iowa pays private insurance companies to manage it.",
    ["3.22"], [
        opt("end-managed-care", "The state", "Stop using private companies and have the state run it again.", ["3.22"]),
        opt("keep-with-oversight", "Private companies, watched more closely", "Keep private companies in charge, but keep a closer eye on them.", ["3.22"]),
        opt("keep-as-is", "Keep it as it is", "Keep the current system mostly the same.", ["3.22"]),
    ],
    unanswered=["Neither candidate addressed the December 1 work requirement start date, its exceptions, or verification."])

question(10, "school-funding", "Public school funding", "education", "education",
    "Should public schools get more money from the state?",
    "Each year, state lawmakers decide how much more money public schools get for each student.",
    ["4.31"], [
        opt("increase-significantly", "Yes, a lot more", "Give schools a bigger increase than they've gotten in recent years.", ["4.31"]),
        opt("modest-increases", "Yes, a little more", "Keep giving small yearly increases like recent years.", ["4.31"]),
        opt("hold-steady", "About the same", "Keep funding steady and have schools find ways to save.", ["4.31"]),
    ])

question(11, "education-savings-accounts", "Private school tuition assistance and school choice", "education", "education",
    "Should the state help families pay for private school?",
    "Iowa gives families state money, called Education Savings Accounts (ESAs), to pay private school tuition. Any family can sign up, no matter how much they earn. The program costs the state hundreds of millions of dollars a year; published estimates differ.",
    ["4.32"], [
        opt("expand", "Yes, and grow the program", "Keep it open to every family and make it bigger.", ["4.32"]),
        opt("keep-universal", "Yes, keep it as it is", "Keep it open to every family with no big changes.", ["4.32"]),
        opt("income-limits", "Only for families who need it", "Keep it, but only for families below a certain income.", ["4.32"]),
        opt("phase-out", "No, end it", "Phase it out and put the money back into public schools.", ["4.32"]),
    ],
    learn_more="Cost figures conflict. The State Auditor's report put the program at $329.6 million in 2026; another report gave a different per-student figure that has not been verified.")

question(12, "school-vaccine-requirements", "Parental rights and education policy", "education", "education",
    "Should kids have to get certain vaccines to go to school?",
    "Iowa requires certain shots for kids to enroll in school. Families can ask for an exemption in some cases.",
    ["5.48", "3.30"], [
        opt("keep-requirements", "Yes, keep the current rules", "Keep the vaccine requirements and exemptions as they are.", ["5.48"]),
        opt("easier-exemptions", "Yes, but make it easier to opt out", "Keep the requirements, but make exemptions easier for parents to get.", ["5.48"]),
        opt("end-requirements", "No", "End vaccine requirements for going to school.", ["5.48"]),
    ],
    unanswered=["HPV consent law: no documented position for either candidate."])

question(13, "abortion", "Abortion law and reproductive protections", "rights", "rights",
    "What should Iowa's abortion law be?",
    "Iowa law bans most abortions after about six weeks of pregnancy, with some exceptions.",
    ["5.41", "5.42"], [
        opt("further-restrict", "Stricter than now", "Put more limits on abortion than current law does.", ["5.41"], ["leg-hf-2788"]),
        opt("keep-current", "Keep the current law", "Keep the six-week limit as it is.", ["5.41"]),
        opt("broaden-access", "Less strict than now", "Allow abortion later in pregnancy, closer to the rules under Roe v. Wade.", ["5.41"]),
    ],
    unanswered=["Lahn's position on exceptions for rape, incest, or the life of the mother is not verified.", "Neither candidate addressed doctor liability."])

question(14, "firearms", "Firearm rights and public safety", "rights", "rights",
    "Should Iowa's gun laws change?",
    "Iowa's constitution protects the right to keep and bear arms. Adults in Iowa can generally carry a handgun without a permit.",
    ["5.45"], [
        opt("expand-rights", "Fewer limits", "Loosen gun laws further.", ["5.45"]),
        opt("keep-current", "Keep them as they are", "Leave current gun laws alone.", ["5.45"]),
        opt("add-safety-measures", "More safety rules", "Add rules like required permits, or “red flag” laws that let a court take guns from someone found to be dangerous.", ["5.45"]),
    ],
    unanswered=["The research does not establish a verified current firearms position for either candidate."])

question(15, "civil-rights-gender-identity", "Religious freedom and civil rights", "rights", "rights",
    "Should Iowa's civil rights law include gender identity?",
    "Iowa's civil rights law makes it illegal to discriminate against people in things like jobs and housing because of who they are. A recent law (SF 418) removed gender identity (being transgender) from that list.",
    ["5.46"], [
        opt("restore", "Yes, add it back", "Put gender identity back into Iowa's civil rights law.", ["5.46"], ["leg-sf-418"]),
        opt("keep-sf-418", "No, keep the law as it is now", "Keep gender identity out of Iowa's civil rights law.", ["5.46"], ["leg-sf-418"]),
    ],
    unanswered=["SF 579 and facilities: no documented position for either candidate."])

question(16, "immigration", "Immigration enforcement", "public-safety", "government",
    "What should Iowa do about immigration?",
    "Immigration laws are mostly set by the federal government. States decide things like who gets state benefits and whether local police work with federal immigration agents.",
    ["7.67"], [
        opt("cooperate-enforcement", "Help federal agents", "Require state and local police to work with federal immigration enforcement.", ["7.67"]),
        opt("bar-benefits", "No state benefits for people here illegally", "Don't give state benefits to people who are in the country illegally.", ["7.67"]),
        opt("leave-to-federal", "Leave it to the federal government", "Let the federal government handle immigration.", ["7.67"]),
        opt("worker-safety", "Focus on law-abiding workers", "Focus on making immigrants who work and follow the law feel safe in Iowa.", ["7.67"]),
    ],
    unanswered=["ICE cooperation, 287(g), E-Verify, SF 2340, and SF 2218: no documented position for either candidate."])

question(17, "data-centers-energy", "Energy, data centers, and utility costs", "environment-energy", "environment",
    "How should Iowa handle big data centers?",
    "Data centers are huge buildings full of computers run by tech companies. They use a lot of electricity and water. Iowa has given them tax breaks to build here.",
    ["6.59", "11.101", "1.04", "1.07"], [
        opt("pay-own-way", "No tax breaks; they pay their own way", "End the tax breaks and make them pay the full cost of the power, water, and roads they need.", ["6.59", "1.04"]),
        opt("moratorium", "Pause new ones", "Stop new data centers from being built for now.", ["6.59"]),
        opt("local-decision", "Let each county decide", "Let counties decide whether and how to allow them.", ["6.59"]),
        opt("keep-incentives", "Keep the tax breaks", "Keep offering tax breaks to bring in jobs and tax money.", ["6.59", "1.04"]),
    ])

question(18, "minimum-wage", "Jobs, wages, and workforce development", "labor", "economy",
    "Should Iowa raise its minimum wage?",
    "Iowa's minimum wage is $7.25 an hour, the same as the federal minimum.",
    ["8.71"], [
        opt("raise-and-index", "Yes, and keep it rising with prices", "Raise it step by step (for example, to $12), then raise it automatically as prices go up.", ["8.71"]),
        opt("raise-modestly", "Yes, a little", "Raise it some, without automatic increases.", ["8.71"]),
        opt("keep-federal", "No, keep it at $7.25", "Keep it at $7.25, the federal minimum.", ["8.71"]),
        opt("local-option", "Let cities and counties decide", "Let each city or county set its own minimum wage.", ["8.71"]),
    ])

question(19, "government-oversight", "Government transparency and accountability", "institutions", "government",
    "How should Iowa keep watch over how the state spends taxpayer money?",
    "The State Auditor's office checks how state agencies spend taxpayer money. A 2023 law limited which records the Auditor can see.",
    ["9.81", "9.82", "9.83"], [
        opt("restore-auditor", "Give the Auditor full access again", "Undo the 2023 limits so the State Auditor can see all records.", ["9.83"]),
        opt("third-party-audits", "Use outside auditors", "Rely more on independent outside firms to check state programs.", ["9.83"]),
        opt("current-sufficient", "It's fine as it is", "Keep the current oversight; it's enough.", ["9.83"]),
    ])

question(20, "state-and-local-authority", "Elections, individual privacy, and state government authority", "institutions", "government",
    "Who should make more of the decisions: your city and county, or the state?",
    "State lawmakers decide what cities and counties are allowed to do on their own.",
    ["9.88", "9.85", "9.87", "5.49"], [
        opt("more-local", "My city and county", "Let cities and counties make more of their own decisions.", ["9.88"]),
        opt("current-balance", "Keep it as it is", "Keep the current balance between the state and local governments.", ["9.88"]),
        opt("more-uniform", "The state", "Set more rules that are the same across the whole state.", ["9.88"]),
    ],
    unanswered=["Voter ID and early voting: no documented position for either candidate."])

# --------------------------------------------------------------------------
# Positions: one per candidate per question
# --------------------------------------------------------------------------
positions = []
stmt_by_id = {s["id"]: s for s in statements}

def position(qid, cand, cls, summary=None, statements_=(), relations=None, rationale=None, proposal=None,
             declined=False, limitations=None, stance=None):
    sts = [stmt_by_id[s] for s in statements_]
    q = next(q for q in questions if q["id"] == qid)
    if cls == "NDP":
        verification = "verified"  # the finding "none found" is itself documented by the research
    elif cls == "SNV":
        verification = "unverified"
    else:
        verification = "verified" if any(s["verificationStatus"] == "verified" for s in sts) else "unverified"
    found = True if cls in ("EP", "SP", "DA", "CF") else False if cls == "NDP" else None
    dates = sorted(s["date"] for s in sts if s["date"])
    positions.append({
        "id": f"pos-{qid}-{cand}", "candidateId": cand, "questionId": qid, "issueIds": q["issueIds"],
        "evidenceClass": cls, "positionFound": found, "positionSummary": summary,
        "documentedStance": stance, "declinedToCommit": declined, "proposal": proposal,
        "comparableToUserPreference": True if relations else (None if cls == "NDP" else False),
        "optionRelations": relations, "relationRationale": rationale,
        "statementIds": [s["id"] for s in sts],
        "sourceIds": sorted({s["sourceId"] for s in sts}),
        "statementDate": dates[-1] if dates else None,
        "verificationStatus": verification, "researchCutoff": CUTOFF,
        "evidenceLimitations": limitations, "reviewStatus": "draft",
    })

U = "unaddressed"

# Q1
position("q01", SAND, "EP", "Give the recent property tax changes time to play out before adjusting them.",
    ["st-sand-property-play-out"],
    {"reduce-further": "conflicting", "relief-preserve": U, "maintain-evaluate": "aligned", "local-flexibility": U},
    "Sand said the current changes should play out before being adjusted, which matches waiting to evaluate and differs from cutting further now. His remark that local officials “know their communities” is a paraphrase and does not establish a position on new local funding authority.",
    limitations="Reported as a paraphrase of the debate.")
position("q01", LAHN, "EP", "Long-term elimination of property taxes on primary residences; higher rates on institutional investors and data centers.",
    ["st-lahn-rent-home", "st-lahn-dc-5x"],
    {"reduce-further": "aligned", "relief-preserve": U, "maintain-evaluate": "conflicting", "local-flexibility": U},
    "Lahn's long-term goal of eliminating property taxes on primary residences matches further reduction and differs from holding the current reforms in place. He has stated no plan for replacing local revenue, so the relation to preserving services is not established.",
    proposal="Eliminate property taxes on primary residences over the long term; tax data centers at 5x the normal rate.",
    limitations="He has pledged “no property tax raises” while proposing targeted increases on investors and data centers, and has not reconciled the two. No revenue replacement plan.")

# Q2
position("q02", SAND, "CF", "Statements on the income tax have shifted between 2025 and 2026; shown in date order.",
    ["st-sand-tax-2025", "st-sand-tax-2026-06", "st-sand-tax-reasonable", "st-sand-tax-politifact"],
    limitations="The research classifies this as conflicting evidence. His most recent statements say he would not repeal the cuts; the 2025 remark proposed no rate change. No explanation for the shift was found.")
position("q02", LAHN, "EP", "Eliminate the state income tax over time, paid for by cutting waste.",
    ["st-lahn-income-zero"],
    {"eliminate": "aligned", "keep-rate": "conflicting", "pause-cuts": "conflicting", "raise-higher-incomes": "conflicting"},
    "Lahn's stated goal is to get the income tax “to zero,” which differs from keeping, pausing at, or raising the current rate.",
    proposal="Phase out the income tax through efficiency savings. No timeline.",
    limitations="Quoted from an advocacy group's summary (ITR Foundation). No timeline or offsetting cuts specified.")

# Q3
position("q03", SAND, "SP", "Zoning reform for more housing types, faster permitting, and interest-free down payment aid.",
    ["st-sand-housing"],
    {"zoning": "aligned", "investor-limits": U, "buyer-aid": "aligned", "private-market": U},
    "Sand's proposals include both zoning reform and down payment aid. His investor limits concern farmland, not homes.",
    proposal="Zoning for duplexes, quadplexes and ADUs; permitting; interest-free down payment aid.",
    limitations="The research does not name the specific plan document for these proposals.")
position("q03", LAHN, "SP", "Ban hedge fund purchases of single-family homes; down payment accounts for young Iowans who stay.",
    ["st-lahn-housing"],
    {"zoning": U, "investor-limits": "aligned", "buyer-aid": "partial", "private-market": U},
    "Lahn proposes a hedge fund home-buying ban. His down payment help is tied to his youth retention plan for young Iowans who stay, a narrower form of buyer assistance.",
    proposal="Hedge fund home-buying ban; tax rebates for down payment assistance.",
    limitations="The research describes an income tax abatement deposited into a down payment account; his campaign site describes tax rebates for down payment assistance. Required years of residency are unspecified.")

# Q4
position("q04", SAND, "SP", "Limit outside farmland ownership; Office of Rural Prosperity; critical of tariffs.",
    ["st-sand-farm", "st-sand-tariffs"],
    {"antitrust": U, "ownership-limits": "aligned", "trade": "partial", "limited-role": U},
    "Sand proposes higher taxes on out-of-state landowners and a ban on large-scale hedge fund and LLC land purchases. He criticizes tariffs but proposes no state mechanism, so that relation is partial.",
    proposal="Higher taxes on out-of-state landowners; hedge fund and LLC land purchase ban; Office of Rural Prosperity.",
    limitations="Farm proposals are reported by Iowa Starting Line, a Democratic-leaning outlet.")
position("q04", LAHN, "SP", "State antitrust suits against agricultural input companies; confiscate land illegally owned by China.",
    ["st-lahn-antitrust", "st-lahn-ag-funding", "st-lahn-land"],
    {"antitrust": "aligned", "ownership-limits": "aligned", "trade": U, "limited-role": "conflicting"},
    "Lahn proposes antitrust suits and curbs on outside ownership, both active state roles. He has no documented position on tariffs.",
    proposal="Antitrust suits with more Attorney General funding; confiscate and resell land illegally owned by China; higher property tax on institutional investors.",
    limitations="How confiscation or antitrust suits would work legally is not addressed.")

# Q5
position("q05", SAND, "EP", "Opposes taking private property when it is not for public use.",
    ["st-sand-eminent"],
    {"prohibit-private": "aligned", "stricter-standards": U, "case-by-case": "conflicting"},
    "Sand's statement opposes takings that are not for public use, the general principle in the first option. This does not establish a position on any specific bill.",
    limitations="No bill named. Whether he would sign HF 2104 is not documented.")
position("q05", LAHN, "EP", "Absolutely opposes eminent domain for private company profit; still examining legal options.",
    ["st-lahn-eminent", "st-lahn-eminent-legal"],
    {"prohibit-private": "aligned", "stricter-standards": U, "case-by-case": "conflicting"},
    "Lahn's campaign site states absolute opposition to eminent domain for private company profit, the general principle in the first option. He said he is still examining legal options.",
    limitations="No bill named. Whether he would sign HF 2104 is not documented.")

# Q6
position("q06", SAND, "SP", "Conservation tax credits, manure plan verification, wetlands, monitoring funding, a dirty water alert, and IWILL funding.",
    ["st-sand-water", "st-sand-water-regulation"],
    {"incentives": "aligned", "enforceable-limits": U, "monitoring": "partial", "current-approach": "conflicting"},
    "Sand proposes new farm tax credits (incentives) alongside more monitoring and alerts. These are major changes to the current approach. His position on enforceable limits is unclear: he did not rule them out in 2025 and did not say in 2026.",
    proposal="Income and per-acre property tax credits for approved nutrient plans; restore monitoring funding; dirty water alert.",
    limitations="Silent on regulation in his 2026 plan.")
position("q06", LAHN, "SP", "Incentives for farmers to adopt proven conservation practices.",
    ["st-lahn-water", "st-lahn-water-practices", "st-lahn-water-right-thing"],
    {"incentives": "aligned", "enforceable-limits": U, "monitoring": U, "current-approach": "conflicting"},
    "Lahn proposes new incentives, a change to the current approach. The research also lists more monitoring, but no cited source confirms it, so no relation is drawn for monitoring. He has not stated a position on enforceable limits.",
    proposal="Incentives for proven conservation practices.",
    limitations="Deep-banding credits, buffer strip aid, and more monitoring appear in the research without a confirmed source.")

# Q7
position("q07", SAND, "SP", "Cabinet-level cancer task force, $20 million for research, tobacco and nicotine taxes, nitrate alerts, radon disclosure.",
    ["st-sand-cancer"],
    {"research-task-force": "aligned", "environmental-testing": "partial", "prevention": "aligned", "existing-programs": "conflicting"},
    "Sand proposes research funding and a task force, plus prevention measures. Nitrate alerts address an environmental exposure but are not a testing program.",
    proposal="$20 million for cancer research; cabinet-level task force; higher tobacco and nicotine taxes; radon disclosure.")
position("q07", LAHN, "SP", "Independent state safety testing of products; redirect University of Iowa research; expanded screenings.",
    ["st-lahn-cancer", "st-lahn-cancer-env", "st-lahn-screening"],
    {"research-task-force": "partial", "environmental-testing": "aligned", "prevention": "partial", "existing-programs": "conflicting"},
    "Lahn's central proposal is state testing of products used in Iowa. He would redirect research rather than add a task force, and supports expanded screening.",
    proposal="Independent state safety testing of products used in Iowa; refocus University of Iowa research.")

# Q8
position("q08", SAND, "SP", "Raise Medicaid reimbursement rates.",
    ["st-sand-reimbursement"],
    {"reimbursement": "aligned", "prompt-payment": U, "regional-care": U, "deregulate": U},
    "Sand proposes higher reimbursement rates. His other rural health positions are not documented.",
    proposal="Higher Medicaid reimbursement rates.")
position("q08", LAHN, "GS", "Called for prompt payment for providers, without a specific proposal.",
    ["st-lahn-prompt-payment"],
    limitations="General statement; the research does not cite its source.")

# Q9
position("q09", SAND, "SP", "End privatized Medicaid managed care, starting on day one; raise reimbursement rates.",
    ["st-sand-medicaid", "st-sand-reimbursement"],
    {"end-managed-care": "aligned", "keep-with-oversight": "conflicting", "keep-as-is": "conflicting"},
    "Sand would end privatized managed care.",
    proposal="End Medicaid privatization starting on day one. No transition cost given.")
position("q09", LAHN, "EP", "Keep managed care; bar companies from using AI to deny coverage.",
    ["st-lahn-medicaid"],
    {"end-managed-care": "conflicting", "keep-with-oversight": "aligned", "keep-as-is": "partial"},
    "Lahn opposes government-delivered health care and would add a specific rule (no AI coverage denials), which is added oversight of the companies.",
    limitations="He previously opposed Medicaid expansion with AFP Montana and has said those concerns “have largely been addressed.”")

# Q10
position("q10", SAND, "SP", "A 5% increase in state school aid in year one.",
    ["st-sand-school-aid"],
    {"increase-significantly": "aligned", "modest-increases": U, "hold-steady": "conflicting"},
    "Sand has named a 5% first-year increase. The research does not state recent increase levels, so its relation to “modest increases” is not established.",
    proposal="5% increase in state aid in year one.", limitations="No cost estimate.")
position("q10", LAHN, "GS", "Says the governor must be the top advocate for public school students; has named no aid figure.",
    ["st-lahn-public-school"])

# Q11
position("q11", SAND, "SP", "Keep ESAs but add income limits, annual audits, and tuition increase limits.",
    ["st-sand-esa-rules", "st-sand-esa-wealthiest", "st-sand-esa-no-repeal", "st-sand-esa-report"],
    {"expand": "conflicting", "keep-universal": "conflicting", "income-limits": "aligned", "phase-out": "conflicting"},
    "Sand proposes income limits and is not proposing repeal.",
    proposal="Income limits, annual audits, tuition caps, and a “take the public” admission rule.")
position("q11", LAHN, "EP", "ESAs are a foundational freedom; would expand them; supports third-party audits.",
    ["st-lahn-esa-freedom", "st-lahn-esa-expand", "st-lahn-esa-audits"],
    {"expand": "aligned", "keep-universal": "partial", "income-limits": "conflicting", "phase-out": "conflicting"},
    "Lahn defends the universal program and has said he would expand it.",
    limitations="His support for expansion is an Iowa Capital Dispatch paraphrase.")

# Q12
position("q12", SAND, "IND", "His campaign has criticized Lahn's mRNA stance; no documented position on school vaccine requirements.",
    [], limitations="Indirect evidence only. HPV consent law: no documented position.")
position("q12", LAHN, "EP", "Supports ending school vaccine requirements.",
    ["st-lahn-vaccine-jan", "st-lahn-vaccine-iowapress", "st-lahn-vaccine-kcci", "st-lahn-vaccine-benefits"],
    {"keep-requirements": "conflicting", "easier-exemptions": "partial", "end-requirements": "aligned"},
    "Radio Iowa reported he would end vaccine requirements for school enrollment, and he answered “Yes” on Iowa Press to repealing vaccine mandates. Making exemptions easier moves in the same direction but stops short of ending requirements.",
    limitations="A September 2026 KCCI answer rests on a transcript published by the Iowa Democratic Party and could not be independently located. He has also said vaccination has benefits; the research flags his mRNA statements as conflicting.")

# Q13
position("q13", SAND, "EP", "Says the six-week ban goes too far; would veto further restrictions.",
    ["st-sand-abortion", "st-sand-roe"],
    {"further-restrict": "conflicting", "keep-current": "conflicting", "broaden-access": "aligned"},
    "Sand says the six-week ban “goes too far,” which differs from keeping or tightening it, and would veto further restrictions.",
    limitations="He says he cannot repeal the six-week law unilaterally. The research's report that he supports the Roe framework (The Gazette, September 2026) could not be located.")
position("q13", LAHN, "EP", "Holds that life begins at conception and wants to continue protecting life.",
    ["st-lahn-protect-life", "st-lahn-conception", "st-lahn-ivf"],
    {"further-restrict": U, "keep-current": U, "broaden-access": "conflicting"},
    "Lahn's statements oppose broadening access. Whether he would keep the current law or restrict it further is not established: a report that he called for a total ban is not verified.",
    limitations="Exceptions for rape, incest, or the life of the mother, and HF 2788: not verified.")

# Q14
position("q14", SAND, "IND", "Gun owner and hunter; no verified current firearms policy position.",
    ["st-sand-firearms"], limitations="Reported 2021 posts against permitless carry come from a GOP-aligned site and are not verified.")
position("q14", LAHN, "NDP")

# Q15
position("q15", SAND, "EP", "Opposes SF 418's removal of gender identity from the Iowa Civil Rights Act.",
    ["st-sand-sf418", "st-sand-sf418-limits"],
    {"restore": "aligned", "keep-sf-418": "conflicting"},
    "Sand opposes the removal of gender identity protections.",
    limitations="He says a governor cannot restore the protections unilaterally; it would take the Legislature. He also opposes transgender girls and women competing in female sports, a separate question.")
position("q15", LAHN, "IND", "No documented statement on SF 418.",
    ["st-lahn-book"], limitations="His debate remark about a school library book is indirect and does not establish a position on SF 418.")

# Q16
position("q16", SAND, "GS", "Questioned why law-abiding, working immigrants should feel unsafe; no specific policy.",
    ["st-sand-immigration"], limitations="From a town hall video reported by Iowa Starting Line, a Democratic-leaning outlet; an independent check could not locate it. ICE cooperation and 287(g): no documented position.")
position("q16", LAHN, "SP", "Ban state benefits for people in the country illegally; end H-1B hiring in state government and universities.",
    ["st-lahn-immigration", "st-lahn-immigration-contractors"],
    {"cooperate-enforcement": U, "bar-benefits": "aligned", "leave-to-federal": U, "worker-safety": U},
    "Lahn proposes barring benefits. He has no documented position on police cooperation with federal enforcement.",
    proposal="Ban benefits for illegal immigrants; stop H-1B hiring in state government and universities; contractor disclosure of Iowan hires.",
    limitations="H-1B status is federal; the state controls only its own hiring.")

# Q17
position("q17", SAND, "SP", "End data center tax breaks; data centers pay all of their own costs, including utility cost increases.",
    ["st-sand-dc"],
    {"pay-own-way": "aligned", "moratorium": U, "local-decision": U, "keep-incentives": "conflicting"},
    "Sand would end tax breaks and require data centers to cover their own costs.",
    proposal="No tax breaks; cover 100% of costs; no NDAs; union construction; integrated resource planning.")
position("q17", LAHN, "SP", "No incentives; positions have moved from a 5x property tax to a moratorium to state-level regulation.",
    ["st-lahn-dc-5x", "st-lahn-dc-moratorium", "st-lahn-dc-state"],
    {"pay-own-way": "aligned", "moratorium": "partial", "local-decision": "partial", "keep-incentives": "conflicting"},
    "Lahn consistently opposes incentives and proposed a higher tax rate. He called for a moratorium and county-by-county decisions in July, then state-level regulation in August, so those relations are partial.",
    limitations="He has not said whether the 5x tax still applies. See the dated statements.")

# Q18
position("q18", SAND, "SP", "Raise the minimum wage to $12 in phases, then index it.",
    ["st-sand-min-wage", "st-sand-min-wage-phases"],
    {"raise-and-index": "aligned", "raise-modestly": "partial", "keep-federal": "conflicting", "local-option": U},
    "Sand proposes a phased increase to $12 with indexing.",
    proposal="$12, phased in, then indexed. No timeline.")
position("q18", LAHN, "GS", "Declined to commit to raising the minimum wage.",
    ["st-lahn-min-wage"], declined=True,
    limitations="Declining to commit is not the same as opposing an increase. Reported as an NBC News paraphrase.")

# Q19
position("q19", SAND, "SP", "Restore the Auditor's full powers by reversing the 2023 law; mandatory PIE program; whistleblower protections.",
    ["st-sand-auditor"],
    {"restore-auditor": "aligned", "third-party-audits": U, "current-sufficient": "conflicting"},
    "Sand proposes reversing the 2023 limits on the Auditor's Office.",
    proposal="Reverse the 2023 law; make the PIE program mandatory; extend whistleblower protections to all Iowans.",
    limitations="Sand is the current State Auditor.")
position("q19", LAHN, "EP", "Supports third-party audits of the ESA program; no documented position on the 2023 law.",
    ["st-lahn-esa-audits"],
    {"restore-auditor": U, "third-party-audits": "partial", "current-sufficient": U},
    "Lahn's support for third-party audits is specific to the ESA program, so it partially overlaps a broader reliance on independent audits.")

# Q20
position("q20", SAND, "EP", "Called for more local control.",
    ["st-sand-local"],
    {"more-local": "aligned", "current-balance": "conflicting", "more-uniform": "conflicting"},
    "Sand called for more local control at the October 6 debate.", limitations="Reported as a paraphrase of the debate.")
position("q20", LAHN, "EP", "Counties should have far more control; favors decentralized power.",
    ["st-lahn-local", "st-lahn-centralized"],
    {"more-local": "aligned", "current-balance": "conflicting", "more-uniform": "conflicting"},
    "Lahn said counties “should have far more control” and that he wants to avoid centralized power.")

# --------------------------------------------------------------------------
# Self-checks, then write
# --------------------------------------------------------------------------
def norm(s):
    s = re.sub("[‘’]", "'", s)
    s = re.sub("[“”]", '"', s)
    return re.sub(r"\s+", " ", s)

raw_n = norm(RAW)
for s in statements:
    if s["quote"]:
        for frag in re.split(r"\s*\.\.\.\s*", norm(s["quote"])):
            assert frag in raw_n, f"quote not in research: {s['id']}: {frag}"
src_ids = {s["id"] for s in sources}
for s in statements:
    assert s["sourceId"] in src_ids, s["id"]
assert len(questions) == 20
for q in questions:
    for c in (SAND, LAHN):
        assert any(p["questionId"] == q["id"] and p["candidateId"] == c for p in positions), (q["id"], c)

check = json.loads((ROOT / "research/verification/source-check-2026-10-12.json").read_text())
verifications = []
for v in check["statements"]:
    if v["statementId"] not in stmt_by_id:
        continue
    if v.get("quoteFound") is False or v.get("summarySupported") in ("false", "partial"):
        result = "corrected"
    elif v.get("summarySupported") == "true" or v.get("quoteFound"):
        result = "confirmed"
    else:
        result = "unconfirmed"
    verifications.append({
        "id": f"ver-{v['statementId']}", "entityType": "statement", "entityId": v["statementId"],
        "verifiedDate": CUTOFF, "method": "Independent web check of the original source (research/verification/source-check-2026-10-12.json)",
        "result": result, "notes": v.get("notes") or None,
    })

def write(name, rows):
    (DATA / name).write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")

write("candidates.json", candidates)
write("sources.json", sources)
write("statements.json", statements)
write("questions.json", questions)
write("positions.json", positions)
write("verifications.json", verifications)
print(f"{len(questions)} questions, {len(statements)} statements, {len(positions)} positions, {len(sources)} sources")
