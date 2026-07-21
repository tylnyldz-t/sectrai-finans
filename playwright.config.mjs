import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: { browserName: 'chromium', headless: true },
  webServer: [
    { command: 'SECTRAI_FINANS_DATA_FILE=/tmp/sectrai-finans-e2e.json npm run api', port: 8788, reuseExistingServer: false },
    { command: 'npm run dev -- --host 127.0.0.1 --port 4178', port: 4178, reuseExistingServer: false },
  ],
})
