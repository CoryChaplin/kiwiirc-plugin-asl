<template>
    <startup-layout ref="layout"
                    class="kiwi-welcome-asl kiwi-welcome-asl-section
                           kiwi-welcome-asl-section-connection"
    >
        <template v-if="startupOptions.altComponent" v-slot:connection>
            <component :is="startupOptions.altComponent" @close="onAltClose" />
        </template>
        <template v-else v-slot:connection>
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

                        <!-- 3. Age -->
                        <div class="kiwi-input-wrapper">
                            <div class="kiwi-input-icon">
                                <i class="fa fa-calendar"/>
                            </div>
                            <input v-model="age" type="number" min="16" max="99"
                                   :placeholder="$t('plugin-asl:age')"
                                   class="kiwi-input"
                            >
                        </div>

                        <!-- 4. Topics -->
                        <div v-if="showTopics" ref="topicsContainer"
                             class="kiwi-input-wrapper cursor-pointer"
                        >
                            <div class="kiwi-fake-input" @click="isTopicsOpen = !isTopicsOpen">
                                <div class="kiwi-input-icon">
                                    <i class="fa fa-heart"/>
                                </div>
                                <span :class="[
                                    'truncate',
                                    topics.length === 0 ? 'text-gray-400' : 'text-gray-900'
                                ]"
                                >
                                    {{
                                        topics.length === 0
                                            ? $t('plugin-asl:topics_placeholder')
                                            : topics.join(', ')
                                    }}
                                </span>
                                <div class="kiwi-icon-right">
                                    <i :class="[
                                        'fa fa-chevron-down transform-transition',
                                        isTopicsOpen ? 'rotate-180' : ''
                                    ]"
                                    />
                                </div>
                            </div>
                            <div v-if="isTopicsOpen" class="kiwi-dropdown">
                                <label v-for="option in loginDiscussionTopics" :key="option"
                                       class="kiwi-dropdown-item"
                                >
                                    <input v-model="topics" type="checkbox" :value="option"
                                           class="hidden"
                                    >
                                    <div :class="[
                                        'kiwi-checkbox',
                                        topics.includes(option) ? 'active' : ''
                                    ]"
                                    >
                                        <i v-if="topics.includes(option)"
                                           class="fa fa-check text-white text-xs"
                                        />
                                    </div>
                                    <span class="text-sm">{{ option }}</span>
                                </label>
                            </div>
                        </div>

                        <!-- 5. Gender -->
                        <div class="kiwi-gender-group">
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

                        <!-- 6. Location -->
                        <div v-if="showLocation" class="kiwi-input-wrapper">
                            <div class="kiwi-input-icon">
                                <i class="fa fa-map-marker"/>
                            </div>
                            <input v-model="location" type="text"
                                   :placeholder="$t('plugin-asl:location')"
                                   class="kiwi-input"
                            >
                        </div>
                        <div v-if="showRealname" class="kiwi-input-wrapper"
                             style="margin-top: 0.5rem;"
                        >
                            <input v-model="realname" type="text" class="kiwi-input"
                                   :placeholder="$t('whois_realname')"
                            >
                        </div>

                        <!-- 7. Channels -->
                        <div v-if="showChannel" ref="channelsContainer"
                             class="kiwi-input-wrapper"
                        >
                            <div class="kiwi-tags-input" @click="$refs.channelInput.focus()">
                                <div class="kiwi-input-icon"
                                     style="position: absolute; top: 0.5rem;"
                                >
                                    <i class="fa fa-hashtag"/>
                                </div>
                                <div class="kiwi-tags-list">
                                    <span v-for="chan in channelsArray" :key="chan"
                                          class="kiwi-tag"
                                    >
                                        {{ chan }}
                                        <button type="button" class="kiwi-tag-close"
                                                @click.stop="removeChannel(chan)"
                                        >
                                            <i class="fa fa-times"/>
                                        </button>
                                    </span>
                                    <input ref="channelInput" v-model="channelSearch" type="text"

                                           :placeholder="channelsArray.length === 0
                                               ? $t('channels')
                                               : ''"
                                           class="kiwi-tag-input"
                                           @focus="isChannelsOpen = true"
                                           @keydown="onChannelKeyDown"
                                    >
                                </div>
                            </div>
                            <div v-if="isChannelsOpen && channelSearch.trim() !== ''"
                                 class="kiwi-dropdown"
                            >
                                <template v-if="filteredChannels.length > 0">
                                    <button v-for="chan in filteredChannels" :key="chan"
                                            type="button"
                                            class="kiwi-dropdown-item w-full text-left"
                                            @click.stop="addChannel(chan)"
                                    >
                                        <i class="fa fa-hashtag text-gray-400 mr-2"/> {{ chan }}
                                    </button>
                                </template>
                                <div v-else class="kiwi-dropdown-empty">
                                    {{ $t('plugin-asl:channel_empty') }}
                                </div>
                            </div>
                        </div>

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
                            <button v-if="!network || network.state === 'disconnected'"
                                    :disabled="!readyToStart"
                                    type="submit"
                                    class="kiwi-submit-btn"
                                    v-html="buttonText"
                            />
                            <button v-else type="button" disabled class="kiwi-submit-btn disabled">
                                <i class="fa fa-spin fa-spinner mr-2"/> {{ $t('logging_in') }}
                            </button>
                        </div>
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

let Misc = kiwi.require('helpers/Misc');
let Logger = kiwi.require('libs/Logger');
let BouncerProvider = kiwi.require('libs/BouncerProvider');
let Captcha = kiwi.require('components/Captcha');
let StartupLayout = kiwi.require('components/startups/CommonLayout');

let log = Logger.namespace('Welcome.vue');

export default {
    components: {
        Captcha,
        StartupLayout,
    },
    data: function data() {
        return {
            connectErrors: [],
            network: null,
            channel: '',
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
            topics: [],
            isTopicsOpen: false,
            isChannelsOpen: false,
            channelSearch: '',
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
            return config.getSetting('showTopics') !== false; // Default true if undefined
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
        greetingText: function greetingText() {
            let greeting = this.$state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_greeting');
        },
        footerText: function footerText() {
            let footer = this.$state.settings.startupOptions.footerText;
            return typeof footer === 'string' ?
                footer :
                '';
        },
        buttonText: function buttonText() {
            let greeting = this.$state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_button');
        },
        termsContent() {
            let terms = this.$state.settings.startupOptions.termsContent;
            return typeof terms === 'string' ?
                terms :
                '';
        },
        termsAutoAccept() {
            return !!this.$state.settings.startupOptions.termsAutoAccept;
        },
        isNickValid() {
            let nickPatternStr = this.$state.setting('startupOptions.nick_format');
            let nickPattern = '';
            if (!nickPatternStr) {
                // Nicks cannot start with [0-9- ]
                // ? is not a valid nick character but we allow it as it gets replaced
                // with a number.
                nickPattern = /^[a-z_\\[\]{}^`|][a-z0-9_\-\\[\]{}^`|]*$/i;
            } else {
                // Support custom pattern matches. Eg. only '@example.com' may be allowed
                // on some IRCDs
                let pattern = '';
                let flags = '';
                if (nickPatternStr[0] === '/') {
                    // Custom regex
                    let pos = nickPatternStr.lastIndexOf('/');
                    pattern = nickPatternStr.substring(1, pos);
                    flags = nickPatternStr.substr(pos + 1);
                } else {
                    // Basic contains rule
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
        channelsArray() {
            return this.channel.split(',').map((c) => c.trim()).filter(Boolean);
        },
        loginDiscussionTopics() {
            return config.getSetting('loginDiscussionTopics') || [];
        },
        loginProposedChannels() {
            return config.getSetting('loginProposedChannels') || [];
        },
        filteredChannels() {
            let search = this.channelSearch.toLowerCase();
            let cArr = this.channelsArray.map((c) => c.toLowerCase());
            return this.loginProposedChannels.filter((c) => (
                c.toLowerCase().includes(search) && !cArr.includes(c)
            ));
        },
        readyToStart: function readyToStart() {
            let ready = !!this.nick;

            if (!this.connectWithoutChannel && !this.channel) {
                ready = false;
            }

            // Make sure the channel name starts with a common channel prefix
            if (!this.connectWithoutChannel) {
                let bufferObjs = Misc.extractBuffers(this.channel);
                bufferObjs.forEach((bufferObj) => {
                    if ('#&'.indexOf(bufferObj.name[0]) === -1) {
                        ready = false;
                    }
                });
            }

            // If toggling the password is is disabled, assume it is required
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
    },
    watch: {
        show_password_box(newVal) {
            if (newVal === false) {
                // clear the password when show password is unchecked
                this.password = '';
            }
        },
    },
    mounted() {
        document.addEventListener('mousedown', this.onDocumentClick);
    },
    beforeDestroy() {
        document.removeEventListener('mousedown', this.onDocumentClick);
    },
    created: function created() {
        let options = this.startupOptions;
        let connectOptions = this.connectOptions();

        // Take some settings from a previous network if available
        let previousNet = null;
        if (connectOptions.hostname.trim()) {
            previousNet = this.$state.getNetworkFromAddress(connectOptions.hostname.trim());
        }

        if (Misc.queryStringVal('nick')) {
            this.nick = Misc.queryStringVal('nick');
        } else if (previousNet && previousNet.connection.nick) {
            this.nick = previousNet.connection.nick;
        }
        this.nick = this.processNickRandomNumber(this.nick || '');

        if (options.password) {
            // Don't use previousNet.password if we did not use previousNet.nick
            this.password = options.password;
        } else if (
            previousNet &&
            previousNet.password && (
                !Misc.queryStringVal('nick') || previousNet.connection.nick === Misc.queryStringVal('nick')
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

        let persistedChannels = '';
        if (previousNet) {
            let channels = previousNet.buffers
                .filter((b) => b.isChannel())
                .map((b) => b.name);
            if (channels.length) {
                persistedChannels = channels.join(',');
            }
        }
        // Base: persisted buffers, then config fallback
        this.channel = persistedChannels || options.channel || '';

        // Collect extra channels from URL hash and query string — merge, don't override
        let extraChannels = [];
        let hashChannel = '';
        try {
            hashChannel = decodeURIComponent(window.location.hash).replace(/^#/, '');
        } catch (err) {
            log.error('Invalid URL hash encoding:', err);
        }
        if (hashChannel) {
            extraChannels.push('#' + hashChannel);
        }
        if (Misc.queryStringVal(queryKeys.channel)) {
            let qsChannels = ('#' + Misc.queryStringVal(queryKeys.channel).replace(/,/g, ',#')).split(',');
            extraChannels.push(...qsChannels);
        }
        if (extraChannels.length) {
            let existing = this.channel.split(',').map((c) => c.toLowerCase().trim()).filter(Boolean);
            extraChannels.forEach((c) => {
                if (c && !existing.includes(c.toLowerCase().trim())) {
                    this.channel = this.channel ? this.channel + ',' + c : c;
                    existing.push(c.toLowerCase().trim());
                }
            });
        }
        this.showChannel = typeof options.showChannel === 'boolean' ?
            options.showChannel :
            true;
        this.showNick = typeof options.showNick === 'boolean' ?
            options.showNick :
            true;
        this.showPass = typeof options.showPassword === 'boolean' ?
            options.showPassword :
            true;
        this.toggablePass = typeof options.toggablePassword === 'boolean' ?
            options.toggablePassword :
            true;

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

        // Support for legacy EuropNet query strings. Decided to override prior params.
        if (Misc.queryStringVal(queryKeys.sexe)) {
            this.sex = Misc.queryStringVal(queryKeys.sexe);
        }
        if (Misc.queryStringVal(queryKeys.ville)) {
            this.location = Misc.queryStringVal(queryKeys.ville);
        }
        // End legacy params

        if (
            options.autoConnect &&
            this.nick &&
            (Misc.queryStringVal('chatnow') && Misc.queryStringVal('chatnow') === '1') &&
            (this.channel || this.connectWithoutChannel)
        ) {
            this.startUp();
        }
    },
    methods: {
        buildGecos() {
            if (!this.age && !this.sex && !this.location) {
                return '';
            }
            let gecosId = config.getSetting('gecosType');
            let gecosType = this.$state.pluginASL.gecosTypes[gecosId - 1];
            let gecos = gecosType.build;
            let asl = [];
            if (this.age) {
                asl.push(this.age);
            }
            if (this.sex) {
                asl.push(this.sex);
            }
            if (this.location) {
                asl.push(this.location);
            }

            return gecos.replace('%asl', asl.join(gecosType.separator))
                .replace('%a', this.age || '*')
                .replace('%s', this.sex || '*')
                .replace('%l', this.location || '*')
                .replace('%r', this.realname || '')
                .trim();
        },
        onAltClose(event) {
            if (event.channel) {
                this.channel = event.channel;
            }
            if (event.nick) {
                this.nick = event.nick;
            }
            if (event.password) {
                this.password = event.password;
            }
            if (event.error) {
                this.connectErrors.push(event.error);
            }

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

        onChannelKeyDown(e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
                e.preventDefault();
                if (this.channelSearch.trim()) {
                    this.addChannel(this.channelSearch);
                }
            }
        },
        onDocumentClick(e) {
            let topicsEl = this.$refs.topicsContainer;
            if (topicsEl && !topicsEl.contains(e.target)) {
                this.isTopicsOpen = false;
            }
            let channelsEl = this.$refs.channelsContainer;
            if (channelsEl && !channelsEl.contains(e.target)) {
                this.isChannelsOpen = false;
            }
        },
        addChannel(chanName) {
            let chan = chanName.trim();
            if (!chan) return;
            if (!chan.startsWith('#')) chan = '#' + chan;
            let current = this.channelsArray.slice();
            if (!current.includes(chan)) {
                current.push(chan);
                this.channel = current.join(',');
            }
            this.channelSearch = '';
            this.isChannelsOpen = false;
        },
        removeChannel(chanName) {
            this.channel = this.channelsArray.filter((c) => c !== chanName).join(',');
        },
        formSubmit: function formSubmit() {
            if (this.termsAutoAccept && this.termsContent) {
                this.termsAccepted = true;
            }
            if (this.readyToStart) {
                this.startUp();
            }
        },
        startUp: function startUp() {
            this.connectErrors = [];

            let options = Object.assign({}, this.$state.settings.startupOptions);
            let connectOptions = this.connectOptions();
            let netAddress = _.trim(connectOptions.hostname);

            // Check if we have this network already
            let net = this.network || this.$state.getNetworkFromAddress(netAddress);

            let password = this.password;

            // If the network doesn't already exist, add a new one
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

            // Clear the server buffer in case it already existed and contains messages relating to
            // the previous connection, such as errors. They are now redundant since this is a
            // new connection.
            net.serverBuffer().clearMessages();

            // If we retreived an existing network, update the nick+password with what
            // the user has just put in place
            net.connection.nick = this.nick;
            if (options.bouncer) {
                // Bouncer mode uses server PASS
                net.connection.password = `${this.nick}:${password}`;
                net.password = '';
            } else {
                net.connection.password = '';
                net.password = password;
            }

            // Default to 'U' sex if no ASL fields are filled
            // to prevent fallback to default kiwiirc.com realname
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

            this.network = net;

            // Only switch to the first channel we join if multiple are being joined
            let hasSwitchedActiveBuffer = false;
            let bufferObjs = Misc.extractBuffers(this.channel);

            // Disable previously enabled channels that user removed
            let channelNames = bufferObjs.map((b) => b.name.toLowerCase());
            net.buffers.forEach((buffer) => {
                if (buffer.isChannel() && buffer.enabled
                    && !channelNames.includes(buffer.name.toLowerCase())) {
                    buffer.enabled = false;
                }
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

            // switch to server buffer if no channels are joined
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
                // Prefer specific SASL server message over generic localized error
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
        processNickRandomNumber: function processNickRandomNumber(nick) {
            // Replace ? with a random number
            let tmp = (nick || '').replace(/\?/g, () => Math.floor(Math.random() * 100).toString());
            return _.trim(tmp);
        },
        handleCaptcha(isReady) {
            this.captchaReady = isReady;
        },
        connectOptions() {
            let options = Object.assign({}, this.$state.settings.startupOptions);
            let connectOptions = Misc.connectionInfoFromConfig(options);

            // If a server isn't specified in the config, set some defaults
            // The webircgateway will have a default network set and will connect
            // there instead. This just removes the requirement of specifying the same
            // irc network address in both the server-side and client side configs
            connectOptions.hostname = connectOptions.hostname || 'default';
            if (!connectOptions.port && connectOptions.direct) {
                connectOptions.port = connectOptions.tls ?
                    443 :
                    80;
            } else if (!connectOptions.port && !connectOptions.direct) {
                connectOptions.port = connectOptions.tls ?
                    6697 :
                    6667;
            }

            return connectOptions;
        },
    },
};
</script>

<style>

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
    background-color: #dbeafe; /* blue-100 */
}

.kiwi-welcome-bubble-2 {
    top: 10rem;
    right: -10%;
    width: 18rem;
    height: 18rem;
    background-color: #cffafe; /* cyan-100 */
    animation-delay: 2s;
}

.kiwi-welcome-bubble-3 {
    bottom: 5rem;
    left: 20%;
    width: 20rem;
    height: 20rem;
    background-color: #eff6ff; /* blue-50 */
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
    border-radius: 9999px;
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

.kiwi-input.kiwi-input-error:focus {
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.kiwi-input::placeholder {
    color: #9ca3af;
}

.kiwi-icon-right {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    padding-right: 0.75rem;
    display: flex;
    align-items: center;
    pointer-events: none;
}
.transform-transition { transition: transform 0.2s; }
.rotate-180 { transform: rotate(180deg); }

/* Dropdown */
.kiwi-dropdown {
    position: absolute;
    z-index: 20;
    width: 100%;
    margin-top: 0.25rem;
    background-color: var(--comp-bg, #fff);
    border: 1px solid #f3f4f6;
    border-radius: 1rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    padding: 0.25rem 0;
    max-height: 12rem;
    overflow-y: auto;
}

.kiwi-dropdown-item {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    cursor: pointer;
    gap: 0.75rem;
    border: none;
    background: none;
    font-size: 0.875rem;
    color: #374151;
}

.kiwi-dropdown-item:hover {
    background-color: #f9fafb;
}

.kiwi-checkbox {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    border: 1px solid #d1d5db;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.kiwi-checkbox.active {
    background-color: var(--brand-default, #004b87);
    border-color: var(--brand-default, #004b87);
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
    border-radius: 0.75rem;
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

/* Tags / Channels */
.kiwi-tags-input {
    display: flex;
    width: 100%;
    min-height: 2.75rem;
    padding: 0.25rem 1rem 0.25rem 2.5rem;
    background-color: var(--comp-bg, #fff);
    border: 1px solid #e5e7eb;
    border-radius: 1.5rem;
    color: var(--default-fg, #111827);
    font-size: 0.875rem;
    transition: all 0.2s;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    box-sizing: border-box;
    cursor: text;
    align-items: center;
}

.kiwi-input-wrapper:focus-within .kiwi-tags-input {
    border-color: var(--brand-default, #004b87);
    box-shadow: 0 0 0 2px rgba(0, 75, 135, 0.2);
}

.kiwi-tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    align-items: center;
    width: 100%;
}

.kiwi-tag {
    background-color: #e6f3ff;
    color: var(--brand-default, #004b87);
    padding: 0.125rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.kiwi-tag-close {
    background: none;
    border: none;
    padding: 0.125rem;
    border-radius: 9999px;
    cursor: pointer;
    color: var(--brand-default, #004b87);
    display: flex;
    align-items: center;
}

.kiwi-tag-close:hover {
    background-color: #cce7ff;
}

.kiwi-tag-input {
    flex: 1;
    min-width: 100px;
    background: transparent;
    border: none;
    outline: none;
    padding: 0.25rem 0;
    font-size: 0.875rem;
    color: var(--default-fg, #111827);
}

/* Submit */
.kiwi-submit-container {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    display: flex;
    justify-content: center;
}

.kiwi-submit-btn {
    background-color: #8bcbf9;
    color: var(--brand-default, #004b87);
    font-weight: 700;
    padding: 0.75rem 2.5rem;
    border-radius: 9999px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    font-size: 0.9375rem;
    letter-spacing: 0.025em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 3rem;
    border: none;
    cursor: pointer;
}

.kiwi-submit-btn:hover:not(:disabled) {
    background-color: #6ebbf2;
}

.kiwi-submit-btn:active:not(:disabled) {
    transform: scale(0.98);
}

.kiwi-submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.kiwi-dropdown-empty {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    color: #6b7280;
    text-align: center;
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

.kiwi-welcome-asl {
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
    background-color: #fee2e2; /* light red background */
    border-left: 4px solid var(--brand-error, #ef4444); /* red border */
    color: #b91c1c; /* dark red text */
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
</style>
