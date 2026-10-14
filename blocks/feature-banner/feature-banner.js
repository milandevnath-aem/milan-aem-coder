import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';
import { MEDIA } from '../../scripts/viewport.js';

// text reveal: letters fading at the same time, and how quickly (s) it catches up with scrolling
const SOFT_EDGE = 12;
const SMOOTHING = 0.12;

function styleTokens(cell) {
  if (!cell) return [];
  const values = [...cell.querySelectorAll('p')].map((p) => p.textContent);
  return (values.length ? values : [cell.textContent]).join(' ').toLowerCase().split(/[\s,]+/);
}

/**
 * Wraps every letter of the element's text in a span, keeping inline markup (links, bold).
 * Each word stays unbreakable and keeps a screen reader copy, so assistive tech reads
 * whole words instead of single letters.
 * @param {HTMLElement} el text element
 * @returns {HTMLSpanElement[]} letter spans in reading order
 */
function splitChars(el) {
  const chars = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const parts = node.textContent.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    parts.forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.append(part);
        return;
      }
      const word = document.createElement('span');
      word.className = 'feature-banner-word';
      const label = document.createElement('span');
      label.className = 'visually-hidden';
      label.textContent = part;
      const letters = document.createElement('span');
      letters.setAttribute('aria-hidden', 'true');
      [...part].forEach((letter) => {
        const span = document.createElement('span');
        span.className = 'feature-banner-char';
        span.textContent = letter;
        chars.push(span);
        letters.append(span);
      });
      word.append(label, letters);
      frag.append(word);
    });
    node.replaceWith(frag);
  });
  return chars;
}

/**
 * Banners in a section with the "animate-text" style: the heading and text light up
 * letter by letter as the banner scrolls through the viewport (and dim again when scrolling
 * back). Skipped for reduced motion and in the Universal Editor.
 * @param {HTMLElement} item banner item
 */
function revealText(item) {
  const editing = document.documentElement.classList.contains('adobe-ue-edit');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const content = item.querySelector('.feature-banner-content');
  if (!content || editing || reduceMotion) return;
  const texts = content.querySelectorAll(':scope > :is(h1, h2, h3, p:not(.button-wrapper))');
  const chars = [...texts].flatMap(splitChars);
  if (!chars.length) return;
  item.classList.add('feature-banner-reveal');

  const targetProgress = () => {
    const { top } = content.getBoundingClientRect();
    const vh = window.innerHeight;
    // starts when the text enters the lower part of the viewport, done in the upper third
    return Math.min(1, Math.max(0, (vh * 0.85 - top) / (vh * 0.5)));
  };

  const render = (progress) => {
    // the lit edge is SOFT_EDGE letters wide, so letters fade in gradually one after another
    const lit = progress * (chars.length + SOFT_EDGE);
    chars.forEach((char, i) => {
      const amount = Math.min(1, Math.max(0, (lit - i) / SOFT_EDGE)).toFixed(2);
      // only touch letters whose value changed: long texts have hundreds of them
      if (char.dataset.reveal === amount) return;
      char.dataset.reveal = amount;
      char.style.setProperty('--reveal', amount);
    });
  };

  // the shown progress eases toward the scroll position instead of jumping with each wheel step
  let current = null;
  let frame;
  let last;
  const tick = (now) => {
    frame = null;
    const target = targetProgress();
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    // first paint: no easing, text already in view shows its final state right away
    const ease = 1 - Math.exp(-dt / SMOOTHING);
    current = current === null ? target : current + (target - current) * ease;
    if (Math.abs(target - current) < 0.0005) current = target;
    render(current);
    if (current !== target) frame = requestAnimationFrame(tick);
    else last = null;
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(tick); };
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) window.addEventListener('scroll', onScroll, { passive: true });
    else window.removeEventListener('scroll', onScroll);
    onScroll();
  }).observe(item);
}

/**
 * Full-width image + text rows.
 * Each row: image, optional mobile image, text, style (text side, text colour, image mode).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // text animation only when the section (or the block) has the "animate-text" style
  const animate = block.classList.contains('animate-text')
    || Boolean(block.closest('.section.animate-text'));
  const list = document.createElement('ul');
  [...block.children].forEach((row, i) => {
    const [imageCell, mobileCell, textCell, styleCell] = row.children;
    const item = document.createElement('li');
    item.className = 'feature-banner-item';
    moveInstrumentation(row, item);

    const tokens = styleTokens(styleCell);
    item.classList.add(tokens.includes('left') ? 'text-left' : 'text-right');
    if (tokens.includes('light')) item.classList.add('light-text');
    if (tokens.includes('side')) item.classList.add('side-image');

    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createPicture(img.src, img.alt, i === 0, [
        { media: MEDIA.desktop, width: '2000' },
        { width: '900' },
      ]);
      const mobileImg = mobileCell?.querySelector('img');
      if (mobileImg) {
        const mobile = createPicture(mobileImg.src, '', false, [{ width: '900' }]);
        mobile.querySelectorAll('source').forEach((source) => {
          source.media = MEDIA.mobile;
          picture.prepend(source);
        });
        moveInstrumentation(mobileImg, picture.querySelector('source'));
        item.classList.add('has-mobile-image');
      }
      moveInstrumentation(img, picture.querySelector('img'));
      picture.classList.add('feature-banner-image');
      item.append(picture);
    }

    if (textCell) {
      textCell.className = 'feature-banner-content';
      item.append(textCell);
    }
    if (animate) revealText(item);
    list.append(item);
  });
  block.replaceChildren(list);
}
