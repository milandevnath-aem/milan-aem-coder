import { moveInstrumentation } from '../../scripts/scripts.js';
import { createDropdown } from '../../scripts/dropdown.js';

const DETAILS = [
  { key: 'address', label: 'Address', icon: 'location' },
  { key: 'phone', label: 'Phone', icon: 'call' },
  { key: 'timing', label: 'Branch Timing', icon: 'clock' },
  { key: 'email', label: 'Write to us on', icon: 'mail' },
];

/**
 * Branch row: city, details (address, phone, timing, email paragraphs), or
 * city, region, details, coordinates.
 */
function parseBranch(row, index) {
  const cells = [...row.children];
  const [cityCell] = cells;
  const hasExtras = cells.length > 2;
  const regionCell = hasExtras ? cells[1] : null;
  const detailsCell = hasExtras ? cells[2] : cells[1];
  const [lat, lng] = (hasExtras ? cells[3]?.textContent || '' : '').split(',').map((n) => parseFloat(n));
  const parts = [...(detailsCell?.querySelectorAll('p') || [])].map((p) => p.textContent.trim());
  const branch = {
    row,
    value: String(index),
    city: cityCell?.textContent.trim() || '',
    region: regionCell?.textContent.trim() || '',
    coords: Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null,
  };
  DETAILS.forEach(({ key }, i) => { branch[key] = parts[i] || ''; });
  return branch;
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

// great-circle distance in km
function distance([lat1, lng1], [lat2, lng2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/**
 * Asks for the visitor's position (custom prompt first, then the browser's).
 * @returns {Promise<GeolocationPosition|null>}
 */
async function askLocation() {
  const { createModal } = await import('../modal/modal.js');
  const panel = document.createElement('div');
  panel.className = 'branch-locator-permission';
  panel.innerHTML = `
    <img src="${window.hlx.codeBasePath}/icons/location-radar.svg" alt="" width="140" height="140">
    <h2>Find the nearest Kotak Prime branch</h2>
    <p class="branch-locator-hint"><img src="${window.hlx.codeBasePath}/icons/location-arrow.svg" alt="" width="24" height="24"><span>Tap Turn on location, then choose "Allow" when your browser asks.</span></p>
    <p class="branch-locator-permission-error" role="alert" hidden></p>
    <div class="branch-locator-permission-actions">
      <button type="button" class="button primary">Turn on location</button>
      <button type="button" class="branch-locator-skip">Continue without location</button>
    </div>`;
  const { dialog, showModal, close } = await createModal([panel], {
    className: 'modal-compact',
    label: 'Find the nearest Kotak Prime branch',
  });
  return new Promise((resolve) => {
    let position = null;
    dialog.addEventListener('close', () => resolve(position));
    const [allow, skip] = panel.querySelectorAll('button');
    const error = panel.querySelector('.branch-locator-permission-error');
    skip.addEventListener('click', close);
    allow.addEventListener('click', () => {
      if (!navigator.geolocation) {
        error.textContent = 'Location is not available in this browser. Please select your city.';
        error.hidden = false;
        return;
      }
      allow.classList.add('is-loading');
      allow.disabled = true;
      allow.setAttribute('aria-busy', 'true');
      navigator.geolocation.getCurrentPosition((pos) => {
        position = pos;
        close();
      }, () => {
        allow.classList.remove('is-loading');
        allow.disabled = false;
        allow.removeAttribute('aria-busy');
        error.textContent = 'We could not get your location. Please allow location access or select your city.';
        error.hidden = false;
      }, { timeout: 10000, maximumAge: 600000 });
    });
    showModal();
  });
}

/**
 * Branch locator: searchable city list, map and branch contact details.
 * Optional first single-cell row: intro (heading, description).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const introRow = rows.find((row) => row.children.length === 1);
  const branches = rows.filter((row) => row !== introRow).map(parseBranch);

  const content = [];
  if (introRow?.textContent.trim()) {
    const intro = introRow.firstElementChild;
    intro.className = 'branch-locator-intro';
    moveInstrumentation(introRow, intro);
    content.push(intro);
  }

  const picker = createDropdown({
    label: 'Select City',
    name: 'city',
    options: branches.map((b) => ({ value: b.value, label: b.city, description: b.region })),
    value: branches[0]?.value,
    search: branches.length > 6,
    searchPlaceholder: 'Search city',
  });
  picker.classList.add('branch-locator-select');

  const map = document.createElement('div');
  map.className = 'branch-locator-map';

  const card = document.createElement('dl');
  card.className = 'branch-locator-card';
  card.setAttribute('aria-live', 'polite');

  let mapTimer;
  const loadMap = (branch) => {
    clearTimeout(mapTimer);
    // load the embed after the page has settled; it is not needed for LCP
    mapTimer = setTimeout(() => {
      const iframe = document.createElement('iframe');
      iframe.title = `Map: Kotak Mahindra Prime, ${branch.city}`;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      const query = branch.address || `${branch.city} ${branch.region}`;
      const q = encodeURIComponent(`Kotak Mahindra Prime ${query}`);
      iframe.src = `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
      map.replaceChildren(iframe);
    }, map.childElementCount ? 0 : 2500);
  };

  const show = (index) => {
    const branch = branches[index];
    if (!branch) return;
    card.replaceChildren();
    // the card stands for the shown branch in the Universal Editor
    const isAue = (attr) => attr.name.startsWith('data-aue-') || attr.name.startsWith('data-richtext-');
    [...card.attributes].filter(isAue).forEach((attr) => card.removeAttribute(attr.name));
    [...branch.row.attributes].filter(isAue)
      .forEach((attr) => card.setAttribute(attr.name, attr.value));
    DETAILS.forEach(({ key, label, icon }) => {
      if (!branch[key]) return;
      const row = document.createElement('div');
      row.className = 'branch-locator-row';
      row.innerHTML = `<span class="branch-locator-icon icon-${icon}" aria-hidden="true"></span><dt></dt><dd></dd>`;
      row.querySelector('dt').textContent = label;
      const dd = row.querySelector('dd');
      if (key === 'phone') dd.append(phoneMarkup(branch.phone));
      else if (key === 'email') {
        const a = document.createElement('a');
        const email = branch.email.replace(/^mailto:/i, '');
        a.href = `mailto:${email}`;
        a.textContent = email;
        dd.append(a);
      } else dd.textContent = branch[key];
      card.append(row);
    });
    loadMap(branch);
  };

  picker.addEventListener('change', () => show(Number(picker.value)));

  const left = document.createElement('div');
  left.className = 'branch-locator-left';
  left.append(picker);

  // nearest branch from the visitor's location
  const located = branches.filter((b) => b.coords);
  if (located.length) {
    const locate = document.createElement('button');
    locate.type = 'button';
    locate.className = 'branch-locator-locate';
    locate.innerHTML = `<img src="${window.hlx.codeBasePath}/icons/location.svg" alt="" width="20" height="20"><span>Use my current location</span>`;
    const status = document.createElement('p');
    status.className = 'branch-locator-status';
    status.setAttribute('role', 'status');
    locate.addEventListener('click', async () => {
      const position = await askLocation();
      if (!position) return;
      const here = [position.coords.latitude, position.coords.longitude];
      const nearest = located.reduce((best, b) => (
        distance(here, b.coords) < distance(here, best.coords) ? b : best));
      picker.setValue(nearest.value);
      status.textContent = `Showing the branch nearest to you: ${nearest.city}`;
    });
    left.append(locate, status);
  }
  left.append(map);

  const locator = document.createElement('div');
  locator.className = 'branch-locator-main';
  locator.append(left, card);
  content.push(locator);

  block.replaceChildren(...content);
  show(0);
}
