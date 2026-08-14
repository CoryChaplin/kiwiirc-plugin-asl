/* global kiwi:true */

export function parseGecos(gecos) {
    let types = kiwi.state.pluginASL.gecosTypes;
    let gecosType = kiwi.state.getSetting('settings.plugin-asl.gecosType') - 1;

    let sex = types[gecosType].other;
    let tempGecos;
    let location = '';
    let age = '';

    // Test male
    let tempGecosMale = gecos.split(sexRegexThis(types[gecosType].male));
    if (tempGecosMale.length > 1) {
        sex = types[gecosType].male;
        tempGecos = tempGecosMale;
    } else {
        // Test female
        let tempGecosFemale = gecos.split(sexRegexThis(types[gecosType].female));
        if (tempGecosFemale.length > 1) {
            sex = types[gecosType].female;
            tempGecos = tempGecosFemale;
        } else {
            tempGecos = gecos.split(sexRegexThis(types[gecosType].other));
        }
    }
    if (tempGecos.length > 1) {
        location = tempGecos[1];
    }

    if (tempGecos[0] !== undefined && tempGecos[0].match(/[0-9]/)) {
        age = tempGecos[0];
    }

    if (tempGecos.length > 0) {
        if (age === '' && sex === types[gecosType].other && location === '') {
            return {
                asl: {
                    a: age,
                    s: getSex(sex),
                    l: location,
                },
                realname: gecos,
            };
        }
        return {
            asl: {
                a: age,
                s: getSex(sex),
                l: location,
            },
        };
    }
    return {
        asl: null,
        realname: gecos,
    };
}

// Gender glyph class after the nick: g-m / g-f / g-u, or '' for none.
// "Other" only earns a glyph (g-u) when there is real A/S/L alongside it — a bare parsed
// GECOS (sex defaulted to other, no age, no location) counts as "not declared" → no glyph.
export function getGenderClass(asl) {
    if (!asl || !asl.s) {
        return '';
    }
    let prefix = asl.s.substr(0, 2);
    if (prefix === '_m') {
        return 'g-m';
    }
    if (prefix === '_f') {
        return 'g-f';
    }
    return (asl.a || asl.l) ? 'g-u' : '';
}

export function getColour(asl) {
    let sex = asl && asl.s ? asl.s : '';
    let sexes = kiwi.state.getSetting('settings.plugin-asl.sexes');
    let fallbackColour = kiwi.state.getSetting('settings.plugin-asl.fallbackColour');
    return sexes[sex] ? sexes[sex].colour : fallbackColour;
}

// Compare two nicks the way the network does (casemapping), with the same safety
// fallback the rest of the plugin uses when the client isn't reachable yet.
export function sameName(network, a, b) {
    if (!a || !b) {
        return false;
    }
    let client = network && network.ircClient;
    if (client && client.caseCompare) {
        return client.caseCompare(a, b);
    }
    return String(a).toLowerCase() === String(b).toLowerCase();
}

// Is this host one of the official services' (see the reportExemptHosts setting)?
// Matched on a label boundary — exact host, or a subdomain of a listed one — never a
// substring: a user vhost like joe.users.europnet.org, or a lookalike host ending in
// services.europnet.org.attacker.net, must stay reportable.
export function isExemptHost(host) {
    let lower = String(host || '').toLowerCase();
    if (!lower) {
        return false;
    }
    let exempt = kiwi.state.getSetting('settings.plugin-asl.reportExemptHosts') || [];
    return exempt.some((entry) => {
        let suffix = String(entry || '').toLowerCase();
        return !!suffix && (lower === suffix || lower.endsWith('.' + suffix));
    });
}

// channels shared with a user (the fiche lists them; a report attaches them)
export function commonChannels(networkId, nick) {
    return kiwi.state.getBuffersWithUser(networkId, nick)
        .filter((buffer) => buffer.name.substr(0, 1) === '#')
        .map((buffer) => buffer.name);
}

// Bare, lowercase channel name (no leading sigil) — the shared key both producers and
// consumers of the official-channels set must use so their comparisons match.
export function normalizeChannelName(name) {
    return String(name || '').toLowerCase().replace(/^[#&!+]+/, '');
}

// Parse an RPL_WHOISCHANNELS string ("@#a %#b #c") into [{ prefix, name }].
// prefix = the user-status symbols before the channel; name = from the first CHANTYPES char.
export function parseWhoisChannels(channelsStr, chantypes) {
    let types = chantypes || '#&';
    let tokens = String(channelsStr || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    return tokens.map((token) => {
        let i = 0;
        while (i < token.length && types.indexOf(token[i]) === -1) {
            i++;
        }
        return { prefix: token.slice(0, i), name: token.slice(i) || token };
    });
}

export function getSexChar(sex) {
    let sexes = kiwi.state.getSetting('settings.plugin-asl.sexes');
    return sexes[sex] ? sexes[sex].chars[0] : null;
}

function getSex(sexChar) {
    let sexes = kiwi.state.getSetting('settings.plugin-asl.sexes');
    let sexesKeys = Object.keys(sexes);
    for (let i = 0; i < sexesKeys.length; i++) {
        let sex = sexesKeys[i];
        if (sexes[sex].chars.indexOf(sexChar) !== -1) {
            return sex;
        }
    }
    return null;
}

function sexRegexThis(string) {
    let sexRegexString = '^' + string + ' | ' + string + '$|^' + string + '$| ' + string + ' ';
    let regex = new RegExp(sexRegexString, 'gi');

    return regex;
}
