import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

/**
 * Article teaser cards. Each row: text, link, image.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const [textCell, linkCell, imageCell] = row.children;
    const item = document.createElement('li');
    item.className = 'article-cards-item';
    moveInstrumentation(row, item);

    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createPicture(img.src, img.alt, false, [{ width: '600' }]);
      moveInstrumentation(img, picture.querySelector('img'));
      picture.classList.add('article-cards-image');
      item.append(picture);
    }

    const body = document.createElement('div');
    body.className = 'article-cards-body';
    const heading = document.createElement('h3');
    heading.className = 'article-cards-title';
    const source = linkCell?.querySelector('a');
    const text = textCell?.textContent.trim() || '';
    const href = source?.getAttribute('href')?.trim();
    if (href && href !== '#' && text) {
      // the title link covers the whole card (see .article-cards-link::after)
      const link = document.createElement('a');
      link.className = 'article-cards-link';
      link.href = href;
      link.textContent = text;
      if (source.target) link.target = source.target;
      moveInstrumentation(source, link);
      heading.append(link);
      item.classList.add('article-cards-clickable');
    } else {
      heading.textContent = text;
    }
    moveInstrumentation(textCell, heading);
    body.append(heading);

    item.append(body);
    list.append(item);
  });
  block.replaceChildren(list);
}
