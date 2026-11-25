/* global kiwi:true */

/**
 * Read-only state API on `kiwi.state.pluginASL`, for other plugins (e.g. a survey).
 *
 *   activity() → { activeDays, window }        see libs/activity.js
 *   profile()  → { age, gender } | null         age as a range ('25-34'…) or 'nc' when the
 *                                               declared profile has no usable age;
 *                                               gender 'F' | 'M' | 'U'. null = unreadable
 *   universe() → 'sexe' | 'generaliste'         from the channels joined right now
 *
 * By design it never returns the exact age, the location, the nick, the ident or the
 * activity dates: callers get classes, never values that single a person out.
 */

import * as utils from './utils.js';
import { readActivity } from './activity.js';
import { getHotChannels } from './irceptionIdent.js';

const AGE_RANGES = [
    [15, 17, '15-17'],
    [18, 24, '18-24'],
    [25, 34, '25-34'],
    [35, 44, '35-44'],
    [45, 54, '45-54'],
    [55, 64, '55-64'],
];

// 'nc' (not given) keeps "declared without an age" apart from "profile unreadable" (null).
function ageRange(value) {
    let age = parseInt(value, 10);
    if (!(age >= 15)) {
        return 'nc';
    }
    let range = AGE_RANGES.find(([min, max]) => age >= min && age <= max);
    return range ? range[2] : '65+';
}

function genderCode(sexKey) {
    if (sexKey === '_female') return 'F';
    if (sexKey === '_male') return 'M';
    return 'U';
}

// Our own gecos. net.gecos is only set when the welcome form connected us; a network
// restored from a bouncer account (KiwiBNC) never goes through it, so fall back to what
// the server told us about ourselves, then to the IRC client's own registration data.
function ownGecos(net) {
    if (net.gecos) {
        return net.gecos;
    }
    let me = net.currentUser && net.currentUser();
    if (me && me.realname) {
        return me.realname;
    }
    let client = net.ircClient;
    return (client && client.user && client.user.gecos)
        || (client && client.options && client.options.gecos)
        || '';
}

function profile() {
    let net = kiwi.state.getActiveNetwork();
    if (!net) {
        return null;
    }
    // Parsed on our own JOIN / WHO like any other user's; preferred when present.
    let me = net.currentUser && net.currentUser();
    let asl = me && me.asl && (me.asl.a || me.asl.s) ? me.asl : null;
    if (!asl) {
        let gecos = ownGecos(net);
        asl = gecos ? utils.parseGecos(gecos).asl : null;
    }
    if (!asl) {
        return null;
    }
    return { age: ageRange(asl.a), gender: genderCode(asl.s) };
}

function universe() {
    let net = kiwi.state.getActiveNetwork();
    let hot = kiwi.state.pluginASL.hotChannels;
    let joined = net ? net.buffers.filter((b) => b.isChannel() && b.joined) : [];
    let isHot = joined.some((b) => hot.has(b.name.replace(/^#/, '').toLowerCase()));
    return isHot ? 'sexe' : 'generaliste';
}

// Called wherever form-config loads: keep only the adult channels, lowercase (IRC channel
// names are case-insensitive), so the universe can be read after the welcome screen is gone.
export function setHotChannels(formConfig) {
    kiwi.state.pluginASL.hotChannels = new Set(
        Array.from(getHotChannels(formConfig)).map((c) => c.toLowerCase())
    );
}

export function install() {
    let pluginASL = kiwi.state.pluginASL;
    pluginASL.hotChannels = new Set();
    pluginASL.activity = () => {
        let { activeDays, window } = readActivity();
        return { activeDays, window };
    };
    pluginASL.profile = profile;
    pluginASL.universe = universe;
}
