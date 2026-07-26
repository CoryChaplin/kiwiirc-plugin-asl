/**
 * Thin client for the irception backend.
 *
 * No business logic lives here — every endpoint just hits the API and
 * returns JSON. Errors are surfaced to the caller, which decides what to
 * show in the UI (silent retry vs. user-facing message — see the S01 spec
 * § Règles d'erreur).
 */

import * as config from '../config.js';
import { storeIdent } from './irceptionIdent.js';

function apiUrl() {
    let base = config.getSetting('irceptionApiUrl') || '';
    return base.replace(/\/+$/, '');
}

function originId() {
    return config.getSetting('irceptionOrigin');
}

async function getJson(url, signal, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const ident = window.localStorage?.getItem('irc_ident');
    if (ident && ident.length === 11) headers['X-Client-Ident'] = ident;
    const response = await fetch(url, {
        signal,
        headers,
        credentials: 'include',
    });
    if (!response.ok) throw new Error('irception: HTTP ' + response.status + ' on ' + url);
    return response.json();
}

/**
 * Fetch the form configuration (topics, rules, channelCategories,
 * maxChannels, originPrefixes). Falls back to window.FORM_CONFIG if the
 * host page already injected it (PHP-served pages do this).
 *
 * Si data.ident est retourné (récupération via X-Client-Ident ou cookie
 * irception SameSite=None), tous les tiers sont mis à jour via storeIdent.
 */
export async function loadFormConfig(options = {}) {
    if (typeof window !== 'undefined' && window.FORM_CONFIG) {
        return window.FORM_CONFIG;
    }
    const data = await getJson(apiUrl() + '/form/config', options.signal);
    if (data.ident && data.ident.length === 11) {
        await storeIdent(data.ident, options.kiwiStorage || null);
    }
    return data;
}

/**
 * GeoIP lookup based on the caller's address.
 * Returns { city, region, country_code, country_name, lat, long, ... } —
 * any field can be null when the database has no match.
 */
export async function loadGeoIP(options = {}) {
    return getJson(apiUrl() + '/getLocation', options.signal);
}

/**
 * Build the query string for /recommend/json.
 * `state` mirrors the irception form fields:
 *   { age, gender, location, country, position, topics, manualChannels,
 *     chosenChannels }
 */
export function buildRecommendParams(state) {
    let params = {
        age: state.age || '',
        sexe: state.gender || '',
        ville: state.location || '',
        country: state.country || '',
        origin: originId() != null ? String(originId()) : '',
        topics: (state.topics || []).join(','),
    };
    if (state.position) {
        params.position = state.position;
    }
    if (state.manualChannels && state.manualChannels.length) {
        params.manual_channels = state.manualChannels.join(',');
    }
    if (state.chosenChannels && state.chosenChannels.length) {
        params.chosen_channels = state.chosenChannels.join(',');
    }
    return params;
}

/**
 * Fetch channel recommendations. Caller is expected to debounce.
 * Returns { channels: { default_channels, age_channels, local_channels,
 * theme_channels }, suggestions: { topic: [...] } }.
 */
export async function recommend(state, options = {}) {
    let params = buildRecommendParams(state);
    let qs = Object.keys(params)
        .filter((k) => params[k] !== '' && params[k] != null)
        .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
        .join('&');
    return getJson(apiUrl() + '/recommend/json?' + qs, options.signal);
}

/**
 * Reverse geocoding via Nominatim (same upstream as irception). Resolves
 * a free-text city name to { lat, lon, country_code }. Errors are
 * swallowed — the caller treats a null return as "no update".
 */
const ADDRESS_TYPE_PRIORITY = [
    'city', 'town', 'village', 'municipality', 'county', 'state',
];

function sortByAddressType(results) {
    return results.slice().sort((a, b) => {
        let ai = ADDRESS_TYPE_PRIORITY.indexOf(a.addresstype);
        let bi = ADDRESS_TYPE_PRIORITY.indexOf(b.addresstype);
        let aRank = ai === -1 ? ADDRESS_TYPE_PRIORITY.length : ai;
        let bRank = bi === -1 ? ADDRESS_TYPE_PRIORITY.length : bi;
        return aRank - bRank;
    });
}

export async function reverseGeocode(query, options = {}) {
    if (!query || !query.trim()) return null;
    // Resolve effective country code: explicit > navigator.language fallback
    // (mirrors form.js:501-504). Without a country code the search is global
    // and much more likely to return wrong results.
    let countryCode = options.countryCode || '';
    if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) {
        let lang = (
            (typeof navigator !== 'undefined' && navigator.language) || ''
        );
        let derived = lang.split('-')[1] || lang.split('-')[0] || '';
        if (/^[A-Za-z]{2}$/.test(derived)) countryCode = derived;
    }
    // limit=5 so we can pick the best match by addresstype (city > town > …)
    let url = 'https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1' +
        '&q=' + encodeURIComponent(query.trim());
    if (countryCode && /^[A-Za-z]{2}$/.test(countryCode)) {
        url += '&countrycodes=' + countryCode.toLowerCase();
    }
    try {
        let response = await fetch(url, {
            signal: options.signal,
            headers: { 'Accept-Language': 'fr' },
        });
        if (!response.ok) return null;
        let data = await response.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        let hit = sortByAddressType(data)[0];
        return {
            lat: parseFloat(hit.lat),
            lon: parseFloat(hit.lon),
            countryCode: hit.address && hit.address.country_code
                ? hit.address.country_code.toUpperCase()
                : null,
        };
    } catch (err) {
        return null;
    }
}
