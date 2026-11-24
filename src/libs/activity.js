/**
 * Active-day counter, kept entirely in the browser.
 *
 * A day counts as active when the client registered on the network at least once that
 * (local) calendar day: reconnection loops collapse into one day. Only the active dates of
 * the last WINDOW_DAYS days are stored, plus the first day this browser was seen. Nothing is
 * sent anywhere.
 *
 * Stored under localStorage `asl_activity`, next to the ident's own localStorage copy.
 * Private browsing wipes it with the ident at the end of each session: every session then
 * reads as day one, which is expected.
 */

const STORAGE_KEY = 'asl_activity';
export const WINDOW_DAYS = 14;

function pad(n) {
    return n < 10 ? '0' + n : String(n);
}

function localDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// Whole local days from `from` (YYYY-MM-DD) to `to` (YYYY-MM-DD); DST-safe via noon anchors.
function daysBetween(from, to) {
    let a = new Date(from + 'T12:00:00');
    let b = new Date(to + 'T12:00:00');
    return Math.round((b - a) / 86400000);
}

function isDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function load() {
    try {
        let raw = window.localStorage.getItem(STORAGE_KEY);
        let data = raw ? JSON.parse(raw) : null;
        if (data && Array.isArray(data.days) && isDate(data.firstSeen)) {
            return { days: data.days.filter(isDate), firstSeen: data.firstSeen };
        }
    } catch (e) { /* unavailable or corrupt: start over */ }
    return null;
}

function save(data) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* unavailable or full: stay silent */ }
}

// Keep only the dates inside the window ending today.
function prune(days, today) {
    return days.filter((day) => {
        let age = daysBetween(day, today);
        return age >= 0 && age < WINDOW_DAYS;
    });
}

export function recordActiveDay(now) {
    let today = localDate(now || new Date());
    let data = load() || { days: [], firstSeen: today };
    let days = prune(data.days, today);
    if (days.indexOf(today) === -1) {
        days.push(today);
    }
    save({ days: days, firstSeen: data.firstSeen });
}

/**
 * { activeDays, window }: active days in the last WINDOW_DAYS days (today included), and
 * how many of those days this browser has been observed (today included, capped). Never
 * the dates themselves. Without any history, reads as a first day: { 1, 1 }.
 */
export function readActivity(now) {
    let today = localDate(now || new Date());
    let data = load();
    if (!data) {
        return { activeDays: 1, window: 1 };
    }
    let days = prune(data.days, today);
    let observed = Math.max(1, Math.min(WINDOW_DAYS, daysBetween(data.firstSeen, today) + 1));
    return {
        activeDays: Math.max(1, Math.min(days.length, observed)),
        window: observed,
    };
}
