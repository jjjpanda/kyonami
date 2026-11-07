import test from 'node:test';
import assert from 'node:assert/strict';
import { blurGlow } from '../src/render/glow.js';

test('glow spreads symmetrically without bleeding transparent RGB into its color', () => {
  const n = 31;
  const data = new Uint8ClampedArray(n * n * 4);
  // Invisible blue must not contaminate an opaque red source.
  for (let i = 0; i < data.length; i += 4) data[i + 2] = 255;
  const center = ((n >> 1) * n + (n >> 1)) * 4;
  data.set([255, 0, 0, 255], center);
  blurGlow(data, n, 2);
  const alpha = (x, y) => data[(y * n + x) * 4 + 3];
  assert.ok(alpha(15, 15) > alpha(18, 15));
  assert.ok(alpha(18, 15) > 0);
  for (let offset = 1; offset < 8; offset++) {
    assert.equal(alpha(15 - offset, 15), alpha(15 + offset, 15));
    assert.equal(alpha(15, 15 - offset), alpha(15, 15 + offset));
    assert.equal(alpha(15 + offset, 15), alpha(15, 15 + offset));
  }
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]) assert.deepEqual([...data.slice(i, i + 3)], [255, 0, 0]);
  }
});

test('glow has transparent boundaries, never wraps rows, and reuses scratch buffers', () => {
  const n = 32;
  const data = new Uint8ClampedArray(n * n * 4);
  data.set([40, 120, 240, 255], (n - 1) * 4);
  const scratch = blurGlow(data, n, 1);
  assert.equal(data[(n + 0) * 4 + 3], 0);
  assert.ok(data[(n - 1) * 4 + 3] > 0);
  const { a, b } = scratch;
  data.fill(0);
  blurGlow(data, n, 100, scratch);
  assert.equal(scratch.a, a);
  assert.equal(scratch.b, b);
  assert.ok(data.every(value => value === 0));
  blurGlow(new Uint8ClampedArray(4), 1, 2, scratch);
  assert.equal(scratch.a.length, 4);
});
