import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Article teaser cards. Each row: image, category, link (title), reading time.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const [imageCell, categoryCell, linkCell, metaCell] = row.children;
    const item = document.createElement('li');
    item.className = 'article-cards-item';
    moveInstrumentation(row, item);

    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createOptimizedPicture(img.src, img.alt, false, [{ width: '600' }]);
      moveInstrumentation(img, picture.querySelector('img'));
      picture.classList.add('article-cards-image');
      item.append(picture);
    }

    const body = document.createElement('div');
    body.className = 'article-cards-body';
    if (categoryCell?.textContent.trim()) {
      const category = document.createElement('p');
      category.className = 'article-cards-category';
      category.textContent = categoryCell.textContent.trim();
      moveInstrumentation(categoryCell, category);
      body.append(category);
    }

    const heading = document.createElement('h3');
    heading.className = 'article-cards-title';
    const source = linkCell?.querySelector('a');
    if (source) {
      const link = document.createElement('a');
      link.href = source.getAttribute('href');
      link.textContent = source.textContent.trim();
      moveInstrumentation(source, link);
      heading.append(link);
    } else {
      heading.textContent = linkCell?.textContent.trim() || '';
    }
    body.append(heading);

    if (metaCell?.textContent.trim()) {
      const meta = document.createElement('p');
      meta.className = 'article-cards-meta';
      meta.textContent = metaCell.textContent.trim();
      moveInstrumentation(metaCell, meta);
      body.append(meta);
    }

    item.append(body);
    list.append(item);
  });
  block.replaceChildren(list);
}
