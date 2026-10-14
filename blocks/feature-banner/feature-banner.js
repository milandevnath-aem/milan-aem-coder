import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';
import { MEDIA } from '../../scripts/viewport.js';

function styleTokens(cell) {
  if (!cell) return [];
  const values = [...cell.querySelectorAll('p')].map((p) => p.textContent);
  return (values.length ? values : [cell.textContent]).join(' ').toLowerCase().split(/[\s,]+/);
}

/**
 * Wraps every word of the element's text in a span, keeping inline markup (links, bold).
 * @param {HTMLElement} el text element
 * @returns {HTMLSpanElement[]} word spans in reading order
 */
function splitWords(el) {
  const words = [];
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
      const span = document.createElement('span');
      span.className = 'feature-banner-word';
      span.textContent = part;
      words.push(span);
      frag.append(span);
    });
    node.replaceWith(frag);
  });
  return words;
}

/**
 * Banners in a section with the "animate-text" style: the heading and text light up
 * word by word as the banner scrolls through the viewport (and dim again when scrolling
 * back). Skipped for reduced motion and in the Universal Editor.
 * @param {HTMLElement} item banner item
 */
function revealText(item) {
  const editing = document.documentElement.classList.contains('adobe-ue-edit');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const content = item.querySelector('.feature-banner-content');
  if (!content || editing || reduceMotion) return;
  const texts = content.querySelectorAll(':scope > :is(h1, h2, h3, p:not(.button-wrapper))');
  const words = [...texts].flatMap(splitWords);
  if (!words.length) return;
  item.classList.add('feature-banner-reveal');

  let frame;
  const update = () => {
    frame = null;
    const { top } = content.getBoundingClientRect();
    const vh = window.innerHeight;
    // starts when the text enters the lower part of the viewport, done in the upper third
    const progress = Math.min(1, Math.max(0, (vh * 0.85 - top) / (vh * 0.5)));
    const lit = progress * words.length;
    words.forEach((word, i) => {
      const amount = Math.min(1, Math.max(0, lit - i));
      word.style.setProperty('--reveal', amount.toFixed(2));
    });
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) window.addEventListener('scroll', onScroll, { passive: true });
    else window.removeEventListener('scroll', onScroll);
    update();
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
