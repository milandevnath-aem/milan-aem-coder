import { moveInstrumentation } from '../../scripts/scripts.js';
import { addMobileSource } from '../../scripts/images.js';

/**
 * Hero: background image, text and an optional mobile image (used below the desktop view).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const imageRows = [...block.children].filter((row) => row.querySelector('img'));
  if (imageRows.length < 2) return;
  const desktopRow = imageRows[0];
  const mobileRow = imageRows[imageRows.length - 1];
  const picture = desktopRow.querySelector('picture');
  const mobileImg = mobileRow.querySelector('img');
  const source = addMobileSource(picture, mobileImg);
  if (!source) return;
  moveInstrumentation(mobileImg, source);
  // the mobile image now lives in the desktop picture
  mobileRow.hidden = true;
  mobileRow.querySelector('picture')?.remove();
}
