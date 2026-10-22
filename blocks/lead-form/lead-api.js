/*
  Lead form services: generate the OTP, then validate it (which also creates the lead).
  Settings (endpoints, products, field keys, messages) are in lead-api-config.js.

  Usage (see the submit handler in lead-form.js):

    const product = productFor('Loan Against Property'); // 'LAP'
    const lead = buildLead(form, product);               // every form field, see lead-payload.js
    const session = createLeadSession({ mobile: '8097475810', product, lead });
    try {
      await session.sendOtp();                           // texts the OTP
      const { leadNumber } = await session.verifyOtp('214589'); // checks it, creates the lead
    } catch (error) {
      showError(errorMessage(error, 'verify'));          // LeadApiError -> visitor text
    }

  Demo mode: a category without a product (Car Lease, Dealer Finance) or missing endpoints
  keeps the placeholder flow: sending always works, 123456 is the right OTP.
*/
import {
  API_BASE_URL, ENDPOINTS, MESSAGES, OTP_LENGTH, REQUEST_HEADERS, REQUEST_TIMEOUT_MS,
} from './lead-api-config.js';

export { OTP_LENGTH, RESEND_SECONDS } from './lead-api-config.js';

const DEMO_OTP = '123456';
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * A failed lead request. `kind` says what went wrong:
 * - invalid-input: bad mobile, OTP or lead, nothing was sent
 * - timeout:       no answer within REQUEST_TIMEOUT_MS
 * - network:       offline, DNS, CORS...
 * - cancelled:     the visitor left the step (session.cancel())
 * - http:          the server answered with an error status (see `status`)
 * - bad-response:  the answer is not the expected JSON
 * - rejected:      the service said no (status is not "success"), e.g. a wrong OTP
 * - lead-failed:   the OTP was accepted but the lead was not created (Result is not "Success")
 */
export class LeadApiError extends Error {
  /**
   * @param {string} kind see above
   * @param {string} message for developers (console), not shown to visitors
   * @param {Object} [details] e.g. { status, code }
   */
  constructor(kind, message, details = {}) {
    super(message);
    this.name = 'LeadApiError';
    this.kind = kind;
    Object.assign(this, details);
  }
}

/** True once both endpoints are configured. */
export const isConfigured = () => Boolean(ENDPOINTS.generateOtp && ENDPOINTS.validateOtp);

/**
 * POSTs JSON and returns the `data` of a { status: "success", data } answer.
 * @param {string} endpoint path from ENDPOINTS
 * @param {Object} body
 * @param {AbortSignal} signal cancels the request
 * @returns {Promise<Object>}
 * @throws {LeadApiError}
 */
async function post(endpoint, body, signal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });

  try {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: REQUEST_HEADERS,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (timedOut) throw new LeadApiError('timeout', `${endpoint}: no answer in ${REQUEST_TIMEOUT_MS}ms`);
      if (signal.aborted) throw new LeadApiError('cancelled', `${endpoint}: cancelled`);
      throw new LeadApiError('network', `${endpoint}: ${e.message}`);
    }

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new LeadApiError('http', `${endpoint}: HTTP ${response.status}`, {
        status: response.status, code: json?.code,
      });
    }
    if (!json || typeof json !== 'object') {
      throw new LeadApiError('bad-response', `${endpoint}: the answer is not JSON`);
    }
    if (json.status !== 'success') {
      throw new LeadApiError('rejected', `${endpoint}: ${json.message || json.status}`, { code: json.code });
    }
    return json.data || {};
  } catch (error) {
    // the body was cut off by the timeout or a cancel
    if (!(error instanceof LeadApiError)) {
      throw new LeadApiError(timedOut ? 'timeout' : 'network', `${endpoint}: ${error.message}`);
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
 * One OTP journey of one form submission: keeps the transactionId and token of the last
 * generated OTP for the validate call. Create a new session for every "Apply now".
 * @param {Object} options
 * @param {string} options.mobile ten-digit mobile number
 * @param {string} options.product backend product (LAP, TWL, NewCarFinance), '' for demo mode
 * @param {Object<string, string>} options.lead see buildLead in lead-payload.js
 * @returns {{
 *   live: boolean,
 *   sendOtp: () => Promise<void>,
 *   verifyOtp: (otp: string) => Promise<{ leadNumber: string, stage: string }>,
 *   cancel: () => void,
 * }}
 */
export function createLeadSession({ mobile, product, lead }) {
  const live = Boolean(product) && isConfigured();
  if (product && !live) {
    // eslint-disable-next-line no-console
    console.warn('lead-api: endpoints are not set in lead-api-config.js, using demo mode');
  }
  const controller = new AbortController();
  let otpRequest = null; // { transactionId, token } of the last OTP sent

  const sendOtp = singleFlight(async () => {
    if (!MOBILE_PATTERN.test(mobile)) {
      throw new LeadApiError('invalid-input', 'mobile must be 10 digits starting with 6-9');
    }
    if (!live) {
      await wait(1200);
      return;
    }
    const data = await post(ENDPOINTS.generateOtp, { mobile }, controller.signal);
    if (typeof data.transactionId !== 'string' || typeof data.token !== 'string') {
      throw new LeadApiError('bad-response', 'generate OTP: transactionId or token missing');
    }
    otpRequest = { transactionId: data.transactionId, token: data.token };
  });

  const verifyOtp = singleFlight(async (otp) => {
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp)) {
      throw new LeadApiError('invalid-input', `the OTP must be ${OTP_LENGTH} digits`);
    }
    if (!live) {
      await wait(1200);
      if (otp !== DEMO_OTP) throw new LeadApiError('rejected', 'demo mode: wrong OTP');
      return { leadNumber: '', stage: 'demo' };
    }
    if (!otpRequest) throw new LeadApiError('invalid-input', 'no OTP was generated');
    if (!lead?.FirstName) throw new LeadApiError('invalid-input', 'lead.FirstName is missing');
    const data = await post(ENDPOINTS.validateOtp, {
      ...otpRequest,
      otp,
      lead: { ...lead, product },
    }, controller.signal);
    if (data.Result !== 'Success') {
      throw new LeadApiError('lead-failed', `validate OTP: ${data.ErrorMsg || data.Result}`);
    }
    return { leadNumber: data.LeadNumber || '', stage: data.Stage || '' };
  });

  return {
    live,
    sendOtp,
    verifyOtp,
    cancel: () => controller.abort(),
  };
}

/**
 * The text to show for a failed request.
 * @param {Error} error usually a LeadApiError
 * @param {'send'|'verify'} action the request that failed
 * @returns {string} '' for a cancelled request (nothing to show)
 */
export function errorMessage(error, action) {
  if (error?.kind === 'cancelled') return '';
  if (error?.kind !== 'invalid-input') {
    // eslint-disable-next-line no-console
    console.error('lead-api:', error?.kind, error?.message);
  }
  if (error?.kind === 'timeout') return MESSAGES.timeout;
  if (error?.kind === 'network') return MESSAGES.network;
  if (action === 'verify' && error?.kind === 'rejected') return MESSAGES.wrongOtp;
  return action === 'send' ? MESSAGES.sendFailed : MESSAGES.submitFailed;
}
