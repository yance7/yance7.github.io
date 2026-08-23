import { expect, test } from '@playwright/test'

test('shared project actions expose stable keyboard targets', async ({ page }) => {
  await page.goto('/works.html')

  const projectLink = page.getByRole('link', { name: /ENTER PROJECT/i }).first()
  await projectLink.focus()

  await expect(projectLink).toBeFocused()
  await expect(projectLink).toHaveClass(/y-button/)

  const box = await projectLink.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(42)
})
