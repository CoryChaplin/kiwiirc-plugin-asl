<template>
    <div class="kiwi-asl-channels">
        <div v-if="label" class="kiwi-asl-channels__label">{{ label }}</div>
        <div class="kiwi-asl-channels__content">
            <span v-for="entry in channels" :key="entry.name"
                  :class="[
                      'kiwi-asl-channels__pill',
                      'is-source-' + entry.source,
                      isLocked(entry) ? 'is-locked' : '',
                  ]"
            >
                {{ entry.name }}
                <button v-if="!isLocked(entry)" type="button"
                        class="kiwi-asl-channels__remove"
                        :aria-label="$t('plugin-asl:channel_remove', { channel: entry.name })"
                        @click="onRemove(entry)"
                >
                    <i class="fa fa-times" aria-hidden="true"/>
                </button>
            </span>
            <span v-if="full" class="kiwi-asl-channels__full">
                {{ $t('plugin-asl:channels_full', { max: maxChannels }) }}
            </span>
            <span v-else ref="addWrapper" class="kiwi-asl-channels__add">
                <i class="fa fa-search kiwi-asl-channels__add-icon" aria-hidden="true"/>
                <input ref="input" v-model="inputValue" type="text"
                       :placeholder="$t('plugin-asl:channel_add_placeholder')"
                       class="kiwi-asl-channels__input"
                       :aria-expanded="showSuggest ? 'true' : 'false'"
                       aria-autocomplete="list"
                       aria-controls="kiwi-asl-suggest"
                       :aria-activedescendant="activeItem ? 'kiwi-asl-suggest-' + activeItem : ''"
                       @keydown="onKeyDown"
                       @paste="onPaste"
                       @blur="onBlur"
                       @focus="onFocus"
                       @input="onInput"
                >
                <ul v-if="showSuggest" id="kiwi-asl-suggest"
                    ref="suggest"
                    :class="['kiwi-asl-channels__suggest', suggestAbove ? 'is-above' : '']"
                    role="listbox"
                >
                    <template v-for="cat in filteredCategories">
                        <li :key="'cat-' + cat.label"
                            class="kiwi-asl-channels__suggest-cat"
                            role="presentation"
                        >
                            {{ cat.label }}
                        </li>
                        <li v-for="chan in cat.channels"
                            :id="'kiwi-asl-suggest-' + chan"
                            :key="chan"
                            :class="[
                                'kiwi-asl-channels__suggest-item',
                                activeItem === chan ? 'is-active' : ''
                            ]"
                            role="option"
                            :aria-selected="activeItem === chan ? 'true' : 'false'"
                            @mousedown.prevent="pickSuggest(chan)"
                        >
                            {{ chan }}
                        </li>
                    </template>
                    <li v-if="!hasItems" class="kiwi-asl-channels__suggest-empty" role="option">
                        {{ $t('plugin-asl:channel_empty') }}
                    </li>
                </ul>
            </span>
        </div>
    </div>
</template>

<script>
const ADD_KEYS = new Set(['Enter', ',', ';', ' ']);
const CHAN_RE = /^[A-Za-z0-9_\-&.[\]|~{}]{1,32}$/;

export default {
    props: {
        channels: {
            type: Array,
            default: () => [],
        },
        lockedChannels: {
            type: Array,
            default: () => [],
        },
        blockedChannels: {
            type: Object,
            default: () => ({}),
        },
        maxChannels: {
            type: Number,
            default: 8,
        },
        label: {
            type: String,
            default: '',
        },
        channelCategories: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            inputValue: '',
            showSuggest: false,
            activeItem: null,
            suggestAbove: false,
        };
    },
    computed: {
        full() {
            return this.channels.length >= this.maxChannels;
        },
        currentNames() {
            return new Set(this.channels.map((c) => c.name.toLowerCase()));
        },
        filteredCategories() {
            let q = this.inputValue.replace(/^#/, '').toLowerCase();
            let result = [];
            this.channelCategories.forEach((cat) => {
                let chans = cat.channels.filter((ch) => {
                    let lower = ch.toLowerCase();
                    return !this.currentNames.has(lower) &&
                        !(ch in this.blockedChannels) &&
                        (!q || lower.includes(q) || lower.includes('#' + q));
                });
                if (chans.length) result.push({ label: cat.label, channels: chans });
            });
            return result;
        },
        flatItems() {
            return this.filteredCategories.flatMap((c) => c.channels);
        },
        hasItems() {
            return this.flatItems.length > 0;
        },
    },
    mounted() {
        document.addEventListener('mousedown', this.onDocClick);
    },
    beforeDestroy() {
        document.removeEventListener('mousedown', this.onDocClick);
    },
    methods: {
        isLocked(entry) {
            return this.lockedChannels.includes(entry.name);
        },
        normalize(raw) {
            let trimmed = (raw || '').trim().replace(/[\s,;]+/g, '');
            if (!trimmed) return '';
            if (!trimmed.startsWith('#') && !trimmed.startsWith('&')) {
                trimmed = '#' + trimmed;
            }
            let name = trimmed.slice(1);
            if (!CHAN_RE.test(name)) return '';
            return trimmed;
        },
        positionSuggest() {
            if (!this.$refs.input) return;
            let rect = this.$refs.input.getBoundingClientRect();
            this.suggestAbove = (window.innerHeight - rect.bottom) < 260;
        },
        onFocus() {
            if (this.channelCategories.length > 0) {
                this.positionSuggest();
                this.showSuggest = true;
            }
        },
        onInput() {
            this.positionSuggest();
            this.showSuggest = this.channelCategories.length > 0;
            this.activeItem = null;
        },
        onKeyDown(event) {
            if (event.key === 'Backspace' && !this.inputValue && this.channels.length) {
                event.preventDefault();
                let last = this.channels[this.channels.length - 1];
                if (!this.isLocked(last)) this.$emit('remove', last);
                return;
            }
            if (this.showSuggest && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                event.preventDefault();
                let items = this.flatItems;
                if (!items.length) return;
                let idx = items.indexOf(this.activeItem);
                if (event.key === 'ArrowDown') {
                    this.activeItem = items[(idx + 1) % items.length];
                } else {
                    this.activeItem = items[(idx - 1 + items.length) % items.length];
                }
                return;
            }
            if (event.key === 'Escape') {
                this.showSuggest = false;
                this.suggestAbove = false;
                this.activeItem = null;
                return;
            }
            if (!ADD_KEYS.has(event.key)) return;
            event.preventDefault();
            if (this.activeItem) {
                this.pickSuggest(this.activeItem);
            } else {
                this.commitInput();
            }
        },
        onPaste(event) {
            event.preventDefault();
            let text = event.clipboardData ? event.clipboardData.getData('text') : '';
            text.split(/[\s,;]+/).forEach((part) => {
                let name = this.normalize(part);
                if (!name || name in this.blockedChannels || this.full) return;
                if (this.channels.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
                    return;
                }
                this.$emit('add', name);
            });
            this.inputValue = '';
            this.showSuggest = false;
        },
        onBlur() {
            if (this.inputValue.trim()) this.commitInput();
        },
        commitInput() {
            let name = this.normalize(this.inputValue);
            this.inputValue = '';
            this.showSuggest = false;
            this.suggestAbove = false;
            this.activeItem = null;
            if (!name) return;
            if (name in this.blockedChannels) return;
            if (this.full) return;
            if (this.channels.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
            this.$emit('add', name);
        },
        pickSuggest(chan) {
            this.inputValue = '';
            this.showSuggest = false;
            this.suggestAbove = false;
            this.activeItem = null;
            if (chan in this.blockedChannels || this.full) return;
            if (this.channels.some((c) => c.name.toLowerCase() === chan.toLowerCase())) return;
            this.$emit('add', chan);
            this.$nextTick(() => {
                if (this.$refs.input) this.$refs.input.focus();
            });
        },
        onRemove(entry) {
            if (this.isLocked(entry)) return;
            this.$emit('remove', entry);
        },
        onDocClick(e) {
            if (this.$refs.addWrapper && !this.$refs.addWrapper.contains(e.target)) {
                this.showSuggest = false;
            }
        },
    },
};
</script>

<style lang="less">
.kiwi-asl-channels {
    display: flex;
    flex-direction: column;
    transition: opacity 0.35s ease;
}

.kiwi-asl-channels__label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ir-color-text-muted, #767676);
    padding: 9px 12px 8px;
    border-bottom: 1px solid var(--ir-border-light, #eef0f3);
    text-align: left;
}

.kiwi-asl-channels__content {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 4px;
    align-items: center;
    padding: 12px 12px 8px;
    min-width: 0;
    position: relative;
}

.kiwi-asl-channels__pill {
    display: inline-flex;
    align-items: center;
    background: var(--ir-channel-bg, #dbeafe);
    border: 1.5px solid var(--ir-channel-border, #6baed6);
    border-radius: 9999px;
    color: var(--ir-channel-text, #1565c0);
    font-size: 12px;
    font-weight: 500;
    padding: 2px 8px;
    line-height: 1.4;
    white-space: nowrap;
    transition: background 0.12s, border-color 0.12s;
    animation: kiwi-asl-chip-in 0.15s ease-out;

    &:hover:not(.is-locked) {
        background: var(--ir-channel-bg-hover, #bfdbfe);
        border-color: var(--ir-channel-border-hover, #3b82f6);
    }

    &.is-locked {
        opacity: 0.85;
        cursor: default;
    }
}

.kiwi-asl-channels__remove {
    background: none;
    border: none;
    padding: 0;
    margin-left: 6px;
    cursor: pointer;
    color: inherit;
    display: inline-flex;
    align-items: center;
    line-height: 1;
    opacity: 0.45;
    transition: opacity 0.12s;
}

.kiwi-asl-channels__pill:hover .kiwi-asl-channels__remove {
    opacity: 1;
}

.kiwi-asl-channels__remove:focus-visible {
    outline: 2px solid var(--ir-channel-border, #6baed6);
    outline-offset: 1px;
    border-radius: 2px;
    opacity: 1;
}

.kiwi-asl-channels__full {
    font-size: 11px;
    color: var(--ir-color-text-surface-muted, #767676);
    font-style: italic;
}

.kiwi-asl-channels__add {
    display: flex;
    flex: 0 0 100%;
    align-items: center;
    position: relative;
    background: var(--ir-color-surface, #fff);
    border: 1px solid var(--ir-border-field, #dde3ec);
    border-radius: 8px;
    padding: 0 10px;
    height: 36px;
    margin-top: 4px;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:focus-within {
        border-color: var(--ir-focus-border, #93b9d8);
        box-shadow: 0 0 0 3px var(--ir-focus-shadow, rgba(107, 174, 214, 0.15));
    }
}

.kiwi-asl-channels__add-icon {
    color: var(--ir-color-text-muted, #b0bec5);
    font-size: 14px;
    margin-right: 10px;
    flex-shrink: 0;
}

.kiwi-asl-channels__input {
    border: none;
    outline: none;
    background: transparent;
    height: 100%;
    padding: 0;
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--ir-color-text, #333);

    &::placeholder {
        color: #aaa;
        font-weight: 400;
    }
}

/* Autocomplete dropdown — recopied from irception/static/css/form.css:493-557 */
.kiwi-asl-channels__suggest {
    background: var(--ir-color-surface, #fff);
    border: 1px solid var(--ir-suggest-border, #c5d8f0);
    border-radius: 8px;
    color: var(--ir-color-text, #333);
    font-size: 14px;
    text-align: left;
    max-height: 260px;
    min-width: 220px;
    max-width: 300px;
    overflow: auto;
    padding: 4px;
    position: absolute;
    top: 100%;
    bottom: auto;
    left: 0;
    right: auto;
    z-index: 10000;
    box-shadow: 0 4px 12px var(--ir-suggest-shadow, rgba(21, 101, 192, 0.12));
    box-sizing: border-box;
    margin: 0;
    list-style: none;

    &.is-above {
        top: auto;
        bottom: 100%;
    }
}

.kiwi-asl-channels__suggest-cat {
    padding: 12px 8px 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ir-color-text-surface-muted, #767676);
    cursor: default;
    pointer-events: none;

    &:first-child {
        padding-top: 4px;
    }
}

.kiwi-asl-channels__suggest-item {
    border-radius: 5px;
    padding: 5px 8px;
    color: var(--ir-color-text, #333);
    cursor: pointer;

    &:hover,
    &.is-active {
        background: var(--ir-suggest-item-hover-bg, #e3f0fd);
        color: var(--ir-suggest-item-hover-text, #1565c0);
    }
}

.kiwi-asl-channels__suggest-empty {
    display: block;
    padding: 8px;
    font-size: 12px;
    color: var(--ir-color-text-surface-muted, #767676);
    font-style: italic;
    text-align: center;
    cursor: default;
}
</style>
