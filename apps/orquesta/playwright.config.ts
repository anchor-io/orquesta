import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: { command: 'npm run build && npm run preview -- --host', port: 4173 },
  testMatch: '**/*.e2e.{ts,js}'
});
