<template>
    <div class="kiwi-userbox">
        <span v-if="isSelf" class="kiwi-userbox-selfprofile">
            {{ $t('user_you') }}
        </span>
        <div class="kiwi-userbox-header">
            <i v-if="user.asl && user.asl.s.substr(0, 2) === '_m'"
               :style="{ color: user.getColour() }"
               class="fa fa-male kiwi-userbox-icon" aria-hidden="true"
            />
            <i v-else-if="user.asl && user.asl.s.substr(0, 2) === '_f'"
               :style="{ color: user.getColour() }"
               class="fa fa-female kiwi-userbox-icon" aria-hidden="true"
            />
            <i v-else :style="{ color: user.getColour() }"
               class="fa fa-user kiwi-userbox-icon" aria-hidden="true"
            />
            <h3>
                <span :style="{'color': user.getColour()}">{{ user.nick }}</span>
                <span v-if="userMode" class="kiwi-userbox-modestring">+{{ userMode }}</span>
            </h3>
            <div class="kiwi-userbox-usermask">{{ user.username }}@{{ user.host }}</div>
        </div>

        <div class="kiwi-userbox-basicinfo">
            <div v-if="user.asl && singleLine">
                <span class="kiwi-userbox-basicinfo-title">{{ $t('plugin-asl:info') }}:</span>
                <span class="kiwi-userbox-basicinfo-data">{{ aslString }}</span>
            </div>
            <div v-else-if="user.asl">
                <div v-if="user.asl.a">
                    <span><b>{{ $t('plugin-asl:age') }}: </b>{{ user.asl.a }}</span>
                </div>
                <div v-if="user.asl.s">
                    <span><b>{{ $t('plugin-asl:sex') }}: </b>
                        {{
                            user.asl.s[0] === '_' ?
                                $t('plugin-asl:' + user.asl.s.substr(1)) :
                                user.asl.s
                        }}
                    </span>
                </div>
                <div v-if="user.asl.l">
                    <span><b>{{ $t('plugin-asl:location') }}: </b>{{ user.asl.l }}</span>
                </div>
            </div>
            <div v-if="user.aslRealname">
                <span class="kiwi-userbox-basicinfo-title">{{ $t('whois_realname') }}:</span>
                <span class="kiwi-userbox-basicinfo-data" v-html="formattedRealname" />
            </div>
            <div>
                <b>{{ $t('plugin-asl:common_channels') }}:</b>
                <span @click="onChannelsClick($event)"
                      v-html="linkifyCommonChannels"
                />
            </div>
        </div>

        <div class="kiwi-userbox-actions">
            <a v-if="!isSelf && !buffer.isQuery()" class="kiwi-userbox-action" @click="openQuery">
                <i class="fa fa-comment-o" aria-hidden="true" />
                {{ $t('send_a_message') }}
            </a>
            <a v-if="!whoisRequested" class="kiwi-userbox-action" @click="updateWhoisData">
                <i class="fa fa-question-circle" aria-hidden="true" />
                {{ $t('more_information') }}
            </a>
        </div>
        <div v-if="report_user_display" ref="ssOverlay" class="kiwi-asl-overlay" @click.self="closeReport">
            <div class="kiwi-asl-modal" role="dialog" aria-modal="true">
                <div class="kiwi-asl-modal-head">
                    <span class="kiwi-asl-modal-icon"><i class="fa fa-flag" aria-hidden="true" /></span>
                    <span class="kiwi-asl-modal-title">
                        {{ $t('plugin-asl:report_title', { nick: user.nick }) }}
                    </span>
                    <button type="button" class="kiwi-asl-modal-close" @click="closeReport">
                        <i class="fa fa-times" aria-hidden="true" />
                    </button>
                </div>
                <div class="kiwi-asl-modal-body">
                    <p class="kiwi-asl-modal-intro">{{ $t('plugin-asl:report_modal_intro') }}</p>
                    <div
                        v-for="reason in reportReasons"
                        :key="reason.key"
                        class="kiwi-asl-reason"
                        :class="{ 'is-sel': report_reasons === reason.label }"
                        @click="report_reasons = reason.label"
                    >
                        <span class="kiwi-asl-reason-radio" />
                        {{ reason.label }}
                    </div>
                    <div
                        class="kiwi-asl-combine"
                        :class="{ 'is-on': report_block_too }"
                        @click="report_block_too = !report_block_too"
                    >
                        <span class="kiwi-asl-combine-box"><i class="fa fa-check" aria-hidden="true" /></span>
                        <span class="kiwi-asl-combine-text">
                            <b>{{ $t('plugin-asl:report_block_too', { nick: user.nick }) }}</b>
                            <span>{{ $t('plugin-asl:report_block_too_hint') }}</span>
                        </span>
                    </div>
                    <div class="kiwi-asl-note">
                        <i class="fa fa-paperclip" aria-hidden="true" />
                        {{ $t('plugin-asl:report_log_note') }}
                    </div>
                    <div class="kiwi-asl-modal-foot">
                        <button type="button" class="kiwi-asl-btn is-cancel" @click="closeReport">
                            {{ $t('plugin-asl:report_cancel') }}
                        </button>
                        <button
                            type="button"
                            class="kiwi-asl-btn is-send"
                            :disabled="!report_reasons || report_sending"
                            @click="submitReportForm"
                        >
                            <i v-if="report_sending" class="fa fa-spinner fa-spin" aria-hidden="true" />
                            <template v-else>
                                <i class="fa fa-flag" aria-hidden="true" /> {{ $t('plugin-asl:report_send') }}
                            </template>
                        </button>
                    </div>
                </div>
            </div>
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
                    <i class="fa fa-ban" aria-hidden="true" />
                    {{ user.ignore ? $t('plugin-asl:unblock') : $t('plugin-asl:block') }}
                </button>
                <button
                    v-if="buffer.isQuery()"
                    type="button"
                    class="kiwi-userbox-protect-btn is-report"
                    @click="toggleReportUser"
                >
                    <i class="fa fa-flag" aria-hidden="true" />
                    {{ $t('plugin-asl:report_action') }}
                </button>
            </div>
            <div class="kiwi-userbox-protect-hint" v-html="$t('plugin-asl:protect_hint')" />
        </div>
        <div v-if="toast_visible" class="kiwi-asl-toast">
            <i class="kiwi-asl-toast-ic fa" :class="toast_icon" aria-hidden="true" />
            <span class="kiwi-asl-toast-msg">{{ toast_message }}</span>
            <button
                v-if="toast_has_undo"
                type="button"
                class="kiwi-asl-toast-action"
                @click="onToastUndo"
            >
                {{ $t('plugin-asl:undo') }}
            </button>
        </div>
        <div
            v-if="whoisRequested"
            :class="[whoisLoading?'kiwi-userbox-whois--loading':'']"
            class="kiwi-userbox-whois"
        >
            <template v-if="whoisLoading">
                <i class="fa fa-spinner" aria-hidden="true" />
            </template>
            <template v-else>
                <span class="kiwi-userbox-whois-line">
                    {{ user.away ?
                        $t('whois_status') + ': ' + user.away :
                        $t('whois_status_available')
                    }}
                </span>
                <span v-if="user.account" class="kiwi-userbox-whois-line">
                    {{ $t('user_account', {user: user.account}) }}
                </span>
                <span class="kiwi-userbox-whois-line">
                    {{ $t('user_realname', {realname: user.realname}) }}
                </span>
                <span v-if="user.whois.bot" class="kiwi-userbox-whois-line">
                    {{ $t('user_bot') }}
                </span>
                <span v-if="user.whois.helpop" class="kiwi-userbox-whois-line">
                    {{ $t('user_help') }}
                </span>
                <span v-if="user.whois.operator" class="kiwi-userbox-whois-line">
                    {{ $t('user_op') }}
                </span>
                <span v-if="user.whois.server" class="kiwi-userbox-whois-line">
                    {{ $t('user_server', {
                        server: user.whois.server,
                        info: (user.whois.server_info ? `(${user.whois.server_info})` : '')
                    }) }}
                </span>
                <span v-if="user.whois.secure" class="kiwi-userbox-whois-line">
                    {{ $t('user_secure') }}
                </span>
                <span
                    v-if="user.whois.channels"
                    class="kiwi-userbox-whois-line"
                    @click="onChannelsClick($event)"
                    v-html="$t('user_channels', {channels: userChannels})"
                />
            </template>
        </div>

        <div v-if="buffer.isChannel() && areWeAnOp && !isSelf" class="kiwi-userbox-opactions">
            <form class="u-form" @submit.prevent="">
                <label v-if="isUserOnBuffer">
                    {{ $t('user_access') }} <select v-model="userMode">
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
                <label v-if="isUserOnBuffer">
                    <button
                        type="button"
                        class="u-button u-button-secondary
                               kiwi-userbox-opaction-kick kiwi-userbox-opaction"
                        @click="kickUser"
                    >
                        <i class="fa fa-sign-out" aria-hidden="true" />
                        {{ $t('user_kick') }}
                    </button>
                </label>
                <label>
                    <button
                        type="button"
                        class="u-button u-button-secondary
                               kiwi-userbox-opaction-ban kiwi-userbox-opaction"
                        @click="banUser"
                    >
                        <i class="fa fa-ban" aria-hidden="true" />
                        {{ $t('user_ban') }}
                    </button>
                </label>
                <label v-if="isUserOnBuffer">
                    <button
                        type="button"
                        class="u-button u-button-secondary
                               kiwi-userbox-opaction-kickban kiwi-userbox-opaction"
                        @click="kickbanUser"
                    >
                        <i class="fa fa-exclamation-triangle" aria-hidden="true" />
                        {{ $t('user_kickban') }}
                    </button>
                </label>
            </form>
        </div>
    </div>
</template>

<script>

/* global kiwi:true */

import * as ipRegex from 'ip-regex';
import * as config from '../config.js';

let TextFormatting = kiwi.require('helpers/TextFormatting');
let IrcdDiffs = kiwi.require('helpers/IrcdDiffs');
let GlobalApi = kiwi.require('libs/GlobalApi');
let toHtml = kiwi.require('libs/renderers/Html');
let parseMessage = kiwi.require('libs/MessageParser');

export default {
    components: {
    },
    props: ['buffer', 'network', 'user'],
    data: function data() {
        return {
            self: this,
            whoisRequested: false,
            whoisLoading: false,
            report_user_display: false,
            report_confirmation: false,
            report_sending: false,
            report_reasons: '',
            report_block_too: true,
            toast_visible: false,
            toast_message: '',
            toast_icon: '',
            toast_has_undo: false,
            pluginUiButtonElements: GlobalApi.singleton().userboxButtonPlugins,
        };
    },
    mounted: function mounted() {
        document.addEventListener('keydown', this.onKeydown);
    },
    beforeDestroy: function beforeDestroy() {
        document.removeEventListener('keydown', this.onKeydown);
        // the overlay may have been portalled out of this component's DOM — clean it up
        if (this.$refs.ssOverlay && this.$refs.ssOverlay.parentNode) {
            this.$refs.ssOverlay.parentNode.removeChild(this.$refs.ssOverlay);
        }
    },
    computed: {
        singleLine() {
            return config.getSetting('singleLineUserbox');
        },
        aslString() {
            let parts = config.getSetting('singleLineString');
            let out = [];
            if (this.user.asl.a) {
                let ageTpl = parts.age[0] === '_' ?
                    TextFormatting.t('plugin-asl:' + parts.age.substr(1)) :
                    parts.age;
                out.push(ageTpl.replace('%a', this.user.asl.a));
            }
            if (this.user.asl.s) {
                let sex = this.user.asl.s[0] === '_' ?
                    TextFormatting.t('plugin-asl:' + this.user.asl.s.substr(1)) :
                    this.user.asl.s;
                out.push(parts.sex.replace('%s', sex));
            }
            if (this.user.asl.l) {
                out.push(parts.location.replace('%l', this.user.asl.l));
            }
            return out.join(parts.separator);
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
        realname() {
            return (this.user.realname || '').trim();
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
        userChannels() {
            let channels = this.user.whois.channels.trim().split(' ');
            for (let i = 0; i < channels.length; i++) {
                channels[i] = TextFormatting.linkifyChannels(channels[i]);
            }
            return channels.join(' ');
        },
        commonChannels: function commonChannels() {
            let networkId = kiwi.state.getActiveNetwork().id;
            let channels = [];
            this.$state.getBuffersWithUser(networkId, this.user.nick).forEach((buffer) => {
                if (buffer.name.substr(0, 1) === '#') {
                    channels.push(buffer.name);
                }
            });
            return channels;
        },
        linkifyCommonChannels: function linkifyCommonChannels() {
            let channels = [];
            this.commonChannels.forEach((channel) => {
                channels.push(TextFormatting.linkifyChannels(channel));
            });
            return channels.join(', ');
        },
        reportReasons: function reportReasons() {
            let reportReasonList = [
                { key: 'harassment', label: TextFormatting.t('plugin-asl:report_reason_harassment') },
                { key: 'insults', label: TextFormatting.t('plugin-asl:report_reason_insults') },
                { key: 'sexual_content', label: TextFormatting.t('plugin-asl:report_reason_sexual_content') },
                { key: 'child_endangerment', label: TextFormatting.t('plugin-asl:report_reason_child_endangerment') },
                { key: 'underage', label: TextFormatting.t('plugin-asl:report_reason_underage') },
                { key: 'spam', label: TextFormatting.t('plugin-asl:report_reason_spam') },
                { key: 'paid_offer', label: TextFormatting.t('plugin-asl:report_reason_paid_offer') },
                { key: 'indecent_proposal', label: TextFormatting.t('plugin-asl:report_reason_indecent_proposal') },
            ];
            return reportReasonList;
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
        report_user_display: function watchReportOpen(open) {
            // Portal the overlay to the app root so its backdrop-filter blurs the
            // whole page uniformly (when nested in the userbox it only blurs its
            // own stacking context — rail/navbar stay sharp).
            if (!open) {
                return;
            }
            this.$nextTick(() => {
                let wrap = document.querySelector('.kiwi-wrap');
                if (wrap && this.$refs.ssOverlay) {
                    wrap.appendChild(this.$refs.ssOverlay);
                }
            });
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
        toggleReportUser: function toggleReportUser() {
            if (!this.report_user_display) {
                // reset the form each time the modal opens
                this.report_reasons = '';
                this.report_block_too = true;
            }
            this.report_user_display = !this.report_user_display;
        },
        closeReport: function closeReport() {
            this.report_user_display = false;
        },
        onKeydown: function onKeydown(e) {
            if (e.key === 'Escape' && this.report_user_display) {
                this.closeReport();
            }
        },
        buildConversationLog: function buildConversationLog() {
            let logLines = config.getSetting('reportLogLines');
            let msgs = (this.buffer.messagesObj.messages || []).slice(-logLines);
            return msgs
                .filter((m) => m.message && m.message.trim().length)
                .map((m) => {
                    let text = '';
                    switch (m.type) {
                    case 'privmsg':
                        text = `<${m.nick}> ${m.message}`;
                        break;
                    case 'nick':
                    case 'mode':
                    case 'action':
                    case 'traffic':
                        text = m.message;
                        break;
                    default:
                        text = m.message;
                    }
                    if (!text.length) return null;
                    let ts = (new Date(m.time)).toLocaleTimeString({ hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return `[${ts}] ${text}`;
                })
                .filter(Boolean)
                .join('\r\n');
        },
        submitReportForm: async function submitReportForm() {
            // protection is guaranteed: block right away if requested, even if the report fails
            if (this.report_block_too && !this.user.ignore) {
                this.toggleIgnore();
            }
            this.report_sending = true;
            let nickname = this.user.nick;
            let network = this.$state.getActiveNetwork();
            let target = this.$state.getSetting('settings.plugin-asl.reportChannel');
            let logLines = config.getSetting('reportLogLines');

            let logUrl = null;
            if (kiwi.fileuploader) {
                try {
                    const logText = this.buildConversationLog();
                    const ts = Date.now();
                    const result = await kiwi.fileuploader.uploadBlob(logText, {
                        filename: `report_${nickname}_${ts}.txt`,
                        mimeType: 'text/plain',
                        category: 'abuse-report',
                    });
                    logUrl = result.url;
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('[plugin-asl] report log upload failed:', e);
                }
            }

            let msg = TextFormatting.t('plugin-asl:report_msg_intro') + nickname + ' - ' +
                TextFormatting.t('plugin-asl:report_channels') + ': ' + this.commonChannels.join(', ') + ' - ' +
                TextFormatting.t('plugin-asl:report_reason') + ': ' + this.report_reasons;
            if (logUrl) {
                msg += ' - Log: ' + logUrl;
            }
            network.ircClient.say(target, msg);

            this.report_sending = false;
            this.report_user_display = false;
            this.report_confirmation = true;

            const confirmMsg = logUrl
                ? TextFormatting.t('plugin-asl:report_confirm_with_log', { lines: logLines })
                : TextFormatting.t('plugin-asl:report_confirm');
            this.$state.addMessage(this.$state.getActiveBuffer(),
                {
                    nick: TextFormatting.t('plugin-asl:system_message'),
                    message: confirmMsg,
                    type: 'notice',
                });

            this.showToast(TextFormatting.t('plugin-asl:report_toast'), 'fa-flag', null);
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
        toggleIgnore: function toggleIgnore() {
            if (this.user.ignore) {
                this.network.ignored_list.pop(this.user.nick);
            } else {
                this.network.ignored_list.push(this.user.nick);
            }
            this.user.ignore = !this.user.ignore;
        },
        onBlockClick: function onBlockClick() {
            this.toggleIgnore();
            if (this.user.ignore) {
                this.notifyBlocked(this.user.nick);
                this.showToast(
                    TextFormatting.t('plugin-asl:block_toast', { nick: this.user.nick }),
                    'fa-ban',
                    this.undoBlockAction
                );
            } else {
                this.notifyUnblocked(this.user.nick);
                this.showToast(
                    TextFormatting.t('plugin-asl:unblock_toast', { nick: this.user.nick }),
                    'fa-ban',
                    this.undoUnblockAction
                );
            }
        },
        undoBlockAction: function undoBlockAction() {
            // undo a block = unblock again
            if (this.user.ignore) {
                this.toggleIgnore();
                this.notifyUnblocked(this.user.nick);
            }
        },
        undoUnblockAction: function undoUnblockAction() {
            // undo an unblock = block again
            if (!this.user.ignore) {
                this.toggleIgnore();
                this.notifyBlocked(this.user.nick);
            }
        },
        notifyBlocked: function notifyBlocked(nick) {
            this.addProtectNotice('plugin-asl:block_confirm', nick);
        },
        notifyUnblocked: function notifyUnblocked(nick) {
            this.addProtectNotice('plugin-asl:unblock_confirm', nick);
        },
        addProtectNotice: function addProtectNotice(key, nick) {
            // persistent confirmation in the conversation, like the report flow
            this.$state.addMessage(this.$state.getActiveBuffer(), {
                nick: TextFormatting.t('plugin-asl:system_message'),
                message: TextFormatting.t(key, { nick: nick }),
                type: 'notice',
            });
        },
        showToast: function showToast(message, icon, undoFn) {
            this.toast_message = message;
            this.toast_icon = icon;
            this.toast_has_undo = !!undoFn;
            this.toastUndoFn = undoFn || null;
            this.toast_visible = true;
            if (this.toastTimer) {
                clearTimeout(this.toastTimer);
            }
            this.toastTimer = setTimeout(() => {
                this.toast_visible = false;
            }, 5000);
        },
        onToastUndo: function onToastUndo() {
            if (this.toastUndoFn) {
                this.toastUndoFn();
            }
            this.hideToast();
        },
        hideToast: function hideToast() {
            this.toast_visible = false;
            if (this.toastTimer) {
                clearTimeout(this.toastTimer);
            }
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

.kiwi-userbox-selfprofile {
    display: block;
    margin: 0 auto;
    width: 100%;
    padding: 1em;
    text-align: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
}

.kiwi-userbox-header {
    position: relative;
    padding: 0.5em 1em;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.kiwi-userbox-header h3 {
    margin: 0 0 0 40px;
    padding: 0;
}

.kiwi-userbox-avatar {
    position: relative;
    margin: 1em;
    width: 100px;
    height: 100px;
    flex-shrink: 0;
}

.kiwi-userbox-avatar .kiwi-avatar-inner {
    font-size: 3em;
    border-width: 3px;
}

.kiwi-userbox-avatar .kiwi-awaystatusindicator {
    width: 16px;
    height: 16px;
    top: 4px;
    right: 2px;
    position: absolute;
}

.kiwi-userbox-userinfo {
    box-sizing: border-box;
    margin-top: 1.2em;
    flex-grow: 1;
}

.kiwi-userbox-nick {
    font-weight: 800;
    font-size: 1.4em;
}

.kiwi-userbox-icon {
    font-size: 2.8em;
    margin-right: 0.3em;
    position: absolute;
}

.fa-user.kiwi-userbox-icon {
    display: inline-block;
    font-size: 2em;
}

.kiwi-userbox-modestring {
    font-weight: normal;
    font-size: 0.8em;
    margin-left: 6px;
}

.kiwi-userbox-usermask {
    display: block;
    margin: 0 0 0 40px;
    font-size: 0.9em;
}

.kiwi-userbox-basicinfo {
    width: 100%;
    margin: 0;
    display: block;
    padding: 0.5em 1em;
    box-sizing: border-box;
}

.kiwi-userbox-basicinfo-title,
.kiwi-userbox-basicinfo-data {
    display: block;
    width: 100%;
    cursor: default;
    margin: 0;
}

.kiwi-userbox-basicinfo-title {
    font-size: 1em;
    line-height: 1em;
    padding: 0;
    text-align: left;
    font-weight: 900;
}

.kiwi-userbox-basicinfo-data {
    margin-bottom: 1em;
    font-weight: 100;
    opacity: 1;
}

.kiwi-userbox-actions {
    width: 100%;
    padding: 1em;
    text-align: center;
    margin: 0;
    user-select: none;
    box-sizing: border-box;

    /* using display flex here to prevent spaces making things uneven */
    display: flex;
    flex-wrap: wrap;
    justify-content: center;

    .kiwi-userbox-action {
        display: inline-block;
        border: 1px solid;
        padding: 0.5em 1em;
        cursor: pointer;
        margin: 0 2px;
        transition: all 0.3s;
        border-radius: 3px;
    }

    .kiwi-userbox-action:empty {
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

.kiwi-userbox-opactions {
    width: 100%;
    text-align: center;
    box-sizing: border-box;
    margin: 0 0 1em 0;
    border-top: 1px solid;
    padding: 1em;
}

.kiwi-userbox-opactions label {
    width: 100%;
    font-size: 1.2em;
    font-weight: 600;
    display: block;
    margin-bottom: 0.7em;
}

.kiwi-userbox-opactions label select {
    display: block;
    clear: both;
    padding: 10px;
    border-radius: 0.25em;
    box-shadow: none;
    border: 1px solid;
    width: 100%;
    margin-top: 10px;
    cursor: pointer;
}

.kiwi-userbox-opaction {
    width: 100%;
    padding: 0 1em;
    text-align: left;
    border: none;
    line-height: 2.2em;
    font-size: 0.8em;
}

.kiwi-userbox-opaction i {
    margin-right: 0.2em;
    font-size: 1.2em;
}

.kiwi-userbox-actions a {
    margin-right: 1em;
}

.kiwi-userbox-whois {
    line-height: 1.4em;
    padding: 1em;
    width: 90%;
    margin: 0 5% 20px 5%;
    background: none;
    box-sizing: border-box;
    border-radius: 2px;
}

.kiwi-userbox-whois-line {
    display: block;
}

/* Protection control zone — base styles (theme-agnostic, works on any theme;
   the EuropNet theme adds the brand look on top). */
.kiwi-userbox-protect {
    margin: 0 1rem 1.5rem;
    padding: 0.875rem;
    border-radius: 0.875rem;
    /* read DS tokens with a neutral fallback so the theme can't be overridden by injection order */
    background: color-mix(in srgb, var(--color-accent-soft, #8bcbf9) 30%, var(--color-surface, #fff));
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
    background: var(--color-surface, #fff);
    color: inherit;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
}

.kiwi-userbox-protect-btn.is-on {
    background: rgba(127, 127, 127, 0.18);
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

/* Toast — transient confirmation of the 1-click block (with undo). */
.kiwi-asl-toast {
    position: fixed;
    left: 50%;
    bottom: 4.5rem;
    transform: translateX(-50%);
    z-index: 9990;
    display: flex;
    align-items: center;
    gap: 0.6em;
    width: max-content;
    max-width: calc(100vw - 2rem);
    padding: 0.55em 0.6em 0.55em 0.85em;
    border: 1px solid var(--color-border, rgba(127, 127, 127, 0.3));
    border-radius: 0.5em;
    background: var(--color-surface, #fff);
    color: var(--color-text-primary, #222);
    box-shadow: 0 0.5em 1.5em rgba(0, 0, 0, 0.2);
    animation: kiwi-asl-toast-in 0.2s ease-out;
}

@keyframes kiwi-asl-toast-in {
    from { opacity: 0; transform: translateX(-50%) translateY(0.75rem); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
    .kiwi-asl-toast {
        animation: none;
    }
}

.kiwi-asl-toast-action {
    padding: 0.2em 0.4em;
    border: 0;
    background: none;
    color: var(--color-accent, inherit);
    font: inherit;
    font-weight: 800;
    text-decoration: underline;
    cursor: pointer;
}

/* Report modal — base styles (theme-agnostic; the EuropNet theme adds the brand look). */
.kiwi-asl-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--color-scrim, rgba(8, 24, 44, 0.55));
}

.kiwi-asl-modal {
    width: 23.75rem;
    max-width: 92vw;
    max-height: 86vh;
    overflow-y: auto;
    background: var(--color-surface, #fff);
    color: var(--color-text-primary, #222);
    border-radius: 1rem;
    box-shadow: 0 1.25rem 3.75rem rgba(0, 30, 60, 0.35);
    animation: kiwi-asl-modal-pop 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
}

@keyframes kiwi-asl-modal-pop {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: none; }
}

@keyframes kiwi-asl-modal-sheet {
    from { transform: translateY(100%); }
    to { transform: none; }
}

.kiwi-asl-overlay {
    animation: kiwi-asl-overlay-fade 0.18s ease;
}

@keyframes kiwi-asl-overlay-fade {
    from { opacity: 0; }
    to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
    .kiwi-asl-modal,
    .kiwi-asl-overlay {
        animation: none;
    }
}

.kiwi-asl-modal-head {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
    background: inherit;
    border-bottom: 1px solid var(--color-border, rgba(127, 127, 127, 0.2));
}

.kiwi-asl-modal-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.875rem;
    height: 1.875rem;
    border-radius: 0.5625rem;
    font-size: 0.875rem;
    background: var(--color-danger, #c0392b);
    color: var(--color-on-danger, #fff);
}

.kiwi-asl-modal-title {
    flex: 1;
    font-size: 0.9375rem;
    font-weight: 800;
}

.kiwi-asl-modal-close {
    flex-shrink: 0;
    width: 1.875rem;
    height: 1.875rem;
    border: 0;
    border-radius: 50%;
    background: none;
    color: inherit;
    opacity: 0.6;
    cursor: pointer;
}

.kiwi-asl-modal-close:hover {
    opacity: 1;
}

.kiwi-asl-modal-body {
    padding: 1rem;
}

.kiwi-asl-modal-intro {
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--color-text-secondary, inherit);
}

.kiwi-asl-reason {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 0.3125rem;
    padding: 0.4375rem 0.75rem;
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.4));
    border-radius: 0.6875rem;
    font-size: 0.8438rem;
    font-weight: 600;
    cursor: pointer;
}

.kiwi-asl-reason-radio {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid rgba(127, 127, 127, 0.5);
    border-radius: 50%;
}

.kiwi-asl-reason.is-sel {
    border-color: var(--color-accent, #555);
    background: var(--color-bg-raised, rgba(127, 127, 127, 0.12));
    color: var(--color-accent, inherit);
    font-weight: 800;
}

.kiwi-asl-reason.is-sel .kiwi-asl-reason-radio {
    border-color: var(--color-accent, #555);
}

.kiwi-asl-reason.is-sel .kiwi-asl-reason-radio::after {
    content: '';
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-accent, #555);
}

.kiwi-asl-combine {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    margin: 1rem 0 0.5rem;
    padding: 0.75rem 0.875rem;
    border-radius: 0.875rem;
    background: var(--color-bg-raised, rgba(127, 127, 127, 0.1));
    cursor: pointer;
}

.kiwi-asl-combine-box {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    margin-top: 0.0625rem;
    border: 2px solid var(--color-accent, rgba(127, 127, 127, 0.5));
    border-radius: 0.375rem;
    font-size: 0.75rem;
    background: var(--color-surface, #fff);
    color: var(--color-on-accent, #fff);
}

.kiwi-asl-combine-box .fa {
    opacity: 0;
}

.kiwi-asl-combine.is-on .kiwi-asl-combine-box {
    background: var(--color-accent, #555);
    border-color: var(--color-accent, #555);
}

.kiwi-asl-combine.is-on .kiwi-asl-combine-box .fa {
    opacity: 1;
}

.kiwi-asl-combine-text {
    font-size: 0.8125rem;
    line-height: 1.35;
}

.kiwi-asl-combine-text b {
    display: block;
    font-weight: 800;
}

.kiwi-asl-combine-text span {
    font-weight: 600;
}

.kiwi-asl-note {
    display: flex;
    align-items: flex-start;
    gap: 0.4375rem;
    margin: 0.875rem 0 0;
    font-size: 0.6875rem;
    line-height: 1.4;
    color: var(--color-text-muted, inherit);
}

.kiwi-asl-modal-foot {
    position: sticky;
    bottom: 0;
    display: flex;
    gap: 0.625rem;
    margin: 1rem -1rem -1rem;
    padding: 0.875rem 1rem 1rem;
    border-top: 1px solid var(--color-border, rgba(127, 127, 127, 0.2));
    background: var(--color-surface, #fff);
}

.kiwi-asl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4375rem;
    height: 2.5rem;
    padding: 0 1rem;
    border: 0;
    border-radius: 6.1875rem;
    font-family: inherit;
    font-size: 0.8438rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
}

/* cancel keeps its natural width; send fills the row so its label stays on one line (v16) */
.kiwi-asl-btn.is-cancel {
    flex: 0 0 auto;
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.4));
    background: none;
    color: var(--color-text-secondary, inherit);
}

.kiwi-asl-btn.is-send {
    flex: 1;
    background: var(--color-danger, #c0392b);
    color: var(--color-on-danger, #fff);
}

.kiwi-asl-btn.is-send:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

@media (max-width: 560px) {
    .kiwi-asl-overlay {
        align-items: flex-end;
        padding: 0;
    }

    .kiwi-asl-modal {
        width: 100%;
        max-width: 100%;
        max-height: 90vh;
        border-radius: 1em 1em 0 0;
        animation: kiwi-asl-modal-sheet 0.2s ease-out;
    }
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

    .kiwi-userbox .kiwi-userbox-header i {
        display: block;
    }

    .kiwi-userbox .kiwi-userbox-basicinfo {
        padding: 10px 10px;
        margin-bottom: 20px;
    }

    .kiwi-userbox-actions {
        padding: 0;
        width: 100%;
        box-sizing: border-box;
    }

    .kiwi-userbox-plugin-actions {
        padding: 0;
    }

    .kiwi-userbox-actions .kiwi-userbox-action {
        width: 200px;
        clear: both;
        display: block;
        margin: 0 auto 20px auto;
    }
}
</style>
