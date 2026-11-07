import { test, expect } from '@playwright/test';

test.use({ deviceScaleFactor: 3 });

test('wave glow renders without canvas filters at mobile density and after resizing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?preset=causal-crystal&autoplay=false');
  const chamber = page.locator('kyonami-chamber');
  await expect.poll(() => chamber.evaluate(el => Boolean(el.frame))).toBe(true);
  await chamber.evaluate(el => {
    // Catch any return to the accelerated canvas-filter path, including offscreen contexts.
    const descriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'filter');
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'filter', {
      ...descriptor,
      set(value) {
        if (value !== 'none') throw new Error(`Canvas filter used: ${value}`);
        descriptor.set.call(this, value);
      }
    });
    for (const theme of ['citypop', 'cyber', 'daylight']) el.setTheme(theme);
    el.renderer.zoom = 1.5;
    el.renderCurrentFrame();
    el.client.send('advance', { steps: 2 });
  });
  await expect.poll(() => chamber.evaluate(el => el.frame.stepIndex)).toBe(2);
  for (const viewport of [{ width: 360, height: 780 }, { width: 780, height: 360 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => chamber.evaluate(el => [el.renderer.canvas.width, el.renderer.canvas.height]))
      .toEqual([viewport.width * 2, viewport.height * 2]);
    const pixels = await chamber.evaluate(el => {
      const { data } = el.renderer.glowPixels;
      let lit = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) lit++;
      const bounds = el.renderer.cameraProjection(el.renderer.canvas.width, el.renderer.canvas.height, el.frame.field.worldRadius).worldBoundsScreen();
      return { lit, textureWidth: el.renderer.lastTextureWidth, width: bounds.w };
    });
    expect(pixels.lit).toBeGreaterThan(0);
    expect(pixels.textureWidth).toBe(pixels.width);
  }
  expect(errors).toEqual([]);
});
