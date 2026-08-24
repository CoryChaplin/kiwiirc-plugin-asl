<template>
    <div class="kiwi-asl-protection-host">
        <div
            v-if="report_user_display"
            ref="ssOverlay"
            class="overlay open"
            @click.self="closeReport"
        >
            <div
                ref="ssModal"
                class="modal"
                role="dialog"
                aria-modal="true"
                tabindex="-1"
                :aria-label="t('plugin-asl:report_title', { nick: targetNick })"
            >
                <div class="modal-head">
                    <span class="modal-sh danger">
                        <i class="fa fa-flag" aria-hidden="true" />
                    </span>
                    <span class="modal-title">
                        {{ t('plugin-asl:report_title', { nick: targetNick }) }}
                    </span>
                    <button
                        type="button"
                        class="modal-x"
                        :aria-label="t('plugin-asl:report_close')"
                        @click="closeReport"
                    >
                        <i class="fa fa-times" aria-hidden="true" />
                    </button>
                </div>
                <div class="modal-body">
                    <p class="surface-intro">{{ t('plugin-asl:report_modal_intro') }}</p>
                    <div
                        class="kiwi-asl-reasons"
                        role="radiogroup"
                        :aria-label="t('plugin-asl:report_modal_intro')"
                    >
                        <label
                            v-for="reason in reportReasons"
                            :key="reason.key"
                            class="opt-row pick boxed"
                            :class="{ on: report_reasons === reason.label }"
                        >
                            <input
                                v-model="report_reasons"
                                type="radio"
                                name="kiwi-asl-report-reason"
                                class="sr-only"
                                :value="reason.label"
                            >
                            <span class="rdo" aria-hidden="true" />
                            {{ reason.label }}
                        </label>
                    </div>
                    <label class="opt-row check hero kiwi-asl-block-too">
                        <input
                            v-model="report_block_too"
                            type="checkbox"
                            class="sr-only"
                        >
                        <span class="cbx">
                            <i class="fa fa-check" aria-hidden="true" />
                        </span>
                        <span class="opt-label">
                            {{ t('plugin-asl:report_block_too', { nick: targetNick }) }}
                            <span class="opt-hint">
                                {{ t('plugin-asl:report_block_too_hint') }}
                            </span>
                        </span>
                    </label>
                    <div class="inline-note bare kiwi-asl-log-note">
                        <i class="fa fa-paperclip" aria-hidden="true" />
                        {{ logNote }}
                    </div>
                    <div class="btns end">
                        <button type="button" class="btn-ghost" @click="closeReport">
                            {{ t('plugin-asl:report_cancel') }}
                        </button>
                        <button
                            type="button"
                            class="kiwi-asl-send btn-cta danger"
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
        <div v-if="toast_visible" class="kiwi-asl-toast-host">
            <div class="toast">
                <i class="ic fa" :class="toast_icon" aria-hidden="true" />
                <span class="msg">{{ toast_message }}</span>
                <button
                    v-if="toast_has_undo"
                    type="button"
                    class="act"
                    @click="onToastUndo"
                >
                    {{ t('plugin-asl:undo') }}
                </button>
            </div>
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
import * as reportEcho from '../libs/reportEcho.js';
import * as reportCooldown from '../libs/reportCooldown.js';

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
        // the form must promise what will actually be attached, which differs for a
        // notice (this person's own messages, not the conversation around them)
        logNote() {
            let key = this.target && this.usesSenderLog(this.target) ?
                'report_log_note_sender' :
                'report_log_note';
            return TextFormatting.t('plugin-asl:' + key);
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
            // A report on this nick just went out: don't reopen the form. The buttons are
            // already disabled, this covers every other way in (keyboard, stale UI).
            if (reportCooldown.isActive(payload.network, payload.user.nick)) {
                this.showToast(
                    TextFormatting.t('plugin-asl:report_cooldown_toast', {
                        nick: payload.user.nick,
                    }),
                    'fa-flag',
                    null
                );
                return;
            }
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
        // A notice never belongs to the conversation it was dropped into: core routes a
        // private notice to whatever buffer happens to be active, so the lines around it
        // are unrelated third-party talk that has no business going to moderation. Those
        // reports attach the sender's own messages instead.
        usesSenderLog: function usesSenderLog(target) {
            return !!(target && target.message && target.message.type === 'notice');
        },
        selectReportMessages: function selectReportMessages(target) {
            return this.usesSenderLog(target) ?
                this.selectSenderMessages(target) :
                this.selectLogMessages(target);
        },
        // Every line this person sent us: their notices — wherever core happened to drop
        // each one — and their side of a private conversation, gathered across ALL the
        // network's buffers, since successive notices land in different buffers depending
        // on what was active at the time. Only messages they authored are collected, so a
        // report can never leak a third party's conversation.
        selectSenderMessages: function selectSenderMessages(target) {
            let maxLines = config.getSetting('reportLogLines');
            if (maxLines <= 0) {
                // 0 disables the log; return early so slice(-0) can't return everything
                return [];
            }
            let network = target.network;
            let nick = target.user.nick;
            let reportedId = target.message ? target.message.id : null;
            let seen = Object.create(null);
            let picked = [];
            network.buffers.forEach((buffer) => {
                let isQuery = !(buffer.isChannel && buffer.isChannel());
                (buffer.messagesObj.messages || []).forEach((m) => {
                    if (seen[m.id] || !utils.sameName(network, m.nick, nick)) {
                        return;
                    }
                    // their notices, their side of a private chat, and the reported line
                    let keep = m.type === 'notice' ||
                        (isQuery && (m.type === 'privmsg' || m.type === 'action')) ||
                        m.id === reportedId;
                    if (!keep) {
                        return;
                    }
                    seen[m.id] = true;
                    picked.push(m);
                });
            });
            // buffers are walked one after another: rebuild the real chronology, falling
            // back to creation order for lines that share a timestamp
            picked.sort((a, b) => ((a.server_time || a.time) - (b.server_time || b.time)) ||
                (a.instance_num - b.instance_num));
            // No time window here (unlike selectLogMessages): notices can be hours apart
            // and that spacing is exactly the pattern moderators are looking for.
            return this.capAround(picked, picked.findIndex((m) => m.id === reportedId), maxLines);
        },
        // Keep at most maxLines, centred on the reported line so its context survives on
        // both sides; the last maxLines when there is no line to centre on.
        capAround: function capAround(msgs, idx, maxLines) {
            if (msgs.length <= maxLines) {
                return msgs;
            }
            if (idx === -1) {
                return msgs.slice(-maxLines);
            }
            let start = Math.min(
                Math.max(0, idx - Math.floor(maxLines / 2)),
                msgs.length - maxLines
            );
            return msgs.slice(start, start + maxLines);
        },
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
            // cap: never exceed maxLines, keeping the reported message centred
            return this.capAround(all.slice(start, end + 1), idx - start, maxLines);
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
            return this.selectReportMessages(target)
                .filter((m) => m.message && m.message.trim().length)
                .map((m) => {
                    let text;
                    if (m.type === 'privmsg') {
                        text = `<${m.nick}> ${m.message}`;
                    } else if (m.nick && m.type === 'notice') {
                        // a rendered notice keeps its '[NOTICE]' prefix but has lost its
                        // sender: put it back, irssi style
                        text = `-${m.nick}- ${m.message}`;
                    } else {
                        // every other type is already self-describing in m.message
                        text = m.message;
                    }
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
            let reported = reportTarget.message;
            // A notice is never reported as room traffic, even when it landed in a
            // channel: core drops a private notice into whatever buffer was active, so
            // that buffer says nothing about where this happened. It reads as what it is
            // — something this person sent straight to the user.
            let isNoticeReport = !!(reported && reported.type === 'notice');
            // guard against a missing buffer: throwing here, before the try below,
            // would leave report_sending stuck and disable the send button
            let isChannelReport = !isNoticeReport &&
                !!(buffer && buffer.isChannel && buffer.isChannel());

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
                // 🚩 marks it as a report, the next glyph says WHERE (👥 a channel /
                // ✉️ straight at the user) and the quote glyph says WHAT was said
                // (💬 a message / 📢 a notice) — two independent axes, so a reported
                // notice reads "🚩 ✉️ … 📢 «…»": out of nowhere, straight at the user.
                // The reported nick is bold red and the reason bold purple (IRC codes) so
                // both jump out, and the quote lets moderators triage without opening the
                // attached log.
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
                        parts.push((isNoticeReport ? '📢 «' : '💬 «') + quote + '»');
                    }
                }
                // reason in bold purple (IRC 06) to pair with the bold-red nick
                parts.push('\x02\x0306' + this.report_reasons + '\x0F');
                // without a specific message, the channels shared with this user are the
                // main clue for moderators; a message-anchored report already gives the
                // room and line, so it's the only case that leaves them out — except for
                // a notice, which names no room at all
                if (!reported || isNoticeReport) {
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
                const reportText = parts.join(' · ');
                // The server echoes our own PRIVMSG back (echo-message), which would open a
                // query with the bot exposing the report to the user who filed it. Remember
                // it so the plugin.js listener can absorb that echo.
                reportEcho.remember(network, target, reportText);
                network.ircClient.say(target, reportText);

                // hold the Report button on this nick for a while: moderation is now
                // looking at it, re-sending the same report only adds noise
                reportCooldown.start(network, nickname);

                this.report_user_display = false;

                // confirmation matches how the log was built: anchored on the message
                // (channel), or the last lines of the room / of the private conversation
                let confirmKey;
                if (!logUrl) {
                    confirmKey = 'report_confirm';
                } else if (isNoticeReport) {
                    // the attached log is this person's own messages, not a room's thread
                    confirmKey = 'report_confirm_with_log_notice';
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

/* Send button geometry: the footer layout is this screen's business, the skin comes
   from the design system. Matches .btn-ghost so both footer buttons line up. */
.kiwi-asl-send {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 2.375rem;
    padding: 0 1.125rem;
    border: 0;
    border-radius: 6.1875rem;
    font-family: inherit;
    white-space: nowrap;
}

.kiwi-asl-send:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

/* Toast placement on this screen: clears the composer. The card itself is a
   design-system object; only where it sits belongs here. */
.kiwi-asl-toast-host {
    position: fixed;
    left: 50%;
    bottom: 4.5rem;
    transform: translateX(-50%);
    z-index: 9990;
    display: flex;
    pointer-events: none;
}

.kiwi-asl-toast-host > * {
    pointer-events: auto;
}

/* Where the two design-system rows sit in this dialog. The rows themselves are
   design-system objects; only their spacing belongs to this screen. */
.kiwi-asl-block-too {
    margin: 1rem 0 0.5rem;
}

.kiwi-asl-log-note {
    margin: 0.5rem 0 0.9rem;
}

/* Functional floor for themes that do not ship the design-system objects: enough
   for the dialog to be usable, never its appearance. An unlayered rule always wins
   over a layered one, so the theme takes over untouched wherever it is active. */
@layer asl-fallback {
    /* Structure only: what the dialog needs to be usable when the active theme does
       not ship the design-system objects. No colours beyond the surfaces that must be
       opaque to stay legible, and no control drawing — the native inputs show through
       on their own, since .sr-only is part of the same missing set. */
    .overlay {
        position: fixed;
        inset: 0;
        z-index: 9989;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: rgba(8, 24, 44, 0.55);
    }

    .modal {
        display: flex;
        flex-direction: column;
        width: 23.75rem;
        max-width: 92vw;
        max-height: 90vh;
        overflow: auto;
        border-radius: 1rem;
        background: var(--brand-default-bg, #fff);
        color: var(--brand-default-fg, #1f2937);
    }

    .modal-head {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--comp-border, rgba(127, 127, 127, 0.3));
    }

    .modal-sh {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.875rem;
        height: 1.875rem;
    }

    .modal-title {
        flex: 1;
        min-width: 0;
        font-weight: 700;
    }

    .modal-x {
        flex-shrink: 0;
        width: 1.875rem;
        height: 1.875rem;
        border: 0;
        background: none;
        cursor: pointer;
    }

    .modal-body {
        padding: 1rem;
    }

    /* The native radio and checkbox show through here, since .sr-only belongs to the
       same missing set. What does break is the layout: a <label> is inline, so the
       option rows collapse into one run of prose and the hint joins its label. Fixed
       on the very properties the theme uses, so an active theme still wins the cascade. */
    .opt-row {
        display: flex;
        align-items: center;
        gap: 0.625rem;
    }

    .opt-hint {
        display: block;
    }

    /* The native checkbox already carries the state here, so the glyph stays hidden.
       The theme, unlayered, still wins and lights it when it is active. */
    .cbx i {
        opacity: 0;
    }

    .btns {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.625rem;
    }

    .btns.end {
        justify-content: flex-end;
    }

    .btn-ghost {
        height: 2.375rem;
        padding: 0 1.125rem;
        border: 1px solid var(--comp-border, rgba(127, 127, 127, 0.3));
        border-radius: 6.1875rem;
        background: none;
        color: inherit;
        cursor: pointer;
    }

    /* The primary action must stay visible: without the design system this button has
       geometry from the plugin but no fill of its own. */
    .btn-cta {
        background: var(--brand-primary, #1d4ed8);
        color: var(--brand-default-bg, #fff);
        font-weight: 700;
        cursor: pointer;
    }

    .btn-cta.danger {
        background: var(--brand-error, #c0392b);
        color: #fff;
    }

    .toast {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.55rem 0.8rem;
        border-radius: 0.5rem;
        background: var(--brand-default-bg, #fff);
        color: var(--brand-default-fg, #1f2937);
        box-shadow: 0 0.5em 1.5em rgba(0, 0, 0, 0.2);
    }

    .toast .msg {
        flex: 1;
    }
}

</style>
