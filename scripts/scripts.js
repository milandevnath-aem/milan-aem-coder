import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';
// sets the viewport classes on <html> before the page is shown
import { isDesktop } from './viewport.js';
import { createResponsivePicture, decorateDynamicMedia } from './images.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Tells whether a link points to a page in a /modals/ folder (opened as a dialog).
 * @param {string} href link URL
 * @returns {boolean}
 */
export function isModalLink(href) {
  try {
    const { origin, pathname } = new URL(href, window.location);
    return origin === window.location.origin && pathname.includes('/modals/');
  } catch {
    return false;
  }
}

/**
 * Opens links to /modals/ pages in a dialog instead of navigating.
 * @param {Document} doc The document
 */
/**
 * Loan category a modal link stands for, most specific first: "?category=" on the link,
 * the block item it sits in (data-loan-category, e.g. an offer card or the EMI calculator
 * tab), then the product page's hero. The modal's form uses the first one it offers.
 * @param {HTMLAnchorElement} link
 * @returns {string[]}
 */
function loanCategories(link) {
  const fromUrl = new URL(link.href, window.location).searchParams.get('category');
  const fromBlock = link.closest('[data-loan-category]')?.dataset.loanCategory;
  const fromPage = document.querySelector('.hero-loan.product input[name="category"]')?.value;
  return [fromUrl, fromBlock, fromPage].filter(Boolean);
}

function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const link = e.target.closest('a[href]');
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (!isModalLink(link.href)) return;
    e.preventDefault();
    const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
    const category = loanCategories(link);
    openModal(link.href, category.length ? { prefill: { category } } : {});
  });
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
export function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Reads the "backgroundColor" section property as a valid CSS color.
 * @param {Element} section The section element
 * @returns {string} The color, or '' when missing or invalid
 */
function readSectionColor(section) {
  let value = (section.dataset.backgroundcolor || section.dataset.backgroundColor || '').trim();
  // AEM renders a value starting with "#" as a link: ".../page#eee" -> "#eee"
  if (value.includes('#')) value = `#${value.split('#').pop()}`;
  // allow hex without the leading "#": "eeeeee" -> "#eeeeee"
  if (/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) value = `#${value}`;
  return value && CSS.supports('background-color', value) ? value : '';
}

/**
 * Sections with a background color (section property "backgroundColor") and/or
 * background images ("background" and "backgroundMobile"): the color fills the section,
 * a decorative picture covers it behind its content.
 * @param {Element} main The main element
 */
function decorateSectionBackgrounds(main) {
  main.querySelectorAll(':scope > .section').forEach((section) => {
    const color = readSectionColor(section);
    if (color) {
      section.style.setProperty('--section-bg-color', color);
      section.classList.add('has-bg-color');
    }

    const { background } = section.dataset;
    const mobile = section.dataset.backgroundmobile || section.dataset.backgroundMobile;
    if (!background && !mobile) return;
    const picture = createResponsivePicture(background, mobile);
    picture.classList.add('section-background');
    picture.querySelector('img').alt = '';
    section.classList.add('has-background');
    section.prepend(picture);
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateSectionBackgrounds(main);
  // Dynamic Media references become images before blocks and buttons are decorated
  decorateDynamicMedia(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  // skip link to the main content (WCAG 2.4.1)
  if (main && !doc.querySelector('.skip-link')) {
    main.id = main.id || 'main';
    main.tabIndex = -1;
    const skip = doc.createElement('a');
    skip.className = 'skip-link visually-hidden';
    skip.href = `#${main.id}`;
    skip.textContent = 'Skip to main content';
    doc.body.prepend(skip);
  }
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (isDesktop.matches || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
