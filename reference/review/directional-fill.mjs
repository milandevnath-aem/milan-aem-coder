/* eslint-disable */
// Removes content (text, cards) from a Figma export whose background is made of soft parallel
// streaks: each pixel inside a box is rebuilt from the background just outside the boxes along
// the streak direction (both ways), solved at 1x, upscaled and blended back with a soft edge.
// usage: node directional-fill.mjs input.png output.jpg scale dx dy "x,y,w,h" ["x,y,w,h" ...]
//   boxes in 1x px; dx,dy = streak direction (e.g. -0.29 0.957)
import { createRequire } from 'node:module';

const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');

const [input, output, scaleArg, dxArg, dyArg, ...boxArgs] = process.argv.slice(2);
const scale = Number(scaleArg);
const len = Math.hypot(Number(dxArg), Number(dyArg));
const DX = Number(dxArg) / len;
const DY = Number(dyArg) / len;
const PAD = 10; // around each box, 1x px (shadows, anti-aliasing)
const BEYOND = 3; // sample a little past the box edge

const src = sharp(input).flatten({ background: '#ffffff' }).removeAlpha();
const { data, info } = await src.clone().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const sw = Math.round(width / scale);
const sh = Math.round(height / scale);
const small = await src.clone().resize(sw, sh, { kernel: 'cubic' }).raw().toBuffer();

const boxes = boxArgs.map((a) => a.split(',').map(Number));
const mask = new Uint8Array(sw * sh);
boxes.forEach(([x, y, w, h]) => {
  for (let yy = Math.max(0, y - PAD); yy < Math.min(sh, y + h + PAD); yy += 1) {
    for (let xx = Math.max(0, x - PAD); xx < Math.min(sw, x + w + PAD); xx += 1) mask[yy * sw + xx] = 1;
  }
});

const sample = (fx, fy) => {
  const x = Math.round(fx); const y = Math.round(fy);
  const s = [0, 0, 0]; let n = 0;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const xx = x + i; const yy = y + j;
      if (xx < 0 || yy < 0 || xx >= sw || yy >= sh || mask[yy * sw + xx]) continue;
      const p = (yy * sw + xx) * 3; s[0] += small[p]; s[1] += small[p + 1]; s[2] += small[p + 2]; n += 1;
    }
  }
  return n ? s.map((v) => v / n) : null;
};
const march = (x, y, sx, sy) => {
  for (let t = 1; t < 4000; t += 1) {
    const fx = x + sx * t; const fy = y + sy * t;
    const ix = Math.round(fx); const iy = Math.round(fy);
    if (ix < 0 || iy < 0 || ix >= sw || iy >= sh) return null;
    if (!mask[iy * sw + ix]) {
      const c = sample(fx + sx * BEYOND, fy + sy * BEYOND) || sample(fx, fy);
      return c ? { c, t } : null;
    }
  }
  return null;
};

const filled = Buffer.from(small);
for (let y = 0; y < sh; y += 1) {
  for (let x = 0; x < sw; x += 1) {
    if (!mask[y * sw + x]) continue;
    const a = march(x, y, DX, DY);
    const b = march(x, y, -DX, -DY);
    let c;
    if (a && b) c = a.c.map((v, i) => (v * b.t + b.c[i] * a.t) / (a.t + b.t));
    else c = (a || b)?.c || [245, 245, 245];
    const p = (y * sw + x) * 3;
    filled[p] = c[0]; filled[p + 1] = c[1]; filled[p + 2] = c[2];
  }
}

// soften the rebuilt area a little, upscale and blend it back into the full-size image
const soft = await sharp(filled, { raw: { width: sw, height: sh, channels: 3 } }).blur(2.5)
  .resize(width, height, { kernel: 'cubic' }).raw().toBuffer();
const out = Buffer.from(data);
const FEATHER = 10 * scale;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    // distance to the nearest box (in full-size px), 0 inside
    let d = Infinity;
    for (const [bx, by, bw, bh] of boxes) {
      const x0 = (bx - PAD) * scale; const y0 = (by - PAD) * scale;
      const x1 = (bx + bw + PAD) * scale; const y1 = (by + bh + PAD) * scale;
      const dx = Math.max(x0 - x, 0, x - x1); const dy = Math.max(y0 - y, 0, y - y1);
      d = Math.min(d, Math.max(dx, dy));
    }
    const a = d === 0 ? 1 : Math.max(0, 1 - d / FEATHER);
    if (!a) continue;
    const p = (y * width + x) * 3;
    for (let c = 0; c < 3; c += 1) out[p + c] = Math.round(soft[p + c] * a + data[p + c] * (1 - a));
  }
}
await sharp(out, { raw: { width, height, channels: 3 } }).jpeg({ quality: 86, mozjpeg: true }).toFile(output);
console.log('wrote', output);
