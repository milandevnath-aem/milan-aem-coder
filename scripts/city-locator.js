import { toClassName } from './aem.js';
import { fetchPlaceholders } from './placeholders.js';

/*
  City locator: data and location logic shared by city-aware blocks (no UI here).

  - City master: a sheet (JSON) of cities and their details. Its URL comes from the
    placeholders sheet ("city-master" row), or CITY_CONFIG.cityMasterPath.
  - Google Maps: loaded on demand with the key from the placeholders sheet
    ("google-maps-api-key" row), only to geocode. Never hardcode the key. The key's
    project needs the Maps JavaScript API and the Geocoding API enabled. When Google
    is not available (no key, key rejected, API not enabled, timeout) the visitor's
    city is not looked up: the caller keeps the A-Z city list.
  - Visitor choice (location consent, selected city) and geocoded city positions are
    kept in localStorage so we do not ask, or geocode, again on every visit.
*/

export const CITY_CONFIG = {
  // placeholders sheet keys, camel-cased by fetchPlaceholders ("google-maps-api-key")
  placeholders: {
    apiKey: 'googleMapsApiKey',
    cityMaster: 'cityMaster',
  },
  // city master location when the placeholders sheet has no "city-master" row
  cityMasterPath: '/city-master.json',
  // sheet to read when the city master is a workbook with several sheets (first one otherwise)
  cityMasterSheet: '',
  // geocoding is limited to this country; also the Maps region
  country: 'IN',
  // nearest city: only compare cities in the visitor's state when the master has a
  // state column and lists cities in that state (far fewer geocoder calls)
  nearestWithinState: true,
  // parallel geocoder requests when looking up city positions
  geocodeConcurrency: 4,
  // how long geocoded city positions are kept in the browser
  cacheDays: 30,
  timeouts: {
    geolocation: 10000,
    script: 10000,
    geocode: 8000,
    // overall budget for geocoding the city master (nearest city search)
    nearest: 20000,
  },
  storageKeys: {
    choice: 'kmp-city-choice',
    positions: 'kmp-city-positions-v1',
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
  // names Google may return for a city listed under another name (or spelling) in the
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

function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

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

/**
 * The API key from the placeholders sheet. Tolerates a pasted script URL
 * (".../maps/api/js?key=...&region=IN") or stray spaces instead of the bare key.
 */
function readApiKey(value) {
  const text = String(value || '').trim();
  try {
    return new URL(text).searchParams.get('key') || '';
  } catch (e) {
    return text;
  }
}

/** great-circle distance in km between two { lat, lng } */
export function distance(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** { lat, lng } when both are numbers, else null */
export function toPosition(lat, lng) {
  const position = { lat: parseFloat(lat), lng: parseFloat(lng) };
  return Number.isFinite(position.lat) && Number.isFinite(position.lng) ? position : null;
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

    // a city listed more than once (several branches) keeps every row; the
    // dropdown tells them apart by the start of the address
    const count = {};
    cities.forEach((city) => { count[city.key] = (count[city.key] || 0) + 1; });
    cities.forEach((city, i) => {
      if (count[city.key] < 2) return;
      const address = city.details.find((d) => d.key === 'address')?.value || '';
      [city.note] = address.split(',');
      city.key = `${city.key}-${i + 1}`;
      // branches of one city are told apart by their address when geocoded
      city.query = [address, city.name].filter(Boolean).join(', ');
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
 * @param {string[]} names e.g. names returned by the geocoder, most specific first
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

/* ---------- Google Maps ---------- */

function injectMapsScript(key) {
  return new Promise((resolve, reject) => {
    const callback = 'kmpGoogleMapsReady';
    window[callback] = () => {
      delete window[callback];
      resolve();
    };
    const params = new URLSearchParams({
      key,
      v: 'weekly',
      loading: 'async',
      callback,
      region: CITY_CONFIG.country,
      // English names, so they match the city master whatever the browser language
      language: 'en',
    });
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.append(script);
  });
}

let geocoderPromise;

// Google calls window.gm_authFailure when it rejects the key (invalid key, site not in
// the key's allowed referrers, API not enabled). Geocoder calls then never answer, so
// they race against this to fail at once instead of waiting for the timeout.
let rejectAuth;
const authFailure = new Promise((resolve, reject) => { rejectAuth = reject; });
authFailure.catch(() => {});

/**
 * Loads the Maps JavaScript API (once per page) and returns a Geocoder.
 * Rejects when the key is missing or the script does not load in time.
 * @returns {Promise<google.maps.Geocoder>}
 */
export function loadGeocoder() {
  geocoderPromise = geocoderPromise || (async () => {
    if (!window.google?.maps?.importLibrary) {
      window.gm_authFailure = () => {
        const error = new Error('Google Maps rejected the API key (see the console error for the reason)');
        error.code = 'REQUEST_DENIED';
        rejectAuth(error);
      };
      const placeholders = await fetchPlaceholders();
      const key = readApiKey(placeholders[CITY_CONFIG.placeholders.apiKey]);
      if (!key) throw new Error('Google Maps API key missing: add "google-maps-api-key" to the placeholders sheet');
      await withTimeout(injectMapsScript(key), CITY_CONFIG.timeouts.script, 'Google Maps script');
    }
    const { Geocoder } = await window.google.maps.importLibrary('geocoding');
    return new Geocoder();
  })();
  return geocoderPromise;
}

/** Geocoder request with a timeout; "no results" resolves to [] */
async function geocode(geocoder, request) {
  try {
    const answer = Promise.race([geocoder.geocode(request), authFailure]);
    const { results } = await withTimeout(answer, CITY_CONFIG.timeouts.geocode, 'Geocoder');
    return results || [];
  } catch (error) {
    if (error.code === 'ZERO_RESULTS') return [];
    throw error;
  }
}

/**
 * Reverse geocodes a position into city name candidates (most specific first) and state.
 * @returns {Promise<{names: string[], state: string}>}
 */
async function describePosition(geocoder, position) {
  const results = await geocode(geocoder, { location: position });
  const components = results.flatMap((result) => result.address_components);
  const names = ['locality', 'postal_town', 'administrative_area_level_3', 'administrative_area_level_2', 'sublocality_level_1']
    .flatMap((type) => components.filter((c) => c.types.includes(type)))
    .flatMap((c) => [c.long_name, c.short_name]);
  const state = components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name || '';
  return { names: [...new Set(names)], state };
}

/**
 * Geocodes cities that have no position yet into the cache, a few at a time, until
 * done or the deadline. Cities that are not found are cached too, so they are not
 * looked up again on every visit.
 */
async function geocodeCities(geocoder, cities, cache, deadline) {
  const queue = [...cities];
  const worker = async () => {
    while (queue.length && Date.now() < deadline) {
      const city = queue.shift();
      try {
        // eslint-disable-next-line no-await-in-loop
        const [hit] = await geocode(geocoder, {
          address: city.query || [city.name, city.region].filter(Boolean).join(', '),
          componentRestrictions: { country: CITY_CONFIG.country },
        });
        const location = hit?.geometry?.location;
        cache[city.key] = location
          ? { lat: location.lat(), lng: location.lng(), t: Date.now() }
          : { t: Date.now() };
      } catch (error) {
        if (error.code === 'OVER_QUERY_LIMIT') {
          // rate limited: back off and try this city again
          queue.push(city);
          // eslint-disable-next-line no-await-in-loop
          await wait(1000);
        } else if (error.code === 'REQUEST_DENIED') {
          // key not allowed to geocode: no point trying the other cities
          queue.length = 0;
        }
        // other errors (timeouts): skipped now, retried on a later visit
      }
    }
  };
  await Promise.all(Array.from({ length: CITY_CONFIG.geocodeConcurrency }, worker));
}

/**
 * Nearest city to a position. Uses city master coordinates when present, else
 * positions geocoded earlier (cached), else geocodes the cities now.
 * @returns {Promise<Object|null>}
 */
async function findNearestCity(geocoder, cities, position, state) {
  let candidates = cities;
  if (CITY_CONFIG.nearestWithinState && state) {
    const inState = cities.filter((city) => normalize(city.region) === normalize(state));
    if (inState.length) candidates = inState;
  }

  const maxAge = CITY_CONFIG.cacheDays * 864e5;
  const stored = readStore(CITY_CONFIG.storageKeys.positions) || {};
  const cache = Object.fromEntries(Object.entries(stored)
    .filter(([, entry]) => Date.now() - entry.t < maxAge));
  const missing = candidates.filter((city) => !city.position && !cache[city.key]);
  if (missing.length) {
    await geocodeCities(geocoder, missing, cache, Date.now() + CITY_CONFIG.timeouts.nearest);
    writeStore(CITY_CONFIG.storageKeys.positions, cache);
  }

  return candidates
    .map((city) => ({
      city,
      at: city.position || toPosition(cache[city.key]?.lat, cache[city.key]?.lng),
    }))
    .filter(({ at }) => at)
    .reduce((best, entry) => {
      const km = distance(position, entry.at);
      return !best || km < best.km ? { city: entry.city, km } : best;
    }, null)?.city || null;
}

/**
 * The city for a position: the city master city it is in, else the nearest one.
 * Rejects when Google Maps is not available (no key, key rejected, Geocoding API not
 * enabled, timeout); the caller then keeps the A-Z city list.
 * @param {Object[]} cities city records
 * @param {{lat: number, lng: number}} position
 * @returns {Promise<{city: Object, match: 'exact'|'nearest'}|null>} null when none found
 */
export async function cityFromPosition(cities, position) {
  if (!cities.length) return null;
  const geocoder = await loadGeocoder();
  const { names, state } = await describePosition(geocoder, position);
  const matches = findCities(cities, names);
  if (matches.length === 1) return { city: matches[0], match: 'exact' };
  if (matches.length > 1) {
    // the visitor's city has several branches: the nearest of them
    const city = await findNearestCity(geocoder, matches, position, '');
    return { city: city || matches[0], match: 'exact' };
  }
  const nearest = await findNearestCity(geocoder, cities, position, state);
  return nearest ? { city: nearest, match: 'nearest' } : null;
}
