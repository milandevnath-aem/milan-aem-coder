/* eslint-disable */
// Rebuilds the area behind the home hero form card (baked into the Figma export) so that
// wherever it shows around the card it continues the photo: sky from the band above,
// grass from the band below, horizon structure and texture from the strip right of the card.
import { createRequire } from 'node:module';

const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');

// figma: original 2x export (real photo right of x=1400, but text baked on the left)
// clean: the text-free version used on the site
const [figma, clean, output] = process.argv.slice(2);
// hole in the 2x export (card + its edge), exclusive bounds
const X0 = 1420; const X1 = 2536; const Y0 = 96; const Y1 = 1024;
const BAND = 12; // boundary band averaged to avoid single noisy pixels
const STRIP = 140; // texture strip right of the hole

const { data, info } = await sharp(figma).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const px = (x, y) => (y * width + x) * 3;
const cleanData = await sharp(clean).removeAlpha().resize(width, height).raw().toBuffer();
// left of the card area: text-free pixels, to the right: the original photo
const SPLIT = 1400;
const out = Buffer.alloc(data.length);
for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
  const p = px(x, y);
  const src = x < SPLIT ? cleanData : data;
  out[p] = src[p]; out[p + 1] = src[p + 1]; out[p + 2] = src[p + 2];
}

const smooth = (arr, r) => arr.map((_, i) => {
  let s = [0, 0, 0]; let n = 0;
  for (let k = Math.max(0, i - r); k <= Math.min(arr.length - 1, i + r); k += 1) {
    s = s.map((v, c) => v + arr[k][c]); n += 1;
  }
  return s.map((v) => v / n);
});
const mean = (x0, x1, y0, y1) => {
  const s = [0, 0, 0]; let n = 0;
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
    const p = px(x, y); s[0] += data[p]; s[1] += data[p + 1]; s[2] += data[p + 2]; n += 1;
  }
  return s.map((v) => v / n);
};

// boundaries: top / bottom per column, right per row
const top = smooth([...Array(X1 - X0)].map((_, i) => mean(X0 + i, X0 + i + 1, Y0 - BAND, Y0)), 60);
const bottom = smooth([...Array(X1 - X0)].map((_, i) => mean(X0 + i, X0 + i + 1, Y1, Y1 + BAND)), 40);
const right = smooth([...Array(Y1 - Y0)].map((_, i) => mean(X1, X1 + BAND, Y0 + i, Y0 + i + 1)), 6);

// texture for the grass: the real grass rows just below the hole, mirrored upwards
const GRASS = height - Y1;
const grassMean = smooth([...Array(X1 - X0)].map((_, i) => mean(X0 + i, X0 + i + 1, Y1, height)), 30);
const HORIZON = 800; // grass starts below the treeline of the strip right of the hole
const detail = (x, y) => {
  if (y < HORIZON) return [0, 0, 0];
  const d = Y1 - 1 - y;
  const m = d % (2 * GRASS);
  const sy = Y1 + (m < GRASS ? m : 2 * GRASS - 1 - m);
  const p = px(x, Math.min(height - 1, sy));
  const base = grassMean[x - X0];
  const w = Math.min(1, (y - HORIZON) / 60);
  return [(data[p] - base[0]) * w, (data[p + 1] - base[1]) * w, (data[p + 2] - base[2]) * w];
};

// left edge (sky above the car) and the car top: below it only the right edge is used
const left = smooth([...Array(Y1 - Y0)].map((_, i) => mean(X0 - BAND - 4, X0 - 4, Y0 + i, Y0 + i + 1)), 10);
const topEdge = smooth([...Array(X1 - X0)].map((_, i) => mean(X0 + i, X0 + i + 1, Y0 - BAND, Y0)), 8);
const bottomEdge = smooth([...Array(X1 - X0)].map((_, i) => mean(X0 + i, X0 + i + 1, Y1, Y1 + BAND)), 8);
const CAR_TOP = 540;
const EDGE = 40;
const smoothstep = (v) => v * v * (3 - 2 * v);

for (let y = Y0; y < Y1; y += 1) {
  const sky = y < CAR_TOP ? 1 : Math.max(0, 1 - (y - CAR_TOP) / 80);
  const wTop = Math.max(0, 1 - (y - Y0) / EDGE);
  const wBottom = Math.max(0, 1 - (Y1 - 1 - y) / EDGE);
  for (let x = X0; x < X1; x += 1) {
    const i = x - X0;
    const p = px(x, y);
    const d = detail(x, y);
    // 0 at the right edge, 1 at the left edge
    const u = smoothstep((X1 - 1 - x) / (X1 - X0 - 1));
    for (let c = 0; c < 3; c += 1) {
      const row = right[y - Y0][c] * (1 - u * sky) + left[y - Y0][c] * u * sky;
      let value = row + d[c];
      value = value * (1 - wTop) + topEdge[i][c] * wTop;
      value = value * (1 - wBottom) + bottomEdge[i][c] * wBottom;
      out[p + c] = Math.max(0, Math.min(255, Math.round(value)));
    }
  }
}

await sharp(out, { raw: { width, height, channels: 3 } })
  .jpeg({ quality: 84, mozjpeg: true, progressive: true })
  .toFile(output);
console.log('wrote', output);
