import { toCamelCase } from './aem.js';

/**
 * Gets placeholders object (port of the aem-boilerplate helper, which is no longer
 * part of aem.js). Keys are camel-cased: "google-maps-api-key" becomes googleMapsApiKey.
 * Fetched once per prefix and shared by every caller on the page.
 * @param {string} [prefix] Location of placeholders (folder), "default" for the root
 * @returns {Promise<Object>} Window placeholders object (empty when the sheet is missing)
 */
// eslint-disable-next-line import/prefer-default-export
export async function fetchPlaceholders(prefix = 'default') {
  window.placeholders = window.placeholders || {};
  if (!window.placeholders[prefix]) {
    window.placeholders[prefix] = fetch(`${prefix === 'default' ? '' : prefix}/placeholders.json`)
      .then((resp) => (resp.ok ? resp.json() : {}))
      .then((json) => {
        const placeholders = {};
        (json.data || [])
          .filter((placeholder) => placeholder.Key)
          .forEach((placeholder) => {
            placeholders[toCamelCase(placeholder.Key)] = placeholder.Text;
          });
        return placeholders;
      })
      .catch(() => ({}));
  }
  return window.placeholders[prefix];
}
