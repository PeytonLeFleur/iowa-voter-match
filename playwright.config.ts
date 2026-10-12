import { defineConfig, devices } from '@playwright/test'

// Runs against the static export served under the same base path as GitHub Pages.
const BASE_PATH = process.env.BASE_PATH ?? '/iowa-voter-match'
const PORT = 4173

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}${BASE_PATH}/`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node scripts/serve-static.mjs',
    env: { BASE_PATH, PORT: String(PORT) },
    url: `http://localhost:${PORT}${BASE_PATH}/`,
    reuseExistingServer: !process.env.CI,
  },
})
