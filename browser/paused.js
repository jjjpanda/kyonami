import { expect } from '@playwright/test';

/** Opens a non-embed chamber, then pauses it and restarts the simulation at step 0. */
export async function openPaused(page, url) {
  await page.goto(url);
  const chamber = page.locator('kyonami-chamber');
  await expect.poll(() => chamber.evaluate(el => Boolean(el.frame))).toBe(true);
  await chamber.evaluate(el => {
    el.setPlaying(false);
    el.client.restart('init', { settings: el.settings });
  });
  await expect.poll(() => chamber.evaluate(el => !el.client.busy && el.frame.stepIndex === 0)).toBe(true);
  return chamber;
}
