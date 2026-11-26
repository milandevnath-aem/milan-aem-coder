/*
  Service Request form services: sheet data, loan account check and the request itself.
  Settings (endpoints, sheet, payload keys, messages) are in service-request-api-config.js.
  The request handling (timeout, cancel, { status, data } answers, errors) and the captcha are
  the lead form's (../lead-form/lead-api.js); its LAP / NCF / TWL logic is not used here.
*/
import {
  LeadApiError, post, singleFlight, verifyCaptcha,
} from '../lead-form/lead-api.js';
import {
  COLUMNS, ENDPOINTS, MESSAGES, SELF_SERVICE_SUBJECTS, SHEET, submitPayload, verifyPayload,
} from './service-request-api-config.js';

/** "  Change of  address " -> "change of address" */
const normalize = (text) => String(text ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const cell = (row, column) => String(row?.[column] ?? '').trim();

// sheet URL -> promise of its data, so a form opened again does not refetch
const sheets = {};

/**
 * Reads the client's sheet (see SHEET in the config).
 * @param {string} [path] sheet path from the block ("/service-request.json"), SHEET when empty
 * @returns {Promise<{ products: string[], subjects: Map<string, string[]>, cities: string[] }>}
 *   lists in sheet order without blanks or repeats; empty lists when it cannot be read
 */
export function loadServiceData(path) {
  let url = path || SHEET;
  // an authored page link ("/service-request") is the sheet's page: its data is the .json
  if (!/\.json(\?|$)/.test(url)) url = `${url.replace(/\.html$/, '')}.json`;
  // the city list is long: ask for every row, not the first page only
  if (!/[?&]limit=/.test(url)) url += `${url.includes('?') ? '&' : '?'}limit=10000`;
  sheets[url] ||= fetch(url)
    .then((resp) => (resp.ok ? resp.json() : {}))
    .then((json) => {
      // a single sheet ({ data }) or a multi-sheet workbook ({ <name>: { data } })
      const rows = Array.isArray(json?.data) ? json.data
        : Object.values(json || {})
          .flatMap((sheet) => (Array.isArray(sheet?.data) ? sheet.data : []));
      const products = [];
      const cities = [];
      const subjects = new Map();
      let subject = '';
      rows.forEach((row) => {
        const product = cell(row, COLUMNS.product);
        const city = cell(row, COLUMNS.city);
        const subType = cell(row, COLUMNS.subType);
        if (product && !products.includes(product)) products.push(product);
        if (city && !cities.includes(city)) cities.push(city);
        // a Subject is written once, on the first row of its group: the next rows with an
        // empty Subject belong to it
        if (cell(row, COLUMNS.subject)) subject = cell(row, COLUMNS.subject);
        if (!subject) return;
        if (!subjects.has(subject)) subjects.set(subject, []);
        const list = subjects.get(subject);
        if (subType && !list.includes(subType)) list.push(subType);
      });
      return { products, subjects, cities };
    })
    .catch(() => ({ products: [], subjects: new Map(), cities: [] }));
  return sheets[url].then((data) => {
    // tried again next time
    if (!data.products.length && !data.subjects.size && !data.cities.length) delete sheets[url];
    return data;
  });
}

/**
 * Whether a subject is done online (Login popup, no API call).
 * @param {string} subject the picked subject
 * @param {string[]} [authored] the block's "Subjects that open the Login popup";
 *   SELF_SERVICE_SUBJECTS when empty
 */
export function isSelfService(subject, authored = []) {
  const list = authored.length ? authored : SELF_SERVICE_SUBJECTS;
  const wanted = normalize(subject);
  return Boolean(wanted) && list.some((s) => normalize(s) === wanted);
}

/** An endpoint that is not configured yet: the call is skipped (see ENDPOINTS). */
function missing(name) {
  // eslint-disable-next-line no-console
  console.warn(`service-request-api: no "${name}" endpoint in service-request-api-config.js, the call is skipped`);
}

/**
 * Checks a loan account number.
 * @param {{ loanAccount: string, product: string, partyId: string }} values
 * @param {AbortSignal} [signal]
 * @returns {Promise<boolean>} false when the API says the account is not valid
 * @throws {LeadApiError} the request failed (network, timeout, server error)
 */
export async function verifyLoanAccount(values, signal) {
  if (!ENDPOINTS.verifyLoan) {
    missing('verifyLoan');
    return true;
  }
  const data = await post(ENDPOINTS.verifyLoan, { data: verifyPayload(values) }, signal);
  const answer = data && typeof data === 'object' ? data : {};
  const flag = answer.valid ?? answer.verified ?? answer.isValid;
  return !(flag === false || String(flag).toLowerCase() === 'false');
}

/**
 * Sends a service request: the captcha is checked first (lead form captcha API).
 * @param {Object} values see submitPayload in the config
 * @param {string|null} captcha what the visitor typed; null when the form has no captcha
 * @returns {Promise<Object>} the API's data
 * @throws {LeadApiError} `step` is 'captcha' when the captcha was refused
 */
export const submitServiceRequest = singleFlight(async (values, captcha) => {
  if (captcha !== null) {
    try {
      await verifyCaptcha(captcha);
    } catch (error) {
      error.step = 'captcha';
      throw error;
    }
  }
  if (!ENDPOINTS.submit) {
    missing('submit');
    return {};
  }
  return post(ENDPOINTS.submit, { data: submitPayload(values) });
});

/**
 * Text for a failed request (the field's own message is used for a refused account).
 * @param {Error} error usually a LeadApiError
 * @param {string} fallback shown when the request was refused or failed on the server
 * @returns {string} '' for a cancelled request
 */
export function requestErrorMessage(error, fallback) {
  if (error?.kind === 'cancelled') return '';
  // eslint-disable-next-line no-console
  console.error('service-request-api:', error?.kind, error?.message);
  if (error?.kind === 'timeout') return MESSAGES.timeout;
  if (error?.kind === 'network') return MESSAGES.network;
  return fallback;
}

export { LeadApiError };
