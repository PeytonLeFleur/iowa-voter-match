import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const IMPORTANCE = ['Doesn’t affect me', 'Slightly important', 'Moderately important', 'Very important', 'Extremely passionate']

async function answer(page: Page, importance: string, option: string | 'unsure') {
  const groups = page.locator('fieldset')
  await groups.nth(0).getByText(importance, { exact: true }).click()
  if (option === 'unsure') await groups.nth(1).getByText('Unsure or need more information').click()
  else await groups.nth(1).getByText(option, { exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('assessment/')
  await page.evaluate(() => localStorage.clear())
})

test('completes 20 screens, autosaves, and produces results with denominators', async ({ page }) => {
  await page.goto('assessment/?q=1')
  for (let i = 1; i <= 20; i++) {
    await expect(page.getByText(`Question ${i} of 20`)).toBeVisible()
    await expect(page.locator('fieldset').nth(0).locator('input[type=radio]')).toHaveCount(5)
    // Alternate importance; choose the first option on even questions, unsure on odd ones.
    const imp = IMPORTANCE[i % 5]!
    if (i % 2 === 0) {
      const first = page.locator('fieldset').nth(1).locator('label').first().locator('span.block.font-medium')
      await answer(page, imp, (await first.textContent())!)
    } else await answer(page, imp, 'unsure')
    if (i === 7) {
      await page.reload() // autosave survives a refresh mid-assessment
      await expect(page.locator('fieldset').nth(0).locator('input:checked')).toHaveValue(String(7 % 5))
    }
    await page.getByRole('button', { name: i < 20 ? 'Next' : 'Review answers' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible()
  await page.getByRole('button', { name: 'See my results' }).click()

  await expect(page).toHaveURL(/results\/$/)
  await expect(page.getByRole('heading', { name: 'Your priorities', level: 1 })).toBeVisible()
  // Every rating level was used 4 times.
  await expect(page.getByText('4 of 20 questions (20%)').first()).toBeVisible()
  // Completeness: 10 options chosen, 10 unsure.
  await expect(page.getByText('10 of 20 (50%)').first()).toBeVisible()
  // Candidate sections report coverage with numerator and denominator.
  await expect(page.getByText(/Documented, comparable positions found for \d+ of \d+ of your chosen positions/).first()).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target + ' ' + (n.any[0]?.message ?? '')).join(' | ')}`)).toEqual([])
})

test('editing importance on the results page updates analytics immediately', async ({ page }) => {
  await page.goto('assessment/?q=1')
  await answer(page, 'Extremely passionate', 'Reduce further')
  await page.goto('results/')
  await expect(page.getByText('1 of 1 rated issues')).toBeVisible()
  await page.getByLabel('Importance of Property taxes').selectOption({ label: 'Slightly important' })
  await expect(page.getByText('0 of 1 rated issues')).toBeVisible()
})

test('missing evidence is labeled neutrally, never as disagreement', async ({ page }) => {
  await page.goto('assessment/?q=14')
  await answer(page, 'Extremely passionate', 'Keep current law')
  await page.goto('compare/')
  const firearms = page.locator('article#firearms')
  await expect(firearms.getByText('No public position found')).toBeVisible()
  await expect(firearms.getByText(/as of October 12, 2026/)).toBeVisible()
  await expect(firearms).not.toContainText(/disagrees|opposes your|0%/i)
})

test('declined to commit is not opposition (minimum wage)', async ({ page }) => {
  await page.goto('assessment/?q=18')
  await answer(page, 'Very important', 'Raise and index')
  await page.goto('compare/')
  const mw = page.locator('article#minimum-wage')
  await expect(mw.getByText('No definite stance established')).toBeVisible()
  await expect(mw.getByText('Documented alignment with your choice')).toBeVisible()
})

test('conflicting evidence is shown oldest first', async ({ page }) => {
  await page.goto('compare/')
  const tax = page.locator('article#income-tax-and-spending')
  await expect(tax.getByText('Statements, oldest first')).toBeVisible()
  const dates = await tax.locator('li p.text-xs').allTextContents()
  const i2025 = dates.findIndex((d) => d.includes('May 12, 2025'))
  const i2026 = dates.findIndex((d) => d.includes('September 17, 2026'))
  expect(i2025).toBeGreaterThanOrEqual(0)
  expect(i2025).toBeLessThan(i2026)
})

test('candidate column order can be swapped and persists', async ({ page }) => {
  await page.goto('compare/')
  const headings = () => page.locator('article#property-taxes h4').allTextContents()
  const before = await headings()
  await page.getByRole('button', { name: 'Swap candidate columns' }).click()
  const after = await headings()
  expect(after).toEqual([before[0], before[2], before[1]])
  await page.reload()
  expect(await headings()).toEqual(after)
})

test('report renders and prints', async ({ page }) => {
  await page.goto('assessment/?q=9')
  await answer(page, 'Extremely passionate', 'Keep it, with more oversight')
  await page.goto('results/report/')
  await expect(page.getByRole('heading', { name: 'My Iowa governor research brief' })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeHidden()
  await expect(page.getByText('Medicaid and health coverage (Extremely passionate)')).toBeVisible()
})
