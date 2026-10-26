import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

function openExternally(a, href) {
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
}

function buildItem(row, isLsp) {
  const [imageCell, textCell, linkCell] = row.children;
  const source = linkCell?.querySelector('a');
  const href = source?.getAttribute('href')?.trim();
  const hasLink = Boolean(href && href !== '#');
  const title = textCell?.textContent.trim() || '';
  const linkText = source?.textContent.trim() || '';

  const item = document.createElement('li');
  item.className = 'link-list-item';
  moveInstrumentation(row, item);

  // Quick Links: the whole row is the link; LSP: only the "Know more" text
  const wrap = document.createElement(hasLink && !isLsp ? 'a' : 'div');
  wrap.className = 'link-list-row';
  if (hasLink && !isLsp) openExternally(wrap, href);

  const img = imageCell?.querySelector('img');
  let media;
  if (img) {
    media = createPicture(img.src, img.alt, false, [{ width: '200' }]);
    moveInstrumentation(img, media.querySelector('img'));
    media.classList.add('link-list-media');
  }

  const label = document.createElement('span');
  label.className = 'link-list-title';
  label.textContent = title;

  if (isLsp) {
    if (media) wrap.append(media);
    wrap.append(label);
    if (hasLink) {
      const more = document.createElement('a');
      more.className = 'link-list-more';
      openExternally(more, href);
      more.textContent = linkText || 'Know more';
      if (source) moveInstrumentation(source, more);
      wrap.append(more);
      item.classList.add('link-list-has-link');
    }
  } else {
    wrap.append(label);
    if (media) wrap.append(media);
  }

  item.append(wrap);
  return item;
}

/**
 * Link list. Variants: lsp-list (image, title, Know more) and quick-links (title, icon).
 * Single-cell rows: intro, then note. Item rows: image, text, link.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const isLsp = !block.classList.contains('quick-links');
  const rows = [...block.children];
  const single = rows.filter((row) => row.children.length === 1);
  const [introRow, noteRow] = single;
  const itemRows = rows.filter((row) => !single.includes(row));

  const content = [];
  if (introRow?.textContent.trim()) {
    const intro = introRow.firstElementChild;
    intro.className = 'link-list-intro';
    moveInstrumentation(introRow, intro);
    content.push(intro);
  }

  const list = document.createElement('ul');
  itemRows.forEach((row) => list.append(buildItem(row, isLsp)));
  content.push(list);

  if (isLsp && noteRow?.textContent.trim()) {
    const note = noteRow.firstElementChild;
    note.className = 'link-list-note';
    moveInstrumentation(noteRow, note);
    content.push(note);
  }

  block.replaceChildren(...content);
}
