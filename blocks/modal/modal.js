import { loadCSS } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/*
  Modal: not authored as a block. Links pointing to a page below a /modals/ folder
  open that page (a fragment) in a dialog: centered card on desktop, full screen on
  mobile. Pass className "modal-sheet" for a bottom sheet on mobile or
  "modal-compact" for a small centered dialog.
*/

let cssLoaded;

function loadModalCss() {
  cssLoaded = cssLoaded || loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);
  return cssLoaded;
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
  if (label) dialog.setAttribute('aria-label', label);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'modal-close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = `<img src="${window.hlx.codeBasePath}/icons/close.svg" alt="" width="24" height="24">`;
  close.addEventListener('click', () => dialog.close());

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.append(...contentNodes);
  dialog.append(close, content);

  // click on the backdrop closes the dialog
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    dialog.remove();
  });

  document.body.append(dialog);
  return {
    dialog,
    showModal: () => {
      dialog.showModal();
      document.body.classList.add('modal-open');
      content.scrollTop = 0;
    },
    close: () => dialog.close(),
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
    label: fragment.querySelector('h1, h2')?.textContent.trim() || '',
  });
  modal.showModal();
  return modal;
}
