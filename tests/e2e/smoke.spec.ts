import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = ['', 'assessment/', 'results/', 'results/report/', 'compare/', 'issues/', 'candidates/', 'methodology/', 'sources/', 'about/', 'privacy/']

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
