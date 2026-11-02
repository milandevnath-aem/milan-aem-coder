/*
  Analytics: Google Tag Manager and the dataLayer events of the lead journey (RYVR tracking
  guide). GA4, Google Ads, Meta and Bing are managed inside the GTM container: never add their
  tags to the site directly.

  Events (field names are fixed, the GTM setup relies on them):
  - form_start        { form_name, product_type }               first typing in a form
  - lead_form_submit  { form_name, product_type, city }         form sent, OTP sent
  - generate_lead     { form_name, product_type, city, lead_id } OTP accepted, lead created
  - calculator_use    { calculator, loan_amount_band, tenure_months }  first calculation
  - contact_click     { method: call | whatsapp | email }       tel:, WhatsApp and mailto: links

  Never push personal data (name, mobile number, email, PAN, OTP).
*/

export const GTM_ID = 'GTM-P3Q4R2XM';

/** Events sent at most once per page view (see pushOnce). */
const sent = new Set();

/**
 * Pushes an event to the dataLayer. Events pushed before GTM is loaded are processed once
 * it is.
 * @param {string} event
 * @param {Object} [params]
 */
export function pushEvent(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/**
 * Pushes an event only the first time `key` is seen on this page view.
 * @param {string} key e.g. "form_start:apply_now"
 * @param {string} event
 * @param {Object} [params]
 */
export function pushOnce(key, event, params) {
  if (sent.has(key)) return;
  sent.add(key);
  pushEvent(event, params);
}

/**
 * Loads the GTM container (scripts/delayed.js). The nonce of the page's own scripts is passed
 * on, so the CSP ('strict-dynamic') lets GTM load its tags.
 */
export function loadGtm() {
  // Universal Editor (AEM author): no tracking of authors
  if (window.location.hostname.endsWith('adobeaemcloud.com')) return;
  if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`)) return;
  pushEvent('gtm.js', { 'gtm.start': new Date().getTime() });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  const nonce = document.querySelector('script[nonce]')?.nonce;
  if (nonce) script.nonce = nonce;
  document.head.append(script);
}

/** "Two-Wheeler Loans" -> "twowheelerloans" */
const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// first match wins: "Loan Against Car" and "Used Car" before any other car loan;
// Car Lease has no product type of its own
const PRODUCT_TYPES = [
  [/lease/, undefined],
  [/twowheeler|bike/, 'two_wheeler'],
  [/used|refinanc/, 'used_car'],
  [/topup/, 'top_up'],
  [/againstcar/, 'loan_against_car'],
  [/property|^lap$/, 'loan_against_property'],
  [/dealer/, 'dealer_finance'],
  [/car/, 'new_car'],
];

/**
 * The product_type of a loan category.
 * @param {string} category e.g. "Used Car & Re-finance"
 * @returns {string|undefined} e.g. "used_car"; undefined for a category with no product type
 *   (Car Lease), so no earlier value stays in the GTM data model
 */
export function productType(category) {
  const key = normalize(category);
  if (!key) return undefined;
  return PRODUCT_TYPES.find(([pattern]) => pattern.test(key))?.[1];
}

const BANDS = [[5, '0-5L'], [10, '5-10L'], [25, '10-25L'], [50, '25-50L'], [100, '50L-1Cr']];

/**
 * Loan amount band, in lakhs.
 * @param {number} amount in rupees
 * @returns {string} e.g. "5-10L"
 */
export function amountBand(amount) {
  const lakhs = amount / 100000;
  return BANDS.find(([max]) => lakhs < max)?.[1] || '1Cr+';
}

/**
 * Fires form_start the first time the visitor types or picks something in the form (once per
 * form name per page view; values filled in by the code do not count).
 * @param {HTMLFormElement} form
 * @param {string} formName e.g. "apply_now"
 * @param {Function} category returns the loan category picked at that moment
 */
export function trackFormStart(form, formName, category) {
  const start = (e) => {
    if (!e.isTrusted) return;
    form.removeEventListener('input', start);
    form.removeEventListener('change', start);
    pushOnce(`form_start:${formName}`, 'form_start', {
      form_name: formName, product_type: productType(category()),
    });
  };
  form.addEventListener('input', start);
  form.addEventListener('change', start);
}

/**
 * An id that no other element of the page has yet: `base`, else `base-2`, `base-3`...
 * Gives the main buttons stable ids for tag triggers.
 * @param {string} base e.g. "apply-now-submit"
 * @returns {string}
 */
export function uniqueId(base) {
  let id = base;
  for (let i = 2; document.getElementById(id); i += 1) id = `${base}-${i}`;
  return id;
}

/** "tel:" -> call, "mailto:" -> email, WhatsApp links -> whatsapp */
function contactMethod(href) {
  if (/^tel:/i.test(href)) return 'call';
  if (/^mailto:/i.test(href)) return 'email';
  if (/^whatsapp:|^https?:\/\/(wa\.me|(api|web|chat)\.whatsapp\.com)\//i.test(href)) return 'whatsapp';
  return '';
}

/** Fires contact_click for every click on a call, WhatsApp or email link of the page. */
export function trackContactClicks() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a[href]');
    const method = link && contactMethod(link.getAttribute('href').trim());
    if (method) pushEvent('contact_click', { method });
  });
}
