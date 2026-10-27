import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

function buildItem(row) {
  const [imageCell, textCell] = row.children;
  const item = document.createElement('li');
  item.className = 'partner-list-item';
  moveInstrumentation(row, item);

  const img = imageCell?.querySelector('img');
  if (img) {
    const picture = createPicture(img.src, img.alt, false, [{ width: '160' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    picture.classList.add('partner-list-icon');
    item.append(picture);
  }

  const label = document.createElement('span');
  label.className = 'partner-list-label';
  label.textContent = textCell?.textContent.trim() || '';
  if (textCell) moveInstrumentation(textCell, label);
  item.append(label);
  return item;
}

/**
 * Partner list: intro (title, description) beside a list of icon + label items.
 * Leading single-cell rows are the title and description; other rows are items (image, text).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const introRows = rows.filter((row) => row.children.length === 1);
  const itemRows = rows.filter((row) => row.children.length > 1);
  const [titleRow, descriptionRow] = introRows;

  const intro = document.createElement('div');
  intro.className = 'partner-list-intro';
  const titleText = titleRow?.textContent.trim();
  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'partner-list-title';
    title.textContent = titleText;
    moveInstrumentation(titleRow, title);
    intro.append(title);
  }
  if (descriptionRow?.textContent.trim()) {
    const description = document.createElement('div');
    description.className = 'partner-list-description';
    moveInstrumentation(descriptionRow, description);
    description.append(...descriptionRow.firstElementChild.childNodes);
    intro.append(description);
  }

  const list = document.createElement('ul');
  list.className = 'partner-list-items';
  list.append(...itemRows.map(buildItem));

  block.replaceChildren(intro, list);
}
