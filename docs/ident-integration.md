# Intégration ident IRC persistant — kiwiirc-plugin-asl

## Format de l'ident

11 caractères `[a-z0-9]{11}` :

```
[source][browser][os][sexeUnivers][7 random]
```

| Position | Valeurs | Source |
|---|---|---|
| source (1) | c e f a v m x z o d | `origine` URL param → mapping ci-dessous ; direct → `d` |
| browser (1) | p e b c f i s o | UA (Opera→Edge→Brave→Chrome→Firefox→IE→Safari→autre) |
| os (1) | w a i m l o | UA (Android avant Linux) |
| sexeUnivers (1) | s / n | `s` si canal adulte ou topic hot sélectionné au moment du connect |
| random (7) | a-z0-9 | `randString(7)` — minuscules uniquement |

Mapping `origine` : `{'3':'c','4':'e','5':'f','6':'a','7':'c','8':'e','9':'e','10':'l','11':'l','12':'l','13':'l','14':'v','15':'m','16':'x','17':'z'}`.

---

## Cascade de récupération

L'ident doit survivre à la suppression ciblée des cookies. La cascade lit chaque tier
dans l'ordre et s'arrête au premier résultat valide.

### Tiers plugin (origin du host Kiwi — ex. chat.europnet.org)

| Ordre | Tier | Effacé par suppression ciblée cookie |
|---|---|---|
| 1 | Kiwi network settings (`welcomeStorage`) | selon implémentation Kiwi |
| 2 | Cookie `irc_ident` (plugin-host) | oui |
| 3 | localStorage `irc_ident` (plugin-host) | non |
| 4 | IndexedDB `irception/kv/irc_ident` (plugin-host) | non |
| 5 | Cache Storage `irception-ident-v1` (plugin-host) | non — HTTPS seulement |

### Tier irception (cross-origin)

| Ordre | Tier | Prérequis |
|---|---|---|
| 6 | Cookie `irc_ident` irception | `SameSite=None; Secure` sur le cookie irception + `credentials: 'include'` dans fetch |

> localStorage, IndexedDB et Cache Storage irception ne sont pas accessibles cross-origin
> sans iframe broker (option future non couverte ici).

La cascade se termine sur ce tier : si le cookie irception est présent, le middleware
retourne l'ident dans `data.ident` de `/form/config`. Si tout est vide, génération locale.

---

## Modification irception requise

Pour que le cookie irception soit envoyé sur les requêtes cross-origin du plugin,
`createIdentCookie` dans `form.js` doit poser `SameSite=None; Secure` :

```js
// form.js — createIdentCookie
document.cookie = name + '=' + value + expires + '; path=/; SameSite=None; Secure';
```

Et le middleware irception (`index.php`) doit ajouter `Access-Control-Allow-Credentials: true`
sur les réponses `/form/config` quand la requête vient d'un origin autorisé (déjà géré
partiellement — vérifier que c'est actif pour les origins Kiwi).

---

## Fonctions utilitaires

```js
// irceptionIdent.js — module partagé à importer dans le plugin

const IDB_NAME   = 'irception';
const IDB_STORE  = 'kv';
const IDB_KEY    = 'irc_ident';
const CACHE_NAME = 'irception-ident-v1';
const CACHE_KEY  = '/ident';

// --- Génération ---

function randString(n) {
    let t = '';
    const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < n; i++) t += c[Math.floor(Math.random() * c.length)];
    return t;
}

function getSource(originParam) {
    const map = {
        '3':'c','4':'e','5':'f','6':'a','7':'c','8':'e','9':'e',
        '10':'l','11':'l','12':'l','13':'l','14':'v','15':'m','16':'x','17':'z',
    };
    return (originParam && map[String(originParam)]) ? map[String(originParam)] : 'd';
}

function getBrowser() {
    const ua = navigator.userAgent;
    if (/OPR\/|Opera/.test(ua))    return 'p';
    if (/Edg/.test(ua))            return 'e';
    if (navigator.brave)           return 'b';
    if (/Chrome|CriOS/.test(ua))   return 'c';
    if (/Firefox|FxiOS/.test(ua))  return 'f';
    if (/Trident\/|MSIE/.test(ua)) return 'i';
    if (/Safari/.test(ua))         return 's';
    return 'o';
}

function getOs() {
    const ua = navigator.userAgent;
    if (/Win/.test(ua))              return 'w';
    if (/Android/i.test(ua))         return 'a';
    if (/iPad|iPhone|iPod/.test(ua)) return 'i';
    if (/Mac/.test(ua))              return 'm';
    if (/Linux/.test(ua))            return 'l';
    return 'o';
}

function getSexeUnivers(channelNames, formConfig) {
    const hotTopic = (formConfig?.topics || []).find(t => t.key === 'hot');
    const hotChannels = new Set([
        ...(hotTopic?.autoChannels || []),
        ...(hotTopic?.suggestions  || []),
    ].map(c => c.replace(/^#/, '')));
    if (channelNames.some(ch => hotChannels.has(ch.replace(/^#/, '')))) return 's';
    return 'n';
}

export function generateIdent(channelNames, originParam, formConfig) {
    return getSource(originParam) + getBrowser() + getOs()
        + getSexeUnivers(channelNames, formConfig) + randString(7);
}

// --- IndexedDB ---

function idbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = reject;
    });
}

function idbPut(value) {
    return idbOpen().then(db => new Promise(resolve => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror   = () => resolve();
    })).catch(() => {});
}

function idbGet() {
    return idbOpen().then(db => new Promise(resolve => {
        const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror   = () => resolve(null);
    })).catch(() => null);
}

// --- Cache Storage (HTTPS seulement) ---

function cachePut(ident) {
    if (typeof caches === 'undefined') return Promise.resolve();
    return caches.open(CACHE_NAME)
        .then(cache => cache.put(CACHE_KEY, new Response(
            JSON.stringify({ ident }),
            { headers: { 'Content-Type': 'application/json' } }
        )))
        .catch(() => {});
}

async function cacheGet() {
    if (typeof caches === 'undefined') return null;
    try {
        const cache = await caches.open(CACHE_NAME);
        const resp  = await cache.match(CACHE_KEY);
        if (!resp) return null;
        const data = await resp.json();
        return (data?.ident?.length === 11) ? data.ident : null;
    } catch (e) { return null; }
}

// --- API publique ---

// kiwiStorage : handle welcomeStorage du plugin (objet avec .get/.set)
export function storeIdent(ident, kiwiStorage) {
    if (kiwiStorage) kiwiStorage.set(IDB_KEY, ident);
    try { localStorage.setItem(IDB_KEY, ident); } catch (e) {}
    return Promise.all([idbPut(ident), cachePut(ident)]);
}

export async function loadIdent(kiwiStorage) {
    // Tiers plugin
    const fromKiwi = kiwiStorage?.get(IDB_KEY);
    if (fromKiwi?.length === 11) return fromKiwi;

    const fromLS = localStorage.getItem(IDB_KEY);
    if (fromLS?.length === 11) return fromLS;

    const fromIdb = await idbGet();
    if (fromIdb?.length === 11) return fromIdb;

    const fromCache = await cacheGet();
    if (fromCache?.length === 11) return fromCache;

    // Tier irception : délégué à loadFormConfig() via data.ident
    return null;
}
```

---

## getJson — propagation de X-Client-Ident

Toutes les requêtes vers irception embarquent `X-Client-Ident` quand l'ident est connu,
et `credentials: 'include'` pour envoyer le cookie irception cross-origin
(nécessite `SameSite=None` côté irception).

```js
async function getJson(url, signal, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const ident = localStorage.getItem('irc_ident');
    if (ident?.length === 11) headers['X-Client-Ident'] = ident;
    const response = await fetch(url, {
        signal,
        headers,
        credentials: 'include',
    });
    if (!response.ok) throw new Error('irception: HTTP ' + response.status);
    return response.json();
}
```

---

## Flow de démarrage

```js
// Au montage du composant (avant loadFormConfig)

// 1. Lire les tiers plugin
const ident = await loadIdent(this.welcomeStorage);
if (ident) {
    // Synchroniser localStorage pour que getJson() puisse envoyer X-Client-Ident
    try { localStorage.setItem('irc_ident', ident); } catch (e) {}
}

// 2. Charger la config irception
//    - getJson() envoie X-Client-Ident si localStorage non vide
//    - getJson() envoie le cookie irception si SameSite=None activé
//    - data.ident non-null si irception a récupéré l'ident depuis l'une de ces sources
this.formConfig = await loadFormConfig({ signal, kiwiStorage: this.welcomeStorage });

// loadFormConfig appelle storeIdent(data.ident, kiwiStorage) si data.ident est non-null
// → tous les tiers plugin sont mis à jour si irception a fourni l'ident
```

```js
// Dans irceptionApi.js
export async function loadFormConfig({ signal, kiwiStorage } = {}) {
    if (typeof window !== 'undefined' && window.FORM_CONFIG) {
        return window.FORM_CONFIG;
    }
    const data = await getJson(apiUrl() + '/form/config', signal);
    if (data.ident?.length === 11) {
        await storeIdent(data.ident, kiwiStorage);
    }
    return data;
}
```

---

## Flow de connexion

La génération a lieu au moment du connect — les canaux sélectionnés sont connus,
ce qui permet de calculer `sexeUnivers` correctement.

```js
// Juste avant addNetwork()
let ident = await loadIdent(this.welcomeStorage);

if (!ident) {
    const channelNames = this.selectedChannels.map(ch => ch.replace('#', ''));
    ident = generateIdent(channelNames, this.originParam, this.formConfig);
    await storeIdent(ident, this.welcomeStorage);
    // Propager vers irception pour établir l'ETag sur les réponses suivantes
    getJson(apiUrl() + '/form/config', null).catch(() => {});
}

this.$state.addNetwork('Network', this.nick, {
    username: ident,
    // ...
});
```

---

## Résumé des différences avec form.js d'irception

| Aspect | form.js (irception, same-origin) | plugin (cross-origin) |
|---|---|---|
| Cookie `irc_ident` | posé par JS, `SameSite=Lax` → `SameSite=None` | lu via `credentials: 'include'` — pas posé |
| localStorage | origin irception | origin plugin-host |
| IndexedDB | origin irception | origin plugin-host |
| Cache Storage | origin irception | origin plugin-host |
| Kiwi settings | — | tier supplémentaire (primary) |
| Propagation vers irception | middleware lit le cookie | `X-Client-Ident` sur chaque requête |
| Génération | au connect (connectChat) | au connect (addNetwork) |

---

## Checklist d'implémentation

- [ ] Créer `src/libs/irceptionIdent.js` avec les exports `generateIdent`, `storeIdent`, `loadIdent`
- [ ] Modifier `getJson()` dans `irceptionApi.js` : ajouter `X-Client-Ident` + `credentials: 'include'`
- [ ] Modifier `loadFormConfig()` : appeler `storeIdent(data.ident)` si non-null
- [ ] Modifier le flow de connexion dans `CustomWelcome.vue` : `loadIdent` → génération si null
- [ ] **Côté irception** : passer le cookie `irc_ident` à `SameSite=None; Secure` dans `form.js`
- [ ] **Côté irception** : vérifier que `Access-Control-Allow-Credentials: true` est posé sur
      `/form/config` pour les origins Kiwi (`chat.europnet.org`, `graphs.europnet.org`)
