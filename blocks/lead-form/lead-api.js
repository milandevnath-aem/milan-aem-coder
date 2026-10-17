/*
  Lead form services: send the OTP, verify it, submit the lead.

  The services are not connected yet. Until they are, the form runs in demo mode so every
  step can be tested: sending always works, the OTP 123456 is accepted and any other code
  shows the "Incorrect OTP" state. To connect the real services, replace the bodies of the
  three functions below (keep the return shape { ok: boolean }).
*/

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;

const DEMO_OTP = '123456';
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Sends a one-time password to the mobile number.
 * @param {{ mobile: string, category?: string }} request
 * @returns {Promise<{ ok: boolean }>}
 */
export async function sendOtp(request) { // eslint-disable-line no-unused-vars
  // TODO: call the OTP service, e.g. fetch('/api/otp/send', { method: 'POST', body: ... })
  await wait(1200);
  return { ok: true };
}

/**
 * Checks the OTP the user entered.
 * @param {{ mobile: string, otp: string }} request
 * @returns {Promise<{ ok: boolean }>}
 */
export async function verifyOtp({ otp }) {
  // TODO: call the OTP service, e.g. fetch('/api/otp/verify', { method: 'POST', body: ... })
  await wait(1200);
  return { ok: otp === DEMO_OTP };
}

/**
 * Submits the lead once the mobile number is verified.
 * @param {Object<string, string>} data form values
 * @returns {Promise<{ ok: boolean }>}
 */
export async function submitLead(data) { // eslint-disable-line no-unused-vars
  // TODO: call the lead service, e.g. fetch('/api/leads', { method: 'POST', body: ... })
  await wait(300);
  return { ok: true };
}
