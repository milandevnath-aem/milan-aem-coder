/*
  Lead form services (see api.md): captcha, OTP and the lead.
  Settings (endpoints, products, field keys, messages) are in lead-api-config.js.

  Usage (see lead-form.js):

    const { image } = await generateCaptcha(signal);    // on opening the form, and on refresh
    const product = productFor('New Car Finance');      // 'NewCarFinance'
    const lead = buildLead(form, 'New Car Finance');    // every form field + Product__c 'New CAR'
    const session = createLeadSession({ mobile: '8097475810', product, lead });
    try {
      await session.submit('aB3dE');                    // verifies the captcha, texts the OTP
      await session.verifyOtp('214589');                // checks it, creates the lead
    } catch (error) {
      showError(errorMessage(error, 'verify'));         // LeadApiError -> visitor text
    }

  Between submit and verifyOtp, the journey's data (transactionId, token, mobile, category,
  lead) is kept in window[LEAD_STORE_KEY], and verifyOtp sends it from there.

  Demo mode (DEMO_MODE): the captcha is drawn in the browser and 123456 is the right OTP.
  A category without a product (Car Lease, Dealer Finance) skips the APIs the same way.
*/
import {
  API_BASE_URL, CAPTCHA_LENGTH, DEMO_MODE, ENDPOINTS, LEAD_STORE_KEY, MESSAGES,
  OTP_LENGTH, REQUEST_HEADERS, REQUEST_TIMEOUT_MS,
} from './lead-api-config.js';

export { CAPTCHA_LENGTH, OTP_LENGTH, RESEND_SECONDS } from './lead-api-config.js';

const DEMO_OTP = '123456';
const DEMO_HOSTS = /^(localhost|127\.0\.0\.1)$|\.aem\.(page|live)$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * A failed lead request. `kind` says what went wrong:
 * - invalid-input: bad mobile, OTP or lead, nothing was sent
 * - timeout:       no answer within REQUEST_TIMEOUT_MS
 * - network:       offline, DNS, CORS...
 * - cancelled:     the visitor left the step (session.cancel())
 * - http:          the server answered with an error status (see `status`, `code`)
 * - bad-response:  the answer is not the expected JSON
 * - rejected:      the service said no (status is not "success"), e.g. a wrong OTP
 * - lead-failed:   the OTP was accepted but the lead was not created (Result is not "Success")
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

/** True when the journey runs without the APIs (see DEMO_MODE in lead-api-config.js). */
export const isDemo = () => (typeof DEMO_MODE === 'boolean'
  ? DEMO_MODE
  : DEMO_HOSTS.test(window.location.hostname));

/**
 * POSTs JSON to a servlet and returns the `data` of a { status: "success", data } answer.
 * @param {string} endpoint key of ENDPOINTS
 * @param {Object} body
 * @param {AbortSignal} signal cancels the request
 * @returns {Promise<Object>}
 * @throws {LeadApiError}
 */
async function post(endpoint, body, signal) {
  const path = ENDPOINTS[endpoint];
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
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        // the captcha cookies (HttpOnly) travel with the requests, also to the publish domain
        credentials: 'include',
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
    if (!response.ok) {
      throw new LeadApiError('http', `${name}: HTTP ${response.status} ${json?.code || ''}`, {
        status: response.status, code: json?.code, serverMessage: json?.message,
      });
    }
    if (!json || typeof json !== 'object') {
      throw new LeadApiError('bad-response', `${name}: the answer is not JSON`);
    }
    if (json.status !== 'success') {
      throw new LeadApiError('rejected', `${name}: ${json.code || json.status}`, {
        code: json.code, serverMessage: json.message,
      });
    }
    return json.data || {};
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

/* demo captcha: drawn in the browser, one attempt like the real one */
const DEMO_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let demoCaptcha = '';

function drawDemoCaptcha(code) {
  const canvas = document.createElement('canvas');
  canvas.width = 168;
  canvas.height = 68;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.fillStyle = '#002c62';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgb(255 255 255 / 25%)';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.bezierCurveTo(
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height,
    );
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  [...code].forEach((char, i) => {
    ctx.save();
    ctx.translate(22 + i * 30, height / 2 + (Math.random() * 16 - 8));
    ctx.rotate((Math.random() - 0.5) * 0.7);
    ctx.font = `700 ${26 + Math.round(Math.random() * 10)}px Manrope, Arial, sans-serif`;
    ctx.fillText(char, -8, 0);
    ctx.restore();
  });
  return canvas.toDataURL('image/png');
}

/**
 * A new captcha image; replaces the previous one (only the newest can be verified).
 * @param {AbortSignal} signal cancels the request
 * @returns {Promise<{ image: string, code: string }>} image: data URI for <img src>;
 *   code: the text, in demo mode only (for the listen button)
 * @throws {LeadApiError}
 */
export async function generateCaptcha(signal) {
  if (isDemo()) {
    await wait(300);
    if (signal.aborted) throw new LeadApiError('cancelled', 'captcha: cancelled');
    demoCaptcha = [...Array(CAPTCHA_LENGTH)]
      .map(() => DEMO_CHARS[Math.floor(Math.random() * DEMO_CHARS.length)]).join('');
    return { image: drawDemoCaptcha(demoCaptcha), code: demoCaptcha };
  }
  const data = await post('captchaGenerate', {}, signal);
  if (typeof data.image !== 'string' || !data.image.startsWith('data:image/')) {
    throw new LeadApiError('bad-response', 'captcha-generate: image missing');
  }
  return { image: data.image, code: '' };
}

/**
 * Checks the captcha (case-sensitive). Every captcha gets one attempt, right or wrong.
 * @param {string} captcha what the visitor typed
 * @param {AbortSignal} signal
 * @throws {LeadApiError} code INVALID_CAPTCHA when wrong or expired
 */
async function verifyCaptcha(captcha, signal) {
  if (isDemo()) {
    await wait(600);
    const right = Boolean(demoCaptcha) && captcha === demoCaptcha;
    demoCaptcha = '';
    if (!right) throw new LeadApiError('rejected', 'demo mode: wrong captcha', { code: 'INVALID_CAPTCHA' });
    return;
  }
  await post('captchaVerify', { captcha }, signal);
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
 *   category has no API yet
 * @param {Object<string, string>} options.lead see buildLead in lead-payload.js
 * @returns {{
 *   live: boolean,
 *   submit: (captcha: string|null) => Promise<void>,
 *   sendOtp: () => Promise<void>,
 *   verifyOtp: (otp: string) => Promise<{ leadNumber: string, stage: string, data: Object }>,
 *   cancel: () => void,
 * }}
 */
export function createLeadSession({ mobile, product, lead }) {
  const demo = isDemo();
  const live = Boolean(product) && !demo;
  if (!product && !demo) {
    // eslint-disable-next-line no-console
    console.warn('lead-api: this category has no API yet (lead-api-config.js), using demo mode');
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
    if (!live) {
      await wait(1200);
      keep({ transactionId: 'demo', token: 'demo' });
      return;
    }
    const data = await post('otpGenerate', { mobile }, controller.signal);
    if (typeof data.transactionId !== 'string' || typeof data.token !== 'string') {
      throw new LeadApiError('bad-response', 'otp-generate: transactionId or token missing');
    }
    keep({ transactionId: data.transactionId, token: data.token });
  });

  // the form's submit: captcha first, the OTP only once it is accepted
  const submit = singleFlight(async (captcha) => {
    // a category without an API (live is false outside demo mode) does not use the captcha
    if (captcha !== null && (live || demo)) {
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
    if (!live) {
      await wait(1200);
      if (otp !== DEMO_OTP) throw new LeadApiError('rejected', 'demo mode: wrong OTP', { code: 'INVALID_OTP' });
      clearJourney(journey);
      return { leadNumber: '', stage: 'demo', data: {} };
    }
    // the data kept when the OTP was generated
    const stored = window[LEAD_STORE_KEY];
    if (!stored?.transactionId) throw new LeadApiError('invalid-input', 'no OTP was generated');
    const data = await post('otpVerify', {
      transactionId: stored.transactionId,
      token: stored.token,
      otp,
      category: stored.category,
      lead: stored.lead || {},
    }, controller.signal);
    // `data` is the answer of the lead API the backend called: the success step is shown
    // only when it says Success (a missing Result is a failure too)
    if (String(data.Result || '').toLowerCase() !== 'success') {
      throw new LeadApiError('lead-failed', `otp-verify: ${data.ErrorMsg || data.Result || 'no Result'}`);
    }
    clearJourney(stored);
    return { leadNumber: data.LeadNumber || '', stage: data.Stage || '', data };
  });

  return {
    live,
    submit,
    sendOtp,
    verifyOtp,
    cancel: () => {
      controller.abort();
      clearJourney(journey);
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
  const {
    kind, code, status, serverMessage,
  } = error || {};
  if (kind !== 'invalid-input') {
    // eslint-disable-next-line no-console
    console.error('lead-api:', kind, error?.message);
  }
  if (action === 'captcha-load') return MESSAGES.captchaLoadFailed;
  if (action === 'resend' && code === 'CAPTCHA_REQUIRED') return MESSAGES.resendNeedsCaptcha;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (kind === 'timeout') return MESSAGES.timeout;
  if (kind === 'network') return MESSAGES.network;
  // the visitor's input was refused (4xx or status "error"), not a server failure
  const refused = kind === 'rejected' || (kind === 'http' && status < 500);
  if (refused && action === 'captcha') return MESSAGES.INVALID_CAPTCHA;
  if (refused && action === 'verify' && !serverMessage) return MESSAGES.wrongOtp;
  if (refused && serverMessage) return serverMessage;
  return action === 'verify' ? MESSAGES.submitFailed : MESSAGES.sendFailed;
}
