import {
  OTP_LENGTH, OTP_VALID_MS, RESEND_SECONDS, errorMessage,
} from './lead-api.js';

let uid = 0;

const iconImg = (name, size = 24, ext = 'svg') => `<img src="${window.hlx.codeBasePath}/icons/${name}.${ext}" alt="" width="${size}" height="${size}">`;

/** "******0679" */
export const maskMobile = (mobile) => `******${String(mobile).slice(-4)}`;

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
 * @param {Function} options.onVerified called with the verifyOtp result once the OTP is accepted
 * @param {Function} options.announce polite screen reader message
 * @returns {HTMLDivElement & { focusFirst: Function, titleId: string, stop: Function }}
 */
export function createOtpStep({
  mobile, sendOtp, verifyOtp, onBack, onVerified, announce,
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
          <p id="${id}-desc"><span class="lead-form-otp-intro">Please enter the OTP that was sent to your mobile number</span> <span class="lead-form-otp-number"></span></p>
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
  view.querySelector('.lead-form-otp-number').textContent = maskMobile(mobile);

  const boxes = view.querySelector('.lead-form-otp-boxes');
  const error = view.querySelector('.lead-form-otp-error');
  const validate = view.querySelector('.lead-form-validate');
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
  // when the current OTP was sent, to tell an expired OTP from a wrong one
  let sentAt = Date.now();

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
    validate.setAttribute('aria-disabled', code().length < OTP_LENGTH || busy);
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
      setError('');
      refresh();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
      if (digits) fill(i, digits);
      setError('');
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
  resend.addEventListener('click', async () => {
    if (seconds > 0 || busy) return;
    busy = true;
    resend.setAttribute('aria-disabled', 'true');
    announce('Sending a new OTP');
    try {
      await sendOtp();
    } catch (e) {
      const message = errorMessage(e, 'resend');
      if (message) setError(message);
      resend.setAttribute('aria-disabled', 'false');
      return;
    } finally {
      busy = false;
    }
    sentAt = Date.now();
    view.querySelector('.lead-form-otp-intro').textContent = 'Please enter the OTP which was re-sent to your mobile number';
    inputs.forEach((input) => { input.value = ''; });
    setError('');
    refresh();
    startTimer();
    announce(`A new OTP has been sent to ${maskMobile(mobile)}.`);
    inputs[0].focus();
  });

  validate.addEventListener('click', async () => {
    if (busy) return;
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
    try {
      result = await verifyOtp(code());
    } catch (e) {
      e.expired = Date.now() - sentAt > OTP_VALID_MS;
      message = errorMessage(e, 'verify');
    }
    busy = false;
    inputs.forEach((input) => { input.readOnly = false; });
    setLoading(validate, false);
    refresh();
    if (result) {
      clearInterval(timer);
      onVerified(result);
    } else if (message) {
      setError(message);
      inputs[0].focus();
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
      <p>Thank you for sharing the details. We will get back to you.</p>
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
