<template>
    <div class="kiwi-asl-protection-host">
        <div
            v-if="report_user_display"
            ref="ssOverlay"
            class="kiwi-asl-overlay"
            @click.self="closeReport"
        >
            <div
                ref="ssModal"
                class="kiwi-asl-modal"
                role="dialog"
                aria-modal="true"
                tabindex="-1"
                :aria-label="t('plugin-asl:report_title', { nick: targetNick })"
            >
                <div class="kiwi-asl-modal-head">
                    <span class="kiwi-asl-modal-icon">
                        <i class="fa fa-flag" aria-hidden="true" />
                    </span>
                    <span class="kiwi-asl-modal-title">
                        {{ t('plugin-asl:report_title', { nick: targetNick }) }}
                    </span>
                    <button
                        type="button"
                        class="kiwi-asl-modal-close"
                        :aria-label="t('plugin-asl:report_close')"
                        @click="closeReport"
                    >
                        <i class="fa fa-times" aria-hidden="true" />
                    </button>
                </div>
                <div class="kiwi-asl-modal-body">
                    <p class="kiwi-asl-modal-intro">{{ t('plugin-asl:report_modal_intro') }}</p>
                    <div
                        class="kiwi-asl-reasons"
                        role="radiogroup"
                        :aria-label="t('plugin-asl:report_modal_intro')"
                    >
                        <label
                            v-for="reason in reportReasons"
                            :key="reason.key"
                            class="kiwi-asl-reason"
                            :class="{ 'is-sel': report_reasons === reason.label }"
                        >
                            <input
                                v-model="report_reasons"
                                type="radio"
                                name="kiwi-asl-report-reason"
                                class="kiwi-asl-sr-input"
                                :value="reason.label"
                            >
                            <span class="kiwi-asl-reason-radio" aria-hidden="true" />
                            {{ reason.label }}
                        </label>
                    </div>
                    <label
                        class="kiwi-asl-combine"
                        :class="{ 'is-on': report_block_too }"
                    >
                        <input
                            v-model="report_block_too"
                            type="checkbox"
                            class="kiwi-asl-sr-input"
                        >
                        <span class="kiwi-asl-combine-box">
                            <i class="fa fa-check" aria-hidden="true" />
                        </span>
                        <span class="kiwi-asl-combine-text">
                            <b>{{ t('plugin-asl:report_block_too', { nick: targetNick }) }}</b>
                            <span>{{ t('plugin-asl:report_block_too_hint') }}</span>
                        </span>
                    </label>
                    <div class="kiwi-asl-note">
                        <i class="fa fa-paperclip" aria-hidden="true" />
                        {{ t('plugin-asl:report_log_note') }}
                    </div>
                    <div class="kiwi-asl-modal-foot">
                        <button type="button" class="kiwi-asl-btn is-cancel" @click="closeReport">
                            {{ t('plugin-asl:report_cancel') }}
                        </button>
                        <button
                            type="button"
                            class="kiwi-asl-btn is-send"
                            :disabled="!report_reasons || report_sending"
                            @click="submitReportForm"
                        >
                            <i
                                v-if="report_sending"
                                class="fa fa-spinner fa-spin"
                                aria-hidden="true"
                            />
                            <template v-else>
                                <i class="fa fa-flag" aria-hidden="true" />
                                {{ t('plugin-asl:report_send') }}
                            </template>
                        </button>
                    </div>
                </div>
            </div>
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
                {{ t('plugin-asl:undo') }}
            </button>
        </div>
        <!-- kickban: anchored reason popover; the catcher blocks the list scroll and
             closes on an outside click while the popover is open -->
        <div
            v-if="kickban_open"
            class="kiwi-asl-kb-catch"
            @click="closeKickban"
            @wheel.prevent
            @touchmove.prevent
        >
            <div ref="kbPop" class="kiwi-asl-kb-pop" @click.stop>
                <div class="kiwi-asl-kb-title">
                    {{ t('user_kickban') }}
                    <template v-if="kickban_target"> — {{ kickban_target.user.nick }}</template>
                </div>
                <input
                    ref="kbInput"
                    v-model="kickban_reason"
                    type="text"
                    class="kiwi-asl-kb-input"
                    :placeholder="t('kick_reason')"
                    @keydown.enter="confirmKickban"
                >
                <div class="kiwi-asl-kb-foot">
                    <button type="button" class="kiwi-asl-btn is-cancel" @click="closeKickban">
                        {{ t('plugin-asl:report_cancel') }}
                    </button>
                    <button type="button" class="kiwi-asl-btn is-send" @click="confirmKickban">
                        {{ t('user_kickban') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

/* global kiwi:true */

import * as config from '../config.js';
import * as utils from '../libs/utils.js';

let TextFormatting = kiwi.require('helpers/TextFormatting');

// Single owner of the report modal and the block toast, so the same actions can be
// triggered from the userbox or from a per-message button without duplicating logic.
// Wired through a small kiwi.state event bus.
export default {
    data: function data() {
        return {
            // target of the report modal, set on open and read only by the report
            // flow (block/kickban act on their own payloads, never this)
            target: null,
            report_user_display: false,
            report_sending: false,
            report_reasons: '',
            report_block_too: true,
            toast_visible: false,
            toast_message: '',
            toast_icon: '',
            toast_has_undo: false,
            // op moderation: anchored reason popover (kickban)
            kickban_open: false,
            kickban_reason: '',
            kickban_target: null,
        };
    },
    computed: {
        targetNick() {
            return this.target && this.target.user ? this.target.user.nick : '';
        },
        reportReasons: function reportReasons() {
            return [
                { key: 'harassment', label: TextFormatting.t('plugin-asl:report_reason_harassment') },
                { key: 'insults', label: TextFormatting.t('plugin-asl:report_reason_insults') },
                { key: 'sexual_content', label: TextFormatting.t('plugin-asl:report_reason_sexual_content') },
                { key: 'child_endangerment', label: TextFormatting.t('plugin-asl:report_reason_child_endangerment') },
                { key: 'underage', label: TextFormatting.t('plugin-asl:report_reason_underage') },
                { key: 'spam', label: TextFormatting.t('plugin-asl:report_reason_spam') },
                { key: 'paid_offer', label: TextFormatting.t('plugin-asl:report_reason_paid_offer') },
                { key: 'indecent_proposal', label: TextFormatting.t('plugin-asl:report_reason_indecent_proposal') },
            ];
        },
    },
    watch: {
        report_user_display: function watchReportOpen(open) {
            // Portal the overlay to the app root so its backdrop-filter blurs the
            // whole page uniformly (when nested deeper it only blurs its own
            // stacking context — rail/navbar stay sharp).
            if (!open) {
                if (this.reportTrigger && this.reportTrigger.focus) {
                    this.reportTrigger.focus();
                }
                this.reportTrigger = null;
                return;
            }
            this.$nextTick(() => {
                let wrap = document.querySelector('.kiwi-wrap');
                if (wrap && this.$refs.ssOverlay) {
                    wrap.appendChild(this.$refs.ssOverlay);
                }
                if (this.$refs.ssModal) {
                    this.$refs.ssModal.focus();
                }
            });
        },
    },
    created: function created() {
        // event bus: the userbox and the per-message buttons emit here
        this.$state.$on('asl.protect.report', this.onReportRequest);
        this.$state.$on('asl.protect.block', this.onBlockRequest);
        this.$state.$on('asl.protect.kickban', this.onKickbanRequest);
    },
    mounted: function mounted() {
        document.addEventListener('keydown', this.onKeydown);
    },
    beforeDestroy: function beforeDestroy() {
        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
        }
        document.removeEventListener('keydown', this.onKeydown);
        this.$state.$off('asl.protect.report', this.onReportRequest);
        this.$state.$off('asl.protect.block', this.onBlockRequest);
        this.$state.$off('asl.protect.kickban', this.onKickbanRequest);
        if (this.$refs.ssOverlay && this.$refs.ssOverlay.parentNode) {
            this.$refs.ssOverlay.parentNode.removeChild(this.$refs.ssOverlay);
        }
    },
    methods: {
        // mounted standalone (outside the app tree) so it has no component i18n
        // ($t → _i18n undefined). Use the TextFormatting helper instead.
        t: function t(key, opts) {
            return TextFormatting.t(key, opts);
        },
        // ── bus handlers ──
        onReportRequest: function onReportRequest(payload) {
            // payload: { network, buffer, user, trigger? }
            this.target = payload;
            this.report_reasons = '';
            this.report_block_too = true;
            this.report_sending = false;
            this.reportTrigger = payload.trigger || document.activeElement;
            this.report_user_display = true;
        },
        onBlockRequest: function onBlockRequest(payload) {
            // payload: { network, user } — toggle ignore + reversible toast.
            // Everything below acts on the captured payload (never this.target), so a
            // block firing while the report modal is open can't corrupt the report.
            this.toggleIgnore(payload);
            if (payload.user.ignore) {
                this.notifyBlocked(payload);
                this.showToast(
                    TextFormatting.t('plugin-asl:block_toast', { nick: payload.user.nick }),
                    'fa-ban',
                    () => this.undoBlockAction(payload)
                );
            } else {
                this.notifyUnblocked(payload);
                this.showToast(
                    TextFormatting.t('plugin-asl:unblock_toast', { nick: payload.user.nick }),
                    'fa-eye',
                    () => this.undoUnblockAction(payload)
                );
            }
        },
        // ── kickban (op moderation, anchored reason popover) ──
        onKickbanRequest: function onKickbanRequest(payload) {
            // payload: { buffer, network, user, anchor: {top,bottom,left,right} }
            this.kickban_target = payload;
            this.kickban_reason = '';
            this.kickban_open = true;
            this.$nextTick(() => this.placeKickban(payload.anchor));
        },
        placeKickban: function placeKickban(anchor) {
            // clamp the popover to the viewport, flipping above the anchor if it
            // would overflow the bottom
            let pop = this.$refs.kbPop;
            if (!pop) {
                return;
            }
            let gap = 6;
            let left = Math.max(8, Math.min(anchor.left, window.innerWidth - pop.offsetWidth - 8));
            let top = anchor.below + gap;
            if (top + pop.offsetHeight > window.innerHeight - 8) {
                top = Math.max(8, anchor.above - gap - pop.offsetHeight);
            }
            pop.style.top = top + 'px';
            pop.style.left = left + 'px';
            if (this.$refs.kbInput) {
                this.$refs.kbInput.focus();
            }
        },
        confirmKickban: function confirmKickban() {
            let t = this.kickban_target;
            if (t) {
                t.buffer.banKickUser(t.user, this.kickban_reason || undefined);
            }
            this.closeKickban();
        },
        closeKickban: function closeKickban() {
            this.kickban_open = false;
            this.kickban_target = null;
            this.kickban_reason = '';
        },
        // ── modal a11y ──
        closeReport: function closeReport() {
            this.report_user_display = false;
        },
        onKeydown: function onKeydown(e) {
            // kickban popover is modal too: trap Tab so focus can't reach the page
            // behind the full-screen catcher (where Enter could fire a hidden control)
            if (this.kickban_open) {
                if (e.key === 'Escape') {
                    this.closeKickban();
                } else if (e.key === 'Tab') {
                    this.trapFocus(e, this.$refs.kbPop);
                }
                return;
            }
            if (!this.report_user_display) {
                return;
            }
            if (e.key === 'Escape') {
                this.closeReport();
                return;
            }
            if (e.key === 'Tab') {
                this.trapFocus(e, this.$refs.ssModal);
            }
        },
        trapFocus: function trapFocus(e, container) {
            if (!container) {
                return;
            }
            let focusable = Array.from(container.querySelectorAll(
                'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
            )).filter((el) => !el.disabled && el.offsetParent !== null);
            if (!focusable.length) {
                return;
            }
            let first = focusable[0];
            let last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        },
        // ── report ──
        // Picks the messages attached to a report. When the report points at a
        // message, the window is centred on it so its context survives the channel
        // scrolling on; otherwise it falls back to the last N lines.
        selectLogMessages: function selectLogMessages(target) {
            let all = target.buffer.messagesObj.messages || [];
            let maxLines = config.getSetting('reportLogLines');
            if (maxLines <= 0) {
                // 0 disables the log; return early so slice(-0) can't return everything
                return [];
            }
            if (!target.message || !all.length) {
                return all.slice(-maxLines);
            }
            // match by id (stable logical identity) rather than object reference,
            // which can drift on message-list rebuilds; indexOf as a last resort
            let idx = all.findIndex((m) => m.id === target.message.id);
            if (idx === -1) {
                idx = all.indexOf(target.message);
            }
            if (idx === -1) {
                // reported message trimmed from scrollback: don't fail the report
                return all.slice(-maxLines);
            }
            let t0 = all[idx].server_time || all[idx].time;
            let msBefore = config.getSetting('reportLogSecondsBefore') * 1000;
            let msAfter = config.getSetting('reportLogSecondsAfter') * 1000;
            let time = (m) => (m.server_time || m.time);
            // grow the window outward from the reported message by time
            let start = idx;
            while (start > 0 && (t0 - time(all[start - 1])) <= msBefore) {
                start--;
            }
            let end = idx;
            while (end < all.length - 1 && (time(all[end + 1]) - t0) <= msAfter) {
                end++;
            }
            // floor: always keep a few lines before, even if older than the window
            let minBefore = config.getSetting('reportLogMinLinesBefore');
            if (idx - start < minBefore) {
                start = Math.max(0, idx - minBefore);
            }
            let msgs = all.slice(start, end + 1);
            // cap: never exceed maxLines, keeping the reported message centred
            if (msgs.length > maxLines) {
                let rel = idx - start;
                let capStart = Math.max(0, rel - Math.floor(maxLines / 2));
                capStart = Math.min(capStart, msgs.length - maxLines);
                msgs = msgs.slice(capStart, capStart + maxLines);
            }
            return msgs;
        },
        // HH:MM:SS of a message, from m.time so the notice timestamp matches the
        // reported line's timestamp in the attached log (moderators cross-reference)
        formatLogTime: function formatLogTime(m) {
            return (new Date(m.time)).toLocaleTimeString(undefined, {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
        },
        buildConversationLog: function buildConversationLog(target) {
            let reportedId = target.message ? target.message.id : null;
            let flag = '>>> [' + TextFormatting.t('plugin-asl:report_log_flag') + '] ';
            return this.selectLogMessages(target)
                .filter((m) => m.message && m.message.trim().length)
                .map((m) => {
                    // only privmsg needs the <nick> prefix; every other type is
                    // already self-describing in m.message
                    let text = m.type === 'privmsg' ? `<${m.nick}> ${m.message}` : m.message;
                    if (!text.length) return null;
                    let line = `[${this.formatLogTime(m)}] ${text}`;
                    // flag the reported line so moderators spot it in the context
                    if (reportedId !== null && m.id === reportedId) {
                        line = flag + line;
                    }
                    return line;
                })
                .filter(Boolean)
                .join('\r\n');
        },
        // Where to send the report: a private message to the moderation bot when it is
        // online, otherwise the fallback channel. A WHOIS would notify the target; WHO is
        // silent and its callback returns an empty user list when the nick is offline. A
        // timeout guarantees the report still goes out (channel fallback) if WHO stalls.
        resolveReportTarget: function resolveReportTarget(network) {
            let channel = config.getSetting('reportChannel');
            let bot = config.getSetting('reportBot');
            if (!bot) {
                return Promise.resolve(channel);
            }
            return new Promise((resolve) => {
                let settled = false;
                let finish = (target) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    resolve(target);
                };
                let timer = setTimeout(() => finish(channel), 4000);
                network.ircClient.who(bot, (event) => {
                    finish(event.users && event.users.length ? bot : channel);
                });
            });
        },
        submitReportForm: async function submitReportForm() {
            // capture the gesture's target now: this.target may be repointed by
            // another protect event while the log upload is in flight
            let reportTarget = this.target;
            // protection is guaranteed: block right away if requested, even if the report fails
            if (this.report_block_too && !reportTarget.user.ignore) {
                this.toggleIgnore(reportTarget);
            }
            this.report_sending = true;
            let nickname = reportTarget.user.nick;
            let network = reportTarget.network;
            let buffer = reportTarget.buffer;
            // guard against a missing buffer: throwing here, before the try below,
            // would leave report_sending stuck and disable the send button
            let isChannelReport = !!(buffer && buffer.isChannel && buffer.isChannel());
            let reported = reportTarget.message;

            try {
                let logUrl = null;
                if (kiwi.fileuploader) {
                    try {
                        const logText = this.buildConversationLog(reportTarget);
                        // no lines to attach (e.g. reportLogLines <= 0): skip the upload
                        // so "no log" means no URL, and the confirmation doesn't claim
                        // context that isn't there
                        if (logText) {
                            const ts = Date.now();
                            const result = await kiwi.fileuploader.uploadBlob(logText, {
                                filename: `report_${nickname}_${ts}.txt`,
                                mimeType: 'text/plain',
                                category: 'abuse-report',
                            });
                            logUrl = result.url;
                        }
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.error('[plugin-asl] report log upload failed:', e);
                    }
                }

                // One line for the moderation channel, alongside its other traffic.
                // 🚩 marks it as a report; 👥 a channel / ✉️ a private message. The
                // reported nick is bold red and the reason bold purple (IRC codes) so
                // both jump out; a channel report also quotes the reported message (💬)
                // so moderators can triage without opening the attached log.
                let redNick = '\x02\x0304@' + nickname + '\x0F';
                let parts;
                if (isChannelReport) {
                    parts = ['🚩 👥 ' + buffer.name, redNick];
                } else {
                    // ✉️ already reads as "private message" — glue the nick to it, no dot
                    parts = ['🚩 ✉️ ' + redNick];
                }
                if (reported) {
                    let quote = (reported.message || '').replace(/\s+/g, ' ').trim();
                    if (quote.length > 80) {
                        quote = quote.substr(0, 79) + '…';
                    }
                    if (quote) {
                        parts.push('💬 «' + quote + '»');
                    }
                }
                // reason in bold purple (IRC 06) to pair with the bold-red nick
                parts.push('\x02\x0306' + this.report_reasons + '\x0F');
                // without a specific message, the channels shared with this user are the
                // main clue for moderators; a message-anchored report already gives the
                // room and line, so it's the only case that leaves them out
                if (!reported) {
                    let commonChannels = utils.commonChannels(network.id, nickname);
                    if (commonChannels.length) {
                        parts.push(TextFormatting.t('plugin-asl:report_common_label') +
                            ': ' + commonChannels.join(' '));
                    }
                }
                if (logUrl) {
                    parts.push('📎 ' + logUrl);
                }
                // PM to the moderation bot when online, otherwise fall back to the channel
                const target = await this.resolveReportTarget(network);
                network.ircClient.say(target, parts.join(' · '));

                this.report_user_display = false;

                // confirmation matches how the log was built: anchored on the message
                // (channel), or the last lines of the room / of the private conversation
                let confirmKey;
                if (!logUrl) {
                    confirmKey = 'report_confirm';
                } else if (reported) {
                    confirmKey = 'report_confirm_with_log';
                } else if (isChannelReport) {
                    confirmKey = 'report_confirm_with_log_channel';
                } else {
                    confirmKey = 'report_confirm_with_log_pv';
                }
                const confirmMsg = TextFormatting.t('plugin-asl:' + confirmKey);
                this.$state.addMessage(reportTarget.buffer,
                    {
                        nick: TextFormatting.t('plugin-asl:system_message'),
                        message: confirmMsg,
                        type: 'notice',
                    });

                this.showToast(TextFormatting.t('plugin-asl:report_toast'), 'fa-flag', null);
            } finally {
                // never leave the send button dead if say()/addMessage throws
                this.report_sending = false;
            }
        },
        // ── block ──
        toggleIgnore: function toggleIgnore(target) {
            let user = target.user;
            let network = target.network;
            if (user.ignore) {
                // ignored_list is the filtering source of truth (IgnoreMiddleware);
                // remove the right entry, not the last one pushed
                network.ignored_list = network.ignored_list.filter(
                    (n) => n.toLowerCase() !== user.nick.toLowerCase()
                );
            } else {
                network.ignored_list.push(user.nick);
            }
            user.ignore = !user.ignore;
        },
        undoBlockAction: function undoBlockAction(target) {
            if (target.user.ignore) {
                this.toggleIgnore(target);
                this.notifyUnblocked(target);
            }
        },
        undoUnblockAction: function undoUnblockAction(target) {
            if (!target.user.ignore) {
                this.toggleIgnore(target);
                this.notifyBlocked(target);
            }
        },
        notifyBlocked: function notifyBlocked(target) {
            this.addProtectNotice('plugin-asl:block_confirm', target);
        },
        notifyUnblocked: function notifyUnblocked(target) {
            this.addProtectNotice('plugin-asl:unblock_confirm', target);
        },
        addProtectNotice: function addProtectNotice(key, target) {
            // persistent confirmation in the conversation the gesture acted from
            this.$state.addMessage(target.buffer || this.$state.getActiveBuffer(), {
                nick: TextFormatting.t('plugin-asl:system_message'),
                message: TextFormatting.t(key, { nick: target.user.nick }),
                type: 'notice',
            });
        },
        // ── toast ──
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
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(0.75rem);
    }

    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
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
    animation: kiwi-asl-overlay-fade 0.18s ease;
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
    from {
        opacity: 0;
        transform: scale(0.96);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

@keyframes kiwi-asl-modal-sheet {
    from { transform: translateY(100%); }
    to { transform: none; }
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

/* the dialog is focused programmatically on open; no ring on the shell itself */
.kiwi-asl-modal:focus {
    outline: none;
}

/* native radio/checkbox drive a11y; visually hidden but kept focusable so
   keyboard navigation and screen readers work. the styled spans show state. */
.kiwi-asl-sr-input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
    pointer-events: none;
}

/* keyboard focus lands on the hidden input — surface it on the visible row.
   theme-agnostic fallback; the EuropNet theme swaps in its brand --focus-ring. */
.kiwi-asl-reason:focus-within,
.kiwi-asl-combine:focus-within {
    outline: 2px solid var(--color-accent, #2f6fb0);
    outline-offset: 2px;
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

/* mirrors the DS checkbox atom .cbx (checked = accent-fill, readable in dark) */
.kiwi-asl-combine-box {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.15rem;
    height: 1.15rem;
    margin-top: 0.0625rem;
    border: 2px solid var(--color-border-strong, rgba(127, 127, 127, 0.5));
    border-radius: 0.3rem;
    font-size: 0.7rem;
    color: var(--color-on-accent-fill, #fff);
}

.kiwi-asl-combine-box .fa {
    opacity: 0;
}

.kiwi-asl-combine.is-on .kiwi-asl-combine-box {
    background: var(--color-accent-fill, #2f6fb0);
    border-color: var(--color-accent-fill, #2f6fb0);
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

/* Kickban reason popover — base (theme-agnostic). JS sets its top/left inline;
   the catcher blocks list scroll + outside clicks while it is open. */
.kiwi-asl-kb-catch {
    position: fixed;
    inset: 0;
    z-index: 9998;
}

.kiwi-asl-kb-pop {
    position: fixed;
    top: 20%;
    left: 20%;
    box-sizing: border-box;
    width: 19rem;
    max-width: calc(100vw - 1rem);
    padding: 0.75rem;
    border: 1px solid var(--color-border, rgba(127, 127, 127, 0.3));
    border-radius: 0.7rem;
    background: var(--color-surface, #fff);
    color: var(--color-text-primary, #222);
    box-shadow: 0 0.6rem 1.6rem rgba(0, 30, 60, 0.28);
    z-index: 9999;
}

.kiwi-asl-kb-title {
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    font-weight: 800;
}

.kiwi-asl-kb-input {
    box-sizing: border-box;
    width: 100%;
    margin-bottom: 0.6rem;
    padding: 0.4rem 0.55rem;
    border: 1px solid var(--color-border-strong, rgba(127, 127, 127, 0.4));
    border-radius: 0.4rem;
    background: var(--color-bg-input, #fff);
    color: inherit;
    font: inherit;
}

.kiwi-asl-kb-foot {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}
</style>
