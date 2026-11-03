/*
  Analytics: Google Tag Manager and the dataLayer events of the lead journey (RYVR tracking
  guide). GA4, Google Ads, Meta and Bing are managed inside the GTM container: never add their
  tags to the site directly.

  Events (field names are fixed, the GTM setup relies on them):
  - form_start        { form_name, product_type }               first typing in a form
  - lead_form_submit  { form_name, product_type, city }         form sent, OTP sent
  - generate_lead     { form_name, product_type, city, lead_id } OTP accepted, lead created
  - calculator_use    { calculator, loan_amount_band, tenure_months }  once per calculator
  - contact_click     { method: call | whatsapp | email }       tel:, WhatsApp and mailto: links

  Values come from the page: form and calculator names from the authored content (see
  analyticsName), the city, lead id and amounts from the visitor's journey.
  Never push personal data (name, mobile number, email, PAN, OTP).

  Error handling: tracking must never break the page, a form or the calculator. Every
  function here catches its own errors (see safely): a failure is logged as a console warning
  ("analytics: ...") and the visitor's journey goes on. GTM blocked or failing to load (ad
  blockers, network) is logged the same way; events keep queueing in the dataLayer.
*/

export const GTM_ID = 'GTM-P3Q4R2XM';

/** Events sent at most once per page view (see pushOnce). */
const sent = new Set();

/**
 * Runs analytics code without letting an error reach the caller.
 * @param {Function} fn the tracking work
 * @param {*} [fallback] returned when fn throws
 * @returns {*} what fn returns, else fallback
 */
export function safely(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('analytics: tracking failed', error);
    return fallback;
  }
}

/**
 * Pushes an event to the dataLayer. Events pushed before GTM is loaded are processed once
 * it is.
 * @param {string} event
 * @param {Object} [params]
 */
export function pushEvent(event, params = {}) {
  safely(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
  });
}

/**
 * Name for an analytics value from authored text: "Car Loan" -> "car_loan",
 * "Start Your Loan Journey Today" -> "start_your_loan_journey_today".
 * @param {string} text
 * @returns {string} '' when the text has no letters or digits
 */
export function analyticsName(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Pushes an event only the first time `key` is seen on this page view.
 * @param {string} key e.g. "form_start:two_wheeler_form"
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
  safely(() => {
    // Universal Editor (AEM author): no tracking of authors
    if (window.location.hostname.endsWith('adobeaemcloud.com')) return;
    if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`)) return;
    pushEvent('gtm.js', { 'gtm.start': new Date().getTime() });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    const nonce = document.querySelector('script[nonce]')?.nonce;
    if (nonce) script.nonce = nonce;
    // blocked (ad blocker, CSP) or offline: the site works on, only the tags do not run
    script.addEventListener('error', () => {
      // eslint-disable-next-line no-console
      console.warn(`analytics: GTM (${GTM_ID}) could not be loaded`);
    });
    document.head.append(script);
  });
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

/** loan amount bands per calculator: its authored range split in this many equal parts */
const BAND_PARTS = 5;

/** 500000 -> "5L", 2080000 -> "20.8L", 10000000 -> "1Cr", 50000 -> "50K", 500 -> "500" */
function shortAmount(value) {
  const round = (n) => Math.round(n * 10) / 10;
  if (value >= 10000000) return `${round(value / 10000000)}Cr`;
  if (value >= 100000) return `${round(value / 100000)}L`;
  if (value >= 1000) return `${round(value / 1000)}K`;
  return `${Math.round(value)}`;
}

/**
 * Loan amount band within the calculator's own range: the authored minimum to maximum split
 * in BAND_PARTS equal parts, the edges on the slider's steps.
 * @param {number} amount in rupees
 * @param {{ min: number, max: number, step?: number }} range the calculator's amount slider
 * @returns {string|undefined} e.g. "1L-20.8L" for 5L on a 1L-1Cr calculator; the amount alone
 *   when the range has no width; undefined when the amount is not a number
 */
export function amountBand(amount, { min, max, step } = {}) {
  if (!Number.isFinite(amount)) return undefined;
  if (!(Number.isFinite(min) && Number.isFinite(max) && max > min)) return shortAmount(amount);
  const unit = step > 0 ? step : 1;
  const size = (max - min) / BAND_PARTS;
  const part = Math.min(BAND_PARTS - 1, Math.max(0, Math.floor((amount - min) / size)));
  const edge = (i) => (i === BAND_PARTS ? max : min + Math.round((i * size) / unit) * unit);
  return `${shortAmount(edge(part))}-${shortAmount(edge(part + 1))}`;
}

/**
 * Fires form_start the first time the visitor types or picks something in the form (once per
 * form name per page view; values filled in by the code do not count).
 * @param {HTMLFormElement} form
 * @param {Function} formName returns the form's name (see analyticsName), read when the
 *   visitor starts, as a modal form only knows its page once it is open
 * @param {Function} category returns the loan category picked at that moment
 */
export function trackFormStart(form, formName, category) {
  const start = (e) => {
    if (!e.isTrusted) return;
    form.removeEventListener('input', start);
    form.removeEventListener('change', start);
    safely(() => {
      const name = formName();
      pushOnce(`form_start:${name}`, 'form_start', {
        form_name: name, product_type: productType(category()),
      });
    });
  };
  form.addEventListener('input', start);
  form.addEventListener('change', start);
}

/**
 * An id that no other element of the page has yet: `base`, else `base-2`, `base-3`...
 * Gives the main buttons stable ids for tag triggers.
 * @param {string} base e.g. "lead-form-submit"
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
  document.addEventListener('click', (e) => safely(() => {
    const link = e.target.closest?.('a[href]');
    const method = link && contactMethod(link.getAttribute('href').trim());
    if (method) pushEvent('contact_click', { method });
  }));
}
