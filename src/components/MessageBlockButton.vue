<template>
    <a
        v-if="isUserMessage && !isSelf"
        class="kiwi-messageinfo-asl kiwi-messageinfo-asl-block"
        :class="{ 'is-on': isBlocked }"
        :title="label"
        :aria-label="label"
        @click="onClick"
    >{{ label }}</a>
</template>

<script>

/* global kiwi:true */

import messageActionTarget from '../libs/messageActionTarget.js';

let TextFormatting = kiwi.require('helpers/TextFormatting');

// Injected into the native MessageInfo bar via the `message_info` seam.
// Toggle, reflecting the live ignore state: reads "Bloquer" / "Débloquer" so the
// user's other messages show the current state once blocked. Block survives the
// sender leaving because isBlocked / resolveTarget fall back to ignored_list.
export default {
    mixins: [messageActionTarget],
    computed: {
        label() {
            return TextFormatting.t(this.isBlocked ? 'plugin-asl:unblock' : 'plugin-asl:block');
        },
    },
    methods: {
        onClick() {
            this.$state.$emit('asl.protect.block', {
                network: this.network,
                user: this.resolveTarget(),
            });
        },
    },
};
</script>
