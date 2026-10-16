import { moveInstrumentation } from '../../scripts/scripts.js';
import { createDropdown } from '../../scripts/dropdown.js';

const CAPTCHA_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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
 * @returns {{ el: HTMLParagraphElement, show: Function }}
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
  const show = (invalid) => {
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

function textField(label, kind, required) {
  const field = document.createElement('label');
  field.className = `lead-form-input lead-form-${kind}`;
  const input = document.createElement('input');
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
      type: 'tel', inputMode: 'numeric', pattern: '[6-9][0-9]{9}', maxLength: 10, autocomplete: 'tel-national',
    });
  } else if (kind === 'email') {
    Object.assign(input, { type: 'email', autocomplete: 'email' });
  } else if (kind === 'zip') {
    Object.assign(input, {
      type: 'text', inputMode: 'numeric', pattern: '[1-9][0-9]{5}', maxLength: 6, autocomplete: 'postal-code',
    });
  } else {
    input.type = 'text';
    // first and last name get their own autofill values, or the full name fills both
    if (/\b(first|given)\b.*name/i.test(label)) input.autocomplete = 'given-name';
    else if (/\b(last|sur|family)\s*name/i.test(label)) input.autocomplete = 'family-name';
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

function drawCaptcha(canvas, code) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.fillStyle = '#002c62';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgb(255 255 255 / 25%)';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.bezierCurveTo(
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height,
    );
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  [...code].forEach((char, i) => {
    ctx.save();
    ctx.translate(22 + i * 30, height / 2 + (Math.random() * 16 - 8));
    ctx.rotate((Math.random() - 0.5) * 0.7);
    ctx.font = `700 ${26 + Math.round(Math.random() * 10)}px Manrope, Arial, sans-serif`;
    ctx.fillText(char, -8, 0);
    ctx.restore();
  });
}

function captchaField(label) {
  const field = document.createElement('div');
  field.className = 'lead-form-captcha';
  const canvas = document.createElement('canvas');
  canvas.width = 168;
  canvas.height = 68;
  canvas.setAttribute('role', 'img');
  const tools = document.createElement('div');
  tools.className = 'lead-form-captcha-tools';
  const refresh = iconButton('refresh', 'Show a new code');
  const listen = iconButton('volume', 'Listen to the code');
  tools.append(refresh, listen);
  const input = textField(label || 'Enter the code', 'text', true);
  input.querySelector('input').name = 'captcha';
  input.querySelector('input').autocomplete = 'off';
  field.append(canvas, tools, input);

  const generate = () => {
    field.code = [...Array(5)].map(() => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]).join('');
    canvas.setAttribute('aria-label', 'Security code image. Use the listen button to hear it.');
    drawCaptcha(canvas, field.code);
    input.querySelector('input').value = '';
    input.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));
  };
  refresh.addEventListener('click', generate);
  listen.addEventListener('click', () => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance([...field.code].join(' '));
    utterance.rate = 0.7;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
  generate();
  field.isValid = () => input.querySelector('input').value.trim().toLowerCase() === field.code.toLowerCase();
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

/**
 * Lead form ("Start Your Loan Journey Today"). Block properties: heading, disclaimer,
 * note and button label; each item is a field (label, type, options, required).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const config = rows.filter((row) => row.children.length <= 1);
  const fieldRows = rows.filter((row) => row.children.length > 1);
  const [textRow, disclaimerRow, noteRow, submitRow] = config;

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
    if (halfCell?.textContent.trim() === 'true') item.classList.add('is-half');
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
      dropdowns.push(field);
    } else if (kind === 'captcha') {
      field = captchaField(label);
      captcha = field;
    } else if (kind === 'textarea') {
      field = textareaField(label, required, parseInt(optionsText, 10) || 150);
    } else {
      field = textField(label, kind, required);
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
  // two name fields in a row (Name + LName, First name + Last name) are first and last
  // name: they share a line 50/50, Half width ticked or not
  const items = [...fields.children];
  const nameInput = (item) => [...item.querySelectorAll('.lead-form-text input')]
    .find((input) => /name/.test(input.name));
  for (let i = 0; i < items.length - 1; i += 1) {
    const first = nameInput(items[i]);
    const last = nameInput(items[i + 1]);
    if (first && last) {
      first.autocomplete = 'given-name';
      last.autocomplete = 'family-name';
      items[i].classList.add('is-half');
      items[i + 1].classList.add('is-half');
      i += 1;
    }
  }
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
  legal.append(submit);
  form.append(legal);

  const isValid = () => form.checkValidity()
    && dropdowns.every((d) => !d.dataset.required || d.value)
    && (!captcha || captcha.isValid());
  const setState = (check, invalid) => {
    check.error.show(invalid);
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
    const check = checks.find((c) => c.control === e.target);
    if (check) setState(check, false);
  });
  dropdowns.forEach((d) => d.addEventListener('change', () => {
    const check = checks.find((c) => c.field === d);
    if (check) setState(check, false);
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isValid()) {
      const invalid = checks.filter((check) => !check.valid());
      checks.forEach((check) => setState(check, invalid.includes(check)));
      invalid[0]?.control.focus();
      return;
    }
    const thanks = document.createElement('div');
    thanks.className = 'lead-form-thanks';
    thanks.setAttribute('role', 'status');
    thanks.innerHTML = '<h3>Thank you!</h3><p>Our loan expert will call you back shortly.</p>';
    form.replaceWith(thanks);
    thanks.tabIndex = -1;
    thanks.focus();
  });

  // values carried over from another form (e.g. the hero call-back form)
  form.prefill = (data) => {
    const inputs = [...form.querySelectorAll('input[name]')].filter((i) => i.type !== 'hidden');
    const first = inputs.find((i) => i.autocomplete === 'given-name');
    const last = inputs.find((i) => i.autocomplete === 'family-name');
    Object.entries(data).forEach(([key, value]) => {
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
      dropdown?.setValue(value);
    });
    refresh();
  };

  block.replaceChildren(intro, form);
}
