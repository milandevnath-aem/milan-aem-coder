import { loadCSS } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/*
  Modal: not authored as a block. Links pointing to a page below a /modals/ folder
  open that page (a fragment) in a dialog: centered card on desktop, full screen on
  mobile. Pass className "modal-sheet" for a bottom sheet on mobile or
  "modal-compact" for a small centered dialog. Text-only pages (e.g. "Read more")
  get "modal-details": a fixed size card (bottom sheet on mobile) where only the
  content scrolls.
*/

let cssLoaded;
let modalCount = 0;

function loadModalCss() {
  cssLoaded = cssLoaded || loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);
  return cssLoaded;
}

/**
 * Plays the close animation (.modal-closing), then closes the dialog.
 * Closes right away when there is no animation (e.g. reduced motion).
 * @param {HTMLDialogElement} dialog
 */
function animateClose(dialog) {
  if (!dialog.open || dialog.classList.contains('modal-closing')) return;
  dialog.classList.add('modal-closing');
  const animations = dialog.getAnimations?.() || [];
  Promise.allSettled(animations.map((animation) => animation.finished))
    .then(() => dialog.close());
}

/**
 * Creates a modal dialog around the given content.
 * @param {Node[]} contentNodes content to show in the dialog
 * @param {Object} options { className, label }
 * @returns {Promise<{ dialog: HTMLDialogElement, showModal: Function, close: Function }>}
 */
export async function createModal(contentNodes, { className = '', label = '' } = {}) {
  await loadModalCss();
  const dialog = document.createElement('dialog');
  dialog.className = `modal ${className}`.trim();
  // Esc and clicks outside the card close the dialog
  dialog.setAttribute('closedby', 'any');
  const heading = contentNodes
    .map((node) => node.querySelector?.('h1, h2')).find(Boolean);
  if (heading) {
    modalCount += 1;
    heading.id = heading.id || `modal-title-${modalCount}`;
    dialog.setAttribute('aria-labelledby', heading.id);
  } else if (label) dialog.setAttribute('aria-label', label);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'modal-close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = `<img src="${window.hlx.codeBasePath}/icons/close.svg" alt="" width="24" height="24">`;
  close.addEventListener('click', () => animateClose(dialog));

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.append(...contentNodes);
  dialog.append(close, content);

  // click on the backdrop (or the dialog area around the card) closes the dialog
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) animateClose(dialog);
  });
  // Esc / light dismiss: play the close animation first (if the browser lets us)
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    animateClose(dialog);
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    dialog.remove();
  });

  document.body.append(dialog);
  return {
    dialog,
    showModal: () => {
      // forms on small screens open below the header (it stays visible, the page is inert)
      const nav = document.querySelector('header nav');
      const top = nav ? Math.max(0, Math.round(nav.getBoundingClientRect().bottom)) : 0;
      dialog.style.setProperty('--modal-top', `${top}px`);
      dialog.showModal();
      document.body.classList.add('modal-open');
      content.scrollTop = 0;
    },
    close: () => animateClose(dialog),
  };
}

/**
 * Loads a fragment page and shows it in a modal.
 * @param {string} url link to the modal page
 */
export async function openModal(url) {
  const path = new URL(url, window.location).pathname;
  const fragment = await loadFragment(path);
  if (!fragment) return null;
  document.querySelectorAll('dialog.modal[open]').forEach((open) => open.close());
  const modal = await createModal([...fragment.childNodes], {
    className: (fragment.querySelector('.lead-form') && 'modal-form')
      || (fragment.querySelector('.block') ? '' : 'modal-details'),
    label: fragment.querySelector('h1, h2')?.textContent.trim() || '',
  });
  modal.showModal();
  return modal;
}
