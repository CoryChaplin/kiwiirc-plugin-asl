<template>
    <div class="kiwi-userbox-mod-menu-wrap" :class="{ 'is-open': open }">
        <button
            ref="trigger"
            type="button"
            class="kiwi-userbox-mod-btn btn-cta"
            :aria-expanded="open ? 'true' : 'false'"
            @click="$emit('toggle')"
        >
            <i :class="'fa ' + icon" aria-hidden="true" />
            {{ label }}
            <i class="fa fa-caret-down kiwi-userbox-mod-caret" aria-hidden="true" />
        </button>
        <div v-if="open" ref="menu" class="kiwi-userbox-mod-menu">
            <div class="kiwi-userbox-mod-menu-input">
                <input
                    ref="reasonInput"
                    v-model="customReason"
                    type="text"
                    class="kiwi-userbox-mod-menu-field"
                    :placeholder="$t('plugin-asl:mod_reason_placeholder')"
                    :aria-label="$t('plugin-asl:mod_reason_placeholder')"
                    @keydown.enter.prevent="submitCustom"
                >
                <button
                    type="button"
                    class="kiwi-userbox-mod-menu-apply"
                    :title="$t('plugin-asl:mod_reason_apply')"
                    :aria-label="$t('plugin-asl:mod_reason_apply')"
                    @click="submitCustom"
                >
                    <i class="fa fa-check" aria-hidden="true" />
                </button>
            </div>
            <button
                v-for="item in reasonItems"
                :key="item.alias || item.reason"
                type="button"
                class="kiwi-userbox-mod-menu-item"
                @click="pick(item.reason)"
            >
                <span class="kiwi-userbox-mod-menu-item-text">{{ item.reason }}</span>
                <span
                    v-if="item.alias"
                    class="kiwi-userbox-mod-menu-item-alias"
                >{{ item.alias }}</span>
            </button>
        </div>
    </div>
</template>

<script>

export default {
    props: ['label', 'icon', 'reasons', 'open'],
    data: function data() {
        return {
            customReason: '',
        };
    },
    computed: {
        reasonItems() {
            return (this.reasons || []).map((item) => {
                if (item && typeof item === 'object') {
                    return {
                        alias: item.alias || '',
                        reason: item.reason || '',
                    };
                }
                return { alias: '', reason: String(item) };
            }).filter((item) => item.reason);
        },
    },
    watch: {
        open: function watchOpen(isOpen) {
            this.unbindPlace();
            if (!isOpen) {
                this.customReason = '';
                return;
            }
            this.customReason = '';
            this.$nextTick(() => {
                this.mountMenu();
                if (this.$refs.reasonInput) {
                    this.$refs.reasonInput.focus();
                }
            });
            this.bindPlace();
        },
    },
    beforeDestroy: function beforeDestroy() {
        this.unbindPlace();
        this.unmountMenu();
    },
    methods: {
        bindPlace: function bindPlace() {
            this.onPlace = () => this.placeMenu();
            window.addEventListener('resize', this.onPlace);
            window.addEventListener('scroll', this.onPlace, true);
        },
        unbindPlace: function unbindPlace() {
            if (!this.onPlace) {
                return;
            }
            window.removeEventListener('resize', this.onPlace);
            window.removeEventListener('scroll', this.onPlace, true);
            this.onPlace = null;
        },
        mountMenu: function mountMenu() {
            let menu = this.$refs.menu;
            if (!menu) {
                return;
            }
            // Leave the userbox (overflow + stacking) so the panel cannot push
            // the Ban / Kickban buttons and is not clipped.
            let host = document.querySelector('.kiwi-wrap') || document.body;
            host.appendChild(menu);
            this.placeMenu();
        },
        unmountMenu: function unmountMenu() {
            let menu = this.$refs.menu;
            if (menu && menu.parentNode) {
                menu.parentNode.removeChild(menu);
            }
        },
        placeMenu: function placeMenu() {
            let menu = this.$refs.menu;
            let btn = this.$refs.trigger;
            if (!menu || !btn) {
                return;
            }
            let rect = btn.getBoundingClientRect();
            let gap = 4;
            let width = rect.width;
            let left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
            let top = rect.bottom + gap;
            if (top + menu.offsetHeight > window.innerHeight - 8) {
                top = Math.max(8, rect.top - gap - menu.offsetHeight);
            }
            menu.style.top = top + 'px';
            menu.style.left = left + 'px';
            menu.style.width = width + 'px';
        },
        submitCustom: function submitCustom() {
            this.$emit('select', this.customReason.trim());
            this.customReason = '';
        },
        pick: function pick(reason) {
            this.$emit('select', reason);
            this.customReason = '';
        },
    },
};

</script>

<style lang="less">
.kiwi-userbox-mod-menu-wrap {
    position: relative;
}

.kiwi-userbox-mod-menu-wrap .kiwi-userbox-mod-btn {
    width: 100%;
}

.kiwi-userbox-mod-caret {
    margin-left: 0.15rem;
    font-size: 0.85em;
    transition: transform 0.15s ease;
}

.kiwi-userbox-mod-menu-wrap.is-open .kiwi-userbox-mod-caret {
    transform: rotate(180deg);
}

.kiwi-userbox-mod-menu {
    position: fixed;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    max-height: min(16rem, calc(100vh - 1rem));
    padding: 0.5rem;
    overflow-y: auto;
    border-radius: 0.75rem;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.45));
    box-shadow: 0 0.6rem 1.6rem rgba(0, 30, 60, 0.28);
    box-sizing: border-box;
}

.kiwi-userbox-mod-menu-input {
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

.kiwi-userbox-mod-menu-field {
    flex: 1;
    min-width: 0;
    height: 2.125rem;
    padding: 0 0.75rem;
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.45));
    border-radius: 6.1875rem;
    background-color: var(--color-bg-input, #fff);
    box-shadow: var(--shadow-input, none);
    color: var(--color-text-primary, #333);
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 700;
}

.kiwi-userbox-mod-menu-apply {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.125rem;
    height: 2.125rem;
    padding: 0;
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.45));
    border-radius: 50%;
    background: var(--color-surface, #fff);
    box-shadow: var(--shadow-raised, 0 0.0625rem 0.125rem rgba(8, 32, 60, 0.1));
    color: inherit;
    font-size: 0.75rem;
    cursor: pointer;
}

.kiwi-userbox-mod-menu-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    padding: 0.45rem 0.65rem;
    border: 0;
    border-radius: 0.5rem;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
}

.kiwi-userbox-mod-menu-item-text {
    min-width: 0;
    flex: 1;
}

.kiwi-userbox-mod-menu-item-alias {
    flex-shrink: 0;
    color: var(--color-text-faint, #9aa6b6);
    font-size: 0.6875rem;
    font-weight: 700;
}

.kiwi-userbox-mod-menu-item:hover,
.kiwi-userbox-mod-menu-item:focus-visible {
    background: var(--color-chip-bg, #e7f1fc);
}

.kiwi-userbox-mod-menu-field:focus-visible,
.kiwi-userbox-mod-menu-apply:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring, 0 0 0 0.1875rem rgba(139, 203, 249, 0.6));
}
</style>
