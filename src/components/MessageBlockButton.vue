<template>
    <a
        v-if="!isSelf"
        class="kiwi-messageinfo-asl kiwi-messageinfo-asl-block"
        :title="label"
        :aria-label="label"
        @click="onClick"
    >{{ label }}</a>
</template>

<script>

/* global kiwi:true */

let TextFormatting = kiwi.require('helpers/TextFormatting');

// Injected into the native MessageInfo bar via the `message_info` seam.
// Toggle, reflecting the live ignore state: reads "Bloquer" / "Débloquer" so the
// user's other messages show the current state once blocked.
export default {
    props: ['buffer', 'message'],
    computed: {
        network() {
            return this.buffer.getNetwork();
        },
        user() {
            return this.$state.getUser(this.network.id, this.message.nick);
        },
        isBlocked() {
            return !!(this.user && this.user.ignore);
        },
        label() {
            return TextFormatting.t(this.isBlocked ? 'plugin-asl:unblock' : 'plugin-asl:block');
        },
        isSelf() {
            let me = this.network.nick;
            return !!me && !!this.message.nick &&
                me.toLowerCase() === this.message.nick.toLowerCase();
        },
    },
    methods: {
        onClick() {
            let user = this.user || { nick: this.message.nick, ignore: false };
            this.$state.$emit('asl.protect.block', {
                network: this.network,
                user: user,
                mode: 'toggle',
            });
        },
    },
};
</script>
