import { getMetadata } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { createDropdown } from '../../scripts/dropdown.js';
import {
  CAPTCHA_LENGTH, createLeadSession, errorMessage as apiErrorMessage, generateCaptcha, isDemo,
} from './lead-api.js';
import { buildLead, productFor } from './lead-payload.js';
import {
  createOtpStep, createSuccessStep, setLoading, spinner,
} from './lead-form-otp.js';
import {
  readForms, rememberForms, rememberedForms, resolveForm, slug,
} from '../../scripts/category-forms.js';

function iconButton(name, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `lead-form-icon-button lead-form-${name}`;
  button.setAttribute('aria-label', label);
  button.innerHTML = `<img src="${window.hlx.codeBasePath}/icons/${name}.svg" alt="" width="24" height="24">`;
  return button;
}

/**
 * "A, B: description, *C" -> options; a leading * marks the default.
 */
function parseOptions(text) {
  let value = '';
  const options = text.split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
    const isDefault = part.startsWith('*');
    const [label, ...rest] = part.replace(/^\*\s*/, '').split(':');
    const option = { value: label.trim(), label: label.trim(), description: rest.join(':').trim() };
    if (isDefault) value = option.value;
    return option;
  });
  return { options, value };
}

let errorCount = 0;

/**
 * Text error message shown under a field and linked to its control (WCAG 3.3.1).
 * @param {HTMLElement} control the focusable control (input or dropdown button)
 * @param {string} message error text
 * @returns {{ el: HTMLParagraphElement, show: Function }} show(invalid, text): text replaces
 *   the message once (e.g. an API error), the next call shows the default message again
 */
function fieldError(control, message) {
  errorCount += 1;
  const el = document.createElement('p');
  el.className = 'lead-form-error';
  el.id = `lead-form-error-${errorCount}`;
  el.hidden = true;
  el.textContent = message;
  const described = control.getAttribute('aria-describedby');
  control.setAttribute('aria-describedby', [described, el.id].filter(Boolean).join(' '));
  const show = (invalid, text = message) => {
    el.textContent = text;
    el.hidden = !invalid;
    if (invalid) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  };
  return { el, show };
}

function errorMessage(label, kind) {
  if (kind === 'tel') return 'Enter a valid 10-digit mobile number';
  if (kind === 'email') return 'Enter a valid email address';
  if (kind === 'zip') return 'Enter a valid 6-digit PIN code';
  if (kind === 'select' || kind === 'search') return `Select ${label.toLowerCase()}`;
  if (kind === 'captcha') return 'Enter the characters shown in the image';
  return `Enter your ${label.toLowerCase().replace(/^your /, '')}`;
}

/**
 * Keeps an input to digits only, up to a length: other typed characters are blocked,
 * pasted, dropped or autofilled text is cleaned (the caret stays after the same digit).
 * @param {HTMLInputElement} input
 * @param {number} max maximum number of digits
 */
function digitsOnly(input, max) {
  input.addEventListener('beforeinput', (e) => {
    if (!e.data || !e.inputType.startsWith('insert')) return;
    const room = max - (input.value.length - (input.selectionEnd - input.selectionStart));
    // a typed non-digit, or digits with no room left; longer mixed text (a pasted
    // "560 001") goes through and is cleaned below
    if (/^\D$/.test(e.data) || (/^\d+$/.test(e.data) && e.data.length > room)) e.preventDefault();
  });
  // runs before the form's own input listener, so validation sees the cleaned value
  input.addEventListener('input', () => {
    const clean = input.value.replace(/\D/g, '').slice(0, max);
    if (clean === input.value) return;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;
    input.value = clean;
    const pos = Math.min(digitsBefore, clean.length);
    input.setSelectionRange(pos, pos);
  });
}

function textField(label, kind, required) {
  const field = document.createElement('label');
  field.className = `lead-form-input lead-form-${kind}`;
  const input = document.createElement(kind === 'textarea' ? 'textarea' : 'input');
  input.name = slug(label);
  input.placeholder = ' ';
  input.required = required;
  const span = document.createElement('span');
  span.className = 'lead-form-label';
  span.textContent = label;
  if (kind === 'tel') {
    const prefix = document.createElement('span');
    prefix.className = 'lead-form-prefix';
    prefix.textContent = '+91';
    field.append(prefix);
    Object.assign(input, {
      type: 'tel', inputMode: 'numeric', pattern: '[6-9][0-9]{9}', autocomplete: 'tel-national',
    });
    digitsOnly(input, 10);
  } else if (kind === 'email') {
    Object.assign(input, { type: 'email', autocomplete: 'email' });
  } else if (kind === 'zip') {
    Object.assign(input, {
      type: 'text', inputMode: 'numeric', pattern: '[1-9][0-9]{5}', autocomplete: 'postal-code',
    });
    digitsOnly(input, 6);
  } else {
    input.type = 'text';
    // first and last name get their own autofill values, or the full name fills both;
    // a company ("Account name") is not a person's name
    if (/\b(first|given)\b.*name/i.test(label)) input.autocomplete = 'given-name';
    else if (/\b(last|sur|family)\s*name/i.test(label)) input.autocomplete = 'family-name';
    else if (/\b(account|company|business|organi[sz]ation)\b/i.test(label)) input.autocomplete = 'organization';
    else if (/name/i.test(label)) input.autocomplete = 'name';
  }
  const control = document.createElement('span');
  control.className = 'lead-form-control';
  control.append(input, span);
  field.append(control);
  return field;
}

/**
 * Multi-line field with a character count ("125/150") under the text.
 * @param {string} label field label
 * @param {boolean} required
 * @param {number} max character limit
 */
function textareaField(label, required, max) {
  errorCount += 1;
  const id = `lead-form-textarea-${errorCount}`;
  // a div, not a label: the count and limit must not join the field's name
  const field = document.createElement('div');
  field.className = 'lead-form-input lead-form-textarea';
  const textarea = document.createElement('textarea');
  Object.assign(textarea, {
    id, name: slug(label), placeholder: ' ', required, maxLength: max, rows: 3,
  });
  const name = document.createElement('label');
  name.className = 'lead-form-label';
  name.htmlFor = id;
  name.textContent = label;
  const control = document.createElement('span');
  control.className = 'lead-form-control';
  control.append(textarea, name);
  // the count is visual only; screen readers hear the limit once instead of every keystroke
  const count = document.createElement('span');
  count.className = 'lead-form-count';
  count.setAttribute('aria-hidden', 'true');
  const hint = document.createElement('span');
  hint.className = 'visually-hidden';
  hint.id = `${id}-hint`;
  hint.textContent = `Up to ${max} characters`;
  textarea.setAttribute('aria-describedby', hint.id);
  const update = () => { count.textContent = `${textarea.value.length}/${max}`; };
  textarea.addEventListener('input', update);
  update();
  field.addEventListener('click', (e) => { if (e.target === field) textarea.focus(); });
  field.append(control, count, hint);
  return field;
}

/** "aB3" -> "small a, capital B, 3" (the captcha is case-sensitive) */
const spell = (code) => [...code]
  .map((c) => {
    if (/[A-Z]/.test(c)) return `capital ${c}`;
    if (/[a-z]/.test(c)) return `small ${c}`;
    return c;
  })
  .join(', ');

/**
 * Captcha from the captcha API (see lead-api.js): image, refresh, listen and the code field.
 * `field.load()` asks for a new image (on opening the form, refresh, and after every
 * attempt, as each captcha is single-use); `field.onError(message)` shows a failed load.
 * @param {string} label field label
 * @returns {HTMLDivElement & { load: Function, isValid: Function, input: HTMLInputElement }}
 */
function captchaField(label) {
  const field = document.createElement('div');
  field.className = 'lead-form-captcha';
  const frame = document.createElement('div');
  frame.className = 'lead-form-captcha-frame';
  const image = document.createElement('img');
  image.className = 'lead-form-captcha-image';
  image.alt = 'Captcha: type the characters shown in this image';
  image.width = 168;
  image.height = 68;
  image.hidden = true;
  const loader = spinner();
  frame.append(image, loader);
  const tools = document.createElement('div');
  tools.className = 'lead-form-captcha-tools';
  const refresh = iconButton('refresh', 'Show a new captcha');
  const listen = iconButton('volume', 'Listen to the captcha');
  tools.append(refresh, listen);
  const control = textField(label || 'Enter the captcha shown', 'text', true);
  const input = control.querySelector('input');
  // case-sensitive: no automatic capitals or corrections on phones
  Object.assign(input, {
    name: 'captcha', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, maxLength: CAPTCHA_LENGTH,
  });
  field.append(frame, tools, control);
  field.input = input;

  let code = ''; // demo mode only
  let request = null;
  field.load = async () => {
    // the newest request wins: only its captcha matches the cookie
    request?.abort();
    request = new AbortController();
    const { signal } = request;
    code = '';
    field.classList.add('is-loading');
    field.setAttribute('aria-busy', 'true');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    try {
      const captcha = await generateCaptcha(signal);
      if (signal.aborted) return;
      image.src = captcha.image;
      image.hidden = false;
      code = captcha.code;
    } catch (error) {
      if (signal.aborted) return;
      image.hidden = true;
      field.onError?.(apiErrorMessage(error, 'captcha-load'));
    }
    field.classList.remove('is-loading');
    field.removeAttribute('aria-busy');
  };
  refresh.addEventListener('click', () => field.load());
  listen.addEventListener('click', () => {
    // TODO audio captcha: play the audio of the captcha-audio API once the backend has it;
    // until then only the demo captcha (its text is known in the browser) can be read out
    if (!isDemo() || !code || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(spell(code));
    utterance.rate = 0.7;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
  field.isValid = () => new RegExp(`^\\S{${CAPTCHA_LENGTH}}$`).test(input.value);
  return field;
}

function buildDisclaimer(cell) {
  const wrapper = document.createElement('div');
  wrapper.className = 'lead-form-disclaimer';
  while (cell.firstChild) wrapper.append(cell.firstChild);
  const label = wrapper.querySelector('p:first-child > strong:only-child');
  if (label) label.parentElement.classList.add('lead-form-disclaimer-label');
  const list = wrapper.querySelector('ol, ul');
  if (list && list.children.length > 1) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lead-form-more';
    toggle.textContent = 'Read More';
    toggle.setAttribute('aria-expanded', 'false');
    wrapper.classList.add('is-collapsed');
    toggle.addEventListener('click', () => {
      const collapsed = wrapper.classList.toggle('is-collapsed');
      toggle.textContent = collapsed ? 'Read More' : 'Read Less';
      toggle.setAttribute('aria-expanded', !collapsed);
    });
    wrapper.append(toggle);
  }
  return wrapper;
}

/** "Two-Wheeler Loans" and "two-wheeler loan" match */
const normalize = (text) => text.toLowerCase().replace(/[^a-z]/g, '').replace(/loans?$/, '');

/**
 * The page's own product, so the form opens with it preselected: the hero category
 * dropdown on product pages, else the page metadata "loan-category".
 */
function pageCategory() {
  const hero = document.querySelector('main .hero-loan-select');
  return hero?.value || getMetadata('loan-category') || '';
}

/**
 * Opens the form of the picked product (see scripts/category-forms.js: the page at the
 * product's position in the block's "Category forms", else the shared form).
 * What was entered so far is carried over. A form opened for a category (from the hero or
 * another form) keeps the mapping it was opened with when it has none of its own.
 * @param {HTMLDialogElement} dialog the open modal
 * @param {string} category the picked product
 * @param {string[]} categories all products of the dropdown
 * @param {string[]} ownForms this form's authored "Category forms"
 * @param {HTMLFormElement} form the open form
 */
async function openFormFor(dialog, category, categories, ownForms, form) {
  const path = dialog.dataset.modalPath;
  const remembered = rememberedForms(dialog);
  const own = ownForms.length > 0;
  const forms = own ? ownForms : remembered.forms;
  // the forms are listed in the order of the categories of the block that has them
  const order = own ? categories : remembered.categories;
  // a form opened without its opener is taken as the shared one unless it is a category's own
  const shared = remembered.shared || (forms.includes(path) ? '' : path);
  const target = await resolveForm(category, { forms, fallback: shared, categories: order });
  const page = (p) => p.replace(/(\.plain)?\.html$/, '');
  if (!target || page(target) === page(path)) return; // already the right form

  const data = Object.fromEntries(new FormData(form));
  delete data.captcha;
  // first + last name become one name for a form that asks for it once
  if (data['first-name'] || data['last-name']) {
    data.name = [data['first-name'], data['last-name']].filter(Boolean).join(' ');
  }
  data.category = category;

  const { openModal } = await import('../modal/modal.js');
  const modal = await openModal(target, { prefill: data });
  if (!modal) return;
  rememberForms(modal.dialog, { forms, categories: order, shared });
  modal.dialog.querySelector('.lead-form .dropdown-field')?.focus();
}

/** Site root next to the nav fragment (e.g. /content/kmpl locally, / when published) */
function siteRoot() {
  const nav = getMetadata('nav');
  const path = nav ? new URL(nav, window.location).pathname : '/nav';
  return path.replace(/\/(fragments\/)?nav$/, '');
}

/**
 * Lead form ("Start Your Loan Journey Today"). Block properties: heading, disclaimer,
 * note and button label; each item is a field (label, type, options, required).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const config = rows.filter((row) => row.children.length <= 1);
  const fieldRows = rows.filter((row) => row.children.length > 1);
  const [textRow, disclaimerRow, noteRow, submitRow, formsRow] = config;
  // "Category forms": the form (modal page) of each category that has one of its own
  const forms = readForms(formsRow);

  const intro = document.createElement('div');
  intro.className = 'lead-form-intro';
  const textCell = textRow?.firstElementChild;
  if (textCell?.textContent.trim()) {
    moveInstrumentation(textRow, intro);
    while (textCell.firstChild) intro.append(textCell.firstChild);
  }

  const form = document.createElement('form');
  form.noValidate = true;
  form.className = 'lead-form-form';
  const fields = document.createElement('div');
  fields.className = 'lead-form-fields';
  const dropdowns = [];
  const checks = [];
  let captcha;

  fieldRows.forEach((row) => {
    const [labelCell, kindCell, optionsCell, requiredCell, halfCell] = row.children;
    const label = labelCell?.textContent.trim() || 'Field';
    let kind = kindCell?.textContent.trim() || 'text';
    const optionsText = optionsCell?.textContent.trim() || '';
    // fields left as plain text: a description is multi-line, a field with a list of
    // options is a dropdown (searchable when the list is long)
    if (kind === 'text' && /descri|message|comment|remark/i.test(label)) kind = 'textarea';
    else if (kind === 'text' && optionsText.includes(',')) {
      kind = optionsText.split(',').length > 6 ? 'search' : 'select';
    }
    const required = requiredCell?.textContent.trim() !== 'false';
    // each field and its error share one grid cell; half-width cells pair up on a line
    const item = document.createElement('div');
    item.className = 'lead-form-item';
    // "Text (half width)" fields, or any field with Half width ticked, share a line (desktop)
    if (kind === 'text-half' || halfCell?.textContent.trim() === 'true') item.classList.add('is-half');
    let field;
    if (kind === 'select' || kind === 'search') {
      const { options, value } = parseOptions(optionsText);
      field = createDropdown({
        label,
        name: slug(label),
        options,
        value,
        required,
        search: kind === 'search',
        searchPlaceholder: `Search ${label.toLowerCase()}`,
        pinSelected: true,
      });
      field.optionValues = options.map((option) => option.value);
      dropdowns.push(field);
    } else if (kind === 'captcha') {
      field = captchaField(label);
      captcha = field;
    } else if (kind === 'textarea') {
      field = textareaField(label, required, parseInt(optionsText, 10) || 150);
    } else {
      field = textField(label, kind === 'text-half' ? 'text' : kind, required);
    }
    moveInstrumentation(row, field);
    // text error under each field: what is wrong and how to fix it
    const control = field.querySelector('.dropdown-field') || field.querySelector('input:not([type="hidden"]), textarea');
    item.append(field);
    if (control) {
      const error = fieldError(control, errorMessage(label, kind));
      const isDropdown = dropdowns.includes(field);
      let valid = () => control.checkValidity();
      if (field === captcha) valid = () => captcha.isValid();
      if (isDropdown) valid = () => !field.dataset.required || Boolean(field.value);
      checks.push({
        field, control, error, valid,
      });
      item.append(error.el);
    }
    fields.append(item);
  });
  form.append(fields);

  const legal = document.createElement('div');
  legal.className = 'lead-form-legal';
  const disclaimerCell = disclaimerRow?.firstElementChild;
  if (disclaimerCell?.textContent.trim()) {
    const disclaimer = buildDisclaimer(disclaimerCell);
    moveInstrumentation(disclaimerRow, disclaimer);
    legal.append(disclaimer);
  }
  const noteText = noteRow?.textContent.trim();
  if (noteText) {
    const note = document.createElement('p');
    note.className = 'lead-form-note';
    note.textContent = noteText;
    moveInstrumentation(noteRow, note);
    legal.append(note);
  }
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button primary lead-form-submit';
  submit.textContent = submitRow?.textContent.trim() || 'Apply now';
  if (submitRow) moveInstrumentation(submitRow, submit);
  // a failed request (OTP not sent) is shown above the button
  const submitError = document.createElement('p');
  submitError.className = 'lead-form-error lead-form-submit-error';
  submitError.setAttribute('role', 'alert');
  submitError.hidden = true;
  const showSubmitError = (message) => {
    submitError.textContent = message;
    submitError.hidden = !message;
  };
  legal.append(submitError, submit);
  form.append(legal);

  const isValid = () => form.checkValidity()
    && dropdowns.every((d) => !d.dataset.required || d.value)
    && (!captcha || captcha.isValid());
  // message: an API error to show instead of the field's own message
  const setState = (check, invalid, message) => {
    check.error.show(invalid, message);
    const box = check.field.closest('.lead-form-input')
      || check.field.querySelector('.lead-form-input') || check.field;
    box.classList.toggle('is-invalid', invalid);
  };
  // the button stays focusable while the form is incomplete (aria-disabled, not disabled);
  // submitting then lists what is missing
  const refresh = () => {
    submit.setAttribute('aria-disabled', !isValid());
  };
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  refresh();

  // mark fields the user left with an invalid value; clear the message while correcting
  form.addEventListener('focusout', (e) => {
    const check = checks.find((c) => c.control === e.target);
    if (!check || !e.target.value) return;
    setState(check, !check.valid());
  });
  form.addEventListener('input', (e) => {
    showSubmitError('');
    const check = checks.find((c) => c.control === e.target);
    if (check) setState(check, false);
  });
  dropdowns.forEach((d) => d.addEventListener('change', () => {
    const check = checks.find((c) => c.field === d);
    if (check) setState(check, false);
  }));

  // API errors go under the field they are about, anything else above the button
  const captchaCheck = checks.find((c) => c.field === captcha);
  const mobileCheck = checks.find((c) => c.control.type === 'tel');
  if (captcha) {
    captcha.onError = (message) => {
      if (captchaCheck) setState(captchaCheck, true, message);
      else showSubmitError(message);
    };
  }
  /**
   * Shows a failed submit (captcha verification or OTP generation).
   * @param {Error} error see LeadApiError in lead-api.js
   */
  const showSubmitFailure = (error) => {
    const message = apiErrorMessage(error, error.step === 'captcha' ? 'captcha' : 'send');
    if (!message) return;
    const refused = error.kind === 'rejected' || (error.kind === 'http' && error.status < 500);
    let check;
    if (error.code === 'CAPTCHA_REQUIRED' || (error.step === 'captcha' && refused)) {
      check = captchaCheck;
    } else if (error.step === 'otp' && (error.kind === 'invalid-input'
      || (refused && /mobile/i.test(error.serverMessage || '')))) {
      check = mobileCheck;
    }
    if (check) {
      setState(check, true, message);
      check.control.focus();
    } else {
      showSubmitError(message);
    }
  };

  // screen reader announcements for steps that have no visible status text
  const status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('aria-live', 'polite');
  const announce = (message) => {
    status.textContent = '';
    setTimeout(() => { status.textContent = message; }, 100);
  };

  // steps: form -> (sending) -> OTP -> success; the dialog is named after the visible step
  const main = document.createElement('div');
  main.className = 'lead-form-step lead-form-main';
  const loading = document.createElement('div');
  loading.className = 'lead-form-step lead-form-loading';
  loading.hidden = true;
  loading.innerHTML = '<span class="lead-form-spinner" aria-hidden="true"></span>';
  const dialog = () => block.closest('dialog');
  const nameDialog = (titleId) => dialog()?.setAttribute('aria-labelledby', titleId);
  const close = () => {
    const d = dialog();
    if (d) d.close();
    else window.history.back();
  };
  const showStep = (step) => {
    [...block.children].forEach((child) => {
      if (child.classList.contains('lead-form-step')) child.hidden = child !== step;
    });
    block.dataset.step = step.classList[1].replace('lead-form-', '');
    dialog()?.querySelector('.modal-content')?.scrollTo(0, 0);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.classList.contains('is-loading')) return;
    if (!isValid()) {
      const invalid = checks.filter((check) => !check.valid());
      checks.forEach((check) => setState(check, invalid.includes(check)));
      invalid[0]?.control.focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const mobile = form.querySelector('input[type="tel"]')?.value || '';
    // the category picks the API product (lead-api-config.js); none = demo flow
    const category = data[Object.keys(data).find((k) => k.endsWith('category'))] || pageCategory();
    const product = productFor(category);
    const session = createLeadSession({
      mobile, product, lead: buildLead(form, category), loanCategory: category,
    });

    // verifying the captcha, then sending the OTP: button spinner (desktop), full view
    // spinner (small screens)
    showSubmitError('');
    setLoading(submit, true, 'Sending OTP');
    block.classList.add('is-sending');
    loading.hidden = false;
    announce('Sending OTP');
    let failure;
    try {
      // no captcha field: the OTP API answers CAPTCHA_REQUIRED, shown above the button
      await session.submit(captcha ? captcha.input.value : null);
    } catch (error) {
      failure = error;
    } finally {
      setLoading(submit, false);
      block.classList.remove('is-sending');
      loading.hidden = true;
    }
    if (failure) {
      if (failure.kind === 'cancelled') return;
      // the captcha was used up by the attempt: a new one, then the error (loading clears it)
      captcha?.load();
      showSubmitFailure(failure);
      return;
    }

    block.querySelector('.lead-form-otp')?.remove();
    const otp = createOtpStep({
      mobile,
      sendOtp: session.sendOtp,
      verifyOtp: session.verifyOtp,
      announce,
      // back to the form, values kept: a new OTP needs a new captcha
      onBack: () => {
        session.cancel();
        otp.remove();
        showStep(main);
        nameDialog(intro.querySelector('h1, h2')?.id);
        if (captcha) {
          captcha.load();
          captcha.input.focus();
        } else {
          submit.focus();
        }
      },
      // the lead is created by verifyOtp
      onVerified: () => {
        const success = createSuccessStep({
          emiHref: document.querySelector('main .emi-calculator') ? '#emi-calculator' : `${siteRoot()}/home#emi-calculator`,
          onDone: close,
        });
        success.querySelector('.lead-form-emi').addEventListener('click', (ev) => {
          if (!ev.currentTarget.getAttribute('href').startsWith('#')) return;
          ev.preventDefault();
          close();
          document.getElementById('emi-calculator')?.scrollIntoView();
        });
        otp.remove();
        block.append(success);
        showStep(success);
        nameDialog(success.titleId);
        success.focusTitle();
      },
    });
    // closing the modal ends the journey: no resend countdown or request left running
    dialog()?.addEventListener('close', () => {
      otp.stop();
      session.cancel();
    }, { once: true });
    block.append(otp);
    showStep(otp);
    nameDialog(otp.titleId);
    announce(`OTP sent to the number ending ${mobile.slice(-4)}`);
    otp.focusFirst();
  });

  // loan category: preselect the product of the page the form is opened from
  const categoryDropdown = dropdowns
    .find((d) => /category/i.test(d.querySelector('input[type="hidden"]').name));
  const categoryOptions = categoryDropdown?.optionValues || [];
  const selectCategory = (text) => {
    if (!categoryDropdown || !text) return;
    const key = normalize(text);
    const match = categoryOptions.find((option) => normalize(option) === key)
      || categoryOptions.find((option) => normalize(option).startsWith(key.slice(0, 6)));
    if (match) categoryDropdown.setValue(match);
  };
  selectCategory(pageCategory());
  refresh();
  // picking another product in a modal opens that product's form
  categoryDropdown?.addEventListener('change', (e) => {
    const d = dialog();
    if (!e.detail?.byUser || !d?.dataset.modalPath || !categoryDropdown.value) return;
    openFormFor(d, categoryDropdown.value, categoryOptions, forms, form);
  });

  // values carried over from another form (e.g. the hero call-back form)
  // a value may also be a list of candidates (most specific first): a dropdown takes the
  // first one that matches one of its options and is left unchanged when none does
  form.prefill = (data) => {
    const inputs = [...form.querySelectorAll('input[name]')].filter((i) => i.type !== 'hidden');
    const first = inputs.find((i) => i.autocomplete === 'given-name');
    const last = inputs.find((i) => i.autocomplete === 'family-name');
    Object.entries(data).forEach(([key, raw]) => {
      const candidates = [].concat(raw).map((v) => String(v ?? '').trim()).filter(Boolean);
      const [value] = candidates;
      if (!value) return;
      const name = key.replace(/^your-/, '');
      // one full name into separate first and last name fields: split at the first space
      if (name === 'name' && first && last) {
        const [given, ...rest] = value.trim().split(/\s+/);
        first.value = given;
        last.value = rest.join(' ');
        return;
      }
      const input = inputs
        .find((i) => i.name === name || i.name.endsWith(`-${name}`) || name.endsWith(`-${i.name}`));
      if (input) input.value = value;
      const dropdown = dropdowns.find((d) => {
        const n = d.querySelector('input[type="hidden"]').name;
        return n === name || n.endsWith(`-${name}`) || name.endsWith(`-${n}`);
      });
      const match = dropdown && candidates.find((c) => dropdown.hasOption(c));
      if (match) dropdown.setValue(match);
    });
    refresh();
  };

  // small screens: the form is a page of its own below the header, with "Go back"
  const goBack = document.createElement('button');
  goBack.type = 'button';
  goBack.className = 'lead-form-goback';
  goBack.innerHTML = `<img src="${window.hlx.codeBasePath}/icons/chevron-left.svg" alt="" width="16" height="16"><span>Go back</span>`;
  goBack.addEventListener('click', close);

  const heading = intro.querySelector('h1, h2');
  if (heading && !heading.id) heading.id = `lead-form-title-${Math.random().toString(36).slice(2, 8)}`;
  main.append(intro, form);
  block.replaceChildren(goBack, main, loading, status);
  // the modal decorates the form on every "Apply now", so this is a captcha per opening
  captcha?.load();
}
