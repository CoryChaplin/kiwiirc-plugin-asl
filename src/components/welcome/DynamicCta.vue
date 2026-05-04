<template>
    <button :type="type"
            :disabled="!ready || pending"
            :class="[
                'kiwi-asl-cta',
                ready && !pending ? 'is-ready' : 'is-not-ready',
                pending ? 'is-pending' : '',
            ]"
            @click="onClick"
    >
        <i v-if="pending" class="fa fa-spin fa-spinner kiwi-asl-cta__spinner"/>
        <span class="kiwi-asl-cta__label">{{ label }}</span>
        <span v-if="ready && count > 0 && !pending" class="kiwi-asl-cta__count">
            ({{ countLabel }})
        </span>
        <i v-if="!pending" class="fa fa-arrow-right kiwi-asl-cta__arrow" aria-hidden="true"/>
    </button>
</template>

<script>
export default {
    props: {
        ready: {
            type: Boolean,
            default: false,
        },
        count: {
            type: Number,
            default: 0,
        },
        pending: {
            type: Boolean,
            default: false,
        },
        label: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            default: 'submit',
        },
    },
    computed: {
        // Kiwi's i18n exposes $t but not $tc; pluralise manually with two
        // explicit keys instead of vue-i18n's choice format.
        countLabel() {
            let key = this.count === 1
                ? 'plugin-asl:cta_channel_count_one'
                : 'plugin-asl:cta_channel_count_many';
            return this.$t(key, { count: this.count });
        },
    },
    methods: {
        onClick(event) {
            if (!this.ready || this.pending) return;
            this.$emit('submit', event);
        },
    },
};
</script>

<style lang="less">
.kiwi-asl-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 52px;
    padding: 0 22px;
    border: none;
    border-radius: 9999px;
    background: var(--brand-cta-bg, #8bcbf9);
    color: var(--brand-cta-fg, #004b87);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.015em;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
    box-shadow: 0 4px 16px rgba(21, 101, 192, 0.18);

    &:hover:not(:disabled) {
        background: var(--brand-cta-bg-hover, #6ebbf2);
        box-shadow: 0 6px 22px rgba(21, 101, 192, 0.22);
    }

    &:active:not(:disabled) {
        transform: translateY(1px);
        box-shadow: 0 2px 8px rgba(21, 101, 192, 0.18);
    }

    &.is-not-ready,
    &:disabled {
        opacity: 0.45;
        box-shadow: none;
        cursor: not-allowed;
    }

    &.is-pending {
        cursor: wait;
        opacity: 0.7;
    }

    &:focus-visible {
        outline: 2px solid var(--brand-cta-fg, #004b87);
        outline-offset: 3px;
    }
}

.kiwi-asl-cta__spinner {
    margin-right: 4px;
}

.kiwi-asl-cta__count {
    font-size: 13px;
    font-weight: 400;
    opacity: 0.72;
}

.kiwi-asl-cta__arrow {
    font-size: 14px;
    opacity: 0.85;
    transition: transform 0.2s;
}

.kiwi-asl-cta:hover:not(:disabled) .kiwi-asl-cta__arrow {
    transform: translateX(4px);
}
</style>
