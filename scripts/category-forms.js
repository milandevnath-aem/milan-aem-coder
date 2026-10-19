/*
  Loan category -> lead form (a modal page). Shared by the hero call-back form and the
  lead form's category dropdown, so "Car Lease" opens the Car Lease form wherever it is
  picked.

  1. Authored: the block's "Category forms" field lists modal pages; a page belongs to the
     category its name ends with (apply-now-car-lease -> "Car Lease").
  2. Convention: a page next to the default form named after the category
     (apply-now -> apply-now-loan-against-property), used when it exists.
  3. Otherwise the default (shared) form.
*/

const exists = new Map();

export function slug(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** "Two-Wheeler Loans", "two wheeler loan" and "two-wheeler" compare equal */
function key(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(loans?|finance)$/, '');
}

function pageName(path) {
  return path.split('/').pop().replace(/(\.plain)?\.html$/, '');
}

/**
 * Modal page paths from an authored "Category forms" cell (links, or paths as text).
 * @param {Element} [cell]
 * @returns {string[]}
 */
export function readForms(cell) {
  if (!cell) return [];
  const links = [...cell.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  const paths = links.length ? links : cell.textContent.split(/[\s,]+/);
  return paths.map((p) => p.trim()).filter((p) => p.startsWith('/'))
    .map((p) => new URL(p, window.location).pathname);
}

/**
 * The authored form of a category: the listed page whose name ends with the category.
 * @param {string} category
 * @param {string[]} forms
 * @returns {string} page path, or '' when none is listed for it
 */
export function authoredForm(category, forms) {
  const wanted = key(category);
  if (!wanted) return '';
  return forms.find((path) => key(pageName(path)).endsWith(wanted)) || '';
}

async function pageExists(path) {
  const plain = `${path.replace(/(\.plain)?\.html$/, '')}.plain.html`;
  if (!exists.has(plain)) {
    exists.set(plain, fetch(plain).then((resp) => resp.ok).catch(() => false));
  }
  return exists.get(plain);
}

/**
 * The shared form a form belongs to: a category's own form named after it sits next to
 * the shared one (apply-now-car-lease -> apply-now); any other form is the shared one.
 * @param {string} path a form's page path
 * @param {string[]} [categories] all categories
 * @returns {string}
 */
export function sharedForm(path, categories = []) {
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const ext = path.match(/\.html$/)?.[0] || '';
  const name = pageName(path);
  const suffix = categories.map(slug).filter(Boolean).find((s) => name.endsWith(`-${s}`));
  return `${dir}${suffix ? name.slice(0, -(suffix.length + 1)) : name}${ext}`;
}

/**
 * The form to open for a category.
 * @param {string} category picked loan category
 * @param {Object} options
 * @param {string[]} [options.forms] authored "Category forms"
 * @param {string} [options.fallback] the shared form, or the form open now
 * @param {string[]} [options.categories] all categories (to find the shared form's name
 *   when the fallback is a category's own form, e.g. apply-now-car-lease -> apply-now)
 * @returns {Promise<string>} page path ('' when there is none)
 */
export async function resolveForm(category, { forms = [], fallback = '', categories = [] } = {}) {
  const authored = authoredForm(category, forms);
  if (authored || !fallback) return authored;
  const base = sharedForm(fallback, [...categories, category]);
  const ext = base.match(/\.html$/)?.[0] || '';
  const own = `${base.replace(/\.html$/, '')}-${slug(category)}${ext}`;
  if (own === fallback) return fallback;
  if (slug(category) && await pageExists(own)) return own;
  return base;
}

/**
 * Keeps the opener's mapping with a form opened for a category, so picking another
 * category there still finds the right forms (and the way back to the shared form).
 * @param {HTMLDialogElement} dialog the opened modal
 * @param {{ forms: string[], shared: string }} context
 */
export function rememberForms(dialog, { forms = [], shared = '' }) {
  if (dialog) dialog.dataset.categoryForms = JSON.stringify({ forms, shared });
}

/**
 * The mapping a modal was opened with (see rememberForms).
 * @param {HTMLDialogElement} [dialog]
 * @returns {{ forms: string[], shared: string }}
 */
export function rememberedForms(dialog) {
  try {
    return { forms: [], shared: '', ...JSON.parse(dialog?.dataset.categoryForms || '{}') };
  } catch {
    return { forms: [], shared: '' };
  }
}
