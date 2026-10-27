import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/* ---------------------------------------------------------------------------
 * Configuration: every default, limit and message of the calculator lives here.
 * ------------------------------------------------------------------------- */

// [min, max, default, slider step]; tenure is in years
const DEFAULTS = {
  amount: [100000, 10000000, 5000000, 10000],
  rate: [8, 24, 8, 0.1],
  tenure: [1, 7, 5, 1],
};

// Tenure limits in months come from the authored "minimum / maximum months" fields.
// When those are empty or invalid the year limits x 12 are used (default 1-7 years =
// 12-84 months), so both units always agree.
const TENURE = {
  monthsPerYear: 12,
  // slider step (months) when the author does not set a valid one
  monthsStep: 1,
};

const MESSAGES = {
  minValue: 'Minimum value is {value}',
  maxValue: 'Maximum value is {value}',
  tenureMonths: 'Enter a tenure between {min} and {max} months',
};

const UNITS = {
  yr: { suffix: 'Years', label: 'Years', toggle: 'YR' },
  mo: { suffix: 'Months', label: 'Months', toggle: 'MO' },
};

let idCounter = 0;

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, name) => values[name]);

/**
 * Reads the numbers of a grouped cell: one paragraph per field, in model order.
 * @returns {number[]} one entry per field, NaN where a field is missing or not a number
 */
function readNumbers(cell) {
  if (!cell) return [];
  const parts = cell.children.length
    ? [...cell.children].map((el) => el.textContent)
    : cell.textContent.split(/[\s,;|]+/);
  return parts.map((t) => parseFloat(t.replace(/[^0-9.]/g, '')));
}

/**
 * Reads a grouped cell (minimum, maximum, default, step).
 * A missing or empty field falls back to its default.
 * @returns {number[]} [min, max, default, step]
 */
function readRange(cell, defaults) {
  if (!cell) return defaults;
  const values = readNumbers(cell);
  return defaults.map((fallback, i) => (Number.isFinite(values[i]) ? values[i] : fallback));
}

/**
 * Minimum and maximum months for the tenure field. Authored values are used only when
 * both are whole numbers of at least 1 and the minimum is not above the maximum;
 * otherwise (empty, not a number, min > max) the year limits x 12 are used.
 * @param {number[]} authored [min, max, step] as read from the page (may contain NaN)
 * @param {{min: number, max: number}} yearLimits sanitized year limits
 * @returns {{min: number, max: number, step: number}}
 */
export function resolveMonthLimits(authored, yearLimits) {
  const [rawMin, rawMax, rawStep] = authored;
  const min = Math.round(rawMin);
  const max = Math.round(rawMax);
  const valid = Number.isFinite(min) && Number.isFinite(max) && min >= 1 && min <= max;
  const limits = valid
    ? { min, max }
    : {
      min: Math.max(1, Math.round(yearLimits.min * TENURE.monthsPerYear)),
      max: Math.max(1, Math.round(yearLimits.max * TENURE.monthsPerYear)),
    };
  const step = Math.round(rawStep);
  limits.step = step >= 1 && (limits.max === limits.min || step <= limits.max - limits.min)
    ? step
    : TENURE.monthsStep;
  return limits;
}

function formatAmountShort(value) {
  if (value >= 10000000) return `₹${inr.format(value / 10000000)} Crore`;
  if (value >= 100000) return `₹${inr.format(value / 100000)} Lakh`;
  return `₹${inr.format(value)}`;
}

function years(value) {
  return `${value} ${value === 1 ? 'year' : 'years'}`;
}

/**
 * Standard reducing-balance EMI.
 * @param {number} months loan tenure in months
 * @returns {number} monthly instalment
 */
export function calculateEmiForMonths(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (!months) return 0;
  if (!r) return principal / months;
  const f = (1 + r) ** months;
  return (principal * r * f) / (f - 1);
}

/**
 * Standard reducing-balance EMI for a tenure given in years.
 * @returns {number} monthly instalment
 */
export function calculateEmi(principal, annualRate, tenureYears) {
  return calculateEmiForMonths(principal, annualRate, tenureYears * TENURE.monthsPerYear);
}

function parseLoanType(row) {
  const [title, amount, rate, tenure] = row.children;
  return {
    row,
    title: title?.textContent.trim() || 'Loan',
    amount: readRange(amount, DEFAULTS.amount),
    rate: readRange(rate, DEFAULTS.rate),
    tenure: readRange(tenure, DEFAULTS.tenure),
    // the tenure cell continues after the years fields (min, max, default, step) with
    // minimum months, maximum months and month step; NaN where not authored
    tenureMonths: readNumbers(tenure).slice(4, 7),
  };
}

function sliderGroup(id, label, { unitToggle = false } = {}) {
  const group = document.createElement('div');
  group.className = 'emi-calculator-field';
  const toggle = unitToggle
    ? `<div class="emi-calculator-unit" role="group" aria-label="${label} unit">
          ${Object.entries(UNITS).map(([unit, { label: name, toggle: text }]) => `<button type="button" data-unit="${unit}" aria-label="${name}" aria-pressed="false">${text}</button>`).join('')}
        </div>`
    : '';
  group.innerHTML = `
    <div class="emi-calculator-field-head">
      <label id="${id}-label" for="${id}-value">${label}</label>
      <span class="emi-calculator-error-trigger" aria-hidden="true">
      <img class="emi-calculator-error-icon" src="${window.hlx.codeBasePath}/icons/alert.svg" alt="" width="16" height="16">
        <span class="emi-calculator-tooltip"></span>
      </span>
      <div class="emi-calculator-value">
        <span class="emi-calculator-prefix"></span>
        <input id="${id}-value" type="text" inputmode="numeric" autocomplete="off" aria-describedby="${id}-bounds ${id}-error">
        <span class="emi-calculator-suffix"></span>
        ${toggle}
      </div>
    </div>
    <p class="emi-calculator-error visually-hidden" id="${id}-error" aria-live="polite"></p>
    <div class="emi-calculator-slider">
      <span class="emi-calculator-slider-fill" aria-hidden="true"></span>
      <span class="emi-calculator-slider-knob" aria-hidden="true"></span>
      <span class="emi-calculator-slider-track" aria-hidden="true"></span>
      <input id="${id}-range" class="emi-calculator-range" type="range" aria-labelledby="${id}-label">
    </div>
    <div class="emi-calculator-bounds" id="${id}-bounds"><span></span><span></span></div>`;
  return group;
}

function buildCalculator(types, link) {
  idCounter += 1;
  const uid = `emi-calculator-${idCounter}`;
  const card = document.createElement('div');
  card.className = 'emi-calculator-card';

  const controls = document.createElement('div');
  controls.className = 'emi-calculator-controls';

  const tablist = document.createElement('div');
  tablist.className = 'emi-calculator-tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Loan type');
  types.forEach((type, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.id = `${uid}-tab-${i}`;
    tab.setAttribute('aria-controls', `${uid}-result`);
    tab.textContent = type.title;
    tab.dataset.index = i;
    moveInstrumentation(type.row, tab);
    tablist.append(tab);
  });
  if (types.length > 1) controls.append(tablist);

  const fields = {
    amount: sliderGroup(`${uid}-amount`, 'Loan requirement'),
    rate: sliderGroup(`${uid}-rate`, 'Interest rate'),
    tenure: sliderGroup(`${uid}-tenure`, 'Loan tenure', { unitToggle: true }),
  };
  fields.amount.querySelector('.emi-calculator-prefix').textContent = '₹';
  fields.rate.querySelector('.emi-calculator-suffix').textContent = '%';
  fields.tenure.querySelector('.emi-calculator-suffix').textContent = 'Years';
  const fieldList = document.createElement('fieldset');
  fieldList.className = 'emi-calculator-fields';
  const legend = document.createElement('legend');
  legend.className = 'visually-hidden';
  legend.textContent = 'Loan details';
  fieldList.append(legend, fields.amount, fields.rate, fields.tenure);
  controls.append(fieldList);

  const result = document.createElement('div');
  result.className = 'emi-calculator-result';
  result.id = `${uid}-result`;
  if (types.length > 1) result.setAttribute('role', 'tabpanel');
  result.innerHTML = `
    <div class="emi-calculator-summary">
      <div>
        <p class="emi-calculator-label">Your monthly EMI will be</p>
        <output class="emi-calculator-emi" aria-live="polite"><span>₹</span><strong></strong></output>
        <p class="emi-calculator-label emi-calculator-note"></p>
      </div>
      <a class="button emi-calculator-cta" href="#"></a>
    </div>
    <dl class="emi-calculator-breakdown">
      <dt>Principal</dt><dd data-key="principal"></dd>
      <dt>Interest Payable</dt><dd data-key="interest"></dd>
      <dt>Total Amount Payable</dt><dd data-key="total"></dd>
    </dl>`;

  card.append(controls, result);

  // `tenure` is held in the selected unit (state.unit): years or months
  const state = { unit: 'yr' };
  const cta = result.querySelector('.emi-calculator-cta');
  let tenureLimits = {};

  // elements touched on every update, looked up once
  const els = {
    emi: result.querySelector('.emi-calculator-emi strong'),
    note: result.querySelector('.emi-calculator-note'),
    principal: result.querySelector('[data-key="principal"]'),
    interest: result.querySelector('[data-key="interest"]'),
    total: result.querySelector('[data-key="total"]'),
  };
  const parts = {};
  Object.entries(fields).forEach(([key, group]) => {
    parts[key] = {
      group,
      range: group.querySelector('.emi-calculator-range'),
      slider: group.querySelector('.emi-calculator-slider'),
      input: group.querySelector('input[type="text"]'),
      error: group.querySelector('.emi-calculator-error'),
      head: group.querySelector('.emi-calculator-field-head'),
      trigger: group.querySelector('.emi-calculator-error-trigger'),
      tooltip: group.querySelector('.emi-calculator-tooltip'),
    };
  });

  const months = (v) => `${v} ${v === 1 ? 'month' : 'months'}`;
  const tenureText = (v) => (state.unit === 'mo' ? months(v) : years(v));
  const tenureInMonths = () => (state.unit === 'mo' ? state.tenure : state.tenure * TENURE.monthsPerYear);

  const display = {
    amount: (v) => inr.format(v),
    rate: (v) => `${v}`,
    tenure: (v) => `${v}`,
  };
  const bounds = {
    amount: formatAmountShort,
    rate: (v) => `${v}%`,
    tenure: tenureText,
  };
  const limitText = {
    amount: (v) => `₹${inr.format(v)}`,
    rate: (v) => `${v}%`,
    tenure: (v) => `${years(v)} (${months(v * TENURE.monthsPerYear)})`,
  };

  /** Text of the error shown in the tooltip (and announced to screen readers). */
  const errorMessage = (key, min, max, value) => {
    if (key === 'tenure' && state.unit === 'mo') return fill(MESSAGES.tenureMonths, { min, max });
    if (value > max) return fill(MESSAGES.maxValue, { value: limitText[key](max) });
    return fill(MESSAGES.minValue, { value: limitText[key](min) });
  };

  /**
   * Keeps authored numbers usable: minimum not above maximum, default within
   * them, a step that fits the range.
   */
  const sanitize = (key, [rawMin, rawMax, rawValue, rawStep]) => {
    let min = rawMin;
    let max = rawMax;
    if (min > max) [min, max] = [max, min];
    const value = Math.min(max, Math.max(min, rawValue));
    let step = rawStep;
    if (!(step > 0) || (max > min && step > max - min)) [, , , step] = DEFAULTS[key];
    return {
      min, max, value, step,
    };
  };

  /** Writes the state to the result, the number fields and the sliders. */
  const update = () => {
    const monthCount = tenureInMonths();
    const emi = Math.round(calculateEmiForMonths(state.amount, state.rate, monthCount));
    const total = emi * monthCount;
    els.emi.textContent = inr.format(emi);
    els.note.textContent = `at ${state.rate}% interest rate for ${tenureText(state.tenure)}`;
    els.principal.textContent = `₹${inr.format(state.amount)}`;
    els.interest.textContent = `₹${inr.format(total - state.amount)}`;
    els.total.textContent = `₹${inr.format(total)}`;
    Object.entries(parts).forEach(([key, { range, slider, input }]) => {
      const pct = (state[key] - range.min) / (range.max - range.min || 1);
      slider.style.setProperty('--pct', Math.min(1, Math.max(0, pct)));
      if (Number(range.value) !== state[key]) range.value = state[key];
      range.setAttribute('aria-valuetext', bounds[key](state[key]));
      if (document.activeElement !== input) input.value = display[key](state[key]);
      input.size = Math.max(1, input.value.length);
    });
  };

  // slider drags fire many input events per frame: do the work once per frame
  let frame = 0;
  const scheduleUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  /**
   * Places the error tooltip above the error icon, kept inside the field row;
   * the arrow keeps pointing at the icon.
   */
  const positionTooltip = (key) => {
    const {
      head, trigger, tooltip,
    } = parts[key];
    const headBox = head.getBoundingClientRect();
    tooltip.style.setProperty('--tip-max', `${headBox.width}px`);
    const iconBox = trigger.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const wanted = iconBox.left + iconBox.width / 2 - width / 2;
    const left = Math.max(headBox.left, Math.min(wanted, headBox.right - width));
    tooltip.style.setProperty('--tip-shift', `${left - wanted}px`);
  };

  // values outside the slider range mark the field as invalid;
  // the result keeps showing the last valid values
  const showError = (key, invalid, value) => {
    const {
      group, input, error, tooltip,
    } = parts[key];
    group.classList.toggle('is-invalid', invalid);
    if (invalid) {
      input.setAttribute('aria-invalid', 'true');
      const { min, max } = parts[key].range;
      const text = errorMessage(key, Number(min), Number(max), value);
      error.textContent = text;
      tooltip.textContent = text;
      positionTooltip(key);
    } else {
      input.removeAttribute('aria-invalid');
      error.textContent = '';
      tooltip.textContent = '';
      group.classList.remove('is-tip-open', 'is-tip-hidden');
    }
  };

  const applyRange = (key, { min, max, step }) => {
    const { group, range } = parts[key];
    range.min = min;
    range.max = max;
    range.step = step;
    const [lo, hi] = group.querySelectorAll('.emi-calculator-bounds span');
    lo.textContent = bounds[key](min);
    hi.textContent = bounds[key](max);
  };

  /** Applies the limits of the selected unit; the value is clamped into the new range. */
  const applyTenureUnit = () => {
    const limits = tenureLimits[state.unit];
    applyRange('tenure', limits);
    state.tenure = Math.min(limits.max, Math.max(limits.min, state.tenure));
    const { group, input } = parts.tenure;
    input.value = display.tenure(state.tenure);
    group.querySelector('.emi-calculator-suffix').textContent = UNITS[state.unit].suffix;
    group.querySelectorAll('.emi-calculator-unit button').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.unit === state.unit);
    });
    showError('tenure', false);
  };

  /** Switches the tenure between years and months, keeping the same loan period. */
  const setTenureUnit = (unit) => {
    if (unit === state.unit) return;
    const monthCount = tenureInMonths();
    state.unit = unit;
    state.tenure = unit === 'mo' ? monthCount : Math.round(monthCount / TENURE.monthsPerYear);
    applyTenureUnit();
    update();
  };

  // close a tapped-open tooltip when tapping anywhere else
  document.addEventListener('pointerdown', (e) => {
    Object.values(parts).forEach(({ group, trigger }) => {
      if (!trigger.contains(e.target)) group.classList.remove('is-tip-open');
    });
  });
  window.addEventListener('resize', () => {
    Object.entries(parts).forEach(([key, { group }]) => {
      if (group.classList.contains('is-invalid')) positionTooltip(key);
    });
  });

  Object.entries(fields).forEach(([key, group]) => {
    const {
      range, slider, input, trigger,
    } = parts[key];
    range.addEventListener('input', () => {
      state[key] = Number(range.value);
      showError(key, false);
      scheduleUpdate();
    });
    // while the pointer moves the thumb, follow it without easing
    range.addEventListener('pointerdown', () => {
      const start = () => slider.classList.add('is-dragging');
      const end = () => {
        slider.classList.remove('is-dragging');
        window.removeEventListener('pointermove', start);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
      };
      window.addEventListener('pointermove', start, { once: true });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
    // touch devices have no hover: a tap on the icon opens the message
    trigger.addEventListener('click', () => group.classList.toggle('is-tip-open'));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') group.classList.add('is-tip-hidden');
    });
    const decimals = key === 'rate';
    const min = () => Number(range.min);
    const max = () => Number(range.max);
    const parse = () => {
      const value = parseFloat(input.value.replace(/[^0-9.]/g, ''));
      const valid = Number.isFinite(value) && value >= min() && value <= max();
      return { value, valid };
    };

    // numbers only (one decimal point for the interest rate)
    input.addEventListener('beforeinput', (e) => {
      if (!e.data || !e.inputType.startsWith('insert')) return;
      const allowed = decimals ? /^[0-9.]+$/ : /^[0-9,]+$/;
      if (!allowed.test(e.data) || (decimals && e.data.includes('.') && input.value.includes('.'))) {
        e.preventDefault();
      }
    });
    input.addEventListener('input', () => {
      // clean pasted or dropped text and keep the caret after the same digit
      const caret = input.selectionStart ?? input.value.length;
      const digitsBefore = input.value.slice(0, caret).replace(/[^0-9.]/g, '').length;
      let raw = input.value.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '');
      if (decimals) {
        const [whole, ...rest] = raw.split('.');
        raw = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
      }
      // a value above the maximum is allowed while typing: flagged, set to the maximum on blur
      raw = raw.slice(0, 15);
      const next = key === 'amount' && raw ? inr.format(Number(raw)) : raw;
      if (next !== input.value) {
        input.value = next;
        let pos = 0;
        let seen = 0;
        while (pos < next.length && seen < digitsBefore) {
          if (/[0-9.]/.test(next[pos])) seen += 1;
          pos += 1;
        }
        input.setSelectionRange(pos, pos);
      }
      input.size = Math.max(1, input.value.length);
      const { value, valid } = parse();
      // outside the range while typing: flagged, set to the nearest limit on blur
      showError(key, !valid && input.value !== '', value);
      if (valid) {
        state[key] = value;
        update();
      }
    });
    const commit = () => {
      const { value } = parse();
      // empty: keep the current value; below the minimum or above the maximum: the nearest limit
      const fixed = Number.isFinite(value) ? Math.min(max(), Math.max(min(), value)) : state[key];
      showError(key, false);
      state[key] = fixed;
      input.value = display[key](fixed);
      update();
    };
    input.addEventListener('change', commit);
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    if (decimals) input.inputMode = 'decimal';
    // the whole value box (symbol and unit included) focuses the field,
    // except the year / month switch
    input.parentElement.addEventListener('click', (e) => {
      if (e.target !== input && !e.target.closest('.emi-calculator-unit')) input.focus();
    });
  });

  parts.tenure.group.querySelectorAll('.emi-calculator-unit button').forEach((button) => {
    button.addEventListener('click', () => setTenureUnit(button.dataset.unit));
  });

  const selectType = (index) => {
    const type = types[index];
    // the apply link opens the form for the selected loan type
    cta.dataset.loanCategory = type.title;
    [...tablist.children].forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === index);
      tab.tabIndex = i === index ? 0 : -1;
      if (i === index && types.length > 1) result.setAttribute('aria-labelledby', tab.id);
    });
    Object.keys(fields).forEach((key) => {
      const {
        min, max, value, step,
      } = sanitize(key, type[key]);
      state[key] = value;
      if (key !== 'tenure') {
        applyRange(key, { min, max, step });
        showError(key, false);
        return;
      }
      // tenure: years (as authored) and months (authored limits or years x 12)
      tenureLimits = {
        yr: { min, max, step },
        mo: resolveMonthLimits(type.tenureMonths, { min, max }),
      };
      state.unit = 'yr';
      applyTenureUnit();
    });
    update();
    // keep the selected tab in view when the tab row scrolls (small screens)
    const tab = tablist.children[index];
    if (tab && tablist.scrollWidth > tablist.clientWidth) {
      tablist.scrollTo({ left: tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
    }
  };

  [...tablist.children].forEach((tab, i) => {
    tab.addEventListener('click', () => selectType(i));
    tab.addEventListener('keydown', (e) => {
      const keys = {
        ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: types.length - 1,
      };
      if (!(e.key in keys)) return;
      e.preventDefault();
      const next = (keys[e.key] + types.length) % types.length;
      selectType(next);
      tablist.children[next].focus();
    });
  });

  if (link) {
    cta.href = link.getAttribute('href');
    cta.textContent = link.textContent.trim() || 'Apply now';
    moveInstrumentation(link, cta);
  } else {
    cta.remove();
  }

  selectType(0);
  return card;
}

/**
 * EMI calculator. Block properties (heading text, image, apply link) are
 * single-cell rows; each multi-cell row is a loan type with its slider ranges.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const config = rows.filter((row) => row.children.length <= 1);
  const typeRows = rows.filter((row) => row.children.length > 1);
  const [textRow, imageRow, linkRow] = config;

  const intro = document.createElement('div');
  intro.className = 'emi-calculator-intro';
  if (textRow) {
    const text = textRow.firstElementChild || textRow;
    moveInstrumentation(textRow, intro);
    while (text.firstChild) intro.append(text.firstChild);
  }

  const img = imageRow?.querySelector('img');
  if (img) {
    const picture = createPicture(img.src, img.alt, false, [{ width: '1300' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    picture.classList.add('emi-calculator-image');
    intro.append(picture);
  }

  const types = typeRows.map(parseLoanType);
  if (!types.length) {
    const fallback = document.createElement('div');
    fallback.innerHTML = '<div>Loan</div>';
    types.push(parseLoanType(fallback));
  }

  block.replaceChildren(intro, buildCalculator(types, linkRow?.querySelector('a')));
}
