import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';
import { MEDIA } from '../../scripts/viewport.js';

const VARIANTS = ['image', 'highlight', 'tall'];

/**
 * Customer service link tiles. Each row: link, optional image, tile style.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const [linkCell, imageCell, variantCell] = row.children;
    const item = document.createElement('li');
    item.className = 'service-links-item';
    moveInstrumentation(row, item);

    const variant = variantCell?.textContent.trim().toLowerCase();
    if (VARIANTS.includes(variant)) item.classList.add(`service-links-${variant}`);

    const source = linkCell?.querySelector('a');
    const tile = document.createElement(source ? 'a' : 'div');
    tile.className = 'service-links-tile';
    if (source) {
      tile.href = source.getAttribute('href');
      moveInstrumentation(source, tile);
    }

    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createPicture(img.src, img.alt, false, [
        { media: MEDIA.desktop, width: '1200' },
        { width: '750' },
      ]);
      moveInstrumentation(img, picture.querySelector('img'));
      picture.classList.add('service-links-media');
      tile.append(picture);
      item.classList.add('service-links-has-image');
    }

    const title = document.createElement('span');
    title.className = 'service-links-title';
    title.textContent = (source || linkCell)?.textContent.trim() || '';
    const arrow = document.createElement('span');
    arrow.className = 'service-links-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    tile.append(title, arrow);

    item.append(tile);
    list.append(item);
  });
  block.replaceChildren(list);
}
