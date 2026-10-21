/*
  Loan category -> lead form (a modal page). Shared by the hero call-back form and the
  lead form's category dropdown, so "Car Lease" opens the Car Lease form wherever it is
  picked.

  1. Authored: the block's "Category forms" field lists modal pages in the order of the
     categories (chips / dropdown options): the first page is the form of the first
     category, the second page of the second one, and so on. A category without a page
     (or whose page is not published yet) opens the default form.
  2. Otherwise the default (shared) form.
*/

const exists = new Map();

export function slug(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** "Two-Wheeler Loans", "two wheeler loan" and "two-wheeler" compare equal */
function key(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(loans?|finance)$/, '');
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
 * The authored form of a category: the listed page at the category's position.
 * @param {string} category
 * @param {string[]} forms authored "Category forms", in the order of the categories
 * @param {string[]} categories all categories of the block, in authored order
 * @returns {string} page path, or '' when none is listed for it
 */
export function authoredForm(category, forms, categories = []) {
  const wanted = key(category);
  if (!wanted) return '';
  const index = categories.findIndex((c) => key(c) === wanted);
  return (index >= 0 && forms[index]) || '';
}

async function pageExists(path) {
  const plain = `${path.replace(/(\.plain)?\.html$/, '')}.plain.html`;
  if (!exists.has(plain)) {
    exists.set(plain, fetch(plain).then((resp) => resp.ok).catch(() => false));
  }
  return exists.get(plain);
}

/**
 * The form to open for a category.
 * @param {string} category picked loan category
 * @param {Object} options
 * @param {string[]} [options.forms] authored "Category forms"
 * @param {string[]} [options.categories] the categories the forms are listed for, in order
 * @param {string} [options.fallback] the shared form
 * @returns {Promise<string>} page path ('' when there is none)
 */
export async function resolveForm(category, { forms = [], fallback = '', categories = [] } = {}) {
  const authored = authoredForm(category, forms, categories);
  // an authored page that is not previewed/published yet cannot open: use the shared form
  if (authored && (authored === fallback || await pageExists(authored))) return authored;
  return fallback;
}

/**
 * The identifier authored for a category ("Option identifiers"), matched like the forms.
 * @param {string} category
 * @param {Object<string, string>} codes category label -> identifier
 * @returns {string} identifier, or '' when none is authored for it
 */
export function categoryCode(category, codes = {}) {
  const wanted = key(category);
  if (!wanted) return '';
  const label = Object.keys(codes).find((c) => key(c) === wanted);
  return (label && codes[label]) || '';
}

/**
 * Keeps the opener's mapping with a form opened for a category, so picking another
 * category there still finds the right forms (and the way back to the shared form),
 * and the lead still gets the opener's category identifiers.
 * @param {HTMLDialogElement} dialog the opened modal
 * @param {{ forms: string[], categories: string[], shared: string,
 *   codes: Object<string, string> }} context
 */
export function rememberForms(dialog, {
  forms = [], categories = [], shared = '', codes = {},
}) {
  if (dialog) {
    dialog.dataset.categoryForms = JSON.stringify({
      forms, categories, shared, codes,
    });
  }
}

/**
 * The mapping a modal was opened with (see rememberForms).
 * @param {HTMLDialogElement} [dialog]
 * @returns {{ forms: string[], categories: string[], shared: string,
 *   codes: Object<string, string> }}
 */
export function rememberedForms(dialog) {
  const empty = {
    forms: [], categories: [], shared: '', codes: {},
  };
  try {
    return { ...empty, ...JSON.parse(dialog?.dataset.categoryForms || '{}') };
  } catch {
    return empty;
  }
}
