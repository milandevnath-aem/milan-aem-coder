/*
  Placeholders: the key/text rows of the site's /placeholders sheet.
  Kept out of aem.js (which is never modified).
*/

function toCamelCase(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ''));
}

/**
 * Fetches the placeholders of the site (once per page) as { camelCasedKey: text }.
 * The path is relative, so it works on .aem.page, .aem.live and any custom domain.
 * @param {string} [prefix] path prefix of the placeholders sheet (e.g. a language root)
 * @returns {Promise<Object<string, string>>} {} when the sheet is missing or unreachable
 */
export async function fetchPlaceholders(prefix = 'default') {
  window.placeholders = window.placeholders || {};
  if (!window.placeholders[prefix]) {
    window.placeholders[prefix] = fetch(`${prefix === 'default' ? '' : prefix}/placeholders.json`)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => Object.fromEntries(
        (json.data || []).filter((row) => row.Key).map((row) => [toCamelCase(row.Key), row.Text]),
      ))
      .catch(() => ({}))
      .then((placeholders) => {
        // a sheet that could not be read is asked for again next time, not remembered as empty
        if (!Object.keys(placeholders).length) delete window.placeholders[prefix];
        return placeholders;
      });
  }
  return window.placeholders[prefix];
}

export default fetchPlaceholders;
