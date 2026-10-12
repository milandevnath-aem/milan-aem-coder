/* eslint-disable */
// usage: node sheet.mjs out.jpg cols w h file...
import { createRequire } from 'node:module';
const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');
const [out, cols, w, h, ...files] = process.argv.slice(2);
const C = +cols; const W = +w; const H = +h;
const rows = Math.ceil(files.length / C);
const tiles = await Promise.all(files.map(async (f, i) => ({
  input: await sharp(f).resize(W, H, { fit: 'contain', background: '#888' }).png().toBuffer(),
  left: (i % C) * (W + 6), top: Math.floor(i / C) * (H + 6),
})));
await sharp({ create: { width: C * (W + 6), height: rows * (H + 6), channels: 3, background: '#444' } })
  .composite(tiles).jpeg({ quality: 70 }).toFile(out);
console.log('ok', out);
