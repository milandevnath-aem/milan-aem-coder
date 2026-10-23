/*
  City list of the lead form. The placeholders sheet maps a key (lap, ncf, tw) to the city
  sheet of the product; only the path of that sheet is used, so the domain never matters.
*/
import { fetchPlaceholders } from '../../scripts/placeholders.js';
import { CITY_COLUMN, CITY_LIMIT } from './lead-api-config.js';

const sheets = new Map();

async function loadCities(key) {
  const placeholders = await fetchPlaceholders();
  const source = placeholders[key];
  if (!source) throw new Error(`No city placeholder "${key}"`);
  const { pathname } = new URL(source, window.location.origin);
  const resp = await fetch(`${pathname}?limit=${CITY_LIMIT}`);
  if (!resp.ok) throw new Error(`City sheet ${pathname}: ${resp.status}`);
  const json = await resp.json();
  const cities = (json.data || []).map((row) => String(row[CITY_COLUMN] || '').trim()).filter(Boolean);
  return [...new Set(cities)];
}

/**
 * The cities of a placeholder key, fetched once per page.
 * @param {string} key placeholder key: "lap", "ncf" or "tw"
 * @returns {Promise<string[]>} city names; [] when the list can't be loaded
 */
export default async function fetchCities(key) {
  if (!sheets.has(key)) {
    sheets.set(key, loadCities(key).catch(() => {
      sheets.delete(key); // a failed request is tried again next time
      return [];
    }));
  }
  return sheets.get(key);
}
