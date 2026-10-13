import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { MEDIA } from '../../scripts/viewport.js';

let idCounter = 0;

/**
 * Turns an authored list item ("<a>Title</a> description") into a product card.
 * @param {HTMLLIElement} li
 * @returns {HTMLLIElement}
 */
function buildCard(li) {
  const card = document.createElement('li');
  card.className = 'product-tabs-card';
  const link = li.querySelector('a');
  const titleEl = link || li.querySelector('strong');
  const title = titleEl?.textContent.trim() || '';
  const description = li.textContent.replace(title, '').trim();

  const wrapper = document.createElement(link ? 'a' : 'div');
  wrapper.className = 'product-tabs-card-link';
  if (link) {
    wrapper.href = link.getAttribute('href');
    if (link.title && link.title !== title) wrapper.title = link.title;
  }
  wrapper.innerHTML = `
    <span class="product-tabs-card-title"></span>
    <span class="product-tabs-card-arrow" aria-hidden="true"></span>
    <span class="product-tabs-card-text"></span>`;
  wrapper.querySelector('.product-tabs-card-title').textContent = title;
  wrapper.querySelector('.product-tabs-card-text').textContent = description;
  card.append(wrapper);
  return card;
}

function selectTab(tablist, tab, focus = false) {
  tablist.querySelectorAll('[role="tab"]').forEach((t) => {
    const selected = t === tab;
    t.setAttribute('aria-selected', selected);
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus();
  tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

/**
 * Product tabs: one row per tab with label, image and a list of product links.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  idCounter += 1;
  const tablist = document.createElement('div');
  tablist.className = 'product-tabs-list';
  tablist.setAttribute('role', 'tablist');
  const panels = document.createElement('div');
  panels.className = 'product-tabs-panels';

  [...block.children].forEach((row, i) => {
    const [labelCell, imageCell, productsCell] = row.children;
    const id = `product-tabs-${idCounter}-${i}`;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'product-tabs-tab';
    tab.id = `${id}-tab`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${id}-panel`);
    tab.textContent = labelCell?.textContent.trim() || `Tab ${i + 1}`;
    tablist.append(tab);

    const panel = document.createElement('div');
    panel.className = 'product-tabs-panel';
    panel.id = `${id}-panel`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    moveInstrumentation(row, panel);

    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createOptimizedPicture(img.src, img.alt, false, [
        { media: MEDIA.desktop, width: '2000' },
        { width: '750' },
      ]);
      moveInstrumentation(img, picture.querySelector('img'));
      picture.classList.add('product-tabs-image');
      panel.append(picture);
    }

    const cards = document.createElement('ul');
    cards.className = 'product-tabs-cards';
    productsCell?.querySelectorAll('li').forEach((li) => cards.append(buildCard(li)));
    if (productsCell) moveInstrumentation(productsCell, cards);
    panel.append(cards);
    panels.append(panel);
  });

  const tabs = [...tablist.children];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tablist, tab));
    tab.addEventListener('keydown', (e) => {
      const keys = {
        ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1,
      };
      if (!(e.key in keys)) return;
      e.preventDefault();
      selectTab(tablist, tabs[(keys[e.key] + tabs.length) % tabs.length], true);
    });
  });

  block.replaceChildren(tablist, panels);
  if (tabs.length) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === 0);
      tab.tabIndex = i === 0 ? 0 : -1;
      panels.children[i].hidden = i !== 0;
    });
  }
}
