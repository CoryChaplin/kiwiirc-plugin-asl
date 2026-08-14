/* global kiwi:true */

import * as config from '../config.js';
import * as utils from './utils.js';

let TextFormatting = kiwi.require('helpers/TextFormatting');

// Shared logic for the per-message protection actions (Report / Block / Kickban)
// injected into the native MessageInfo bar. Resolves the target from the message
// (honouring IRC casemapping) and decides whether an action applies, so the three
// button components don't each re-derive it.
export default {
    props: ['buffer', 'message'],
    computed: {
        network() {
            return this.buffer.getNetwork();
        },
        // live user object, or null once the sender has left the channel
        targetUser() {
            return this.$state.getUser(this.network.id, this.message.nick);
        },
        isSelf() {
            let net = this.network;
            let nick = this.message.nick;
            if (!net || !nick) {
                return false;
            }
            // caseCompare applies the network's casemapping; fall back for safety
            if (net.ircClient && net.ircClient.caseCompare) {
                return net.ircClient.caseCompare(net.nick, nick);
            }
            return !!net.nick && net.nick.toLowerCase() === nick.toLowerCase();
        },
        // block state must survive the sender leaving: ignored_list is the filtering
        // source of truth (IgnoreMiddleware), so read it directly when no live user
        isNickIgnored() {
            let nick = this.message.nick;
            if (!nick) {
                return false;
            }
            let lower = nick.toLowerCase();
            return (this.network.ignored_list || []).some((n) => n.toLowerCase() === lower);
        },
        isBlocked() {
            return this.targetUser ? !!this.targetUser.ignore : this.isNickIgnored;
        },
        // only offer the actions on real user messages — the info bar also renders on
        // notices (system confirmations, server notices), which have no target to act on
        isUserMessage() {
            return (this.message.type === 'privmsg' || this.message.type === 'action') &&
                !!this.message.nick;
        },
        // A notice sent by a real user. Server notices carry no nick, and the plugin's own
        // confirmations use the system_message label as their nick — a value with a space
        // in it, which no IRC nick can ever be.
        isUserNotice() {
            return this.message.type === 'notice' &&
                !!this.message.nick &&
                this.message.nick !== TextFormatting.t('plugin-asl:system_message');
        },
        // The sender's host: from the tag plugin.js stashes on reception, which is the only
        // source for someone we share no channel with, falling back to the user object.
        targetHost() {
            let tagged = this.message.tags && this.message.tags['asl/host'];
            return tagged || (this.targetUser && this.targetUser.host) || '';
        },
        // Services talk to everybody in notices: reporting them helps nobody, and blocking
        // one would silently swallow the user's own login notices. Same for the moderation
        // bot, whose answers come back as notices in whatever buffer is active.
        isExemptSender() {
            let bot = config.getSetting('reportBot');
            if (bot && utils.sameName(this.network, bot, this.message.nick)) {
                return true;
            }
            return utils.isExemptHost(this.targetHost);
        },
        isChannel() {
            return !!(this.buffer.isChannel && this.buffer.isChannel());
        },
        canProtect() {
            if (this.isSelf || this.isExemptSender) {
                return false;
            }
            // Notices are the exception to the channel rule below: core drops a private
            // notice into whatever buffer happens to be active (a channel, someone else's
            // query, or the server tab), where the right sidebar points at another person
            // — or at nobody. The per-message action is then the only way in.
            if (this.isUserNotice) {
                return true;
            }
            // otherwise per-message Report/Block only make sense in a channel: in a query
            // the right sidebar already carries these actions
            return this.isUserMessage && this.isChannel;
        },
    },
    methods: {
        // a target the host can act on even after the user has left: fall back to a
        // lightweight descriptor whose ignore flag mirrors ignored_list, so toggling
        // (and the report modal's "block too" gate) reads the real current state
        resolveTarget() {
            return this.targetUser || { nick: this.message.nick, ignore: this.isBlocked };
        },
    },
};
