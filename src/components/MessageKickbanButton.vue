<template>
    <a
        v-if="canModerate"
        class="kiwi-messageinfo-asl kiwi-messageinfo-asl-kickban"
        :title="label"
        :aria-label="label"
        @click="onClick"
    >{{ label }}</a>
</template>

<script>

/* global kiwi:true */

import messageActionTarget from '../libs/messageActionTarget.js';

let TextFormatting = kiwi.require('helpers/TextFormatting');

// Op moderation in the message bar: replaces the native Ban+Kick with a single
// Kickban. The reason is collected by an anchored popover in the shared host
// (AslProtection), then applied via buffer.banKickUser(user, reason).
export default {
    mixins: [messageActionTarget],
    computed: {
        label() {
            return TextFormatting.t('user_kickban');
        },
        canModerate() {
            // channel + we're an op + not our own message + target still present
            if (this.isSelf || !this.targetUser) {
                return false;
            }
            if (!this.buffer.isChannel || !this.buffer.isChannel()) {
                return false;
            }
            return this.buffer.isUserAnOp(this.network.nick);
        },
    },
    methods: {
        onClick(e) {
            let user = this.targetUser;
            if (!user) {
                return;
            }
            let rect = e.currentTarget.getBoundingClientRect();
            this.$state.$emit('asl.protect.kickban', {
                buffer: this.buffer,
                network: this.network,
                user: user,
                // popover opens below the button, flipping above if it would overflow
                anchor: { below: rect.bottom, above: rect.top, left: rect.left, right: rect.right },
            });
        },
    },
};
</script>
