/*
  Lead form services: send the OTP, then verify it and create the lead in one call.

  All forms share the same two endpoints (see lead-config.js); the selected loan category
  travels in the lead as "product". Until the endpoints are filled in, the forms run in
  demo mode so every step can be tested: sending always works, the OTP 123456 is accepted
  and any other code shows the "Incorrect OTP" state.

  Flow of a live form:
  1. POST GENERATE_OTP_URL { mobile } -> data.transactionId + data.token, kept encrypted
     (lead-session.js)
  2. POST VERIFY_OTP_URL { transactionId, otp, token, lead } -> data.Result, data.LeadNumber
*/

import { GENERATE_OTP_URL, VERIFY_OTP_URL, toLead } from './lead-config.js';
import { saveOtpSession, loadOtpSession, clearOtpSession } from './lead-session.js';

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;

const DEMO_OTP = '123456';
const GENERIC_ERROR = 'Something went wrong. Please try again.';
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const isLive = () => Boolean(GENERATE_OTP_URL && VERIFY_OTP_URL);

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
 * @param {{ mobile: string }} request
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function sendOtp({ mobile }) {
  if (!isLive()) {
    await wait(1200);
    return { ok: true };
  }
  const json = await post(GENERATE_OTP_URL, { mobile });
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
 * @param {string} [request.product] identifier of the selected category, sent as lead.product
 * @param {Object<string, string>} [request.data] form values
 * @returns {Promise<{ ok: boolean, message?: string, lead?: Object }>}
 */
export async function verifyOtp({
  mobile, otp, product, data = {},
}) {
  if (!isLive()) {
    await wait(1200);
    return { ok: otp === DEMO_OTP };
  }
  const session = await loadOtpSession(mobile);
  if (!session) return { ok: false, message: 'Your OTP has expired. Please request a new one.' };
  const json = await post(VERIFY_OTP_URL, {
    transactionId: session.transactionId,
    otp,
    token: session.token,
    lead: toLead(data, product),
  });
  if (json.status !== 'success') return { ok: false, message: json.message || GENERIC_ERROR };
  clearOtpSession();
  return { ok: true, lead: json.data };
}
