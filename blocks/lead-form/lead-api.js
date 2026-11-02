/*
  Lead form services (see api.md): captcha, OTP and the lead.
  Settings (endpoints, products, field keys, messages) are in lead-api-config.js.

  Usage (see lead-form.js):

    const { image, audio } = await generateCaptcha(signal); // on opening the form, and on
                                                        // refresh; audio is '' when not sent
    const product = productFor('New Car Finance');      // 'NewCarFinance'
    const lead = buildLead(form, 'New Car Finance');    // the API's fields + Product 'New CAR'
    const session = createLeadSession({ mobile: '8097475810', product, lead });
    try {
      await session.submit('aB3dE');                    // verifies the captcha, texts the OTP
      await session.verifyOtp('214589');                // checks it, creates the lead
    } catch (error) {
      showError(errorMessage(error, 'verify'));         // LeadApiError -> visitor text
    }

  Between submit and verifyOtp, the journey's data (transactionId, token, mobile, category,
  lead) is kept in window[LEAD_STORE_KEY]; verifyOtp sends the session's own copy, so another
  form's journey is never sent, and an OTP that created a lead is not sent twice.
*/
import {
  ENDPOINTS, LEAD_CREATED_EVENT, LEAD_RESULT_KEY,
  LEAD_STORE_KEY, MESSAGES, OTP_LENGTH, REQUEST_HEADERS, REQUEST_TIMEOUT_MS,
} from './lead-api-config.js';

export {
  CAPTCHA_LENGTH, OTP_LENGTH, OTP_VALID_MS, RESEND_SECONDS,
} from './lead-api-config.js';

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

/**
 * A failed lead request. `kind` says what went wrong:
 * - invalid-input: bad mobile, OTP or lead, nothing was sent
 * - timeout:       no answer within REQUEST_TIMEOUT_MS
 * - network:       offline, DNS, CORS...
 * - cancelled:     the visitor left the step (session.cancel())
 * - http:          the server answered with an error status (see `status`, `code`)
 * - bad-response:  the answer is not the expected JSON
 * - rejected:      the service said no (status is not "success"), e.g. a wrong OTP
 * (a lead that was not created is an `http` error with status 502 and code LEAD_FAILED)
 * `code` is the API error code (INVALID_CAPTCHA, CAPTCHA_REQUIRED, INVALID_OTP, BAD_REQUEST...)
 * and `serverMessage` its message. `step` ('captcha' or 'otp') says which call of
 * session.submit failed.
 */
export class LeadApiError extends Error {
  /**
   * @param {string} kind see above
   * @param {string} message for developers (console), not shown to visitors
   * @param {Object} [details] e.g. { status, code, serverMessage }
   */
  constructor(kind, message, details = {}) {
    super(message);
    this.name = 'LeadApiError';
    this.kind = kind;
    Object.assign(this, details);
  }
}

/** A value from a response as text: '' for anything that is not a string or a number */
const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

/** A response field as an object: {} for anything else (null, a string, a list...) */
const record = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

// the start of bare Base64 data says what it is (the first bytes of each file format)
const SIGNATURES = {
  image: [
    ['iVBORw0KGgo', 'image/png'], ['/9j/', 'image/jpeg'], ['R0lGOD', 'image/gif'],
    ['UklGR', 'image/webp'], ['PHN2Zy', 'image/svg+xml'], ['PD94bWwg', 'image/svg+xml'],
  ],
  audio: [
    ['SUQz', 'audio/mpeg'], ['//', 'audio/mpeg'], ['UklGR', 'audio/wav'], ['T2dnUw', 'audio/ogg'],
    ['GkXfo', 'audio/webm'], ['ZkxhQw', 'audio/flac'], ['AAAA', 'audio/mp4'],
  ],
};

/**
 * Base64 media from the API as a data URI: a data URI of the right kind as it is, bare
 * Base64 with the type read from its first bytes.
 * @param {*} value e.g. "data:image/png;base64,iVBOR..." or "iVBOR..."
 * @param {'image'|'audio'} kind
 * @returns {string} data URI, '' when the value is missing or not Base64 of that kind
 */
export function toDataUri(value, kind) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (raw.startsWith('data:')) {
    return new RegExp(`^data:${kind}/[\\w.+-]+(;[\\w=.+-]+)*;base64,[A-Za-z0-9+/]+=*$`).test(raw.replace(/\s/g, '')) ? raw.replace(/\s/g, '') : '';
  }
  // bare Base64 (URL-safe characters allowed); line breaks are ignored
  const data = raw.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]+=*$/.test(data) || data.length < 16) return '';
  const [, type] = SIGNATURES[kind].find(([start]) => data.startsWith(start))
    || [null, kind === 'image' ? 'image/png' : 'audio/mpeg'];
  return `data:${type};base64,${data}`;
}

/**
 * POSTs JSON to a servlet and returns the `data` of a { status: "success", data } answer.
 * @param {string} endpoint key of ENDPOINTS
 * @param {Object} body
 * @param {AbortSignal} signal cancels the request
 * @returns {Promise<Object>}
 * @throws {LeadApiError}
 */
async function post(endpoint, body, signal = new AbortController().signal) {
  const path = ENDPOINTS[endpoint];
  if (typeof path !== 'string' || !path) {
    throw new LeadApiError('bad-response', `lead-api: no endpoint "${endpoint}" in lead-api-config.js`);
  }
  // e.g. "home.captcha-generate.json", for the console
  const name = path.split('/').pop();
  if (signal.aborted) throw new LeadApiError('cancelled', `${name}: cancelled`);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });

  try {
    let response;
    try {
      // absolute path: the request goes to the domain the page is served from
      response = await fetch(path, {
        method: 'POST',
        // the captcha cookies (HttpOnly) travel with the requests (api.md)
        credentials: 'same-origin',
        headers: REQUEST_HEADERS,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (timedOut) throw new LeadApiError('timeout', `${name}: no answer in ${REQUEST_TIMEOUT_MS}ms`);
      if (signal.aborted) throw new LeadApiError('cancelled', `${name}: cancelled`);
      throw new LeadApiError('network', `${name}: ${e.message}`);
    }

    // an HTML page ("Content modified") means the selector was not matched
    const json = await response.json().catch(() => null);
    // the body was cut off by the timeout or a cancel
    if (timedOut) throw new LeadApiError('timeout', `${name}: no answer in ${REQUEST_TIMEOUT_MS}ms`);
    if (signal.aborted) throw new LeadApiError('cancelled', `${name}: cancelled`);
    const answer = record(json);
    // code and message are shown or looked up: only text is kept
    const code = text(answer.code).toUpperCase();
    const serverMessage = text(answer.message);
    if (!response.ok) {
      throw new LeadApiError('http', `${name}: HTTP ${response.status} ${code}`, {
        status: response.status, code, serverMessage,
      });
    }
    if (json !== answer) {
      throw new LeadApiError('bad-response', `${name}: the answer is not a JSON object`);
    }
    if (text(answer.status).toLowerCase() !== 'success') {
      throw new LeadApiError('rejected', `${name}: ${code || text(answer.status) || 'no status'}`, {
        code, serverMessage,
      });
    }
    // the lead API's answer (otp-verify) is passed on as it is; anything else must be an object
    return answer.data ?? {};
  } catch (error) {
    // anything unexpected still reaches the caller as a LeadApiError
    if (!(error instanceof LeadApiError)) {
      throw new LeadApiError(timedOut ? 'timeout' : 'network', `${name}: ${error.message}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}

/**
 * Runs `task` once at a time: calls while it is pending get the same promise
 * (double clicks never send two requests).
 * @param {Function} task async function
 * @returns {Function}
 */
function singleFlight(task) {
  let pending = null;
  return (...args) => {
    if (!pending) pending = task(...args).finally(() => { pending = null; });
    return pending;
  };
}

/**
 * A new captcha, as an image and (when the API sends it) audio; replaces the previous one
 * (only the newest can be verified).
 * @param {AbortSignal} signal cancels the request
 * @returns {Promise<{ image: string, audio: string }>} data URIs for <img src> and audio;
 *   audio is '' when the answer has none or it is not valid Base64 audio
 * @throws {LeadApiError} bad-response when the image is missing or not a Base64 image
 */
export async function generateCaptcha(signal) {
  const data = record(await post('captchaGenerate', {}, signal));
  const image = toDataUri(data.image, 'image');
  if (!image) throw new LeadApiError('bad-response', 'captcha-generate: image missing or not Base64');
  const audio = toDataUri(data.audio, 'audio');
  if (data.audio && !audio) {
    // eslint-disable-next-line no-console
    console.warn('lead-api: captcha-generate: audio is not Base64 audio, the listen button is hidden');
  }
  return { image, audio };
}

/**
 * Checks the captcha (case-sensitive). Every captcha gets one attempt, right or wrong.
 * @param {string} captcha what the visitor typed
 * @param {AbortSignal} signal
 * @throws {LeadApiError} code INVALID_CAPTCHA when wrong or expired
 */
async function verifyCaptcha(captcha, signal) {
  const data = record(await post('captchaVerify', { captcha }, signal));
  // a "success" that says the captcha is wrong is still a wrong captcha
  if (data.verified === false || text(data.verified).toLowerCase() === 'false') {
    throw new LeadApiError('rejected', 'captcha-verify: not verified', { code: 'INVALID_CAPTCHA' });
  }
}

/**
 * The lead id in a lead API answer: LeadId (TWL, LAP) or the Lead record of the Salesforce
 * composite (NewCarFinance).
 * @param {Object|string} data `data` of a successful otp-verify
 * @returns {string} '' when the answer has none
 */
function leadIdOf(data) {
  const answer = record(data);
  // the lead is created by now: a reply in another shape only means no id, never an error
  const parts = Array.isArray(answer.compositeResponse) ? answer.compositeResponse : [];
  const lead = parts.find((part) => record(part).referenceId === 'referLead');
  return text(answer.LeadId) || text(answer.LeadNumber) || text(record(record(lead).body).id);
}

/**
 * Keeps a created lead for analytics: window[LEAD_RESULT_KEY] and a LEAD_CREATED_EVENT on
 * document (see lead-api-config.js).
 * @param {{ leadId: string, category: string, loanCategory: string }} lead
 * @returns {{ leadId: string, category: string, loanCategory: string, createdAt: string }}
 */
function keepCreatedLead(lead) {
  const created = { ...lead, createdAt: new Date().toISOString() };
  // analytics only: a failure here must not turn a created lead into an error
  try {
    window[LEAD_RESULT_KEY] = created;
    document.dispatchEvent(new CustomEvent(LEAD_CREATED_EVENT, { detail: created }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('lead-api: the created lead could not be kept for analytics', error);
  }
  return created;
}

/** Removes the journey's data from window (when it is still `journey`, if given). */
export function clearJourney(journey) {
  if (!journey || window[LEAD_STORE_KEY] === journey) delete window[LEAD_STORE_KEY];
}

/**
 * One OTP journey of one form submission. Create a new session for every submit.
 * @param {Object} options
 * @param {string} options.mobile ten-digit mobile number
 * @param {string} options.product backend product (LAP, TWL, NewCarFinance), '' when the
 *   category has no API yet (sent as is: the server refuses the lead)
 * @param {Object<string, string>} options.lead see buildLead in lead-payload.js
 * @param {string} [options.loanCategory] the loan category picked in the form, e.g.
 *   "Used Car & Re-finance", kept with the created lead for analytics
 * @returns {{
 *   submit: (captcha: string|null) => Promise<void>,
 *   sendOtp: () => Promise<void>,
 *   verifyOtp: (otp: string) => Promise<{ leadId: string, category: string,
 *     loanCategory: string, createdAt: string, stage: string, data: Object }>,
 *   cancel: () => void,
 * }}
 */
export function createLeadSession({
  mobile, product, lead, loanCategory = '',
}) {
  if (!product) {
    // eslint-disable-next-line no-console
    console.warn('lead-api: this category has no product in PRODUCT_BY_CATEGORY (lead-api-config.js)');
  }
  const controller = new AbortController();
  let journey = null; // what this session put in window[LEAD_STORE_KEY]

  const keep = (otpRequest) => {
    journey = {
      ...otpRequest, mobile, category: product, lead,
    };
    window[LEAD_STORE_KEY] = journey;
  };

  const sendOtp = singleFlight(async () => {
    if (!MOBILE_PATTERN.test(mobile)) {
      throw new LeadApiError('invalid-input', 'mobile must be 10 digits starting with 6-9');
    }
    const data = record(await post('otpGenerate', { mobile }, controller.signal));
    // both are needed to validate the OTP later: without them the OTP could not be checked
    const transactionId = text(data.transactionId);
    const token = text(data.token);
    if (!transactionId || !token) {
      throw new LeadApiError('bad-response', 'otp-generate: transactionId or token missing');
    }
    keep({ transactionId, token });
  });

  // the form's submit: captcha first, the OTP only once it is accepted
  const submit = singleFlight(async (captcha) => {
    // no captcha field (null): the OTP API answers CAPTCHA_REQUIRED
    if (captcha !== null) {
      try {
        await verifyCaptcha(captcha, controller.signal);
      } catch (error) {
        error.step = 'captcha';
        throw error;
      }
    }
    try {
      await sendOtp();
    } catch (error) {
      error.step = 'otp';
      throw error;
    }
  });

  const verifyOtp = singleFlight(async (otp) => {
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp)) {
      throw new LeadApiError('invalid-input', `the OTP must be ${OTP_LENGTH} digits`);
    }
    // the data kept when this session's OTP was generated (window[LEAD_STORE_KEY] may hold
    // another form's journey); none after a cancel or once it created a lead
    const stored = journey;
    if (!stored?.transactionId || !stored.token) {
      throw new LeadApiError('invalid-input', 'no OTP was generated');
    }
    const data = await post('otpVerify', {
      transactionId: stored.transactionId,
      token: stored.token,
      otp,
      category: stored.category,
      lead: stored.lead || {},
    }, controller.signal);
    // the server answers success only when the lead API created the lead (Result "Success",
    // a Salesforce composite without errors, or a 2xx answer); otherwise 502 LEAD_FAILED.
    // `data` is the lead API's answer as it is.
    clearJourney(stored);
    // this OTP is used up: a second validate is refused here instead of sent again
    journey = null;
    const created = keepCreatedLead({
      leadId: leadIdOf(data), category: stored.category, loanCategory,
    });
    return { ...created, stage: text(record(data).Stage), data };
  });

  return {
    submit,
    sendOtp,
    verifyOtp,
    cancel: () => {
      controller.abort();
      // only this session's own data (none yet: another form's is left alone)
      if (journey) clearJourney(journey);
      journey = null;
    },
  };
}

/**
 * The text to show for a failed request.
 * @param {Error} error usually a LeadApiError
 * @param {'captcha-load'|'captcha'|'send'|'resend'|'verify'} action the request that failed
 * @returns {string} '' for a cancelled request (nothing to show)
 */
export function errorMessage(error, action) {
  if (error?.kind === 'cancelled') return '';
  const { kind, status } = error || {};
  // only text can be looked up or shown (any Error may get here, not just a LeadApiError)
  const code = typeof error?.code === 'string' ? error.code : '';
  const serverMessage = typeof error?.serverMessage === 'string' ? error.serverMessage.trim() : '';
  if (kind !== 'invalid-input') {
    // eslint-disable-next-line no-console
    console.error('lead-api:', kind, error?.message);
  }
  if (action === 'captcha-load') return MESSAGES.captchaLoadFailed;
  if (action === 'resend' && code === 'CAPTCHA_REQUIRED') return MESSAGES.resendNeedsCaptcha;
  // the visitor's input was refused (4xx or status "error"), not a server failure
  const refused = kind === 'rejected' || (kind === 'http' && status < 500);
  // an expired OTP: said so by the server, or refused after OTP_VALID_MS (error.expired,
  // set by the OTP step) when the server does not tell expired from wrong
  const expired = /EXPIRED/i.test(code) || /expire/i.test(serverMessage)
    || (refused && error.expired === true);
  if (action === 'verify' && expired) return MESSAGES.OTP_EXPIRED;
  // API codes are upper case keys of MESSAGES; the others are this file's own texts
  if (/^[A-Z_]+$/.test(code) && Object.prototype.hasOwnProperty.call(MESSAGES, code)) return MESSAGES[code];
  if (kind === 'timeout') return MESSAGES.timeout;
  if (kind === 'network') return MESSAGES.network;
  if (refused && action === 'captcha') return MESSAGES.INVALID_CAPTCHA;
  if (refused && action === 'verify' && !serverMessage) return MESSAGES.wrongOtp;
  if (refused && serverMessage) return serverMessage;
  return action === 'verify' ? MESSAGES.submitFailed : MESSAGES.sendFailed;
}
