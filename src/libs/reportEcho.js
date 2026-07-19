import * as config from '../config.js';

// How long a remembered send stays matchable. The echo comes back within a round trip;
// this is just slack for a slow relay.
const REMEMBER_TTL_MS = 120000;

// Safety cap so the registry can never grow unbounded
const MAX_ENTRIES = 20;

// Reports we have just sent to the fallback channel, awaiting their echo.
// { networkid, target, text, at }
let sent = [];

/**
 * Record a report we are about to send, so its server echo can be recognised and hidden.
 * Call this right before ircClient.say().
 */
export function remember(network, target, text) {
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
 * This runs on every message, so the tests are ordered by cost: the sender check alone
 * rejects all normal traffic in a single string comparison, and the registry is only
 * walked for our own messages to the fallback channel.
 */
export function isReportEcho(event, net) {
    let bot = config.getSetting('reportBot');
    if (!bot && sent.length === 0) {
        return false;
    }

    let client = net.ircClient;
    let me = client.user.nick;
    if (!event.nick || (event.nick !== me && !client.caseCompare(event.nick, me))) {
        return false;
    }

    if (event.type !== 'privmsg' || !event.target) {
        return false;
    }

    // Anything we send to the bot is a report: hide it without looking at the content, so
    // this keeps working after a reload, when the registry is gone but history replays.
    if (bot && client.caseCompare(event.target, bot)) {
        return true;
    }

    // The fallback channel may be a room we legitimately talk in, so only the exact text
    // of a report we just sent is hidden there.
    let channel = config.getSetting('reportChannel');
    if (!channel || !client.caseCompare(event.target, channel)) {
        return false;
    }

    let idx = sent.findIndex((entry) => (
        entry.networkid === net.id &&
        entry.text === event.message &&
        client.caseCompare(entry.target, event.target)
    ));
    if (idx === -1) {
        return false;
    }

    sent.splice(idx, 1);
    return true;
}
