/**
 * Declarative rule evaluator — port of irception's form.js client-side
 * evaluator. The rules data is supplied by the irception backend through
 * /form/config; this module only interprets it.
 *
 * State shape expected by evalCondition / evaluateRules:
 *   {
 *     age:           number | string  (free-text input value),
 *     gender:        'M' | 'F' | 'U' | '' (empty when not set),
 *     topics:        string[]         (active topic keys),
 *     channels:      string[]         (channel names with leading '#'),
 *     manualChannels: string[]        (subset of channels with source manual/stored),
 *   }
 */

function evalCondition(condition, state) {
    if (condition.field) {
        let val = state[condition.field];
        if (val === '' || val === null || val === undefined) {
            // Absent/empty value: only `!=` can satisfy.
            return condition.op === '!=';
        }
        let num = Number(val);
        if (Number.isNaN(num)) {
            // String comparison (gender etc.)
            switch (condition.op) {
            case '==': return val === condition.value;
            case '!=': return val !== condition.value;
            default: return false;
            }
        }
        // Numeric comparison (age etc.)
        switch (condition.op) {
        case '>=': return num >= condition.value;
        case '>': return num > condition.value;
        case '<': return num < condition.value;
        case '<=': return num <= condition.value;
        case '==': return num === condition.value;
        case '!=': return num !== condition.value;
        default: return false;
        }
    }
    if (condition.topic_active) {
        return state.topics.includes(condition.topic_active);
    }
    if (condition.channel_active) {
        return state.channels
            .map((c) => c.toLowerCase())
            .includes(condition.channel_active.toLowerCase());
    }
    if (condition.or) {
        return condition.or.some((c) => evalCondition(c, state));
    }
    if (condition.and) {
        return condition.and.every((c) => evalCondition(c, state));
    }
    return false;
}

/**
 * Returns true when topicKey is forced active by a channel_triggers_topic rule
 * whose triggering channel is manual/stored. In that state the topic cannot be
 * dismissed via topic_deselects — removing the channel first is required.
 */
function isTopicHeld(topicKey, rules, state) {
    let manual = (state.manualChannels || []).map((c) => c.toLowerCase());
    if (!manual.length) return false;
    return rules.some((rule) => rule.type === 'channel_triggers_topic'
        && rule.activates === topicKey
        && evalCondition(rule.condition, state)
        && rule.channels.some((ch) => manual.includes(ch.toLowerCase())));
}

/**
 * Evaluate the full rule set against the current form state.
 *
 * Returns a result object listing what should be hidden, disabled, blocked
 * or removed, plus a list of `corrections` that the caller must apply
 * (toggling topics or removing channels). Corrections may cascade — the
 * caller should re-run evaluateRules after applying them, mirroring the
 * double-pass logic in irception's form.js applyRulesUI.
 */
function evaluateRules(rules, state) {
    let result = {
        disabledTopics: {},
        hiddenTopics: {},
        blockedChannels: {},
        channelsToRemove: [],
        lockedChannels: [],
        corrections: [],
    };

    for (let i = 0; i < rules.length; i++) {
        let rule = rules[i];
        switch (rule.type) {
        case 'topic_requires':
            if (!evalCondition(rule.condition, state)) {
                result.disabledTopics[rule.topic] = rule.message;
                result.hiddenTopics[rule.topic] = rule.message;
                if (state.topics.includes(rule.topic)) {
                    result.corrections.push({
                        removeTopic: rule.topic,
                        message: rule.message,
                    });
                }
            }
            break;

        case 'topic_excludes':
            if (state.topics.includes(rule.topic)) {
                rule.excludes.forEach((t) => {
                    result.disabledTopics[t] = rule.message;
                    if (state.topics.includes(t)) {
                        result.corrections.push({
                            removeTopic: t,
                            message: rule.message,
                        });
                    }
                });
            }
            break;

        case 'topic_deselects':
            if (state.topics.includes(rule.topic)) {
                if (isTopicHeld(rule.topic, rules, state)) {
                    // Topic is pinned by a manual channel — disable conflicting
                    // chips so the user knows to remove the channel first.
                    rule.deselects.forEach((t) => {
                        result.disabledTopics[t] = rule.message;
                    });
                } else {
                    rule.deselects.forEach((t) => {
                        if (state.topics.includes(t)) {
                            result.corrections.push({
                                removeTopic: t,
                                message: rule.message,
                            });
                        }
                    });
                }
            }
            break;

        case 'channel_blocked':
            if (evalCondition(rule.condition, state)) {
                let stateLower = state.channels.map((c) => c.toLowerCase());
                rule.channels.forEach((ch) => {
                    result.blockedChannels[ch] = rule.message || '';
                    if (stateLower.includes(ch.toLowerCase())) {
                        result.channelsToRemove.push(ch);
                    }
                });
            }
            break;

        case 'channel_triggers_topic':
            if (
                state.channels.some((ch) => rule.channels.includes(ch)) &&
                    evalCondition(rule.condition, state) &&
                    !state.topics.includes(rule.activates)
            ) {
                result.corrections.push({ activateTopic: rule.activates });
            }
            break;

        case 'channel_conditional':
            if (evalCondition(rule.show_unless, state)) {
                result.blockedChannels[rule.channel] = '';
                let chLower = rule.channel.toLowerCase();
                if (state.channels.map((c) => c.toLowerCase()).includes(chLower)) {
                    result.channelsToRemove.push(rule.channel);
                }
            }
            break;

        case 'channel_locked':
            rule.channels.forEach((ch) => result.lockedChannels.push(ch));
            break;

        default:
            break;
        }
    }

    return result;
}

export {
    evalCondition,
    evaluateRules,
    isTopicHeld
};
