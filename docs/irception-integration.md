# Integration: kiwiirc-plugin-asl

This document describes how **kiwiirc-plugin-asl** integrates with the irception backend. It is intended for irception maintainers so they are aware of this client and the contracts it relies on.

## What is kiwiirc-plugin-asl?

A Vue.js plugin for [Kiwi IRC](https://kiwiirc.com). It replaces the default welcome screen with a form that collects the user's Age / Sex / Location (ASL) and a set of discussion topics, then uses irception to recommend IRC channels. The resulting ASL is encoded into the IRC GECOS (realname) field so other users can read it.

The plugin ships a local port of irception's `form.js` client-side rule evaluator (`src/libs/irceptionRules.js`) so that form rules run in the browser without a round-trip.

---

## Endpoints consumed

All calls go to the base URL configured in `settings.plugin-asl.irceptionApiUrl` (default: `https://irception.europnet.org`). There is no authentication — requests are stateless. The only client identifier is the `origin` parameter (see below).

### `GET /form/config`

Loaded once at form startup. Drives the entire form UI: topics, channel categories, validation rules, and limits.

**Expected response shape:**

```json
{
  "topics": [
    { "key": "dating", "label": "Dating", "suggestions": ["#datateurs"] }
  ],
  "rules": [ /* see Rules section */ ],
  "channelCategories": [
    { "label": "Général", "channels": ["#accueil", "#cafe"] }
  ],
  "maxChannels": 8,
  "minAge": 15
}
```

| Field | Type | Used for |
|---|---|---|
| `topics` | `Array<{key, label, suggestions?}>` | Topic chip group; `key` is the canonical identifier used in rules and sent to `/recommend/json` |
| `rules` | `Array<Rule>` | Client-side rule evaluation (see below) |
| `channelCategories` | `Array<{label, channels}>` | Autocomplete in the channel picker |
| `maxChannels` | `number` | Hard cap on the number of channels a user can select |
| `minAge` | `number` | Age hint threshold (default fallback: 15) |
| `originPrefixes` | any | IRC server routing prefixes (e.g. `cf1-`, `eu1-`). Reserved for internal EuropNet use / PHP-rendered form. API consumers that manage their own IRC connection can ignore this field. |

If this endpoint is unreachable the form degrades gracefully: topic chips, channel suggestions, and rules are all disabled, but the user can still connect.

As a fallback the plugin also checks `window.FORM_CONFIG` so PHP-rendered pages can inject the config inline.

---

### `GET /recommend/json`

Called (debounced 300 ms) whenever the user changes age, sex, location, country, topics, or manually adds/removes a channel. Returns a list of recommended channels that the form inserts automatically (source `'auto'`).

**Query parameters:**

| Parameter | Value | Notes |
|---|---|---|
| `age` | numeric string | Omitted if empty |
| `sexe` | `M` / `F` / `U` | Omitted if not set |
| `ville` | location string | Omitted if empty |
| `country` | 2-letter country code | Omitted if unknown |
| `origin` | numeric origin ID | Always sent; identifies the plugin instance (`settings.plugin-asl.irceptionOrigin`, default `1`) |
| `topics` | comma-separated topic keys | Omitted if none selected |
| `position` | `"lat,lon"` | Only sent when geolocation is available |
| `manual_channels` | comma-separated channel names | Only sent when the user has manually added channels |

**Note — `/remove/{channel}`:** this endpoint exists for the PHP server-rendered form to persist removed channels in a cookie. API consumers do not need to call it. The server has no memory of removed channels outside that cookie and will keep recommending them in subsequent `/recommend/json` responses. It is the client's responsibility to maintain its own `removedChannels` state and filter recommendations before displaying them. The plugin's approach — an in-memory `Set` filtered in `applyRecommendations`, persisted across page loads via Kiwi network settings — is the correct pattern for a stateless API consumer. Other API consumers should implement the same client-side filtering rather than expecting server-side persistence.

**Expected response shape:**

```json
{
  "channels": {
    "default_channels": ["#accueil"],
    "age_channels": ["#jeunes"],
    "local_channels": ["#lyon"],
    "theme_channels": ["#datateurs"]
  },
  "suggestions": {
    "dating": ["#datateurs", "#rencontre"]
  }
}
```

`channels.*` arrays are merged and injected as `source: 'auto'` entries in the channel list, respecting `maxChannels` and any blocked channels from the rules engine. Previously auto-inserted channels that are no longer recommended are removed automatically.

`suggestions` provides per-topic channel hints rendered in a tag cloud. The plugin tolerates PHP returning `[]` instead of `{}` when the map is empty.

---

### `GET /getLocation`

Called once at startup to pre-fill the user's city from their IP address.

**Expected response shape:**

```json
{
  "city": "Lyon",
  "region": "Auvergne-Rhône-Alpes",
  "country_code": "FR",
  "country_name": "France",
  "lat": 45.76,
  "long": 4.84
}
```

`lat` / `long` are stored and forwarded as the `position` parameter in subsequent `/recommend/json` calls.

---

## Rules engine

The plugin ships `src/libs/irceptionRules.js`, a port of irception's `form.js` client-side evaluator. Rules come from `/form/config` and are evaluated locally in the browser on every form state change.

**State evaluated:**

```javascript
{
  age:     number | string,       // raw input value
  gender:  'M' | 'F' | 'U' | '', // empty when not chosen
  topics:  string[],              // active topic keys
  channels: string[],             // selected channel names (with leading '#')
}
```

**Supported rule types:**

| Rule type | Condition field | Effect |
|---|---|---|
| `topic_requires` | `condition` | Topic is disabled/hidden if condition is not met; auto-removed if currently active |
| `topic_excludes` | (topic active) | Lists topics that become disabled when this topic is active; auto-removes conflicts |
| `channel_blocked` | `condition` | Channels become unavailable if condition is met; auto-removed if currently selected |
| `channel_triggers_topic` | `condition` | Selecting one of the listed channels auto-activates a topic |
| `channel_conditional` | `show_unless` | Channel is shown by default; blocked (removed if present, cannot be added) when the condition is true. Field name `show_unless`: the channel is shown *unless* the condition holds. |
| `channel_locked` | — | Channels cannot be removed by the user |

**Condition operators supported:** `==`, `!=`, `>=`, `>`, `<=`, `<` (numeric or string), plus `topic_active`, `or`, `and`.

Rules are applied in a cascading double-pass to resolve dependencies (e.g., a topic removed by a first-pass rule may unblock a channel in the second pass). This mirrors the `applyRulesUI` logic in irception's `form.js`.

**Important:** channel name comparisons in the evaluator are case-insensitive. Rule definitions may use any casing for channel names.

---

## What the plugin does independently

These behaviors are entirely plugin-side and do not involve irception:

- **GECOS encoding** — the user's ASL is written into the IRC realname field in one of two formats controlled by `gecosType`:
  - Type 1: `[age/sex/location] realname`
  - Type 2: `age sex location`
- **GECOS parsing** — on `irc.join` and `irc.wholist` events, other users' realnames are parsed to extract ASL and stored on the Kiwi user object.
- **User browser** — a filterable sidebar table of users with ASL data, rendered from Kiwi's in-memory state.
- **Reverse geocoding** — uses Nominatim (OpenStreetMap) directly for city-name lookups; irception is not involved.

---

## Configuration reference

| Kiwi setting key | Default | Description |
|---|---|---|
| `settings.plugin-asl.irceptionApiUrl` | `https://irception.europnet.org` | Base URL for all irception endpoints |
| `settings.plugin-asl.irceptionOrigin` | `1` | Origin ID sent as `origin` parameter to `/recommend/json` |
| `settings.plugin-asl.showTopics` | `true` | When `false`, disables all irception-driven features (topic chips, recommendations, rules) |
