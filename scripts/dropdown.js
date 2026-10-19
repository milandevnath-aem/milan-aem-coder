import { loadCSS } from './aem.js';

let cssLoaded;
let idCounter = 0;

function icon(name) {
  const img = document.createElement('img');
  img.src = `${window.hlx.codeBasePath}/icons/${name}.svg`;
  img.alt = '';
  img.width = 20;
  img.height = 20;
  img.loading = 'lazy';
  return img;
}

/**
 * Renders a label with the matched part of the query emphasised.
 * @param {Element} el target element
 * @param {string} text label
 * @param {string} query search query
 */
export function highlight(el, text, query) {
  el.textContent = '';
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index < 0) {
    el.textContent = text;
    return;
  }
  const strong = document.createElement('strong');
  strong.textContent = text.slice(index, index + query.length);
  el.append(text.slice(0, index), strong, text.slice(index + query.length));
  el.classList.add('is-match');
}

/**
 * Custom dropdown (listbox) with an optional search box.
 * @param {Object} config
 * @param {string} config.label field label, also the placeholder
 * @param {string} config.name form field name
 * @param {{ value: string, label: string, description?: string }[]} config.options
 * @param {string} [config.value] preselected value
 * @param {boolean} [config.search] show a search box
 * @param {string} [config.searchPlaceholder]
 * @param {boolean} [config.pinSelected] list the selected option first when reopened
 * @param {boolean} [config.required]
 * @param {string} [config.boundary] selector of an ancestor (e.g. a banner) the open
 *   panel must stay inside: the list is shortened and scrolls instead of overflowing it
 * @returns {HTMLDivElement} the dropdown; dispatches "change" (detail.byUser: picked by the
 *   visitor), exposes value/setValue()/hasOption()
 */
export function createDropdown({
  label, name, options, value = '', search = false, searchPlaceholder = 'Search',
  pinSelected = false, required = false, boundary = '',
}) {
  if (!cssLoaded) cssLoaded = loadCSS(`${window.hlx.codeBasePath}/styles/dropdown.css`);
  idCounter += 1;
  const id = `dropdown-${idCounter}`;

  const root = document.createElement('div');
  root.className = 'dropdown';
  if (required) root.dataset.required = 'true';

  const field = document.createElement('button');
  field.type = 'button';
  field.className = 'dropdown-field';
  field.setAttribute('aria-haspopup', 'listbox');
  field.setAttribute('aria-expanded', 'false');
  field.setAttribute('aria-controls', `${id}-list`);
  field.innerHTML = '<span class="dropdown-text"><span class="dropdown-label"></span><span class="dropdown-value"></span></span>';
  field.querySelector('.dropdown-label').textContent = label;
  field.append(icon('chevron-down'));
  field.lastElementChild.className = 'dropdown-chevron';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;

  const panel = document.createElement('div');
  panel.className = 'dropdown-panel';
  panel.hidden = true;

  let searchInput;
  if (search) {
    const box = document.createElement('div');
    box.className = 'dropdown-search';
    box.append(icon('search'));
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = searchPlaceholder;
    searchInput.setAttribute('aria-label', searchPlaceholder);
    searchInput.setAttribute('aria-controls', `${id}-list`);
    searchInput.autocomplete = 'off';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'dropdown-clear';
    clear.setAttribute('aria-label', 'Clear search');
    clear.hidden = true;
    clear.append(icon('close'));
    box.append(searchInput, clear);
    panel.append(box);
    clear.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.focus();
    });
  }

  const list = document.createElement('ul');
  list.className = 'dropdown-list';
  list.id = `${id}-list`;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);
  panel.append(list);
  root.append(field, input, panel);

  let active = -1;
  const visibleOptions = () => [...list.querySelectorAll('[role="option"]')];

  const setActive = (index) => {
    const items = visibleOptions();
    active = Math.max(0, Math.min(items.length - 1, index));
    items.forEach((item, i) => item.classList.toggle('is-active', i === active));
    const item = items[active];
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
      (searchInput || field).setAttribute('aria-activedescendant', item.id);
    }
  };

  const render = (query = '') => {
    list.textContent = '';
    const q = query.trim().toLowerCase();
    let matches = options.filter((o) => !q || o.label.toLowerCase().includes(q));
    if (pinSelected && !q && input.value) {
      const selected = options.find((o) => o.value === input.value);
      if (selected) matches = [selected, ...matches.filter((o) => o !== selected)];
    }
    matches.forEach((option, i) => {
      const li = document.createElement('li');
      li.id = `${id}-option-${i}`;
      li.setAttribute('role', 'option');
      li.dataset.value = option.value;
      const selected = option.value === input.value;
      li.setAttribute('aria-selected', selected);
      const text = document.createElement('span');
      text.className = 'dropdown-option-text';
      const optionLabel = document.createElement('span');
      optionLabel.className = 'dropdown-option-label';
      highlight(optionLabel, option.label, q);
      text.append(optionLabel);
      if (option.description) {
        const desc = document.createElement('span');
        desc.className = 'dropdown-option-desc';
        desc.textContent = option.description;
        text.append(desc);
      }
      li.append(text);
      if (selected) li.append(icon('check'));
      list.append(li);
    });
    if (!matches.length) {
      const empty = document.createElement('li');
      empty.className = 'dropdown-empty';
      empty.textContent = 'No results found';
      list.append(empty);
    }
    active = -1;
  };

  // shortens the list to keep the panel inside the boundary, flags it when it scrolls
  const fitPanel = () => {
    list.style.maxHeight = '';
    const area = boundary && root.closest(boundary);
    if (area) {
      const limit = area.getBoundingClientRect().bottom - 24;
      const overflow = panel.getBoundingClientRect().bottom - limit;
      if (overflow > 0) list.style.maxHeight = `${Math.max(list.offsetHeight - overflow, 120)}px`;
    }
    panel.classList.toggle('is-scrollable', list.scrollHeight > list.clientHeight);
  };

  const close = (focusField = false) => {
    if (panel.hidden) return;
    panel.hidden = true;
    field.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    if (focusField) field.focus();
  };

  const open = () => {
    if (searchInput) searchInput.value = '';
    render();
    panel.hidden = false;
    field.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    fitPanel();
    const selectedIndex = visibleOptions().findIndex((li) => li.dataset.value === input.value);
    if (selectedIndex >= 0) setActive(selectedIndex);
    if (searchInput) {
      searchInput.parentElement.querySelector('.dropdown-clear').hidden = true;
      searchInput.focus();
    } else {
      list.tabIndex = -1;
      list.focus();
      if (selectedIndex < 0) setActive(0);
    }
  };

  // exact value or label first, then a loose match ignoring case, spaces and punctuation
  // ("Two wheeler loan" finds "Two-Wheeler", "Top up loans" finds "Top-Up Loan")
  const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const findOption = (wantedValue) => {
    const wanted = normalize(wantedValue);
    return options.find((o) => o.value === wantedValue || o.label === wantedValue)
      || (wanted && options.find((o) => {
        const l = normalize(o.label);
        return l && (l.startsWith(wanted) || wanted.startsWith(l));
      }));
  };

  // the "change" event's detail.byUser tells a visitor's pick from a value set by code
  const setValue = (newValue, notify = true, byUser = false) => {
    const option = findOption(newValue);
    input.value = option ? option.value : '';
    root.value = input.value;
    field.querySelector('.dropdown-value').textContent = option ? option.label : '';
    root.classList.toggle('is-filled', !!option);
    if (notify) root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { byUser } }));
  };

  const choose = (li) => {
    if (!li?.dataset.value) return;
    setValue(li.dataset.value, true, true);
    close(true);
  };

  field.addEventListener('click', () => (panel.hidden ? open() : close()));
  // pressing on an option must not move focus: in a dialog focus would jump to the dialog,
  // "focus left the dropdown" closes the panel and the click never reaches the option.
  // The search box keeps its own mouse handling (caret, selection).
  panel.addEventListener('mousedown', (e) => {
    if (e.target !== searchInput) e.preventDefault();
  });
  list.addEventListener('click', (e) => choose(e.target.closest('[role="option"]')));
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li) setActive(visibleOptions().indexOf(li));
  });

  const onKeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    if (e.key === 'Enter') { e.preventDefault(); choose(visibleOptions()[Math.max(active, 0)]); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    if (e.key === 'Tab') close();
  };
  panel.addEventListener('keydown', onKeydown);
  field.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && panel.hidden) { e.preventDefault(); open(); }
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchInput.parentElement.querySelector('.dropdown-clear').hidden = !searchInput.value;
      render(searchInput.value);
      fitPanel();
      if (searchInput.value) setActive(0);
    });
  }

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  });
  root.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !root.contains(e.relatedTarget)) close();
  });

  root.setValue = (v) => setValue(v);
  root.hasOption = (v) => Boolean(findOption(v));
  root.focus = () => field.focus();
  setValue(value, false);
  return root;
}
