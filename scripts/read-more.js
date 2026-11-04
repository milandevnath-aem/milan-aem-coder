let count = 0;

/**
 * Collapses the section's text to a few lines with a "Read more" / "Read less" toggle.
 * The toggle only shows when the collapsed text overflows.
 * @param {Element} section a section with the "read-more" style
 */
function decorateReadMore(section) {
  const content = section.querySelector(':scope > .default-content-wrapper');
  if (!content || content.classList.contains('read-more-content')) return;
  count += 1;
  // authored nodes stay in place so the Universal Editor keeps its instrumentation
  content.id = content.id || `read-more-${count}`;
  content.classList.add('read-more-content', 'is-collapsed');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'read-more-toggle';
  button.textContent = 'Read more';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', content.id);
  button.hidden = true;
  button.addEventListener('click', () => {
    const collapsed = content.classList.toggle('is-collapsed');
    button.textContent = collapsed ? 'Read more' : 'Read less';
    button.setAttribute('aria-expanded', !collapsed);
  });
  content.after(button);

  // sections render once loaded and the width changes between breakpoints, so measure on resize
  new ResizeObserver(() => {
    if (!content.classList.contains('is-collapsed')) return;
    button.hidden = content.scrollHeight <= content.clientHeight;
  }).observe(content);
}

/**
 * @param {Element} main The main element
 */
export default function decorateReadMores(main) {
  main.querySelectorAll(':scope > .section.read-more').forEach(decorateReadMore);
}
