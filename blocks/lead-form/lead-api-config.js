/*
  Lead API settings: the only file to edit when the endpoints, products or field names change.
  The logic lives in lead-api.js (requests) and lead-payload.js (form -> lead).

  The APIs are AEM servlets, POSTed to `{API_BASE_URL}{ENDPOINTS[name]}` (see api.md):
  captcha-generate -> captcha-verify -> otp-generate -> otp-verify.
  They rely on HttpOnly cookies, sent with every request (credentials: 'include').

  Demo mode (see DEMO_MODE) runs the whole journey without the APIs: a captcha drawn in the
  browser and OTP 123456, so it can be tested on localhost and *.aem.page.

  Everything here ships to the browser: never put API keys, secrets or passwords in this file.
*/

/**
 * Origin of the APIs (AEM publish), without a trailing slash. Always https: publish redirects
 * http to https, and browsers drop a redirected cross-origin call.
 * Empty when the APIs are on the same domain as the site.
 * Another domain needs CORS on publish (the site's origin allowed, with credentials) and
 * cookies set with SameSite=None; Secure.
 */
export const API_BASE_URL = 'https://publish-p221656-e2281518.adobeaemcloud.com';

/** Path of each API, after API_BASE_URL. */
export const ENDPOINTS = {
  /** {} -> { data: { image } }, sets the kmp_captcha cookie */
  captchaGenerate: '/content/kotakmahindraprime-aem/in/en/home.captcha-generate.json',
  /** { captcha } -> { data: { verified } }, sets the kmp_captcha_ok cookie */
  captchaVerify: '/content/kotakmahindraprime-aem/in/en/home.captcha-verify.json',
  /** { mobile } -> { data: { transactionId, token } }, needs kmp_captcha_ok */
  otpGenerate: '/content/kotakmahindraprime-aem/in/en.otp-generate.json',
  /**
   * { transactionId, otp, token, category, lead } -> { data: lead API response }
   * One endpoint for every product (LAP, NewCarFinance, TWL): `category` picks the lead API
   * (see PRODUCT_BY_CATEGORY).
   */
  otpVerify: '/content/kotakmahindraprime-aem/in/en.otp-verify.json',
  // TODO audio captcha: a captchaAudio endpoint once the backend provides it
};

/**
 * true: always demo, false: always the APIs,
 * null: demo on localhost, *.aem.page and *.aem.live (they cannot reach the AEM servlets).
 */
export const DEMO_MODE = false;

/**
 * window variable that keeps the journey's data between OTP generation and validation:
 * { transactionId, token, mobile, category, lead }. Cleared on back, close and success.
 */
export const LEAD_STORE_KEY = 'kmpLeadJourney';

/**
 * The lead created by the last successful OTP validation, for analytics:
 * window[LEAD_RESULT_KEY] = { leadId, category, loanCategory, createdAt }, also sent as the
 * detail of a LEAD_CREATED_EVENT on document. No personal data (name, mobile, email, OTP).
 */
export const LEAD_RESULT_KEY = 'kmpLead';
export const LEAD_CREATED_EVENT = 'kmp:lead-created';

/** A request still pending after this long is cancelled and shown as an error. */
export const REQUEST_TIMEOUT_MS = 15000;

/** Headers sent with every request. */
export const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export const CAPTCHA_LENGTH = 5;
export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;

/**
 * Loan category (as shown in "Select loan category") -> fields for it.
 * - product: the API the backend calls (NewCarFinance, TWL, LAP), sent as the `category`
 *   of the OTP validation
 * - Product: New Car Finance API only (required), which of its products the lead is for;
 *   the server writes it to the Salesforce Product__c field
 * Every other key of an entry is added to `lead` as is, so another category specific value
 * is one more key.
 * Matching ignores case, spaces and punctuation ("Two-Wheeler Loans" = "two wheeler loan").
 * A category that is not listed keeps the demo flow: Car Lease and Dealer Finance until
 * their API is decided. To connect one, add a line here; no other change is needed.
 */
export const PRODUCT_BY_CATEGORY = {
  'New Car Finance': { product: 'NewCarFinance', Product: 'New CAR' },
  'Used Car & Re-finance': { product: 'NewCarFinance', Product: 'Used Car' },
  'Top-Up Loan': { product: 'NewCarFinance', Product: 'PL/KPTR' },
  'Two-Wheeler Loan': { product: 'TWL' },
  'Loan Against Property': { product: 'LAP' },
};

/**
 * The `lead` fields each API takes (api.md, "Lead requests and responses"):
 * form value -> key in `lead`. Only these are sent, so an API never receives a field it does
 * not know. Form values are named as in LEAD_FIELD_KEYS, plus FirstName, LastName and Name
 * (the full name). The mobile number is never sent: the server adds the number verified by
 * the OTP. A product that is not listed sends every form field.
 */
export const LEAD_KEYS_BY_PRODUCT = {
  // required: FirstName, LastName, Location and Product (from PRODUCT_BY_CATEGORY)
  NewCarFinance: {
    FirstName: 'FirstName', LastName: 'LastName', Location: 'Location', Pincode: 'Pincode', Email: 'Email',
  },
  // required: firstName, lastName, businessLocation
  TWL: { FirstName: 'firstName', LastName: 'lastName', Location: 'businessLocation' },
  // nothing required
  LAP: { Name: 'Name', Email: 'Email', Location: 'City' },
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
  'zip-postal-code': 'Pincode',
};

/** Form fields that are never sent (checked on the page only). */
export const EXCLUDED_FIELDS = ['captcha'];

/**
 * What the visitor sees when a request fails. Upper case keys are API error codes; a code
 * that is not listed shows the API's own message.
 */
export const MESSAGES = {
  INVALID_CAPTCHA: 'Invalid or expired captcha. Please enter the new one.',
  CAPTCHA_REQUIRED: 'Please complete the captcha.',
  INVALID_OTP: 'Invalid or expired OTP.',
  captchaLoadFailed: 'We couldn’t load the captcha. Tap refresh to try again.',
  resendNeedsCaptcha: 'Please go back and complete the captcha to get a new OTP.',
  wrongOtp: 'Incorrect OTP. Please try again.',
  sendFailed: 'We couldn’t send the OTP. Please try again.',
  submitFailed: 'We couldn’t submit your details. Please try again.',
  timeout: 'This is taking longer than usual. Please try again.',
  network: 'Check your internet connection and try again.',
};
