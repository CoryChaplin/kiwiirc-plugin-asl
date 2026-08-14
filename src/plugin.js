// Polyfill for Babel-transpiled async/await — Webpack 4 + @babel/preset-env
// emit calls to regeneratorRuntime that aren't otherwise provided.
import 'regenerator-runtime/runtime';

import CustomWelcome from './components/CustomWelcome.vue';
import CustomUserBox from './components/CustomUserBox.vue';
import CustomNicklistUser from './components/CustomNicklistUser.vue';
import UserBrowserButton from './components/UserBrowserButton.vue';
import AslProtection from './components/AslProtection.vue';
import MessageReportButton from './components/MessageReportButton.vue';
import MessageBlockButton from './components/MessageBlockButton.vue';
import MessageKickbanButton from './components/MessageKickbanButton.vue';
import Locales from './libs/locales.js';
import * as config from './config.js';
import * as utils from './libs/utils.js';
import * as nickGlyphObserver from './libs/nickGlyphObserver.js';
import * as reportEcho from './libs/reportEcho.js';

// eslint-disable-next-line no-undef
kiwi.plugin('asl', (kiwi) => {
    config.setDefaults();
    nickGlyphObserver.start();

    // setup the plugins locales
    let localesPath = kiwi.state.getSetting('settings.plugin-asl.localesPath');
    let locales = new Locales();
    locales.init(localesPath, 'plugin-asl', 'age');

    // add the custom welcome screen and replace userbox
    kiwi.addStartup('plugin-asl', CustomWelcome);
    kiwi.replaceModule('components/UserBox', CustomUserBox);
    kiwi.replaceModule('components/NicklistUser', CustomNicklistUser);

    // shared protection host (report modal + block toast), driven by the kiwi.state
    // event bus so the gesture works from the userbox fiche AND from a message action.
    // Mount it INSIDE .kiwi-wrap so the modal + toast inherit the theme tokens
    // (a body-level mount falls back to the plugin's neutral defaults — unstyled).
    function mountProtectionHost() {
        let wrap = document.querySelector('.kiwi-wrap');
        if (!wrap) {
            return;
        }
        let protectionHost = new kiwi.Vue(AslProtection);
        protectionHost.$mount();
        wrap.appendChild(protectionHost.$el);
    }
    // Core emits 'ready' right after the root app (.kiwi-wrap) mounts; plugins init on
    // 'init' just before, so this fires exactly once with the wrap present — no polling.
    if (document.querySelector('.kiwi-wrap')) {
        mountProtectionHost();
    } else {
        kiwi.once('ready', mountProtectionHost);
    }

    // per-message protection actions, injected into the native MessageInfo bar
    // (text links on any theme; the EuropNet theme adds the DS look).
    kiwi.addUi('message_info', MessageReportButton);
    kiwi.addUi('message_info', MessageBlockButton);
    // Kickban (op moderation) lives HERE in the plugin — not in core — on purpose:
    // it keeps the core footprint minimal and reuses the plugin's anchored-popover
    // infra for the reason prompt. This is a pragmatic shortcut: kickban is generic
    // KiwiIRC moderation and SHOULD eventually move into the core MessageInfo
    // (which we patched only to drop the native Ban+Kick it replaces).
    kiwi.addUi('message_info', MessageKickbanButton);

    // The per-message action bar opens on hover (desktop) via the global core
    // setting, but the hover reveal is styled only in the EuropNet theme. Gate it
    // to the configured themes so every other theme keeps KiwiIRC's native
    // behaviour at the source (no hover bar, no thread dim) — cleaner than masking
    // each effect in CSS. Theme is resolved before plugins load, so apply now and
    // on every theme change.
    function applyHoverActionGate() {
        let themes = config.getSetting('hoverActionThemes') || [];
        let current = (kiwi.state.setting('theme') || '').toLowerCase();
        let enabled = themes.some((name) => String(name).toLowerCase() === current);
        kiwi.state.setting('buffers.show_message_info_on_hover', enabled);
    }
    applyHoverActionGate();
    kiwi.state.$watch(() => kiwi.state.setting('theme'), applyHoverActionGate);

    // show the user browser if its enabled
    if (kiwi.state.getSetting('settings.plugin-asl.showUserBrowser')) {
        // add a button to channel headers to open the sidebar component
        let browserButton = new kiwi.Vue(UserBrowserButton);
        browserButton.$mount();
        kiwi.addUi('header_channel', browserButton.$el);
    }

    kiwi.state.$on('network.new', (event) => {
        let ident = window.localStorage && window.localStorage.getItem('irc_ident');
        if (ident && ident.length === 11) event.network.username = ident;
    });

    // Reports go out as a /msg to the moderation bot (or to the fallback channel). With
    // echo-message the server sends our own message back, which would open a query showing
    // the report to the user who filed it. Absorb that echo here: core bails out as soon as
    // handled is set, so no buffer is created and nothing is rendered.
    kiwi.on('irc.message', (event, net, ircEvent) => {
        if (reportEcho.isReportEcho(event, net)) {
            ircEvent.handled = true;
            return;
        }
        // Core drops ident/hostname when it turns the event into a Message, and a sender
        // we share no channel with (a service, a drive-by notice) has no user object to
        // read the host from either — so the protection actions couldn't tell a service
        // apart from a user. tags is the only field the Message keeps by reference from
        // this event, so stash the host there: it then lives exactly as long as the line
        // it describes, with no cache to bound or evict. The key is always set or cleared,
        // never left alone, so an incoming tag of the same name can't be read as ours.
        event.tags = event.tags || {};
        if (event.hostname) {
            event.tags['asl/host'] = event.hostname;
        } else {
            delete event.tags['asl/host'];
        }
    });

    // handle user joining one of the channels
    kiwi.on('irc.join', (event, net) => {
        if (event.gecos) {
            updateUser(net, {
                nick: event.nick,
                username: event.ident,
                host: event.hostname,
                realname: event.gecos,
            });
        } else {
            // if extended-join is not enabled we wont have the user gecos
            // so we will have to get it via a who request
            net.ircClient.who(event.nick);
        }
    });

    // handle incoming who response
    kiwi.on('irc.wholist', (event, net) => {
        event.users.forEach((user) => {
            updateUser(net, {
                nick: user.nick,
                realname: user.real_name,
            });
        });
    });

    // handle a user changing nick. Kiwi core clears user.colour during the nick
    // change so it can recompute a nick-hash colour, which wipes out the ASL
    // (sex-based) colour the plugin set. Re-apply it once core has finished.
    // We defer with nextTick because this handler runs before core's
    // changeUserNick() in the same synchronous event dispatch.
    kiwi.on('irc.nick', (event, net) => {
        kiwi.Vue.nextTick(() => {
            let userObj = kiwi.state.getUser(net.id, event.new_nick);
            if (userObj && userObj.asl) {
                kiwi.Vue.set(userObj, 'colour', utils.getColour(userObj.asl));
            }
        });
    });

    function updateUser(net, user) {
        let userObj = kiwi.state.getUser(net.id, user.nick) || kiwi.state.addUser(net, user);
        let parsedGecos = utils.parseGecos(user.realname);
        kiwi.Vue.set(userObj, 'asl', parsedGecos.asl);
        kiwi.Vue.set(userObj, 'aslRealname', parsedGecos.realname);
        kiwi.Vue.set(userObj, 'colour', utils.getColour(userObj.asl));
        // Messages may already be rendered in the message list before this ASL data arrives
        // (e.g. a late WHO response) — reclassify whatever's already on screen for this nick.
        nickGlyphObserver.reclassifyNick(userObj.nick);
    }
});
