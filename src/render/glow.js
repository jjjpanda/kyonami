// Approximate a Gaussian with three box blurs on the small wave texture.
// Premultiplied colors keep transparent edges from producing dark halos.
// This avoids filtered drawImage, which can corrupt accelerated mobile canvases.
export function blurGlow(data, n, sigma, scratch = {}) {
  const length = n * n * 4;
  if (scratch.a?.length !== length) {
    scratch.a = new Float32Array(length);
    scratch.b = new Float32Array(length);
  }
  const { a, b } = scratch;
  for (let i = 0; i < length; i += 4) {
    const alpha = data[i + 3] / 255;
    a[i] = data[i] * alpha;
    a[i + 1] = data[i + 1] * alpha;
    a[i + 2] = data[i + 2] * alpha;
    a[i + 3] = data[i + 3];
  }

  const idealWidth = Math.sqrt(4 * sigma * sigma + 1);
  let lower = Math.floor(idealWidth);
  if (lower % 2 === 0) lower--;
  const lowerPasses = Math.round((12 * sigma * sigma - 3 * lower * lower - 12 * lower - 9) / (-4 * lower - 4));
  for (let pass = 0; pass < 3; pass++) {
    const radius = (pass < lowerPasses ? lower - 1 : lower + 1) / 2;
    blurAxis(a, b, n, radius, false);
    blurAxis(b, a, n, radius, true);
  }

  for (let i = 0; i < length; i += 4) {
    const alpha = a[i + 3];
    const scale = alpha > 0 ? 255 / alpha : 0;
    data[i] = a[i] * scale;
    data[i + 1] = a[i + 1] * scale;
    data[i + 2] = a[i + 2] * scale;
    data[i + 3] = alpha;
  }
  return scratch;
}

function blurAxis(source, target, n, radius, vertical) {
  const stride = vertical ? n * 4 : 4;
  const lineStride = vertical ? 4 : n * 4;
  const divisor = radius * 2 + 1;
  for (let line = 0; line < n; line++) {
    const start = line * lineStride;
    let red = 0, green = 0, blue = 0, alpha = 0;
    // Samples beyond the texture are transparent; never wrap into another row.
    for (let k = 0; k <= Math.min(radius, n - 1); k++) {
      const i = start + k * stride;
      red += source[i]; green += source[i + 1]; blue += source[i + 2]; alpha += source[i + 3];
    }
    for (let k = 0; k < n; k++) {
      const i = start + k * stride;
      target[i] = red / divisor;
      target[i + 1] = green / divisor;
      target[i + 2] = blue / divisor;
      target[i + 3] = alpha / divisor;
      const leaving = k - radius;
      const entering = k + radius + 1;
      if (leaving >= 0) {
        const j = start + leaving * stride;
        red -= source[j]; green -= source[j + 1]; blue -= source[j + 2]; alpha -= source[j + 3];
      }
      if (entering < n) {
        const j = start + entering * stride;
        red += source[j]; green += source[j + 1]; blue += source[j + 2]; alpha += source[j + 3];
      }
    }
  }
}
