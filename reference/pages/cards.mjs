/* eslint-disable */
import { inpaint } from './inpaint.mjs';
// large feature-card images: title + description baked in at the bottom-left (585x350 css @2x)
const jobs = [
  ['loan-against-property/raw/feature-card-emi.png', 'loan-against-property/feature-card-emi.jpg'],
  ['loan-against-property/raw/feature-card-ltv.png', 'loan-against-property/feature-card-ltv.jpg'],
  ['car-lease/raw/feature-card-fixed-tenure.png', 'car-lease/feature-card-fixed-tenure.jpg'],
  ['car-lease/raw/feature-card-low-outflow.png', 'car-lease/feature-card-low-outflow.jpg'],
];
for (const [src, out] of jobs) {
  await inpaint(src, `../../content/images/${out}`, [[-14, 246, 613, 118]], 2, { flatten: '#ffffff', mode: 'vertical' });
  console.log('ok', out);
}
