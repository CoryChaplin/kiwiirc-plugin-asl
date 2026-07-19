<template>
    <div class="kiwi-userbox">
        <span v-if="isSelf" class="kiwi-userbox-selfprofile">
            {{ $t('user_you') }}
        </span>
        <div class="kiwi-userbox-header">
            <div class="kiwi-userbox-avatar">
                <user-avatar
                    :user="user"
                    :network="network"
                    size="large"
                    :force-show-status="true"
                />
            </div>
            <div class="kiwi-userbox-userinfo">
                <span
                    class="kiwi-userbox-nick"
                    :class="genderClass"
                    :style="{ color: user.getColour() }"
                >{{ user.nick }}</span>
                <span class="kiwi-userbox-usermask">{{ user.username }}@{{ user.host }}</span>
            </div>
        </div>

        <div class="kiwi-userbox-basicinfo">
            <!-- A/S/L — pictos label each fact. One line (·) or one row per fact (setting). -->
            <div
                v-if="aslParts.length"
                class="kiwi-userbox-asl"
                :class="{ 'kiwi-userbox-asl--multi': !singleLine }"
            >
                <template v-for="(part, i) in aslParts">
                    <span
                        v-if="i > 0 && singleLine"
                        :key="'s' + i"
                        class="kiwi-userbox-asl-sep"
                    >·</span>
                    <span :key="i" class="kiwi-userbox-asl-item">
                        <i :class="'fa ' + part.icon" aria-hidden="true" />
                        {{ part.value }}
                    </span>
                </template>
            </div>

            <!-- realname under a human label — fallback / complement to A/S/L -->
            <div v-if="user.aslRealname" class="kiwi-userbox-bio">
                <span class="kiwi-userbox-label">{{ $t('plugin-asl:presentation') }}</span>
                <span class="kiwi-userbox-bio-text" v-html="formattedRealname" />
            </div>
            <div v-else-if="!aslParts.length" class="kiwi-userbox-asl kiwi-userbox-asl--empty">
                {{ $t('plugin-asl:profile_empty') }}
            </div>

            <!-- status badges — known without a whois (whoFlags + away) -->
            <div v-if="statusFlags.length" class="kiwi-userbox-flags">
                <span
                    v-for="flag in statusFlags"
                    :key="flag.type"
                    class="kiwi-userbox-flag"
                    :class="'kiwi-userbox-flag--' + flag.type"
                >
                    <i :class="'fa ' + flag.icon" aria-hidden="true" />
                    {{ $t('plugin-asl:' + flag.label) }}
                </span>
            </div>

            <!-- channels in common — sober label + hero chips -->
            <div v-if="commonChannels.length" class="kiwi-userbox-common">
                <span class="kiwi-userbox-label">{{ $t('plugin-asl:common_channels') }}</span>
                <span
                    class="kiwi-userbox-common-list"
                    @click="onChannelsClick($event)"
                    v-html="linkifyCommonChannels"
                />
            </div>
        </div>

        <div class="kiwi-userbox-actions">
            <button
                v-if="!isSelf && !buffer.isQuery()"
                type="button"
                class="kiwi-userbox-action-btn btn-cta"
                @click="openQuery"
            >
                <i class="fa fa-comment-o" aria-hidden="true" />
                {{ $t('plugin-asl:pm_action') }}
            </button>
            <button
                v-if="!whoisRequested"
                type="button"
                class="kiwi-userbox-action-btn"
                @click="updateWhoisData"
            >
                <i class="fa fa-question-circle" aria-hidden="true" />
                {{ $t('more_information') }}
            </button>
        </div>
        <div class="kiwi-userbox-actions kiwi-userbox-plugin-actions">
            <div
                v-for="plugin in pluginUiButtonElements"
                :key="plugin.id"
                v-rawElement="{
                    el: plugin.el,
                    props: {
                        kiwi: {
                            user: user,
                            userbox: self,
                        }
                    }
                }"
            />
        </div>

        <div
            v-if="whoisRequested"
            :class="[whoisLoading?'kiwi-userbox-whois--loading':'']"
            class="kiwi-userbox-whois kiwi-userbox-details"
        >
            <template v-if="whoisLoading">
                <i class="fa fa-spinner" aria-hidden="true" />
            </template>
            <template v-else>
                <!-- away only (offline is the presence dot's job, not an away message) -->
                <div v-if="user.isAway()" class="kiwi-userbox-det-row">
                    <i class="fa fa-moon-o" aria-hidden="true" />
                    <span>{{ user.away }}</span>
                </div>

                <!-- registered account name (badge shows the status; mods need the name) -->
                <div v-if="user.account" class="kiwi-userbox-det-block">
                    <span class="kiwi-userbox-label">{{ $t('plugin-asl:whois_account') }}</span>
                    <div class="kiwi-userbox-det-row">
                        <i class="fa fa-id-card-o" aria-hidden="true" />
                        <span class="kiwi-userbox-det-val">{{ user.account }}</span>
                    </div>
                </div>

                <!-- realname fallback when there was no join-time data (e.g. PM-only user) -->
                <div
                    v-if="user.realname && !user.aslRealname && !aslParts.length"
                    class="kiwi-userbox-det-block"
                >
                    <span class="kiwi-userbox-label">{{ $t('plugin-asl:presentation') }}</span>
                    <span class="kiwi-userbox-bio-text">{{ user.realname }}</span>
                </div>

                <!-- network helper (helpop) — whois-only -->
                <div v-if="user.whois.helpop" class="kiwi-userbox-det-row">
                    <i class="fa fa-life-ring" aria-hidden="true" />
                    <span>{{ $t('plugin-asl:whois_assistance') }}</span>
                </div>

                <!-- connection: server + secure -->
                <div
                    v-if="user.whois.server || user.whois.secure"
                    class="kiwi-userbox-det-block"
                >
                    <span class="kiwi-userbox-label">{{ $t('plugin-asl:whois_connection') }}</span>
                    <div v-if="user.whois.server" class="kiwi-userbox-det-row">
                        <i class="fa fa-server" aria-hidden="true" />
                        <span class="kiwi-userbox-det-val">{{ serverLabel }}</span>
                    </div>
                    <div
                        v-if="user.whois.secure"
                        class="kiwi-userbox-det-row kiwi-userbox-det-row--secure"
                    >
                        <i class="fa fa-lock" aria-hidden="true" />
                        <span>{{ $t('plugin-asl:whois_secure') }}</span>
                    </div>
                </div>

                <!-- their channels — full list, common ones highlighted -->
                <div v-if="allChannels.length" class="kiwi-userbox-det-block">
                    <span class="kiwi-userbox-label">
                        {{ $t('plugin-asl:whois_channels_all') }}
                    </span>
                    <span class="kiwi-userbox-channels-list" @click="onChannelsClick($event)">
                        <a
                            v-for="ch in allChannels"
                            :key="ch.name"
                            class="kiwi-channel"
                            :class="{ 'kiwi-channel--common': ch.common }"
                            :data-channel-name="ch.name"
                        >{{ ch.name }}</a>
                    </span>
                </div>
            </template>
        </div>

        <div v-if="buffer.isChannel() && areWeAnOp && !isSelf" class="kiwi-userbox-mod">
            <div class="kiwi-userbox-mod-head">
                <i class="fa fa-gavel" aria-hidden="true" />
                {{ $t('plugin-asl:mod_title') }}
            </div>
            <label v-if="isUserOnBuffer" class="kiwi-userbox-mod-field">
                <span class="kiwi-userbox-mod-lbl">{{ $t('user_access') }}</span>
                <select v-model="userMode" class="kiwi-userbox-mod-select">
                    <option
                        v-for="mode in availableChannelModes"
                        :key="mode.mode"
                        :value="mode.mode"
                    >
                        {{ mode.description }}
                    </option>
                    <option value="">{{ $t('user_normal') }}</option>
                </select>
            </label>
            <div class="kiwi-userbox-mod-sanctions">
                <button
                    v-if="isUserOnBuffer"
                    type="button"
                    class="kiwi-userbox-mod-btn btn-cta"
                    @click="kickUser"
                >
                    <i class="fa fa-sign-out" aria-hidden="true" />
                    {{ $t('user_kick') }}
                </button>
                <button
                    type="button"
                    class="kiwi-userbox-mod-btn btn-cta"
                    @click="banUser"
                >
                    <i class="fa fa-ban" aria-hidden="true" />
                    {{ $t('user_ban') }}
                </button>
                <button
                    v-if="isUserOnBuffer"
                    type="button"
                    class="kiwi-userbox-mod-btn btn-cta"
                    @click="kickbanUser"
                >
                    <i class="fa fa-exclamation-triangle" aria-hidden="true" />
                    {{ $t('user_kickban') }}
                </button>
            </div>
        </div>
        <div v-if="!isSelf" class="kiwi-userbox-protect">
            <div class="kiwi-userbox-protect-head">
                <i class="fa fa-shield" aria-hidden="true" />
                {{ $t('plugin-asl:protect_title') }}
            </div>
            <p class="kiwi-userbox-protect-text">
                {{ $t('plugin-asl:protect_intro', { nick: user.nick }) }}
            </p>
            <div class="kiwi-userbox-protect-actions">
                <button
                    type="button"
                    class="kiwi-userbox-protect-btn is-block"
                    :class="{ 'is-on': user.ignore }"
                    @click="onBlockClick"
                >
                    <i class="fa" :class="user.ignore ? 'fa-eye' : 'fa-ban'" aria-hidden="true" />
                    {{ user.ignore ? $t('plugin-asl:unblock') : $t('plugin-asl:block') }}
                </button>
                <!-- report only in a private chat: in a channel there's no specific
                     message to attach and no conversation to report — the per-message
                     bar handles reporting a channel message instead -->
                <button
                    v-if="buffer.isQuery()"
                    type="button"
                    class="kiwi-userbox-protect-btn is-report"
                    :disabled="reportOnCooldown"
                    :title="reportOnCooldown ? reportCooldownHint : null"
                    @click="toggleReportUser"
                >
                    <i class="fa fa-flag" aria-hidden="true" />
                    {{ $t('plugin-asl:report_action') }}
                </button>
            </div>
            <div
                v-if="buffer.isQuery()"
                class="kiwi-userbox-protect-hint"
                v-html="$t('plugin-asl:protect_hint')"
            />
        </div>
    </div>
</template>

<script>

/* global kiwi:true */

import * as ipRegex from 'ip-regex';
import * as config from '../config.js';
import * as utils from '../libs/utils.js';
import * as reportCooldown from '../libs/reportCooldown.js';

let TextFormatting = kiwi.require('helpers/TextFormatting');
let IrcdDiffs = kiwi.require('helpers/IrcdDiffs');
let GlobalApi = kiwi.require('libs/GlobalApi');
let toHtml = kiwi.require('libs/renderers/Html');
let parseMessage = kiwi.require('libs/MessageParser');
let UserAvatar = kiwi.require('components/UserAvatar');

export default {
    components: {
        UserAvatar,
    },
    props: ['buffer', 'network', 'user'],
    data: function data() {
        return {
            self: this,
            whoisRequested: false,
            whoisLoading: false,
            pluginUiButtonElements: GlobalApi.singleton().userboxButtonPlugins,
        };
    },
    computed: {
        // A report on this nick just went out — hold the button (reactive: the shared
        // store drops the entry when the cooldown expires)
        reportOnCooldown() {
            return reportCooldown.isActive(this.network, this.user.nick);
        },
        reportCooldownHint() {
            return TextFormatting.t('plugin-asl:report_cooldown_hint', {
                minutes: reportCooldown.minutesLeft(this.network, this.user.nick),
            });
        },
        // A/S/L layout: true = one line (pictos separated by ·), false = one row per fact.
        singleLine() {
            return config.getSetting('singleLineUserbox');
        },
        // Gender = glyph shape after the nick (identity = colour, gender = form).
        // Bare "other" (no age/location) counts as not declared → no glyph (see utils).
        genderClass() {
            return utils.getGenderClass(this.user.asl);
        },
        // Human-readable sex label (canonical _m/_f/… via locale, else the raw value).
        sexLabel() {
            let s = this.user.asl && this.user.asl.s;
            if (!s) {
                return '';
            }
            return s[0] === '_' ? TextFormatting.t('plugin-asl:' + s.substr(1)) : s;
        },
        // A/S/L rendered as ONE line, each present fact prefixed by its FA4 picto.
        aslParts() {
            let asl = this.user.asl;
            if (!asl) {
                return [];
            }
            let parts = [];
            if (asl.a) {
                parts.push({ icon: 'fa-birthday-cake', value: asl.a });
            }
            // skip a bare "other" (no glyph) — it means gender was not really declared
            if (asl.s && this.genderClass) {
                parts.push({ icon: 'fa-venus-mars', value: this.sexLabel });
            }
            if (asl.l) {
                parts.push({ icon: 'fa-map-marker', value: asl.l });
            }
            return parts;
        },
        serverLabel() {
            let w = this.user.whois;
            return w.server + (w.server_info ? ' (' + w.server_info + ')' : '');
        },
        // Status badges known WITHOUT a whois: WHOX whoFlags (registered/operator/bot) + away.
        // whoFlags props are non-enumerable/non-reactive → we read hasWhoFlags to anchor reactivity
        // (it flips true when the WHO reply lands). Moderator is prepended separately.
        statusFlags() {
            let user = this.user;
            let ready = user.hasWhoFlags;
            let wf = user.whoFlags || {};
            let flags = [];
            if (this.isModerator) {
                flags.push({ type: 'mod', icon: 'fa-shield', label: 'flag_moderator' });
            }
            if (ready && wf.operator) {
                flags.push({ type: 'op', icon: 'fa-shield', label: 'flag_netop' });
            }
            if ((ready && wf.registered) || user.account) {
                flags.push({ type: 'reg', icon: 'fa-check-circle', label: 'flag_registered' });
            }
            if (ready && wf.bot) {
                flags.push({ type: 'bot', icon: 'fa-android', label: 'flag_robot' });
            }
            if (user.isAway()) {
                flags.push({ type: 'away', icon: 'fa-moon-o', label: 'flag_away' });
            }
            return flags;
        },
        // Whois « Ses salons » : full channel list, common ones flagged for the hero chip.
        allChannels() {
            let opts = this.network.ircClient.network.options;
            let parsed = utils.parseWhoisChannels(this.user.whois.channels, opts && opts.CHANTYPES);
            let commonSet = new Set(this.commonChannels.map((c) => c.toLowerCase()));
            return parsed.map((ch) => ({
                name: ch.name,
                common: commonSet.has(ch.name.toLowerCase()),
            }));
        },
        // Moderator = op or higher (not voice) of an official channel. Derived, not a server flag.
        // (a) pre-whois: op-or-higher in a shared official channel (BufferState.isUserAnOp counts
        // Y/y/q/a/o/h) ; (b) post-whois: an op-or-higher prefix (~ & @ %) on an official channel.
        // No official list → never derived (no false positive).
        isModerator() {
            let official = this.$state.pluginASL && this.$state.pluginASL.officialChannels;
            if (!official || !official.size) {
                return false;
            }
            // read the reactive whois flag so branch (b) re-evaluates when whois data lands
            let hasWhois = this.user.hasWhois;

            let netBuffers = this.network.buffers || [];
            for (let bi = 0; bi < netBuffers.length; bi++) {
                let buf = netBuffers[bi];
                if (!buf || !buf.name || !buf.isChannel()) {
                    continue;
                }
                if (official.has(utils.normalizeChannelName(buf.name)) &&
                    buf.isUserAnOp(this.user.nick)) {
                    return true;
                }
            }

            if (hasWhois && this.user.whois.channels) {
                let opts = this.network.ircClient.network.options;
                let chantypes = opts && opts.CHANTYPES;
                let parsed = utils.parseWhoisChannels(this.user.whois.channels, chantypes);
                for (let pi = 0; pi < parsed.length; pi++) {
                    let ch = parsed[pi];
                    if (official.has(utils.normalizeChannelName(ch.name)) &&
                        /[~&@%]/.test(ch.prefix)) {
                        return true;
                    }
                }
            }
            return false;
        },
        // Channel modes differ on some IRCds so get them from the network options
        availableChannelModes: function availableChannelModes() {
            let availableModes = [];
            let prefixes = this.network.ircClient.network.options.PREFIX;
            let knownPrefix = {
                q: 'Owner',
                a: 'Admin',
                o: 'Operator',
                h: 'Half-Operator',
                v: 'Voice',
            };

            prefixes.forEach((prefix) => {
                let mode = prefix.mode;
                if (knownPrefix[mode]) {
                    availableModes.push({
                        mode: mode,
                        description: knownPrefix[mode],
                    });
                }
            });

            return availableModes;
        },
        areWeAnOp: function areWeAnOp() {
            if (!this.buffer) {
                return false;
            }

            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
        formattedRealname() {
            let blocks = parseMessage(this.user.aslRealname || '', { extras: false });
            let content = toHtml(blocks, false);
            return content;
        },
        isUserOnBuffer: function isUserOnBuffer() {
            if (!this.buffer) {
                return false;
            }

            if (!this.user.buffers[this.buffer.id]) {
                // Probably switched buffer while the userbox was open
                return false;
            }

            return true;
        },
        userMode: {
            get: function getUserMode() {
                if (!this.buffer) {
                    return '';
                }

                let userBufferInfo = this.user.buffers[this.buffer.id];
                if (!userBufferInfo) {
                    // Probably switched buffer while the userbox was open
                    return '';
                }

                let modes = userBufferInfo.modes;
                return modes.length > 0 ?
                    modes[0] :
                    '';
            },
            // Switch the current user mode for the new one
            set: function setUserMode(newVal) {
                let client = this.network.ircClient;
                let oldVal = this.userMode;

                let changes = [];
                let targets = [];

                if (oldVal) {
                    changes.push('-' + oldVal);
                    targets.push(this.user.nick);
                }
                if (newVal) {
                    changes.push('+' + newVal);
                    targets.push(this.user.nick);
                }

                let params = ['MODE', this.buffer.name, changes.join('')].concat(targets);
                client.raw(params);
            },
        },
        commonChannels: function commonChannels() {
            let networkId = kiwi.state.getActiveNetwork().id;
            return utils.commonChannels(networkId, this.user.nick);
        },
        linkifyCommonChannels: function linkifyCommonChannels() {
            let channels = [];
            this.commonChannels.forEach((channel) => {
                channels.push(TextFormatting.linkifyChannels(channel));
            });
            return channels.join(' ');
        },
        isSelf() {
            return this.user === this.network.currentUser();
        },
    },
    watch: {
        user: function watchUser() {
            // Reset the whois view since the user is now different
            this.whoisRequested = false;
            this.whoisLoading = false;
        },
    },
    methods: {
        userModeOnThisBuffer: function userModeOnBuffer(user) {
            if (!this.buffer) {
                return '';
            }

            let userBufferInfo = user.buffers[this.buffer.id];
            let modes = userBufferInfo.modes;
            return modes.length > 0 ?
                modes[0] :
                '';
        },
        openQuery: function openQuery() {
            let buffer = this.$state.addBuffer(this.network.id, this.user.nick);
            this.$state.setActiveBuffer(this.network.id, buffer.name);
            if (this.$state.ui.is_narrow) {
                this.$state.$emit('userbox.hide');
            }
        },
        onChannelsClick(event) {
            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName) {
                let network = this.buffer.getNetwork();
                this.$state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
                this.$state.setActiveBuffer(network.id, channelName);
            }
        },
        updateWhoisData: function updateWhoisData() {
            this.whoisRequested = true;
            this.whoisLoading = true;
            this.network.ircClient.whois(this.user.nick, () => {
                this.whoisLoading = false;
            });
        },
        // Signaler depuis la fiche → délègue au host partagé (modale + log + toast)
        toggleReportUser: function toggleReportUser() {
            this.$state.$emit('asl.protect.report', {
                network: this.network,
                buffer: this.buffer,
                user: this.user,
                trigger: document.activeElement,
            });
        },
        kickUser: function kickUser() {
            let reason = this.$state.setting('buffers.default_kick_reason');
            this.network.ircClient.raw('KICK', this.buffer.name, this.user.nick, reason);
        },
        createBanMask: function createBanMask() {
            // try to ban via user account first
            if (this.user.account) {
                // if EXTBAN is supported use that
                let extban = IrcdDiffs.extbanAccount(this.network);
                if (extban) {
                    return extban + ':' + this.user.account;
                }

                // if the account name is in the host ban the host
                // Eg. user@network/user/accountname
                if (this.user.host.toLowerCase().indexOf(this.user.account.toLowerCase()) > -1) {
                    return '*!*@' + this.user.host;
                }
            }

            // if an ip address is in the host and not the whole host ban the ip
            // Eg. user@gateway/1.2.3.4
            let ipTest = new RegExp('(' + ipRegex.v4().source + '|' + ipRegex.v6().source + ')');
            if (ipTest.test(this.user.host)) {
                let match = this.user.host.match(ipTest)[0];
                if (match !== this.user.host) {
                    return '*!*@*' + match + '*';
                }
            }

            // if an 8 char hex is the username ban by username. Commonly used in gateways
            // Eg. 59d4c432@a.clients.kiwiirc.com
            let hexTest = /^([a-f0-9]{8})$/i;
            if (hexTest.test(this.user.username)) {
                let match = this.user.username.match(hexTest)[0];
                return '*!' + match + '@*';
            }

            // fallback to default_ban_mask from config
            let mask = this.$state.setting('buffers.default_ban_mask');
            mask = mask.replace('%n', this.user.nick);
            mask = mask.replace('%i', this.user.username);
            mask = mask.replace('%h', this.user.host);

            return mask;
        },
        banUser: function banUser() {
            if (!this.user.username || !this.user.host) {
                return;
            }

            let banMask = this.createBanMask();
            this.network.ircClient.raw('MODE', this.buffer.name, '+b', banMask);
        },
        kickbanUser: function kickbanuser() {
            if (!this.user.username || !this.user.host) {
                return;
            }

            let banMask = this.createBanMask();
            let reason = this.$state.setting('buffers.default_kick_reason');
            this.network.ircClient.raw('MODE', this.buffer.name, '+b', banMask);
            this.network.ircClient.raw('KICK', this.buffer.name, this.user.nick, reason);
        },
        // Bloquer depuis la fiche → délègue au host partagé (toggle + toast réversible)
        onBlockClick: function onBlockClick() {
            this.$state.$emit('asl.protect.block', {
                network: this.network,
                user: this.user,
            });
        },
    },
};
</script>

<style lang="less">
.kiwi-sidebar.kiwi-sidebar-section-user {
    right: 0;
    width: 380px;
}

.kiwi-userbox {
    box-sizing: border-box;
    overflow-y: auto;
    height: 100%;
}

/* « C'est toi » pill (.prof-self) — tokens with neutral fallbacks for any theme. */
.kiwi-userbox-selfprofile {
    display: block;
    margin: 0 0 0.75rem;
    padding: 0.25rem 0;
    text-align: center;
    border-radius: var(--radius-pill, 9999px);
    background: var(--color-chip-bg-hero, #cde9fc);
    color: var(--color-accent, #004b87);
    font-size: var(--text-xs, 0.6875rem);
    font-weight: var(--weight-extrabold, 800);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-sizing: border-box;
}

/* identity row: avatar (identity disc + initials fallback / image later) | nick + mask */
.kiwi-userbox-header {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 1rem 1rem 0.6rem;
    box-sizing: border-box;
}

.kiwi-userbox-avatar {
    position: relative;
    width: 3.25rem;
    height: 3.25rem;
    flex-shrink: 0;
    margin: 0;
}

.kiwi-userbox-avatar .kiwi-avatar {
    display: block;
    width: 100%;
    height: 100%;
}

.kiwi-userbox-userinfo {
    box-sizing: border-box;
    min-width: 0;
    flex: 1;
    margin: 0;
}

/* inline (not inline-flex) so a long nick + its gender glyph wrap together as text;
   overflow-wrap:anywhere breaks unbroken tokens (___SadiqueDominant) cleanly at the edge. */
.kiwi-userbox-nick {
    display: inline;
    font-weight: var(--weight-extrabold, 800);
    font-size: 1.1rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
    word-break: break-word;
}

/* gender glyph after the nick (identity = colour, gender = form). FA4 (KiwiIRC):
   venus \f221 · mars \f222 · transgender \f224. No glyph when ASL sex is absent. */
.kiwi-userbox-nick.g-f::after,
.kiwi-userbox-nick.g-m::after,
.kiwi-userbox-nick.g-u::after {
    /* stylelint-disable-next-line font-family-no-missing-generic-family-keyword */
    font-family: 'FontAwesome';
    font-size: 0.72em;
    opacity: 0.85;
    margin-left: 0.32rem;
}

.kiwi-userbox-nick.g-f::after { content: '\f221'; }
.kiwi-userbox-nick.g-m::after { content: '\f222'; }
.kiwi-userbox-nick.g-u::after { content: '\f224'; }

/* username@host — IRC plumbing: kept but quiet (faint, small, under the nick) */
.kiwi-userbox-usermask {
    display: block;
    margin: 0.2rem 0 0;
    font-size: var(--text-xs, 0.6875rem);
    color: var(--color-text-faint, #9aa6b6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* .kiwi-userbox prefix beats the base.css basicinfo hairline (DS: no hard lines) */
.kiwi-userbox .kiwi-userbox-basicinfo {
    width: 100%;
    margin: 0;
    padding: 0 1rem 0.85rem;
    box-sizing: border-box;
    border: 0;
}

/* sober section micro-label (.prof-h) : « Présentation », « Salons en commun » */
.kiwi-userbox-label {
    display: block;
    margin: 0 0 0.35rem;
    font-size: var(--text-2xs, 0.625rem);
    font-weight: var(--weight-extrabold, 800);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-faint, #9aa6b6);
}

/* A/S/L on ONE line — each fact prefixed by its picto (quiet, faint) */
.kiwi-userbox-asl {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.15rem;
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--weight-medium, 600);
    color: var(--color-text-secondary, #56616f);
}

/* one row per fact (singleLineUserbox = false) */
.kiwi-userbox-asl--multi {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
}

.kiwi-userbox-asl-item {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
}

.kiwi-userbox-asl-item i {
    font-size: 0.85em;
    color: var(--color-text-faint, #9aa6b6);
}

.kiwi-userbox-asl-sep {
    margin: 0 0.3rem;
    color: var(--color-text-faint, #9aa6b6);
}

.kiwi-userbox-asl--empty {
    font-style: italic;
    font-weight: var(--weight-regular, 400);
    color: var(--color-text-faint, #9aa6b6);
}

/* realname under « Présentation » */
.kiwi-userbox-bio {
    margin-top: 0.75rem;
}

.kiwi-userbox-bio-text {
    font-size: var(--text-sm, 0.8125rem);
    line-height: 1.45;
    color: var(--color-text-secondary, #56616f);
}

/* salons en commun — hero chips */
.kiwi-userbox-common {
    margin-top: 0.9rem;
}

.kiwi-userbox-common-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.kiwi-userbox-common-list .kiwi-channel {
    display: inline-flex;
    align-items: center;
    height: 1.55rem;
    padding: 0 0.6rem;
    border-radius: var(--radius-pill, 9999px);
    background: var(--color-chip-bg-hero, #cde9fc);
    color: var(--color-accent, #004b87);
    border: 1px solid var(--color-accent-soft, #8bcbf9);
    box-shadow: var(--shadow-raised, 0 0.0625rem 0.125rem rgba(8, 32, 60, 0.1), 0 0.0625rem 0.1875rem rgba(8, 32, 60, 0.06));
    font-size: var(--text-xs, 0.6875rem);
    font-weight: var(--weight-extrabold, 800);
    text-decoration: none;
    cursor: pointer;
}

/* status badges — neutral pill, picto coloured by meaning. mod + op = same shield (both protect) */
.kiwi-userbox-flags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.65rem;
}

/* "posed token" grammar (shared with chips + secondary buttons): tinted fill + soft
   border + soft shadow. The border crisps the edge, the shadow lifts it off the panel —
   readable without white (white stays for input / raised controls). */
.kiwi-userbox-flag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    height: 1.45rem;
    padding: 0 0.55rem;
    border-radius: var(--radius-pill, 9999px);
    background: var(--color-chip-bg, #e7f1fc);
    border: 1px solid var(--color-border-strong, #d7e3f2);
    box-shadow: var(--shadow-raised, 0 0.0625rem 0.125rem rgba(8, 32, 60, 0.1), 0 0.0625rem 0.1875rem rgba(8, 32, 60, 0.06));
    color: var(--color-text-secondary, #56616f);
    font-size: var(--text-2xs, 0.625rem);
    font-weight: var(--weight-extrabold, 800);
}

.kiwi-userbox-flag i {
    font-size: 0.95em;
}

.kiwi-userbox-flag--reg i {
    color: var(--color-success-text, #15803d);
}

.kiwi-userbox-flag--mod i,
.kiwi-userbox-flag--op i {
    color: var(--color-accent, #004b87);
}

.kiwi-userbox-flag--bot i {
    color: var(--color-bot, #7c3aed);
}

.kiwi-userbox-flag--away i {
    color: var(--color-presence-away, #b98b52);
}

.kiwi-userbox-actions {
    width: 100%;
    padding: 1em;
    margin: 0;
    user-select: none;
    box-sizing: border-box;

    /* flex + gap so the actions line up like the protection row below */
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;

    .kiwi-userbox-action-btn:empty {
        display: none;
    }

    label {
        display: block;
        cursor: pointer;

        span {
            text-align: left;
            width: auto;
        }
    }
}

.kiwi-userbox-plugin-actions {
    padding: 0;
}

/* Moderation zone (ops only) — sister card to the protection zone below:
   same tinted card + picto header. Sanctions are sized here and skinned by
   the theme's .btn-cta (plain raised pills on themes without that skin). */
.kiwi-userbox-mod {
    margin: 1rem 1rem 0;
    padding: 0.875rem;
    border-radius: 0.875rem;
    background:
        color-mix(
            in srgb,
            var(--color-accent-soft, #8bcbf9) 30%,
            var(--color-surface, #fff)
        );
    box-sizing: border-box;
}

.kiwi-userbox-mod-head {
    display: flex;
    align-items: center;
    gap: 0.4375rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 800;
}

.kiwi-userbox-mod-field {
    display: block;
    margin: 0 0 0.625rem;
}

.kiwi-userbox-mod-lbl {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 700;
    color: var(--color-text-secondary, inherit);
}

/* the select is input, so it alone keeps the white input skin on the tinted card */
.kiwi-userbox-mod-select {
    width: 100%;
    height: 2.125rem;
    padding: 0 1.8rem 0 0.75rem;
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.45));
    border-radius: 6.1875rem;
    background-color: var(--color-bg-input, #fff);
    box-shadow: var(--shadow-input, none);
    color: var(--color-text-primary, #333);
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    cursor: pointer;
}

/* one sanction per row: full labels stay readable on narrow mobile sidebars */
.kiwi-userbox-mod-sanctions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.4rem;
}

.kiwi-userbox-mod-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    height: 2.125rem;
    padding: 0 0.5rem;
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.45));
    border-radius: 6.1875rem;
    background: var(--color-surface, #fff);
    box-shadow: var(--shadow-raised, 0 0.0625rem 0.125rem rgba(8, 32, 60, 0.1), 0 0.0625rem 0.1875rem rgba(8, 32, 60, 0.06));
    color: inherit;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
}

.kiwi-userbox-mod-select:focus-visible,
.kiwi-userbox-mod-btn:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring, 0 0 0 0.1875rem rgba(139, 203, 249, 0.6));
}

/* whois « Plus d'infos » — grouped picto rows (.prof-details grammar). 2-class selector
   beats base.css `.kiwi-userbox-whois` hairline border (DS: no hard lines). */
.kiwi-userbox-whois.kiwi-userbox-details {
    width: auto;
    margin: 0;
    padding: 0 1rem 0.5rem;
    background: none;
    border: 0;
    box-sizing: border-box;
}

.kiwi-userbox-details.kiwi-userbox-whois--loading {
    padding: 1rem;
    text-align: center;
}

.kiwi-userbox-det-block {
    margin-top: 0.9rem;
}

.kiwi-userbox-det-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.2rem 0;
    font-size: var(--text-sm, 0.8125rem);
    line-height: 1.4;
    color: var(--color-text-secondary, #56616f);
}

.kiwi-userbox-det-row i {
    width: 1rem;
    flex-shrink: 0;
    margin-top: 0.15rem;
    text-align: center;
    color: var(--color-text-faint, #9aa6b6);
}

.kiwi-userbox-det-val {
    color: var(--color-text-primary, #22231f);
    font-weight: var(--weight-bold, 700);
    word-break: break-word;
}

/* « Connexion sécurisée » — green text (AA), matching lock icon */
.kiwi-userbox-det-row--secure,
.kiwi-userbox-det-row--secure i {
    color: var(--color-success-text, #15803d);
    font-weight: var(--weight-bold, 700);
}

/* Ses salons — neutral chips, common ones promoted to hero (same language as the header block) */
.kiwi-userbox-channels-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.35rem;
}

.kiwi-userbox-channels-list .kiwi-channel {
    display: inline-flex;
    align-items: center;
    height: 1.55rem;
    padding: 0 0.6rem;
    border-radius: var(--radius-pill, 9999px);
    background: var(--color-chip-bg, #e7f1fc);
    color: var(--color-text-secondary, #56616f);
    border: 1px solid var(--color-border-strong, #d7e3f2);
    box-shadow: var(--shadow-raised, 0 0.0625rem 0.125rem rgba(8, 32, 60, 0.1), 0 0.0625rem 0.1875rem rgba(8, 32, 60, 0.06));
    font-size: var(--text-xs, 0.6875rem);
    font-weight: var(--weight-bold, 700);
    text-decoration: none;
    cursor: pointer;
}

.kiwi-userbox-channels-list .kiwi-channel--common {
    background: var(--color-chip-bg-hero, #cde9fc);
    color: var(--color-accent, #004b87);
    border-color: var(--color-accent-soft, #8bcbf9);
    font-weight: var(--weight-extrabold, 800);
}

/* Protection control zone — base styles (theme-agnostic, works on any theme;
   the EuropNet theme adds the brand look on top). */
.kiwi-userbox-protect {
    margin: 1rem 1rem 1.5rem;
    padding: 0.875rem;
    border-radius: 0.875rem;

    /* read DS tokens with a neutral fallback so the theme can't be overridden by injection order */
    background:
        color-mix(
            in srgb,
            var(--color-accent-soft, #8bcbf9) 30%,
            var(--color-surface, #fff)
        );
    box-sizing: border-box;
}

.kiwi-userbox-protect-head {
    display: flex;
    align-items: center;
    gap: 0.4375rem;
    margin-bottom: 0.375rem;
    font-size: 0.75rem;
    font-weight: 800;
}

.kiwi-userbox-protect-text {
    margin: 0 0 0.625rem;
    font-size: 0.75rem;
    line-height: 1.4;
}

.kiwi-userbox-protect-actions {
    display: flex;
    gap: 0.5rem;
}

/* shared pill button — the top actions and the protection controls speak one
   button language so the userbox isn't two grammars (DS ghost/ctrl family). */
.kiwi-userbox-action-btn,
.kiwi-userbox-protect-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    height: 2.125rem;
    padding: 0 0.5rem;
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.45));
    border-radius: 6.1875rem;
    background: var(--color-surface, #fff);     /* secondaire posé : surface + filet + ombre (grammaire commune) */
    box-shadow: var(--shadow-raised, 0 0.0625rem 0.125rem rgba(8, 32, 60, 0.1), 0 0.0625rem 0.1875rem rgba(8, 32, 60, 0.06));
    color: inherit;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
}

.kiwi-userbox-protect-btn.is-on {
    background: rgba(127, 127, 127, 0.18);
}

/* report cooldown: the button stays in place, visibly inert */
.kiwi-userbox-protect-btn[disabled] {
    opacity: 0.45;
    cursor: default;
    box-shadow: none;
}

.kiwi-userbox-protect-hint {
    margin-top: 0.5rem;
    font-size: 0.6875rem;
    text-align: center;
    color: var(--color-accent, inherit);
}

.kiwi-userbox-protect-hint em {
    font-style: normal;
    font-weight: 800;
}

@media screen and (max-width: 769px) {
    .kiwi-container--sidebar-drawn .kiwi-sidebar-userbox {
        width: 100%;
    }

    .kiwi-userbox {
        left: 0;
        right: 0;
        bottom: 40px;
        top: auto;
        max-width: 100%;
        border-width: 1px 0;
    }

    .kiwi-userbox .kiwi-userbox-header {
        padding-left: 10px;
    }

    .kiwi-userbox .kiwi-userbox-basicinfo {
        padding: 10px 10px;
        margin-bottom: 20px;
    }

    .kiwi-userbox-actions {
        padding: 0.75rem;
        width: 100%;
        box-sizing: border-box;
    }

    .kiwi-userbox-plugin-actions {
        padding: 0;
    }
}
</style>
