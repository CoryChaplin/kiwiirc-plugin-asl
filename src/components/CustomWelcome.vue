<template>
    <startup-layout ref="layout"
                    class="kiwi-welcome-asl kiwi-welcome-asl-section
                           kiwi-welcome-asl-section-connection"
    >
        <template v-if="startupOptions.altComponent" v-slot:connection>
            <component :is="startupOptions.altComponent" @close="onAltClose" />
        </template>
        <template v-else v-slot:connection>
            <div v-if="showLoader" class="chatnow-loader">
                <div class="chatnow-loader__logo">
                    <svg
                        viewBox="-12 -12 725 336"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        class="chatnow-loader__svg"
                    >
                        <path
                            class="chatnow-loader__path"
                            pathLength="100"
                            d="M17.1218 311.305C7.85821 310.313 3.43138 306.992
                               1.08182 299.269C-0.406327 294.379 -0.337072 15.8619
                               1.15337 10.9192C2.69078 5.82101 6.22965 2.66797
                               11.8623 1.37781C18.5759 -0.159951 292.638 -0.214026
                               299.301 1.3211C305.326 2.70913 311.493 6.60047
                               314.964 11.2053C324.216 23.4778 322.718 41.9077
                               311.66 51.8557C307.053 56 301.78 58.1583 293.419
                               59.3219C289.329 59.891 251.132 60.1641 175.602
                               60.1641H63.8365L63.8358 90.8739L63.835 121.584
                               L82.0166 121.336C101.868 121.066 117.975 122.069
                               124.873 124.005C143.415 129.211 152.186 156.501
                               140.744 173.382C136.908 179.04 132.004 181.972
                               123.118 183.919C116.884 185.285 112.1 185.572
                               89.8372 185.915L63.8365 186.315V219.085V251.856
                               H220.206H376.575L376.834 139.775C377.074 35.6632
                               377.192 27.2766 378.482 21.8257C381.538 8.91506
                               388.222 2.72796 401.301 0.703922C409.637 -0.586135
                               684.69 0.0514879 689.399 1.37179C694.405 2.7756
                               697.623 5.53657 699.303 9.87186C700.692 13.454
                               700.762 19.4019 700.963 152.089C701.09 235.782
                               700.882 292.674 700.436 295.891C698.898 306.994
                               695.376 310.003 682.191 311.478C676.036 312.166
                               671.561 312.173 664.037 311.505C649.142 310.184
                               644.557 307.291 642.555 297.952C641.976 295.253
                               641.714 257.539 641.714 177.097V60.1641H545.956
                               H450.199L449.906 174.984C449.691 258.887 449.366
                               290.837 448.699 293.644C447.278 299.622 444.305
                               305.43 441.726 307.268C440.433 308.189 437.309
                               309.56 434.783 310.314C430.461 311.606 418.201
                               311.693 226.487 311.799C114.45 311.86 20.2356
                               311.638 17.1218 311.305Z"
                            stroke="white"
                            stroke-width="8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </div>
                <div class="chatnow-loader__content">
                    <div class="chatnow-loader__dots">
                        <div class="chatnow-loader__dot" style="animation-delay: 0s;" />
                        <div class="chatnow-loader__dot" style="animation-delay: 0.15s;" />
                        <div class="chatnow-loader__dot" style="animation-delay: 0.3s;" />
                    </div>
                    <p class="chatnow-loader__text">{{ $t('logging_in') }}</p>
                </div>
            </div>
            <div class="kiwi-welcome-overlay">
                <!-- Background Bubbles -->
                <div class="kiwi-welcome-bubble kiwi-welcome-bubble-1"/>
                <div class="kiwi-welcome-bubble kiwi-welcome-bubble-2"/>
                <div class="kiwi-welcome-bubble kiwi-welcome-bubble-3"/>

                <div class="kiwi-welcome-card animate-zoom-in">
                    <h1 class="kiwi-welcome-title" v-html="greetingText" />

                    <form class="kiwi-welcome-form" @submit.prevent="formSubmit">
                        <!-- Errors -->
                        <div v-if="network && (connectErrors.length > 0 || network.state_error)"
                             class="kiwi-welcome-error"
                        >
                            <template v-if="connectErrors.length > 0">
                                <span v-for="err in connectErrors" :key="err" class="block">
                                    {{ readableStateError(err) }}
                                </span>
                            </template>
                            <template v-else>
                                <span class="block">{{ $t('network_noconnect') }}</span>
                                <span class="block">
                                    {{ readableStateError(network.state_error) }}
                                </span>
                            </template>
                        </div>

                        <!-- 1. Nick -->
                        <div class="kiwi-input-wrapper">
                            <div class="kiwi-input-icon">
                                <i class="fa fa-user"/>
                            </div>
                            <input v-model="nick" type="text" required
                                   :placeholder="$t('nick')"
                                   class="kiwi-input"
                                   @input="nick = nick.replace(/\s/g, '')"
                                   @focus="nickFocus"
                            >
                        </div>

                        <!-- 2. Password Toggle -->
                        <div v-if="showPass && toggablePass" class="kiwi-toggle-wrapper">
                            <label for="password-toggle" class="kiwi-toggle-label">
                                {{ $t('password_have') }}
                            </label>
                            <button id="password-toggle" type="button"
                                    :class="['kiwi-toggle', show_password_box ? 'active' : '']"
                                    @click="show_password_box = !show_password_box"
                            >
                                <span :class="[
                                    'kiwi-toggle-thumb',
                                    show_password_box ? 'active' : ''
                                ]"
                                />
                            </button>
                        </div>

                        <!-- Password Input -->
                        <div v-if="showPass && (show_password_box || !toggablePass)"
                             class="kiwi-input-wrapper animate-slide-down"
                        >
                            <div class="kiwi-input-icon">
                                <i class="fa fa-key"/>
                            </div>
                            <input v-model="password" type="password"
                                   :placeholder="$t('password')"
                                   :class="[
                                       'kiwi-input',
                                       hasPasswordError ? 'kiwi-input-error' : ''
                                   ]"
                            >
                        </div>

                        <!-- 3. Age + Ville (one row) -->
                        <div class="kiwi-asl-age-ville-row">
                            <div class="kiwi-input-wrapper kiwi-asl-age-ville-row__age">
                                <div class="kiwi-input-icon">
                                    <i class="fa fa-calendar"/>
                                </div>
                                <input v-model="age" type="number" min="15" max="99"
                                       :placeholder="$t('plugin-asl:age')"
                                       :class="[
                                           'kiwi-input',
                                           ageTooYoung ? 'kiwi-input-warning' : ''
                                       ]"
                                       @blur="onAgeBlur"
                                >
                            </div>
                            <div v-if="showLocation"
                                 class="kiwi-input-wrapper kiwi-asl-age-ville-row__ville"
                            >
                                <div class="kiwi-input-icon">
                                    <i class="fa fa-map-marker"/>
                                </div>
                                <input v-model="location" type="text"
                                       :placeholder="$t('plugin-asl:location')"
                                       class="kiwi-input kiwi-input--with-gps"
                                >
                                <button v-if="gpsAvailable"
                                        type="button"
                                        class="kiwi-asl-gps-btn"
                                        :title="$t('plugin-asl:gps_locate')"
                                        @click="requestGps"
                                >
                                    <i :class="[
                                        'fa',
                                        gpsLoading ? 'fa-spin fa-spinner' : 'fa-crosshairs'
                                    ]"
                                    />
                                </button>
                            </div>
                        </div>
                        <!-- Age hint — under the age field, mirrors irception #age-hint -->
                        <p v-if="ageTooYoung" class="kiwi-asl-age-hint">
                            <i class="fa fa-exclamation-triangle fa-xs" aria-hidden="true"/>
                            {{ $t('plugin-asl:age_hint', { min: ageMin }) }}
                        </p>

                        <div v-if="showRealname" class="kiwi-input-wrapper"
                             style="margin-top: 0.5rem;"
                        >
                            <input v-model="realname" type="text" class="kiwi-input"
                                   :placeholder="$t('whois_realname')"
                            >
                        </div>

                        <!-- 4. Gender — Femme / Homme / Secret per spec -->
                        <div class="kiwi-gender-group">
                            <button type="button"
                                    :class="['kiwi-gender-btn', sex === 'F' ? 'active-f' : '']"
                                    @click="sex = 'F'"
                            >
                                <i :class="[
                                    'fa mr-1.5', sex === 'F' ? 'fa-check-circle' : 'fa-circle-o'
                                ]"
                                />
                                <span>&nbsp;{{ $t('plugin-asl:female') }}</span>
                            </button>
                            <button type="button"
                                    :class="['kiwi-gender-btn', sex === 'M' ? 'active-m' : '']"
                                    @click="sex = 'M'"
                            >
                                <i :class="[
                                    'fa mr-1.5', sex === 'M' ? 'fa-check-circle' : 'fa-circle-o'
                                ]"
                                />
                                <span>&nbsp;{{ $t('plugin-asl:male') }}</span>
                            </button>
                            <button type="button"
                                    :class="['kiwi-gender-btn', sex === 'U' ? 'active-u' : '']"
                                    @click="sex = 'U'"
                            >
                                <i :class="[
                                    'fa mr-1.5', sex === 'U' ? 'fa-check-circle' : 'fa-circle-o'
                                ]"
                                />
                                <span>&nbsp;{{ $t('plugin-asl:other') }}</span>
                            </button>
                        </div>

                        <!-- 6. Topics chips -->
                        <topic-chip-group v-if="showTopics && formConfig"
                                          :label="$t('plugin-asl:topics_section_label')"
                                          :topics="formConfig.topics || []"
                                          :selected-topics="selectedTopics"
                                          :hidden-topics="ruleResult.hiddenTopics"
                                          :disabled-topics="ruleResult.disabledTopics"
                                          @toggle="onTopicToggle"
                        />

                        <!-- Topic rule correction messages -->
                        <div v-if="topicErrors.length" class="kiwi-asl-topic-errors">
                            <p v-for="msg in topicErrors" :key="msg"
                               class="kiwi-asl-topic-error"
                            >
                                <i class="fa fa-exclamation-triangle" aria-hidden="true"/>
                                {{ msg }}
                            </p>
                        </div>

                        <!-- 7. Suggestions cloud -->
                        <suggestions-cloud v-if="showTopics && formConfig"
                                           :label="$t('plugin-asl:suggestions_label')"
                                           :selected-topics="selectedTopics"
                                           :topics="formConfig.topics || []"
                                           :suggestions="serverSuggestions"
                                           :current-channels="channelNames"
                                           :blocked-channels="ruleResult.blockedChannels"
                                           :removed-tag-cloud-channels="removedTagCloudChannels"
                                           @pick="onSuggestionPick"
                        />

                        <!-- 8. Selected channels -->
                        <selected-channels-list v-if="showChannel"
                                                :label="$t('plugin-asl:my_channels_label')"
                                                :channels="selectedChannelEntries"
                                                :locked-channels="ruleResult.lockedChannels"
                                                :blocked-channels="ruleResult.blockedChannels"
                                                :max-channels="maxChannels"
                                                :channel-categories="formConfig
                                                    ? (formConfig.channelCategories || [])
                                                    : []"
                                                @add="onChannelAdd"
                                                @remove="onChannelRemove"
                        />

                        <!-- Terms -->
                        <div v-if="termsContent" class="kiwi-terms">
                            <div v-if="!termsAutoAccept">
                                <input id="terms" v-model="termsAccepted" type="checkbox">
                                <label for="terms">{{ $t('plugin-asl:accept_terms') }}</label>
                            </div>
                            <div class="kiwi-terms-content" v-html="termsContent" />
                        </div>

                        <captcha :network="network" />

                        <!-- Submit -->
                        <div class="kiwi-submit-container">
                            <dynamic-cta v-if="!network || network.state === 'disconnected'"
                                         :ready="readyToStart"
                                         :count="selectedChannelEntries.length"
                                         :pending="false"
                                         :label="ctaLabel"
                                         @submit="formSubmit"
                            />
                            <dynamic-cta v-else
                                         :ready="false"
                                         :count="0"
                                         :pending="true"
                                         :label="$t('logging_in')"
                                         type="button"
                            />
                        </div>

                        <!-- Nick hint — shown when nick is missing, hidden once filled -->
                        <p :class="[
                            'kiwi-asl-nick-hint',
                            !nick ? 'is-visible' : 'is-hidden'
                        ]"
                        >
                            <i class="fa fa-arrow-up" aria-hidden="true"/>
                            {{ $t('plugin-asl:nick_hint') }}
                        </p>

                        <p class="kiwi-asl-cgu-text">
                            En vous connectant, vous reconnaissez accepter les <strong>
                                <a href="https://www.europnet.org/fr/a-propos-d-europnet/legal/cgu.html" target="_blank" rel="noopener noreferrer" class="kiwi-asl-cgu-link">CGU</a>
                            </strong>.
                        </p>
                        <div v-html="footerText" />
                    </form>
                </div>
            </div>
        </template>
    </startup-layout>
</template>

<script>

/* global _:true */
/* global kiwi:true */

import * as config from '../config.js';
import * as utils from '../libs/utils.js';
import * as irceptionApi from '../libs/irceptionApi.js';
import { loadIdent, generateIdent, storeIdent } from '../libs/irceptionIdent.js';
import { evaluateRules, isTopicHeld } from '../libs/irceptionRules.js';
import { readWelcomeState, writeWelcomeState } from '../libs/welcomeStorage.js';

import TopicChipGroup from './welcome/TopicChipGroup.vue';
import SuggestionsCloud from './welcome/SuggestionsCloud.vue';
import SelectedChannelsList from './welcome/SelectedChannelsList.vue';
import DynamicCta from './welcome/DynamicCta.vue';

let Misc = kiwi.require('helpers/Misc');
let Logger = kiwi.require('libs/Logger');
let BouncerProvider = kiwi.require('libs/BouncerProvider');
let Captcha = kiwi.require('components/Captcha');
let StartupLayout = kiwi.require('components/startups/CommonLayout');

let log = Logger.namespace('Welcome.vue');

const RECOMMEND_DEBOUNCE_MS = 300;
const REVERSE_GEOCODE_DEBOUNCE_MS = 600;

function freshRuleResult() {
    return {
        disabledTopics: {},
        hiddenTopics: {},
        blockedChannels: {},
        channelsToRemove: [],
        lockedChannels: [],
        corrections: [],
    };
}

export default {
    components: {
        Captcha,
        StartupLayout,
        TopicChipGroup,
        SuggestionsCloud,
        SelectedChannelsList,
        DynamicCta,
    },
    data: function data() {
        return {
            chatNowMode: false,
            connectErrors: [],
            network: null,
            nick: '',
            password: '',
            showChannel: true,
            showPass: true,
            toggablePass: true,
            showNick: true,
            show_password_box: false,
            connectWithoutChannel: false,
            showPlainText: false,
            captchaReady: false,
            termsAccepted: false,
            ageInt: null,
            sex: null,
            location: '',
            realname: '',

            // Irception form config (topics, rules, channelCategories, maxChannels...).
            // Null when /form/config hasn't loaded yet OR when irception is
            // unreachable — in that case we degrade to a basic connection form
            // (no topic chips, no tag cloud, no recommendations) but every
            // other field stays functional. No user-facing error.
            formConfig: null,

            // Rule evaluation result, refreshed on any state change.
            ruleResult: freshRuleResult(),

            // Error messages from rule corrections (e.g. "Rencontres nécessite 16 ans").
            // Cleared after a short delay like irception's showTopicError.
            topicErrors: [],
            topicErrorTimer: null,

            // Selected topic keys (from formConfig.topics[].key).
            selectedTopics: [],

            // [{ name: '#chan', source: 'manual' | 'auto' | 'stored' }]
            selectedChannelEntries: [],

            // Channels the user explicitly removed; /recommend won't re-add them.
            removedChannels: [],

            // Server-supplied per-topic suggestions, last from /recommend/json.
            serverSuggestions: {},

            // Geolocation enrichment for /recommend/json.
            geoLat: null,
            geoLon: null,
            geoCountry: '',

            // Cache key of the last recommend() call params; skips the fetch
            // when nothing meaningful changed (mirrors form.js previousSuggestionValues).
            previousSuggestionKey: '',

            // GPS HTML5
            gpsAvailable: typeof navigator !== 'undefined' && !!navigator.geolocation,
            gpsLoading: false,

            // Age warning — only show after user has touched the field (form.js ageInteracted).
            ageInteracted: false,

            // Channels the user removed from the tag cloud; not re-shown until
            // the user explicitly re-adds them (mirrors form.js removedTagCloudChannels).
            removedTagCloudChannels: [],
        };
    },
    computed: {
        age: {
            get() {
                return this.ageInt;
            },
            set(val) {
                if (!val) {
                    this.ageInt = null;
                    return;
                }
                this.ageInt = parseInt(val, 10) || null;
            },
        },
        allowedAge() {
            return config.getSetting('allowedAge');
        },
        sexes() {
            return config.getSetting('sexes');
        },
        showLocation() {
            return config.getSetting('showLocation');
        },
        showRealname() {
            let showRealname = config.getSetting('showRealname');
            let gecosType = config.getSetting('gecosType');
            return showRealname && gecosType === 1;
        },
        showTopics() {
            return config.getSetting('showTopics') !== false;
        },
        // Minimum plausible age from formConfig (13). Used for the inline hint
        // below the age field — mirrors irception's CFG.minAge check, not the
        // plugin's allowedAge.min which controls the Connect button separately.
        ageMin() {
            return (this.formConfig && this.formConfig.minAge) || 15;
        },
        ageTooYoung() {
            return this.ageInteracted && this.ageInt !== null && this.ageInt < this.ageMin;
        },
        requiredFields() {
            return this.$state.getSetting('settings.plugin-asl.requiredFields');
        },
        isAgeValid() {
            if (this.requiredFields.includes('age') && !this.ageInt) {
                return false;
            }
            return (
                !this.ageInt ||
                (this.ageInt >= this.allowedAge.min && this.ageInt <= this.allowedAge.max)
            );
        },
        isSexValid() {
            return !(this.requiredFields.includes('sex') && !this.sex);
        },
        isLocationValid() {
            return !(this.requiredFields.includes('location') && !this.location);
        },
        isRealnameValid() {
            return !(this.requiredFields.includes('realname') && !this.realname);
        },
        aslReady() {
            return (
                this.isAgeValid &&
                this.isSexValid &&
                this.isLocationValid &&
                this.isRealnameValid
            );
        },
        startupOptions() {
            return this.$state.settings.startupOptions;
        },
        greetingText() {
            let greeting = this.$state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ? greeting : this.$t('start_greeting');
        },
        footerText() {
            let footer = this.$state.settings.startupOptions.footerText;
            return typeof footer === 'string' ? footer : '';
        },
        ctaLabel() {
            let configured = this.$state.settings.startupOptions.buttonText;
            return typeof configured === 'string' && configured
                ? configured
                : this.$t('plugin-asl:cta_label');
        },
        termsContent() {
            let terms = this.$state.settings.startupOptions.termsContent;
            return typeof terms === 'string' ? terms : '';
        },
        termsAutoAccept() {
            return !!this.$state.settings.startupOptions.termsAutoAccept;
        },
        isNickValid() {
            let nickPatternStr = this.$state.setting('startupOptions.nick_format');
            let nickPattern = '';
            if (!nickPatternStr) {
                nickPattern = /^[a-z_\\[\]{}^`|][a-z0-9_\-\\[\]{}^`|]*$/i;
            } else {
                let pattern = '';
                let flags = '';
                if (nickPatternStr[0] === '/') {
                    let pos = nickPatternStr.lastIndexOf('/');
                    pattern = nickPatternStr.substring(1, pos);
                    flags = nickPatternStr.substr(pos + 1);
                } else {
                    pattern = _.escapeRegExp(nickPatternStr);
                    flags = 'i';
                }
                try {
                    nickPattern = new RegExp(pattern, flags);
                } catch (error) {
                    log.error('Nick format error: ' + error.message);
                    return false;
                }
            }
            return this.nick.match(nickPattern);
        },
        hasPasswordError() {
            if (!this.network) return false;
            let isSaslError = (err) => {
                let msg = typeof err === 'string' ? err : Misc.networkErrorMessage(err);
                return msg === 'SASL authentication failed';
            };
            let hasSaslError = this.network.state_error && isSaslError(this.network.state_error);
            let hasConnectError = this.connectErrors.some((err) => isSaslError(err));
            return hasSaslError || hasConnectError;
        },
        channel() {
            return this.selectedChannelEntries.map((c) => c.name).join(',');
        },
        channelNames() {
            return this.selectedChannelEntries.map((c) => c.name);
        },
        manualChannelNames() {
            return this.selectedChannelEntries
                .filter((c) => c.source === 'manual' || c.source === 'stored')
                .map((c) => c.name);
        },
        // Everything the user picked himself, tag cloud included.
        chosenChannelNames() {
            return this.selectedChannelEntries
                .filter((c) => c.source !== 'auto')
                .map((c) => c.name);
        },
        maxChannels() {
            return (this.formConfig && this.formConfig.maxChannels) || 8;
        },
        supportChannelSet() {
            let channels = (this.formConfig && this.formConfig.support_channels) || [];
            return new Set(channels.map((c) => c.toLowerCase()));
        },
        ruleState() {
            return {
                age: this.ageInt,
                gender: this.sex || '',
                topics: this.selectedTopics.slice(),
                channels: this.channelNames.slice(),
                manualChannels: this.manualChannelNames.slice(),
            };
        },
        readyToStart() {
            let ready = !!this.nick;
            if (!this.connectWithoutChannel && !this.channel) {
                ready = false;
            }
            if (!this.connectWithoutChannel) {
                let bufferObjs = Misc.extractBuffers(this.channel);
                bufferObjs.forEach((bufferObj) => {
                    if ('#&'.indexOf(bufferObj.name[0]) === -1) {
                        ready = false;
                    }
                });
            }
            if (!this.toggablePass && !this.password) {
                ready = false;
            }
            if (!this.isNickValid) {
                ready = false;
            }
            if (this.termsContent && !this.termsAccepted && !this.termsAutoAccept) {
                ready = false;
            }
            if (!this.aslReady) {
                ready = false;
            }
            return ready;
        },
        showLoader() {
            if (!this.chatNowMode) return false;
            if (this.connectErrors.length) return false;
            if (this.network && this.network.state === 'disconnected') return false;
            return true;
        },
    },
    watch: {
        show_password_box(newVal) {
            if (newVal === false) {
                this.password = '';
            }
        },
        ageInt() {
            this.applyRules();
            this.scheduleRecommend();
        },
        sex() {
            this.applyRules();
            this.scheduleRecommend();
        },
        location() {
            this.scheduleReverseGeocode();
            this.scheduleRecommend();
        },
        selectedTopics() {
            this.applyRules();
            this.scheduleRecommend();
        },
        selectedChannelEntries() {
            this.applyRules();
            // Manual channels are part of the recommend key (autoChannelsSuppressAt).
            this.scheduleRecommend();
        },
    },
    created: function created() {
        // Stable debounced helpers, bound per-instance.
        this.debouncedRecommend = _.debounce(() => this.recommend(), RECOMMEND_DEBOUNCE_MS);
        this.debouncedReverseGeocode = _.debounce(
            () => this.reverseGeocode(),
            REVERSE_GEOCODE_DEBOUNCE_MS
        );

        let options = this.startupOptions;
        let connectOptions = this.connectOptions();

        let previousNet = null;
        if (connectOptions.hostname.trim()) {
            previousNet = this.$state.getNetworkFromAddress(connectOptions.hostname.trim());
        }

        // Thin adapter for the ident cascade (KiwiStorage tier).
        // Reads/writes net.settings.pluginAsl[key]. Null when no prior network.
        this.welcomeStorage = previousNet ? {
            get(key) {
                let s = previousNet.settings && previousNet.settings.pluginAsl;
                return (s && s[key]) || null;
            },
            set(key, value) {
                if (!previousNet.settings) kiwi.Vue.set(previousNet, 'settings', {});
                if (!previousNet.settings.pluginAsl) {
                    kiwi.Vue.set(previousNet.settings, 'pluginAsl', {});
                }
                kiwi.Vue.set(previousNet.settings.pluginAsl, key, value);
            },
        } : null;

        if (Misc.queryStringVal('nick')) {
            this.nick = Misc.queryStringVal('nick');
        } else if (previousNet && previousNet.connection.nick) {
            this.nick = previousNet.connection.nick;
        }
        this.nick = this.processNickRandomNumber(this.nick || '');

        if (options.password) {
            this.password = options.password;
        } else if (
            previousNet &&
            previousNet.password && (
                !Misc.queryStringVal('nick') ||
                previousNet.connection.nick === Misc.queryStringVal('nick')
            )
        ) {
            this.password = previousNet.password;
            this.show_password_box = true;
        } else {
            this.password = '';
        }

        let parsedGecos = null;
        if (config.getSetting('welcomeUsesLocalStorage') && previousNet && previousNet.gecos) {
            parsedGecos = utils.parseGecos(previousNet.gecos);
        }

        let queryKeys = config.getSetting('queryKeys');
        if (Misc.queryStringVal(queryKeys.age)) {
            this.age = Misc.queryStringVal(queryKeys.age);
        } else if (typeof options.age !== 'undefined') {
            this.age = options.age;
        } else if (parsedGecos && parsedGecos.asl) {
            this.age = parsedGecos.asl.a;
        }

        if (Misc.queryStringVal(queryKeys.sex)) {
            this.sex = Misc.queryStringVal(queryKeys.sex);
        } else if (typeof options.sex !== 'undefined') {
            this.sex = options.sex;
        } else if (parsedGecos && parsedGecos.asl) {
            this.sex = utils.getSexChar(parsedGecos.asl.s);
        }

        if (Misc.queryStringVal(queryKeys.location)) {
            this.location = Misc.queryStringVal(queryKeys.location);
        } else if (typeof options.location !== 'undefined') {
            this.location = options.location;
        } else if (parsedGecos && parsedGecos.asl) {
            this.location = parsedGecos.asl.l;
        }

        if (Misc.queryStringVal(queryKeys.realname)) {
            this.realname = Misc.queryStringVal(queryKeys.realname);
        } else if (typeof options.realname !== 'undefined') {
            this.realname = options.realname;
        } else if (this.showRealname && parsedGecos && parsedGecos.realname) {
            this.realname = parsedGecos.realname;
        }

        // Restore plugin-owned welcome state from previousNet.settings.pluginAsl
        let stored = readWelcomeState(previousNet);
        this.removedChannels = stored.removedChannels.slice();

        // Build initial channel entries: previousNet.buffers tagged 'manual' if
        // listed in stored.manualChannels, else 'stored'. URL/options channels
        // are then merged in as 'manual' (and clear themselves from
        // removedChannels — see plan § Coexistence URL).
        let channelEntries = [];
        let manualSet = new Set(stored.manualChannels.map((c) => c.toLowerCase()));
        if (previousNet) {
            previousNet.buffers
                .filter((b) => b.isChannel())
                .forEach((b) => {
                    let source = manualSet.has(b.name.toLowerCase()) ? 'manual' : 'stored';
                    channelEntries.push({ name: b.name, source });
                });
        }

        // Carried-from-config channel(s) — treat as manual (explicit setup).
        if (channelEntries.length === 0 && options.channel) {
            options.channel.split(',')
                .map((c) => c.trim())
                .filter(Boolean)
                .forEach((name) => channelEntries.push({ name, source: 'manual' }));
        }

        // URL hash + ?channel= override / merge as manual; un-remove from
        // removedChannels (URL = source d'autorité, voir plan).
        let urlChannels = [];
        let hashChannel = '';
        try {
            hashChannel = decodeURIComponent(window.location.hash).replace(/^#/, '');
        } catch (err) {
            log.error('Invalid URL hash encoding:', err);
        }
        if (hashChannel) {
            urlChannels.push('#' + hashChannel);
        }
        if (Misc.queryStringVal(queryKeys.channel)) {
            let qsChannels = ('#' + Misc.queryStringVal(queryKeys.channel).replace(/,/g, ',#'))
                .split(',');
            urlChannels.push(...qsChannels);
        }
        urlChannels.forEach((name) => {
            let normalized = name.trim();
            if (!normalized) return;
            if (!normalized.startsWith('#')) normalized = '#' + normalized;
            // Un-remove
            this.removedChannels = this.removedChannels.filter(
                (c) => c.toLowerCase() !== normalized.toLowerCase()
            );
            // Promote or insert as manual
            let existing = channelEntries.find(
                (c) => c.name.toLowerCase() === normalized.toLowerCase()
            );
            if (existing) {
                existing.source = 'manual';
            } else {
                channelEntries.push({ name: normalized, source: 'manual' });
            }
        });
        this.selectedChannelEntries = channelEntries;

        // Restore selected topics — they will be filtered/corrected after
        // formConfig and rules load (e.g. hot dropped if age < 18 stored).
        this.selectedTopics = stored.topics.slice();

        this.showChannel = typeof options.showChannel === 'boolean' ? options.showChannel : true;
        this.showNick = typeof options.showNick === 'boolean' ? options.showNick : true;
        this.showPass = typeof options.showPassword === 'boolean' ? options.showPassword : true;
        this.toggablePass = typeof options.toggablePassword === 'boolean'
            ? options.toggablePassword
            : true;

        this.connectWithoutChannel = !!options.allowNoChannel;

        if (options.bouncer) {
            this.toggablePass = false;
            this.showPass = true;
            this.showChannel = false;
            this.connectWithoutChannel = true;

            let bouncer = new BouncerProvider(this.$state);
            bouncer.enable(
                connectOptions.hostname,
                connectOptions.port,
                connectOptions.tls,
                connectOptions.direct,
                connectOptions.direct_path
            );
        }

        // Legacy EuropNet query strings — override prior params.
        if (Misc.queryStringVal(queryKeys.sexe)) {
            this.sex = Misc.queryStringVal(queryKeys.sexe);
        }
        if (Misc.queryStringVal(queryKeys.ville)) {
            this.location = Misc.queryStringVal(queryKeys.ville);
        }

        // Boot irception-side enrichment in parallel.
        this.loadFormConfigAndGeo();

        const isChatNow = !!(
            Misc.queryStringVal('chatnow') && Misc.queryStringVal('chatnow') === '1'
        );
        if (isChatNow && this.nick && (this.channel || this.connectWithoutChannel)) {
            this.chatNowMode = true;
        }
    },
    beforeDestroy() {
        if (this.debouncedRecommend) this.debouncedRecommend.cancel();
        if (this.debouncedReverseGeocode) this.debouncedReverseGeocode.cancel();
    },
    methods: {
        // ---------- Boot helpers ----------

        async loadFormConfigAndGeo() {
            // Tiers plugin : backfill tous les tiers (cookie inclus) + sync localStorage
            // pour que getJson() puisse envoyer X-Client-Ident sur /form/config.
            const storedIdent = await loadIdent(this.welcomeStorage);
            if (storedIdent) {
                storeIdent(storedIdent, this.welcomeStorage);
            }

            // Best effort: each call is independent so a /form/config failure
            // doesn't prevent GeoIP from pre-filling the location, and an
            // irception outage just leaves the form in basic mode (no chips,
            // no tag cloud, no recommendations) — never a user-facing error.
            let [formConfigResult, geo] = await Promise.all([
                irceptionApi.loadFormConfig({ kiwiStorage: this.welcomeStorage }).catch((err) => {
                    log.debug('irception /form/config unavailable:', err);
                    return null;
                }),
                irceptionApi.loadGeoIP().catch(() => null),
            ]);
            if (formConfigResult) {
                this.formConfig = formConfigResult;
                // enrich the official-channels set (userbox Moderator badge) from the same load
                config.addOfficialChannels(formConfigResult);
            }
            if (geo) {
                if (!this.location && geo.city) this.location = geo.city;
                if (geo.country_code) this.geoCountry = geo.country_code;
                if (geo.lat != null) this.geoLat = geo.lat;
                if (geo.long != null) this.geoLon = geo.long;
            }
            if (this.formConfig) {
                this.applyRules();
                this.scheduleRecommend();
            }
            if (this.chatNowMode) {
                this.startUp();
            }
        },

        // ---------- Rule application ----------

        applyRules() {
            if (!this.formConfig || !this.formConfig.rules) {
                this.ruleResult = freshRuleResult();
                return;
            }

            let result = evaluateRules(this.formConfig.rules, this.ruleState);

            // Apply topic corrections (cascading double-pass — see form.js).
            let hadTopicCorrections = false;
            let newErrors = [];
            result.corrections.forEach((c) => {
                if (c.removeTopic && this.selectedTopics.includes(c.removeTopic)) {
                    this.selectedTopics = this.selectedTopics.filter((t) => t !== c.removeTopic);
                    this.dropTriggerChannels(c.removeTopic);
                    hadTopicCorrections = true;
                    if (c.message) newErrors.push(c.message);
                }
                if (c.activateTopic && !this.selectedTopics.includes(c.activateTopic)) {
                    this.selectedTopics.push(c.activateTopic);
                    hadTopicCorrections = true;
                }
            });

            if (hadTopicCorrections) {
                result = evaluateRules(this.formConfig.rules, this.ruleState);
                result.corrections.forEach((c) => {
                    if (c.removeTopic && this.selectedTopics.includes(c.removeTopic)) {
                        this.selectedTopics = this.selectedTopics.filter(
                            (t) => t !== c.removeTopic
                        );
                    }
                });
            }

            // Force-remove blocked channels (rules trump source — e.g. #accueil
            // dropped when hot is active via channel_conditional).
            if (result.channelsToRemove.length) {
                let toRemove = new Set(result.channelsToRemove.map((c) => c.toLowerCase()));
                this.selectedChannelEntries = this.selectedChannelEntries.filter(
                    (c) => !toRemove.has(c.name.toLowerCase())
                );
            }

            // Remove support channels restored from previous sessions (non-manual only).
            if (this.supportChannelSet.size) {
                let filtered = this.selectedChannelEntries.filter(
                    (c) => c.source === 'manual' || !this.supportChannelSet.has(c.name.toLowerCase())
                );
                if (filtered.length !== this.selectedChannelEntries.length) {
                    this.selectedChannelEntries = filtered;
                }
            }

            this.ruleResult = result;

            // Surface correction messages as transient toasts (auto-clear 4s).
            if (newErrors.length) {
                this.topicErrors = [...new Set(newErrors)];
                clearTimeout(this.topicErrorTimer);
                this.topicErrorTimer = setTimeout(() => {
                    this.topicErrors = [];
                }, 5500);
            }
        },

        // ---------- /recommend/json ----------

        scheduleRecommend() {
            if (!this.formConfig) return;
            this.debouncedRecommend();
        },

        async recommend() {
            if (!this.formConfig) return;
            // Short-circuit when params haven't changed (mirrors form.js
            // previousSuggestionValues check — avoids redundant fetches).
            let position = this.geoLat != null && this.geoLon != null
                ? this.geoLat + ',' + this.geoLon : '';
            let key = [
                this.ageInt || '',
                this.sex || '',
                this.location || '',
                this.geoCountry || '',
                position,
                this.selectedTopics.slice().sort().join(','),
                this.chosenChannelNames.slice().sort().join(','),
            ].join('|');
            if (key === this.previousSuggestionKey) return;
            this.previousSuggestionKey = key;
            try {
                let data = await irceptionApi.recommend({
                    age: this.ageInt || '',
                    gender: this.sex || '',
                    location: this.location || '',
                    country: this.geoCountry || '',
                    position,
                    topics: this.selectedTopics,
                    manualChannels: this.manualChannelNames,
                    chosenChannels: this.chosenChannelNames,
                });
                this.applyRecommendations(data);
            } catch (err) {
                // Spec § Règles d'erreur : silent — keep current state, retry on
                // next user interaction.
                this.previousSuggestionKey = '';
                log.debug('recommend failed:', err);
            }
        },

        applyRecommendations(data) {
            let channelsBlock = (data && data.channels) || {};
            let recommended = []
                .concat(channelsBlock.default_channels || [])
                .concat(channelsBlock.age_channels || [])
                .concat(channelsBlock.local_channels || [])
                .concat(channelsBlock.theme_channels || []);
            let recommendedSet = new Set(recommended.map((c) => c.toLowerCase()));

            // 1. Drop auto channels that are no longer recommended.
            let kept = this.selectedChannelEntries.filter((entry) => {
                if (entry.source !== 'auto') return true;
                return recommendedSet.has(entry.name.toLowerCase());
            });

            // 2. Add new auto channels (skip those manually removed or already
            // present, or blocked by the rules engine).
            let blocked = this.ruleResult.blockedChannels || {};
            let removedSet = new Set(this.removedChannels.map((c) => c.toLowerCase()));
            let presentSet = new Set(kept.map((c) => c.name.toLowerCase()));
            recommended.forEach((name) => {
                let lower = name.toLowerCase();
                if (presentSet.has(lower)) return;
                if (removedSet.has(lower)) return;
                if (name in blocked) return;
                if (kept.length >= this.maxChannels) return;
                kept.push({ name, source: 'auto' });
                presentSet.add(lower);
            });

            this.selectedChannelEntries = kept;
            // PHP's json_encode emits [] (Array) instead of {} (Object) for
            // empty associative arrays, so /recommend/json returns
            // "suggestions": [] when no topic is active. Normalise to a plain
            // object so the SuggestionsCloud prop contract stays strict.
            let rawSuggestions = data && data.suggestions;
            this.serverSuggestions = (rawSuggestions && !Array.isArray(rawSuggestions))
                ? rawSuggestions
                : {};
        },

        // ---------- Reverse geocoding (Nominatim) ----------

        scheduleReverseGeocode() {
            this.debouncedReverseGeocode();
        },

        requestGps() {
            if (!navigator.geolocation || this.gpsLoading) return;
            this.gpsLoading = true;
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.geoLat = pos.coords.latitude;
                    this.geoLon = pos.coords.longitude;
                    this.gpsLoading = false;
                    this.scheduleRecommend();
                },
                () => {
                    this.gpsLoading = false;
                }
            );
        },

        async reverseGeocode() {
            if (!this.location || !this.location.trim()) return;
            let result = await irceptionApi.reverseGeocode(this.location, {
                countryCode: this.geoCountry,
            });
            if (!result) return;
            this.geoLat = result.lat;
            this.geoLon = result.lon;
            if (result.countryCode) this.geoCountry = result.countryCode;
            this.scheduleRecommend();
        },

        // Remove non-manual channels that would re-trigger topicKey via
        // channel_triggers_topic, preventing an immediate re-activation cycle.
        dropTriggerChannels(topicKey) {
            let rules = (this.formConfig && this.formConfig.rules) || [];
            let triggerSet = new Set();
            rules.forEach((rule) => {
                if (rule.type === 'channel_triggers_topic' && rule.activates === topicKey) {
                    rule.channels.forEach((ch) => triggerSet.add(ch.toLowerCase()));
                }
            });
            if (!triggerSet.size) return;
            this.selectedChannelEntries = this.selectedChannelEntries.filter(
                (e) => e.source === 'manual' || e.source === 'stored'
                    || !triggerSet.has(e.name.toLowerCase())
            );
        },

        // ---------- Topic / channel events ----------

        onTopicToggle(topic) {
            if (this.selectedTopics.includes(topic.key)) {
                this.selectedTopics = this.selectedTopics.filter((k) => k !== topic.key);
            } else {
                // Before adding the topic, remove any active topic that deselects it
                // (last-click-wins). Without this, both topics would be in state
                // simultaneously and each topic_deselects rule would remove the other,
                // leaving neither selected.
                let rules = (this.formConfig && this.formConfig.rules) || [];
                let toRemove = new Set();
                let reverseMessages = [];
                rules.forEach((rule) => {
                    if (
                        rule.type === 'topic_deselects'
                        && this.selectedTopics.includes(rule.topic)
                        && rule.deselects.includes(topic.key)
                        && !isTopicHeld(rule.topic, rules, this.ruleState)
                    ) {
                        toRemove.add(rule.topic);
                        if (rule.reverseMessage) reverseMessages.push(rule.reverseMessage);
                    }
                });
                if (toRemove.size) {
                    this.selectedTopics = this.selectedTopics.filter((k) => !toRemove.has(k));
                    toRemove.forEach((t) => this.dropTriggerChannels(t));
                    if (reverseMessages.length) {
                        this.topicErrors = reverseMessages;
                        clearTimeout(this.topicErrorTimer);
                        this.topicErrorTimer = setTimeout(() => { this.topicErrors = []; }, 5500);
                    }
                }
                this.selectedTopics = this.selectedTopics.concat([topic.key]);
            }
        },

        onSuggestionPick(channel) {
            // Un-remove from tag cloud suppression so the chip can reappear
            // if the user removes the channel from Mes salons later.
            this.removedTagCloudChannels = this.removedTagCloudChannels.filter(
                (c) => c.toLowerCase() !== channel.toLowerCase()
            );
            this.addChannel(channel, 'tagcloud');
        },

        onChannelAdd(name) {
            this.addChannel(name, 'manual');
        },

        onChannelRemove(entry) {
            // Track tag-cloud sourced removals so the chip doesn't reappear.
            if (entry.source === 'tagcloud') {
                let lower = entry.name.toLowerCase();
                if (!this.removedTagCloudChannels.some((c) => c.toLowerCase() === lower)) {
                    this.removedTagCloudChannels = this.removedTagCloudChannels
                        .concat([entry.name]);
                }
            }
            this.removeChannel(entry.name);
        },

        addChannel(rawName, source) {
            let name = (rawName || '').trim();
            if (!name) return;
            if (!name.startsWith('#') && !name.startsWith('&')) name = '#' + name;
            if (name in (this.ruleResult.blockedChannels || {})) return;
            if (source !== 'manual' && this.supportChannelSet.has(name.toLowerCase())) return;
            if (this.selectedChannelEntries.length >= this.maxChannels) return;
            let exists = this.selectedChannelEntries.find(
                (c) => c.name.toLowerCase() === name.toLowerCase()
            );
            if (exists) {
                if (source === 'manual' && exists.source !== 'manual') {
                    exists.source = 'manual';
                }
                return;
            }
            // Adding manually un-removes
            if (source === 'manual') {
                this.removedChannels = this.removedChannels.filter(
                    (c) => c.toLowerCase() !== name.toLowerCase()
                );
            }
            this.selectedChannelEntries = this.selectedChannelEntries.concat([
                { name, source: source || 'manual' },
            ]);
        },

        removeChannel(name) {
            if ((this.ruleResult.lockedChannels || []).includes(name)) return;
            this.selectedChannelEntries = this.selectedChannelEntries.filter(
                (c) => c.name !== name
            );
            let lower = name.toLowerCase();
            if (!this.removedChannels.some((c) => c.toLowerCase() === lower)) {
                this.removedChannels = this.removedChannels.concat([name]);
            }
        },

        // ---------- Existing helpers (preserved) ----------

        buildGecos() {
            if (!this.age && !this.sex && !this.location) {
                return '';
            }
            let gecosId = config.getSetting('gecosType');
            let gecosType = this.$state.pluginASL.gecosTypes[gecosId - 1];
            let gecos = gecosType.build;
            let asl = [];
            if (this.age) asl.push(this.age);
            if (this.sex) asl.push(this.sex);
            if (this.location) asl.push(this.location);
            return gecos.replace('%asl', asl.join(gecosType.separator))
                .replace('%a', this.age || '*')
                .replace('%s', this.sex || '*')
                .replace('%l', this.location || '*')
                .replace('%r', this.realname || '')
                .trim();
        },
        onAltClose(event) {
            if (event.channel) {
                let names = event.channel.split(',').map((c) => c.trim()).filter(Boolean);
                this.selectedChannelEntries = names.map((name) => ({ name, source: 'manual' }));
            }
            if (event.nick) this.nick = event.nick;
            if (event.password) this.password = event.password;
            if (event.error) this.connectErrors.push(event.error);
            this.$state.settings.startupOptions.altComponent = null;
        },
        readableStateError(err) {
            let msg = typeof err === 'string' ? err : Misc.networkErrorMessage(err);
            if (msg === 'SASL authentication failed') {
                return this.$t('error_password_mismatch');
            }
            return msg || err;
        },
        nickFocus(event) {
            let el = event.target;
            el.setSelectionRange(el.value.length, el.value.length);
        },
        onAgeBlur() {
            this.ageInteracted = true;
        },
        formSubmit() {
            if (this.termsAutoAccept && this.termsContent) {
                this.termsAccepted = true;
            }
            if (this.readyToStart) {
                this.startUp();
            }
        },
        async startUp() {
            this.connectErrors = [];

            let options = Object.assign({}, this.$state.settings.startupOptions);
            let connectOptions = this.connectOptions();
            let netAddress = _.trim(connectOptions.hostname);

            let ident = await loadIdent(this.welcomeStorage);
            if (!ident) {
                let originParam = new URLSearchParams(window.location.search).get('origine');
                ident = generateIdent(this.channelNames, originParam, this.formConfig);
                await storeIdent(ident, this.welcomeStorage);
                // Propager vers irception pour que X-Client-Ident soit enregistré
                irceptionApi.loadFormConfig({ kiwiStorage: this.welcomeStorage }).catch(() => {});
            }
            // Sync localStorage pour le listener network.new dans plugin.js
            try { localStorage.setItem('irc_ident', ident); } catch (e) { /* unavailable */ }

            let net = this.network || this.$state.getNetworkFromAddress(netAddress);
            let password = this.password;

            net = net || this.$state.addNetwork('Network', this.nick, {
                server: netAddress,
                port: connectOptions.port,
                tls: connectOptions.tls,
                password: password,
                encoding: _.trim(options.encoding),
                direct: connectOptions.direct,
                path: connectOptions.direct_path || '',
                gecos: options.gecos,
                username: options.username,
            });

            // Propagate ident to existing networks (network.new does not fire for
            // networks restored from kiwi-state).
            net.username = ident;

            net.serverBuffer().clearMessages();

            net.connection.nick = this.nick;
            if (options.bouncer) {
                net.connection.password = `${this.nick}:${password}`;
                net.password = '';
            } else {
                net.connection.password = '';
                net.password = password;
            }

            if (!this.age && !this.sex && !this.location) {
                this.sex = 'U';
            }

            let gecos = this.buildGecos();
            if (gecos) {
                net.gecos = gecos;
            }

            if (_.trim(options.encoding || '')) {
                net.connection.encoding = _.trim(options.encoding);
            }

            // Persist plugin-owned welcome state on the Kiwi Network — see plan
            // § Persistence — extension du modèle Kiwi.
            writeWelcomeState(net, {
                topics: this.selectedTopics,
                manualChannels: this.manualChannelNames,
                removedChannels: this.removedChannels,
            });

            this.network = net;

            let hasSwitchedActiveBuffer = false;
            let bufferObjs = Misc.extractBuffers(this.channel);

            let channelNames = bufferObjs.map((b) => b.name.toLowerCase());
            let buffersToRemove = net.buffers.filter((buffer) => (
                buffer.isChannel()
                && !channelNames.includes(buffer.name.toLowerCase())
            ));
            buffersToRemove.forEach((buffer) => {
                this.$state.removeBuffer(buffer);
            });

            bufferObjs.forEach((bufferObj) => {
                let newBuffer = this.$state.addBuffer(net.id, bufferObj.name);
                newBuffer.enabled = true;
                if (newBuffer && !hasSwitchedActiveBuffer) {
                    this.$state.setActiveBuffer(net.id, newBuffer.name);
                    hasSwitchedActiveBuffer = true;
                }
                if (bufferObj.key) {
                    newBuffer.key = bufferObj.key;
                }
            });

            if (!options.bouncer && !hasSwitchedActiveBuffer) {
                this.$state.setActiveBuffer(net.id, net.serverBuffer().name);
            }

            net.ircClient.connect();
            let cleanup = () => {
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
                net.ircClient.off('irc error', onError);
                net.ircClient.off('sasl failed', onSaslFailed);
            };
            let onRegistered = () => {
                if (this.$refs.layout) {
                    this.$refs.layout.close();
                }
                cleanup();
            };
            let saslMessage = null;
            let onClosed = () => {
                let errorToShow = saslMessage || this.network.last_error;
                if (errorToShow && !this.connectErrors.includes(errorToShow)) {
                    this.connectErrors.push(errorToShow);
                }
                cleanup();
            };
            let onError = (event) => {
                if (!event.reason || this.connectErrors.includes(event.reason)) {
                    return;
                }
                this.connectErrors.push(event.reason);
            };
            let onSaslFailed = (event) => {
                saslMessage = (event && event.message) || 'SASL authentication failed';
            };
            net.ircClient.once('registered', onRegistered);
            net.ircClient.once('close', onClosed);
            net.ircClient.on('irc error', onError);
            net.ircClient.on('sasl failed', onSaslFailed);
        },
        processNickRandomNumber(nick) {
            let tmp = (nick || '').replace(/\?/g, () => Math.floor(Math.random() * 100).toString());
            return _.trim(tmp);
        },
        handleCaptcha(isReady) {
            this.captchaReady = isReady;
        },
        connectOptions() {
            let options = Object.assign({}, this.$state.settings.startupOptions);
            let connectOptions = Misc.connectionInfoFromConfig(options);
            connectOptions.hostname = connectOptions.hostname || 'default';
            if (!connectOptions.port && connectOptions.direct) {
                connectOptions.port = connectOptions.tls ? 443 : 80;
            } else if (!connectOptions.port && !connectOptions.direct) {
                connectOptions.port = connectOptions.tls ? 6697 : 6667;
            }
            return connectOptions;
        },
    },
};
</script>

<style>

/* Irception tokens — copied verbatim from irception/static/css/form.css
   (the #connectChat scope) so the welcome chips, channels and tag cloud
   render with the same palette as the partner sites. Scoped to this
   component to avoid leaking into the rest of Kiwi. */
.kiwi-welcome-asl {
    /* Bouton / accent principal (kept for parity, not used in S01 chrome) */
    --ir-color-primary: #2185c7;
    --ir-color-primary-dark: #1262b8;
    --ir-color-primary-hover: #2a92d8;
    --ir-color-primary-hover-dark: #1976d2;
    --ir-color-primary-shadow: rgba(21, 101, 192, 0.32);
    --ir-color-primary-shadow-hover: rgba(21, 101, 192, 0.42);

    /* Surfaces */
    --ir-color-surface: #fff;
    --ir-color-surface-alt: #f4f8ff;
    --ir-color-surface-chip: #f5f8fc;

    /* Texte */
    --ir-color-text: #333;
    --ir-color-text-muted: #767676;
    --ir-color-text-surface-muted: #767676;
    --ir-color-text-placeholder: #666;
    --ir-color-text-on-primary: #fff;

    /* Tags salon */
    --ir-channel-bg: #dbeafe;
    --ir-channel-border: #6baed6;
    --ir-channel-text: #1565c0;
    --ir-channel-bg-hover: #bfdbfe;
    --ir-channel-border-hover: #3b82f6;

    /* Topic chip sélectionné */
    --ir-topic-selected-bg: #e3f0fd;
    --ir-topic-selected-border: #6baed6;
    --ir-topic-selected-text: #1565c0;
    --ir-topic-selected-shadow: rgba(21, 101, 192, 0.15);

    /* Autocomplete dropdown */
    --ir-suggest-border: #c5d8f0;
    --ir-suggest-item-hover-bg: #e3f0fd;
    --ir-suggest-item-hover-text: #1565c0;
    --ir-suggest-shadow: rgba(21, 101, 192, 0.12);

    /* Focus ring */
    --ir-focus-border: #93b9d8;
    --ir-focus-shadow: rgba(107, 174, 214, 0.15);

    /* Bordures */
    --ir-border-field: #dde3ec;
    --ir-border-light: #eef0f3;
    --ir-border-suggestion: rgba(107, 174, 214, 0.15);

    /* Tagcloud chips */
    --ir-tagcloud-bg: #fff;
    --ir-tagcloud-border: #c5d8f0;
    --ir-tagcloud-text: #4a7fa5;
    --ir-tagcloud-hover-bg: #e3f0fd;
    --ir-tagcloud-hover-border: #6baed6;
    --ir-tagcloud-hover-text: #1565c0;

    /* Labels de section (panel de suggestions) */
    --ir-color-topic-label: #5a8fb5;

    /* CTA EuropNet */
    --brand-cta-bg: #8bcbf9;
    --brand-cta-bg-hover: #6ebbf2;
    --brand-cta-fg: #004b87;
}

/* Utility classes */
.text-white { color: #fff; }

.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mr-2 { margin-right: 0.5rem; }
.mr-1\.5 { margin-right: 0.375rem; }
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.w-full { width: 100%; }

.text-gray-400 {
    color: var(--default-fg, #9ca3af);
    opacity: 0.8;
}

.text-gray-900 { color: var(--default-fg, #111827); }

.kiwi-welcome-overlay {
    min-height: 100%;
    background-color: var(--default-bg, #f4f9ff);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    font-family: sans-serif;
    padding: 1rem;
    box-sizing: border-box;
    width: 100%;
    border-radius: 1rem;
}

/* Background Bubbles */
.kiwi-welcome-bubble {
    position: absolute;
    border-radius: 9999px;
    mix-blend-mode: multiply;
    filter: blur(3rem);
    opacity: 0.7;
    animation: blob-anim 7s infinite alternate;
}

.kiwi-welcome-bubble-1 {
    top: 5rem;
    left: -10%;
    width: 16rem;
    height: 16rem;
    background-color: #dbeafe;
}

.kiwi-welcome-bubble-2 {
    top: 10rem;
    right: -10%;
    width: 18rem;
    height: 18rem;
    background-color: #cffafe;
    animation-delay: 2s;
}

.kiwi-welcome-bubble-3 {
    bottom: 5rem;
    left: 20%;
    width: 20rem;
    height: 20rem;
    background-color: #eff6ff;
    animation-delay: 4s;
}

@keyframes blob-anim {
    0% { transform: scale(1) translate(0, 0); }
    50% { transform: scale(1.05) translate(20px, -20px); }
    100% { transform: scale(1) translate(-20px, 20px); }
}

.kiwi-welcome-card {
    z-index: 10;
    width: 100%;
    max-width: 28rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.animate-zoom-in {
    animation: zoom-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes zoom-in {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.animate-slide-down {
    animation: slide-down 0.2s ease-out;
}

@keyframes slide-down {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.kiwi-welcome-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--brand-default, #004b87);
    text-align: center;
    margin-bottom: 1rem;
    margin-top: 0;
}

.kiwi-welcome-form {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
}

.kiwi-input-wrapper {
    position: relative;
    width: 100%;
}

.kiwi-input-icon {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    padding-left: 1rem;
    display: flex;
    align-items: center;
    pointer-events: none;
    color: rgba(0, 75, 135, 0.5);
    transition: color 0.2s;
}

.kiwi-input-wrapper:focus-within .kiwi-input-icon {
    color: var(--brand-default, #004b87);
}

.kiwi-input,
.kiwi-fake-input {
    display: flex;
    width: 100%;
    padding: 0.625rem 1rem 0.625rem 2.5rem;
    background-color: var(--comp-bg, #fff);
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    color: var(--default-fg, #111827);
    font-size: 0.875rem;
    transition: all 0.2s;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    box-sizing: border-box;
    align-items: center;
    min-height: 2.75rem;
}

.kiwi-input:focus,
.kiwi-fake-input.focus-within {
    outline: none;
    border-color: var(--brand-default, #004b87);
    box-shadow: 0 0 0 2px rgba(0, 75, 135, 0.2);
}

.kiwi-input.kiwi-input-error {
    border-color: var(--brand-error, #ef4444);
    background-color: #fef2f2;
}

.kiwi-input.kiwi-input-warning {
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

.kiwi-input.kiwi-input-error:focus {
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.kiwi-input::placeholder {
    color: #9ca3af;
}

/* Password Toggle */
.kiwi-toggle-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.125rem 0.5rem;
}

.kiwi-toggle-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--brand-default, #004b87);
    cursor: pointer;
    user-select: none;
}

.kiwi-toggle {
    position: relative;
    display: inline-flex;
    height: 1.5rem;
    width: 2.75rem;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 9999px;
    border: 2px solid transparent;
    transition: all 0.2s;
    background-color: #e5e7eb;
}

.kiwi-toggle.active {
    background-color: var(--brand-default, #004b87);
}

.kiwi-toggle-thumb {
    display: inline-block;
    height: 1.25rem;
    width: 1.25rem;
    transform: translateX(0);
    border-radius: 9999px;
    background-color: var(--comp-bg, #fff);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    transition: transform 0.2s;
}

.kiwi-toggle-thumb.active {
    transform: translateX(1.25rem);
}

/* Topic rule error toasts */
.kiwi-asl-topic-errors {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.kiwi-asl-topic-error {
    background: #fff7f0;
    border: 1px solid #f5c9a0;
    border-radius: 10px;
    color: #7a4010;
    font-size: 13px;
    margin: 0;
    padding: 9px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: kiwi-asl-chip-in 0.15s ease-out;
}

/* Nick hint + age warning */
.kiwi-asl-nick-hint {
    text-align: center;
    font-size: 12px;
    color: var(--ir-color-text-muted, #767676);
    margin: 4px 0 0;
    transition: opacity 0.2s;
}

.kiwi-asl-nick-hint.is-hidden {
    opacity: 0;
    pointer-events: none;
}

.kiwi-asl-nick-hint.is-visible {
    opacity: 1;
}

.kiwi-asl-age-hint {
    font-size: 11px;
    color: #b45309;
    margin: 4px 0 0;
    display: flex;
    align-items: center;
    gap: 4px;
    line-height: 1.3;
}

/* GPS locate button inside ville field */
.kiwi-asl-age-ville-row__ville {
    position: relative;
}

.kiwi-input--with-gps {
    padding-right: 2.5rem;
}

.kiwi-asl-gps-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: rgba(0, 75, 135, 0.5);
    font-size: 0.875rem;
    line-height: 1;
    transition: color 0.15s;
}

.kiwi-asl-gps-btn:hover {
    color: var(--brand-default, #004b87);
}

/* Age + Ville on one row (irception layout) */
.kiwi-asl-age-ville-row {
    display: flex;
    gap: 0.5rem;
    align-items: stretch;
    width: 100%;
}

.kiwi-asl-age-ville-row__age {
    flex: 0 0 7.5rem;
}

.kiwi-asl-age-ville-row__ville {
    flex: 1 1 auto;
    min-width: 0;
}

@media (max-width: 600px) {
    .kiwi-asl-age-ville-row {
        flex-direction: column;
    }

    .kiwi-asl-age-ville-row__age {
        flex: 0 0 auto;
        width: 100%;
    }
}

/* iOS Safari anti-zoom: font-size >= 16px prevents auto-zoom on input focus
   on viewports where the layout is still desktop (481-600px). */
@media (min-width: 481px) and (max-width: 600px) {
    .kiwi-input {
        font-size: 16px;
    }
}

/* Gender Group */
.kiwi-gender-group {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
}

.kiwi-gender-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.75rem;
    border-radius: 9999px;
    border: 1px solid #e5e7eb;
    background-color: var(--comp-bg, #fff);
    opacity: 0.7;
    transition: all 0.2s;
    font-size: 0.875rem;
    font-weight: 500;
    color: #000;
    cursor: pointer;
}

.kiwi-gender-btn:hover {
    opacity: 1;
}

.kiwi-gender-btn.active-m {
    background-color: #bde3ff;
    border-color: #8bbbe0;
    opacity: 1;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.kiwi-gender-btn.active-f {
    background-color: #ffbdf1;
    border-color: #e08bce;
    opacity: 1;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.kiwi-gender-btn.active-u {
    background-color: #a3a3a3;
    border-color: #7a7a7a;
    opacity: 1;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* Submit container — sticky at the bottom with a fade gradient so the
   button stays visible when the form overflows the viewport on mobile. */
.kiwi-submit-container {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    display: flex;
    justify-content: center;
    position: sticky;
    bottom: 0;
    background: linear-gradient(to bottom, transparent 0%, var(--default-bg, #f4f9ff) 28%);
    z-index: 10;
}

/* Override Kiwi Layout if present */
.kiwi-welcome-asl-section-connection {
    position: static;
    width: 100%;
}

.kiwi-welcome-asl-section-info {
    /* stylelint-disable-next-line declaration-no-important */
    display: none !important;
}

.kiwi-welcome-asl-section {
    height: 100%;
    margin: 0;
    padding: 0;
}
.text-center { text-align: center; }
.mt-4 { margin-top: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }
.hidden { display: none; }
.cursor-pointer { cursor: pointer; }
.block { display: block; }

/* Error styling */
.kiwi-welcome-error {
    background-color: #fee2e2;
    border-left: 4px solid var(--brand-error, #ef4444);
    color: #b91c1c;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-welcome-error span {
    display: block;
    margin-bottom: 0.25rem;
}

.kiwi-welcome-error span:last-child {
    margin-bottom: 0;
}

.kiwi-welcome-error-retry {
    background: var(--brand-error, #ef4444);
    color: #fff;
    border: none;
    border-radius: 9999px;
    padding: 0.375rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    margin-top: 0.5rem;
}

.kiwi-welcome-error-retry:hover {
    background: #dc2626;
}

.chatnow-loader {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #194D78;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chatnow-loader__logo {
    width: 16rem;
    margin-bottom: 2rem;

    @media (min-width: 768px) {
        width: 24rem;
    }
}

.chatnow-loader__svg {
    width: 100%;
    height: auto;
    overflow: visible;
    filter: drop-shadow(0 25px 25px rgba(0, 0, 0, 0.15));
}

.chatnow-loader__path {
    stroke-dasharray: 100;
    animation: chatnowDrawFillFade 3.5s ease-in-out infinite;
}

.chatnow-loader__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: chatnowFadeInUp 0.8s ease-out 0.5s both;
}

.chatnow-loader__dots {
    display: flex;
    gap: 0.25rem;
}

.chatnow-loader__dot {
    width: 0.5rem;
    height: 0.5rem;
    background-color: white;
    border-radius: 50%;
    animation: chatnowDotBounce 0.8s ease-in-out infinite;
}

.chatnow-loader__text {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
    letter-spacing: 0.025em;
    font-size: 0.875rem;
    text-transform: uppercase;
    margin: 0;
}

@keyframes chatnowDrawFillFade {
    0%   { stroke-dashoffset: 100; fill: rgba(255, 255, 255, 0); opacity: 1; }
    40%  { stroke-dashoffset: 0;   fill: rgba(255, 255, 255, 0); opacity: 1; }
    60%  { stroke-dashoffset: 0;   fill: rgba(255, 255, 255, 1); opacity: 1; }
    80%  { stroke-dashoffset: 0;   fill: rgba(255, 255, 255, 1); opacity: 0; }
    100% { stroke-dashoffset: 100; fill: rgba(255, 255, 255, 0); opacity: 0; }
}

@keyframes chatnowDotBounce {
    0%, 100% {
        transform: translateY(0);
        opacity: 0.5;
    }

    50% {
        transform: translateY(-50%);
        opacity: 1;
    }
}

@keyframes chatnowFadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Shared chip-in keyframe for sub-components (TopicChip, channel pills,
   tag-cloud chips). Defined at the welcome scope so the children pick it
   up via animation: kiwi-asl-chip-in 0.15s ease-out. */
@keyframes kiwi-asl-chip-in {
    from {
        opacity: 0;
        transform: scale(0.85);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.kiwi-asl-cgu-text {
    font-size: 0.9em;
    text-align: center;
    margin-top: 1em;
    opacity: 0.9;
}

.kiwi-asl-cgu-link {
    text-decoration: none;
    color: var(--brand-default, #004b87),
}

</style>
