import { moveInstrumentation } from '../../scripts/scripts.js';
import { createPicture } from '../../scripts/images.js';

function updateButtons(track, prev, next) {
  const max = track.scrollWidth - track.clientWidth - 1;
  prev.disabled = track.scrollLeft <= 0;
  next.disabled = track.scrollLeft >= max;
}

/**
 * Testimonials carousel. Each row: quote, avatar, name, location/role.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const track = document.createElement('ul');
  track.className = 'testimonials-track';
  // the list scrolls sideways: focusable so keyboard users can scroll it with arrow keys
  track.tabIndex = 0;
  track.setAttribute('aria-label', 'Testimonials');

  [...block.children].forEach((row) => {
    const [quoteCell, imageCell, nameCell, roleCell] = row.children;
    const item = document.createElement('li');
    item.className = 'testimonials-item';
    moveInstrumentation(row, item);

    const quote = document.createElement('blockquote');
    quote.className = 'testimonials-quote';
    if (quoteCell) {
      moveInstrumentation(quoteCell, quote);
      while (quoteCell.firstChild) quote.append(quoteCell.firstChild);
    }

    const author = document.createElement('div');
    author.className = 'testimonials-author';
    const img = imageCell?.querySelector('img');
    if (img) {
      const picture = createPicture(img.src, img.alt, false, [{ width: '96' }]);
      moveInstrumentation(img, picture.querySelector('img'));
      picture.classList.add('testimonials-avatar');
      author.append(picture);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'testimonials-avatar';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = nameCell?.textContent.trim().charAt(0) || '';
      author.append(placeholder);
    }
    const meta = document.createElement('div');
    meta.className = 'testimonials-meta';
    [[nameCell, 'testimonials-name'], [roleCell, 'testimonials-role']].forEach(([cell, cls]) => {
      if (!cell?.textContent.trim()) return;
      const p = document.createElement('p');
      p.className = cls;
      if (cls === 'testimonials-name') {
        const cite = document.createElement('cite');
        cite.textContent = cell.textContent.trim();
        p.append(cite);
      } else {
        p.textContent = cell.textContent.trim();
      }
      moveInstrumentation(cell, p);
      meta.append(p);
    });
    author.append(meta);

    item.append(quote, author);
    track.append(item);
  });

  const controls = document.createElement('div');
  controls.className = 'testimonials-controls';
  controls.innerHTML = `
    <button type="button" class="testimonials-prev" aria-label="Previous testimonials" title="Previous testimonials"></button>
    <button type="button" class="testimonials-next" aria-label="Next testimonials" title="Next testimonials"></button>`;
  const [prev, next] = controls.children;
  const scrollByCard = (dir) => {
    const card = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: dir * ((card?.offsetWidth || 300) + gap), behavior: 'smooth' });
  };
  prev.addEventListener('click', () => scrollByCard(-1));
  next.addEventListener('click', () => scrollByCard(1));
  track.addEventListener('scroll', () => updateButtons(track, prev, next), { passive: true });

  block.replaceChildren(track, controls);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Customer testimonials');
  requestAnimationFrame(() => updateButtons(track, prev, next));
  new ResizeObserver(() => updateButtons(track, prev, next)).observe(track);
}
