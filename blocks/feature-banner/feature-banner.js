import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';
import { MEDIA, isDesktop } from '../../scripts/viewport.js';

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
    // measured from the first text line: on small screens the content box starts with
    // 80px of padding above the heading
    const { top } = texts[0].getBoundingClientRect();
    const vh = window.innerHeight;
    // desktop: starts in the lower part of the viewport, done in the upper third; small
    // screens (text at the top of the banner): 75% to 25%, so it lights up while read
    const [start, end] = isDesktop.matches ? [0.85, 0.35] : [0.75, 0.25];
    const progress = Math.min(1, Math.max(0, (vh * start - top) / (vh * (start - end))));
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
    if (tokens.includes('light-text')) item.classList.add('light-text');
    if (tokens.includes('dark-text')) item.classList.add('dark-text');
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
      // mobile crops keep the subject in the lower half: the banner grows with a long text
      // so the text stays in the upper half (see --feature-banner-text-end in the CSS)
      if (item.classList.contains('has-mobile-image')) {
        new ResizeObserver(() => {
          const last = textCell.lastElementChild;
          if (!last) return;
          const end = last.getBoundingClientRect().bottom - item.getBoundingClientRect().top;
          item.style.setProperty('--feature-banner-text-end', `${Math.round(end)}px`);
        }).observe(textCell);
      }
    }
    if (animate) revealText(item);
    list.append(item);
  });
  block.replaceChildren(list);
}
