/* global kiwi:true */

import * as config from '../config.js';

let TextFormatting = kiwi.require('helpers/TextFormatting');

const NAME_RE = {
    k: /^\/k(\d+)$/i,
    kb: /^\/kb(\d+)$/i,
};
const COMMANDS = {
    k: '/kick $channel $1 ',
    kb: '/kickban $1 ',
};
// Matches the help in any language: its examples are built here, only their text is translated
const HELP_RE = /^# \/k\d+ \/kick /m;

let defaultAliases = null;

function configuredReasons() {
    let reasons = config.getSetting('modReasons');
    if (!Array.isArray(reasons)) {
        return [];
    }
    return reasons.map((reason) => String(reason || '').trim()).filter(Boolean);
}

// Reads the aliases the way AliasRewriter does: lines must start with the /name, names
// are case insensitive and the last definition of a name wins
function numberedAliases(aliases, kind) {
    let byName = Object.create(null);
    String(aliases || '').split('\n').forEach((line) => {
        let space = line.indexOf(' ');
        if (line.charAt(0) !== '/' || space === -1) {
            return;
        }
        let name = line.slice(0, space);
        let found = name.match(NAME_RE[kind]);
        let expansion = line.slice(space + 1).trim();
        if (found && expansion) {
            byName[name.toLowerCase()] = {
                n: parseInt(found[1], 10),
                alias: name,
                expansion: expansion,
            };
        }
    });
    return Object.keys(byName).map((name) => byName[name]);
}

function seedLines(aliases, kind, reasons) {
    if (numberedAliases(aliases, kind).length) {
        return [];
    }
    return reasons.map((reason, idx) => '/' + kind + (idx + 1) + ' ' + COMMANDS[kind] + reason);
}

function helpLines() {
    if (!kiwi.i18n.exists('plugin-asl:mod_aliases_title')) {
        return [];
    }
    let reason = TextFormatting.t('plugin-asl:mod_aliases_reason');
    return [
        '',
        '# ' + TextFormatting.t('plugin-asl:mod_aliases_title'),
        '# /k3 ' + COMMANDS.k + reason,
        '# /kb3 ' + COMMANDS.kb + reason,
        '# ' + TextFormatting.t('plugin-asl:mod_aliases_format'),
    ];
}

function appendLines(aliases, lines) {
    let separator = aliases && aliases.charAt(aliases.length - 1) !== '\n' ? '\n' : '';
    return aliases + separator + lines.join('\n');
}

// InputHandler reads the aliases before the plugins load, then only reloads them when
// user_settings.aliases changes. Setting it for one tick makes it read settings.aliases
// again without leaving anything in the user's settings.
function reloadInputAliases(aliases) {
    kiwi.state.setSetting('user_settings.aliases', aliases);
    kiwi.Vue.nextTick(() => {
        kiwi.state.setSetting('user_settings.aliases', null);
    });
}

// Feeds modReasons to the /kN and /kbN aliases when there are none. Users without their own
// aliases get them in the default aliases, so nothing is persisted and they follow the config.
// Users with their own aliases get them added to their list, which remains theirs afterwards.
// Needs the plugin locales for the help comment, and runs again when the language changes so
// that the default aliases follow it.
export function seed() {
    if (defaultAliases === null) {
        defaultAliases = kiwi.state.getSetting('settings.aliases');
    }
    let userAliases = kiwi.state.getSetting('user_settings.aliases');
    let hasOwnAliases = typeof userAliases === 'string';
    let aliases = hasOwnAliases ? userAliases : defaultAliases;
    if (typeof aliases !== 'string') {
        return;
    }

    let reasons = configuredReasons();
    let seeded = seedLines(aliases, 'k', reasons).concat(seedLines(aliases, 'kb', reasons));
    if (hasOwnAliases && !seeded.length) {
        return;
    }

    let help = HELP_RE.test(aliases) ? [] : helpLines();
    let next = appendLines(aliases, help.concat(seeded));
    if (hasOwnAliases) {
        kiwi.state.setting('aliases', next);
        return;
    }
    if (next === kiwi.state.getSetting('settings.aliases')) {
        return;
    }

    kiwi.state.setSetting('settings.aliases', next);
    if (seeded.length) {
        reloadInputAliases(next);
    }
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

// The menu entries: the reasons of the /kN or /kbN aliases, after the default kick reason
// unless modReasons replaces it
export function listReasons(aliases, kind, defaultReason) {
    let numbered = numberedAliases(aliases, kind)
        .sort((a, b) => a.n - b.n)
        .map((item) => ({ alias: item.alias, reason: reasonFromExpansion(item.expansion) }));
    let fallback = configuredReasons().length ? '' : String(defaultReason || '').trim();
    let seen = Object.create(null);
    return [{ alias: '', reason: fallback }]
        .concat(numbered)
        .filter((item) => {
            let text = item.reason.toLowerCase();
            if (!text || seen[text]) {
                return false;
            }
            seen[text] = true;
            return true;
        });
}
