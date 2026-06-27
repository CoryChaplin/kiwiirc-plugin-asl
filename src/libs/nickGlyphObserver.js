/* global kiwi:true */

// The per-message nick is rendered inline by core .vue components with no hook or slot for
// plugins. So instead of patching the core, we mutate the DOM directly on a selector that's
// already public and stable (`.kiwi-messagelist-nick[data-nick]`, identical across densities).

import * as utils from './utils.js';
import { getSetting } from '../config.js';

const GENDER_CLASSES = ['g-f', 'g-m', 'g-u'];
const NICK_SELECTOR = '.kiwi-messagelist-nick[data-nick]';

let observer = null;

function resolveUser(nick) {
    let buffer = kiwi.state.getActiveBuffer();
    return buffer ? kiwi.state.getUser(buffer.networkid, nick) : null;
}

// Idempotent: safe to call repeatedly on the same node (a re-run after a late WHO response
// just replaces the previous class instead of stacking).
function classify(el) {
    let user = resolveUser(el.dataset.nick);
    let genderClass = utils.getGenderClass(user && user.asl);

    GENDER_CLASSES.forEach((c) => el.classList.remove(c));
    if (genderClass) el.classList.add(genderClass);
}

function classifyNick(nick) {
    let selector = NICK_SELECTOR + '[data-nick="' + nick.toLowerCase() + '"]';
    document.querySelectorAll(selector).forEach(classify);
}

function onMutations(mutations) {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            if (node.matches(NICK_SELECTOR)) classify(node);
            node.querySelectorAll(NICK_SELECTOR).forEach(classify);
        });
    });
}

export function start() {
    if (observer || !getSetting('showGenderGlyph')) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true, subtree: true });
}

// Re-applies classification to nicks already in the DOM — covers the case where a message
// rendered before this user's ASL data arrived (late WHO response).
export function reclassifyNick(nick) {
    if (!getSetting('showGenderGlyph')) return;
    classifyNick(nick);
}
