import {
  OTP_LENGTH, OTP_VALID_MS, RESEND_SECONDS, errorMessage,
} from './lead-api.js';
import { MAX_RESENDS, MAX_WRONG_OTPS, MESSAGES } from './lead-api-config.js';
import { uniqueId } from '../../scripts/analytics.js';

let uid = 0;

const iconImg = (name, size = 24, ext = 'svg') => `<img src="${window.hlx.codeBasePath}/icons/${name}.${ext}" alt="" width="${size}" height="${size}">`;

/** "******0679" */
export const maskMobile = (mobile) => `******${String(mobile).slice(-4)}`;

/**
 * Whether a refused OTP was a wrong one (counts towards MAX_WRONG_OTPS): INVALID_OTP or
 * OTP_ATTEMPTS_EXCEEDED, or a refusal without a code. An expired OTP, a server or network
 * error, or another refusal (BAD_REQUEST...) does not count.
 * @param {Error & { kind?: string, status?: number, code?: string }} failure
 * @param {string} message what errorMessage shows for it
 * @returns {boolean}
 */
function isWrongOtp(failure, message) {
  if (message === MESSAGES.OTP_EXPIRED) return false;
  const code = typeof failure?.code === 'string' ? failure.code : '';
  if (code) return code === 'INVALID_OTP' || code === 'OTP_ATTEMPTS_EXCEEDED';
  return failure?.kind === 'rejected' || (failure?.kind === 'http' && failure.status < 500);
}

/**
 * Loading spinner (decorative; the state is announced separately).
 * @returns {HTMLSpanElement}
 */
export function spinner() {
  const el = document.createElement('span');
  el.className = 'lead-form-spinner';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/**
 * Puts a button into its loading state (spinner instead of the label) and back.
 * @param {HTMLButtonElement} button
 * @param {boolean} loading
 * @param {string} busyLabel accessible name while loading
 */
export function setLoading(button, loading, busyLabel = 'Please wait') {
  if (loading) {
    button.dataset.label = button.textContent;
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-label', busyLabel);
    button.replaceChildren(spinner());
  } else {
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
    button.removeAttribute('aria-label');
    button.textContent = button.dataset.label || button.textContent;
  }
}

/**
 * OTP step: six one-digit boxes, Validate, resend timer, wrong OTP state.
 * @param {Object} options
 * @param {string} options.mobile ten-digit mobile number
 * @param {Function} options.sendOtp sends a new OTP (session.sendOtp, see lead-api.js)
 * @param {Function} options.verifyOtp checks the OTP, resolves with the lead (session.verifyOtp)
 * @param {Function} options.onBack back to the form
 * @param {Function} [options.onCaptchaRequired] back to the form for a new captcha, called
 *   with the message to show there (CAPTCHA_REQUIRED: the session or token expired);
 *   onBack when not given
 * @param {Function} options.onVerified called with the verifyOtp result once the OTP is accepted
 * @param {Function} options.announce polite screen reader message
 * @returns {HTMLDivElement & { focusFirst: Function, titleId: string, stop: Function }}
 */
export function createOtpStep({
  mobile, sendOtp, verifyOtp, onBack, onCaptchaRequired = onBack, onVerified, announce,
}) {
  uid += 1;
  const id = `lead-form-otp-${uid}`;
  const view = document.createElement('div');
  view.className = 'lead-form-step lead-form-otp';
  view.innerHTML = `
    <button type="button" class="lead-form-back" aria-label="Back to the form">${iconImg('arrow-left')}</button>
    <div class="lead-form-otp-body">
      <div class="lead-form-otp-top">
        <div class="lead-form-otp-title">
          <h2 id="${id}-title" tabindex="-1">Enter OTP</h2>
          <p id="${id}-desc"></p>
        </div>
        <div class="lead-form-otp-group">
          <div class="lead-form-otp-boxes" role="group" aria-labelledby="${id}-title" aria-describedby="${id}-desc"></div>
          <p class="lead-form-otp-error" id="${id}-error" role="alert" hidden></p>
        </div>
      </div>
      <div class="lead-form-otp-actions">
        <button type="button" class="button primary lead-form-validate" aria-disabled="true">Validate</button>
        <p class="lead-form-resend"><span>Didn’t receive the OTP?</span> <button type="button" class="lead-form-resend-button"></button></p>
      </div>
    </div>`;
  view.titleId = `${id}-title`;
  const desc = view.querySelector(`#${id}-desc`);
  /**
   * The message under the title (MESSAGES.otpSent...), with the masked number in place of
   * {mobile}; in red for an error.
   * @param {string} template
   * @param {boolean} [isError]
   */
  const showIntro = (template, isError = false) => {
    const [before, after] = template.split('{mobile}');
    if (after === undefined) {
      desc.replaceChildren(before);
    } else {
      const number = document.createElement('span');
      number.className = 'lead-form-otp-number';
      number.textContent = maskMobile(mobile);
      desc.replaceChildren(before, number, after);
    }
    desc.classList.toggle('is-error', isError);
  };
  showIntro(MESSAGES.otpSent);

  const boxes = view.querySelector('.lead-form-otp-boxes');
  const error = view.querySelector('.lead-form-otp-error');
  const validate = view.querySelector('.lead-form-validate');
  validate.id = uniqueId('lead-form-otp-validate');
  const resend = view.querySelector('.lead-form-resend-button');
  const inputs = [...Array(OTP_LENGTH)].map((_, i) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'lead-form-otp-digit';
    input.inputMode = 'numeric';
    input.autocomplete = i === 0 ? 'one-time-code' : 'off';
    input.setAttribute('aria-label', `Digit ${i + 1} of ${OTP_LENGTH}`);
    boxes.append(input);
    return input;
  });

  const code = () => inputs.map((input) => input.value).join('');
  let busy = false;
  // OTP_ATTEMPTS_EXCEEDED: this OTP is blocked by the backend until a resend
  let blocked = false;
  // when the current OTP was sent, to tell an expired OTP from a wrong one
  let sentAt = Date.now();
  // successful resends and wrong OTPs on this screen (MAX_RESENDS, MAX_WRONG_OTPS)
  let resends = 0;
  let wrongOtps = 0;
  // no resend left: the Resend link is gone for good
  let exhausted = false;
  // MAX_WRONG_OTPS wrong OTPs: no Validate, and Resend sends nothing
  let locked = false;

  const setError = (message) => {
    error.hidden = !message;
    error.textContent = message || '';
    boxes.classList.toggle('is-invalid', Boolean(message));
    inputs.forEach((input) => {
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', error.id);
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    });
  };
  const refresh = () => {
    validate.setAttribute('aria-disabled', code().length < OTP_LENGTH || busy || blocked);
    inputs.forEach((input) => input.classList.toggle('is-filled', Boolean(input.value)));
  };

  // typing, pasting and SMS autofill: digits only, spread over the boxes
  const fill = (start, digits) => {
    let index = start;
    [...digits].forEach((digit) => {
      if (index < OTP_LENGTH) {
        inputs[index].value = digit;
        index += 1;
      }
    });
    inputs[Math.min(index, OTP_LENGTH - 1)].focus();
  };
  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      input.value = '';
      if (digits) fill(i, digits);
      // a blocked OTP keeps its message until a resend
      if (!blocked) setError('');
      refresh();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
      if (digits) fill(i, digits);
      if (!blocked) setError('');
      refresh();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        e.preventDefault();
        inputs[i - 1].value = '';
        inputs[i - 1].focus();
        refresh();
      } else if (e.key === 'ArrowLeft' && i > 0) {
        e.preventDefault();
        inputs[i - 1].focus();
      } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
        e.preventDefault();
        inputs[i + 1].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        validate.click();
      }
    });
    input.addEventListener('focus', () => input.select());
  });

  // resend timer
  let seconds = RESEND_SECONDS;
  let timer;
  const renderResend = () => {
    const waiting = seconds > 0;
    resend.textContent = waiting ? `Resend OTP in 0:${String(seconds).padStart(2, '0')}` : 'Resend OTP';
    resend.setAttribute('aria-disabled', waiting);
  };
  const startTimer = () => {
    clearInterval(timer);
    seconds = RESEND_SECONDS;
    renderResend();
    timer = setInterval(() => {
      seconds -= 1;
      renderResend();
      if (seconds <= 0) {
        clearInterval(timer);
        announce('You can resend the OTP now.');
      }
    }, 1000);
  };
  const clearDigits = () => {
    inputs.forEach((input) => { input.value = ''; });
    refresh();
  };
  /** The boxes are emptied and switched off for good (greyed, no typing, no cursor). */
  const disableBoxes = () => {
    blocked = true;
    clearDigits();
    inputs.forEach((input) => { input.disabled = true; });
    boxes.classList.add('is-disabled');
  };
  /** Resend leaves the screen; focus goes to the title so it is not lost with the link. */
  const removeResend = () => {
    clearInterval(timer);
    resend.closest('.lead-form-resend').hidden = true;
    view.querySelector('h2').focus();
  };
  /**
   * No resend left (the click after MAX_RESENDS, or RESEND_LIMIT from the API): the top
   * message says so in red, the boxes are switched off, the Resend link goes.
   */
  const exhaustResends = () => {
    exhausted = true;
    disableBoxes();
    showIntro(MESSAGES.resendExhausted, true);
    removeResend();
    announce(MESSAGES.resendExhausted);
  };
  /**
   * The last wrong OTP (MAX_WRONG_OTPS): the boxes are switched off; Resend stays, but sends
   * nothing (see its click).
   */
  const lockOut = () => {
    locked = true;
    disableBoxes();
    setError(MESSAGES.otpLocked);
  };
  /**
   * What the OTP step does about a failed request beyond showing its message.
   * @returns {boolean} true when the message must not be shown under the boxes: the step is
   *   left (back to the captcha) or the top message says it (no resend left)
   */
  const handleCode = (failure, message) => {
    const failureCode = typeof failure?.code === 'string' ? failure.code : '';
    if (failureCode === 'CAPTCHA_REQUIRED') {
      // the session (5 minutes) or the token expired: start again from the captcha
      clearInterval(timer);
      onCaptchaRequired(message);
      return true;
    }
    if (failureCode === 'RESEND_TOO_SOON') startTimer();
    if (failureCode === 'RESEND_LIMIT') {
      // the API's own limit: the same red top message as ours, not the API's text
      exhaustResends();
      return true;
    }
    if (failureCode === 'OTP_ATTEMPTS_EXCEEDED') {
      blocked = true;
      clearDigits();
    }
    if (failureCode === 'INVALID_OTP') clearDigits();
    return false;
  };

  resend.addEventListener('click', async () => {
    if (seconds > 0 || busy || exhausted) return;
    // locked by wrong OTPs: nothing is sent, the message under the boxes says why. The link
    // stays and looks the same (no aria-disabled, which greys it), but later clicks do nothing.
    if (locked) {
      exhausted = true;
      setError(MESSAGES.resendExhausted);
      announce(MESSAGES.resendExhausted);
      return;
    }
    // the click after the last allowed resend: nothing is sent
    if (resends >= MAX_RESENDS) {
      exhaustResends();
      return;
    }
    busy = true;
    resend.setAttribute('aria-disabled', 'true');
    announce('Sending a new OTP');
    try {
      await sendOtp();
    } catch (e) {
      const message = errorMessage(e, 'resend');
      busy = false;
      // CAPTCHA_REQUIRED (token expired, used or not for this mobile): handleCode goes back
      // to the form for a new captcha and shows why; RESEND_LIMIT: the red top message
      if (handleCode(e, message)) return;
      if (message) setError(message);
      // RESEND_TOO_SOON restarted the countdown, which keeps the button off
      if (seconds <= 0) resend.setAttribute('aria-disabled', 'false');
      return;
    } finally {
      busy = false;
    }
    blocked = false;
    sentAt = Date.now();
    resends += 1;
    showIntro(resends >= MAX_RESENDS ? MESSAGES.otpResentLast : MESSAGES.otpResent);
    inputs.forEach((input) => { input.value = ''; });
    setError('');
    refresh();
    startTimer();
    announce(`A new OTP has been sent to ${maskMobile(mobile)}.`);
    inputs[0].focus();
  });

  validate.addEventListener('click', async () => {
    if (busy || blocked) return;
    if (code().length < OTP_LENGTH) {
      inputs.find((input) => !input.value)?.focus();
      return;
    }
    busy = true;
    inputs.forEach((input) => { input.readOnly = true; });
    setLoading(validate, true, 'Validating OTP');
    refresh();
    let result;
    let message = '';
    let failure;
    try {
      result = await verifyOtp(code());
    } catch (e) {
      failure = e instanceof Error ? e : new Error(String(e));
      failure.expired = Date.now() - sentAt > OTP_VALID_MS;
      message = errorMessage(failure, 'verify');
    }
    busy = false;
    inputs.forEach((input) => { input.readOnly = false; });
    setLoading(validate, false);
    refresh();
    if (result) {
      clearInterval(timer);
      // the lead is created: Validate stays off so it is not sent twice
      validate.setAttribute('aria-disabled', 'true');
      busy = true;
      onVerified(result);
    } else if (failure && !handleCode(failure, message)) {
      if (isWrongOtp(failure, message)) {
        wrongOtps += 1;
        clearDigits();
        if (wrongOtps >= MAX_WRONG_OTPS) {
          lockOut();
          return;
        }
        message = MESSAGES.wrongOtpAttemptsLeft.replace('{attempts}', MAX_WRONG_OTPS - wrongOtps);
      }
      if (!message) return;
      setError(message);
      // blocked: the way on is Resend OTP (focused once its countdown allows it)
      if (blocked && seconds <= 0) resend.focus();
      else inputs[0].focus();
    }
  });

  view.querySelector('.lead-form-back').addEventListener('click', () => {
    clearInterval(timer);
    onBack();
  });

  startTimer();
  refresh();
  view.focusFirst = () => inputs[0].focus();
  view.stop = () => clearInterval(timer);
  return view;
}

/**
 * Success step: "You're all set!", calculate EMI or finish.
 * @param {Object} options
 * @param {string} options.emiHref link to the EMI calculator
 * @param {Function} options.onDone "Got it"
 * @returns {HTMLDivElement & { titleId: string, focusTitle: Function }}
 */
export function createSuccessStep({ emiHref, onDone }) {
  uid += 1;
  const id = `lead-form-success-${uid}`;
  const view = document.createElement('div');
  view.className = 'lead-form-step lead-form-success';
  view.innerHTML = `
    <div class="lead-form-success-status">
      ${iconImg('verified', 48, 'png')}
      <h2 id="${id}-title" tabindex="-1">You’re all set!</h2>
      <p>Thank you for choosing Kotak Mahindra Prime!<br>Our team will contact you shortly.</p>
    </div>
    <div class="lead-form-success-actions">
      <a class="button secondary lead-form-emi"></a>
      <button type="button" class="button primary lead-form-done">Got it</button>
    </div>`;
  view.titleId = `${id}-title`;
  const emi = view.querySelector('.lead-form-emi');
  emi.href = emiHref;
  emi.textContent = 'Calculate your EMI';
  view.querySelector('.lead-form-done').addEventListener('click', onDone);
  view.focusTitle = () => view.querySelector('h2').focus();
  return view;
}
