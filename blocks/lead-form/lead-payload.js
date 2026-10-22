/*
  Form -> `lead` object of the validate OTP request.

  Every named field of the form is sent (except EXCLUDED_FIELDS), so a field added to a form
  later is sent without a code change. Keys come from LEAD_FIELD_KEYS, else the field name in
  PascalCase. The name always arrives as FirstName + LastName, whether the form asks for
  "First name" and "Last name" or one "Your name".
*/
import { EXCLUDED_FIELDS, LEAD_FIELD_KEYS, PRODUCT_BY_CATEGORY } from './lead-api-config.js';

/** "Two-Wheeler Loans", "two wheeler loan" -> "twowheelerloan" */
const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/loans$/, 'loan');

/**
 * The backend product of a loan category.
 * @param {string} category e.g. "Loan Against Property"
 * @returns {string} e.g. "LAP"; '' when the category has no API yet (Car Lease, Dealer Finance)
 */
export function productFor(category) {
  const wanted = normalize(category);
  if (!wanted) return '';
  const label = Object.keys(PRODUCT_BY_CATEGORY).find((l) => normalize(l) === wanted);
  return label ? PRODUCT_BY_CATEGORY[label] : '';
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
 * @param {string} product backend product, see productFor
 * @returns {Object<string, string>} e.g. { FirstName, LastName, Email, Location, ..., product }
 */
export function buildLead(form, product) {
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
  // product last, so no form field can override it
  return { ...fields, ...names, product };
}
