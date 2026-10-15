import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

const VARIANTS = ['numbered', 'split', 'info', 'about-us'];

function buildCard(row, index) {
  const [imageCell, textCell, layoutCell] = row.children;
  const card = document.createElement('li');
  card.className = 'feature-cards-card';
  moveInstrumentation(row, card);

  const layout = layoutCell?.textContent.trim().toLowerCase();
  const img = imageCell?.querySelector('img');
  const isMedia = layout === 'image' && img;
  card.classList.add(isMedia ? 'is-media' : 'is-icon');

  if (img) {
    const picture = createPicture(img.src, img.alt, false, [{ width: isMedia ? '1200' : '160' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    picture.classList.add(isMedia ? 'feature-cards-image' : 'feature-cards-icon');
    card.append(picture);
  }

  const body = document.createElement('div');
  body.className = 'feature-cards-body';
  const number = document.createElement('span');
  number.className = 'feature-cards-number';
  number.textContent = String(index + 1).padStart(2, '0');
  body.append(number);
  if (textCell) {
    moveInstrumentation(textCell, body);
    while (textCell.firstChild) body.append(textCell.firstChild);
    // info cards: a plain paragraph followed by a bold one is a label/value pair
    body.querySelectorAll('p').forEach((p) => {
      if (p.querySelector('strong') && p.textContent.trim() === p.querySelector('strong').textContent.trim()) {
        p.classList.add('feature-cards-value');
      }
    });
  }
  card.append(body);
  return card;
}

/** Sizes trailing icon cards so every desktop row is filled (3-up, then 2-up / full). */
function sizeIconCards(cards) {
  const icons = cards.filter((card) => card.classList.contains('is-icon'));
  const rest = icons.length % 3;
  icons.slice(icons.length - rest).forEach((card) => card.classList.add(rest === 2 ? 'half' : 'full'));
}

/**
 * Feature cards. Variants: default (image + icon grid), numbered, split, info,
 * about-us (company detail cards on the About Us page).
 * An optional single-cell first row holds intro text (heading, CTA, note);
 * each other row is a card: image, text, layout (icon | image).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const variant = VARIANTS.find((v) => block.classList.contains(v));
  const rows = [...block.children];
  const introRow = rows.find((row) => row.children.length === 1);
  const cardRows = rows.filter((row) => row !== introRow);

  const list = document.createElement('ul');
  list.className = 'feature-cards-list';
  const cards = cardRows.map(buildCard);
  list.append(...cards);
  if (!variant) sizeIconCards(cards);

  const content = [];
  if (introRow?.textContent.trim()) {
    const intro = introRow.firstElementChild;
    intro.className = 'feature-cards-intro';
    moveInstrumentation(introRow, intro);
    content.push(intro);
  }

  if (variant === 'split') {
    // heading + media card on the left; icon cards, CTA and note on the right
    const aside = document.createElement('div');
    aside.className = 'feature-cards-aside';
    const intro = content[0];
    if (intro) aside.append(...intro.querySelectorAll('h1, h2, h3'));
    const media = list.querySelector('.is-media');
    if (media) {
      // the media card leaves the list, so it can no longer be a list item
      const card = document.createElement('div');
      card.className = media.className;
      moveInstrumentation(media, card);
      card.append(...media.childNodes);
      media.remove();
      aside.append(card);
    }
    const main = document.createElement('div');
    main.className = 'feature-cards-main';
    main.append(list);
    if (intro) {
      intro.classList.add('feature-cards-footer');
      main.append(intro);
    }
    block.replaceChildren(aside, main);
    return;
  }

  block.replaceChildren(...content, list);
}
