import { moveInstrumentation, isModalLink } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';
import { createDropdown } from '../../scripts/dropdown.js';
import { MEDIA } from '../../scripts/viewport.js';
import {
  authoredForm, readForms, rememberForms, resolveForm,
} from '../../scripts/category-forms.js';

// chips shown in the row; the rest are listed under "More"
const VISIBLE_CATEGORIES = 4;
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

let moreCount = 0;

/**
 * "More" chip with a menu of the remaining categories. The categories stay radio
 * inputs (hidden chips) so the form value does not change; the chip shows the picked
 * one ("Loan Against Property") until a visible chip is chosen again.
 * @param {HTMLElement} chips the chip row
 * @param {HTMLElement[]} overflow chips listed in the menu instead of the row
 */
function buildMore(chips, overflow) {
  moreCount += 1;
  const wrap = document.createElement('div');
  wrap.className = 'hero-loan-more-wrap';
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'hero-loan-chip hero-loan-more';
  more.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('ul');
  menu.className = 'hero-loan-more-menu';
  menu.id = `hero-loan-more-${moreCount}`;
  menu.hidden = true;
  more.setAttribute('aria-controls', menu.id);

  const inputs = overflow.map((chip) => chip.querySelector('input'));
  const items = inputs.map((input) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = input.value;
    const li = document.createElement('li');
    li.append(item);
    menu.append(li);
    return item;
  });

  const sync = () => {
    const selected = inputs.find((input) => input.checked);
    more.textContent = selected ? selected.value : 'More';
    more.classList.toggle('is-selected', Boolean(selected));
    if (selected) more.setAttribute('aria-label', `${selected.value}, more loan categories`);
    else more.removeAttribute('aria-label');
    items.forEach((item, i) => item.setAttribute('aria-pressed', inputs[i].checked));
  };
  const close = (focusMore = false) => {
    if (menu.hidden) return;
    menu.hidden = true;
    more.setAttribute('aria-expanded', 'false');
    if (focusMore) more.focus();
  };
  const open = (focusItem) => {
    menu.hidden = false;
    more.setAttribute('aria-expanded', 'true');
    if (focusItem) (items.find((item) => item.getAttribute('aria-pressed') === 'true') || items[0]).focus();
  };

  // e.detail is 0 when the button is activated from the keyboard
  more.addEventListener('click', (e) => (menu.hidden ? open(e.detail === 0) : close()));
  items.forEach((item, i) => item.addEventListener('click', () => {
    inputs[i].checked = true;
    inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
    close(true);
  }));
  wrap.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    }
    const index = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length].focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) close();
  });
  wrap.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !wrap.contains(e.relatedTarget)) close();
  });
  // any category change (a visible chip too) updates what the More chip shows
  chips.addEventListener('change', sync);
  sync();

  wrap.append(more, menu);
  return wrap;
}

/**
 * Apply now opens the form of the selected category (scripts/category-forms.js): its
 * page in "Category forms", else a page named after it next to the Form submit URL, else
 * that URL. The button's data-modal follows the selection.
 * @param {HTMLFormElement} form
 * @param {string} modalHref the Form submit URL when it is a modal page
 * @param {string[]} forms authored "Category forms"
 * @param {string[]} categories
 */
function confirmOnSubmit(form, modalHref, forms = [], categories = []) {
  const button = form.querySelector('button[type="submit"]');
  const selected = () => String(new FormData(form).get('category') || '');
  const show = (target) => {
    if (target) button.dataset.modal = target;
    else delete button.dataset.modal;
    return target;
  };
  const update = async () => show(await resolveForm(selected(), {
    forms, fallback: modalHref, categories,
  }));
  // on load without looking pages up; a change of category resolves its form
  show(authoredForm(selected(), forms) || modalHref);
  form.addEventListener('change', update);

  form.addEventListener('submit', async (e) => {
    if (form.getAttribute('action')) return;
    e.preventDefault();
    const target = await update();
    if (target) {
      // continue in the full application form, carrying over what was entered
      const data = Object.fromEntries(new FormData(form));
      const { openModal } = await import('../modal/modal.js');
      const modal = await openModal(target, { prefill: data });
      // the form keeps this mapping when another category is picked in it
      if (modal) rememberForms(modal.dialog, { forms, shared: modalHref });
      return;
    }
    // no endpoint configured: confirm locally instead of reloading the page
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
  // rows in model order: heading, options (categories + fields), submit link, category forms
  const [headingRow, optionsRow, actionRow, formsRow] = config;
  const forms = readForms(formsRow);
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
  const modalHref = action && isModalLink(action) ? action : '';
  if (action && action !== '#' && !modalHref) form.action = action;
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
    const select = createDropdown({
      label: 'Select loan category',
      name: 'category',
      options: categories.map((c) => ({ value: c, label: c })),
      value: categories[0],
      boundary: '.hero-loan',
    });
    select.classList.add('hero-loan-select');
    moveInstrumentation(optionsRow, select);
    form.querySelector('.hero-loan-categories').remove();
    form.prepend(select);
    confirmOnSubmit(form, modalHref, forms, categories);
    if (actionRow) moveInstrumentation(actionRow, form.querySelector('button[type="submit"]'));
    card.append(form);
    return card;
  }

  const chips = form.querySelector('.hero-loan-chips');
  const chipList = categories.map((label, i) => buildChip(label, i));
  const overflow = chipList.slice(VISIBLE_CATEGORIES);
  // overflow chips keep their radio inputs (form value) but are picked from the menu
  overflow.forEach((chip) => { chip.hidden = true; });
  chips.append(...chipList);
  if (overflow.length) chips.append(buildMore(chips, overflow));
  if (!categories.length) form.querySelector('.hero-loan-categories').remove();

  moveInstrumentation(optionsRow, form.querySelector('.hero-loan-categories'));
  if (actionRow) moveInstrumentation(actionRow, form.querySelector('button[type="submit"]'));

  confirmOnSubmit(form, modalHref, forms, categories);

  card.append(form);
  return card;
}

function buildSlides(rows) {
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
      const optimized = createPicture(img.src, img.alt, i === 0, [
        { media: MEDIA.desktop, width: '2000' },
        { width: '900' },
      ]);
      if (mobileImg) {
        // art-directed crop for small screens
        const source = document.createElement('source');
        source.media = MEDIA.mobile;
        source.srcset = createPicture(mobileImg.src, '', false, [{ width: '900' }])
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
  const show = (index) => {
    current = (index + rows.length) % rows.length;
    [...slides.children].forEach((slide, i) => {
      slide.classList.toggle('active', i === current);
      slide.setAttribute('aria-hidden', i !== current);
    });
    dots.querySelectorAll('.hero-loan-dot').forEach((dot, i) => dot.setAttribute('aria-current', i === current));
  };
  rows.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-loan-dot';
    dot.setAttribute('aria-label', `Show slide ${i + 1}`);
    dot.addEventListener('click', () => show(i));
    dots.append(dot);
  });
  // no autoplay: slides change only when the visitor selects a dot
  show(0);

  slides.dots = dots;
  return slides;
}

/**
 * Small screens: once the hero is scrolled past, its call to action stays
 * pinned to the bottom of the viewport.
 * @param {Element} block The block element
 */
function addStickyCta(block) {
  const source = block.querySelector('.hero-loan-content a.button');
  if (!source) return;
  const bar = document.createElement('div');
  bar.className = 'hero-loan-sticky';
  bar.setAttribute('aria-hidden', 'true');
  const cta = document.createElement('a');
  cta.className = 'button primary';
  cta.href = source.href;
  cta.textContent = source.textContent.trim();
  cta.tabIndex = -1;
  bar.append(cta);
  block.append(bar);
  // shown once the hero is scrolled past, hidden again while the footer is on screen
  let passed = false;
  let atFooter = false;
  const update = () => {
    const visible = passed && !atFooter;
    bar.classList.toggle('is-visible', visible);
    bar.setAttribute('aria-hidden', !visible);
    cta.tabIndex = visible ? 0 : -1;
  };
  new IntersectionObserver(([entry]) => {
    passed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    update();
  }).observe(block.querySelector('.hero-loan-slides'));
  const footer = document.querySelector('footer');
  if (footer) {
    new IntersectionObserver(([entry]) => {
      atFooter = entry.isIntersecting;
      update();
    }).observe(footer);
  }
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

  const slides = buildSlides(slideRows);
  const inner = document.createElement('div');
  inner.className = 'hero-loan-inner';
  if (slides.dots) inner.append(slides.dots);
  // "plain" variant (or no heading and no categories): hero without the lead form
  const hasForm = !block.classList.contains('plain') && config.slice(0, 2).some((row) => cellText(row));
  if (hasForm) inner.append(buildForm(config, isProduct));
  else block.classList.add('no-form');

  block.replaceChildren(slides, inner);
  if (!block.classList.contains('plain')) addStickyCta(block);
}
