import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { MEDIA } from '../../scripts/viewport.js';

function styleTokens(cell) {
  if (!cell) return [];
  const values = [...cell.querySelectorAll('p')].map((p) => p.textContent);
  return (values.length ? values : [cell.textContent]).join(' ').toLowerCase().split(/[\s,]+/);
}

/**
 * Full-width image + text rows.
 * Each row: image, optional mobile image, text, style (text side, text colour, image mode).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row, i) => {
    const [imageCell, mobileCell, textCell, styleCell] = row.children;
    const item = document.createElement('li');
    item.className = 'feature-banner-item';
    moveInstrumentation(row, item);

    const tokens = styleTokens(styleCell);
    item.classList.add(tokens.includes('left') ? 'text-left' : 'text-right');
    if (tokens.includes('light')) item.classList.add('light-text');
    if (tokens.includes('side')) item.classList.add('side-image');

    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createOptimizedPicture(img.src, img.alt, i === 0, [
        { media: MEDIA.desktop, width: '2000' },
        { width: '900' },
      ]);
      const mobileImg = mobileCell?.querySelector('img');
      if (mobileImg) {
        const mobile = createOptimizedPicture(mobileImg.src, '', false, [{ width: '900' }]);
        mobile.querySelectorAll('source').forEach((source) => {
          source.media = MEDIA.mobile;
          picture.prepend(source);
        });
        moveInstrumentation(mobileImg, picture.querySelector('source'));
        item.classList.add('has-mobile-image');
      }
      moveInstrumentation(img, picture.querySelector('img'));
      picture.classList.add('feature-banner-image');
      item.append(picture);
    }

    if (textCell) {
      textCell.className = 'feature-banner-content';
      item.append(textCell);
    }
    list.append(item);
  });
  block.replaceChildren(list);
}
