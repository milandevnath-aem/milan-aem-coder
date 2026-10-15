/* eslint-disable */
// Removes baked text from a Figma export with a smooth background (gradients): the pixels in
// each text box are rebuilt by harmonic interpolation (Laplace) from the box border on all
// four sides, solved at 1/4 resolution, upscaled and blended back with a soft edge.
// usage: node harmonic-fill.mjs input.png output.jpg scale "x,y,w,h" ["x,y,w,h" ...]   (boxes in 1x px)
import { createRequire } from 'node:module';

const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');

const [input, output, scaleArg, ...boxArgs] = process.argv.slice(2);
const scale = Number(scaleArg);
const PAD = 8;
const F = 4; // working resolution factor

const src = sharp(input).flatten({ background: '#ffffff' }).removeAlpha();
const { data, info } = await src.clone().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const sw = Math.round(width / F);
const sh = Math.round(height / F);
const small = await src.clone().resize(sw, sh, { kernel: 'cubic' }).raw().toBuffer();

// mask at working resolution
const mask = new Uint8Array(sw * sh);
const boxes = boxArgs.map((a) => a.split(',').map(Number)).map(([x, y, w, h]) => [
  Math.max(0, Math.floor((x * scale - PAD) / F)), Math.max(0, Math.floor((y * scale - PAD) / F)),
  Math.min(sw - 1, Math.ceil(((x + w) * scale + PAD) / F)), Math.min(sh - 1, Math.ceil(((y + h) * scale + PAD) / F)),
]);
boxes.forEach(([x0, y0, x1, y1]) => {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) mask[y * sw + x] = 1;
});

// Jacobi iterations, starting from row interpolation
const f = Float32Array.from(small);
boxes.forEach(([x0, y0, x1, y1]) => {
  for (let y = y0; y <= y1; y += 1) {
    const l = Math.max(0, x0 - 1); const r = Math.min(sw - 1, x1 + 1);
    for (let x = x0; x <= x1; x += 1) {
      const t = (x - l) / (r - l);
      for (let c = 0; c < 3; c += 1) f[(y * sw + x) * 3 + c] = small[(y * sw + l) * 3 + c] * (1 - t) + small[(y * sw + r) * 3 + c] * t;
    }
  }
});
for (let it = 0; it < 4000; it += 1) {
  boxes.forEach(([x0, y0, x1, y1]) => {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const i = y * sw + x;
        const n = [i - 1, i + 1, i - sw, i + sw];
        for (let c = 0; c < 3; c += 1) {
          f[i * 3 + c] = (f[n[0] * 3 + c] + f[n[1] * 3 + c] + f[n[2] * 3 + c] + f[n[3] * 3 + c]) / 4;
        }
      }
    }
  });
}
const filledSmall = Buffer.from(Uint8Array.from(f, (v) => Math.max(0, Math.min(255, Math.round(v)))));
const filled = await sharp(filledSmall, { raw: { width: sw, height: sh, channels: 3 } })
  .resize(width, height, { kernel: 'cubic' }).blur(2).raw().toBuffer();

// blend back inside the boxes with a feathered edge
const out = Buffer.from(data);
const FEATHER = 12;
boxArgs.map((a) => a.split(',').map(Number)).forEach(([x, y, w, h]) => {
  const x0 = Math.max(0, Math.round(x * scale - PAD)); const y0 = Math.max(0, Math.round(y * scale - PAD));
  const x1 = Math.min(width - 1, Math.round((x + w) * scale + PAD)); const y1 = Math.min(height - 1, Math.round((y + h) * scale + PAD));
  for (let yy = Math.max(0, y0 - FEATHER); yy <= Math.min(height - 1, y1 + FEATHER); yy += 1) {
    for (let xx = Math.max(0, x0 - FEATHER); xx <= Math.min(width - 1, x1 + FEATHER); xx += 1) {
      const dx = Math.max(x0 - xx, xx - x1, 0); const dy = Math.max(y0 - yy, yy - y1, 0);
      const d = Math.max(dx, dy);
      const a = d === 0 ? 1 : Math.max(0, 1 - d / FEATHER);
      if (!a) continue;
      const p = (yy * width + xx) * 3;
      for (let c = 0; c < 3; c += 1) out[p + c] = Math.round(filled[p + c] * a + data[p + c] * (1 - a));
    }
  }
});
await sharp(out, { raw: { width, height, channels: 3 } }).jpeg({ quality: 88, mozjpeg: true }).toFile(output);
console.log('wrote', output);
