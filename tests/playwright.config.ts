import { defineConfig } from '@playwright/test'

// Override with TEST_PORT when the default port is held by another dev
// session (webServer reuses whatever is already listening on the port).
const PORT = Number(process.env.TEST_PORT ?? 5174)

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  globalSetup: './helpers/global-setup.ts',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
  },
  webServer: {
    command: 'npx vite',
    cwd: '..',
    port: PORT,
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
