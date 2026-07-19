import * as config from '../config.js';

// How long a remembered send stays matchable. The echo comes back within a round trip;
// this is just slack for a slow relay.
const REMEMBER_TTL_MS = 120000;

// Safety cap so the registry can never grow unbounded
const MAX_ENTRIES = 20;

// Reports we have just sent to the fallback channel, awaiting their echo.
// { networkid, target, text, at }
let sent = [];

// caseCompare applies the network's casemapping; fall back for safety, as the other
// plugin helpers do (see messageActionTarget.js)
function caseCompare(client, a, b) {
    if (client && client.caseCompare) {
        return client.caseCompare(a, b);
    }
    return String(a).toLowerCase() === String(b).toLowerCase();
}

/**
 * Record a report we are about to send, so its server echo can be recognised and hidden.
 * Call this right before ircClient.say().
 */
export function remember(network, target, text) {
    // Reports to the bot are recognised by target alone, so there is nothing to remember
    let bot = config.getSetting('reportBot');
    let client = network.ircClient;
    if (bot && client && caseCompare(client, target, bot)) {
        return;
    }

    let now = Date.now();
    sent = sent.filter((entry) => now - entry.at < REMEMBER_TTL_MS);
    sent.push({
        networkid: network.id,
        target: target,
        text: text,
        at: now,
    });
    while (sent.length > MAX_ENTRIES) {
        sent.shift();
    }
}

/**
 * True when this incoming message is the server echoing back a report we sent.
 *
 * With echo-message the server returns a copy of our own PRIVMSG, which would open a
 * query with the moderation bot showing the whole report to the very user who filed it.
 *
 * This runs on every message, so the tests are ordered by cost: the sender check comes
 * first and rejects all normal traffic in a single string comparison, before any setting
 * lookup. The registry is only walked for our own messages to the fallback channel.
 */
export function isReportEcho(event, net) {
    let me = net.nick;
    if (!event.nick || !me || (event.nick !== me && !caseCompare(net.ircClient, event.nick, me))) {
        return false;
    }

    if (event.type !== 'privmsg' || !event.target) {
        return false;
    }

    let client = net.ircClient;

    // Anything we send to the bot is a report: hide it without looking at the content, so
    // this keeps working after a reload, when the registry is gone but history replays.
    let bot = config.getSetting('reportBot');
    if (bot && caseCompare(client, event.target, bot)) {
        return true;
    }

    if (sent.length === 0) {
        return false;
    }

    // The fallback channel may be a room we legitimately talk in, so only the exact text
    // of a report we just sent is hidden there.
    let channel = config.getSetting('reportChannel');
    if (!channel || !caseCompare(client, event.target, channel)) {
        return false;
    }

    let idx = sent.findIndex((entry) => (
        entry.networkid === net.id &&
        entry.text === event.message &&
        caseCompare(client, entry.target, event.target)
    ));
    if (idx === -1) {
        return false;
    }

    sent.splice(idx, 1);
    return true;
}
