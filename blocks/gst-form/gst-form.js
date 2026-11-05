import { loadCSS } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { createDropdown } from '../../scripts/dropdown.js';
import { slug } from '../../scripts/category-forms.js';
import {
  digitsOnly, fieldMessages, gstinRules, panRules, upperAlphanumeric,
} from '../../scripts/input-rules.js';
import {
  captchaField, fieldError, parseOptions, rejected, textField,
} from '../lead-form/lead-form.js';

/*
  GST form: Customer / Vendor switch, GST details, captcha, Submit and Contact Us.
  The fields, captcha and messages are the lead form's (lead-form.js, lead-form.css).

  The GST API is not available yet: Submit checks the fields and the captcha format, then
  shows the confirmation. Nothing is sent.
*/

/** "Customer, Vendor" -> ["Customer", "Vendor"] */
const list = (text) => String(text || '').split(',').map((t) => t.trim()).filter(Boolean);

/** autofill values of address fields */
function addressAutocomplete(label) {
  if (/address\s*(line\s*)?1\b/i.test(label)) return 'address-line1';
  if (/address\s*(line\s*)?2\b/i.test(label)) return 'address-line2';
  if (/\bstate\b/i.test(label) && !/code|gst/i.test(label)) return 'address-level1';
  return '';
}

/**
 * One field of the form.
 * @param {string} label
 * @param {string} kind text, number, alphanumeric, pan, gstin, tel, email, zip, select,
 *   search or captcha
 * @param {string} optionsText dropdown options, or the maximum length of a number or
 *   alphanumeric field
 * @param {boolean} required
 * @returns {{ field: HTMLElement, dropdown?: HTMLElement, captcha?: HTMLElement }}
 */
function buildField(label, kind, optionsText, required) {
  if (kind === 'select' || kind === 'search') {
    const { options, value } = parseOptions(optionsText);
    const dropdown = createDropdown({
      label,
      name: slug(label),
      options,
      value,
      required,
      search: kind === 'search',
      searchPlaceholder: `Search ${label.toLowerCase()}`,
      pinSelected: true,
    });
    // a city field lists the cities of the city master; the authored options stay when
    // it cannot be loaded
    if (/\bcity\b/i.test(label)) {
      import('../../scripts/city-locator.js')
        .then(({ loadCityMaster }) => loadCityMaster())
        .then((cities) => {
          const names = [...new Set(cities.map((c) => c.name))];
          if (names.length) dropdown.setOptions(names.map((n) => ({ value: n, label: n })));
        })
        .catch(() => {});
    }
    return { field: dropdown, dropdown };
  }
  if (kind === 'captcha') {
    const captcha = captchaField(label);
    return { field: captcha, captcha };
  }
  const native = ['tel', 'email', 'zip'].includes(kind) ? kind : 'text';
  const field = textField(label, native, required);
  const input = field.querySelector('input');
  const max = parseInt(optionsText, 10) || 0;
  if (kind === 'pan') panRules(input, rejected(input));
  else if (kind === 'gstin') gstinRules(input, rejected(input));
  else if (kind === 'number') {
    input.inputMode = 'numeric';
    digitsOnly(input, max || 20, rejected(input));
  } else if (kind === 'alphanumeric') upperAlphanumeric(input, max || 20, rejected(input));
  else if (native === 'text' && addressAutocomplete(label)) {
    input.autocomplete = addressAutocomplete(label);
  }
  // a fixed length ("2" for a state code) must be filled in full; a pattern, as minLength
  // does not flag a value filled in by the browser or the code
  if (max && kind === 'number') input.pattern = `[0-9]{${max}}`;
  if (max && kind === 'alphanumeric') input.pattern = `[A-Z0-9]{${max}}`;
  return { field };
}

/** Confirmation shown in place of the form once it is submitted. */
function buildThanks() {
  const thanks = document.createElement('div');
  thanks.className = 'gst-form-thanks';
  thanks.setAttribute('role', 'status');
  thanks.innerHTML = `
    <h2 tabindex="-1">Thank you!</h2>
    <p>Your details have been submitted. Our team will get back to you shortly.</p>`;
  return thanks;
}

/**
 * GST form. Block properties: heading and text, form types (Customer, Vendor), button label
 * and Contact Us link; each item is a field (label, type, options, required, shown for).
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // the fields, captcha and errors look like the lead form's
  block.classList.add('lead-form');
  const styles = loadCSS(`${window.hlx.codeBasePath}/blocks/lead-form/lead-form.css`);

  const rows = [...block.children];
  const config = rows.filter((row) => row.children.length <= 1);
  const fieldRows = rows.filter((row) => row.children.length > 1);
  const [textRow, typesRow, submitRow, contactRow] = config;

  const intro = document.createElement('div');
  intro.className = 'lead-form-intro gst-form-intro';
  const textCell = textRow?.firstElementChild;
  if (textCell?.textContent.trim()) {
    moveInstrumentation(textRow, intro);
    while (textCell.firstChild) intro.append(textCell.firstChild);
  }
  const heading = intro.querySelector('h1, h2, h3');
  if (heading && !heading.id) heading.id = `gst-form-title-${Math.random().toString(36).slice(2, 8)}`;

  const form = document.createElement('form');
  form.noValidate = true;
  form.method = 'post';
  form.className = 'lead-form-form gst-form-form';
  if (heading) form.setAttribute('aria-labelledby', heading.id);

  // Customer / Vendor: a radio group, so the picked type is a form value too
  const types = list(typesRow?.textContent);
  if (types.length > 1) {
    const switcher = document.createElement('div');
    switcher.className = 'gst-form-types';
    switcher.setAttribute('role', 'radiogroup');
    switcher.setAttribute('aria-label', 'I am a');
    types.forEach((type, i) => {
      const option = document.createElement('label');
      option.className = 'gst-form-type';
      const radio = document.createElement('input');
      Object.assign(radio, {
        type: 'radio', name: 'type', value: type, checked: i === 0,
      });
      const text = document.createElement('span');
      text.textContent = type;
      option.append(radio, text);
      switcher.append(option);
    });
    moveInstrumentation(typesRow, switcher);
    form.append(switcher);
  }
  const selectedType = () => form.querySelector('input[name="type"]:checked')?.value || '';

  const fields = document.createElement('div');
  fields.className = 'lead-form-fields';
  const checks = [];
  let captcha;
  fieldRows.forEach((row) => {
    const [labelCell, kindCell, optionsCell, requiredCell, typesCell] = row.children;
    const label = labelCell?.textContent.trim() || 'Field';
    const optionsText = optionsCell?.textContent.trim() || '';
    let kind = kindCell?.textContent.trim() || 'text';
    // a city field is a searchable list (city master)
    if (/\bcity\b/i.test(label) && kind === 'text') kind = 'search';
    else if (kind === 'text' && optionsText.includes(',')) kind = list(optionsText).length > 6 ? 'search' : 'select';
    const required = requiredCell?.textContent.trim() !== 'false';
    const built = buildField(label, kind, optionsText, required);
    const { field, dropdown } = built;
    if (built.captcha) captcha = built.captcha;

    const item = document.createElement('div');
    item.className = 'lead-form-item';
    // "Shown for": the form types the field belongs to, all of them when blank
    item.dataset.types = JSON.stringify(list(typesCell?.textContent));
    moveInstrumentation(row, field);
    item.append(field);

    const control = field.querySelector('.dropdown-field') || field.querySelector('input:not([type="hidden"])');
    if (control) {
      const messages = fieldMessages(label, kind);
      const error = fieldError(control, messages.empty);
      let valid = () => control.checkValidity();
      if (field === captcha) valid = () => captcha.isValid();
      if (dropdown) valid = () => !dropdown.dataset.required || Boolean(dropdown.value);
      const isEmpty = dropdown ? () => !dropdown.value : () => !control.value.trim();
      checks.push({
        item, field, control, error, valid, messages, isEmpty,
      });
      item.append(error.el);
    }
    fields.append(item);
  });
  form.append(fields);

  const actions = document.createElement('div');
  actions.className = 'gst-form-actions';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button primary lead-form-submit gst-form-submit';
  submit.textContent = submitRow?.textContent.trim() || 'Submit';
  if (submitRow) moveInstrumentation(submitRow, submit);
  actions.append(submit);
  const contactLink = contactRow?.querySelector('a');
  if (contactLink) {
    const contact = document.createElement('a');
    contact.className = 'button secondary gst-form-contact';
    contact.href = contactLink.getAttribute('href');
    contact.textContent = contactLink.textContent.trim() || 'Contact Us';
    moveInstrumentation(contactLink, contact);
    actions.append(contact);
  }
  form.append(actions);

  // only the fields of the selected type count: the others are hidden and left out of the
  // form data (disabled)
  const visible = () => checks.filter((check) => !check.item.hidden);
  const isValid = () => visible().every((check) => check.valid());
  const setState = (check, invalid, message) => {
    const { empty, invalid: wrong } = check.messages;
    check.error.show(invalid, message || (check.isEmpty() ? empty : wrong));
    const box = check.field.closest('.lead-form-input')
      || check.field.querySelector('.lead-form-input') || check.field;
    box.classList.toggle('is-invalid', invalid);
  };
  // the button stays focusable while the form is incomplete; submitting lists what is missing
  const refresh = () => submit.setAttribute('aria-disabled', !isValid());

  const showType = () => {
    const type = selectedType();
    [...fields.children].forEach((item) => {
      const itemTypes = JSON.parse(item.dataset.types || '[]');
      const shown = !type || !itemTypes.length
        || itemTypes.some((t) => t.toLowerCase() === type.toLowerCase());
      item.hidden = !shown;
      item.querySelectorAll('input, textarea, button').forEach((el) => { el.disabled = !shown; });
    });
    // messages of the other type's fields are not carried over
    checks.forEach((check) => setState(check, false));
    refresh();
  };
  form.querySelectorAll('input[name="type"]').forEach((radio) => radio.addEventListener('change', showType));

  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  // mark fields left with an invalid value; clear the message while correcting
  form.addEventListener('focusout', (e) => {
    const check = checks.find((c) => c.control === e.target);
    if (!check || !e.target.value) return;
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
  checks.filter((check) => check.field.matches('.dropdown')).forEach((check) => {
    check.field.addEventListener('change', () => {
      setState(check, false);
      refresh();
    });
  });
  const captchaCheck = checks.find((c) => c.field === captcha);
  if (captcha && captchaCheck) captcha.onError = (message) => setState(captchaCheck, true, message);

  form.addEventListener('submit', (e) => {
    // never a native submit: the details must not end up in a URL
    e.preventDefault();
    if (!isValid()) {
      const invalid = visible().filter((check) => !check.valid());
      visible().forEach((check) => setState(check, invalid.includes(check)));
      invalid[0]?.control.focus();
      return;
    }
    captcha?.stopAudio();
    // the GST API is not available yet: the form is checked and confirmed on the page only
    const thanks = buildThanks();
    form.replaceWith(thanks);
    thanks.querySelector('h2').focus();
  });

  showType();
  block.replaceChildren(intro, form);
  captcha?.load();
  await styles;
}
