// Polyfill for Babel-transpiled async/await — Webpack 4 + @babel/preset-env
// emit calls to regeneratorRuntime that aren't otherwise provided.
import 'regenerator-runtime/runtime';

import CustomWelcome from './components/CustomWelcome.vue';
import CustomUserBox from './components/CustomUserBox.vue';
import CustomNicklistUser from './components/CustomNicklistUser.vue';
import UserBrowserButton from './components/UserBrowserButton.vue';
import Locales from './libs/locales.js';
import * as config from './config.js';
import * as utils from './libs/utils.js';
import * as nickGlyphObserver from './libs/nickGlyphObserver.js';

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
