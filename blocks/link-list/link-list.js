import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

const VISIBLE_ITEMS = 5;

function buildItem(row) {
  const [imageCell, textCell, linkCell, iconCell] = row.children;
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

  const iconImg = iconCell?.querySelector('img');
  if (iconImg?.src) {
    const icon = document.createElement('img');
    icon.className = 'link-list-icon';
    icon.src = iconImg.src;
    icon.alt = '';
    icon.loading = 'lazy';
    moveInstrumentation(iconImg, icon);
    wrap.append(icon);
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
  const [sideRow, introRow, noteRow, readAllRow, readLessRow] = single;
  const itemRows = rows.filter((row) => !single.includes(row));

  const side = takeCell(sideRow, 'link-list-side');
  const intro = takeCell(introRow, 'link-list-intro');
  const note = takeCell(noteRow, 'link-list-note');

  const list = document.createElement('ul');
  itemRows.forEach((row) => list.append(buildItem(row)));

  const main = document.createElement('div');
  main.className = 'link-list-main';
  main.append(...[intro, list].filter(Boolean));

  const useButtons = block.classList.contains('buttons');
  if (useButtons) {
    const readAll = readAllRow?.textContent.trim() || 'Read all';
    const readLess = readLessRow?.textContent.trim() || 'Read less';
    const collapsible = list.children.length > VISIBLE_ITEMS;
    list.classList.toggle('link-list-collapsed', collapsible);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'link-list-toggle';
    toggle.textContent = readAll;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const collapsed = list.classList.toggle('link-list-collapsed');
      toggle.textContent = collapsed ? readAll : readLess;
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });
    main.append(toggle);
  }
  if (note) main.append(note);

  block.replaceChildren(...[side, main].filter(Boolean));
}
