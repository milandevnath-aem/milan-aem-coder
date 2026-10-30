import { toClassName } from './aem.js';
import { fetchPlaceholders } from './placeholders.js';

/*
  City locator: data and location logic shared by city-aware blocks (no UI here).

  - City master: a sheet (JSON) of cities and their details. Its URL comes from the
    placeholders sheet ("city-master" row), or CITY_CONFIG.cityMasterPath.
  - Nearest city: worked out in the browser from the city master's latitude and
    longitude columns ("27.1767° N" or "27.1767"); no maps API or key is used. Cities
    without coordinates are never suggested.
  - Visitor choice (location consent, selected city) is kept in localStorage so we do
    not ask again on every visit.
*/

export const CITY_CONFIG = {
  // placeholders sheet keys, camel-cased by fetchPlaceholders ("city-master")
  placeholders: {
    cityMaster: 'cityMaster',
  },
  // city master location when the placeholders sheet has no "city-master" row
  cityMasterPath: '/city-master.json',
  // sheet to read when the city master is a workbook with several sheets (first one otherwise)
  cityMasterSheet: '',
  // a city further away than this is not "near" the visitor: the first city is shown
  maxDistanceKm: 50,
  timeouts: {
    geolocation: 10000,
  },
  storageKeys: {
    choice: 'kmp-city-choice',
  },
  // city master columns, matched ignoring case, spaces and punctuation
  columns: {
    city: ['city', 'city name', 'sub city name', 'name'],
    region: ['state', 'state name', 'region'],
    aliases: ['aliases', 'alias', 'other names'],
    lat: ['lat', 'latitude'],
    lng: ['lng', 'lon', 'long', 'longitude'],
  },
  // city master columns never shown (row numbers and the like)
  ignoreColumns: ['sr no', 'sr. no.', 'serial no', 's no', 'id'],
  // details shown for a city, in this order. Any other city master column is shown
  // after these (label = column name), unless it is ignored or its name starts with "_"
  details: [
    {
      key: 'address', label: 'Address', icon: 'location', columns: ['address', 'branch address'],
    },
    {
      key: 'phone',
      label: 'Phone',
      icon: 'call',
      columns: [
        'phone', 'phone no', 'phone number', 'phones', 'tel', 'tel no', 'tel number', 'telephone',
        'telephone no', 'telephone number', 'mobile', 'mobile no', 'mobile number',
        'contact', 'contact no', 'contact number', 'contact details', 'branch phone', 'branch contact',
      ],
    },
    {
      key: 'timing', label: 'Branch Timing', icon: 'clock', columns: ['timing', 'timings', 'branch timing', 'branch timings', 'hours'],
    },
    {
      key: 'email', label: 'Write to us on', icon: 'mail', columns: ['email', 'email id', 'mail'],
    },
  ],
  // other names (or spellings) of a city, used to find a remembered city in the
  // city master. A city master "aliases" column adds more without a code change
  aliases: [
    ['bengaluru', 'bangalore'],
    ['gurugram', 'gurgaon'],
    ['mumbai', 'bombay'],
    ['vadodara', 'baroda'],
    ['prayagraj', 'allahabad'],
    ['kozhikode', 'calicut'],
    ['kochi', 'cochin', 'ernakulam'],
    ['thiruvananthapuram', 'trivandrum'],
    ['mysuru', 'mysore'],
    ['mangaluru', 'mangalore'],
    ['belagavi', 'belgaum'],
    ['ballari', 'bellary'],
    ['hubballi', 'hubli'],
    ['puducherry', 'pondicherry'],
    ['chennai', 'madras'],
    ['kolkata', 'calcutta'],
    ['delhi', 'new delhi'],
    ['alappuzha', 'alleppey', 'alleppy', 'alappey'],
    ['bareilly', 'bariely'],
    ['dehradun', 'dehradhun'],
    ['bhubaneswar', 'bhubnshwar'],
    ['tiruchirappalli', 'trichy'],
    ['visakhapatnam', 'vizag'],
    ['nashik', 'nasik'],
  ],
};

/* ---------- helpers ---------- */

/** "Navi-Mumbai" / "NAVI MUMBAI" -> "navimumbai": compares names ignoring case and punctuation */
export function normalize(text) {
  return String(text || '').normalize('NFD').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Sheets often hold names in capitals: "NEW DELHI" -> "New Delhi" */
function displayName(text) {
  const value = String(text || '').trim();
  if (value !== value.toUpperCase()) return value;
  return value.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
}

/** "BRANCH_MANAGER" -> "Branch manager" */
function humanize(header) {
  const text = header.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// localStorage can be blocked (private mode, site settings): fail silently
function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || null;
  } catch (e) {
    return null;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage full or blocked: the choice is simply not remembered
  }
}

/**
 * Sheet links are often authored as absolute aem.page URLs: read them from the current
 * site instead, so they work on every environment (preview, live, custom domain).
 */
function toSiteUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    return /\.aem\.(page|live)$/.test(parsed.hostname) ? `${parsed.pathname}${parsed.search}` : parsed.href;
  } catch (e) {
    return url;
  }
}

/** great-circle distance in km between two { lat, lng } */
export function distance(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** "27.1767° N" -> 27.1767, "43.2° S" -> -43.2, "78.0081" -> 78.0081; NaN when empty */
function toDegrees(value) {
  const text = String(value ?? '').trim();
  const degrees = parseFloat(text);
  return /[sw]\s*$/i.test(text) ? -Math.abs(degrees) : degrees;
}

/** { lat, lng } when both are valid coordinates (sheet or "° N/E" format), else null */
export function toPosition(lat, lng) {
  const position = { lat: toDegrees(lat), lng: toDegrees(lng) };
  const valid = Number.isFinite(position.lat) && Number.isFinite(position.lng)
    && Math.abs(position.lat) <= 90 && Math.abs(position.lng) <= 180;
  return valid ? position : null;
}

/* ---------- cities ---------- */

/**
 * Builds a city record, the one shape every city source is turned into.
 * @param {Object} data
 * @param {string} data.name city name
 * @param {string} [data.region] state / region
 * @param {string[]} [data.aliases] other names of the city
 * @param {{lat: number, lng: number}|null} [data.position] known coordinates
 * @param {{key: string, label: string, icon: string, value: string}[]} [data.details]
 * @returns {Object} city: { key, name, region, aliases, position, details }
 */
export function createCity({
  name, region = '', aliases = [], position = null, details = [],
}) {
  const city = displayName(name);
  return {
    key: [normalize(city), normalize(region)].filter(Boolean).join('-'),
    name: city,
    region: displayName(region),
    aliases,
    position,
    details: details.filter((detail) => detail.value),
  };
}

/** Maps city master headers to city fields and detail rows (see CITY_CONFIG.columns/details) */
function mapColumns(headers) {
  const find = (candidates) => headers
    .find((h) => candidates.some((c) => normalize(c) === normalize(h)));
  const fields = Object.fromEntries(
    Object.entries(CITY_CONFIG.columns).map(([field, candidates]) => [field, find(candidates)]),
  );
  fields.city = fields.city || headers[0];
  const details = CITY_CONFIG.details
    .map(({ columns, ...detail }) => ({ ...detail, column: find(columns) }))
    .filter((detail) => detail.column);
  // new city master columns are shown too, so a new field needs no code change
  const used = new Set([...Object.values(fields), ...details.map((d) => d.column)]);
  const ignored = CITY_CONFIG.ignoreColumns.map(normalize);
  headers
    .filter((h) => !used.has(h) && !ignored.includes(normalize(h)))
    .filter((h) => !h.startsWith('_') && !h.startsWith(':'))
    .forEach((h) => details.push({
      key: toClassName(h), label: humanize(h), icon: 'info', column: h,
    }));
  return { fields, details };
}

/**
 * Loads the city master (URL from the placeholders sheet) as city records,
 * sorted alphabetically. Resolves to [] when it is missing, empty or unreadable.
 * @returns {Promise<Object[]>}
 */
export async function loadCityMaster() {
  try {
    const placeholders = await fetchPlaceholders();
    const url = placeholders[CITY_CONFIG.placeholders.cityMaster] || CITY_CONFIG.cityMasterPath;
    const resp = await fetch(toSiteUrl(url));
    if (!resp.ok) return [];
    const json = await resp.json();
    const sheet = json[':type'] === 'multi-sheet'
      ? json[CITY_CONFIG.cityMasterSheet] || json[json[':names']?.[0]]
      : json;
    const rows = sheet?.data || [];
    if (!rows.length) return [];

    const { fields, details } = mapColumns(sheet.columns || Object.keys(rows[0]));
    const cities = rows
      .map((row) => createCity({
        name: row[fields.city],
        region: row[fields.region] || '',
        aliases: String(row[fields.aliases] || '').split(/[,;|]/).map((a) => a.trim()).filter(Boolean),
        position: toPosition(row[fields.lat], row[fields.lng]),
        details: details.map(({ column, ...detail }) => ({
          // cells may hold line breaks (multi-line addresses)
          ...detail, value: String(row[column] ?? '').replace(/\s+/g, ' ').trim(),
        })),
      }))
      .filter((city) => city.name);
    // sheet order is kept: the first row is the default city (see firstCity)
    cities.forEach((city, i) => { city.order = i; });

    // a city listed more than once (several branches) keeps every row; the
    // dropdown tells them apart by the start of the address
    const count = {};
    cities.forEach((city) => { count[city.key] = (count[city.key] || 0) + 1; });
    cities.forEach((city, i) => {
      if (count[city.key] < 2) return;
      const address = city.details.find((d) => d.key === 'address')?.value || '';
      [city.note] = address.split(',');
      city.key = `${city.key}-${i + 1}`;
    });
    return cities.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('city-locator: city master could not be loaded', error);
    return [];
  }
}

/** all normalized names a city is known by (its name, aliases column, alias groups) */
function namesOf(city) {
  const names = [city.name, ...city.aliases].map(normalize);
  CITY_CONFIG.aliases
    .filter((group) => group.some((alias) => names.includes(normalize(alias))))
    .forEach((group) => names.push(...group.map(normalize)));
  return names;
}

/**
 * Finds the cities (several when a city has more than one branch) known by a name or
 * alias. Names are tried in order, the first one that matches wins.
 * @param {Object[]} cities city records
 * @param {string[]} names names to look for, most specific first
 * @returns {Object[]} matching cities, [] when none
 */
export function findCities(cities, names) {
  const index = new Map();
  cities.forEach((city) => namesOf(city).forEach((name) => {
    const list = index.get(name) || [];
    if (!list.includes(city)) list.push(city);
    index.set(name, list);
  }));
  return names.map((name) => index.get(normalize(name))).find(Boolean) || [];
}

/** First city known by one of the names (see findCities) */
export function findCity(cities, names) {
  return findCities(cities, names)[0];
}

/* ---------- remembered choice ---------- */

/** @returns {{consent?: 'yes'|'no', city?: string}} the visitor's earlier answers */
export function getSavedChoice() {
  return readStore(CITY_CONFIG.storageKeys.choice) || {};
}

/** @param {{consent?: 'yes'|'no', city?: string}} update merged into the saved choice */
export function saveChoice(update) {
  writeStore(CITY_CONFIG.storageKeys.choice, { ...getSavedChoice(), ...update });
}

/* ---------- browser location ---------- */

/**
 * Asks the browser for the visitor's position. Call only after the visitor agreed.
 * Rejects with a GeolocationPositionError (code 1 = permission denied) or an Error.
 * @returns {Promise<{lat: number, lng: number}>}
 */
export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      { timeout: CITY_CONFIG.timeouts.geolocation, maximumAge: 600000 },
    );
  });
}

/* ---------- nearest city ---------- */

/**
 * The default city: the first row of the city master (sheet order), or the first
 * city when the order is not known (authored rows).
 * @param {Object[]} cities city records
 * @returns {Object|undefined}
 */
export function firstCity(cities) {
  const order = (city) => city.order ?? Infinity;
  return cities.reduce((first, city) => (order(city) < order(first) ? city : first), cities[0]);
}

/**
 * The city with coordinates closest to a position, if it is within
 * CITY_CONFIG.maxDistanceKm. Cities without coordinates are skipped.
 * @param {Object[]} cities city records
 * @param {{lat: number, lng: number}} position
 * @returns {{city: Object, km: number}|null} null when no city is near enough
 */
export function nearestCity(cities, position) {
  const nearest = cities
    .filter((city) => city.position)
    .reduce((best, city) => {
      const km = distance(position, city.position);
      return !best || km < best.km ? { city, km } : best;
    }, null);
  return nearest && nearest.km <= CITY_CONFIG.maxDistanceKm ? nearest : null;
}
