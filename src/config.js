/* global kiwi:true */
/* global _:true */

import { normalizeChannelName } from './libs/utils.js';

const basePath = getBasePath();
const configBase = 'plugin-asl';

const defaultConfig = {
    // Where the web browser can find the locale json files
    localesPath: basePath + 'plugin-asl/locales',

    // Type 1 "[a/s/l?] realname?"
    // Type 2 "a s l?"
    gecosType: 1,

    // If should show location input box on welcome screen
    showLocation: true,

    // If should show realname input box on welcome screen
    showRealname: false,

    // Themes on which the premium per-message action bar opens on hover (desktop).
    // Empty by default: the plugin stays theme-agnostic, so no theme gets the hover
    // reveal unless the client config lists it explicitly. Any theme not listed keeps
    // KiwiIRC's native behaviour. Names must match the client config themes[] names.
    hoverActionThemes: [],

    // Channels considered "official" — a user who is op/halfop of one of these gets the
    // "Moderator" badge in the userbox. Declared in the client config; leading sigils
    // optional. Empty → no Moderator badge is derived. The form-config endpoint, when
    // reachable, enriches this list at runtime (best-effort); it is not required.
    officialChannels: [],

    // Enable User Browser
    showUserBrowser: true,

    // What icon to use for User Browser
    userBrowserIcon: 'fa-heart',

    // What colour to use if user did not provide sex
    // 'default' is css default colour
    // '' for random
    fallbackColour: 'default',

    // Show A/S/L as one line (pictos separated by ·) in the userbox; false = one row per fact.
    singleLineUserbox: true,

    // Single line string builder
    // age/sex/location (if they exist) are joined by the separator
    singleLineString: {
        age: '_age_years',
        sex: '%s',
        location: '%l',
        separator: ' ',
    },

    // Accepted age range for the Connect button to be enabled
    allowedAge: {
        min: '18',
        max: '99',
    },

    // Age ranges to show on UserBrowser select
    // values can be:
    //   string - treated as all
    //   <50    - less than integer
    //   >50    - greater than integer
    //   25-50  - an inclusive range
    ageRanges: [
        { name: '_all', value: 'all' },
        { name: '< 25', value: '<25' },
        { name: '25 - 45', value: '25-46' },
        { name: '> 45', value: '>45' },
    ],

    // Sex selection and parsing
    // chars is for matching against gecos (can contain multiple)
    // the first char will be used in gecos creation
    sexes: {
        _male: { chars: 'M', colour: '#00F' },
        _female: { chars: 'F', colour: '#F0F' },
        _other: { chars: 'O', colour: '#0F0' },
    },

    // Keys used to get asl from query string
    queryKeys: {
        age: 'age',
        sex: 'sex',
        sexe: 'sexe',
        location: 'location',
        ville: 'ville',
        realname: 'realname',
        channel: 'channel',
    },

    // Fields required for connect button to become active
    // age, sex, location, realname
    requiredFields: [],

    // Restore last ASL from state persistence
    welcomeUsesLocalStorage: true,

    // Abuse report channel
    reportChannel: '#abuse',

    // Max lines attached to an abuse report. Also caps the time window below, and is
    // the plain line count used when a report has no message to anchor on.
    reportLogLines: 20,

    // When a report points at a specific message, attach the messages within this many
    // seconds before/after it instead of a flat line count. The "after" side is taken
    // at send time (whatever has arrived), since reporting happens after the fact.
    reportLogSecondsBefore: 120,
    reportLogSecondsAfter: 60,
    // Keep at least this many lines before the reported message even when they fall
    // outside the window above, so a quiet channel still carries some context.
    reportLogMinLinesBefore: 5,

    // Display all users in common channels UserBrowser
    browseAllUsers: false,

    // If should show discussion topics input box on welcome screen
    showTopics: true,

    // Irception API base URL — provides /form/config, /getLocation, /recommend/json
    irceptionApiUrl: 'https://irception.europnet.org',

    // Origin ID sent to the irception API (identifies this client/site)
    irceptionOrigin: 1,
};

export function setDefaults() {
    let walkConfig = (obj, _target) => {
        _.each(obj, (val, key) => {
            let target = [..._target, key];
            let targetName = target.join('.');
            if (typeof val === 'object' && !_.isArray(val)) {
                walkConfig(val, target);
            } else if (typeof getSetting(targetName) === 'undefined') {
                setSetting(targetName, val);
            }
        });
    };
    walkConfig(defaultConfig, []);

    // Set internal defaults
    const pluginASL = kiwi.state.pluginASL = Object.create(null);

    // Set of official channel names (bare, lowercase) for the Moderator badge — seeded from
    // the officialChannels config list; the form-config endpoint may add more at runtime.
    pluginASL.officialChannels = new Set(
        (getSetting('officialChannels') || []).map(normalizeChannelName)
    );

    const ageRanges = getSetting('ageRanges');
    pluginASL.selectedAgeRange = ageRanges[0].value;

    const sexes = getSetting('sexes');
    const sexesKeys = Object.keys(sexes);
    pluginASL.selectedSexes = {};
    let sexesRegex = '';
    for (let i = 0; i < sexesKeys.length; i++) {
        let sex = sexesKeys[i];
        pluginASL.selectedSexes[sex] = true;
        sexesRegex += sexes[sex].chars;
    }

    pluginASL.gecosTypes = [];
    pluginASL.gecosTypes.push({
        regex: new RegExp('\\[(\\d+|\\*)\\/([' + sexesRegex + '*])(\\/(.*?|\\*))?\\](\\s*(.+))?'),
        male: sexesRegex.substr(0, 1),
        female: sexesRegex.substr(1, 1),
        other: sexesRegex.substr(2, 1),
        build: '[%asl] %r',
        separator: '/',
    });
    pluginASL.gecosTypes.push({
        regex: new RegExp('(\\d+)\\s+([' + sexesRegex + '])(\\s+(.*))?'),
        male: sexesRegex.substr(0, 1),
        female: sexesRegex.substr(1, 1),
        other: sexesRegex.substr(2, 1),
        build: '%asl',
        separator: ' ',
    });

    pluginASL.userFilter = '';
}

// Merge a form-config's channel categories into the official-channels set (best-effort
// enrichment on top of the officialChannels config list). Called wherever form-config loads.
export function addOfficialChannels(formConfig) {
    let official = kiwi.state.pluginASL.officialChannels;
    ((formConfig && formConfig.channelCategories) || []).forEach((cat) => {
        (cat.channels || []).forEach((ch) => {
            if (ch) {
                official.add(normalizeChannelName(ch));
            }
        });
    });
}

export function setting(name) {
    return kiwi.state.setting([configBase, name].join('.'));
}

export function getSetting(name) {
    return kiwi.state.getSetting(['settings', configBase, name].join('.'));
}

export function setSetting(name, value) {
    return kiwi.state.setSetting(['settings', configBase, name].join('.'), value);
}

function getBasePath() {
    const scripts = document.getElementsByTagName('script');
    const scriptPath = scripts[scripts.length - 1].src;
    return scriptPath.substr(0, scriptPath.lastIndexOf('/') + 1);
}
