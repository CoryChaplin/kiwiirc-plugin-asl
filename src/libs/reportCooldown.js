/* global kiwi:true */

import * as config from '../config.js';

// Reactive so the Report buttons re-render on their own when a cooldown starts or
// expires: { key => expiry timestamp }. Keys are added/removed with Vue.set/delete.
// Session-only: a reload clears it, which is fine — this guards against repeat clicks,
// not against a determined user.
const store = kiwi.Vue.observable({ until: {} });

// key => timeout id, so an expiring entry drops out of the reactive store
const timers = {};

function entryKey(networkid, nick) {
    return networkid + ' ' + String(nick || '').toLowerCase();
}

/**
 * Start the cooldown on a nick after a report went out. Scope is per network + nick:
 * reporting someone else stays possible right away.
 */
export function start(network, nick) {
    let seconds = config.getSetting('reportCooldownSeconds');
    if (!(seconds > 0) || !network || !nick) {
        return;
    }

    let key = entryKey(network.id, nick);
    kiwi.Vue.set(store.until, key, Date.now() + seconds * 1000);
    if (timers[key]) {
        clearTimeout(timers[key]);
    }
    timers[key] = setTimeout(() => {
        delete timers[key];
        kiwi.Vue.delete(store.until, key);
    }, seconds * 1000);
}

export function isActive(network, nick) {
    if (!network || !nick) {
        return false;
    }
    let expiry = store.until[entryKey(network.id, nick)];
    return !!expiry && expiry > Date.now();
}

// Whole minutes left, at least 1 while the cooldown is running. For the wording of
// the hint shown when the button is disabled.
export function minutesLeft(network, nick) {
    if (!network || !nick) {
        return 0;
    }
    let expiry = store.until[entryKey(network.id, nick)];
    if (!expiry) {
        return 0;
    }
    return Math.max(1, Math.ceil((expiry - Date.now()) / 60000));
}
