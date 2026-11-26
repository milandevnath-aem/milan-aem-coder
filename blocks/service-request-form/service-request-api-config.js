/*
  Service Request form settings: the only file to edit when its endpoints, sheet, payload keys
  or messages change. The requests are in service-request-api.js; the form is
  service-request-form.js. The lead form (LAP, NCF, TWL...) has its own settings in
  ../lead-form/lead-api-config.js: nothing here is shared with it except the captcha APIs.

  Everything here ships to the browser: never put API keys, secrets or passwords in this file.
*/

/**
 * Path of each API, on the site's own domain (root-relative, like the lead form's APIs).
 *
 * TODO: the Service Request APIs are not available yet. While an endpoint is '' the form
 * skips that call (a console warning says so) so the journey can be tested end to end:
 * - verifyLoan '' -> every loan account number is accepted
 * - submit '' -> every request shows the success popup, nothing is sent
 * Fill in both paths before go-live.
 */
export const ENDPOINTS = {
  /**
   * { data: verifyPayload(...) } -> { status: 'success', data: { valid: true|false, partyId } }
   * The Party ID of the account fills the form's Party ID field (see PARTY_ID_KEYS).
   */
  verifyLoan: '', // e.g. '/content/kotakmahindraprime-aem/in/en.service-request-verify.json'
  /** { data: submitPayload(...) } -> { status: 'success', data: { ... } } */
  submit: '', // e.g. '/content/kotakmahindraprime-aem/in/en.service-request-submit.json'
};

/**
 * The client's sheet (one sheet, columns as shared):
 * Product | Sr No | Subject | Sub-Subject | City
 * Product and City are lists of their own; Subject is written on the first row of each group
 * only (the rows below it with an empty Subject are its other Sub-Subjects).
 * Authors can point the block to another sheet ("Data sheet").
 */
export const SHEET = '/service-request.json';

/** Column names of the sheet (as written in its header row). */
export const COLUMNS = {
  product: 'Product',
  subject: 'Subject',
  subType: 'Sub-Subject',
  city: 'City',
};

/**
 * Subjects whose requests are done online: Submit calls no API and shows the "Complete Your
 * Request Online" popup (Login). Used when the block's "Subjects that open the Login popup"
 * is left empty. Matched without case or extra spaces, for all their Sub-Subjects.
 */
export const SELF_SERVICE_SUBJECTS = [
  'Change of Address',
  'Contact Number Updation',
  'Email Id Updation',
  'Repayment Schedule',
  'Statements',
];

/** Longest loan account number accepted (letters and digits). */
export const LOAN_ACCOUNT_MAX = 20;

/**
 * Body of the loan account check. TODO: confirm the keys with the API team.
 * @param {{ loanAccount: string, product: string }} values
 */
export const verifyPayload = ({ loanAccount, product }) => ({
  loanAccountNumber: loanAccount,
  product,
});

/**
 * Where the Party ID is in the loan account check's answer (`data`), first match wins.
 * TODO: confirm the key with the API team.
 */
export const PARTY_ID_KEYS = ['partyId', 'PartyId', 'partyID', 'party_id', 'PARTY_ID'];

/**
 * Body of the service request. TODO: confirm the keys with the API team.
 * @param {Object} values the form's values by role (see service-request-form.js valuesOf)
 */
export const submitPayload = ({
  partyId, product, loanAccount, subject, subType, city, description, extra,
}) => ({
  partyId,
  product,
  loanAccountNumber: loanAccount,
  subject,
  subType,
  city,
  description,
  // any other authored field, keyed by its label ("alternate-number")
  ...extra,
});

/** Texts of the form (authored messages, when given, win over these). */
export const MESSAGES = {
  verifyNeeded: 'Please verify the loan account number to proceed!',
  loanInvalid: 'Loan account number is invalid',
  submitFailed: 'We couldn’t submit your request. Please try again.',
  timeout: 'This is taking longer than usual. Please try again.',
  network: 'Check your internet connection and try again.',
  loginHeading: 'Complete Your Request Online',
  loginText: 'This request can be completed instantly through your Customer Portal. Please log in to update your details or download the required documents',
  loginLabel: 'Login',
  successHeading: 'Request submitted',
  successText: 'Thank you! Your service request has been submitted. Our team will get back to you shortly.',
  successLabel: 'Got it',
};
