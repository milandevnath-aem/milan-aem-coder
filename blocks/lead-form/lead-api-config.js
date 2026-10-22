/*
  Lead API settings: the only file to edit when the endpoints, products or field names change.
  The logic lives in lead-api.js (requests) and lead-payload.js (form -> lead).

  Until both endpoints are filled in, every form runs in demo mode (OTP 123456 is accepted),
  so the journey can still be tested end to end.

  Everything here ships to the browser: never put API keys, secrets or passwords in this file.
*/

/**
 * Base URL of the lead service, without a trailing slash, e.g. 'https://api.example.com/v1'.
 * Leave empty when the endpoints are on the same domain as the site (e.g. '/api/otp/generate').
 */
export const API_BASE_URL = '';

/** Endpoint paths, appended to API_BASE_URL. Both empty = demo mode. */
export const ENDPOINTS = {
  /** POST { mobile } -> { data: { transactionId, token } } */
  generateOtp: '',
  /** POST { transactionId, otp, token, lead } -> { data: { Result, LeadNumber, Stage } } */
  validateOtp: '',
};

/** A request still pending after this long is cancelled and shown as an error. */
export const REQUEST_TIMEOUT_MS = 15000;

/** Headers sent with every request. */
export const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;

/**
 * Loan category (as shown in "Select loan category") -> product the backend routes on.
 * Matching ignores case, spaces and punctuation ("Two-Wheeler Loans" = "two wheeler loan").
 * A category that is not listed keeps the demo flow: Car Lease and Dealer Finance until
 * their API is decided. To connect one, add a line here; no other change is needed.
 */
export const PRODUCT_BY_CATEGORY = {
  'New Car Finance': 'NewCarFinance',
  'Used Car & Re-finance': 'NewCarFinance',
  'Top-Up Loan': 'NewCarFinance',
  'Two-Wheeler Loan': 'TWL',
  'Loan Against Property': 'LAP',
};

/**
 * Form field name -> key in `lead`. The field name is the label in lower case with dashes
 * ("Mobile number" -> "mobile-number"). Fields not listed are still sent, under their name in
 * PascalCase ("Zip / Postal code" -> "ZipPostalCode"), so new fields need no code change.
 * Name fields are not listed: they always become FirstName and LastName (see lead-payload.js).
 */
export const LEAD_FIELD_KEYS = {
  email: 'Email',
  city: 'Location',
  'mobile-number': 'Mobile',
  'select-loan-category': 'LoanCategory',
};

/** Form fields that are never sent (checked on the page only). */
export const EXCLUDED_FIELDS = ['captcha'];

/** What the visitor sees when a request fails. */
export const MESSAGES = {
  wrongOtp: 'Incorrect OTP. Please try again.',
  sendFailed: 'We couldn’t send the OTP. Please try again.',
  submitFailed: 'We couldn’t submit your details. Please try again.',
  timeout: 'This is taking longer than usual. Please try again.',
  network: 'Check your internet connection and try again.',
};
