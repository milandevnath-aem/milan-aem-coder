import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Promotional offer banners. Each row: image, text, disclaimer, style (width + text colour).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const [imageCell, textCell, disclaimerCell, styleCell] = row.children;
    const item = document.createElement('li');
    item.className = 'offers-item';
    moveInstrumentation(row, item);

    const style = styleCell
      ? [...styleCell.querySelectorAll('p')].map((p) => p.textContent).join(' ') || styleCell.textContent
      : '';
    const layout = /\bhalf\b/i.test(style) ? 'half' : 'full';
    item.classList.add(`offers-${layout}`);
    if (/\bshort\b/i.test(style)) item.classList.add('offers-short');
    if (/\bdark\b/i.test(style)) item.classList.add('offers-dark-text');

    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createOptimizedPicture(img.src, img.alt, false, [
        { media: '(min-width: 900px)', width: layout === 'half' ? '1400' : '2000' },
        { width: '750' },
      ]);
      moveInstrumentation(img, picture.querySelector('img'));
      picture.classList.add('offers-image');
      item.append(picture);
    }

    if (textCell) {
      textCell.className = 'offers-content';
      const eyebrow = textCell.querySelector('p:first-child:not(.button-wrapper)');
      if (eyebrow && eyebrow.nextElementSibling?.matches('h1, h2, h3, h4')) eyebrow.classList.add('offers-eyebrow');
      // several call-to-action paragraphs sit side by side
      const buttons = [...textCell.querySelectorAll(':scope > .button-wrapper')];
      if (buttons.length > 1) {
        const group = document.createElement('div');
        group.className = 'offers-buttons';
        buttons[0].before(group);
        group.append(...buttons);
      }
      item.append(textCell);
    }

    if (disclaimerCell?.textContent.trim()) {
      const disclaimer = document.createElement('p');
      disclaimer.className = 'offers-disclaimer';
      disclaimer.textContent = disclaimerCell.textContent.trim();
      moveInstrumentation(disclaimerCell, disclaimer);
      item.append(disclaimer);
    }

    list.append(item);
  });
  block.replaceChildren(list);
}
