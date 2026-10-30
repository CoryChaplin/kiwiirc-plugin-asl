/* global kiwi:true */

import * as config from '../config.js';

const KICK_NAME = /^\/k(\d+)$/;
const KICKBAN_NAME = /^\/kb(\d+)$/;

function configuredReasons() {
    let reasons = config.getSetting('modReasons');
    if (!Array.isArray(reasons)) {
        return [];
    }
    return reasons.map((reason) => String(reason || '').trim()).filter(Boolean);
}

function readAliases() {
    let aliases = kiwi.state.setting('aliases');
    if (typeof aliases === 'string') {
        return aliases;
    }
    aliases = kiwi.state.getSetting('settings.aliases');
    return typeof aliases === 'string' ? aliases : null;
}

function parseNumbered(aliases, kind) {
    let nameRe = kind === 'kb' ? KICKBAN_NAME : KICK_NAME;
    let out = [];
    String(aliases || '').split(/\r?\n/).forEach((line) => {
        let trimmed = line.trim();
        if (!trimmed || trimmed.charAt(0) === '#') {
            return;
        }
        let space = trimmed.search(/\s/);
        if (space < 0) {
            return;
        }
        let name = trimmed.slice(0, space);
        let found = name.match(nameRe);
        if (!found) {
            return;
        }
        let reason = reasonFromExpansion(trimmed.slice(space + 1).trim());
        if (!reason) {
            return;
        }
        out.push({
            n: parseInt(found[1], 10),
            alias: name,
            reason: reason,
        });
    });
    return out;
}

function nextFreeNumber(used) {
    let n = 1;
    while (used[n]) {
        n++;
    }
    return n;
}

function appendMissingReasons(existing, reasons, kind) {
    let prefix = kind === 'kb' ? '/kb' : '/k';
    let command = kind === 'kb' ?
        (n, reason) => prefix + n + ' /kickban $1 ' + reason :
        (n, reason) => prefix + n + ' /kick $channel $1 ' + reason;
    let used = Object.create(null);
    let texts = Object.create(null);
    existing.forEach((item) => {
        used[item.n] = true;
        texts[item.reason.toLowerCase()] = true;
    });
    let toAdd = [];
    reasons.forEach((reason) => {
        if (texts[reason.toLowerCase()]) {
            return;
        }
        let n = nextFreeNumber(used);
        used[n] = true;
        texts[reason.toLowerCase()] = true;
        toAdd.push({
            n: n,
            alias: prefix + n,
            reason: reason,
            line: command(n, reason),
        });
    });
    return toAdd;
}

export function inject() {
    let reasons = configuredReasons();
    let aliases = readAliases();
    if (!reasons.length || aliases === null) {
        return;
    }

    let addedK = appendMissingReasons(parseNumbered(aliases, 'k'), reasons, 'k');
    let addedKb = appendMissingReasons(parseNumbered(aliases, 'kb'), reasons, 'kb');
    let toAdd = addedK.concat(addedKb).map((item) => item.line);

    if (!toAdd.length) {
        return;
    }

    let next = aliases;
    if (next && next.charAt(next.length - 1) !== '\n') {
        next += '\n';
    }
    kiwi.state.setting('aliases', next + toAdd.join('\n'));
}

function reasonFromExpansion(expansion) {
    let match = String(expansion).match(/.*\$(?:1\+?|2\+)\s+(.+)$/);
    if (match) {
        return match[1].trim();
    }
    let lastSeg = String(expansion).split('|').pop().trim();
    let tokens = lastSeg.split(/\s+/);
    while (tokens.length && (/^\/[a-z]+$/i.test(tokens[0]) || /^\$/.test(tokens[0]))) {
        tokens.shift();
    }
    return tokens.join(' ').trim();
}

export function listReasons(aliases, kind, configReasons) {
    let existing = parseNumbered(aliases, kind);
    let seeded = Array.isArray(configReasons) ? configReasons : configuredReasons();
    seeded = seeded.map((reason) => String(reason || '').trim()).filter(Boolean);
    let extra = appendMissingReasons(existing, seeded, kind);
    return existing.concat(extra).sort((a, b) => a.n - b.n);
}
