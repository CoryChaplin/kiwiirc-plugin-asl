/**
 * Read/write the welcome form's per-network state on the Kiwi Network
 * object. Kiwi serialises only a whitelist of network fields, but
 * `network.settings` is cloneDeep'd at export and restored verbatim at
 * import — so it's the canonical extension point for plugin-owned data.
 *
 * State stored under `net.settings.pluginAsl`:
 *   {
 *     topics:          string[],   // selected topic keys (irception)
 *     manualChannels:  string[],   // subset of net.buffers tagged 'manual'
 *     removedChannels: string[],   // explicitly removed, not re-added by /recommend
 *   }
 *
 * No localStorage key — persistence rides Kiwi's native state save.
 */

/* global kiwi:true */

const SETTINGS_KEY = 'pluginAsl';

function emptyState() {
    return {
        topics: [],
        manualChannels: [],
        removedChannels: [],
    };
}

export function readWelcomeState(net) {
    if (!net || !net.settings) {
        return emptyState();
    }
    let data = net.settings[SETTINGS_KEY] || {};
    return {
        topics: Array.isArray(data.topics) ? data.topics.slice() : [],
        manualChannels: Array.isArray(data.manualChannels) ? data.manualChannels.slice() : [],
        removedChannels: Array.isArray(data.removedChannels) ? data.removedChannels.slice() : [],
    };
}

export function writeWelcomeState(net, state) {
    if (!net) return;
    if (!net.settings) {
        kiwi.Vue.set(net, 'settings', {});
    }
    kiwi.Vue.set(net.settings, SETTINGS_KEY, {
        topics: (state && state.topics) || [],
        manualChannels: (state && state.manualChannels) || [],
        removedChannels: (state && state.removedChannels) || [],
    });
}
