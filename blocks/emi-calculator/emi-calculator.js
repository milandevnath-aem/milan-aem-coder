import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const DEFAULTS = {
  amount: [100000, 10000000, 5000000],
  rate: [8, 24, 8],
  tenure: [1, 7, 5],
};

let idCounter = 0;

/**
 * Reads the numbers of a grouped cell (min, max, default in any order).
 * @returns {number[]} [min, max, default]
 */
function readRange(cell, [dMin, dMax, dValue]) {
  if (!cell) return [dMin, dMax, dValue];
  const parts = cell.children.length
    ? [...cell.children].map((el) => el.textContent)
    : cell.textContent.split(/[\s,;|]+/);
  const values = parts
    .map((t) => parseFloat(t.replace(/[^0-9.]/g, '')))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (values.length >= 3) return [values[0], values[values.length - 1], values[1]];
  if (values.length === 2) return [values[0], values[1], values[0]];
  return [dMin, dMax, dValue];
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
        <input id="${id}-value" type="text" inputmode="decimal" autocomplete="off" aria-describedby="${id}-bounds">
        <span class="emi-calculator-suffix"></span>
      </div>
    </div>
    <div class="emi-calculator-slider">
      <span class="emi-calculator-slider-fill" aria-hidden="true"></span>
      <span class="emi-calculator-slider-knob" aria-hidden="true"></span>
      <span class="emi-calculator-slider-track" aria-hidden="true"></span>
      <input id="${id}-range" class="emi-calculator-range" type="range" aria-label="${label}">
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
    tab.textContent = type.title;
    tab.dataset.index = i;
    moveInstrumentation(type.row, tab);
    tablist.append(tab);
  });
  if (types.length > 1) controls.append(tablist);

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
    const parse = () => {
      const value = parseFloat(input.value.replace(/[^0-9.]/g, ''));
      const valid = Number.isFinite(value)
        && value >= Number(range.min) && value <= Number(range.max);
      return { value, valid };
    };
    input.addEventListener('input', () => {
      input.size = Math.max(1, input.value.length);
      const { value, valid } = parse();
      setInvalid(group, !valid);
      if (valid) {
        state[key] = value;
        update();
      } else {
        range.value = range.min;
        range.parentElement.style.setProperty('--pct', 0);
      }
    });
    const commit = () => {
      const { value, valid } = parse();
      if (!valid) {
        input.value = display[key](Number.isFinite(value) ? value : 0);
        input.size = Math.max(1, input.value.length);
        return;
      }
      state[key] = value;
      input.value = display[key](value);
      update();
    };
    input.addEventListener('change', commit);
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
  });

  const selectType = (index) => {
    const type = types[index];
    [...tablist.children].forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === index);
      tab.tabIndex = i === index ? 0 : -1;
    });
    const steps = { amount: 10000, rate: 0.1, tenure: 1 };
    Object.entries(fields).forEach(([key, group]) => {
      const [min, max, value] = type[key];
      const range = group.querySelector('.emi-calculator-range');
      range.min = min;
      range.max = max;
      range.step = steps[key];
      const [lo, hi] = group.querySelectorAll('.emi-calculator-bounds span');
      lo.textContent = bounds[key](min);
      hi.textContent = bounds[key](max);
      state[key] = value;
      setInvalid(group, false);
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
    const picture = createOptimizedPicture(img.src, img.alt, false, [{ width: '1300' }]);
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
