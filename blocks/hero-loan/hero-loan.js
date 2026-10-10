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

function buildForm(config) {
  const [headingRow, categoriesRow, actionRow] = config;
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
    <div class="hero-loan-fields">
      <label class="hero-loan-input">
        <span class="hero-loan-sr">Your name</span>
        <input type="text" name="name" placeholder="Your name" autocomplete="name" required>
      </label>
      <label class="hero-loan-input hero-loan-mobile">
        <span class="hero-loan-prefix" aria-hidden="true">+91</span>
        <span class="hero-loan-sr">Mobile number</span>
        <input type="tel" name="mobile" placeholder="Mobile number" autocomplete="tel-national"
          inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" required>
      </label>
    </div>
    <fieldset class="hero-loan-categories">
      <legend>Select loan category</legend>
      <div class="hero-loan-chips"></div>
    </fieldset>
    <button type="submit" class="button primary"></button>`;
  form.querySelector('button[type="submit"]').textContent = cellText(actionRow) || 'Apply now';

  const chips = form.querySelector('.hero-loan-chips');
  const categories = cellText(categoriesRow).split(',').map((c) => c.trim()).filter(Boolean);
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

  moveInstrumentation(categoriesRow, form.querySelector('.hero-loan-categories'));
  if (actionRow) moveInstrumentation(actionRow, form.querySelector('button[type="submit"]'));

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
    const [imageCell, textCell] = row.children;
    const picture = imageCell?.querySelector('picture');
    if (picture) {
      const img = picture.querySelector('img');
      const optimized = createOptimizedPicture(img.src, img.alt, i === 0, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '900' },
      ]);
      moveInstrumentation(img, optimized.querySelector('img'));
      optimized.classList.add('hero-loan-image');
      slide.append(optimized);
    }
    if (textCell) {
      textCell.className = 'hero-loan-content';
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
 * Block properties come first as single-cell rows (form heading, categories,
 * submit link); every following two-cell row is a slide.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const slideRows = rows.filter((row) => row.children.length > 1);
  const config = rows.filter((row) => row.children.length <= 1);

  const slides = buildSlides(slideRows, block);
  const inner = document.createElement('div');
  inner.className = 'hero-loan-inner';
  if (slides.dots) inner.append(slides.dots);
  inner.append(buildForm(config));

  block.replaceChildren(slides, inner);
}
