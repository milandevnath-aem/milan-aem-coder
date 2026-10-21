/*
  Keeps the OTP transaction (transactionId + token) between "send OTP" and "verify OTP".

  The values are encrypted with AES-GCM (Web Crypto) before they reach sessionStorage. The
  key is generated per page load, non-extractable and only held in memory, so the stored
  value is unreadable on its own and is dropped on reload (the user simply requests a new
  OTP). Without Web Crypto (insecure context) nothing is written to storage: the values
  stay in memory only.
*/

const STORAGE_KEY = 'lead-otp-session';
const MAX_AGE_MS = 10 * 60 * 1000;

let keyPromise;
let memory = null;

const getKey = () => {
  keyPromise ||= window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return keyPromise;
};
const canEncrypt = () => Boolean(window.crypto?.subtle);

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export function clearOtpSession() {
  memory = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* storage not available */ }
}

/**
 * @param {{ mobile: string, transactionId: string, token: string }} session
 */
export async function saveOtpSession(session) {
  const value = { ...session, savedAt: Date.now() };
  memory = null;
  try {
    if (!canEncrypt()) throw new Error('no Web Crypto');
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(value));
    const cipher = new Uint8Array(
      await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getKey(), data),
    );
    const stored = { iv: toBase64(iv), data: toBase64(cipher) };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // encrypted storage is not possible here: keep the values in memory only
    memory = value;
  }
}

/**
 * The stored transaction of this mobile number, if it is still valid.
 * @param {string} mobile
 * @returns {Promise<{ transactionId: string, token: string } | null>}
 */
export async function loadOtpSession(mobile) {
  let value = memory;
  if (!value) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (stored) {
        const plain = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: fromBase64(stored.iv) },
          await getKey(),
          fromBase64(stored.data),
        );
        value = JSON.parse(new TextDecoder().decode(plain));
      }
    } catch {
      clearOtpSession();
    }
  }
  if (!value || value.mobile !== mobile || Date.now() - value.savedAt > MAX_AGE_MS) return null;
  return { transactionId: value.transactionId, token: value.token };
}
