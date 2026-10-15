import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const SECTION_CLASSES = ['brand', 'links', 'other', 'bottom'];

/**
 * Turns "<li>Label<ul>…</ul></li>" into a native disclosure dropdown.
 * @param {HTMLLIElement} li
 */
function buildDropdown(li) {
  const submenu = li.querySelector(':scope > ul');
  const details = document.createElement('details');
  details.className = 'footer-dropdown';
  const summary = document.createElement('summary');
  summary.textContent = [...li.childNodes]
    .filter((n) => n !== submenu)
    .map((n) => n.textContent)
    .join('')
    .trim();
  details.append(summary, submenu);
  li.replaceChildren(details);
  // group companies are other sites
  submenu.querySelectorAll('a[href]').forEach((a) => {
    if (new URL(a.href, window.location).origin === window.location.origin) return;
    a.target = '_blank';
    a.rel = 'noopener';
  });
  document.addEventListener('click', (e) => {
    if (!details.contains(e.target)) details.open = false;
  });
  details.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && details.open) {
      details.open = false;
      summary.focus();
    }
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  [...footer.children].forEach((section, i) => {
    if (SECTION_CLASSES[i]) section.classList.add(`footer-${SECTION_CLASSES[i]}`);
  });

  // link columns: top-level items are column headings
  footer.querySelectorAll('.footer-links .default-content-wrapper > ul > li').forEach((li) => {
    // plain text, or a <p> when the list is published as a loose list
    const heading = [...li.childNodes].find((n) => (n.nodeType === Node.TEXT_NODE
      && n.textContent.trim()) || (n.nodeName === 'P' && !n.querySelector('a')));
    if (heading) {
      const span = document.createElement('span');
      span.className = 'footer-heading';
      span.textContent = heading.textContent.trim();
      heading.replaceWith(span);
    }
  });

  footer.querySelectorAll('.footer-bottom li:has(> ul)').forEach(buildDropdown);

  // breadcrumb (Home > current page) above the copyright line on inner pages
  const { pathname } = window.location;
  const isHome = pathname === '/' || /\/(home|index)\/?$/.test(pathname);
  const crumb = getMetadata('breadcrumb') || (!isHome && document.querySelector('main h1')?.textContent.trim());
  const bottom = footer.querySelector('.footer-bottom .default-content-wrapper');
  if (crumb && bottom) {
    const nav = document.createElement('nav');
    nav.className = 'footer-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.innerHTML = '<ol><li><a>Home</a></li><li aria-current="page"></li></ol>';
    // home page next to the footer fragment's site root (/fragments/footer: /home)
    nav.querySelector('a').href = `${footerPath.replace(/\/(fragments\/)?footer$/, '')}/home`;
    nav.querySelector('[aria-current]').textContent = crumb;
    bottom.querySelector(':scope > p')?.before(nav);
  }

  // the brand and link areas share a white card below the red banner
  const card = document.createElement('div');
  card.className = 'footer-card';
  footer.querySelectorAll('.footer-links, .footer-other, .footer-bottom')
    .forEach((section) => card.append(section));
  footer.append(card);

  // icon-only links (social) are named after their icon, e.g. icon-facebook -> "Facebook"
  footer.querySelectorAll('a:has(> .icon)').forEach((a) => {
    if (a.textContent.trim() || a.getAttribute('aria-label')) return;
    const name = [...a.querySelector('.icon').classList]
      .find((c) => c.startsWith('icon-'))?.slice(5).replace(/-/g, ' ');
    if (name) a.setAttribute('aria-label', name.length <= 2 ? name.toUpperCase() : name.replace(/^\w/, (ch) => ch.toUpperCase()));
  });

  block.append(footer);
}
