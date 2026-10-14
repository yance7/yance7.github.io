import { test as base } from '@playwright/test'

// Browser page creation is bounded separately from the behavior under test.
// Reusing the project context preserves device settings and failure evidence.
export const test = base.extend({
  page: [async ({ context }, use) => {
    await use(await context.newPage())
  }, { scope: 'test', timeout: 30000 }]
})
