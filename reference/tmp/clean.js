/* eslint-disable */
// Removes baked-in text from Figma flattened exports by vertically
// interpolating each column between the rows just above/below each rect.
const sharp = require('sharp');

async function clean(input, output, rects, { crop, flatten = '#000000', quality = 82 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = (x, y) => (y * width + x) * channels;
  rects.forEach(([rx, ry, rw, rh, mode]) => {
    const x0 = Math.max(1, rx); const x1 = Math.min(width - 1, rx + rw);
    const y0 = Math.max(1, ry); const y1 = Math.min(height - 1, ry + rh);
    const src = Buffer.from(data);
    const at = (x, y, c) => src[px(x, y) + c];
    for (let x = x0; x < x1; x += 1) {
      const u = (x - x0 + 1) / (x1 - x0 + 1);
      for (let y = y0; y < y1; y += 1) {
        const t = (y - y0 + 1) / (y1 - y0 + 1);
        const p = px(x, y);
        for (let c = 0; c < channels; c += 1) {
          const v = at(x, y0 - 1, c) * (1 - t) + at(x, y1, c) * t;
          if (mode === 'coons') {
            // blend vertical + horizontal interpolation minus the bilinear corner term
            const h = at(x0 - 1, y, c) * (1 - u) + at(x1, y, c) * u;
            const b = (at(x0 - 1, y0 - 1, c) * (1 - u) + at(x1, y0 - 1, c) * u) * (1 - t)
              + (at(x0 - 1, y1, c) * (1 - u) + at(x1, y1, c) * u) * t;
            data[p + c] = Math.max(0, Math.min(255, Math.round(v + h - b)));
          } else {
            data[p + c] = Math.round(v);
          }
        }
      }
    }
  });
  let img = sharp(data, { raw: { width, height, channels } });
  // soften large interpolated areas so column streaks don't show
  const big = rects;
  if (big.length) {
    const base = await img.png().toBuffer();
    const overlays = await Promise.all(big.map(async ([left, top, w, h]) => ({
      input: await sharp(base).extract({ left, top, width: w, height: h })
        .blur(Math.min(40, Math.max(6, Math.min(w, h) / 4))).png().toBuffer(),
      left,
      top,
    })));
    img = sharp(await sharp(base).composite(overlays).png().toBuffer());
  }
  if (crop) img = sharp(await img.png().toBuffer()).extract(crop);
  await img.flatten({ background: flatten }).jpeg({ quality, mozjpeg: true }).toFile(output);
  console.log('wrote', output);
}

const T = 'reference/tmp';
const O = 'content/images/home';
(async () => {
  // hero: headline+copy+cta, slide dots, lead form card
  await clean(`${T}/hero.png`, `${O}/hero-car-loans.jpg`, [
    [150, 90, 790, 340, 'coons'], [150, 480, 450, 116, 'coons'], [140, 980, 130, 50, 'coons'], [1420, 84, 1116, 940],
  ], { flatten: '#2a3a2a' });
  // product tabs panel: 5 product cards on the left
  await clean(`${T}/prod.png`, `${O}/product-car-loans.jpg`, [
    [44, 44, 976, 964, 'coons'],
  ], { flatten: '#c4bab0' });
  // emi: keep only the car on the left
  await clean(`${T}/emi-flat.png`, `${O}/emi-car.jpg`, [], {
    crop: { left: 0, top: 900, width: 1300, height: 1060 }, flatten: '#eeeeee',
  });
  // offers: eyebrow+title+cta and the T&C line
  await clean(`${T}/offer-1-flat.png`, `${O}/offer-hassle-free.jpg`, [[840, 232, 1004, 456, 'coons'], [880, 1396, 924, 64, 'coons']]);
  await clean(`${T}/offer-2-flat.png`, `${O}/offer-hatchback.jpg`, [[840, 232, 1004, 456, 'coons'], [880, 1396, 924, 64, 'coons']]);
  await clean(`${T}/offer-3-flat.png`, `${O}/offer-two-wheeler.jpg`, [[164, 232, 1002, 376, 'coons'], [164, 1396, 1002, 64, 'coons']]);
  await clean(`${T}/offer-4-flat.png`, `${O}/offer-lap.jpg`, [[164, 232, 1002, 472, 'coons'], [164, 1396, 1002, 64, 'coons']]);
  // service request tile: title + arrow icon
  await clean(`${T}/service-flat.png`, `${O}/service-request.jpg`, [[48, 52, 1080, 100, 'coons']], { flatten: '#f0f0f0' });
})();
