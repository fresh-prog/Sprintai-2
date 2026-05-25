import { expect, test } from '@playwright/test';

// Golden path: register → land on dashboard → see capture link → logout.
// We don't drive the webcam here (browser sandbox + no real camera in CI);
// the Capture page itself is covered by `capture.spec.js` with a mocked
// MediaPipe pipeline.

test('user can register and land on dashboard', async ({ page }) => {
  const suffix = Date.now();
  const email = `e2e+${suffix}@example.com`;

  await page.goto('/register');
  await page.getByPlaceholder('Display name').fill('E2E User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder(/Password/).fill('correct-horse-battery');
  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /capture/i })).toBeVisible();
});

test('login fails with bad credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('nobody@example.com');
  await page.getByPlaceholder('Password').fill('not-the-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});

test('protected routes redirect anonymous users to login', async ({ page }) => {
  await page.goto('/sessions');
  await expect(page).toHaveURL(/\/login$/);
});
