/*
  Lead API settings: the only file to edit when the endpoints, products or field names change.
  The logic lives in lead-api.js (requests) and lead-payload.js (form -> lead).

  The APIs are AEM servlets, POSTed to ENDPOINTS[name] (see api.md):
  captcha-generate -> captcha-verify -> otp-generate -> otp-verify.
  The paths are root-relative (no host, never localhost), so the APIs are called on the domain
  the site is served from, whatever it is. They rely on HttpOnly SameSite=Strict cookies, which
  only work on that same domain. The captcha APIs are on the `en/home` page, the OTP APIs on
  `en`: the captcha cookies must be set with a Path that covers both (e.g. Path=/) to reach
  otp-generate.

  Everything here ships to the browser: never put API keys, secrets or passwords in this file.
*/

/** Path of each API, on the site's own domain. */
export const ENDPOINTS = {
  /**
   * {} -> { data: { image, audio } }, sets the kmp_captcha cookie. Both are Base64, as a
   * data URI or bare (the type is then read from the data); `audio` is optional: without
   * it the listen button is hidden.
   */
  captchaGenerate: '/content/kotakmahindraprime-aem/in/en/home.captcha-generate.json',
  /** { captcha } -> { data: { verified } }, sets the kmp_captcha_ok cookie */
  captchaVerify: '/content/kotakmahindraprime-aem/in/en/home.captcha-verify.json',
  /**
   * Send: { data: { name, mobileNo, mobCode, email, mode }, source, productType } (the fixed
   * values are OTP_GENERATE_FIXED) -> { data: { transactionId, token } }, needs kmp_captcha_ok.
   * Resend is the same endpoint with { data: { mobileNo }, transactionId, token } (the latest
   * pair; the token is what makes it a resend, so no captcha; `data` is required). Its answer's
   * pair replaces the old one: each token works for one resend only.
   */
  otpGenerate: '/content/kotakmahindraprime-aem/in/en.otp-generate.json',
  /**
   * { transactionId, otp, token, category, lead } -> { data: lead API response }
   * One endpoint for every product (LAP, NewCarFinance, TWL): `category` picks the lead API
   * (see PRODUCT_BY_CATEGORY). The server adds the OTP-verified mobile and its own fields
   * (LeadSource, EnquiryType, TWL defaults...).
   */
  otpVerify: '/content/kotakmahindraprime-aem/in/en.otp-verify.json',
};

/**
 * The fixed values of the first OTP request (otp-generate); only name, mobileNo and email change.
 * Not secrets: they ship to the browser.
 */
export const OTP_GENERATE_FIXED = {
  mobCode: '91',
  mode: 'B',
  source: 'AEM',
  productType: 'CR',
};

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
/** how long an OTP is valid: a refused OTP entered later is shown as expired */
export const OTP_VALID_MS = 5 * 60 * 1000;

/**
 * Resends allowed on one OTP screen. The click after the last one sends nothing: it shows
 * MESSAGES.resendExhausted (the backend does not limit resends itself).
 */
export const MAX_RESENDS = 3;
/**
 * Wrong OTPs allowed on one OTP screen. The last one switches the boxes and Validate off;
 * Resend stays but sends nothing, it shows MESSAGES.resendExhausted instead. Going back to
 * the form (new captcha) starts a new OTP screen with fresh counts.
 */
export const MAX_WRONG_OTPS = 3;

/**
 * Loan category (as shown in "Select loan category") -> its API and its fixed lead values,
 * all in one place:
 * - api: the API the backend calls (NewCarFinance, TWL, LAP), sent as the `category` of the
 *   OTP validation (not part of `lead`)
 * - lead: fixed values added to `lead` as they are, after the form fields (so no form field
 *   can override them). Any key works here, e.g. NewCarFinance's `Product` or TWL's `product`.
 * Matching ignores case, spaces and punctuation ("Two-Wheeler Loans" = "two wheeler loan").
 * A category that is not listed has no api, so the server refuses its lead. To connect one,
 * add a line here (and its keys in LEAD_KEYS_BY_PRODUCT); no other change is needed.
 */
export const PRODUCT_BY_CATEGORY = {
  'New Car Finance': { api: 'NewCarFinance', lead: { Product: 'New Car' } },
  'Used Car & Re-finance': { api: 'NewCarFinance', lead: { Product: 'Used Car' } },
  'Top-Up Loan': { api: 'NewCarFinance', lead: { Product: 'PL/KPTR' } },
  'Two-Wheeler Loan': {
    api: 'TWL',
    lead: {
      product: 'NEW TW',
      loanType: 'Individual',
      subSource: 'KMPL_WEB_LEADS',
      leadSource: 'KMPL_WEB_LEADS',
      stage: 'New',
      portfolio: 'TW',
      middleName: '',
      salutation: 'MR',
      status: 'New',
    },
  },
  // LAP: the form has no middle name, so it is sent empty
  'Loan Against Property': {
    api: 'LAP',
    lead: { MiddleName: '', LeadSource: 'Website', EnquiryType: '000' },
  },
  // no fixed values: the form's "Select loan category" is sent as LoanCategory
  'Car Lease': { api: 'CarLease' },
  'Dealer Finance': { api: 'DealerFinance' },
};

/**
 * The cities each API takes: product -> sheet (JSON) with one CITY_COLUMN column. The form's
 * City dropdown lists that sheet as is; a product that is not listed keeps the authored options.
 */
export const CITY_LISTS = {
  LAP: '/lap-cities.json',
  NewCarFinance: '/ncf-cities.json',
  TWL: '/tw-cities.json',
  // no city sheet of their own yet: the New Car Finance cities for now
  CarLease: '/ncf-cities.json',
  DealerFinance: '/ncf-cities.json',
};
export const CITY_COLUMN = 'SUB_CITY_NAME';

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
  // required: firstName, lastName, businessLocation; the fixed values are in PRODUCT_BY_CATEGORY
  TWL: {
    FirstName: 'firstName',
    LastName: 'lastName',
    Location: 'businessLocation',
    Email: 'email',
    Mobile: 'mobileNumber',
    Pincode: 'pinCodeCurrent',
  },
  // LeadSource, EnquiryType and MiddleName come from PRODUCT_BY_CATEGORY
  LAP: {
    FirstName: 'FirstName', LastName: 'LastName', Email: 'Email', Location: 'Location', Mobile: 'Phone',
  },
  // AccountName is the form's "Account name" (a company)
  CarLease: {
    LoanCategory: 'LoanCategory',
    AccountName: 'AccountName',
    FirstName: 'FirstName',
    LastName: 'LastName',
    Name: 'Name',
    Email: 'Email',
    Mobile: 'Mobile',
    Location: 'Location',
    Pincode: 'Pincode',
  },
  DealerFinance: {
    LoanCategory: 'LoanCategory',
    DealershipName: 'DealershipName',
    Manufacturer: 'Manufacturer',
    FundingAmountRequired: 'FundingAmountRequired',
    NatureOfFunding: 'NatureOfFunding',
    FirstName: 'FirstName',
    LastName: 'LastName',
    Name: 'Name',
    Email: 'Email',
    Mobile: 'Mobile',
    Location: 'Location',
    Pincode: 'Pincode',
  },
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
  INVALID_CAPTCHA: 'Invalid captcha please try again!',
  CAPTCHA_REQUIRED: 'Captcha cannot be blank',
  INVALID_OTP: 'The OTP you have entered is incorrect.',
  OTP_EXPIRED: 'OTP expired. Please regenerate.',
  RESEND_TOO_SOON: 'Please wait a little before asking for a new OTP.',
  RESEND_LIMIT: 'You have reached the limit of OTP resends. Please try again later.',
  captchaLoadFailed: 'We couldn’t load the captcha. Tap refresh to try again.',
  captchaAudioFailed: 'We couldn’t play the audio. Tap refresh for a new captcha.',
  resendNeedsCaptcha: 'Captcha expired. Please enter the captcha again to get a new OTP.',
  wrongOtp: 'The OTP you have entered is incorrect.',
  sendFailed: 'We couldn’t send the OTP. Please try again.',
  submitFailed: 'We couldn’t submit your details. Please try again.',
  formFailed: 'Something went wrong. Please refresh the page and try again.',
  timeout: 'This is taking longer than usual. Please try again.',
  network: 'Check your internet connection and try again.',
  // the OTP step's own codes (fallbacks: the backend's message is shown when it sends one)
  OTP_ATTEMPTS_EXCEEDED: 'Too many incorrect attempts. Please tap Resend OTP to get a new OTP.',
  // OTP screen, top message; {mobile} is the masked number (******9244)
  otpSent: 'Please enter the OTP that was sent to your mobile number {mobile}',
  otpResent: 'Please enter the OTP which was re-sent to your mobile number {mobile}.',
  // after the last allowed resend (MAX_RESENDS)
  otpResentLast: 'Please enter the OTP that was re-sent to your mobile number {mobile}. Please note this is your last attempt to resend the OTP.',
  // no resend left: in red at the top after MAX_RESENDS or RESEND_LIMIT from the API; under
  // the boxes (replacing otpLocked) when Resend is tapped after MAX_WRONG_OTPS
  resendExhausted: 'You have exhausted your limit to resend OTP. If you have not received OTP, please contact the bank OR try again later.',
  // OTP screen, under the boxes: a wrong OTP before the last one; {attempts} is how many are left
  wrongOtpAttemptsLeft: 'The OTP you have entered is incorrect. You have {attempts} attempts remaining to enter the new OTP post which your access to generate a new one will be locked.',
  // the last wrong OTP (MAX_WRONG_OTPS)
  otpLocked: 'You have exceeded maximum number of attempts to generate OTP. Please try again after 30 Minutes.',
};

/**
 * API error codes whose `message` is written for visitors (e.g. "Incorrect OTP. 2 attempts
 * left."): it is shown as it is, before MESSAGES.
 */
export const SERVER_MESSAGE_CODES = [
  'INVALID_OTP', 'OTP_ATTEMPTS_EXCEEDED', 'RESEND_TOO_SOON', 'RESEND_LIMIT', 'BAD_REQUEST',
  'OTP_SEND_FAILED', 'OTP_VERIFY_FAILED', 'LEAD_FAILED',
];
