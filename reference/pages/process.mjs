/* eslint-disable */
// Cleans baked-in text out of Figma flattened exports (Coons-patch fill + blur)
// and copies all other page assets into content/images/<slug>/.
import { readFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { inpaint } from './inpaint.mjs';

const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');

const REPO = new URL('../../', import.meta.url).pathname;

const pages = readdirSync(join(REPO, 'reference/pages')).filter((d) => existsSync(join(REPO, 'reference/pages', d, 'extraction.json')));
const report = [];
for (const slug of pages) {
  const dir = join(REPO, 'reference/pages', slug);
  const out = join(REPO, 'content/images', slug);
  mkdirSync(out, { recursive: true });
  const { sections } = JSON.parse(readFileSync(join(dir, 'extraction.json')));
  const done = new Set();
  for (const s of sections) {
    for (const bp of ['desktop', 'mobile']) {
      const v = s[bp];
      if (!v?.image) continue;
      const src = join(dir, v.image);
      if (!existsSync(src)) { report.push(`MISSING ${slug} ${v.image}`); continue; }
      done.add(v.image);
      if (['requirements', 'branch-locator'].includes(s.type)) continue; // decoration / gradient handled separately
      if (v.separateImage) {
        await sharp(src).png({ compressionLevel: 9 }).toFile(join(out, `${s.type}-${s.order}-${bp}.png`));
        continue;
      }
      const meta = await sharp(src).metadata();
      const scale = meta.width / (v.w === 1366 && s.type === 'hero' ? 1342 : v.w);
      const name = `${s.type}-${s.order}-${bp}.jpg`;
      await inpaint(src, join(out, name), v.textBoxes || [], scale, {
        flatten: s.type === 'need-help' ? '#000000' : '#ffffff',
        mode: s.type === 'hero' ? 'coons' : 'vertical',
      });
      report.push(`${slug}/${name} boxes=${(v.textBoxes || []).length} scale=${scale.toFixed(3)}`);
    }
  }
  // remaining assets (icons, photos, card images): copy as-is
  for (const file of readdirSync(join(dir, 'raw'))) {
    if (done.has(`raw/${file}`) || /documents|full|map-image|hero-fb-background/.test(file)) continue;
    copyFileSync(join(dir, 'raw', file), join(out, file));
  }
}
console.log(report.join('\n'));
