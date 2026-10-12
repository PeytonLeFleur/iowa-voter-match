import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = ['', 'assessment/', 'results/', 'results/report/', 'compare/', 'issues/', 'candidates/', 'methodology/', 'sources/', 'about/', 'privacy/',
  'issues/1-01-property-tax-sf-2472/', 'issues/2-16/', 'candidates/rob-sand/', 'candidates/zach-lahn/', 'internal/audit/']

for (const path of PAGES) {
  test(`/${path} loads, has one h1, and passes axe`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
  })
}

test('data cutoff is visible in the footer', async ({ page }) => {
  await page.goto('')
  await expect(page.locator('footer')).toContainText('Research current as of October 12, 2026')
})

test('home page links navigate within the base path', async ({ page }) => {
  await page.goto('')
  await page.getByRole('link', { name: 'Start 20 Questions' }).click()
  await expect(page).toHaveURL(/\/iowa-voter-match\/assessment\/$/)
  await page.reload()
  await expect(page.locator('h1')).toHaveText('What should Iowa do about property taxes?')
})

test('issue deep links return 200 on refresh and show neutral missing evidence', async ({ page }) => {
  const res = await page.goto('issues/5-45-firearms/')
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Firearms')
  await expect(page.getByText(/could not establish this candidate’s position/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Firearms')
})

test('issue explorer lists all 107 issues and searches', async ({ page }) => {
  await page.goto('issues/')
  await expect(page.getByText('107 of 107 issues')).toBeVisible()
  await page.getByLabel('Search').fill('HF 2104')
  await expect(page.getByRole('link', { name: 'Eminent domain and CO2 pipelines' })).toBeVisible()
  await expect(page.getByText(/^\d+ of 107 issues$/)).not.toHaveText('107 of 107 issues')
})
