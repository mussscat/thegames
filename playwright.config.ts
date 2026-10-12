import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${PORT}`, storageState: 'e2e/storage-state.json' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // The Safari engine: the owner plays on iPhone Safari and desktop Safari-like browsers.
    { name: 'iphone', use: { ...devices['iPhone 14'] }, testMatch: /shell\.spec\.ts/ },
    { name: 'desktop-safari', use: { ...devices['Desktop Safari'] }, testMatch: /shell\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npm run preview -w @game/web -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
