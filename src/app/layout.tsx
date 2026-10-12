import type { Metadata } from 'next'
import { Newsreader, Public_Sans } from 'next/font/google'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import { SITE_NAME, assetPath } from '@/lib/site'
import './globals.css'

const serif = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', display: 'swap' })
const sans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans', display: 'swap' })

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description:
    'Answer 20 questions about Iowa’s future, see which issues matter most to you, and compare the candidates’ documented positions using original sources.',
  icons: { icon: assetPath('/favicon.svg') },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
