import { loadCSS } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { createDropdown } from '../../scripts/dropdown.js';
import { slug } from '../../scripts/category-forms.js';
import { digitsOnly, fieldMessages, upperAlphanumeric } from '../../scripts/input-rules.js';
import {
  analyticsName, pushEvent, safely, trackFormStart,
} from '../../scripts/analytics.js';
import {
  captchaField, fieldError, parseOptions, rejected, textareaField, textField,
} from '../lead-form/lead-form.js';
import { errorMessage as captchaErrorMessage } from '../lead-form/lead-api.js';
import { setLoading } from '../lead-form/lead-form-otp.js';
import {
  isSelfService, loadServiceData, requestErrorMessage, submitServiceRequest, verifyLoanAccount,
} from './service-request-api.js';
import { LOAN_ACCOUNT_MAX, MESSAGES } from './service-request-api-config.js';

/*
  Service Request form (popup): Party ID, product, loan account number with Verify, subject,
  sub-type, city, description, captcha and Submit. Every field is an authored item (label,
  type, options, required, half width, required / invalid messages), in the authored order.

  Its logic and APIs are its own (service-request-api.js, service-request-api-config.js); the
  fields, captcha, messages and styles are the lead form's (lead-form.js, lead-form.css).
  The block gets the lead-form class, so the modal shows it as a form popup (modal.js).

  Submit:
  - subject done online ("Subjects that open the Login popup"): no API call, the Login popup
  - any other subject: captcha-verify first; only once the captcha is accepted, the service
    request API, then the success popup
*/

/** "A, B, C" -> ["A", "B", "C"] */
const list = (text) => String(text || '').split(',').map((t) => t.trim()).filter(Boolean);

/** names -> dropdown options */
const asOptions = (names) => names.map((name) => ({ value: name, label: name }));

/** Dropdown types: authored options, or one of the sheet's lists */
const DROPDOWN_KINDS = ['select', 'search', 'product', 'subject', 'subtype', 'city'];

/** Value of each sheet / special field type in the request (see submitPayload) */
const ROLE_KEYS = {
  product: 'product', subject: 'subject', subtype: 'subType', city: 'city', loan: 'loanAccount', party: 'partyId',
};

/** The kind fieldMessages knows for each field type */
const MESSAGE_KIND = {
  product: 'select', subject: 'select', subtype: 'select', city: 'search', loan: 'alphanumeric', textarea: 'text', party: 'text',
};

/**
 * Loan account number with an inline Verify button; a check mark replaces the button once
 * the number is verified.
 * @param {string} label
 * @param {boolean} required
 * @param {string} verifyLabel button text
 */
function loanField(label, required, verifyLabel) {
  const field = document.createElement('div');
  field.className = 'lead-form-input service-request-loan';
  // the label holds the input only: the button text must not join the field's name
  const name = textField(label, 'text', required);
  name.className = 'service-request-loan-label';
  const input = name.querySelector('input');
  Object.assign(input, { autocomplete: 'off', spellcheck: false });
  upperAlphanumeric(input, LOAN_ACCOUNT_MAX, rejected(input));

  const verify = document.createElement('button');
  verify.type = 'button';
  verify.className = 'service-request-verify';
  verify.textContent = verifyLabel || 'Verify';
  verify.disabled = true;

  const done = document.createElement('span');
  done.className = 'service-request-verified';
  done.hidden = true;
  done.innerHTML = `<img src="${window.hlx.codeBasePath}/icons/check.svg" alt="" width="12" height="12"><span class="visually-hidden">Verified</span>`;

  field.append(name, verify, done);
  field.addEventListener('click', (e) => { if (e.target === field) input.focus(); });
  Object.assign(field, { input, verify, done });
  return field;
}

/**
 * One field of the form.
 * @param {string} label
 * @param {string} kind text, number, alphanumeric, select, search, product, subject, subtype,
 *   city, textarea, loan or captcha
 * @param {string} optionsText dropdown options; the maximum length of a number / alphanumeric
 *   field or the character limit of a text area; the Verify label of a loan account field
 * @param {boolean} required
 * @returns {{ field: HTMLElement, dropdown?: HTMLElement }}
 */
function buildField(label, kind, optionsText, required) {
  if (DROPDOWN_KINDS.includes(kind)) {
    const { options, value } = parseOptions(optionsText);
    const dropdown = createDropdown({
      label,
      name: slug(label),
      options,
      value,
      required,
      search: kind === 'search' || kind === 'city',
      searchPlaceholder: `Search ${label.toLowerCase().replace(/^select\s+/, '')}`,
      pinSelected: true,
    });
    return { field: dropdown, dropdown };
  }
  // the listen button is always shown (disabled while the captcha has no audio)
  if (kind === 'captcha') return { field: captchaField(label, { alwaysShowAudio: true }) };
  if (kind === 'textarea') {
    return { field: textareaField(label, required, parseInt(optionsText, 10) || 150) };
  }
  if (kind === 'loan') return { field: loanField(label, required, optionsText) };
  if (kind === 'party') {
    // filled by the loan account check (Verify), never typed: disabled (greyed, not
    // focusable), like the Sub-Type before a subject is picked
    const field = textField(label, 'text', false);
    field.classList.add('service-request-party');
    const input = field.querySelector('input');
    Object.assign(input, { disabled: true, autocomplete: 'off' });
    return { field };
  }
  const field = textField(label, 'text', required);
  const input = field.querySelector('input');
  const max = parseInt(optionsText, 10) || 0;
  if (kind === 'number') {
    input.inputMode = 'numeric';
    digitsOnly(input, max || 20, rejected(input));
  } else if (kind === 'alphanumeric') {
    upperAlphanumeric(input, max || 20, rejected(input));
  } else if (max) {
    input.maxLength = max;
  }
  return { field };
}

/**
 * The Login popup's content, or the success step shown in place of the form.
 * @param {string} name 'login' or 'success'
 * @param {Element} [cell] authored heading and text (richtext); defaults when empty
 * @param {{ heading: string, text: string }} defaults
 */
function buildStep(name, cell, defaults) {
  const view = document.createElement('div');
  view.className = `lead-form-step service-request-${name}`;
  view.hidden = true;
  const text = document.createElement('div');
  text.className = 'lead-form-intro service-request-step-text';
  if (cell?.textContent.trim()) {
    while (cell.firstChild) text.append(cell.firstChild);
  } else {
    const h2 = document.createElement('h2');
    h2.textContent = defaults.heading;
    const p = document.createElement('p');
    p.textContent = defaults.text;
    text.append(h2, p);
  }
  const heading = text.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.tabIndex = -1;
    heading.id ||= `service-request-${name}-${Math.random().toString(36).slice(2, 8)}`;
    view.titleId = heading.id;
  }
  view.append(text);
  return view;
}

/**
 * Service Request form. Block properties: heading and text, button label, data sheet,
 * subjects that open the Login popup, Login popup text, Login button link, success text and
 * error message; each item is a field.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // the fields, captcha and errors are the lead form's; the modal opens it as a form popup
  block.classList.add('lead-form');
  const styles = loadCSS(`${window.hlx.codeBasePath}/blocks/lead-form/lead-form.css`);

  const rows = [...block.children];
  const config = rows.filter((row) => row.children.length <= 1);
  const fieldRows = rows.filter((row) => row.children.length > 1);
  const [
    textRow, submitRow, sheetRow, subjectsRow, loginRow, loginLinkRow, successRow, errorRow,
  ] = config;
  const textOf = (row) => row?.textContent.trim() || '';
  const sheetPath = sheetRow?.querySelector('a')?.getAttribute('href') || textOf(sheetRow);
  const loginSubjects = list(textOf(subjectsRow));
  const submitErrorText = textOf(errorRow) || MESSAGES.submitFailed;

  // heading and text
  const intro = document.createElement('div');
  intro.className = 'lead-form-intro service-request-intro';
  const textCell = textRow?.firstElementChild;
  if (textCell?.textContent.trim()) {
    moveInstrumentation(textRow, intro);
    while (textCell.firstChild) intro.append(textCell.firstChild);
  }
  const heading = intro.querySelector('h1, h2, h3');
  if (heading && !heading.id) heading.id = `service-request-title-${Math.random().toString(36).slice(2, 8)}`;

  const form = document.createElement('form');
  form.noValidate = true;
  form.method = 'post';
  form.className = 'lead-form-form service-request-form';
  if (heading) form.setAttribute('aria-labelledby', heading.id);

  // fields, in the authored order
  const fields = document.createElement('div');
  fields.className = 'lead-form-fields';
  const checks = [];
  // the first field of each sheet / special type
  const roles = {};
  const addField = ({
    row, label, kind, optionsText = '', required = true, half = false, emptyText = '', invalidText = '',
  }) => {
    const { field, dropdown } = buildField(label, kind, optionsText, required);
    const item = document.createElement('div');
    item.className = 'lead-form-item';
    if (half) item.classList.add('is-half');
    if (row) moveInstrumentation(row, field);
    item.append(field);

    const control = field.querySelector('.dropdown-field')
      || field.querySelector('input:not([type="hidden"]), textarea');
    if (control) {
      const defaults = fieldMessages(label, MESSAGE_KIND[kind] || kind);
      const messages = {
        empty: emptyText || defaults.empty,
        invalid: invalidText || (kind === 'loan' ? MESSAGES.loanInvalid : defaults.invalid),
      };
      const error = fieldError(control, messages.empty);
      const check = {
        item, field, control, dropdown, error, messages, label, kind, required,
      };
      if (kind === 'captcha') check.valid = () => field.isValid();
      else if (kind === 'party') check.valid = () => true; // filled by Verify
      else if (dropdown) check.valid = () => !required || Boolean(dropdown.value);
      else check.valid = () => control.checkValidity();
      check.isEmpty = dropdown ? () => !dropdown.value : () => !control.value.trim();
      checks.push(check);
      item.append(error.el);
      roles[kind] ||= check;
    }
    fields.append(item);
  };

  fieldRows.forEach((row) => {
    const [
      labelCell, kindCell, optionsCell, requiredCell, halfCell, emptyCell, invalidCell,
    ] = row.children;
    const label = labelCell?.textContent.trim() || 'Field';
    let kind = (kindCell?.textContent.trim() || 'text').toLowerCase();
    // a field left as text / number is recognised by its label: the loan account number gets
    // Verify, the Party ID is filled by Verify, a description is multi-line
    if (['text', 'number', 'alphanumeric'].includes(kind)) {
      if (/\bloan\s*(account|a\/c|acc)/i.test(label)) kind = 'loan';
      else if (/\bparty\s*id\b/i.test(label)) kind = 'party';
      else if (kind === 'text' && /descri/i.test(label)) kind = 'textarea';
    }
    addField({
      row,
      label,
      kind,
      optionsText: optionsCell?.textContent.trim() || '',
      required: requiredCell?.textContent.trim() !== 'false',
      half: halfCell?.textContent.trim() === 'true',
      emptyText: emptyCell?.textContent.trim() || '',
      invalidText: invalidCell?.textContent.trim() || '',
    });
  });
  // the captcha is always part of the form: Submit verifies it before any request
  if (!roles.captcha) addField({ label: 'Enter the code', kind: 'captcha' });
  form.append(fields);

  // submit, and the error of a failed request
  const submitError = document.createElement('p');
  submitError.className = 'lead-form-error service-request-submit-error';
  submitError.setAttribute('role', 'alert');
  submitError.hidden = true;
  const showSubmitError = (message) => {
    submitError.textContent = message;
    submitError.hidden = !message;
  };
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button primary lead-form-submit service-request-submit';
  submit.textContent = textOf(submitRow) || 'Submit';
  if (submitRow) moveInstrumentation(submitRow, submit);
  form.append(submitError, submit);

  // polite messages for screen readers (verified, loading)
  const status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('aria-live', 'polite');
  const announce = (message) => {
    status.textContent = '';
    setTimeout(() => { status.textContent = message; }, 100);
  };

  // loan account: verified once the API accepts it; any change asks for a new check
  const loanCheck = roles.loan;
  const loan = loanCheck?.field;
  let verified = false;
  let verifyRequest = null;
  if (loanCheck) {
    loanCheck.valid = () => (loanCheck.isEmpty() ? !loanCheck.required : verified);
  }

  const messageOf = (check) => {
    if (check.isEmpty()) return check.messages.empty;
    if (check === loanCheck && check.control.checkValidity() && !verified) {
      return MESSAGES.verifyNeeded;
    }
    return check.messages.invalid;
  };
  const setState = (check, invalid, message) => {
    check.error.show(invalid, message || messageOf(check));
    const box = check.dropdown || check.field.closest('.lead-form-input')
      || check.field.querySelector('.lead-form-input') || check.field;
    box.classList.toggle('is-invalid', invalid);
  };
  const isValid = () => checks.every((check) => check.valid());
  // the button stays focusable while the form is incomplete; submitting lists what is missing
  const refresh = () => submit.setAttribute('aria-disabled', String(!isValid()));

  // Party ID: the account's, from the loan account check
  const partyInput = roles.party?.control;
  const setVerified = (state, partyId = '') => {
    verified = state;
    loan.classList.toggle('is-verified', state);
    loan.verify.hidden = state;
    loan.done.hidden = !state;
    if (partyInput) partyInput.value = state ? partyId : '';
  };
  const resetVerification = () => {
    verifyRequest?.abort();
    verifyRequest = null;
    setLoading(loan.verify, false);
    setVerified(false);
  };

  if (loan) {
    const { input, verify } = loan;
    input.addEventListener('input', () => {
      if (verified || verifyRequest) resetVerification();
      verify.disabled = !input.value.trim() || !input.checkValidity();
    });
    // the check is for one product: another product asks for a new check
    roles.product?.dropdown.addEventListener('change', () => {
      if (verified || verifyRequest) resetVerification();
      refresh();
    });
    verify.addEventListener('click', async () => {
      if (!input.value.trim() || verifyRequest) return;
      verifyRequest = new AbortController();
      const { signal } = verifyRequest;
      setState(loanCheck, false);
      setLoading(verify, true, 'Verifying the loan account number');
      try {
        const result = await verifyLoanAccount({
          loanAccount: input.value.trim(),
          product: roles.product?.dropdown.value || '',
        }, signal);
        if (signal.aborted) return;
        verifyRequest = null;
        setLoading(verify, false);
        if (result.valid) {
          setVerified(true, result.partyId);
          announce('Loan account number verified');
        } else {
          setState(loanCheck, true, loanCheck.messages.invalid);
          input.focus();
        }
      } catch (error) {
        if (signal.aborted) return;
        verifyRequest = null;
        setLoading(verify, false);
        const message = requestErrorMessage(error, loanCheck.messages.invalid);
        if (message) setState(loanCheck, true, message);
      }
      refresh();
    });
  }

  // sheet lists: product, subject (-> sub-type) and city; authored options stay when the
  // sheet cannot be read
  let subjectMap = new Map();
  const subTypeCheck = roles.subtype;
  const updateSubTypes = () => {
    const sub = subTypeCheck?.dropdown;
    if (!sub) return;
    const subject = roles.subject?.dropdown.value || '';
    if (subjectMap.size) {
      const names = subjectMap.get(subject) || [];
      sub.setOptions(asOptions(names));
      // a subject with one sub-type (e.g. Change of Address) picks it
      if (names.length === 1 && sub.value !== names[0]) sub.setValue(names[0]);
    }
    // nothing to pick before a subject
    sub.querySelector('.dropdown-field').disabled = Boolean(roles.subject) && !subject;
  };
  roles.subject?.dropdown.addEventListener('change', () => {
    updateSubTypes();
    refresh();
  });
  updateSubTypes();
  const dataReady = loadServiceData(sheetPath).then(({ products, subjects, cities }) => {
    if (roles.product && products.length) roles.product.dropdown.setOptions(asOptions(products));
    if (roles.subject && subjects.size) {
      roles.subject.dropdown.setOptions(asOptions([...subjects.keys()]));
    }
    if (roles.city && cities.length) roles.city.dropdown.setOptions(asOptions(cities));
    subjectMap = subjects;
    updateSubTypes();
    refresh();
  });

  // field messages: shown when a field is left wrong, cleared while correcting
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  form.addEventListener('focusout', (e) => {
    const check = checks.find((c) => c.control === e.target);
    if (!check || !e.target.value) return;
    // a loan account number is checked with Verify, not on leaving the field
    if (check === loanCheck && check.control.checkValidity()) return;
    setState(check, !check.valid());
  });
  form.addEventListener('input', (e) => {
    const check = checks.find((c) => c.control === e.target);
    if (check) setState(check, false);
  });
  form.addEventListener('input-rejected', (e) => {
    const check = checks.find((c) => c.control === e.target);
    if (check) setState(check, true, check.messages.invalid);
  });
  checks.filter((check) => check.dropdown).forEach((check) => {
    check.dropdown.addEventListener('change', () => {
      setState(check, false);
      refresh();
    });
  });
  const captchaCheck = roles.captcha;
  const captcha = captchaCheck?.field;
  if (captcha) captcha.onError = (message) => setState(captchaCheck, true, message);

  // steps: form -> success; the dialog is named after the visible step. The Login popup is a
  // popup of its own over the form (bottom sheet on small screens, small card on desktop)
  const main = document.createElement('div');
  main.className = 'lead-form-step service-request-main lead-form-main';
  main.append(intro, form);

  const login = buildStep('login', loginRow?.firstElementChild, {
    heading: MESSAGES.loginHeading, text: MESSAGES.loginText,
  });
  if (loginRow) moveInstrumentation(loginRow, login);
  login.className = 'service-request-login';
  login.hidden = false;
  const loginLink = loginLinkRow?.querySelector('a');
  if (loginLink?.getAttribute('href')) {
    const button = document.createElement('a');
    button.className = 'button primary service-request-login-button';
    button.href = loginLink.getAttribute('href');
    button.textContent = loginLink.textContent.trim() || MESSAGES.loginLabel;
    if (loginLink.target) button.target = loginLink.target;
    moveInstrumentation(loginLink, button);
    login.append(button);
  }

  const success = buildStep('success', successRow?.firstElementChild, {
    heading: MESSAGES.successHeading, text: MESSAGES.successText,
  });
  if (successRow) moveInstrumentation(successRow, success);
  const icon = document.createElement('img');
  Object.assign(icon, {
    src: `${window.hlx.codeBasePath}/icons/verified.png`, alt: '', width: 48, height: 48, className: 'service-request-success-icon',
  });
  success.prepend(icon);
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'button primary service-request-done';
  done.textContent = MESSAGES.successLabel;
  success.append(done);

  const dialog = () => block.closest('dialog');
  const close = () => {
    const d = dialog();
    if (d) d.close();
    else window.history.back();
  };
  done.addEventListener('click', close);
  const showStep = (step) => {
    [main, success].forEach((view) => { view.hidden = view !== step; });
    block.dataset.step = step.classList[1].replace('service-request-', '');
    dialog()?.setAttribute('aria-labelledby', step === main ? heading?.id : step.titleId);
    dialog()?.querySelector('.modal-content')?.scrollTo(0, 0);
    if (step !== main) step.querySelector('[tabindex="-1"]')?.focus();
  };

  /** the Login popup, over the form: closing it goes back to the form */
  const openLogin = async () => {
    const { createModal } = await import('../modal/modal.js');
    const modal = await createModal([login], {
      className: 'modal-compact service-request-login-modal',
      label: login.querySelector('h1, h2, h3, h4, h5, h6')?.textContent.trim()
        || MESSAGES.loginHeading,
    });
    modal.showModal();
    login.querySelector('[tabindex="-1"]')?.focus();
  };

  // analytics: never the Party ID, account number or description
  const formName = () => {
    const page = (dialog()?.dataset.modalPath || '').split('/').filter(Boolean).pop() || '';
    return analyticsName(page.replace(/(\.plain)?\.html$/, ''))
      || analyticsName(heading?.textContent) || 'service_request';
  };
  trackFormStart(form, formName, () => roles.product?.dropdown.value || '');

  /** the form's values by role (see submitPayload in the config) */
  const valuesOf = () => {
    const values = {
      partyId: '', product: '', loanAccount: '', subject: '', subType: '', city: '', description: '', extra: {},
    };
    checks.forEach((check) => {
      if (check.kind === 'captcha') return;
      const value = check.dropdown ? check.dropdown.value : check.control.value.trim();
      const role = ROLE_KEYS[check.kind]
        || (check.kind === 'textarea' && !values.description && 'description');
      if (role && !values[role]) values[role] = value;
      else values.extra[slug(check.label)] = value;
    });
    return values;
  };

  form.addEventListener('submit', async (e) => {
    // never a native submit: the details must not end up in a URL
    e.preventDefault();
    if (submit.classList.contains('is-loading')) return;
    showSubmitError('');
    if (!isValid()) {
      const invalid = checks.filter((check) => !check.valid());
      checks.forEach((check) => setState(check, invalid.includes(check)));
      invalid[0]?.control.focus();
      return;
    }
    const values = valuesOf();
    captcha?.stopAudio();
    const online = isSelfService(values.subject, loginSubjects);
    const track = () => pushEvent('service_request_submit', safely(() => ({
      form_name: formName(),
      product: analyticsName(values.product),
      subject: analyticsName(values.subject),
      sub_type: analyticsName(values.subType),
      city: analyticsName(values.city),
      request_type: online ? 'self_service' : 'submitted',
    }), {}));

    // done online: no API call, the visitor logs in to the Customer Portal
    if (online) {
      track();
      openLogin();
      return;
    }

    setLoading(submit, true, 'Submitting your request');
    try {
      await submitServiceRequest(values, captcha.input.value);
      track();
      showStep(success);
    } catch (error) {
      // every captcha is single-use: a new one for the next attempt
      captcha?.load();
      if (error?.step === 'captcha' && captchaCheck) {
        const message = captchaErrorMessage(error, 'captcha');
        if (message) setState(captchaCheck, true, message);
        captchaCheck.control.focus();
      } else {
        const message = requestErrorMessage(error, submitErrorText);
        if (message) showSubmitError(message);
      }
    } finally {
      setLoading(submit, false);
      refresh();
    }
  });

  // small screens: the form is a page of its own below the header, with "Go back"
  const goBack = document.createElement('button');
  goBack.type = 'button';
  goBack.className = 'lead-form-goback';
  goBack.innerHTML = `<img src="${window.hlx.codeBasePath}/icons/chevron-left.svg" alt="" width="16" height="16"><span>Go back</span>`;
  goBack.addEventListener('click', close);

  block.dataset.step = 'main';
  refresh();
  block.replaceChildren(goBack, main, success, status);
  // the modal decorates the form on every opening, so this is a captcha per opening
  captcha?.load();
  // the sheet lists fill in when loaded: the popup does not wait for them
  dataReady.catch(() => {});
  await styles;
}
