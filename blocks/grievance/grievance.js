import { decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

let blockCount = 0;

// first matching keyword in a row label picks its icon; anything else is a person
const ICONS = [
  ['fax', 'fax'],
  ['mail', 'mail'],
  ['hour', 'clock'],
  ['phone', 'call'],
  ['toll', 'call'],
  ['number', 'call'],
  ['address', 'location'],
  ['write', 'location'],
  ['portal', 'globe'],
  ['website', 'globe'],
];

function iconFor(label) {
  const text = label.toLowerCase();
  return ICONS.find(([keyword]) => text.includes(keyword))?.[1] || 'user';
}

function createIcon(name) {
  const icon = document.createElement('span');
  icon.className = `icon icon-${name}`;
  return icon;
}

// list item -> icon + label + value; bold text (or the first line) is the label
function decorateRow(li) {
  const strong = li.querySelector('strong');
  let label = '';
  if (strong) {
    label = strong.textContent.trim();
    strong.remove();
  } else {
    const br = li.querySelector('br');
    const nodes = [...li.childNodes];
    const end = br ? nodes.indexOf(br) : nodes.length;
    label = nodes.slice(0, end).map((node) => node.textContent).join('').trim();
    nodes.slice(0, end).forEach((node) => node.remove());
  }
  // drop line breaks left between label and value
  while (li.firstChild?.nodeName === 'BR' || (li.firstChild?.nodeType === 3 && !li.firstChild.textContent.trim())) {
    li.firstChild.remove();
  }

  const value = document.createElement('span');
  value.className = 'grievance-row-value';
  while (li.firstChild) value.append(li.firstChild);
  const labelEl = document.createElement('span');
  labelEl.className = 'grievance-row-label';
  labelEl.textContent = label;
  li.className = 'grievance-row';
  li.append(createIcon(iconFor(label)), labelEl, value);
}

// label paragraph + list pairs become groups with a chip heading and contact rows
function decorateDetails(details) {
  const children = [...details.children];
  let i = 0;
  while (i < children.length) {
    const el = children[i];
    const next = children[i + 1];
    const group = document.createElement('div');
    group.className = 'grievance-group';
    if (el.tagName !== 'UL' && next?.tagName === 'UL') {
      el.className = 'grievance-group-label';
      el.before(group);
      group.append(el, next);
      i += 2;
    } else if (el.tagName === 'UL') {
      el.before(group);
      group.append(el);
      i += 1;
    } else {
      i += 1;
    }
    group.querySelector('ul')?.classList.add('grievance-rows');
    group.querySelectorAll('li').forEach(decorateRow);
  }
}

function addToggle(item, details, id) {
  details.id = id;
  details.hidden = true;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'grievance-toggle';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', id);
  const text = document.createElement('span');
  text.textContent = 'Read more';
  button.append(text, createIcon('chevron-down'));
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', open);
    details.hidden = !open;
    text.textContent = open ? 'Show less' : 'Read more';
  });
  item.append(button);
}

/**
 * Grievance / contact directory: intro beside a list of items with contact details.
 * Variants: "steps" numbers the items on a timeline and collapses the details,
 * "directory" (default) shows the details open.
 * Optional first single-cell row: intro. Other rows: title, description, details.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  blockCount += 1;
  const isSteps = block.classList.contains('steps');
  const rows = [...block.children];
  const introRow = rows.find((row) => row.children.length === 1);
  const content = [];

  if (introRow?.textContent.trim()) {
    const intro = introRow.firstElementChild;
    intro.className = 'grievance-intro';
    moveInstrumentation(introRow, intro);
    content.push(intro);
  }

  const list = document.createElement(isSteps ? 'ol' : 'div');
  list.className = 'grievance-list';
  rows.filter((row) => row !== introRow).forEach((row, i) => {
    const [titleCell, descriptionCell, detailsCell] = row.children;
    const item = document.createElement(isSteps ? 'li' : 'div');
    item.className = 'grievance-item';
    moveInstrumentation(row, item);

    if (isSteps) {
      const step = document.createElement('span');
      step.className = 'grievance-step';
      step.textContent = String(i + 1).padStart(2, '0');
      item.append(step);
    }

    const titleText = titleCell?.textContent.trim();
    if (titleText) {
      const title = document.createElement('h3');
      title.className = 'grievance-title';
      title.textContent = titleText;
      moveInstrumentation(titleCell, title);
      item.append(title);
    }

    if (descriptionCell?.textContent.trim()) {
      const description = document.createElement('div');
      description.className = 'grievance-description';
      moveInstrumentation(descriptionCell, description);
      while (descriptionCell.firstChild) description.append(descriptionCell.firstChild);
      item.append(description);
    }

    if (detailsCell?.textContent.trim()) {
      const details = document.createElement('div');
      details.className = 'grievance-details';
      moveInstrumentation(detailsCell, details);
      while (detailsCell.firstChild) details.append(detailsCell.firstChild);
      decorateDetails(details);
      item.append(details);
      if (isSteps) addToggle(item, details, `grievance-${blockCount}-details-${i + 1}`);
    }
    list.append(item);
  });
  content.push(list);
  block.replaceChildren(...content);
  decorateIcons(block);
}
