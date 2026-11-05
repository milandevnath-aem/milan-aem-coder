import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

function readMediaReleaseLink(cell) {
  const content = cell?.cloneNode(true) || document.createElement('div');
  const links = [...(cell?.querySelectorAll('a') || [])];
  const remaining = content.cloneNode(true);
  remaining.querySelectorAll('a, .icon, picture, img').forEach((element) => element.remove());
  const hasButton = links.length > 1 || remaining.textContent.trim()
    || cell?.querySelector('.icon, img');
  const additionalLink = hasButton ? links.at(-1) : null;
  const source = links.find((link) => link !== additionalLink);
  const markdown = content.textContent.match(/\[([^\]]+)\]\(([^)]+)\)/);
  let additionalText = additionalLink?.textContent.trim() || markdown?.[1] || '';
  if (additionalLink) content.querySelectorAll('a')[links.length - 1].remove();
  content.querySelectorAll('.icon, picture, img').forEach((element) => element.remove());
  let text = content.textContent.replace(/:right-tick:/g, '').trim();
  if (markdown) text = text.replace(markdown[0], '').trim();
  if (source) text = source.textContent.trim() || text;
  let buttonLink = additionalLink;
  if (!buttonLink && markdown) {
    buttonLink = document.createElement('a');
    buttonLink.setAttribute('href', markdown[2].trim());
  }
  additionalText = additionalText.replace(/:right-tick:/g, '').trim();
  let additionalImg = cell?.querySelector('img');
  if (cell?.querySelector('.icon-right-tick') || cell?.textContent.includes(':right-tick:')) {
    additionalImg = document.createElement('img');
    additionalImg.src = `${window.hlx?.codeBasePath || ''}/icons/check.svg`;
    additionalImg.alt = '';
  }
  return {
    source, text, additionalLink: buttonLink, additionalText, additionalImg,
  };
}

/**
 * Article teaser cards. Each row: image, category, title (link), and reading
 * time, with an optional button grouped into the link cell.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const isMediaRelease = [...block.classList].some((name) => [
    'mediareleasescards', 'media-releases-cards',
  ].includes(name.toLowerCase()));
  if (isMediaRelease) block.classList.add('mediaReleasesCards');
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
    const defaultSource = linkCell?.querySelector('a');
    const {
      source, text, additionalLink, additionalText, additionalImg,
    } = isMediaRelease ? readMediaReleaseLink(linkCell) : {
      source: defaultSource,
      text: (defaultSource || linkCell)?.textContent.trim() || '',
    };
    const href = source?.getAttribute('href')?.trim();
    if (href && href !== '#' && (!isMediaRelease || text)) {
      const link = document.createElement('a');
      link.className = 'article-cards-link';
      link.href = href;
      link.textContent = text;
      if (isMediaRelease) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else if (source.target) link.target = source.target;
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

    if (isMediaRelease && (additionalLink || additionalText || additionalImg)) {
      const additional = document.createElement('div');
      additional.className = 'article-cards-additional';

      if (additionalLink || additionalText) {
        const button = document.createElement(additionalLink ? 'a' : 'span');
        button.className = 'article-cards-button';
        if (additionalLink) {
          const buttonHref = additionalLink.getAttribute('href')?.trim() || '#';
          button.setAttribute('href', isMediaRelease && /^www\./i.test(buttonHref)
            ? `https://${buttonHref}` : buttonHref);
          if (isMediaRelease) {
            button.target = '_blank';
            button.rel = 'noopener noreferrer';
          } else if (additionalLink.target) button.target = additionalLink.target;
          const ariaLabel = additionalLink.getAttribute('aria-label');
          if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
          moveInstrumentation(additionalLink, button);
        }
        const icon = additionalImg?.closest('picture') || additionalImg;
        if (icon) {
          icon.classList.add('article-cards-additional-image');
          button.append(icon);
        }
        button.append(document.createTextNode(additionalText));
        additional.append(button);
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
