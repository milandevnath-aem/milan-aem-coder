/*
  Input rules shared by the forms (hero call-back form, lead form, GST form): what a name,
  email, mobile number, PIN code, PAN or GSTIN field accepts, and the messages shown when it
  is blank or wrong.
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
 * A person's full name ("Your name", "Name", "Promoter name"): first and last name are both
 * needed, as the lead APIs require a last name. Not a dealership or manufacturer.
 */
export const isFullName = (label) => isPersonName(label) && !isNamePart(label)
  && !/\b(dealer(ship)?|manufacturer|brand|shop|firm|showroom)\b/i.test(label);

/**
 * What a field shows when it is left blank (`empty`) or holds a wrong value (`invalid`).
 * @param {string} label the field's label, e.g. "Your name", "City", "Nature of funding"
 * @param {string} kind tel, email, zip, select, search, captcha, pan, gstin, number,
 *   alphanumeric or text
 * @returns {{ empty: string, invalid: string }}
 */
export function fieldMessages(label, kind) {
  // "GST Regn ARN" -> "GST regn ARN": abbreviations stay in capitals
  const name = label.trim().replace(/^(your|select|enter)\s+/i, '').split(/\s+/)
    .map((word) => (/^[A-Z0-9/]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(' ');
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
  if (kind === 'pan') {
    return {
      empty: 'Please enter PAN number to proceed!',
      invalid: 'Please enter a valid 10-character PAN (e.g. ABCDE1234F) to proceed!',
    };
  }
  if (kind === 'gstin') {
    return {
      empty: `Please enter ${name} to proceed!`,
      invalid: `Please enter a valid 15-character ${label} (e.g. 27ABCDE1234F1Z5) to proceed!`,
    };
  }
  if (kind === 'number') {
    return { empty: `Please enter ${name} to proceed!`, invalid: 'Please enter digits only to proceed!' };
  }
  if (kind === 'alphanumeric') {
    return {
      empty: `Please enter ${name} to proceed!`,
      invalid: 'Please enter letters and numbers only to proceed!',
    };
  }
  if (['text', 'text-half'].includes(kind) && isFullName(label)) {
    return {
      empty: `Please enter ${name} to proceed!`,
      invalid: 'Please enter your first and last name, using letters only, to proceed!',
    };
  }
  return {
    empty: `Please enter ${name} to proceed!`,
    invalid: 'Please enter valid characters to proceed!',
  };
}

export function valueErrorMessage(label, kind, value, fallback) {
  if (['text', 'text-half'].includes(kind) && isFullName(label) && /^[a-zA-Z]+$/.test(value.trim())) {
    return 'Please enter your first and last name to proceed!';
  }
  return fallback;
}

export function rejectedErrorMessage(label, kind, characters) {
  const isPhone = kind === 'tel';
  if (!isPhone && (!['text', 'text-half'].includes(kind) || !isPersonName(label))) return '';
  if (!characters) {
    return isPhone ? 'Mobile number cannot exceed 10 digits.' : `Name cannot exceed ${NAME_MAX} characters.`;
  }
  if (isPhone) {
    return /[^a-zA-Z0-9]/.test(characters)
      ? 'Special characters are not allowed in mobile numbers.'
      : 'Only numbers are allowed in mobile numbers.';
  }
  return /[^a-zA-Z0-9 ]/.test(characters)
    ? 'Special characters are not allowed in names.'
    : 'Only letters are allowed in names.';
}

/**
 * Keeps an input to the characters `allowed` matches, up to a length: other typed
 * characters are blocked, pasted, dropped or autofilled text is cleaned (the caret stays
 * after the same character).
 * @param {HTMLInputElement} input a text or tel input (not email: no caret API)
 * @param {RegExp} allowed matches one allowed character, e.g. /\d/ (no g flag)
 * @param {number} max maximum length
 * @param {Function} [onReject] called when something typed or pasted was refused, after
 *   the form's own input listeners (so they do not clear the message it shows). A key
 *   pressed once the field is full (a fast typist, a key held down) is refused silently:
 *   the value is complete and stays valid.
 */
export function allowOnly(input, allowed, max, onReject) {
  const keep = (text) => [...text].filter((c) => allowed.test(c)).join('');
  input.addEventListener('beforeinput', (e) => {
    // phone keyboards that compose send the whole word: it is cleaned on input below
    if (!e.data || !e.inputType.startsWith('insert') || e.inputType === 'insertCompositionText') return;
    const room = max - (input.value.length - (input.selectionEnd - input.selectionStart));
    const clean = keep(e.data) === e.data;
    // a typed character that is not allowed; longer mixed text (a pasted "560 001") goes
    // through and is cleaned below
    if (e.data.length === 1 && !clean) {
      e.preventDefault();
      onReject?.(e.data);
    } else if (clean && e.data.length > room) {
      // allowed text with no room left: one more key is ignored, a longer paste is refused
      e.preventDefault();
      if (e.data.length > 1) onReject?.();
    }
  });
  // runs before the form's own input listener, so validation sees the cleaned value
  input.addEventListener('input', () => {
    const refused = [...input.value].filter((c) => !allowed.test(c)).join('');
    const allowedOnly = keep(input.value) === input.value;
    const clean = keep(input.value).slice(0, max);
    if (clean === input.value) return;
    const caret = input.selectionStart ?? input.value.length;
    const keptBefore = keep(input.value.slice(0, caret)).length;
    input.value = clean;
    const pos = Math.min(keptBefore, clean.length);
    input.setSelectionRange(pos, pos);
    // only cut to length (composed or autofilled text): nothing to tell
    if (onReject && !allowedOnly) setTimeout(() => onReject(refused));
  });
}

/** digits only, up to `max` */
export const digitsOnly = (input, max, onReject) => allowOnly(input, /\d/, max, onReject);

/**
 * A name, up to NAME_MAX: letters only for a first or last name; letters and spaces for
 * a full name ("Your name"), which must hold a first and a last name ("Shital Rao", not
 * "Shital"); letters and spaces, at least one letter, for any other name (a dealership).
 * The pattern also flags a value set by code (e.g. carried over from another form).
 * @param {HTMLInputElement} input a text input
 * @param {string} label the field's label
 * @param {Function} [onReject] see allowOnly
 */
export function nameRules(input, label, onReject) {
  if (isNamePart(label)) {
    input.pattern = `[A-Za-z]{1,${NAME_MAX}}`;
    allowOnly(input, /[A-Za-z]/, NAME_MAX, onReject);
  } else if (isFullName(label)) {
    input.pattern = `(?=.{1,${NAME_MAX}}$) *[A-Za-z]+( +[A-Za-z]+)+ *`;
    allowOnly(input, /[A-Za-z ]/, NAME_MAX, onReject);
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
 * Letters and numbers only, up to `max`, typed letters shown in capitals (PAN, GSTIN,
 * reference numbers).
 * @param {HTMLInputElement} input a text input
 * @param {number} max maximum length
 * @param {Function} [onReject] see allowOnly
 */
export function upperAlphanumeric(input, max, onReject) {
  Object.assign(input, {
    autocapitalize: 'characters', autocomplete: 'off', spellcheck: false, maxLength: max,
  });
  allowOnly(input, /[A-Za-z0-9]/, max, onReject);
  input.addEventListener('input', () => {
    const upper = input.value.toUpperCase();
    if (upper === input.value) return;
    const { selectionStart, selectionEnd } = input;
    input.value = upper;
    input.setSelectionRange(selectionStart, selectionEnd);
  });
}

/**
 * PAN: five letters, four digits, one letter (ABCDE1234F).
 * @param {HTMLInputElement} input
 * @param {Function} [onReject] see allowOnly
 */
export function panRules(input, onReject) {
  input.pattern = '[A-Z]{5}[0-9]{4}[A-Z]';
  upperAlphanumeric(input, 10, onReject);
}

/**
 * GSTIN, also the format of a GST provisional ID: state code (2 digits), PAN, entity number,
 * "Z" and a check character (27ABCDE1234F1Z5).
 * @param {HTMLInputElement} input
 * @param {Function} [onReject] see allowOnly
 */
export function gstinRules(input, onReject) {
  input.pattern = '[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]';
  upperAlphanumeric(input, 15, onReject);
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
