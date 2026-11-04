import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

/**
 * Article teaser cards. Each row: image, category, title (link), and reading
 * time, with an optional button grouped into the link cell.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const isMediaReleasesCards = block.classList.contains('mediaReleasesCards');
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const [imageCell, categoryCell, linkCell, metaCell] = row.children;
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
    const links = [...(linkCell?.querySelectorAll('a') || [])];
    const [source, additionalLink] = links;
    const additionalImg = linkCell?.querySelector('img');
    const sourceText = source?.textContent.trim() || '';
    const linkCellText = linkCell?.textContent.trim() || '';
    const additionalText = additionalLink?.textContent.trim()
      || (sourceText ? linkCellText.replace(sourceText, '').trim() : '');
    const text = sourceText || linkCellText.replace(additionalText, '').trim();
    const href = source?.getAttribute('href')?.trim();
    if (href && href !== '#' && text) {
      // the title link covers the whole card (see .article-cards-link::after)
      const link = document.createElement('a');
      link.className = 'article-cards-link';
      link.href = href;
      link.textContent = text;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      moveInstrumentation(source, link);
      heading.append(link);
      item.classList.add('article-cards-clickable');
    } else {
      heading.textContent = text;
      if (source) moveInstrumentation(source, heading);
    }
    if (isMediaReleasesCards) body.append(heading);

    if (metaCell?.textContent.trim()) {
      const meta = document.createElement('p');
      meta.className = 'article-cards-meta';
      meta.textContent = metaCell.textContent.trim();
      moveInstrumentation(metaCell, meta);
      body.append(meta);
    }

    if (additionalLink || additionalText || additionalImg) {
      const additional = document.createElement('div');
      additional.className = 'article-cards-additional';

      if (additionalLink || additionalText) {
        const button = document.createElement(additionalLink ? 'a' : 'span');
        button.className = 'article-cards-button';
        button.textContent = additionalText;
        if (additionalLink) {
          button.setAttribute('href', additionalLink.getAttribute('href') || '#');
          if (additionalLink.target) button.target = additionalLink.target;
          const ariaLabel = additionalLink.getAttribute('aria-label');
          if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
          moveInstrumentation(additionalLink, button);
        }
        additional.append(button);
        const icon = additionalImg?.closest('picture') || additionalImg;
        if (icon) {
          icon.classList.add('article-cards-additional-image');
          button.append(icon);
        }
      } else if (additionalImg) {
        const picture = createPicture(additionalImg.src, additionalImg.alt, false, [{ width: '200' }]);
        moveInstrumentation(additionalImg, picture.querySelector('img'));
        picture.classList.add('article-cards-additional-image');
        additional.append(picture);
      }

      body.append(additional);
    }

    item.append(body);
    list.append(item);
  });
  block.replaceChildren(list);
}
