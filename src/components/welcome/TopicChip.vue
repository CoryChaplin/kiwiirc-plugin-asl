<template>
    <button type="button"
            :class="[
                'kiwi-asl-topic-chip',
                selected ? 'is-selected' : '',
                disabled ? 'is-disabled' : '',
                isHot ? 'is-hot' : '',
            ]"
            :aria-pressed="selected ? 'true' : 'false'"
            :aria-disabled="disabled ? 'true' : 'false'"
            :disabled="disabled"
            :title="disabledMessage || ''"
            @click="onClick"
    >
        <span class="kiwi-asl-topic-chip__label">{{ topic.label }}</span>
    </button>
</template>

<script>
export default {
    props: {
        topic: {
            type: Object,
            required: true,
        },
        selected: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        disabledMessage: {
            type: String,
            default: '',
        },
    },
    computed: {
        isHot() {
            return this.topic && this.topic.key === 'hot';
        },
    },
    methods: {
        onClick() {
            if (this.disabled) return;
            this.$emit('toggle', this.topic);
        },
    },
};
</script>

<style lang="less">
.kiwi-asl-topic-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 9999px;
    border: 1.5px solid #e8edf5;
    background: var(--ir-color-surface-chip, #f5f8fc);
    color: #555;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
    line-height: 1.4;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
    animation: kiwi-asl-chip-in 0.15s ease-out;

    &:hover:not(.is-disabled):not(.is-selected) {
        background: #ebf2fa;
        border-color: #bdd6ee;
        color: #444;
    }

    &:focus-visible {
        outline: 2px solid var(--ir-channel-border, #6baed6);
        outline-offset: 2px;
    }

    &.is-selected {
        background: var(--ir-topic-selected-bg, #e3f0fd);
        border-color: var(--ir-topic-selected-border, #6baed6);
        color: var(--ir-topic-selected-text, #1565c0);
        box-shadow: 0 1px 4px var(--ir-topic-selected-shadow, rgba(21, 101, 192, 0.15));
    }

    &.is-hot.is-selected {
        background: #fde8e6;
        border-color: #e07870;
        color: #c0392b;
        box-shadow: 0 1px 4px rgba(192, 57, 43, 0.15);
    }

    &.is-disabled {
        opacity: 0.38;
        cursor: not-allowed;
        pointer-events: none;
    }
}
</style>
