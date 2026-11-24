/* global kiwi:true */

/**
 * Read-only state API on `kiwi.state.pluginASL`, for other plugins (e.g. a survey).
 *
 *   activity() → { activeDays, window }        see libs/activity.js
 *   profile()  → { age, gender } | null         age as a range ('25-34'…), gender 'F' | 'M' | 'U'
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

function ageRange(value) {
    let age = parseInt(value, 10);
    if (!(age >= 15)) {
        return null;
    }
    let range = AGE_RANGES.find(([min, max]) => age >= min && age <= max);
    return range ? range[2] : '65+';
}

function genderCode(sexKey) {
    if (sexKey === '_female') return 'F';
    if (sexKey === '_male') return 'M';
    return 'U';
}

function profile() {
    let net = kiwi.state.getActiveNetwork();
    if (!net || !net.gecos) {
        return null;
    }
    let asl = utils.parseGecos(net.gecos).asl;
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
