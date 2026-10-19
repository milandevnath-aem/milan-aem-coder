import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

// [min, max, default, slider step]
const DEFAULTS = {
  amount: [100000, 10000000, 5000000, 10000],
  rate: [8, 24, 8, 0.1],
  tenure: [1, 7, 5, 1],
};

const NAMES = { amount: 'loan amount', rate: 'interest rate', tenure: 'tenure' };

let idCounter = 0;

/**
 * Reads the numbers of a grouped cell: one paragraph per field, in model order
 * (minimum, maximum, default, step). A missing or empty field falls back to its default.
 * @returns {number[]} [min, max, default, step]
 */
function readRange(cell, defaults) {
  if (!cell) return defaults;
  const parts = cell.children.length
    ? [...cell.children].map((el) => el.textContent)
    : cell.textContent.split(/[\s,;|]+/);
  const values = parts.map((t) => parseFloat(t.replace(/[^0-9.]/g, '')));
  return defaults.map((fallback, i) => (Number.isFinite(values[i]) ? values[i] : fallback));
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
 * @returns {number} monthly instalment
 */
export function calculateEmi(principal, annualRate, tenureYears) {
  const n = tenureYears * 12;
  const r = annualRate / 12 / 100;
  if (!n) return 0;
  if (!r) return principal / n;
  const f = (1 + r) ** n;
  return (principal * r * f) / (f - 1);
}

function parseLoanType(row) {
  const [title, amount, rate, tenure] = row.children;
  return {
    row,
    title: title?.textContent.trim() || 'Loan',
    amount: readRange(amount, DEFAULTS.amount),
    rate: readRange(rate, DEFAULTS.rate),
    tenure: readRange(tenure, DEFAULTS.tenure),
  };
}

function sliderGroup(id, label) {
  const group = document.createElement('div');
  group.className = 'emi-calculator-field';
  group.innerHTML = `
    <div class="emi-calculator-field-head">
      <label for="${id}-value">${label}</label>
      <img class="emi-calculator-error-icon" src="${window.hlx.codeBasePath}/icons/alert.svg" alt="" width="16" height="16">
      <div class="emi-calculator-value">
        <span class="emi-calculator-prefix"></span>
        <input id="${id}-value" type="text" inputmode="numeric" autocomplete="off" aria-describedby="${id}-bounds ${id}-error">
        <span class="emi-calculator-suffix"></span>
      </div>
    </div>
    <p class="emi-calculator-error visually-hidden" id="${id}-error" aria-live="polite"></p>
    <div class="emi-calculator-slider">
      <span class="emi-calculator-slider-fill" aria-hidden="true"></span>
      <span class="emi-calculator-slider-knob" aria-hidden="true"></span>
      <span class="emi-calculator-slider-track" aria-hidden="true"></span>
      <input id="${id}-range" class="emi-calculator-range" type="range" aria-label="${label}">
    </div>
    <div class="emi-calculator-bounds" id="${id}-bounds"><span></span><span></span></div>`;
  return group;
}

function buildCalculator(types, link, isAuthoring) {
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
    tab.textContent = type.title;
    tab.dataset.index = i;
    moveInstrumentation(type.row, tab);
    tablist.append(tab);
  });
  if (types.length > 1) controls.append(tablist);

  // Universal Editor only: what is wrong with the selected loan type's numbers
  const authorNote = document.createElement('div');
  authorNote.className = 'emi-calculator-author-note';
  authorNote.setAttribute('role', 'status');
  authorNote.hidden = true;
  if (isAuthoring) controls.append(authorNote);

  const fields = {
    amount: sliderGroup(`${uid}-amount`, 'Loan requirement'),
    rate: sliderGroup(`${uid}-rate`, 'Interest rate'),
    tenure: sliderGroup(`${uid}-tenure`, 'Loan tenure'),
  };
  fields.amount.querySelector('.emi-calculator-prefix').textContent = '₹';
  fields.rate.querySelector('.emi-calculator-suffix').textContent = '%';
  fields.tenure.querySelector('.emi-calculator-suffix').textContent = 'Years';
  const fieldList = document.createElement('div');
  fieldList.className = 'emi-calculator-fields';
  fieldList.append(fields.amount, fields.rate, fields.tenure);
  controls.append(fieldList);

  const result = document.createElement('div');
  result.className = 'emi-calculator-result';
  result.innerHTML = `
    <div class="emi-calculator-summary">
      <div>
        <p class="emi-calculator-label">Your monthly EMI will be</p>
        <p class="emi-calculator-emi" aria-live="polite"><span>₹</span><strong></strong></p>
        <p class="emi-calculator-label emi-calculator-note"></p>
      </div>
      <a class="button emi-calculator-cta" href="#"></a>
    </div>
    <dl class="emi-calculator-breakdown">
      <div><dt>Principal</dt><dd data-key="principal"></dd></div>
      <div><dt>Interest Payable</dt><dd data-key="interest"></dd></div>
      <div><dt>Total Amount Payable</dt><dd data-key="total"></dd></div>
    </dl>`;

  card.append(controls, result);

  const state = {};
  const cta = result.querySelector('.emi-calculator-cta');

  const display = {
    amount: (v) => inr.format(v),
    rate: (v) => `${v}`,
    tenure: (v) => `${v}`,
  };
  const bounds = {
    amount: formatAmountShort,
    rate: (v) => `${v}%`,
    tenure: years,
  };

  /**
   * Keeps authored numbers usable: minimum not above maximum, default within
   * them, a step that fits the range. Each fix comes with a message for authors.
   */
  const sanitize = (key, [rawMin, rawMax, rawValue, rawStep]) => {
    const f = bounds[key];
    const name = NAMES[key];
    const notes = [];
    let min = rawMin;
    let max = rawMax;
    if (min > max) {
      notes.push(`Minimum ${name} (${f(min)}) is above the maximum (${f(max)}). The two are swapped.`);
      [min, max] = [max, min];
    }
    const value = Math.min(max, Math.max(min, rawValue));
    if (rawValue < min) {
      notes.push(`Default ${name} (${f(rawValue)}) is below the minimum (${f(min)}). The calculator starts at ${f(min)}.`);
    } else if (rawValue > max) {
      notes.push(`Default ${name} (${f(rawValue)}) is above the maximum (${f(max)}). The calculator starts at ${f(max)}.`);
    }
    const fallback = DEFAULTS[key][3];
    let step = rawStep;
    if (!(step > 0) || (max > min && step > max - min)) {
      notes.push(`Slider step for ${name} (${rawStep}) must be more than 0 and no more than the range (${max - min}). ${fallback} is used.`);
      step = fallback;
    }
    return {
      min, max, value, step, notes,
    };
  };

  const update = () => {
    const emi = Math.round(calculateEmi(state.amount, state.rate, state.tenure));
    const total = emi * state.tenure * 12;
    result.querySelector('.emi-calculator-emi strong').textContent = inr.format(emi);
    result.querySelector('.emi-calculator-note').textContent = `at ${state.rate}% interest rate for ${years(state.tenure)}`;
    result.querySelector('[data-key="principal"]').textContent = `₹${inr.format(state.amount)}`;
    result.querySelector('[data-key="interest"]').textContent = `₹${inr.format(total - state.amount)}`;
    result.querySelector('[data-key="total"]').textContent = `₹${inr.format(total)}`;
    Object.entries(fields).forEach(([key, group]) => {
      const range = group.querySelector('.emi-calculator-range');
      const pct = ((state[key] - range.min) / (range.max - range.min || 1)) * 100;
      range.parentElement.style.setProperty('--pct', pct / 100);
      range.value = state[key];
      range.setAttribute('aria-valuetext', bounds[key](state[key]));
      const input = group.querySelector('input[type="text"]');
      if (document.activeElement !== input) input.value = display[key](state[key]);
      input.size = Math.max(1, input.value.length);
    });
  };

  // values outside the slider range mark the field as invalid;
  // the result keeps showing the last valid values
  const setInvalid = (group, invalid) => {
    group.classList.toggle('is-invalid', invalid);
    const input = group.querySelector('input[type="text"]');
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  Object.entries(fields).forEach(([key, group]) => {
    const range = group.querySelector('.emi-calculator-range');
    const input = group.querySelector('input[type="text"]');
    range.addEventListener('input', () => {
      state[key] = Number(range.value);
      setInvalid(group, false);
      update();
    });
    const decimals = key === 'rate';
    const error = group.querySelector('.emi-calculator-error');
    const min = () => Number(range.min);
    const max = () => Number(range.max);
    const parse = () => {
      const value = parseFloat(input.value.replace(/[^0-9.]/g, ''));
      const valid = Number.isFinite(value) && value >= min() && value <= max();
      return { value, valid };
    };
    const showError = (invalid) => {
      setInvalid(group, invalid);
      error.textContent = invalid ? `Enter a value from ${bounds[key](min())} to ${bounds[key](max())}` : '';
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
      // never more than the maximum
      if (raw && parseFloat(raw) > max()) raw = String(max());
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
      // below the minimum while typing: flagged, fixed on leaving the field
      showError(!valid && input.value !== '');
      if (valid) {
        state[key] = value;
        update();
      }
    });
    const commit = () => {
      const { value } = parse();
      // empty or below the minimum: back to the nearest allowed value
      const fixed = Number.isFinite(value) ? Math.min(max(), Math.max(min(), value)) : state[key];
      showError(false);
      state[key] = fixed;
      input.value = display[key](fixed);
      update();
    };
    input.addEventListener('change', commit);
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    if (decimals) input.inputMode = 'decimal';
    // the whole value box (symbol and unit included) focuses the field
    input.parentElement.addEventListener('click', (e) => { if (e.target !== input) input.focus(); });
  });

  const selectType = (index) => {
    const type = types[index];
    // the apply link opens the form for the selected loan type
    cta.dataset.loanCategory = type.title;
    [...tablist.children].forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === index);
      tab.tabIndex = i === index ? 0 : -1;
    });
    const notes = [];
    Object.entries(fields).forEach(([key, group]) => {
      const {
        min, max, value, step, notes: fieldNotes,
      } = sanitize(key, type[key]);
      notes.push(...fieldNotes);
      const range = group.querySelector('.emi-calculator-range');
      range.min = min;
      range.max = max;
      range.step = step;
      const [lo, hi] = group.querySelectorAll('.emi-calculator-bounds span');
      lo.textContent = bounds[key](min);
      hi.textContent = bounds[key](max);
      state[key] = value;
      setInvalid(group, false);
    });
    authorNote.replaceChildren();
    if (notes.length) {
      const heading = document.createElement('p');
      heading.textContent = `Check the settings of "${type.title}":`;
      const list = document.createElement('ul');
      notes.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        list.append(li);
      });
      authorNote.append(heading, list);
    }
    authorNote.hidden = !notes.length;
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
      const keys = { ArrowRight: i + 1, ArrowLeft: i - 1 };
      if (!(e.key in keys)) return;
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

  // instrumented for the Universal Editor: authors see messages about invalid settings
  const isAuthoring = block.hasAttribute('data-aue-resource');
  block.replaceChildren(intro, buildCalculator(types, linkRow?.querySelector('a'), isAuthoring));
}
