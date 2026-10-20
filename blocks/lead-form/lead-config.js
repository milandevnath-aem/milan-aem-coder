/*
  Lead services, one per product. A form picks its service from its loan category
  (the category field, else the page's category). To add a product, add an entry here.

  - match: tested against the category text
  - generateOtpUrl / verifyOtpUrl: the product's OTP endpoints (fill in per environment).
    While one is empty the form stays in demo mode (see lead-api.js).
  - toLead: maps the form values (keys are the slugged field labels) to the "lead" object
    the verify service expects.
*/

const pick = (data, pattern) => {
  const key = Object.keys(data).find((k) => pattern.test(k));
  return key ? String(data[key] ?? '').trim() : '';
};

export default [
  {
    id: 'loan-against-property',
    match: /property|lap/i,
    generateOtpUrl: '',
    verifyOtpUrl: '',
    toLead: (data) => ({
      FirstName: pick(data, /first-?name/),
      LastName: pick(data, /last-?name/),
      Email: pick(data, /e-?mail/),
      Location: pick(data, /location|city/),
    }),
  },
];
