import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { highlight } from '../../scripts/dropdown.js';
import { isDesktop } from '../../scripts/viewport.js';

const A11Y_KEY = 'kmpl-accessibility';
const A11Y_SETTINGS = [
  {
    key: 'text', label: 'Text size', icon: 'text-size', min: 100, max: 150, step: 10, unit: '%',
  },
  {
    key: 'spacing', label: 'Letter spacing', icon: 'letter-spacing', min: 0, max: 0.12, step: 0.02, unit: 'em',
  },
  {
    key: 'line', label: 'Line height', icon: 'line-height', min: 1.5, max: 2.1, step: 0.1, unit: '',
  },
];
const SEARCH_LIMIT = 6;

let uid = 0;

function icon(name, size = 24) {
  const img = document.createElement('img');
  img.src = `${window.hlx.codeBasePath}/icons/${name}.svg`;
  img.alt = '';
  img.width = size;
  img.height = size;
  img.className = `nav-icon nav-icon-${name}`;
  return img;
}

/**
 * An authored link that opens a panel instead of navigating: exposed as a button,
 * activated with Enter (native) and Space like a real button.
 * @param {HTMLAnchorElement} a
 */
function linkAsButton(a) {
  a.setAttribute('role', 'button');
  a.addEventListener('keydown', (e) => { if (e.key === ' ') e.preventDefault(); });
  a.addEventListener('keyup', (e) => { if (e.key === ' ') a.click(); });
}

/**
 * Text of a list item without its nested list.
 * @param {HTMLLIElement} li
 * @returns {string}
 */
function ownText(li) {
  return [...li.childNodes]
    .filter((n) => !(n.nodeType === Node.ELEMENT_NODE && n.matches('ul, ol')))
    .map((n) => n.textContent)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads "<li><a>Title</a> description</li>".
 * @returns {{ title: string, href: string, description: string }}
 */
function parseLink(li) {
  const a = li.querySelector(':scope > a, :scope > p > a') || li.querySelector('a');
  const title = a?.textContent.trim() || ownText(li);
  const description = ownText(li).replace(title, '').trim();
  return { title, href: a?.getAttribute('href') || '#', description };
}

/**
 * Top level navigation: items with optional links and groups.
 * <li>Label<ul><li><a>Title</a> description</li>…</ul></li>, groups are
 * nested one level deeper: <li>Caption<ul>…</ul></li>.
 */
function parseMenus(ul) {
  return [...ul.children].map((li) => {
    const sub = li.querySelector(':scope > ul');
    const link = li.querySelector(':scope > a, :scope > p > a');
    const menu = {
      label: ownText(li), href: link?.getAttribute('href'), items: [], groups: [],
    };
    [...(sub?.children || [])].forEach((entry) => {
      const groupList = entry.querySelector(':scope > ul');
      if (groupList) {
        menu.groups.push({ label: ownText(entry), items: [...groupList.children].map(parseLink) });
      } else {
        menu.items.push(parseLink(entry));
      }
    });
    return menu;
  });
}

function menuLink({ title, href, description }) {
  const a = document.createElement('a');
  a.className = 'nav-link';
  a.href = href;
  const t = document.createElement('span');
  t.className = 'nav-link-title';
  t.textContent = title;
  a.append(t);
  if (description) {
    const d = document.createElement('span');
    d.className = 'nav-link-desc';
    d.textContent = description;
    a.append(d);
  }
  return a;
}

function linkList(items) {
  const ul = document.createElement('ul');
  ul.className = 'nav-links';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.append(menuLink(item));
    ul.append(li);
  });
  return ul;
}

/* desktop: tabs with mega menu panels */
function buildDesktopMenu(menus) {
  const ul = document.createElement('ul');
  ul.className = 'nav-menu';
  let closeTimer;

  const closeAll = (except) => {
    ul.querySelectorAll('.nav-menu-toggle[aria-expanded="true"]').forEach((toggle) => {
      if (toggle !== except) toggle.setAttribute('aria-expanded', 'false');
    });
  };
  const open = (toggle) => {
    clearTimeout(closeTimer);
    closeAll(toggle);
    toggle.setAttribute('aria-expanded', 'true');
  };

  menus.forEach((menu) => {
    const li = document.createElement('li');
    li.className = 'nav-menu-item';
    if (!menu.items.length && !menu.groups.length) {
      const a = document.createElement('a');
      a.className = 'nav-menu-toggle';
      a.href = menu.href || '#';
      a.textContent = menu.label;
      li.append(a);
      ul.append(li);
      return;
    }
    uid += 1;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-menu-toggle';
    toggle.textContent = menu.label;
    if (/^more$/i.test(menu.label)) toggle.setAttribute('aria-label', 'More navigation links');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', `nav-panel-${uid}`);

    const panel = document.createElement('div');
    panel.className = 'nav-panel';
    panel.id = `nav-panel-${uid}`;
    if (menu.items.length) panel.append(linkList(menu.items));
    menu.groups.forEach((group) => {
      const column = document.createElement('div');
      column.className = 'nav-panel-group';
      const caption = document.createElement('p');
      caption.className = 'nav-panel-caption';
      caption.textContent = group.label;
      column.append(caption, linkList(group.items));
      panel.append(column);
    });
    if (menu.groups.length) li.classList.add('nav-mega');

    toggle.addEventListener('click', () => {
      if (toggle.getAttribute('aria-expanded') === 'true') toggle.setAttribute('aria-expanded', 'false');
      else open(toggle);
    });
    li.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') open(toggle);
    });
    li.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      closeTimer = setTimeout(() => toggle.setAttribute('aria-expanded', 'false'), 150);
    });
    li.append(toggle, panel);
    ul.append(li);
  });

  ul.closeAll = closeAll;
  return ul;
}

/* mobile: accordion, groups of a menu become their own top level rows */
function buildAccordion(menus) {
  const ul = document.createElement('ul');
  ul.className = 'nav-accordion';
  const rows = [];
  menus.forEach((menu) => {
    if (menu.items.length || (!menu.groups.length && menu.href)) {
      rows.push({ label: menu.label, items: menu.items, href: menu.href });
    }
    menu.groups.forEach((group) => rows.push(group));
  });
  rows.forEach((row) => {
    const li = document.createElement('li');
    if (!row.items.length) {
      const a = document.createElement('a');
      a.className = 'nav-accordion-toggle';
      a.href = row.href;
      a.textContent = row.label;
      li.append(a);
      ul.append(li);
      return;
    }
    uid += 1;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-accordion-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', `nav-accordion-${uid}`);
    toggle.append(row.label, icon('chevron-down', 20));
    const panel = linkList(row.items);
    panel.id = `nav-accordion-${uid}`;
    panel.hidden = true;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !expanded);
      panel.hidden = expanded;
    });
    li.append(toggle, panel);
    ul.append(li);
  });
  return ul;
}

/**
 * Small popover menu (language, settings) toggled by a button.
 * @returns {{ wrapper: HTMLDivElement, button: HTMLButtonElement, menu: HTMLUListElement }}
 */
function buildPopover(labelNodes, className) {
  uid += 1;
  const wrapper = document.createElement('div');
  wrapper.className = `nav-popover ${className}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-popover-toggle';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `nav-popover-${uid}`);
  button.append(...labelNodes, icon('chevron-down', 16));
  const menu = document.createElement('ul');
  menu.className = 'nav-popover-menu';
  menu.id = `nav-popover-${uid}`;
  menu.hidden = true;
  const setOpen = (isOpen) => {
    button.setAttribute('aria-expanded', isOpen);
    menu.hidden = !isOpen;
  };
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('header .nav-popover-toggle[aria-expanded="true"]').forEach((other) => {
      if (other !== button) other.click();
    });
    setOpen(menu.hidden);
  });
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) setOpen(false);
  });
  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      e.stopPropagation();
      setOpen(false);
      button.focus();
    }
  });
  wrapper.append(button, menu);
  wrapper.close = () => setOpen(false);
  return { wrapper, button, menu };
}

/* language: "<li>English<ul><li><a>English</a></li><li><a>हिन्दी</a> Hindi</li></ul></li>" */
function buildLanguage(li) {
  const items = [...li.querySelector(':scope > ul').children].map(parseLink);
  const path = window.location.pathname;
  const current = items.find((item) => {
    const itemPath = new URL(item.href, window.location).pathname;
    return item.href !== '#' && itemPath !== '/' && path.startsWith(itemPath.replace(/[^/]+$/, ''));
  }) || items[0];
  const label = document.createElement('span');
  label.textContent = current?.title || ownText(li);
  const { wrapper, menu } = buildPopover([label], 'nav-language');
  items.forEach((item) => {
    const option = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.href;
    const name = document.createElement('span');
    name.textContent = item.title;
    if (/[ऀ-ॿ]/.test(item.title)) name.lang = 'hi';
    a.append(name);
    if (item.description) {
      const gloss = document.createElement('small');
      gloss.textContent = item.description;
      a.append(gloss);
    }
    if (item === current) {
      a.setAttribute('aria-current', 'true');
      a.append(icon('check', 16));
    }
    option.append(a);
    menu.append(option);
  });
  return wrapper;
}

/* accessibility settings: text size, letter spacing, line height */
function readA11y() {
  try {
    return JSON.parse(localStorage.getItem(A11Y_KEY)) || {};
  } catch {
    return {};
  }
}

function applyA11y(settings) {
  const root = document.documentElement;
  A11Y_SETTINGS.forEach(({ key, min, unit }) => {
    const value = settings[key];
    const active = value !== undefined && Number(value) !== min;
    root.classList.toggle(`a11y-${key}`, active);
    if (active) root.style.setProperty(`--a11y-${key}`, unit === '%' ? value / 100 : `${value}${unit}`);
    else root.style.removeProperty(`--a11y-${key}`);
  });
}

async function openAccessibility() {
  const { createModal } = await import('../modal/modal.js');
  const settings = readA11y();
  const panel = document.createElement('div');
  panel.className = 'nav-a11y';
  panel.innerHTML = `
    <div class="nav-a11y-head">
      <h2>Accessibility Settings</h2>
      <p>This is a preview of how text will look in this website. Adjust it based on your requirement.</p>
    </div>
    <div class="nav-a11y-controls">
      <div class="nav-a11y-options" role="radiogroup" aria-label="Accessibility setting"></div>
      <div class="nav-a11y-slider">
        <p><label for="nav-a11y-range">Slide to adjust</label><span class="nav-a11y-preview" aria-hidden="true">Aa</span></p>
        <input id="nav-a11y-range" type="range">
      </div>
    </div>`;
  const options = panel.querySelector('.nav-a11y-options');
  const range = panel.querySelector('input');
  const preview = panel.querySelector('.nav-a11y-preview');
  let current = A11Y_SETTINGS[0];

  const paint = () => {
    const value = Number(range.value);
    range.style.setProperty('--fill', `${((value - range.min) / (range.max - range.min)) * 100}%`);
    range.setAttribute('aria-valuetext', `${current.label} ${value}${current.unit}`);
    const text = settings.text || 100;
    preview.style.fontSize = `${(16 * text) / 100}px`;
    preview.style.letterSpacing = `${settings.spacing || 0}em`;
  };
  const select = (setting) => {
    current = setting;
    [...options.children].forEach((b) => {
      const checked = b.dataset.key === setting.key;
      b.setAttribute('aria-checked', checked);
      b.tabIndex = checked ? 0 : -1;
    });
    Object.assign(range, { min: setting.min, max: setting.max, step: setting.step });
    range.value = settings[setting.key] ?? setting.min;
    paint();
  };
  A11Y_SETTINGS.forEach((setting) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.dataset.key = setting.key;
    button.append(icon(setting.icon), setting.label);
    button.addEventListener('click', () => select(setting));
    button.addEventListener('keydown', (e) => {
      const steps = {
        ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1,
      };
      const step = steps[e.key];
      if (!step) return;
      e.preventDefault();
      const list = [...options.children];
      const next = list[(list.indexOf(button) + step + list.length) % list.length];
      next.focus();
      next.click();
    });
    options.append(button);
  });
  range.addEventListener('input', () => {
    settings[current.key] = Number(range.value);
    applyA11y(settings);
    try {
      localStorage.setItem(A11Y_KEY, JSON.stringify(settings));
    } catch { /* storage unavailable */ }
    paint();
  });
  select(current);

  const { showModal } = await createModal([panel], { className: 'modal-sheet', label: 'Accessibility Settings' });
  showModal();
}

/* search: suggestions from the authored search list and the menu links */
function buildSearchIndex(menus, searchSection) {
  const entries = [];
  const seen = new Set();
  const add = (title, href, tag) => {
    const key = title.toLowerCase();
    if (!title || seen.has(key)) return;
    seen.add(key);
    entries.push({ title, href, tag });
  };
  searchSection?.querySelectorAll('li').forEach((li) => {
    const { title, href, description } = parseLink(li);
    add(title, href, description || 'Help');
  });
  menus.forEach((menu) => {
    menu.items.forEach((item) => add(item.title, item.href, 'Product'));
    menu.groups.forEach((group) => {
      const tag = /help|support/i.test(group.label) ? 'Help' : 'Explore';
      group.items.forEach((item) => add(item.title, item.href, tag));
    });
  });
  return entries;
}

function buildSearch(index, placeholder) {
  const search = document.createElement('div');
  search.className = 'nav-search';
  search.hidden = true;
  search.innerHTML = `
    <form class="nav-search-bar" role="search">
      <input type="search" name="q" autocomplete="off" aria-label="Search" aria-controls="nav-search-results">
      <button type="button" class="nav-search-clear" hidden>Clear</button>
    </form>
    <div class="nav-search-results" id="nav-search-results" hidden>
      <p class="nav-search-title">Suggested results</p>
      <div class="nav-search-columns">
        <div class="nav-search-group"><p class="nav-search-heading">Loans</p><ul></ul></div>
        <div class="nav-search-group"><p class="nav-search-heading">Tools &amp; Help</p><ul></ul></div>
      </div>
    </div>`;
  const form = search.querySelector('form');
  const input = form.querySelector('input');
  input.placeholder = placeholder;
  form.prepend(icon('search'));
  const clear = form.querySelector('.nav-search-clear');
  clear.append(icon('close'));
  const results = search.querySelector('.nav-search-results');
  const [loans, tools] = search.querySelectorAll('.nav-search-group');
  let matches = [];

  const render = () => {
    const query = input.value.trim();
    clear.hidden = !input.value;
    const q = query.toLowerCase();
    matches = q ? index.filter((e) => e.title.toLowerCase().includes(q)) : [];
    const groups = [
      [loans, matches.filter((e) => e.tag === 'Product')],
      [tools, matches.filter((e) => e.tag !== 'Product')],
    ];
    groups.forEach(([group, items]) => {
      const ul = group.querySelector('ul');
      ul.textContent = '';
      items.slice(0, SEARCH_LIMIT).forEach((entry) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = entry.href;
        const label = document.createElement('span');
        label.className = 'nav-search-label';
        highlight(label, entry.title, query);
        const tag = document.createElement('span');
        tag.className = 'nav-search-tag';
        tag.textContent = entry.tag;
        a.append(label, tag);
        li.append(a);
        ul.append(li);
      });
      group.hidden = !items.length;
    });
    results.hidden = !q;
    if (q && !matches.length) {
      loans.hidden = false;
      loans.querySelector('ul').innerHTML = '<li class="nav-search-empty">No results found</li>';
    }
  };
  input.addEventListener('input', render);
  clear.addEventListener('click', () => {
    input.value = '';
    render();
    input.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const first = matches[0];
    if (first) window.location.href = first.href;
  });
  search.reset = () => {
    input.value = '';
    render();
  };
  search.input = input;
  return search;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  applyA11y(readA11y());

  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // sections: [topbar], brand, sections, tools, [search suggestions]
  const count = nav.children.length;
  const classes = count > 3 ? ['topbar', 'brand', 'sections', 'tools', 'search-index'] : ['brand', 'sections', 'tools'];
  [...nav.children].forEach((section, i) => {
    if (classes[i]) section.classList.add(`nav-${classes[i]}`);
  });
  const searchSection = nav.querySelector('.nav-search-index');
  searchSection?.remove();

  /* utility top bar */
  const navTopbar = nav.querySelector('.nav-topbar');
  const settingsItems = [];
  let language;
  let contact;
  let phone;
  if (navTopbar) {
    navTopbar.remove();
    const announcement = navTopbar.querySelector('p');
    if (announcement) {
      // the info icon stays in place, only the text scrolls
      announcement.classList.add('nav-announcement');
      const infoIcon = announcement.querySelector(':scope > .icon');
      infoIcon?.remove();
      const track = document.createElement('span');
      track.className = 'nav-announcement-track';
      while (announcement.firstChild) track.append(announcement.firstChild);
      const viewport = document.createElement('span');
      viewport.className = 'nav-announcement-text';
      viewport.append(track);
      announcement.replaceChildren(...[infoIcon, viewport].filter(Boolean));
    }
    const utility = navTopbar.querySelector('ul');
    utility?.classList.add('nav-utility');
    [...(utility?.children || [])].forEach((li) => {
      // authored links may be wrapped in a paragraph (loose lists)
      const a = li.querySelector(':scope > a, :scope > p > a');
      if (li.querySelector(':scope > ul')) {
        language = li.cloneNode(true);
        li.classList.add('nav-utility-language');
        li.replaceChildren(buildLanguage(li));
        return;
      }
      if (!a) return;
      if (a.href.startsWith('tel:')) phone = a;
      else if (/contact/i.test(a.textContent)) contact = a;
      if (!li.querySelector('.icon')) settingsItems.push(a);
      if (/accessibility/i.test(a.textContent)) {
        linkAsButton(a);
        a.addEventListener('click', (e) => {
          e.preventDefault();
          openAccessibility();
        });
      }
    });
  }

  /* brand */
  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-wrapper, .button-container')?.removeAttribute('class');
  }
  // an authored logo image without a link points to the home page, next to the nav
  // fragment's site root (e.g. nav at /fragments/nav: logo links to /home)
  const brandPicture = navBrand.querySelector('picture');
  if (brandPicture && !brandPicture.closest('a')) {
    const home = document.createElement('a');
    home.href = `${navPath.replace(/\/(fragments\/)?nav$/, '')}/home`;
    if (!brandPicture.querySelector('img')?.alt) home.setAttribute('aria-label', 'Home');
    brandPicture.replaceWith(home);
    home.append(brandPicture);
  }

  /* menus */
  const navSections = nav.querySelector('.nav-sections');
  const menuList = navSections?.querySelector('ul');
  const menus = menuList ? parseMenus(menuList) : [];
  let desktopMenu;
  if (navSections) {
    desktopMenu = buildDesktopMenu(menus);
    const wrapper = navSections.querySelector('.default-content-wrapper') || navSections;
    wrapper.replaceChildren(desktopMenu, buildAccordion(menus));
  }

  /* tools: search, login, web pay */
  const navTools = nav.querySelector('.nav-tools');
  const searchLink = navTools?.querySelector('.icon-search')?.closest('a');
  const loginLink = navTools?.querySelector('a.secondary, em a');

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = '<button type="button" aria-controls="nav" aria-label="Open navigation"></button>';
  const hamburgerButton = hamburger.querySelector('button');
  hamburgerButton.append(icon('menu'), icon('close'));

  /* mobile menu extras: settings / language bar and the sticky contact + login footer */
  const settingsBar = document.createElement('div');
  settingsBar.className = 'nav-settings';
  if (settingsItems.length) {
    const label = document.createElement('span');
    label.textContent = 'Settings';
    const { wrapper, menu } = buildPopover([icon('settings', 16), label], 'nav-settings-menu');
    settingsItems.forEach((a) => {
      const li = document.createElement('li');
      const copy = a.cloneNode(true);
      if (/accessibility/i.test(a.textContent)) {
        copy.addEventListener('click', (e) => {
          e.preventDefault();
          wrapper.close();
          openAccessibility();
        });
      }
      li.append(copy);
      menu.append(li);
    });
    settingsBar.append(wrapper);
  }
  if (language) settingsBar.append(buildLanguage(language));

  const menuFooter = document.createElement('div');
  menuFooter.className = 'nav-menu-footer';
  if (contact) {
    const row = document.createElement('a');
    row.className = 'nav-contact';
    row.href = contact.href;
    row.innerHTML = '<span><strong></strong><small></small></span><span class="nav-contact-icon"></span>';
    row.querySelector('strong').textContent = contact.textContent.trim().replace(/^contact us$/i, 'Contact Us');
    row.querySelector('small').textContent = phone ? `${phone.textContent.trim()} · Toll-free` : '';
    row.querySelector('.nav-contact-icon').append(icon('arrow-up-right', 16));
    menuFooter.append(row);
  }
  if (loginLink) {
    const login = document.createElement('a');
    login.className = 'button primary nav-login';
    login.href = loginLink.href;
    login.textContent = loginLink.textContent.trim();
    const p = document.createElement('p');
    p.className = 'nav-login-wrapper';
    p.append(login);
    menuFooter.append(p);
  }

  const setMenu = (expanded) => {
    nav.dataset.expanded = expanded;
    hamburgerButton.setAttribute('aria-expanded', expanded);
    hamburgerButton.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('nav-open', expanded && !isDesktop.matches);
  };
  hamburgerButton.addEventListener('click', () => setMenu(nav.dataset.expanded !== 'true'));

  nav.prepend(hamburger);
  navSections?.prepend(settingsBar);
  navSections?.append(menuFooter);
  setMenu(false);

  /* search */
  const search = buildSearch(
    buildSearchIndex(menus, searchSection),
    searchLink?.getAttribute('title') && !/^search$/i.test(searchLink.getAttribute('title'))
      ? searchLink.getAttribute('title')
      : 'Search loans, branches,calculators',
  );
  const scrim = document.createElement('div');
  scrim.className = 'nav-scrim';
  scrim.hidden = true;
  const setSearch = (isOpen) => {
    search.hidden = !isOpen;
    scrim.hidden = !isOpen;
    block.classList.toggle('is-searching', isOpen);
    if (searchLink) {
      searchLink.setAttribute('aria-expanded', isOpen);
      searchLink.setAttribute('aria-label', isOpen ? 'Close search' : 'Search');
    }
    document.body.classList.toggle('nav-search-open', isOpen && !isDesktop.matches);
    if (isOpen) {
      desktopMenu?.closeAll();
      search.input.focus();
    } else {
      search.reset();
    }
  };
  if (searchLink) {
    linkAsButton(searchLink);
    searchLink.setAttribute('aria-controls', 'nav-search');
    searchLink.setAttribute('aria-expanded', 'false');
    searchLink.append(icon('close'));
    searchLink.addEventListener('click', (e) => {
      e.preventDefault();
      setSearch(search.hidden);
    });
  }
  search.id = 'nav-search';
  scrim.addEventListener('click', () => setSearch(false));

  /* closing behaviour */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const expanded = desktopMenu?.querySelector('[aria-expanded="true"]');
    if (expanded) {
      desktopMenu.closeAll();
      expanded.focus();
    } else if (!search.hidden) {
      setSearch(false);
      searchLink?.focus();
    } else if (nav.dataset.expanded === 'true' && !isDesktop.matches) {
      setMenu(false);
      hamburgerButton.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (desktopMenu && !desktopMenu.contains(e.target)) desktopMenu.closeAll();
  });
  nav.addEventListener('focusout', (e) => {
    if (desktopMenu && !desktopMenu.contains(e.relatedTarget)) desktopMenu.closeAll();
  });
  // the top bar scrolls away: bring it back when a keyboard user lands in it
  navTopbar?.addEventListener('focusin', () => {
    if (navTopbar.getBoundingClientRect().bottom <= 0) window.scrollTo({ top: 0 });
  });
  isDesktop.addEventListener('change', () => {
    setMenu(false);
    setSearch(false);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  if (navTopbar) navWrapper.append(navTopbar);
  navWrapper.append(nav, search, scrim);
  block.append(navWrapper);
}
