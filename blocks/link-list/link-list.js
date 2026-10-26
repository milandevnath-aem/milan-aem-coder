import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

function buildItem(row) {
  const [imageCell, textCell, linkCell] = row.children;
  const source = linkCell?.querySelector('a');
  const href = source?.getAttribute('href')?.trim();
  const hasLink = Boolean(href && href !== '#');

  const item = document.createElement('li');
  item.className = 'link-list-item';
  moveInstrumentation(row, item);

  const wrap = document.createElement(hasLink ? 'a' : 'div');
  wrap.className = 'link-list-row';
  if (hasLink) {
    wrap.href = href;
    wrap.target = '_blank';
    wrap.rel = 'noopener noreferrer';
    moveInstrumentation(source, wrap);
  }

  const img = imageCell?.querySelector('img');
  if (img) {
    const media = createPicture(img.src, img.alt, false, [{ width: '200' }]);
    moveInstrumentation(img, media.querySelector('img'));
    media.classList.add('link-list-media');
    wrap.append(media);
    item.classList.add('link-list-has-image');
  }

  const label = document.createElement('span');
  label.className = 'link-list-title';
  label.textContent = textCell?.textContent.trim() || '';
  wrap.append(label);

  if (hasLink) {
    const arrow = document.createElement('span');
    arrow.className = 'link-list-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    wrap.append(arrow);
  }

  item.append(wrap);
  return item;
}

function takeCell(row, className) {
  if (!row?.textContent.trim()) return null;
  const cell = row.firstElementChild;
  cell.className = className;
  moveInstrumentation(row, cell);
  return cell;
}

/**
 * Link list. Single-cell rows in order: side (title + description), intro, note.
 * Item rows: image, text, link. Items with an image get a thumbnail.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const single = rows.filter((row) => row.children.length === 1);
  const [sideRow, introRow, noteRow] = single;
  const itemRows = rows.filter((row) => !single.includes(row));

  const side = takeCell(sideRow, 'link-list-side');
  const intro = takeCell(introRow, 'link-list-intro');
  const note = takeCell(noteRow, 'link-list-note');

  const list = document.createElement('ul');
  itemRows.forEach((row) => list.append(buildItem(row)));

  const main = document.createElement('div');
  main.className = 'link-list-main';
  main.append(...[intro, list, note].filter(Boolean));

  block.replaceChildren(...[side, main].filter(Boolean));
}
