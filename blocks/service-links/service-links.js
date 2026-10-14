import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';
import { MEDIA } from '../../scripts/viewport.js';

const VARIANTS = ['image', 'highlight', 'tall'];

/**
 * Customer service tiles. Each row: link, optional image, tile style.
 * A tile is clickable only when its link has a URL.
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

    // the tile is a link only when a URL is authored ("#" or empty: plain tile)
    const source = linkCell?.querySelector('a');
    const href = source?.getAttribute('href')?.trim();
    const isLink = Boolean(href && href !== '#');
    const tile = document.createElement(isLink ? 'a' : 'div');
    tile.className = 'service-links-tile';
    if (isLink) tile.href = href;
    if (source) moveInstrumentation(source, tile);

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
    tile.append(title);
    if (isLink) {
      const arrow = document.createElement('span');
      arrow.className = 'service-links-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      tile.append(arrow);
    }

    item.append(tile);
    list.append(item);
  });
  block.replaceChildren(list);
}
