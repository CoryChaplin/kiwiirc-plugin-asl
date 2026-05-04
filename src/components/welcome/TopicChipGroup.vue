<template>
    <div class="kiwi-asl-topic-group">
        <div v-if="label" class="kiwi-asl-topic-group__label">{{ label }}</div>
        <div class="kiwi-asl-topic-group__grid">
            <topic-chip v-for="topic in visibleTopics" :key="topic.key"
                        :topic="topic"
                        :selected="selectedTopics.includes(topic.key)"
                        :disabled="!!disabledTopics[topic.key]"
                        :disabled-message="disabledTopics[topic.key] || ''"
                        @toggle="onToggle"
            />
        </div>
    </div>
</template>

<script>
import TopicChip from './TopicChip.vue';

export default {
    components: { TopicChip },
    props: {
        topics: {
            type: Array,
            default: () => [],
        },
        selectedTopics: {
            type: Array,
            default: () => [],
        },
        hiddenTopics: {
            type: Object,
            default: () => ({}),
        },
        disabledTopics: {
            type: Object,
            default: () => ({}),
        },
        label: {
            type: String,
            default: '',
        },
    },
    computed: {
        visibleTopics() {
            return this.topics.filter((t) => !this.hiddenTopics[t.key]);
        },
    },
    methods: {
        onToggle(topic) {
            this.$emit('toggle', topic);
        },
    },
};
</script>

<style lang="less">
.kiwi-asl-topic-group {
    display: flex;
    flex-direction: column;
}

.kiwi-asl-topic-group__label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ir-color-text-muted, #767676);
    padding: 9px 12px 8px;
    border-bottom: 1px solid var(--ir-border-light, #eef0f3);
    text-align: left;
}

.kiwi-asl-topic-group__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 6px;
    padding: 6px;
}
</style>
