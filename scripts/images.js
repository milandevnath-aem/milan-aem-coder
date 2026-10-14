import { createOptimizedPicture } from './aem.js';
import { MEDIA } from './viewport.js';

/*
 * Responsive images that work with AEM Dynamic Media as well as with images stored on
 * Edge Delivery (the media bus):
 *   - Dynamic Media with OpenAPI: https://delivery-pXXXX-eYYYY.adobeaemcloud.com/adobe/assets/
 *     urn:aaid:aem:…/as/name.jpg (width, quality, smart crop and format via the URL)
 *   - Dynamic Media Classic / Scene7: https://….scene7.com/is/image/Company/asset (wid, qlt, fmt)
 * Authored crops and presets (e.g. ?smartcrop=Medium, $preset$ or :Square) are kept; only the
 * width, quality and format are set per breakpoint.
 */

const OPENAPI_HOST = /^delivery-p\d+-e\d+(-cmstg)?\.adobeaemcloud\.com$/;
const IMAGE_EXT = /\.(avif|gif|jpe?g|png|webp)$/i;
const QUALITY = 85;

/**
 * Tells which Dynamic Media flavour serves an image URL.
 * @param {string} src image URL
 * @returns {'openapi'|'scene7'|null}
 */
export function dynamicMediaType(src) {
  if (!src) return null;
  try {
    const url = new URL(src, window.location.href);
    if (OPENAPI_HOST.test(url.hostname) && url.pathname.startsWith('/adobe/assets/')) return 'openapi';
    if (url.pathname.startsWith('/is/image/')) return 'scene7';
  } catch {
    // not a URL
  }
  return null;
}

/**
 * Builds a Dynamic Media rendition URL.
 * @param {string} src original Dynamic Media URL
 * @param {number|string} width rendition width
 * @param {'webp'|null} format webp or null for the original format
 */
export function dynamicMediaUrl(src, width, format = null) {
  const url = new URL(src, window.location.href);
  if (dynamicMediaType(src) === 'openapi') {
    // the format is the file extension of the "seo name": …/as/name.webp
    if (format && IMAGE_EXT.test(url.pathname)) {
      url.pathname = url.pathname.replace(IMAGE_EXT, `.${format}`);
    }
    url.searchParams.set('width', width);
    url.searchParams.set('quality', QUALITY);
    return url.toString();
  }
  // Scene7: keep $preset$ / :crop modifiers as written, replace only wid, qlt and fmt
  const kept = url.search.slice(1).split('&')
    .filter((part) => part && !/^(wid|qlt|fmt)=/i.test(part));
  kept.push(`wid=${width}`, `qlt=${QUALITY}`, `fmt=${format === 'webp' ? 'webp-alpha' : 'jpg'}`);
  return `${url.origin}${url.pathname}?${kept.join('&')}`;
}

/**
 * Like createOptimizedPicture (aem.js), but Dynamic Media images keep their host and get
 * Dynamic Media renditions.
 * @param {string} src image URL
 * @param {string} [alt]
 * @param {boolean} [eager]
 * @param {Array<{media?: string, width: string}>} [breakpoints]
 * @returns {HTMLPictureElement}
 */
export function createPicture(
  src,
  alt = '',
  eager = false,
  breakpoints = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }],
) {
  if (!dynamicMediaType(src)) return createOptimizedPicture(src, alt, eager, breakpoints);
  const picture = document.createElement('picture');
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', dynamicMediaUrl(src, br.width, 'webp'));
    picture.append(source);
  });
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', dynamicMediaUrl(src, br.width));
      picture.append(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      img.setAttribute('src', dynamicMediaUrl(src, br.width));
      picture.append(img);
    }
  });
  return picture;
}

function copyEditorAttributes(from, to) {
  [...from.attributes]
    .filter(({ name }) => name.startsWith('data-aue-') || name.startsWith('data-richtext-'))
    .forEach(({ name, value }) => to.setAttribute(name, value));
}

/**
 * Dynamic Media references in authored content: links to Dynamic Media images (as inserted
 * from the Assets selector) become images, and Dynamic Media images outside blocks get
 * responsive renditions. Blocks then find a normal <img> to decorate.
 * @param {Element} main container element
 */
/**
 * Picture with separate desktop and mobile images (art direction); either may be empty.
 * Dynamic Media aware, like createPicture.
 * @param {string} desktopSrc image for the desktop view
 * @param {string} mobileSrc image for small screens
 * @param {string} alt alternative text
 * @param {boolean} eager load eagerly
 * @returns {HTMLPictureElement}
 */
export function createResponsivePicture(desktopSrc, mobileSrc, alt = '', eager = false) {
  if (!desktopSrc || !mobileSrc || desktopSrc === mobileSrc) {
    return createPicture(desktopSrc || mobileSrc, alt, eager, [
      { media: MEDIA.desktop, width: '2000' },
      { width: '750' },
    ]);
  }
  const desktop = createPicture(desktopSrc, alt, eager, [
    { media: MEDIA.desktop, width: '2000' },
    { width: '2000' },
  ]);
  const mobile = createPicture(mobileSrc, alt, eager, [{ width: '750' }]);
  const picture = document.createElement('picture');
  picture.append(...desktop.querySelectorAll('source[media]'), ...mobile.children);
  return picture;
}

export function decorateDynamicMedia(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    const type = dynamicMediaType(a.href);
    if (!type) return;
    const { pathname } = new URL(a.href);
    const isImage = type === 'scene7' || IMAGE_EXT.test(pathname);
    // only bare references: the link text is the URL itself (or empty)
    const text = a.textContent.trim();
    if (!isImage || (text && text !== a.href && !a.href.startsWith(text))) return;
    const picture = createPicture(a.href, a.title || '', false, [{ width: '2000' }]);
    copyEditorAttributes(a, picture.querySelector('img'));
    a.replaceWith(picture);
  });

  // default content: blocks build their own pictures
  main.querySelectorAll('.default-content-wrapper img').forEach((img) => {
    if (!dynamicMediaType(img.src) || img.closest('picture')?.dataset.dm) return;
    const picture = createPicture(img.src, img.alt);
    picture.dataset.dm = 'true';
    copyEditorAttributes(img, picture.querySelector('img'));
    (img.closest('picture') || img).replaceWith(picture);
  });
}
