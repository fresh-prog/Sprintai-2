import { expect, test } from '@playwright/test';

// Capture happy-path. Requires the frontend to be running with
// VITE_E2E_MOCK_POSE=1 — that swaps the MediaPipe WASM model for a
// deterministic landmark stub so the test works without a real camera.

test.skip(
  process.env.VITE_E2E_MOCK_POSE !== '1',
  'set VITE_E2E_MOCK_POSE=1 to enable the capture spec',
);

test('user can register, start a session, and see live readouts', async ({ page, context }) => {
  await context.grantPermissions(['camera']);

  const email = `e2e+cap-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByPlaceholder('Display name').fill('Cap User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder(/Password/).fill('correct-horse-battery');
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL('/');

  await page.getByRole('link', { name: /capture/i }).click();
  await expect(page.getByRole('heading', { name: /live capture/i })).toBeVisible();

  // Start should be enabled once the (mock) detector + camera are ready.
  const start = page.getByRole('button', { name: /start session/i });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();

  // Either of these readouts is fine — proves the WS round-trip is working.
  await expect(
    page.getByText(/posture|activity|live joint angles/i).first(),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /stop session/i }).click();
});
