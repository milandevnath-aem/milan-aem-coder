/* eslint-disable */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');
const R = 'reference/pages';
mkdirSync('content/images/shared', { recursive: true });
// decorative streaks for the documents section (top-right slice, transparent)
await sharp(`${R}/top-up-loan/raw/documents-section-desktop.png`)
  .extract({ left: 1640, top: 0, width: 1092, height: 820 })
  .png({ compressionLevel: 9 }).toFile('content/images/shared/documents-decoration.png');
console.log('decoration ok');
