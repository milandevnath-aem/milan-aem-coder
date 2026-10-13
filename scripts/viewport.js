/*
 * Layout breakpoints: the single source of truth for the whole site.
 *
 * CSS media queries cannot use variables, so instead of repeating a media query in every
 * block, this module marks the document:
 *   - <html class="desktop-view"> from BREAKPOINTS.desktop up; below it the mobile view applies.
 *     Block CSS writes desktop rules as `:where(.desktop-view) .block ...`.
 *   - <html data-viewport="mobile|tablet-portrait|tablet-landscape|laptop|desktop"> for the
 *     design-system tiers; styles/styles.css maps each tier to its grid and spacing tokens.
 *
 * To move the mobile / desktop switch (e.g. to 900px) change BREAKPOINTS.desktop only.
 */
export const BREAKPOINTS = {
  // tablet portrait: 600 up to the desktop view
  tabletPortrait: 600,
  // desktop view (tablet landscape and up); everything below gets the mobile view
  desktop: 1024,
  // laptop: fluid, 92px margins
  laptop: 1281,
  // desktop: content stops growing at 1440px
  wide: 1680,
};

export const MEDIA = {
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
  mobile: `(max-width: ${BREAKPOINTS.desktop - 1}px)`,
};

// widest first: the first matching tier wins
const TIERS = [
  ['desktop', BREAKPOINTS.wide],
  ['laptop', BREAKPOINTS.laptop],
  ['tablet-landscape', BREAKPOINTS.desktop],
  ['tablet-portrait', BREAKPOINTS.tabletPortrait],
].map(([name, min]) => [name, window.matchMedia(`(min-width: ${min}px)`)]);

/** MediaQueryList for the desktop view; use .matches and the change event. */
export const isDesktop = window.matchMedia(MEDIA.desktop);

function applyViewport() {
  const root = document.documentElement;
  root.dataset.viewport = TIERS.find(([, mq]) => mq.matches)?.[0] || 'mobile';
  root.classList.toggle('desktop-view', isDesktop.matches);
}

applyViewport();
TIERS.forEach(([, mq]) => mq.addEventListener('change', applyViewport));
isDesktop.addEventListener('change', applyViewport);
