/* eslint-disable */
import { createRequire } from 'node:module';

const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');
const PAD = 14;

export async function inpaint(input, output, boxes, scale, { flatten = '#ffffff', quality = 82, mode = 'coons' } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = (x, y) => (y * width + x) * channels;
  const rects = boxes.map(([x, y, w, h]) => {
    const x0 = Math.max(1, Math.round((x - PAD) * scale));
    const y0 = Math.max(1, Math.round((y - PAD) * scale));
    const x1 = Math.min(width - 1, Math.round((x + w + PAD) * scale));
    const y1 = Math.min(height - 1, Math.round((y + h + PAD) * scale));
    return [x0, y0, x1, y1];
  }).filter(([x0, y0, x1, y1]) => x1 > x0 && y1 > y0);

  rects.forEach(([x0, y0, x1, y1]) => {
    const src = Buffer.from(data);
    const at = (x, y, c) => src[px(x, y) + c];
    for (let x = x0; x < x1; x += 1) {
      const u = (x - x0 + 1) / (x1 - x0 + 1);
      for (let y = y0; y < y1; y += 1) {
        const t = (y - y0 + 1) / (y1 - y0 + 1);
        const p = px(x, y);
        for (let c = 0; c < channels; c += 1) {
          const v = at(x, y0 - 1, c) * (1 - t) + at(x, y1, c) * t;
          const h = at(x0 - 1, y, c) * (1 - u) + at(x1, y, c) * u;
          const b = (at(x0 - 1, y0 - 1, c) * (1 - u) + at(x1, y0 - 1, c) * u) * (1 - t)
            + (at(x0 - 1, y1, c) * (1 - u) + at(x1, y1, c) * u) * t;
          data[p + c] = mode === 'vertical' ? Math.round(v) : Math.max(0, Math.min(255, Math.round(v + h - b)));
        }
      }
    }
  });

  let img = sharp(data, { raw: { width, height, channels } });
  if (rects.length) {
    // blend each filled area back with a soft, feathered edge
    const base = await img.png().toBuffer();
    const feather = Math.round(24 * scale);
    const overlays = await Promise.all(rects.map(async ([x0, y0, x1, y1]) => {
      const left = Math.max(0, x0 - feather);
      const top = Math.max(0, y0 - feather);
      const w = Math.min(width, x1 + feather) - left;
      const h = Math.min(height, y1 + feather) - top;
      const sigma = Math.min(40, Math.max(6, Math.min(x1 - x0, y1 - y0) / 4));
      const blurred = await sharp(base).extract({ left, top, width: w, height: h })
        .removeAlpha().blur(sigma).raw().toBuffer();
      const inner = await sharp({ create: { width: x1 - x0, height: y1 - y0, channels: 3, background: '#ffffff' } }).png().toBuffer();
      const mask = await sharp({ create: { width: w, height: h, channels: 3, background: '#000000' } })
        .composite([{ input: inner, left: x0 - left, top: y0 - top }])
        .blur(Math.max(1, feather / 2)).extractChannel(0).raw().toBuffer();
      const rgba = Buffer.alloc(w * h * 4);
      for (let i = 0; i < w * h; i += 1) {
        rgba[i * 4] = blurred[i * 3];
        rgba[i * 4 + 1] = blurred[i * 3 + 1];
        rgba[i * 4 + 2] = blurred[i * 3 + 2];
        rgba[i * 4 + 3] = mask[i];
      }
      const input = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
      return { input, left, top };
    }));
    img = sharp(await sharp(base).composite(overlays).png().toBuffer());
  }
  await img.flatten({ background: flatten }).jpeg({ quality, mozjpeg: true }).toFile(output);
}

