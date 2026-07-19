<template>
    <a
        v-if="canProtect"
        class="kiwi-messageinfo-asl kiwi-messageinfo-asl-report"
        :class="{ 'kiwi-messageinfo-asl-disabled': onCooldown }"
        :title="onCooldown ? cooldownHint : label"
        :aria-label="onCooldown ? cooldownHint : label"
        :aria-disabled="onCooldown ? 'true' : 'false'"
        @click="onClick"
    >{{ label }}</a>
</template>

<script>

/* global kiwi:true */

import messageActionTarget from '../libs/messageActionTarget.js';
import * as reportCooldown from '../libs/reportCooldown.js';

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
        // reactive: the shared store drops the entry when the cooldown expires
        onCooldown() {
            return reportCooldown.isActive(this.network, this.message.nick);
        },
        cooldownHint() {
            return TextFormatting.t('plugin-asl:report_cooldown_hint', {
                minutes: reportCooldown.minutesLeft(this.network, this.message.nick),
            });
        },
    },
    methods: {
        onClick(e) {
            if (this.onCooldown) {
                return;
            }
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

<style lang="less">
/* Disabled look for the action-bar link: it stays in place (so the user sees the report
   was taken into account) but reads as inert on any theme. */
.kiwi-messageinfo-asl-disabled {
    opacity: 0.45;
    cursor: default;
}
</style>
