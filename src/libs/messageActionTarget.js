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
