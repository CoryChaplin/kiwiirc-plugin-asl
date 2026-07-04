<template>
    <a
        v-if="canProtect"
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

// Injected into the native MessageInfo bar via the `message_info` seam, which also
// applies the native button classes (u-link kiwi-messageinfo-button). So on any theme
// this renders as a plain text link; the EuropNet theme gives it its styled look.
// No core patch, no DOM mutation.
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
                // the exact reported message, so the log window can centre on it and
                // the notice can quote it; reports opened from the userbox carry none
                message: this.message,
                trigger: e && e.currentTarget,
            });
        },
    },
};
</script>
