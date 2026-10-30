/*
  Input rules shared by the forms (hero call-back form, lead form): what a name, email,
  mobile number or PIN code field accepts, and the messages shown when it is blank or wrong.
*/

// longest accepted name (each name field) and email address
export const NAME_MAX = 30;
export const EMAIL_MAX = 35;

/**
 * A name field, letters only: a person's name ("Name", "First name", "Promoter name"), a
 * dealership or a manufacturer; not a company account ("Account name").
 */
export const isPersonName = (label) => /name|manufacturer/i.test(label)
  && !/\b(account|company|business|organi[sz]ation)\b/i.test(label);

/** one part of a name ("First name", "Last name", "Surname"), not the full name */
export const isNamePart = (label) => /\b(first|given|middle|last|sur|family)\s*name/i.test(label);

/**
 * What a field shows when it is left blank (`empty`) or holds a wrong value (`invalid`).
 * @param {string} label the field's label, e.g. "Your name", "City", "Nature of funding"
 * @param {string} kind tel, email, zip, select, search, captcha or text
 * @returns {{ empty: string, invalid: string }}
 */
export function fieldMessages(label, kind) {
  const name = label.toLowerCase().replace(/^(your|select|enter)\s+/, '').trim();
  if (kind === 'tel') {
    return {
      empty: 'Please enter mobile number to proceed!',
      invalid: 'Mobile must start with (6/7/8/9) and be numeric, with a length of 10 digits',
    };
  }
  if (kind === 'email') {
    return {
      empty: 'Please enter email id to proceed!',
      invalid: 'Please enter valid Email id to proceed!',
    };
  }
  if (kind === 'zip') {
    return {
      empty: 'Please enter pincode to proceed!',
      invalid: 'Please enter a valid 6-digit pincode to proceed!',
    };
  }
  if (kind === 'select' || kind === 'search') {
    const message = `Please select ${name === 'city' ? 'the city' : name} to proceed!`;
    return { empty: message, invalid: message };
  }
  if (kind === 'captcha') {
    return { empty: 'Captcha cannot be blank', invalid: 'Invalid captcha please try again!' };
  }
  return {
    empty: `Please enter ${name} to proceed!`,
    invalid: 'Please enter valid characters to proceed!',
  };
}

/**
 * Keeps an input to the characters `allowed` matches, up to a length: other typed
 * characters are blocked, pasted, dropped or autofilled text is cleaned (the caret stays
 * after the same character).
 * @param {HTMLInputElement} input a text or tel input (not email: no caret API)
 * @param {RegExp} allowed matches one allowed character, e.g. /\d/ (no g flag)
 * @param {number} max maximum length
 * @param {Function} [onReject] called when something typed or pasted was refused, after
 *   the form's own input listeners (so they do not clear the message it shows)
 */
export function allowOnly(input, allowed, max, onReject) {
  const keep = (text) => [...text].filter((c) => allowed.test(c)).join('');
  input.addEventListener('beforeinput', (e) => {
    if (!e.data || !e.inputType.startsWith('insert')) return;
    const room = max - (input.value.length - (input.selectionEnd - input.selectionStart));
    const clean = keep(e.data) === e.data;
    // a typed character that is not allowed, or allowed text with no room left; longer
    // mixed text (a pasted "560 001") goes through and is cleaned below
    if ((e.data.length === 1 && !clean) || (clean && e.data.length > room)) {
      e.preventDefault();
      onReject?.();
    }
  });
  // runs before the form's own input listener, so validation sees the cleaned value
  input.addEventListener('input', () => {
    const clean = keep(input.value).slice(0, max);
    if (clean === input.value) return;
    const caret = input.selectionStart ?? input.value.length;
    const keptBefore = keep(input.value.slice(0, caret)).length;
    input.value = clean;
    const pos = Math.min(keptBefore, clean.length);
    input.setSelectionRange(pos, pos);
    if (onReject) setTimeout(onReject);
  });
}

/** digits only, up to `max` */
export const digitsOnly = (input, max, onReject) => allowOnly(input, /\d/, max, onReject);

/**
 * A name, up to NAME_MAX: letters only for a first or last name, letters and spaces for
 * a full name ("Your name"), which must hold at least one letter (spaces only is blank).
 * The pattern also flags a value set by code (e.g. carried over from another form).
 * @param {HTMLInputElement} input a text input
 * @param {string} label the field's label
 * @param {Function} [onReject] see allowOnly
 */
export function nameRules(input, label, onReject) {
  if (isNamePart(label)) {
    input.pattern = `[A-Za-z]{1,${NAME_MAX}}`;
    allowOnly(input, /[A-Za-z]/, NAME_MAX, onReject);
  } else {
    input.pattern = `(?=.{1,${NAME_MAX}}$) *[A-Za-z][A-Za-z ]*`;
    allowOnly(input, /[A-Za-z ]/, NAME_MAX, onReject);
  }
}

/**
 * Email, up to EMAIL_MAX: a name, "@" and a domain with an extension (abc@test.com, not
 * abc@test). maxLength stops typing and pasting; the pattern also flags a value set by code.
 * @param {HTMLInputElement} input
 */
export function emailRules(input) {
  Object.assign(input, {
    type: 'email',
    autocomplete: 'email',
    maxLength: EMAIL_MAX,
    pattern: `(?=.{1,${EMAIL_MAX}}$)[A-Za-z0-9._%+\\-]+@[A-Za-z0-9\\-]+(\\.[A-Za-z0-9\\-]+)*\\.[A-Za-z]{2,}`,
  });
}

/**
 * Indian mobile number: 10 digits starting with 6-9, digits only.
 * @param {HTMLInputElement} input
 * @param {Function} [onReject] see allowOnly
 */
export function mobileRules(input, onReject) {
  Object.assign(input, {
    type: 'tel', inputMode: 'numeric', pattern: '[6-9][0-9]{9}', autocomplete: 'tel-national',
  });
  digitsOnly(input, 10, onReject);
}

/**
 * The browser's own validation bubble shows `messages` (forms that do not draw their own
 * errors, like the hero call-back form).
 * @param {HTMLInputElement} input
 * @param {{ empty: string, invalid: string }} messages see fieldMessages
 * @returns {Function} shows the invalid message now (e.g. as onReject of the input rules)
 */
export function nativeMessages(input, { empty, invalid }) {
  input.addEventListener('input', () => input.setCustomValidity(''));
  input.addEventListener('invalid', () => {
    input.setCustomValidity(input.value.trim() ? invalid : empty);
  });
  return () => {
    input.setCustomValidity(invalid);
    input.reportValidity();
  };
}
