<template>
    <div
        :class="[
            userMode ? 'kiwi-nicklist-user--mode-' + userMode : '',
            user.away ? 'kiwi-nicklist-user--away' : '',
            user.ignore ? 'kiwi-nicklist-user--ignore' : '',
        ]"
        :data-nick="(user.nick||'').toLowerCase()"
        class="kiwi-nicklist-user"
        @mouseover="toggleTooltip($event)"
        @mouseout="toggleTooltip($event)"
        @click="nicklist.openUserbox(user); toggleTooltip($event)"
    >
        <div v-if="shouldShowAvatars" class="kiwi-avatar-container">
            <UserAvatar
                v-if="user"
                :user="user"
                :network="network"
                size="small"
            />
            <AwayStatusIndicator
                :network="network"
                :user="user"
                :toggle="false"
            />
        </div>
        <div v-else>
            <AwayStatusIndicator
                :network="network"
                :user="user"
                :toggle="false"
            />
        </div>
        <span class="kiwi-nicklist-user-prefix">
            {{ nicklist.buffer.userModePrefix(user) }}
        </span><span
            :style="{ 'color': userColour }"
            :class="genderClass"
            class="kiwi-nicklist-user-nick"
        >{{ user.nick }}
        </span>
        <span class="kiwi-nicklist-messageuser" @click.stop="nicklist.openQuery(user)">
            <svg-icon icon="fa-solid fa-comment" />
        </span>
        <TypingStatusIndicator
            :user="user"
            :buffer="nicklist.buffer"
        />
    </div>
</template>

<script>

/* global kiwi:true */

import * as utils from '../libs/utils.js';
import { getSetting } from '../config.js';

let AwayStatusIndicator = kiwi.require('components/AwayStatusIndicator');
let TypingStatusIndicator = kiwi.require('components/TypingStatusIndicator');
let UserAvatar = kiwi.require('components/UserAvatar');
let TextFormatting = kiwi.require('helpers/TextFormatting');

// Replaces Kiwi's components/NicklistUser (see plugin.js), so it keeps the same props:
// network, user and nicklist (the parent Nicklist instance)
export default {
    components: {
        AwayStatusIndicator,
        TypingStatusIndicator,
        UserAvatar,
    },
    props: {
        network: Object,
        user: Object,
        nicklist: Object,
    },
    computed: {
        // Vue 3 Kiwi moved userMode()/userModePrefix() from the Nicklist to its buffer
        userMode() {
            return this.nicklist.buffer.userMode(this.user);
        },
        genderClass() {
            if (!getSetting('showGenderGlyph')) return '';
            return utils.getGenderClass(this.user.asl);
        },
        userColour() {
            if (this.nicklist.useColouredNicks) {
                return this.user.getColour();
            }
            return '';
        },
        shouldShowAvatars() {
            return this.nicklist.buffer.setting('nicklist_avatars');
        },
    },
    methods: {
        aslString(asl) {
            let parts = kiwi.state.getSetting('settings.plugin-asl.singleLineString');
            let out = [];
            if (asl.s) {
                let sex = asl.s[0] === '_' ?
                    TextFormatting.t('plugin-asl:' + asl.s.substr(1)) :
                    asl.s;
                out.push(parts.sex.replace('%s', sex));
                if (asl.a) out.push('<br>');
            }
            if (asl.a) {
                let ageTpl = parts.age[0] === '_' ?
                    TextFormatting.t('plugin-asl:' + parts.age.substr(1)) :
                    parts.age;
                out.push(ageTpl.replace('%a', asl.a));
            }
            if (asl.l) {
                out.push(parts.location.replace('%l', asl.l));
            }
            return out.join(parts.separator);
        },
        toggleTooltip(event) {
            let tooltip;

            if (this.user.asl === undefined) return;

            // Create parent div
            if (!document.querySelector('.kiwi-nicklist-user-tooltip')) {
                tooltip = document.createElement('div');
                tooltip.setAttribute('class', 'kiwi-nicklist-user-tooltip');
                document.querySelector('.kiwi-wrap').appendChild(tooltip);
            } else {
                tooltip = document.querySelector('.kiwi-nicklist-user-tooltip');
            }

            if (event.type === 'mouseover') {
                // Don't go below bottom of the screen
                let topOffset = (event.clientY + 150 > window.innerHeight) ?
                    window.innerHeight - 150 : event.clientY;

                tooltip.setAttribute('style', 'right:' +
                    document.querySelector('.kiwi-nicklist').offsetWidth +
                    'px; visibility: visible; opacity: 1; top: ' + topOffset + 'px;');
                tooltip.innerHTML += '<div class="kiwi-tooltipNick">' + this.user.nick +
                    '</div><div class="kiwi-tooltipInfo">' + this.aslString(this.user.asl) + '</div>';
            } else {
                tooltip.setAttribute('style', '');
                tooltip.innerHTML = '';
            }
        },
    },
};
</script>

<style>
.kiwi-nicklist-user {
    line-height: 26px;
    padding: 0 12px 0 12px;
    border-left: 4px solid;
    margin: 0 0 0 0;
    position: relative;
    box-sizing: border-box;
    transition: all 0.1s;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
}

.kiwi-nicklist--avatars .kiwi-nicklist-user {
    line-height: 32px;
    padding-bottom: 6px;
}

.kiwi-nicklist-user-nick {
    font-weight: bold;
    cursor: pointer;
    flex: 1;
}

.kiwi-nicklist-messageuser {
    position: absolute;
    right: -1em;
    line-height: 26px;
    opacity: 0;
}

.kiwi-nicklist-messageuser:hover {
    cursor: pointer;
    transition: all 0.2s;
}

.kiwi-nicklist-user:hover .kiwi-nicklist-messageuser {
    opacity: 1;
    right: 1em;
    transition: all 0.2s;
    transition-delay: 0.1s;
}

.kiwi-avatar-container {
    position: relative;
    margin-right: 10px;
    flex: 0;
}

.kiwi-avatar-container .kiwi-avatar {
    width: 30px;
    height: 30px;
}

.kiwi-avatar-container .kiwi-awaystatusindicator {
    position: absolute;
    top: 0;
    right: 0;
    margin: 0;
}

.kiwi-avatar-container-user-prefix {
    flex: 0;
}

.kiwi-nicklist-user-tooltip {
    visibility: hidden;
    opacity: 0;
    position: fixed;
    z-index: 10;
    background: #fff;
    padding: 1px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
    transition: opacity 0.3s;
    width: 200px;
    top: 0;
    -webkit-box-orient: vertical;
    -webkit-box-direction: normal;
    -ms-flex-direction: column;
    flex-direction: column;
}

.kiwi-tooltipNick {
    background-color: #eee;
    border-bottom: 1px solid #ebebeb;
    border-radius: 5px 5px 0 0;
    font-size: 14px;
    font-weight: 400;
    line-height: 18px;
    margin: 0;
    padding: 8px 14px;
    z-index: 1;
}

.kiwi-tooltipInfo {
    padding: 9px 14px;
}

.kiwi-nicklist-user:hover .kiwi-nicklist-user-tooltip {
    visibility: visible;
    opacity: 1;
}

/* The gender glyph after the nick is drawn by libs/icons.js */
</style>
