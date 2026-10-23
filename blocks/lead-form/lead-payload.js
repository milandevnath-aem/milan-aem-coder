/*
  Form -> `lead` object of the validate OTP request.

  Every named field of the form is sent (except EXCLUDED_FIELDS), so a field added to a form
  later is sent without a code change. Keys come from LEAD_FIELD_KEYS, else the field name in
  PascalCase. The name always arrives as FirstName + LastName, whether the form asks for
  "First name" and "Last name" or one "Your name".
*/
import {
  EXCLUDED_FIELDS,
  LEAD_FIELD_KEYS,
  PRODUCT_BY_CATEGORY,
} from './lead-api-config.js';

/** "Two-Wheeler Loans", "two wheeler loan" -> "twowheelerloan" */
const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/loans$/, 'loan');

/** The PRODUCT_BY_CATEGORY entry of a loan category, {} when it has none. */
function entryFor(category) {
  const wanted = normalize(category);
  if (!wanted) return {};
  const label = Object.keys(PRODUCT_BY_CATEGORY).find((l) => normalize(l) === wanted);
  return label ? PRODUCT_BY_CATEGORY[label] : {};
}

/**
 * The lead fields of a loan category (PRODUCT_BY_CATEGORY, without its city list key).
 * @param {string} category e.g. "New Car Finance"
 * @returns {Object<string, string>} e.g. { product: "NewCarFinance", Product__c: "New CAR" };
 *   {} when the category has no API yet (Car Lease, Dealer Finance)
 */
export function categoryFields(category) {
  const { cities, ...fields } = entryFor(category);
  return fields;
}

/**
 * The backend product of a loan category.
 * @param {string} category e.g. "Loan Against Property"
 * @returns {string} e.g. "LAP"; '' when the category has no API yet (Car Lease, Dealer Finance)
 */
export function productFor(category) {
  return categoryFields(category).product || '';
}

/**
 * Whether the form of a loan category can't be submitted: it has no API yet.
 * @param {string} category e.g. "Car Lease"
 * @returns {boolean}
 */
export function isSubmitDisabled(category) {
  return Boolean(normalize(category)) && !productFor(category);
}

/**
 * The placeholder key of the city list of a loan category: `cities` of its
 * PRODUCT_BY_CATEGORY entry, else the category's own name in camelCase
 * ("Home Loan" -> "homeLoan", as fetchPlaceholders names "home-loan").
 * @param {string} category e.g. "Two-Wheeler Loan"
 * @returns {string} e.g. "tw"; '' for no category or one without an API (no cities fetched)
 */
export function cityKeyFor(category) {
  if (!normalize(category) || isSubmitDisabled(category)) return '';
  const { cities } = entryFor(category);
  if (cities) return cities;
  return String(category).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    .map((word, i) => (i ? word[0].toUpperCase() + word.slice(1) : word))
    .join('');
}

/**
 * API key of a form field: "email" -> "Email" (LEAD_FIELD_KEYS),
 * "zip-postal-code" -> "ZipPostalCode".
 * @param {string} name form field name
 * @returns {string}
 */
export function leadKey(name) {
  return LEAD_FIELD_KEYS[name]
    || name.split('-').filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join('');
}

/**
 * "Asha Rao Kulkarni" -> { FirstName: "Asha", LastName: "Rao Kulkarni" }.
 * A one-word name has an empty LastName.
 * @param {string} fullName
 * @returns {{ FirstName: string, LastName: string }}
 */
export function splitName(fullName) {
  const [first = '', ...rest] = String(fullName || '').trim().split(/\s+/);
  return { FirstName: first, LastName: rest.join(' ') };
}

/**
 * The lead of a filled-in form.
 * Name fields are recognised by their autocomplete value, set from the label in lead-form.js:
 * "First name" = given-name, "Last name" = family-name, "Your name" = name. An "Account name"
 * is a company (organization), so it is sent as a field of its own.
 * @param {HTMLFormElement} form
 * @param {string} category the picked loan category, adds its fields (see categoryFields)
 * @returns {Object<string, string>} e.g. { FirstName, LastName, Email, Location, ...,
 *   product: "NewCarFinance", Product__c: "New CAR" }
 */
export function buildLead(form, category) {
  const fields = {};
  const name = { given: '', family: '', full: '' };
  [...form.elements].forEach((el) => {
    if (!el.name || el.disabled || EXCLUDED_FIELDS.includes(el.name)) return;
    if (['submit', 'button', 'reset', 'file'].includes(el.type)) return;
    if (['checkbox', 'radio'].includes(el.type) && !el.checked) return;
    const value = String(el.value || '').trim();
    if (el.autocomplete === 'given-name') name.given = value;
    else if (el.autocomplete === 'family-name') name.family = value;
    else if (el.autocomplete === 'name') name.full = value;
    else fields[leadKey(el.name)] = value;
  });
  const names = name.given || name.family
    ? { FirstName: name.given, LastName: name.family }
    : splitName(name.full);
  // the category's fields (product, Product__c) last, so no form field can override them
  return { ...fields, ...names, ...categoryFields(category) };
}
