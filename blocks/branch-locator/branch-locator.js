import { moveInstrumentation } from '../../scripts/scripts.js';

const DETAILS = [
  { key: 'address', label: 'Address', icon: 'location' },
  { key: 'phone', label: 'Phone', icon: 'call' },
  { key: 'timing', label: 'Branch Timing', icon: 'clock' },
  { key: 'email', label: 'Write to us on', icon: 'mail' },
];

function parseBranch(row) {
  const [cityCell, detailsCell] = row.children;
  const parts = [...(detailsCell?.querySelectorAll('p') || [])].map((p) => p.textContent.trim());
  const branch = { row, city: cityCell?.textContent.trim() || '' };
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

/**
 * Branch locator: city dropdown, map and branch contact details.
 * Optional first single-cell row: intro (heading, description).
 * Branch rows: city, details (address, phone, timing, email paragraphs).
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

  const picker = document.createElement('label');
  picker.className = 'branch-locator-select';
  picker.innerHTML = '<span>Select City</span><select name="city"></select>';
  const select = picker.querySelector('select');
  branches.forEach((b, i) => {
    const option = new Option(b.city, String(i));
    moveInstrumentation(b.row, option);
    select.append(option);
  });

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
      iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(`Kotak Mahindra Prime ${branch.address}`)}&z=15&output=embed`;
      map.replaceChildren(iframe);
    }, map.childElementCount ? 0 : 2500);
  };

  const show = (index) => {
    const branch = branches[index];
    if (!branch) return;
    card.replaceChildren();
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

  select.addEventListener('change', () => show(Number(select.value)));

  const locator = document.createElement('div');
  locator.className = 'branch-locator-main';
  const left = document.createElement('div');
  left.className = 'branch-locator-left';
  left.append(picker, map);
  locator.append(left, card);
  content.push(locator);

  block.replaceChildren(...content);
  show(0);
}
