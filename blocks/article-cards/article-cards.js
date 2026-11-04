import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

/**
 * Article teaser cards. Each row: image, category, title (link), reading time,
 * with optional additional text, link, and image fields.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const [imageCell, categoryCell, linkCell, metaCell] = row.children;
    const additionalTextCell = row.children[4];
    const additionalLinkCell = row.children[5];
    const additionalImageCell = row.children[6];
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
    const text = (source || linkCell)?.textContent.trim() || '';
    const href = source?.getAttribute('href')?.trim();
    if (href && href !== '#') {
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
      if (source) moveInstrumentation(source, heading);
    }
    body.append(heading);

    if (metaCell?.textContent.trim()) {
      const meta = document.createElement('p');
      meta.className = 'article-cards-meta';
      meta.textContent = metaCell.textContent.trim();
      moveInstrumentation(metaCell, meta);
      body.append(meta);
    }

    const additionalText = additionalTextCell?.textContent.trim() || '';
    const additionalLink = additionalLinkCell?.querySelector('a');
    const additionalHref = additionalLink?.getAttribute('href')?.trim();
    const additionalImg = additionalImageCell?.querySelector('img');
    if (additionalText || additionalImg) {
      const additional = document.createElement('div');
      additional.className = 'article-cards-additional';

      if (additionalImg) {
        const picture = createPicture(additionalImg.src, additionalImg.alt, false, [{ width: '200' }]);
        moveInstrumentation(additionalImg, picture.querySelector('img'));
        picture.classList.add('article-cards-additional-image');
        additional.append(picture);
      }

      if (additionalText) {
        const additionalLabel = document.createElement(additionalHref && additionalHref !== '#' ? 'a' : 'span');
        additionalLabel.className = 'article-cards-additional-text';
        additionalLabel.textContent = additionalText;
        if (additionalHref && additionalHref !== '#') {
          additionalLabel.href = additionalHref;
          if (additionalLink.target) additionalLabel.target = additionalLink.target;
          moveInstrumentation(additionalLink, additionalLabel);
        } else {
          moveInstrumentation(additionalTextCell, additionalLabel);
        }
        additional.append(additionalLabel);
      }

      body.append(additional);
    }

    item.append(body);
    list.append(item);
  });
  block.replaceChildren(list);
}
