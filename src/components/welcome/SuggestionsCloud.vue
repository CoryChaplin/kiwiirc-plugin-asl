<template>
    <transition name="kiwi-asl-fade">
        <div v-if="hasAnySuggestion" class="kiwi-asl-cloud">
            <div v-if="label" class="kiwi-asl-cloud__label">{{ label }}</div>
            <div v-for="group in groupedSuggestions" :key="group.topicKey"
                 class="kiwi-asl-cloud__group"
            >
                <div v-if="showGroupLabels && group.topicLabel"
                     class="kiwi-asl-cloud__group-label"
                >
                    {{ group.topicLabel }}
                </div>
                <div class="kiwi-asl-cloud__chips">
                    <button v-for="channel in group.channels" :key="group.topicKey + channel"
                            type="button"
                            class="kiwi-asl-cloud__chip"
                            :title="$t('plugin-asl:suggestion_add', { channel })"
                            @click="onPick(channel)"
                    >
                        <span class="kiwi-asl-cloud__chip-add">+</span>{{ channel }}
                    </button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
export default {
    props: {
        // Active topics, in order of selection — drives which groups render.
        selectedTopics: {
            type: Array,
            default: () => [],
        },
        // Full topics array from formConfig (provides labels + static suggestions).
        topics: {
            type: Array,
            default: () => [],
        },
        // Server-provided suggestions: { topicKey: ['#chan', ...] }.
        // Takes precedence over the static `topics[].suggestions` when present.
        suggestions: {
            type: Object,
            default: () => ({}),
        },
        // Channels currently in "Mes salons" — already-selected ones get hidden.
        currentChannels: {
            type: Array,
            default: () => [],
        },
        // From the rules evaluator: channel name → blocked message ('' OK).
        blockedChannels: {
            type: Object,
            default: () => ({}),
        },
        removedTagCloudChannels: {
            type: Array,
            default: () => [],
        },
        label: {
            type: String,
            default: '',
        },
        showGroupLabels: {
            type: Boolean,
            default: true,
        },
    },
    computed: {
        topicsByKey() {
            let map = {};
            this.topics.forEach((t) => { map[t.key] = t; });
            return map;
        },
        groupedSuggestions() {
            let groups = [];
            this.selectedTopics.forEach((topicKey) => {
                let topic = this.topicsByKey[topicKey];
                let serverList = this.suggestions[topicKey];
                let staticList = topic && topic.suggestions ? topic.suggestions : [];
                let candidates = (serverList && serverList.length ? serverList : staticList) || [];
                let removedSet = new Set(
                    this.removedTagCloudChannels.map((c) => c.toLowerCase())
                );
                let filtered = candidates.filter((channel) => (
                    !this.currentChannels.includes(channel) &&
                    !(channel in this.blockedChannels) &&
                    !removedSet.has(channel.toLowerCase())
                ));
                if (filtered.length === 0) return;
                groups.push({
                    topicKey,
                    topicLabel: topic ? topic.label : topicKey,
                    channels: filtered,
                });
            });
            return groups;
        },
        hasAnySuggestion() {
            return this.groupedSuggestions.length > 0;
        },
    },
    methods: {
        onPick(channel) {
            this.$emit('pick', channel);
        },
    },
};
</script>

<style lang="less">
.kiwi-asl-cloud {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px;
    background: var(--ir-color-surface-alt, #f4f8ff);
    border: 1px solid var(--ir-border-field, #dde3ec);
    border-radius: 12px;
    margin: 4px 8px 0;
    box-shadow: 0 4px 10px rgba(21, 101, 192, 0.08);
    text-align: left;
}

.kiwi-asl-cloud__label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ir-color-topic-label, #5a8fb5);
}

.kiwi-asl-cloud__group + .kiwi-asl-cloud__group {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--ir-border-suggestion, rgba(107, 174, 214, 0.15));
}

.kiwi-asl-cloud__group-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--ir-color-topic-label, #5a8fb5);
    margin-bottom: 4px;
}

.kiwi-asl-cloud__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.kiwi-asl-cloud__chip {
    background: var(--ir-tagcloud-bg, #fff);
    border: 1px solid var(--ir-tagcloud-border, #c5d8f0);
    border-radius: 9999px;
    color: var(--ir-tagcloud-text, #4a7fa5);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    padding: 4px 10px 4px 7px;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    animation: kiwi-asl-chip-in 0.15s ease-out;

    &:hover {
        background: var(--ir-tagcloud-hover-bg, #e3f0fd);
        border-color: var(--ir-tagcloud-hover-border, #6baed6);
        color: var(--ir-tagcloud-hover-text, #1565c0);
    }

    &:focus-visible {
        outline: 2px solid var(--ir-channel-border, #6baed6);
        outline-offset: 2px;
    }
}

.kiwi-asl-cloud__chip-add {
    color: inherit;
    font-size: 11px;
    margin-right: 4px;
}

.kiwi-asl-fade-enter-active,
.kiwi-asl-fade-leave-active {
    transition: opacity 0.12s;
}

.kiwi-asl-fade-enter,
.kiwi-asl-fade-leave-to {
    opacity: 0;
}
</style>
