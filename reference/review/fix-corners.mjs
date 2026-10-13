/* eslint-disable */
// Figma exports of rounded cards carry black (or white) rounded corners. When the card radius on
// the site is smaller, those corners show as a dark outline. This fills each baked corner with the
// nearest photo pixels of the same row and writes <name>-clean.<ext> next to the original.
import { createRequire } from 'node:module';
import { readdirSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');

const ROOT = new URL('../../content/images/', import.meta.url).pathname;
const isCorner = (r, g, b) => (r + g + b) / 3 < 14;

async function clean(file) {
  // transparent corners are fine; only opaque baked corners need fixing
  const meta = await sharp(file).metadata();
  if (meta.hasAlpha) {
    const { data: a, info: ai } = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
    if (a[0] < 250 || a[ai.width - 1] < 250 || a[a.length - 1] < 250) return null;
  }
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const px = (x, y) => (y * width + x) * 3;
  const dark = (x, y) => { const p = px(x, y); return isCorner(data[p], data[p + 1], data[p + 2]); };
  // a baked corner: the 4 corner pixels are dark but the image middle edges are not
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  if (!corners.every(([x, y]) => dark(x, y))) return null;
  if (dark(Math.floor(width / 2), 2) && dark(2, Math.floor(height / 2))) return null;
  // baked radius: dark run along the top row from the left edge
  // measured on near-black pixels only: some photos are dark near their corners
  const darkish = (x, y) => { const p = px(x, y); return Math.max(data[p], data[p + 1], data[p + 2]) < 22; };
  let top = 0;
  while (top < width / 4 && darkish(top, 0)) top += 1;
  // a circle of radius r meets the diagonal at r * (1 - 1 / sqrt 2)
  let diag = 0;
  while (diag < width / 8 && darkish(diag, diag)) diag += 1;
  const rb = Math.round(Math.max(top, diag / 0.293)) + 2;
  if (rb < 6) return null;
  console.error(basename(file), 'corner radius', rb);
  const BAND = 6; // anti-aliased edge of the baked corner
  let changed = 0;
  // corner squares: [x origin, x direction, y origin, y direction]
  [[0, 1, 0, 1], [width - 1, -1, 0, 1], [0, 1, height - 1, -1], [width - 1, -1, height - 1, -1]].forEach(([x0, dx, y0, dy]) => {
    for (let j = 0; j < rb; j += 1) {
      for (let i = 0; i < rb; i += 1) {
        const d = Math.hypot(rb - i, rb - j);
        if (d < rb - BAND) continue;
        // take the photo pixel just outside the corner square on the same row (or column)
        const fromRow = i < j;
        const sx = fromRow ? x0 + dx * (rb + BAND) : x0 + dx * i;
        const sy = fromRow ? y0 + dy * j : y0 + dy * (rb + BAND);
        const src = px(sx, sy);
        const p = px(x0 + dx * i, y0 + dy * j);
        data[p] = data[src]; data[p + 1] = data[src + 1]; data[p + 2] = data[src + 2];
        changed += 1;
      }
    }
  });
  if (!changed) return null;
  const ext = extname(file);
  const out = file.replace(ext, `-clean${ext}`);
  const img = sharp(data, { raw: { width, height, channels: 3 } });
  await (ext === '.png' ? img.png({ compressionLevel: 9 }) : img.jpeg({ quality: 84, mozjpeg: true, progressive: true })).toFile(out);
  return out;
}

const results = [];
for (const dir of readdirSync(ROOT)) {
  const folder = join(ROOT, dir);
  if (!existsSync(folder) || dir.startsWith('.')) continue;
  for (const f of readdirSync(folder)) {
    if (!/\.(jpe?g|png)$/i.test(f) || f.includes('-clean')) continue;
    const out = await clean(join(folder, f)).catch(() => null);
    if (out) results.push(`${dir}/${basename(out)}`);
  }
}
console.log(JSON.stringify(results, null, 1));
