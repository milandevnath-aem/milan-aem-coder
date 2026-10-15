/* eslint-disable */
// Removes baked text from a Figma export: each row inside a text box is rebuilt by blending the
// real photo pixels just left and right of the box, plus fine grain copied from those edges.
// Rounded corners baked into the export (dark/transparent) are filled from the nearby photo.
// usage: node row-fill.mjs input.png output.jpg scale "x,y,w,h" ["x,y,w,h" ...]   (boxes in 1x px)
import { createRequire } from 'node:module';

const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');

const [input, output, scaleArg, ...boxArgs] = process.argv.slice(2);
const scale = Number(scaleArg);
const PAD = 6; // around the text box (anti-aliasing, shadows)
const EDGE = 8; // averaged boundary columns

const { data, info } = await sharp(input).flatten({ background: '#000000' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const px = (x, y) => (y * width + x) * 3;
const out = Buffer.from(data);

const mean = (x0, x1, y) => {
  const s = [0, 0, 0]; let n = 0;
  for (let x = Math.max(0, x0); x < Math.min(width, x1); x += 1) {
    const p = px(x, y); s[0] += data[p]; s[1] += data[p + 1]; s[2] += data[p + 2]; n += 1;
  }
  return n ? s.map((v) => v / n) : null;
};

boxArgs.forEach((arg) => {
  const [bx, by, bw, bh] = arg.split(',').map(Number);
  const x0 = Math.max(1, Math.round((bx - PAD) * scale));
  const x1 = Math.min(width - 1, Math.round((bx + bw + PAD) * scale));
  const y0 = Math.max(1, Math.round((by - PAD) * scale));
  const y1 = Math.min(height - 1, Math.round((by + bh + PAD) * scale));
  // boundary colours per row, lightly smoothed vertically
  const rows = [];
  for (let y = y0; y < y1; y += 1) {
    rows.push([mean(x0 - EDGE, x0, y), mean(x1, x1 + EDGE, y)]);
  }
  const smoothRows = rows.map((_, i) => [0, 1].map((side) => {
    const s = [0, 0, 0]; let n = 0;
    for (let k = Math.max(0, i - 6); k <= Math.min(rows.length - 1, i + 6); k += 1) {
      const v = rows[k][side]; if (v) { s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; n += 1; }
    }
    return s.map((v) => v / n);
  }));
  for (let y = y0; y < y1; y += 1) {
    const [l, r] = smoothRows[y - y0];
    // grain: the pixel to the side, minus that row's average
    for (let x = x0; x < x1; x += 1) {
      const t = (x - x0) / (x1 - x0 - 1);
      const u = t * t * (3 - 2 * t);
      const sideX = t < 0.5 ? x0 - 1 - ((x - x0) % EDGE) : x1 + ((x1 - 1 - x) % EDGE);
      const sp = px(Math.min(width - 1, Math.max(0, sideX)), y);
      const base = t < 0.5 ? l : r;
      const p = px(x, y);
      for (let c = 0; c < 3; c += 1) {
        const grain = (data[sp + c] - base[c]) * 0.3;
        out[p + c] = Math.max(0, Math.min(255, Math.round(l[c] * (1 - u) + r[c] * u + grain)));
      }
    }
  }
});

// baked rounded corners: fill near-black corner pixels from the photo next to them
const darkish = (x, y) => { const p = px(x, y); return Math.max(out[p], out[p + 1], out[p + 2]) < 22; };
let top = 0; while (top < width / 4 && darkish(top, 0)) top += 1;
let diag = 0; while (diag < width / 8 && darkish(diag, diag)) diag += 1;
const rb = Math.round(Math.max(top, diag / 0.293)) + 2;
if (rb >= 6) {
  const BAND = 6;
  [[0, 1, 0, 1], [width - 1, -1, 0, 1], [0, 1, height - 1, -1], [width - 1, -1, height - 1, -1]].forEach(([cx, dx, cy, dy]) => {
    for (let j = 0; j < rb; j += 1) for (let i = 0; i < rb; i += 1) {
      if (Math.hypot(rb - i, rb - j) < rb - BAND) continue;
      const fromRow = i < j;
      const src = px(fromRow ? cx + dx * (rb + BAND) : cx + dx * i, fromRow ? cy + dy * j : cy + dy * (rb + BAND));
      const p = px(cx + dx * i, cy + dy * j);
      out[p] = out[src]; out[p + 1] = out[src + 1]; out[p + 2] = out[src + 2];
    }
  });
}

await sharp(out, { raw: { width, height, channels: 3 } }).jpeg({ quality: 84, mozjpeg: true, progressive: true }).toFile(output);
console.log('wrote', output, 'corner radius', rb);
