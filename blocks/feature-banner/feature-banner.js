import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';
import { MEDIA } from '../../scripts/viewport.js';

function styleTokens(cell) {
  if (!cell) return [];
  const values = [...cell.querySelectorAll('p')].map((p) => p.textContent);
  return (values.length ? values : [cell.textContent]).join(' ').toLowerCase().split(/[\s,]+/);
}

/**
 * Side image banners: the heading words turn from muted to full colour as the banner
 * scrolls into view. Skipped for reduced motion and in the Universal Editor.
 * @param {HTMLElement} item banner item
 */
function revealHeading(item) {
  const heading = item.querySelector('.feature-banner-content h2, .feature-banner-content h3');
  const editing = document.documentElement.classList.contains('adobe-ue-edit');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!heading || editing || reduceMotion) return;
  const text = heading.textContent.trim();
  heading.setAttribute('aria-label', text);
  heading.textContent = '';
  const words = text.split(/\s+/).map((word) => {
    const span = document.createElement('span');
    span.className = 'feature-banner-word';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = word;
    heading.append(span, ' ');
    return span;
  });
  let frame;
  const update = () => {
    frame = null;
    const { top } = heading.getBoundingClientRect();
    const vh = window.innerHeight;
    // fully revealed once the heading reaches the upper third of the viewport
    const progress = Math.min(1, Math.max(0, (vh * 0.85 - top) / (vh * 0.5)));
    const count = Math.round(progress * words.length);
    words.forEach((word, i) => word.classList.toggle('is-on', i < count));
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
    if (item.classList.contains('side-image')) revealHeading(item);
    list.append(item);
  });
  block.replaceChildren(list);
}
