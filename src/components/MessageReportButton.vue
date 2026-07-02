<template>
    <a
        v-if="isUserMessage && !isSelf"
        class="kiwi-messageinfo-asl kiwi-messageinfo-asl-report"
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
// Native button classes (u-link kiwi-messageinfo-button) are added by the host,
// so on any theme this renders as a plain text link — the EuropNet theme adds the
// DS look. No core patch, no DOM mutation.
export default {
    mixins: [messageActionTarget],
    computed: {
        label() {
            return TextFormatting.t('plugin-asl:report_action');
        },
    },
    methods: {
        onClick(e) {
            this.$state.$emit('asl.protect.report', {
                network: this.network,
                buffer: this.buffer,
                user: this.resolveTarget(),
                trigger: e && e.currentTarget,
            });
        },
    },
};
</script>
