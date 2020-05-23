<template>
    <startup-layout ref="layout"
                    class="kiwi-welcome-asl kiwi-welcome-asl-section \
                    kiwi-welcome-asl-section-connection"
    >
        <template v-if="startupOptions.altComponent" v-slot:connection>
            <component :is="startupOptions.altComponent" @close="onAltClose" />
        </template>
        <template v-else v-slot:connection>
            <form class="u-form u-form--big kiwi-welcome-asl-form" @submit.prevent="formSubmit">
                <h2 v-html="greetingText" />
                <div v-if="errorMessage" class="kiwi-welcome-asl-error">{{ errorMessage }}</div>
                <div
                    v-else-if="network && (network.last_error || network.state_error)"
                    class="kiwi-welcome-asl-error"
                >
                    <span v-if="!network.last_error && network.state_error">
                        {{ $t('network_noconnect') }}
                    </span>
                    <span>
                        {{ network.last_error || readableStateError(network.state_error) }}
                    </span>
                </div>

                <div class="kiwi-welcome-asl-group nick">
                    <span class="kiwi-welcome-asl-picto"><i class="fa fa-user"></i></span>
                    <input v-model="nick" class="kiwi-welcome-asl-nick"
                           :placeholder="$t('nick')" type="text" />
                </div>

                <div v-if="showPass && toggablePass" class="kiwi-welcome-asl-group pass">
                    <label
                        class="kiwi-welcome-asl-have-password"
                    >
                        <input v-model="show_password_box" type="checkbox" >
                        <span class="kiwi-welcome-asl-have-password">
                            {{ $t('password_have') }} </span>
                    </label>
                </div>

                <div v-if="showPass && (show_password_box || !toggablePass)"
                     class="kiwi-welcome-asl-group pass"
                >
                    <span class="kiwi-welcome-asl-picto"><i class="fa fa-key"></i></span>
                    <input v-model="password"
                           v-focus
                           :show-plain-text="true"
                           type="password"
                    />
                </div>
                <div class="kiwi-welcome-asl-asl-container">
                    <div class="kiwi-welcome-asl-group age">
                        <span class="kiwi-welcome-asl-picto">
                            <i class="fa fa-info-circle"></i></span>
                        <input type="number" class="kiwi-welcome-asl-age"
                               v-model="age" min="16" max="99"
                               :placeholder="$t('plugin-asl:age')"
                        /><div class="age-text">&nbsp;&nbsp;years old</div>
                    </div>
                    <div class="kiwi-welcome-asl-group gender">
                        <span class="kiwi-welcome-asl-picto">
                            <i class="fa fa-transgender" />
                        </span>
                        <div class="kiwi-welcome-asl-group-genders">
                            <input type="radio" id="gender_m" value="M" v-model="sex">
                            <label class="gender_m" for="gender_m">
                                {{$t('plugin-asl:male')}}</label>
                            <input type="radio" id="gender_f" value="F" v-model="sex">
                            <label class="gender_f" for="gender_f">
                                {{$t('plugin-asl:female')}}</label>
                            <input type="radio" id="gender_u" value="U" v-model="sex">
                            <label class="gender_u" for="gender_u">
                                {{$t('plugin-asl:other')}}</label>
                        </div>
                    </div>
                    <div class="kiwi-welcome-asl-group location">
                        <span class="kiwi-welcome-asl-picto">
                            <i class="fa fa-map-marker"></i>
                        </span>
                        <input type="text" v-model="location" class="kiwi-welcome-asl-location"
                               :placeholder="$t('plugin-asl:location')" />
                        <input type="text" v-if="showRealname" v-model="realname"
                               :label="$t('whois_realname')" />
                    </div>
                </div>
                <div v-if="showChannel" class="kiwi-welcome-asl-input-container">
                    <div class="kiwi-welcome-asl-group channel">
                        <span class="kiwi-welcome-asl-picto"><i class="fa fa-slack"></i></span>
                        <input type="text" v-model="channel" :placeholder="$t('channel')"
                               class="kiwi-welcome-asl-channel" />
                    </div>
                </div>

                <captcha
                    :network="network"
                />

                <button
                    v-if="!network || network.state === 'disconnected'"
                    :disabled="!readyToStart"
                    class="u-button u-button-primary u-submit kiwi-welcome-asl-start"
                    type="submit"
                    v-html="buttonText"
                />
                <button
                    v-else
                    class="u-button u-button-primary u-submit kiwi-welcome-simple-start"
                    disabled
                >
                    <i class="fa fa-spin fa-spinner" aria-hidden="true" />
                </button>

                <div v-html="footerText" />
            </form>
        </template>
    </startup-layout>
</template>

<script>

/* global _:true */
/* global kiwi:true */

import * as utils from '../libs/utils.js';

let state = kiwi.state;
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
            errorMessage: '',
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
            age: null,
            sex: null,
            location: '',
            realname: '',
        };
    },
    computed: {
        sexes() {
            return kiwi.state.getSetting('settings.plugin-asl.sexes');
        },
        showRealname() {
            let showRealname = this.$state.getSetting('settings.plugin-asl.showRealname');
            let gecosType = this.$state.getSetting('settings.plugin-asl.gecosType');
            return showRealname && gecosType === 1;
        },
        startupOptions() {
            return this.$state.settings.startupOptions;
        },
        greetingText: function greetingText() {
            let greeting = state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_greeting');
        },
        footerText: function footerText() {
            let footer = state.settings.startupOptions.footerText;
            return typeof footer === 'string' ?
                footer :
                '';
        },
        buttonText: function buttonText() {
            let greeting = state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_button');
        },
        readyToStart: function readyToStart() {
            let ready = !!this.nick;

            if (!this.connectWithoutChannel && !this.channel) {
                ready = false;
            }

            // If toggling the password is is disabled, assume it is required
            if (!this.toggablePass && !this.password) {
                ready = false;
            }

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

            if (!this.nick.match(nickPattern)) {
                ready = false;
            }

            return ready;
        },
    },
    created: function created() {
        let options = this.startupOptions;

        // Take some settings from a previous network if available
        let previousNet = null;
        if (options.server.trim()) {
            previousNet = state.getNetworkFromAddress(options.server.trim());
        }

        if (Misc.queryStringVal('nick')) {
            this.nick = Misc.queryStringVal('nick');
        } else if (previousNet && previousNet.connection.nick) {
            this.nick = previousNet.connection.nick;
        } else {
            this.nick = options.nick;
        }

        let parsedGecos = null;
        if (previousNet && previousNet.gecos) {
            parsedGecos = utils.parseGecos(previousNet.gecos);
        }

        let queryKeys = kiwi.state.getSetting('settings.plugin-asl.queryKeys');
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

        this.nick = this.processNickRandomNumber(this.nick || '');
        this.password = options.password || '';
        this.channel = decodeURIComponent(window.location.hash) || options.channel || '';
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
            bouncer.enable(options.server, options.port, options.tls, options.direct, options.path);
        }

        if (
            options.autoConnect &&
            this.nick &&
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
            let gecosId = kiwi.state.getSetting('settings.plugin-asl.gecosType');
            let gecosType = kiwi.state.pluginASL.gecosTypes[gecosId - 1];
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
                this.errorMessage = event.error;
            }

            this.$state.settings.startupOptions.altComponent = null;
        },
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        formSubmit: function formSubmit() {
            if (this.readyToStart) {
                this.startUp();
            }
        },
        startUp: function startUp() {
            this.errorMessage = '';

            let options = Object.assign({}, state.settings.startupOptions);

            // If a server isn't specified in the config, set some defaults
            // The webircgateway will have a default network set and will connect
            // there instead. This just removes the requirement of specifying the same
            // irc network address in both the server-side and client side configs
            options.server = options.server || 'default';
            options.port = options.port || 6667;

            let netAddress = _.trim(options.server);

            // Check if we have this network already
            let net = this.network || state.getNetworkFromAddress(netAddress);

            let password = this.password;

            // If the network doesn't already exist, add a new one
            net = net || state.addNetwork('Network', this.nick, {
                server: netAddress,
                port: options.port,
                tls: options.tls,
                password: password,
                encoding: _.trim(options.encoding),
                direct: !!options.direct,
                path: options.direct_path || '',
                gecos: options.gecos,
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
            bufferObjs.forEach((bufferObj) => {
                let newBuffer = state.addBuffer(net.id, bufferObj.name);
                newBuffer.enabled = true;

                if (newBuffer && !hasSwitchedActiveBuffer) {
                    state.setActiveBuffer(net.id, newBuffer.name);
                    hasSwitchedActiveBuffer = true;
                }

                if (bufferObj.key) {
                    newBuffer.key = bufferObj.key;
                }
            });

            // switch to server buffer if no channels are joined
            if (!options.bouncer && !hasSwitchedActiveBuffer) {
                state.setActiveBuffer(net.id, net.serverBuffer().name);
            }

            net.ircClient.connect();
            let onRegistered = () => {
                if (this.$refs.layout) {
                    this.$refs.layout.close();
                }
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            let onClosed = () => {
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            net.ircClient.once('registered', onRegistered);
            net.ircClient.once('close', onClosed);
        },
        processNickRandomNumber: function processNickRandomNumber(nick) {
            // Replace ? with a random number
            let tmp = (nick || '').replace(/\?/g, () => Math.floor(Math.random() * 100).toString());
            return _.trim(tmp);
        },
        handleCaptcha(isReady) {
            this.captchaReady = isReady;
        },
    },
};
</script>

<style>

/* Containers */

/* Tweak */
.u-form input[type="radio"] {
    float: none;
    position: relative;
    top: -3px;
}
.u-form--big .u-input-text-plaintext {
    line-height: normal;
    top: 9px;
}
/* Fallback EuropNet */
.kiwi-welcome-asl {
    height: 100%;
    text-align: center;
    background-size: 0;
    background-position: bottom;
}

.kiwi-welcome-asl h2 {
    font-size: 1.7em;
    text-align: center;
    padding: 0;
    margin: 0.5em 0 1em 0;
}

.kiwi-welcome-asl-section {
    position: absolute;
    top: 0;
    bottom: 0;
    box-sizing: border-box;
    overflow-y: auto;
}

.kiwi-welcome-asl-section-connection {
    position: relative;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.kiwi-welcome-asl-form {
    background-color: #fff;
    border-radius: 0.5em;
    padding: 1em;
    border: 1px solid #ececec;
}

/** Right side */
.kiwi-welcome-asl-section-info {
    right: 0;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    background-size: cover;
    background-position: bottom;
    border-left: 5px solid #428BCA;
}

.kiwi-welcome-asl-section-info-content {
    background: rgba(255, 255, 255, 0.74);
    margin: 2em;
    color: #1b1b1b;
    font-size: 1.5em;
    padding: 2em;
    line-height: 1.6em;
}

/** Left side */
.kiwi-welcome-asl-error {
    text-align: center;
    margin: 1em 0;
    padding: 1em;
}

.kiwi-welcome-asl-error span {
    display: block;
    font-style: italic;
}

.kiwi-welcome-asl-section-connection label {
    text-align: left;
    display: inline-block;
}

.kiwi-welcome-asl-section-connection .u-form .u-input,
.u-form--big input[type="text"],
.kiwi-welcome-asl-group input[type="text"],
.kiwi-welcome-asl-group input[type="number"],
.kiwi-welcome-asl-group-genders {
    width: 80%;
    height: 24px;
    font-size: 1em;
    padding-left: 0.5em;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    color: #555;
}
.kiwi-welcome-asl-group input[type="number"],
.kiwi-welcome-asl-group-genders {
    padding: 0.21em 1em;
}

span.kiwi-welcome-asl-picto,
.kiwi-welcome-asl-section-connection .u-form .u-input,
.kiwi-welcome-asl-section-connection .u-form--big input[type="text"],
.kiwi-welcome-asl-group input[type="text"],
.kiwi-welcome-asl-group input[type="number"],
.kiwi-welcome-asl-group-genders {
    border: 1px solid;
    border-color: #ccc;
    border-radius: 4px;
}

.kiwi-welcome-asl-section-connection .u-form .u-input,
.kiwi-welcome-asl-section-connection .u-form--big input[type="text"],
.kiwi-welcome-asl-group input[type="text"],
.kiwi-welcome-asl-group input[type="number"],
.kiwi-welcome-asl-group div {
    border-radius: 0 4px 4px 0;
}
.kiwi-welcome-asl-section-connection .u-form .u-input,
.kiwi-welcome-asl-section-connection .u-form--big input[type="text"],
.kiwi-welcome-asl-group input[type="text"],
.kiwi-welcome-asl-group div {
    width: 85%%;
}

.kiwi-welcome-asl .kiwi-welcome-asl-have-password input[type="text"],
.kiwi-welcome-asl-have-password {
    font-size: 0.8em;
    margin: 0.8em 0;
}

.kiwi-welcome-asl-have-password {
    margin-top: 0;
}

.kiwi-welcome-asl-group {
    display: flex;
    width: 85%;
    height: 2em;
    line-height: 1;
    margin: 0 0 8px 0;
}

.kiwi-welcome-asl-nick {
    font-weight: bold;
}

.kiwi-welcome-asl-group-genders {
    display: inline-block;
    font-size: 1em;
    width: 280px;
    padding: 0;
    padding-left: 0.5em;
    padding-top: 6px;
}
.kiwi-welcome-asl-group.gender {
    width: 100%;
}
.kiwi-welcome-asl-group.gender .kiwi-welcome-asl-picto .fa-transgender {
    font-weight: bolder;
}
.kiwi-welcome-asl-section-connection .u-form .u-input, .kiwi-welcome-asl-group input {
    -webkit-transition: border-color ease-in-out 0.15s, -webkit-box-shadow ease-in-out 0.15s;
    -o-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;
    transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;
}

.kiwi-welcome-asl-form input {
    padding: 0.5em;
}

.kiwi-welcome-asl-group input:focus {
    border-color: #66afe9;
    outline: 0;
    -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6);
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6);
}

span.kiwi-welcome-asl-picto {
    display: inline-block;
    width: 40px;
    height: 25px;
    font-size: 1.2em;
    padding-top: 5px;
    color: #555;
    text-align: center;
    background-color: #eee;
    border-right: none;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.kiwi-welcome-asl-group input[type="number"].kiwi-welcome-asl-age {
    width: 4em;
}

.kiwi-welcome-asl-group .age-text {
    margin: 8px 0;
    width: 100px;
}

.kiwi-welcome-asl-group-genders label {
    margin: 0 10px 0 -5px;
    position: relative;
    top: -10px;
    font-size: 1em;
}

.kiwi-welcome-asl-group-genders .gender_m {
    color: #208bfc;
    font-weight: bold;
}

.kiwi-welcome-asl-group-genders .gender_f {
    color: #f0f;
    font-weight: bold;
}

.kiwi-welcome-asl-group-genders .gender_u {
    color: #999;
    font-weight: bold;
}

.kiwi-welcome-asl-group i.fa-slack {
    -ms-transform: rotate(19deg);
    -webkit-transform: rotate(19deg);
    transform: rotate(19deg);
}

.kiwi-welcome-asl-start {
    font-size: 1.1em;
    cursor: pointer;
}

.kiwi-welcome-asl-start[disabled] {
    cursor: not-allowed;
}

.kiwi-welcome-asl-form .u-submit {
    width: 100%;
    line-height: 50px;
    padding: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 400;
    text-shadow: none;
    margin: 0;
    transition: all 0.2s;
    border: none;
    background-color: #428BCA;
}
.kiwi-welcome-asl-form .u-submit:hover {
    background-color: #3071a9;
}

/** Closing - the wiping away of the screen **/
.kiwi-welcome-asl--closing .kiwi-welcome-asl-section-connection {
    left: -50%;
}

.kiwi-welcome-asl--closing .kiwi-welcome-asl-section-info {
    right: -50%;
}

.kiwi-welcome-asl .help {
    position: absolute;
    bottom: 0.2em;
    font-size: 0.8em;
    color: #666;
    width: 50%;
    text-align: center;
}

.kiwi-welcome-asl .help a {
    text-decoration: underline;
    color: #666;
}

.kiwi-welcome-asl .help a:hover {
    color: #a9d87a;
}

/* Styling the preloader */
.kiwi-welcome-asl .fa-spinner {
    position: absolute;
    top: 50%;
    z-index: 999;
    font-size: 100px;
    margin-top: -0.5em;
    left: 50%;
    margin-left: -40px;
}

/** Smaller screen... **/
@media screen and (max-width: 1025px) {
    .kiwi-welcome-asl {
        font-size: 0.9em;
        position: relative;
        min-height: 100%;
    }

    .kiwi-welcome-asl-section-connection {
        width: 100%;
        min-height: 400px;
    }

    .kiwi-welcome-asl-section-info-content {
        margin: 1em;
    }

    .kiwi-welcome-asl-form {
        left: auto;
        margin: 20px auto 20px auto;
        z-index: 100;
        position: relative;
        top: auto;
        align-self: flex-start;
    }

    .kiwi-welcome-asl p.help {
        position: absolute;
        bottom: 20px;
        width: 100%;
        color: #fff;
        z-index: 100;
    }

    .kiwi-welcome-asl p.help a {
        color: #fff;
    }

    .kiwi-welcome-asl-section-info {
        position: static;
        width: 100%;
        border: none;
        min-height: 0;
    }

    .fa-spinner {
        position: absolute;
        left: 48%;
        top: 50%;
        margin-top: -50px;
        color: #fff;
    }

    .kiwi-welcome-asl-section .kiwi-welcome-asl-section-connection {
        position: static;
    }
}

/** Even smaller screen.. probably phones **/
@media screen and (max-width: 750px) {
    .kiwi-welcome-asl {
        font-size: 0.9em;
        overflow-y: auto;
    }

    .kiwi-welcome-asl-section-info-content {
        margin: 0.5em;
    }

    /** Closing - the wiping away of the screen **/
    .kiwi-welcome-asl--closing .kiwi-welcome-asl-section-connection {
        left: -100%;
    }

    .kiwi-welcome-asl--closing .kiwi-welcome-asl-section-info {
        left: -100%;
    }
}

@media screen and (max-width: 400px) {
    .kiwi-welcome-asl-form {
        width: 90%;
    }
}

/** Background /border switching between screen sizes **/
.kiwi-welcome-asl--no-bg .kiwi-welcome-asl-section-info {
    background-color: rgb(51, 51, 51);
}

@media screen and (max-width: 850px) {
    /* Apply some flex so that the info panel fills the rest of the bottom screen */
    .kiwi-welcome-asl {
        background-size: cover;
        display: flex;
        flex-direction: column;
    }

    .kiwi-welcome-asl-section {
        overflow-y: visible;
    }

    .kiwi-welcome-asl-section-info {
        background-size: 0;
        border-left: none;
        flex: 1 0;
        display: block;
    }

    .kiwi-welcome-asl--no-bg .kiwi-welcome-asl-section-info {
        border-top: 5px solid #428BCA;
    }
}
</style>
