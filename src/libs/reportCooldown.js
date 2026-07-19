/* global kiwi:true */

import * as config from '../config.js';

// Reactive so the Report buttons re-render on their own when a cooldown starts or
// expires: { key => expiry timestamp }. Keys are added/removed with Vue.set/delete.
// Session-only: a reload clears it, which is fine — this guards against repeat clicks,
// not against a determined user.
const store = kiwi.Vue.observable({ until: {} });

// key => timeout id, so an expiring entry drops out of the reactive store
const timers = {};

// Fold the nick the way the network compares nicks (rfc1459 folds []\ onto {}|), so
// Foo[x] and foo{x} share one entry instead of two. Same rule as client.caseCompare,
// which the rest of the plugin uses; plain lowercase if the client isn't reachable.
function entryKey(network, nick) {
    let client = network.ircClient;
    let folded = client && client.caseLower ?
        client.caseLower(String(nick)) :
        String(nick).toLowerCase();
    return network.id + ' ' + folded;
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

    let key = entryKey(network, nick);
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
    let expiry = store.until[entryKey(network, nick)];
    return !!expiry && expiry > Date.now();
}
