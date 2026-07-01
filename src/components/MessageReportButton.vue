<template>
    <a
        v-if="!isSelf"
        class="kiwi-messageinfo-asl kiwi-messageinfo-asl-report"
        :title="label"
        :aria-label="label"
        @click="onClick"
    >{{ label }}</a>
</template>

<script>

/* global kiwi:true */

let TextFormatting = kiwi.require('helpers/TextFormatting');

// Injected into the native MessageInfo bar via the `message_info` seam.
// Native button classes (u-link kiwi-messageinfo-button) are added by the host,
// so on any theme this renders as a plain text link — the EuropNet theme adds the
// DS look. No core patch, no DOM mutation.
export default {
    props: ['buffer', 'message'],
    computed: {
        label() {
            return TextFormatting.t('plugin-asl:report_action');
        },
        network() {
            return this.buffer.getNetwork();
        },
        isSelf() {
            let me = this.network.nick;
            return !!me && !!this.message.nick &&
                me.toLowerCase() === this.message.nick.toLowerCase();
        },
    },
    methods: {
        onClick(e) {
            let user = this.$state.getUser(this.network.id, this.message.nick) ||
                { nick: this.message.nick, ignore: false };
            this.$state.$emit('asl.protect.report', {
                network: this.network,
                buffer: this.buffer,
                user: user,
                trigger: e && e.currentTarget,
            });
        },
    },
};
</script>
