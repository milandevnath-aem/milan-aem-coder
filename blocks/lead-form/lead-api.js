/*
  Lead form services: send the OTP, then verify it and create the lead in one call.

  Each product has its own service (see lead-config.js). Until a product's endpoints are
  filled in, its form runs in demo mode so every step can be tested: sending always works,
  the OTP 123456 is accepted and any other code shows the "Incorrect OTP" state.

  Flow of a live service:
  1. POST generateOtpUrl { mobile } -> data.transactionId + data.token, kept encrypted
     (lead-session.js)
  2. POST verifyOtpUrl { transactionId, otp, token, lead } -> data.Result, data.LeadNumber
*/

import LEAD_SERVICES from './lead-config.js';
import { saveOtpSession, loadOtpSession, clearOtpSession } from './lead-session.js';

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;

const DEMO_OTP = '123456';
const GENERIC_ERROR = 'Something went wrong. Please try again.';
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** The service of a loan category, live only when both its endpoints are set. */
function serviceFor(category) {
  const service = LEAD_SERVICES.find((s) => s.match.test(category || ''));
  return service?.generateOtpUrl && service?.verifyOtpUrl ? service : null;
}

async function post(url, body) {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return await resp.json().catch(() => ({}));
  } catch {
    return {};
  }
}

/**
 * Sends a one-time password to the mobile number.
 * @param {{ mobile: string, category?: string }} request
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function sendOtp({ mobile, category }) {
  const service = serviceFor(category);
  if (!service) {
    await wait(1200);
    return { ok: true };
  }
  const json = await post(service.generateOtpUrl, { mobile });
  const { transactionId, token } = json.data || {};
  if (json.status !== 'success' || !transactionId || !token) {
    clearOtpSession();
    return { ok: false, message: json.message || GENERIC_ERROR };
  }
  await saveOtpSession({ mobile, transactionId, token });
  return { ok: true };
}

/**
 * Checks the OTP the user entered and creates the lead.
 * @param {Object} request
 * @param {string} request.mobile
 * @param {string} request.otp
 * @param {string} [request.category]
 * @param {Object<string, string>} [request.data] form values
 * @returns {Promise<{ ok: boolean, message?: string, lead?: Object }>}
 */
export async function verifyOtp({
  mobile, otp, category, data = {},
}) {
  const service = serviceFor(category);
  if (!service) {
    await wait(1200);
    return { ok: otp === DEMO_OTP };
  }
  const session = await loadOtpSession(mobile);
  if (!session) return { ok: false, message: 'Your OTP has expired. Please request a new one.' };
  const json = await post(service.verifyOtpUrl, {
    transactionId: session.transactionId,
    otp,
    token: session.token,
    lead: service.toLead(data),
  });
  if (json.status !== 'success') return { ok: false, message: json.message || GENERIC_ERROR };
  clearOtpSession();
  return { ok: true, lead: json.data };
}
