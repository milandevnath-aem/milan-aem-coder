import { moveInstrumentation } from '../../scripts/scripts.js';
import { createDropdown } from '../../scripts/dropdown.js';
import {
  CITY_CONFIG,
  createCity,
  findCity,
  firstCity,
  getPosition,
  getSavedChoice,
  loadCityMaster,
  nearestCity,
  saveChoice,
  toPosition,
} from '../../scripts/city-locator.js';

/*
  Branch locator (Contact Us): city dropdown, map and the selected city's details.

  Cities come from the city master sheet (see scripts/city-locator.js); the block's
  authored branch rows are used only when the city master is missing or empty.

  First visit: our own dialog asks whether to use the visitor's location. Only after
  "Turn on location" does the browser ask for permission (the browser prompt cannot be
  skipped; ours explains it first). The nearest city is then found from the city
  master's coordinates, if one is within CITY_CONFIG.maxDistanceKm; else, and on "No",
  a denied permission or any failure, the first city of the sheet is shown. When the
  browser already allows or blocks location, our dialog is skipped. The answer and the
  selected city are remembered, so the dialog is not shown again.

  The map is Google's keyless embed, pinned at the city's coordinates (or its address).

  Every city change dispatches "city-change" on document ({ detail: { city } }) so
  other city-aware content on the page can follow.
*/

const MESSAGES = {
  locating: 'Finding the branch nearest to you…',
  nearest: (city) => `Showing the branch nearest to you: ${city}`,
  noMatch: (city) => `We could not find a branch near you. Showing our ${city} branch; select your city to change it.`,
  failed: 'We could not find a branch near you. Please select your city.',
  empty: 'Branch details are not available right now. Please try again later.',
};

/** detail an authored paragraph holds; matched by content, as rows may leave any out */
function detailKey(text) {
  if (/@|^mailto:/i.test(text)) return 'email';
  if (/\d\s*(am|pm)\b|monday|operate|timing/i.test(text)) return 'timing';
  if (/toll[- ]?free/i.test(text) || /^[\d\s/+()-]+$/.test(text)) return 'phone';
  return 'address';
}

/**
 * Authored branch row (fallback when there is no city master): city, details
 * (address, phone, timing, email paragraphs), or city, region, details, coordinates.
 */
function parseBranch(row) {
  const cells = [...row.children];
  const hasExtras = cells.length > 2;
  const detailsCell = hasExtras ? cells[2] : cells[1];
  const values = {};
  [...(detailsCell?.querySelectorAll('p') || [])].forEach((p) => {
    const text = p.textContent.trim();
    const key = detailKey(text);
    if (text && !values[key]) values[key] = text;
  });
  const [lat, lng] = (hasExtras ? cells[3]?.textContent || '' : '').split(',');
  const city = createCity({
    name: cells[0]?.textContent.trim() || '',
    region: hasExtras ? cells[1]?.textContent.trim() || '' : '',
    position: toPosition(lat, lng),
    details: CITY_CONFIG.details.map(({ key, label, icon }) => ({
      key, label, icon, value: values[key] || '',
    })),
  });
  city.row = row;
  return city;
}

function phoneMarkup(value) {
  const fragment = document.createDocumentFragment();
  value.split('/').map((p) => p.trim()).filter(Boolean).forEach((part, i) => {
    if (i) fragment.append(' / ');
    const tollFree = part.match(/^(toll[- ]free:?)\s*(.+)$/i);
    const number = tollFree ? tollFree[2] : part;
    const link = document.createElement('a');
    link.href = `tel:${number.replace(/[^0-9+]/g, '')}`;
    link.textContent = number;
    if (tollFree) {
      const span = document.createElement('span');
      span.className = 'branch-locator-tollfree';
      span.append(`${tollFree[1]} `, link);
      fragment.append(span);
    } else {
      fragment.append(link);
    }
  });
  return fragment;
}

/** a detail's value: phone and mail links, web links, or plain text */
function detailMarkup({ key, value }) {
  if (key === 'phone') return phoneMarkup(value);
  const email = /^mailto:/i.test(value) || (key === 'email' && value.includes('@'));
  if (email || /^https?:\/\//i.test(value)) {
    const a = document.createElement('a');
    const address = value.replace(/^mailto:/i, '');
    a.href = email ? `mailto:${address}` : value;
    a.textContent = address;
    return a;
  }
  return document.createTextNode(value);
}

/**
 * The browser's location permission for this site, read without prompting:
 * "granted", "denied" or "prompt" (also when the browser cannot tell).
 */
async function locationPermission() {
  try {
    const { state } = await navigator.permissions.query({ name: 'geolocation' });
    return state;
  } catch (e) {
    return 'prompt';
  }
}

// the dialog waits for the page to load: it must not compete with LCP
function afterPageLoad(callback) {
  if (document.readyState === 'complete') callback();
  else window.addEventListener('load', callback, { once: true });
}

/**
 * Our own location prompt (the browser's permission prompt only follows "Turn on location").
 * @param {Function} locate finds and shows the visitor's city; the dialog shows a
 *   loading state until it is done
 */
async function askConsent(locate) {
  const { createModal } = await import('../modal/modal.js');
  const panel = document.createElement('div');
  panel.className = 'branch-locator-permission';
  panel.innerHTML = `
    <img src="${window.hlx.codeBasePath}/icons/location-radar.svg" alt="" width="140" height="140">
    <h2>Find the nearest Kotak Prime branch</h2>
    <p class="branch-locator-hint"><img src="${window.hlx.codeBasePath}/icons/location-arrow.svg" alt="" width="24" height="24"><span>Tap Turn on location, then choose "Allow" when your browser asks.</span></p>
    <div class="branch-locator-permission-actions">
      <button type="button" class="button primary">Turn on location</button>
      <button type="button" class="branch-locator-skip">Continue without location</button>
    </div>`;
  const { dialog, showModal, close } = await createModal([panel], {
    className: 'modal-compact',
    label: 'Find the nearest Kotak Prime branch',
  });
  const [allow, skip] = panel.querySelectorAll('button');
  let agreed = false;

  // "Continue without location", the close button, Esc and a click outside all mean "no"
  dialog.addEventListener('close', () => {
    if (!agreed) saveChoice({ consent: 'no' });
  });
  skip.addEventListener('click', close);
  allow.addEventListener('click', async () => {
    agreed = true;
    allow.classList.add('is-loading');
    allow.disabled = true;
    allow.setAttribute('aria-busy', 'true');
    skip.disabled = true;
    await locate();
    close();
  });
  showModal();
}

/**
 * Branch locator: searchable city list, map and branch contact details.
 * Optional first single-cell row: intro (heading, description).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const introRow = rows.find((row) => row.children.length === 1);
  const authored = rows.filter((row) => row !== introRow).map(parseBranch)
    .filter((city) => city.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  // no location prompt while authoring in the Universal Editor
  const inEditor = block.hasAttribute('data-aue-resource');

  const content = [];
  if (introRow?.textContent.trim()) {
    const intro = introRow.firstElementChild;
    intro.className = 'branch-locator-intro';
    moveInstrumentation(introRow, intro);
    content.push(intro);
  }

  const status = document.createElement('p');
  status.className = 'branch-locator-status';
  status.setAttribute('role', 'status');

  const map = document.createElement('div');
  map.className = 'branch-locator-map';

  const card = document.createElement('dl');
  card.className = 'branch-locator-card';
  card.setAttribute('aria-live', 'polite');

  const left = document.createElement('div');
  left.className = 'branch-locator-left';
  left.append(status, map);

  const main = document.createElement('div');
  main.className = 'branch-locator-main';
  // busy until the cities are loaded, and while the visitor's city is worked out
  main.setAttribute('aria-busy', 'true');
  main.append(left, card);

  content.push(main);
  block.replaceChildren(...content);

  let cities = [];
  let picker;

  const setStatus = (text, loading = false) => {
    status.textContent = text;
    status.classList.toggle('is-loading', loading);
  };

  let mapTimer;
  const loadMap = (city) => {
    clearTimeout(mapTimer);
    // load the embed after the page has settled; it is not needed for LCP
    mapTimer = setTimeout(() => {
      const iframe = document.createElement('iframe');
      iframe.title = `Map: Kotak Mahindra Prime, ${city.name}`;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      const address = city.details.find((d) => d.key === 'address')?.value;
      // coordinates pin the branch exactly; the address is a fallback for rows without them
      const q = city.position
        ? `${city.position.lat},${city.position.lng}`
        : encodeURIComponent(`Kotak Mahindra Prime ${address || `${city.name} ${city.region}`}`);
      iframe.src = `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
      map.replaceChildren(iframe);
    }, map.childElementCount ? 0 : 2500);
  };

  /** renders the city's details in the card and the map, then tells the page */
  const show = (city) => {
    card.replaceChildren();
    // the card stands for the shown branch in the Universal Editor (authored rows only)
    const isAue = (attr) => attr.name.startsWith('data-aue-') || attr.name.startsWith('data-richtext-');
    [...card.attributes].filter(isAue).forEach((attr) => card.removeAttribute(attr.name));
    [...(city.row?.attributes || [])].filter(isAue)
      .forEach((attr) => card.setAttribute(attr.name, attr.value));
    city.details.forEach((detail) => {
      const row = document.createElement('div');
      row.className = 'branch-locator-row';
      row.innerHTML = '<span class="branch-locator-icon" aria-hidden="true"></span><dt></dt><dd></dd>';
      row.firstElementChild.classList.add(`icon-${detail.icon}`);
      row.querySelector('dt').textContent = detail.label;
      row.querySelector('dd').append(detailMarkup(detail));
      card.append(row);
    });
    loadMap(city);
    document.dispatchEvent(new CustomEvent('city-change', { detail: { city } }));
  };

  const remember = (city) => saveChoice({ city: city.name, cityKey: city.key });

  const renderPicker = () => {
    const next = createDropdown({
      label: 'Select City',
      name: 'city',
      options: cities.map(({
        key, name, region, note,
      }) => ({ value: key, label: name, description: region || note })),
      search: cities.length > 6,
      searchPlaceholder: 'Search city',
    });
    next.classList.add('branch-locator-select');
    next.addEventListener('change', (e) => {
      const city = cities.find((c) => c.key === next.value);
      if (!city) return;
      show(city);
      // a city picked by the visitor is remembered for the next visit
      if (e.detail?.byUser) {
        remember(city);
        setStatus('');
      }
    });
    if (picker) picker.replaceWith(next);
    else left.prepend(next);
    picker = next;
  };

  /** selects the city nearest to the visitor, else the first city; never rejects */
  const locate = async () => {
    main.setAttribute('aria-busy', 'true');
    setStatus(MESSAGES.locating, true);
    try {
      const position = await getPosition();
      saveChoice({ consent: 'yes' });
      const nearest = nearestCity(cities, position);
      if (nearest) {
        picker.setValue(nearest.city.key);
        remember(nearest.city);
        setStatus(MESSAGES.nearest(nearest.city.name));
      } else {
        const first = firstCity(cities);
        picker.setValue(first.key);
        setStatus(MESSAGES.noMatch(first.name));
      }
    } catch (error) {
      // GeolocationPositionError 1 = permission denied: do not ask the browser again
      if (error?.code === 1) saveChoice({ consent: 'no' });
      setStatus(MESSAGES.failed);
      // eslint-disable-next-line no-console
      console.warn('branch-locator: location lookup failed', error);
    } finally {
      main.removeAttribute('aria-busy');
    }
  };

  // an empty dropdown keeps the layout in place while the cities load
  renderPicker();

  (async () => {
    const master = await loadCityMaster();
    cities = master.length ? master : authored;
    renderPicker();
    main.removeAttribute('aria-busy');
    if (!cities.length) {
      setStatus(MESSAGES.empty);
      return;
    }

    const saved = getSavedChoice();
    const remembered = cities.find((city) => city.key === saved.cityKey)
      || (saved.city && findCity(cities, [saved.city]));
    // the first city of the sheet, until the visitor's city is known
    picker.setValue((remembered || firstCity(cities)).key);

    if (remembered || saved.consent === 'no' || inEditor) return;
    const permission = await locationPermission();
    // location blocked in the browser: asking would lead nowhere, keep the first city
    if (permission === 'denied') return;
    // already allowed: the browser will not prompt, so neither do we
    if (permission === 'granted' || saved.consent === 'yes') locate();
    else afterPageLoad(() => askConsent(locate));
  })();
}
