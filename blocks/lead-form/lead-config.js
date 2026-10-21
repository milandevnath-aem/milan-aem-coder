/*
  Lead form settings shared by every product form (loan against property, new car loan,
  two-wheeler, ...). The identifier of the selected loan category is sent to the verify
  service as lead.product, so one pair of endpoints serves all forms.

  - GENERATE_OTP_URL / VERIFY_OTP_URL: the OTP services (fill in per environment).
    While one is empty the forms stay in demo mode (see lead-api.js).
  - toLead: maps the form values (keys are the slugged field labels) and the selected
    category to the "lead" object the verify service expects.
*/

export const GENERATE_OTP_URL = '';
export const VERIFY_OTP_URL = '';

const pick = (data, pattern) => {
  const key = Object.keys(data).find((k) => pattern.test(k));
  return key ? String(data[key] ?? '').trim() : '';
};

/**
 * @param {Object<string, string>} data form values
 * @param {string} category the selected loan category
 */
export function toLead(data, category) {
  return {
    FirstName: pick(data, /first-?name/),
    LastName: pick(data, /last-?name/),
    Email: pick(data, /e-?mail/),
    Location: pick(data, /location|city/),
    product: String(category || '').trim(),
  };
}
