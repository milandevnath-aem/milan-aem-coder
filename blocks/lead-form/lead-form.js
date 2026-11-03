import { getMetadata } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { createDropdown } from '../../scripts/dropdown.js';
import {
  CAPTCHA_LENGTH, createLeadSession, errorMessage as apiErrorMessage, generateCaptcha,
} from './lead-api.js';
import { CITY_COLUMN, CITY_LISTS, MESSAGES } from './lead-api-config.js';
import { buildLead, productFor } from './lead-payload.js';
import {
  createOtpStep, createSuccessStep, setLoading, spinner,
} from './lead-form-otp.js';
import {
  CATEGORY_PICKED_EVENT, readForms, rememberForms, rememberedForms, resolveForm, slug,
} from '../../scripts/category-forms.js';
import {
  digitsOnly, emailRules, fieldMessages, isPersonName, mobileRules, nameRules,
} from '../../scripts/input-rules.js';
import {
  analyticsName, productType, pushEvent, safely, trackFormStart, uniqueId,
} from '../../scripts/analytics.js';

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

// city sheet URL -> promise of its city names, so a form opened again does not refetch
const citySheets = {};

/**
 * The cities the API of a loan category takes (CITY_LISTS in lead-api-config.js), in sheet
 * order and as written there. Resolves to [] when the category has no sheet or it cannot be read.
 * @param {string} category loan category
 * @returns {Promise<string[]>}
 */
function loadCities(category) {
  const url = CITY_LISTS[productFor(category)];
  if (!url) return Promise.resolve([]);
  citySheets[url] ||= fetch(url)
    .then((resp) => (resp.ok ? resp.json() : {}))
    .then(({ data = [] }) => [...new Set(data
      .map((row) => String(row[CITY_COLUMN] ?? '').trim())
      .filter(Boolean))])
    .catch(() => []);
  return citySheets[url].then((names) => {
    if (!names.length) delete citySheets[url]; // tried again next time
    return names;
  });
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

/**
 * Something typed or pasted was refused by the input rules: the form shows the field's
 * "invalid" message (an "input-rejected" event, see decorate).
 */
const rejected = (input) => () => input.dispatchEvent(new CustomEvent('input-rejected', { bubbles: true }));

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
    mobileRules(input, rejected(input));
  } else if (kind === 'email') {
    emailRules(input);
  } else if (kind === 'zip') {
    Object.assign(input, {
      type: 'text', inputMode: 'numeric', pattern: '[1-9][0-9]{5}', autocomplete: 'postal-code',
    });
    digitsOnly(input, 6, rejected(input));
  } else {
    input.type = 'text';
    // first and last name get their own autofill values, or the full name fills both;
    // a company or dealership ("Account name", "Dealership name") is not a person's name
    if (/\b(first|given)\b.*name/i.test(label)) input.autocomplete = 'given-name';
    else if (/\b(last|sur|family)\s*name/i.test(label)) input.autocomplete = 'family-name';
    else if (/\b(account|company|business|organi[sz]ation|dealer(ship)?)\b/i.test(label)) input.autocomplete = 'organization';
    else if (/name/i.test(label)) input.autocomplete = 'name';
    // names: letters only (and spaces in a full name)
    if (isPersonName(label)) nameRules(input, label, rejected(input));
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
  // shown only while the captcha has audio
  listen.hidden = true;
  listen.setAttribute('aria-pressed', 'false');
  tools.append(refresh, listen);
  const control = textField(label || 'Enter the captcha shown', 'text', true);
  const input = control.querySelector('input');
  // case-sensitive: no automatic capitals or corrections on phones
  Object.assign(input, {
    name: 'captcha', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, maxLength: CAPTCHA_LENGTH,
  });
  field.append(frame, tools, control);
  field.input = input;

  // an image the browser cannot show (corrupt Base64) is a failed load, not a broken icon
  image.addEventListener('error', () => {
    if (!image.getAttribute('src')) return;
    image.hidden = true;
    image.removeAttribute('src');
    field.onError?.(MESSAGES.captchaLoadFailed);
  });

  // audio captcha: the API's Base64 audio, played from a blob URL (long data URIs are not
  // played by every browser)
  const audio = new Audio();
  audio.preload = 'none';
  let audioUrl = '';
  const setPlaying = (playing) => {
    listen.classList.toggle('is-playing', playing);
    listen.setAttribute('aria-pressed', String(playing));
    listen.setAttribute('aria-label', playing ? 'Stop the captcha audio' : 'Listen to the captcha');
  };
  const stopAudio = () => {
    audio.pause();
    if (audioUrl) audio.currentTime = 0;
    setPlaying(false);
  };
  const audioFailed = () => {
    stopAudio();
    field.onError?.(MESSAGES.captchaAudioFailed);
  };
  /** @param {string} dataUri the captcha's audio, '' when it has none */
  const setAudio = (dataUri) => {
    stopAudio();
    const previous = audioUrl;
    audioUrl = '';
    audio.removeAttribute('src');
    if (previous) URL.revokeObjectURL(previous);
    try {
      if (!dataUri) throw new Error('no audio');
      const [head, data] = dataUri.split(',');
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      audioUrl = URL.createObjectURL(new Blob([bytes], { type: head.slice(5).split(';')[0] }));
      audio.src = audioUrl;
    } catch (e) {
      // no audio, or not decodable: the image alone is shown
    }
    listen.hidden = !audioUrl;
  };
  audio.addEventListener('ended', () => setPlaying(false));
  audio.addEventListener('error', () => { if (audioUrl) audioFailed(); });
  listen.addEventListener('click', () => {
    if (!audioUrl) return;
    if (!audio.paused) {
      stopAudio();
      return;
    }
    // closing the modal stops the audio
    field.closest('dialog')?.addEventListener('close', stopAudio, { once: true });
    setPlaying(true);
    audio.play().catch((error) => {
      // AbortError: stopped or replaced before it started
      if (error?.name !== 'AbortError') audioFailed();
    });
  });
  field.stopAudio = stopAudio;

  let request = null;
  field.load = async () => {
    // the newest request wins: only its captcha matches the cookie
    request?.abort();
    request = new AbortController();
    const { signal } = request;
    field.classList.add('is-loading');
    field.setAttribute('aria-busy', 'true');
    setAudio('');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    try {
      const captcha = await generateCaptcha(signal);
      if (signal.aborted) return;
      image.src = captcha.image;
      image.hidden = false;
      setAudio(captcha.audio || '');
    } catch (error) {
      if (signal.aborted) return;
      image.hidden = true;
      image.removeAttribute('src');
      field.onError?.(apiErrorMessage(error, 'captcha-load'));
    }
    field.classList.remove('is-loading');
    field.removeAttribute('aria-busy');
  };
  refresh.addEventListener('click', () => field.load());
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

/** the "Select loan category" dropdown */
const isCategory = (dropdown) => /category/i.test(dropdown.querySelector('input[type="hidden"]').name);

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
  let cityField;

  fieldRows.forEach((row) => {
    const [labelCell, kindCell, optionsCell, requiredCell, halfCell] = row.children;
    const label = labelCell?.textContent.trim() || 'Field';
    let kind = kindCell?.textContent.trim() || 'text';
    const optionsText = optionsCell?.textContent.trim() || '';
    // fields left as plain text: a description is multi-line, a field with a list of
    // options is a dropdown (searchable when the list is long)
    // a city field lists the cities of the category's API (see loadCities), searchable; its
    // authored options are kept when the category has no city sheet
    const isCity = /\bcity\b/i.test(label) && ['text', 'select', 'search'].includes(kind);
    if (isCity) kind = 'search';
    else if (kind === 'text' && /descri|message|comment|remark/i.test(label)) kind = 'textarea';
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
      field.defaultValue = value;
      dropdowns.push(field);
      if (isCity) {
        cityField = field;
        cityField.authoredOptions = options;
      }
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
      const messages = fieldMessages(label, kind);
      const error = fieldError(control, messages.empty);
      const isDropdown = dropdowns.includes(field);
      let valid = () => control.checkValidity();
      if (field === captcha) valid = () => captcha.isValid();
      if (isDropdown) valid = () => !field.dataset.required || Boolean(field.value);
      const isEmpty = isDropdown ? () => !field.value : () => !control.value.trim();
      checks.push({
        field, control, error, valid, messages, isEmpty,
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
  submit.id = uniqueId('lead-form-submit');
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
  // message: an API error to show instead of the field's own message (blank or invalid)
  const setState = (check, invalid, message) => {
    const { empty, invalid: wrong } = check.messages;
    check.error.show(invalid, message || (check.isEmpty() ? empty : wrong));
    const box = check.field.closest('.lead-form-input')
      || check.field.querySelector('.lead-form-input') || check.field;
    box.classList.toggle('is-invalid', invalid);
  };
  // the button is disabled until every field is valid: a click (or Enter in a field) does
  // nothing; each field says what is wrong when the visitor leaves it
  const refresh = () => {
    submit.disabled = !isValid();
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
  // a refused character (a digit in a name, a letter in the mobile number...) is not
  // typed, and the field says why
  form.addEventListener('input-rejected', (e) => {
    const check = checks.find((c) => c.control === e.target);
    if (check) setState(check, true, check.messages.invalid);
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
    const {
      step, kind, status, code, serverMessage,
    } = error || {};
    const message = apiErrorMessage(error, step === 'captcha' ? 'captcha' : 'send');
    if (!message) return;
    const refused = kind === 'rejected' || (kind === 'http' && status < 500);
    let check;
    if (code === 'CAPTCHA_REQUIRED' || (step === 'captcha' && refused)) {
      check = captchaCheck;
    } else if (step === 'otp' && (kind === 'invalid-input'
      || (refused && /mobile/i.test(typeof serverMessage === 'string' ? serverMessage : '')))) {
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

  /**
   * Empties the form once its lead is created: fields, dropdowns (back to their authored
   * default) and error messages. The loan category keeps the product the form is for.
   */
  const clearForm = () => {
    form.reset();
    dropdowns.filter((d) => !isCategory(d)).forEach((d) => d.setValue(d.defaultValue));
    // character counts follow their textarea's "input" event
    form.querySelectorAll('textarea').forEach((t) => t.dispatchEvent(new Event('input')));
    checks.forEach((check) => setState(check, false));
    showSubmitError('');
    refresh();
  };

  /** the picked loan category, else the page's own product */
  const currentCategory = (data = Object.fromEntries(new FormData(form))) => {
    const categoryKey = Object.keys(data).find((k) => k.endsWith('category'));
    return String((categoryKey && data[categoryKey]) || pageCategory() || '');
  };
  /**
   * form_name of the analytics events: the modal page the form is opened from
   * ("/modals/two-wheeler-form" -> "two_wheeler_form"), else the form's heading
   */
  const formName = () => {
    const page = (block.closest('dialog')?.dataset.modalPath || '').split('/').filter(Boolean).pop() || '';
    return analyticsName(page.replace(/(\.plain)?\.html$/, ''))
      || analyticsName(intro.querySelector('h1, h2')?.textContent) || 'lead_form';
  };
  trackFormStart(form, formName, currentCategory);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.classList.contains('is-loading')) return;
    if (!isValid()) {
      const invalid = checks.filter((check) => !check.valid());
      checks.forEach((check) => setState(check, invalid.includes(check)));
      invalid[0]?.control.focus();
      return;
    }
    captcha?.stopAudio();
    const data = Object.fromEntries(new FormData(form));
    const mobile = String(form.querySelector('input[type="tel"]')?.value || '').trim();
    // the category picks the API product (lead-api-config.js)
    const category = currentCategory(data);
    // analytics: no personal data, the city is the only field sent; a tracking error never
    // stops the lead (safely: logged, the events are then sent without these fields)
    const tracked = safely(() => {
      const cityKey = Object.keys(data).find((k) => /\b(city|location)\b/.test(k.replace(/-/g, ' ')));
      return {
        form_name: formName(),
        product_type: productType(category),
        city: (cityKey && String(data[cityKey]).trim()) || undefined,
      };
    }, {});
    let session;
    try {
      session = createLeadSession({
        mobile,
        product: productFor(category),
        lead: buildLead(form, category),
        loanCategory: category,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('lead-form: the lead could not be prepared', error);
      showSubmitError(MESSAGES.formFailed);
      return;
    }

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
      if (failure?.kind === 'cancelled') return;
      // the captcha was used up by the attempt: a new one, then the error (loading clears it)
      captcha?.load();
      showSubmitFailure(failure);
      return;
    }
    pushEvent('lead_form_submit', tracked);

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
      onVerified: (lead) => {
        // the server's lead reference, never the mobile number
        pushEvent('generate_lead', { ...tracked, lead_id: lead?.leadId || undefined });
        // the lead exists now: tidying up must not keep the visitor from the success step
        try {
          clearForm();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('lead-form: the form could not be cleared', error);
        }
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
  const categoryDropdown = dropdowns.find(isCategory);
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

  // city: the cities of the selected category's API (the last pick wins when sheets load slowly)
  let cityRequest = 0;
  const updateCities = (category) => {
    if (!cityField) return;
    cityRequest += 1;
    const request = cityRequest;
    loadCities(category).then((names) => {
      if (request !== cityRequest) return;
      const options = names.length
        ? names.map((n) => ({ value: n, label: n }))
        : cityField.authoredOptions;
      cityField.setOptions(options);
      cityField.optionValues = options.map((option) => option.value);
    });
  };
  updateCities(categoryDropdown?.value || pageCategory());
  // picking another product in a modal opens that product's form
  categoryDropdown?.addEventListener('change', (e) => {
    if (!e.detail?.byUser || !categoryDropdown.value) return;
    updateCities(categoryDropdown.value);
    // the short form follows the pick, so it shows it once the modal is closed
    document.dispatchEvent(new CustomEvent(CATEGORY_PICKED_EVENT, {
      detail: { category: categoryDropdown.value },
    }));
    const d = dialog();
    if (!d?.dataset.modalPath) return;
    // the form stays open as it is when the other one cannot be loaded
    openFormFor(d, categoryDropdown.value, categoryOptions, forms, form).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('lead-form: the form of this category could not be opened', error);
    });
  });

  // values carried over from another form (e.g. the hero call-back form)
  // a value may also be a list of candidates (most specific first): a dropdown takes the
  // first one that matches one of its options and is left unchanged when none does
  form.prefill = (data) => {
    if (!data || typeof data !== 'object') return;
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
