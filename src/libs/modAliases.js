/* global kiwi:true */

import * as config from '../config.js';

// True when `name` is already a first-token alias (so /k1 does not match /kb1,
// and a user-edited /k1 is left alone).
function hasAlias(aliases, name) {
    let needle = name.charAt(0) === '/' ? name : '/' + name;
    return String(aliases).split(/\r?\n/).some((line) => {
        let trimmed = line.trim();
        if (!trimmed || trimmed.charAt(0) === '#') {
            return false;
        }
        return trimmed.split(/\s+/)[0] === needle;
    });
}

// Append the /kickban helper and one /kN + /kbN pair per modReasons entry.
// Idempotent: existing names (including user-customised ones) are not rewritten.
export function inject() {
    let reasons = config.getSetting('modReasons') || [];
    let aliases = kiwi.state.setting('aliases');
    if (typeof aliases !== 'string') {
        aliases = '';
    }

    let toAdd = [];
    if (!hasAlias(aliases, '/kickban')) {
        toAdd.push('/kickban /lines /ban $1 | /kick $channel $1 $2+');
    }

    reasons.forEach((reason, i) => {
        let n = i + 1;
        let kName = '/k' + n;
        let kbName = '/kb' + n;
        if (!hasAlias(aliases, kName)) {
            toAdd.push(kName + ' /kick $channel $1 ' + reason);
        }
        if (!hasAlias(aliases, kbName)) {
            toAdd.push(kbName + ' /kickban $1 ' + reason);
        }
    });

    if (!toAdd.length) {
        return;
    }

    let next = aliases;
    if (next && next.charAt(next.length - 1) !== '\n') {
        next += '\n';
    }
    kiwi.state.setting('aliases', next + toAdd.join('\n'));
}

const KICK_NAME = /^\/k(\d+)$/;
const KICKBAN_NAME = /^\/kb(\d+)$/;

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

// kind: 'k' (Éjecter) or 'kb' (Bannir et éjecter). Reads /kN or /kbN lines from
// the Kiwi alias list so a user-added /kb3 appears next to the seeded /kb1 /kb2.
export function listReasons(aliases, kind) {
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
    out.sort((a, b) => a.n - b.n);
    return out;
}
