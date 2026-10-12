import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const VISIBLE_CATEGORIES = 5;
const SLIDE_INTERVAL = 6000;

function cellText(row) {
  return row?.textContent.trim() || '';
}

function buildChip(label, index) {
  const chip = document.createElement('label');
  chip.className = 'hero-loan-chip';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'category';
  input.value = label;
  input.checked = index === 0;
  const span = document.createElement('span');
  span.textContent = label;
  chip.append(input, span);
  return chip;
}

function confirmOnSubmit(form) {
  form.addEventListener('submit', (e) => {
    if (form.getAttribute('action')) return;
    // no endpoint configured: confirm locally instead of reloading the page
    e.preventDefault();
    const thanks = document.createElement('p');
    thanks.className = 'hero-loan-thanks';
    thanks.setAttribute('role', 'status');
    thanks.textContent = 'Thank you! Our loan expert will call you back shortly.';
    form.replaceWith(thanks);
  });
}

function buildField(label, index) {
  const isPhone = /mobile|phone/i.test(label);
  const field = document.createElement('label');
  field.className = `hero-loan-input${isPhone ? ' hero-loan-mobile' : ''}`;
  if (isPhone) {
    const prefix = document.createElement('span');
    prefix.className = 'hero-loan-prefix';
    prefix.setAttribute('aria-hidden', 'true');
    prefix.textContent = '+91';
    field.append(prefix);
  }
  const sr = document.createElement('span');
  sr.className = 'hero-loan-sr';
  sr.textContent = label;
  const input = document.createElement('input');
  input.placeholder = label;
  input.required = true;
  input.name = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `field-${index}`;
  if (isPhone) {
    Object.assign(input, {
      type: 'tel', inputMode: 'numeric', pattern: '[6-9][0-9]{9}', maxLength: 10, autocomplete: 'tel-national',
    });
  } else {
    input.type = 'text';
    if (/^(your )?name$/i.test(label)) input.autocomplete = 'name';
  }
  field.append(sr, input);
  return field;
}

function buildForm(config, isProduct) {
  // rows in model order: heading, options (categories + fields), submit link
  const [headingRow, optionsRow, actionRow] = config;
  const options = [...(optionsRow?.querySelectorAll('p') || [])].map((p) => p.textContent.trim());
  if (!options.length && cellText(optionsRow)) options.push(cellText(optionsRow));
  const [categoriesText = '', fieldsText = ''] = options;
  const card = document.createElement('div');
  card.className = 'hero-loan-form';

  const intro = document.createElement('div');
  intro.className = 'hero-loan-form-intro';
  const headingCell = headingRow?.firstElementChild;
  if (headingCell?.textContent.trim()) {
    moveInstrumentation(headingRow, intro);
    while (headingCell.firstChild) intro.append(headingCell.firstChild);
  } else {
    intro.innerHTML = '<h2>Start Your Loan Journey Today</h2>';
  }
  card.append(intro);

  const form = document.createElement('form');
  const actionLink = actionRow?.querySelector('a');
  const action = actionLink?.getAttribute('href');
  if (action && action !== '#') form.action = action;
  form.method = 'get';
  form.innerHTML = `
    <div class="hero-loan-fields"></div>
    <fieldset class="hero-loan-categories">
      <legend>Select loan category</legend>
      <div class="hero-loan-chips"></div>
    </fieldset>
    <button type="submit" class="button primary"></button>`;
  form.querySelector('button[type="submit"]').textContent = cellText(actionRow) || 'Apply now';

  const labels = (fieldsText || 'Your name, Mobile number')
    .split(',').map((f) => f.trim()).filter(Boolean);
  const fields = form.querySelector('.hero-loan-fields');
  labels.forEach((label, i) => fields.append(buildField(label, i)));

  const categories = categoriesText.split(',').map((c) => c.trim()).filter(Boolean);
  if (isProduct && categories.length) {
    // product pages: compact dropdown, first category preselected
    const select = document.createElement('label');
    select.className = 'hero-loan-select';
    select.innerHTML = '<span class="hero-loan-select-label">Select loan category</span><select name="category"></select>';
    categories.forEach((c) => select.querySelector('select').append(new Option(c, c)));
    moveInstrumentation(optionsRow, select);
    form.querySelector('.hero-loan-categories').remove();
    form.prepend(select);
    confirmOnSubmit(form);
    if (actionRow) moveInstrumentation(actionRow, form.querySelector('button[type="submit"]'));
    card.append(form);
    return card;
  }

  const chips = form.querySelector('.hero-loan-chips');
  categories.forEach((label, i) => {
    const chip = buildChip(label, i);
    if (i >= VISIBLE_CATEGORIES) chip.hidden = true;
    chips.append(chip);
  });
  if (categories.length > VISIBLE_CATEGORIES) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'hero-loan-chip hero-loan-more';
    more.setAttribute('aria-expanded', 'false');
    more.textContent = 'More';
    more.addEventListener('click', () => {
      const expanded = more.getAttribute('aria-expanded') === 'true';
      more.setAttribute('aria-expanded', !expanded);
      more.textContent = expanded ? 'More' : 'Less';
      [...chips.children].slice(VISIBLE_CATEGORIES).forEach((chip) => {
        if (chip !== more) chip.hidden = expanded;
      });
    });
    chips.append(more);
  }
  if (!categories.length) form.querySelector('.hero-loan-categories').remove();

  moveInstrumentation(optionsRow, form.querySelector('.hero-loan-categories'));
  if (actionRow) moveInstrumentation(actionRow, form.querySelector('button[type="submit"]'));

  confirmOnSubmit(form);

  card.append(form);
  return card;
}

function buildSlides(rows, block) {
  const slides = document.createElement('ul');
  slides.className = 'hero-loan-slides';
  rows.forEach((row, i) => {
    const slide = document.createElement('li');
    slide.className = 'hero-loan-slide';
    moveInstrumentation(row, slide);
    const cells = [...row.children];
    const imageCell = cells[0];
    const mobileCell = cells.length > 2 ? cells[1] : null;
    const textCell = cells[cells.length - 1];
    const img = imageCell?.querySelector('img');
    if (img) {
      const mobileImg = mobileCell?.querySelector('img');
      const optimized = createOptimizedPicture(img.src, img.alt, i === 0, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '900' },
      ]);
      if (mobileImg) {
        // art-directed crop for small screens
        const source = document.createElement('source');
        source.media = '(max-width: 899px)';
        source.srcset = createOptimizedPicture(mobileImg.src, '', false, [{ width: '900' }])
          .querySelector('source[type="image/webp"]').srcset;
        source.type = 'image/webp';
        optimized.prepend(source);
        moveInstrumentation(mobileImg, source);
      }
      moveInstrumentation(img, optimized.querySelector('img'));
      optimized.classList.add('hero-loan-image');
      slide.append(optimized);
    }
    if (textCell && textCell !== imageCell) {
      textCell.className = 'hero-loan-content';
      const list = textCell.querySelector('ul');
      if (list) {
        // "Label: value" list items become stat badges
        list.classList.add('hero-loan-stats');
        [...list.children].forEach((li) => {
          const [label, ...rest] = li.textContent.split(':');
          if (!rest.length) return;
          const icon = li.querySelector('.icon');
          li.textContent = '';
          if (icon) li.append(icon);
          const text = document.createElement('span');
          text.innerHTML = '<small></small><strong></strong>';
          text.querySelector('small').textContent = label.trim();
          text.querySelector('strong').textContent = rest.join(':').trim();
          li.append(text);
        });
      }
      slide.append(textCell);
    }
    if (i > 0) slide.setAttribute('aria-hidden', 'true');
    slides.append(slide);
  });

  if (rows.length < 2) return slides;

  const dots = document.createElement('div');
  dots.className = 'hero-loan-dots';
  let current = 0;
  let timer;
  const show = (index) => {
    current = (index + rows.length) % rows.length;
    [...slides.children].forEach((slide, i) => {
      slide.classList.toggle('active', i === current);
      slide.setAttribute('aria-hidden', i !== current);
    });
    [...dots.children].forEach((dot, i) => dot.setAttribute('aria-current', i === current));
  };
  rows.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show slide ${i + 1}`);
    dot.addEventListener('click', () => show(i));
    dots.append(dot);
  });
  show(0);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = () => {
    if (reduceMotion) return;
    clearInterval(timer);
    timer = setInterval(() => show(current + 1), SLIDE_INTERVAL);
  };
  const stop = () => clearInterval(timer);
  block.addEventListener('mouseenter', stop);
  block.addEventListener('mouseleave', start);
  block.addEventListener('focusin', stop);
  block.addEventListener('focusout', start);
  start();

  slides.dots = dots;
  return slides;
}

/**
 * Hero with loan slides and a call-back lead form.
 * Block properties come first as single-cell rows (form heading, options = categories + fields,
 * submit link); every following multi-cell row is a slide
 * (image, optional mobile image, text). Variant "product" uses a category dropdown,
 * "plain" hides the form.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const slideRows = rows.filter((row) => row.children.length > 1);
  const config = rows.filter((row) => row.children.length <= 1);
  const isProduct = block.classList.contains('product');

  const slides = buildSlides(slideRows, block);
  const inner = document.createElement('div');
  inner.className = 'hero-loan-inner';
  if (slides.dots) inner.append(slides.dots);
  // "plain" variant (or no heading and no categories): hero without the lead form
  const hasForm = !block.classList.contains('plain') && config.slice(0, 2).some((row) => cellText(row));
  if (hasForm) inner.append(buildForm(config, isProduct));
  else block.classList.add('no-form');

  block.replaceChildren(slides, inner);
}
