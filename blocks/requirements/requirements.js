import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

let blockCount = 0;

function buildCard(row, isDocuments) {
  const [, imageCell, titleCell, textCell] = row.children;
  const title = titleCell?.textContent.trim();
  // a row without a title is a short intro shown above that tab's cards
  const card = document.createElement(title ? 'li' : 'div');
  moveInstrumentation(row, card);
  if (!title) {
    card.className = 'requirements-panel-intro';
    if (textCell) while (textCell.firstChild) card.append(textCell.firstChild);
    return card;
  }

  card.className = 'requirements-card';
  const img = imageCell?.querySelector('img');
  if (img && !isDocuments) {
    const picture = createOptimizedPicture(img.src, img.alt, false, [{ width: '160' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    picture.className = 'requirements-icon';
    card.append(picture);
  }
  const label = document.createElement(isDocuments ? 'h3' : 'p');
  label.className = 'requirements-title';
  label.textContent = title;
  moveInstrumentation(titleCell, label);
  card.append(label);

  if (textCell) {
    const body = document.createElement('div');
    body.className = 'requirements-text';
    moveInstrumentation(textCell, body);
    while (textCell.firstChild) body.append(textCell.firstChild);
    card.append(body);
  }
  return card;
}

function addCarousel(panel) {
  const list = panel.querySelector('.requirements-cards');
  const nav = document.createElement('div');
  nav.className = 'requirements-nav';
  nav.innerHTML = `
    <button type="button" class="requirements-prev" aria-label="Previous"></button>
    <button type="button" class="requirements-next" aria-label="Next"></button>`;
  const [prev, next] = nav.children;
  const update = () => {
    const max = list.scrollWidth - list.clientWidth - 1;
    prev.disabled = list.scrollLeft <= 0;
    next.disabled = list.scrollLeft >= max;
    nav.hidden = max <= 0;
  };
  const step = (dir) => {
    const card = list.querySelector('.requirements-card');
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    list.scrollBy({ left: dir * ((card?.offsetWidth || 300) + gap), behavior: 'smooth' });
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  list.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(list);
  panel.append(nav);
}

/**
 * Requirements: tabbed cards. Variants: eligibility (icon, label, value) and
 * documents (title, checklist). Optional first single-cell row: decorative image.
 * Card rows: tab, icon, title, text. Rows with the same tab share a panel.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  blockCount += 1;
  const isDocuments = block.classList.contains('documents');
  const rows = [...block.children];
  const decoRow = rows.find((row) => row.children.length === 1);
  const cardRows = rows.filter((row) => row !== decoRow);

  // group rows by tab label, keeping authored order
  const groups = new Map();
  cardRows.forEach((row) => {
    const tab = row.children[0]?.textContent.trim() || '';
    if (!groups.has(tab)) groups.set(tab, []);
    groups.get(tab).push(row);
  });

  const content = [];
  const decoImg = decoRow?.querySelector('img');
  if (decoImg) {
    const picture = createOptimizedPicture(decoImg.src, '', false, [{ width: '1000' }]);
    picture.className = 'requirements-decoration';
    picture.querySelector('img').setAttribute('aria-hidden', 'true');
    moveInstrumentation(decoImg, picture.querySelector('img'));
    content.push(picture);
  }

  const tabs = [...groups.keys()];
  const showTabs = tabs.length > 1 || (tabs[0] && tabs.length === 1);
  const tablist = document.createElement('div');
  tablist.className = 'requirements-tabs';
  tablist.setAttribute('role', 'tablist');

  const panels = tabs.map((tab, i) => {
    const id = `requirements-${blockCount}-${i}`;
    const panel = document.createElement('div');
    panel.className = 'requirements-panel';
    panel.id = `${id}-panel`;
    const list = document.createElement('ul');
    list.className = 'requirements-cards';
    groups.get(tab).forEach((row) => {
      const card = buildCard(row, isDocuments);
      if (card.classList.contains('requirements-panel-intro')) panel.append(card);
      else list.append(card);
    });
    panel.append(list);
    if (!isDocuments) addCarousel(panel);

    if (showTabs) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `${id}-tab`;
      button.textContent = tab;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      button.addEventListener('click', () => {
        [...tablist.children].forEach((b, j) => {
          b.setAttribute('aria-selected', b === button);
          b.tabIndex = b === button ? 0 : -1;
          panels[j].hidden = b !== button;
        });
      });
      button.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: i + 1, ArrowLeft: i - 1 };
        if (!(e.key in keys)) return;
        const next = tablist.children[(keys[e.key] + tabs.length) % tabs.length];
        next.click();
        next.focus();
      });
      tablist.append(button);
    }
    return panel;
  });

  if (showTabs) {
    content.push(tablist);
    [...tablist.children].forEach((b, i) => {
      b.setAttribute('aria-selected', i === 0);
      b.tabIndex = i === 0 ? 0 : -1;
      panels[i].hidden = i !== 0;
    });
  }
  block.replaceChildren(...content, ...panels);
}
