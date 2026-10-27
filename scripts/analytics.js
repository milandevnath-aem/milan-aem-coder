/*
  Analytics (RYVR): dataLayer events for GTM-P3Q4R2XM. Field names are fixed by the tracking guide.
  Never pass personal data (name, mobile, email, PAN, OTP) to track().
*/

const NOT_FOUND = 'not_found';

window.dataLayer = window.dataLayer || [];

/**
 * Pushes an event to the dataLayer; GTM replays pushes made before it has loaded.
 * @param {string} event event name
 * @param {Object} [fields] event fields
 */
export function track(event, fields = {}) {
  window.dataLayer.push({ event, ...fields });
}

const fired = new Set();

/**
 * Like track(), but only the first call per key in a page view pushes.
 * @param {string} key
 * @param {string} event
 * @param {Object} [fields]
 * @returns {boolean} whether the event was pushed
 */
export function trackOnce(key, event, fields) {
  if (fired.has(key)) return false;
  fired.add(key);
  track(event, fields);
  return true;
}

// order matters: the most specific patterns first
const PRODUCT_TYPES = [
  [/against\s*(a\s*)?car/i, 'loan_against_car'],
  [/against\s*property|\blap\b/i, 'loan_against_property'],
  [/top[\s-]*up/i, 'top_up'],
  [/two[\s-]*wheeler/i, 'two_wheeler'],
  [/dealer/i, 'dealer_finance'],
  [/used|re[\s-]*finance|pre[\s-]*owned/i, 'used_car'],
  [/new\s*car|car\s*loan|car\s*finance/i, 'new_car'],
];

/**
 * Maps a loan category label to an allowed product_type value.
 * @param {string} label e.g. "Used Car & Re-finance"
 * @returns {string} product_type, or "not_found"
 */
export function productType(label) {
  const text = String(label || '');
  const match = PRODUCT_TYPES.find(([pattern]) => pattern.test(text));
  return match ? match[1] : NOT_FOUND;
}

/**
 * Value for a field that may be missing.
 * @param {string} [value]
 * @returns {string}
 */
export const orNotFound = (value) => (String(value || '').trim() || NOT_FOUND);

/**
 * Gives an element a stable id; a later element asking for the same id gets a number
 * so ids stay unique when a form is on the page and in a dialog.
 * @param {Element} el
 * @param {string} id
 */
export function setStableId(el, id) {
  let next = id;
  let count = 1;
  while (document.getElementById(next)) {
    count += 1;
    next = `${id}-${count}`;
  }
  el.id = next;
}

const CONTACT_METHODS = [
  [/^tel:/i, 'call'],
  [/^mailto:/i, 'email'],
  [/^whatsapp:|^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i, 'whatsapp'],
];

/** One delegated listener: tel:, WhatsApp and mailto: links, wherever they are rendered. */
export function trackContactClicks(doc = document) {
  doc.addEventListener('click', (e) => {
    const href = e.target.closest?.('a[href]')?.getAttribute('href') || '';
    const method = CONTACT_METHODS.find(([pattern]) => pattern.test(href))?.[1];
    if (method) track('contact_click', { method });
  }, true);
}
