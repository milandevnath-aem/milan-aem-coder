/*
  Form -> `lead` object of the validate OTP request.

  Every named field of the form is read (except EXCLUDED_FIELDS). Keys come from
  LEAD_FIELD_KEYS, else the field name in PascalCase. The name is read as FirstName + LastName
  (and Name, the full name), whether the form asks for "First name" and "Last name" or one
  "Your name". The lead then keeps only the fields the category's API takes, under that API's
  keys (LEAD_KEYS_BY_PRODUCT in lead-api-config.js, see api.md).
*/
import {
  EXCLUDED_FIELDS, LEAD_FIELD_KEYS, LEAD_KEYS_BY_PRODUCT, PRODUCT_BY_CATEGORY,
} from './lead-api-config.js';

/** "Two-Wheeler Loans", "two wheeler loan" -> "twowheelerloan" */
const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/loans$/, 'loan');

/**
 * The lead fields of a loan category (PRODUCT_BY_CATEGORY).
 * @param {string} category e.g. "New Car Finance"
 * @returns {Object<string, string>} e.g. { product: "NewCarFinance", Product: "New CAR" };
 *   {} when the category has no API yet (Car Lease, Dealer Finance)
 */
export function categoryFields(category) {
  const wanted = normalize(category);
  if (!wanted) return {};
  const label = Object.keys(PRODUCT_BY_CATEGORY).find((l) => normalize(l) === wanted);
  return label ? PRODUCT_BY_CATEGORY[label] : {};
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
 * Only the fields the category's API takes are kept, under its keys (LEAD_KEYS_BY_PRODUCT).
 * @param {HTMLFormElement} form
 * @param {string} category the picked loan category, adds its fields (see categoryFields)
 *   except `product`, which is sent next to the lead as its `category` (see lead-api.js)
 * @returns {Object<string, string>} e.g. New Car Finance: { FirstName, LastName, Location,
 *   Pincode, Email, Product: "New CAR" }; TWL: { firstName, lastName, businessLocation };
 *   LAP: { Name, Email, City }
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
  const all = { ...fields, ...names, Name: [names.FirstName, names.LastName].filter(Boolean).join(' ') };
  // the category's fields (Product) last, so no form field can override them
  const { product, ...extra } = categoryFields(category);
  const keys = LEAD_KEYS_BY_PRODUCT[product];
  if (!keys) return { ...all, ...extra };
  const lead = {};
  Object.entries(keys).forEach(([from, to]) => {
    // a blank field is left out (the API treats it as missing either way)
    if (all[from]) lead[to] = all[from];
  });
  return { ...lead, ...extra };
}
