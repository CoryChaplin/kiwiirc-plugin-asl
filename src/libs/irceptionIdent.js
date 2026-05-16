const IDB_NAME = 'irception';
const IDB_STORE = 'kv';
const IDB_KEY = 'irc_ident';
const CACHE_NAME = 'irception-ident-v1';
const CACHE_KEY = '/ident';

// --- Génération ---

function randString(n) {
    let t = '';
    const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < n; i++) t += c[Math.floor(Math.random() * c.length)];
    return t;
}

function getSource(originParam, formConfig) {
    if (originParam) {
        let origins = formConfig && formConfig.origins;
        let entry = origins && origins[String(originParam)];
        return (entry && entry.sourceCode) || 'o';
    }
    return 'd';
}

function getBrowser() {
    const ua = navigator.userAgent;
    if (/OPR\/|Opera/.test(ua)) return 'p';
    if (/Edg/.test(ua)) return 'e';
    if (navigator.brave) return 'b';
    if (/Chrome|CriOS/.test(ua)) return 'c';
    if (/Firefox|FxiOS/.test(ua)) return 'f';
    if (/Trident\/|MSIE/.test(ua)) return 'i';
    if (/Safari/.test(ua)) return 's';
    return 'o';
}

function getOs() {
    const ua = navigator.userAgent;
    if (/Win/.test(ua)) return 'w';
    if (/Android/i.test(ua)) return 'a';
    if (/iPad|iPhone|iPod/.test(ua)) return 'i';
    if (/Mac/.test(ua)) return 'm';
    if (/Linux/.test(ua)) return 'l';
    return 'o';
}

function getSexeUnivers(channelNames, formConfig) {
    const topics = (formConfig && formConfig.topics) || [];
    const hotTopic = topics.find((t) => t.key === 'hot');
    const autoChannels = (hotTopic && hotTopic.autoChannels) || [];
    const suggestions = (hotTopic && hotTopic.suggestions) || [];
    const hotChannels = new Set(
        autoChannels.concat(suggestions).map((c) => c.replace(/^#/, ''))
    );
    if (channelNames.some((ch) => hotChannels.has(ch.replace(/^#/, '')))) return 's';
    return 'n';
}

export function generateIdent(channelNames, originParam, formConfig) {
    return getSource(originParam, formConfig) + getBrowser() + getOs()
        + getSexeUnivers(channelNames, formConfig) + randString(7);
}

// --- IndexedDB ---

function idbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE);
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = reject;
    });
}

function idbPut(value) {
    return idbOpen().then((db) => new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
    })).catch(() => {});
}

function idbGet() {
    return idbOpen().then((db) => new Promise((resolve) => {
        const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    })).catch(() => null);
}

// --- Cookie (plugin-host, SameSite=Lax) ---

function readCookie(name) {
    let match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return match ? match[1] : null;
}

function writeCookie(name, value, days) {
    let date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    let secure = window.location.protocol === 'https:' ? '; Secure' : '';
    // Share cookie across subdomains of the same parent (e.g. .example.org).
    // No Domain attribute for single-label hosts (localhost, bare IP).
    let hostname = window.location.hostname;
    let parts = hostname.split('.');
    let domain = (parts.length >= 2 && !/^\d+(\.\d+){3}$/.test(hostname))
        ? '; Domain=.' + parts.slice(-2).join('.')
        : '';
    document.cookie = name + '=' + value
        + '; expires=' + date.toUTCString()
        + '; path=/; SameSite=Lax' + domain + secure;
}

// --- Cache Storage (HTTPS seulement) ---

function cachePut(ident) {
    if (typeof caches === 'undefined') return Promise.resolve();
    return caches.open(CACHE_NAME)
        .then((cache) => cache.put(CACHE_KEY, new Response(
            JSON.stringify({ ident }),
            { headers: { 'Content-Type': 'application/json' } }
        )))
        .catch(() => {});
}

async function cacheGet() {
    if (typeof caches === 'undefined') return null;
    try {
        const cache = await caches.open(CACHE_NAME);
        const resp = await cache.match(CACHE_KEY);
        if (!resp) return null;
        const data = await resp.json();
        return (data && data.ident && data.ident.length === 11) ? data.ident : null;
    } catch (e) {
        return null;
    }
}

// --- API publique ---

// kiwiStorage : objet avec .get(key) / .set(key, value) — Kiwi network settings
export function storeIdent(ident, kiwiStorage) {
    if (kiwiStorage) kiwiStorage.set(IDB_KEY, ident);
    try { localStorage.setItem(IDB_KEY, ident); } catch (e) { /* unavailable */ }
    writeCookie(IDB_KEY, ident, 365);
    return Promise.all([idbPut(ident), cachePut(ident)]);
}

export async function loadIdent(kiwiStorage) {
    const fromKiwi = kiwiStorage && kiwiStorage.get(IDB_KEY);
    if (fromKiwi && fromKiwi.length === 11) return fromKiwi;

    const fromLS = localStorage.getItem(IDB_KEY);
    if (fromLS && fromLS.length === 11) return fromLS;

    const fromCookie = readCookie(IDB_KEY);
    if (fromCookie && fromCookie.length === 11) return fromCookie;

    const fromIdb = await idbGet();
    if (fromIdb && fromIdb.length === 11) return fromIdb;

    const fromCache = await cacheGet();
    if (fromCache && fromCache.length === 11) return fromCache;

    // Tier irception : délégué à loadFormConfig() via data.ident
    return null;
}
