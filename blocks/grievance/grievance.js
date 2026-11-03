import { decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

let blockCount = 0;

function createIcon(name) {
  const icon = document.createElement('span');
  icon.className = `icon icon-${name}`;
  return icon;
}

// authored icon: a rendered span.icon-name, or ":name:" text (e.g. ":mail:") inside the item
function extractIcon(li) {
  const span = li.querySelector('span.icon');
  if (span) {
    const name = [...span.classList].find((c) => c.startsWith('icon-'))?.slice(5);
    span.remove();
    return name;
  }
  const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const match = node.textContent.match(/:([a-z0-9-]+):/i);
    if (match) {
      node.textContent = node.textContent.replace(match[0], '').trimStart();
      return match[1].toLowerCase();
    }
  }
  return undefined;
}

// list item -> optional authored icon + label + value; bold text (or the first line) is the label
function decorateRow(li) {
  const iconName = extractIcon(li);
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
  li.append(labelEl, value);
  if (iconName) li.prepend(createIcon(iconName));
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

// heading that only holds a link (e.g. a bold link typed as a heading) -> primary button
function headingToButton(heading) {
  const link = heading.querySelector('a[href]');
  if (!link || link.textContent.trim() !== heading.textContent.trim()) return null;
  const wrapper = document.createElement('p');
  wrapper.className = 'button-wrapper';
  link.className = 'button primary';
  link.title = link.title || link.textContent.trim();
  wrapper.append(link);
  return wrapper;
}

// paragraph made of a link and/or icon only, e.g. "Document title :diagonal-arrow:"
function isLinkRow(el) {
  return el?.tagName === 'P'
    && !el.classList.contains('button-wrapper')
    && !!el.querySelector(':scope > a[href], :scope > .icon');
}

// "Approach RBI" details: intro chip, then sections starting at a heading.
// H2-H4 are numbered steps, H5/H6 are plain headings (e.g. "Learn more").
// A plain paragraph right before a link row also becomes a plain heading.
function decorateRbiDetails(details) {
  const children = [...details.children];
  let section;
  children.forEach((el, i) => {
    const button = /^H[2-6]$/.test(el.tagName) ? headingToButton(el) : null;
    const isTitle = /^H[2-6]$/.test(el.tagName) && !button;
    const isLinkTitle = el.tagName === 'P' && !isLinkRow(el) && !el.querySelector('a')
      && isLinkRow(children[i + 1]);

    if (button) {
      if (section) section.append(button);
      else el.before(button);
      el.remove();
    } else if (isTitle || isLinkTitle) {
      section = document.createElement('div');
      section.className = 'grievance-section';
      let title = el;
      if (isLinkTitle) {
        title = document.createElement('h4');
        title.textContent = el.textContent.trim();
        el.replaceWith(title);
      } else if (/^H[2-4]$/.test(el.tagName)) {
        section.classList.add('numbered');
      }
      title.className = 'grievance-section-title';
      title.before(section);
      section.append(title);
    } else if (section) {
      section.append(el);
    } else {
      el.className = 'grievance-group-label';
    }
  });
  details.querySelectorAll('.grievance-section ul').forEach((ul) => {
    ul.classList.add('grievance-rows');
    ul.querySelectorAll('li').forEach(decorateRow);
  });
  details.querySelectorAll('.grievance-section > p').forEach((p) => {
    if (!isLinkRow(p)) return;
    p.classList.add('grievance-link');
    if (!p.querySelector('.icon')) p.append(createIcon('diagonal-arrow'));
  });
}

function addToggle(item, details, id, labels) {
  details.id = id;
  details.hidden = true;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'grievance-toggle';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', id);
  const itemTitle = item.querySelector('.grievance-title')?.textContent.trim();
  if (itemTitle) button.setAttribute('aria-label', `${labels.more}: ${itemTitle}`);
  const text = document.createElement('span');
  text.textContent = labels.more;
  button.append(text, createIcon('chevron-down'));
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', open);
    details.hidden = !open;
    text.textContent = open ? labels.less : labels.more;
  });
  item.append(button);
}

/**
 * Grievance / contact directory: intro beside a list of items with contact details.
 * Variants: "steps" numbers the items on a timeline and collapses the details,
 * "directory" (default) shows the details open.
 * Single-cell rows, in order: intro, "read more" label, "show less" label (all optional).
 * Other rows: title, description, details.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  blockCount += 1;
  const isSteps = block.classList.contains('steps');
  const rows = [...block.children];
  const singleRows = rows.filter((row) => row.children.length === 1);
  const [introRow, moreRow, lessRow] = singleRows;
  const moreLabel = moreRow?.textContent.trim();
  const labels = { more: moreLabel, less: lessRow?.textContent.trim() || moreLabel };
  const content = [];

  if (introRow?.textContent.trim()) {
    const intro = introRow.firstElementChild;
    intro.className = 'grievance-intro';
    moveInstrumentation(introRow, intro);
    content.push(intro);
  }

  const list = document.createElement(isSteps ? 'ol' : 'div');
  list.className = 'grievance-list';
  rows.filter((row) => !singleRows.includes(row)).forEach((row, i) => {
    const [titleCell, descriptionCell, detailsCell, classesCell] = row.children;
    const item = document.createElement(isSteps ? 'li' : 'div');
    // the item "classes" field is delivered as a 4th cell (e.g. "grievance-item, rbi-approach")
    const variantClasses = (classesCell?.textContent || '').split(/[\s,]+/).filter(Boolean);
    item.className = [...new Set(['grievance-item', ...row.classList, ...variantClasses])].join(' ');
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
      if (item.classList.contains('rbi-approach') && details.querySelector('h2, h3, h4, h5, h6')) {
        decorateRbiDetails(details);
      } else {
        decorateDetails(details);
      }
      item.append(details);
      // without an authored button label the details stay visible and no toggle is rendered
      if (isSteps && labels.more) addToggle(item, details, `grievance-${blockCount}-details-${i + 1}`, labels);
    }
    list.append(item);
  });
  content.push(list);
  block.replaceChildren(...content);
  decorateIcons(block);
}
