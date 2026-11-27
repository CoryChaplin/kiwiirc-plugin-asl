# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3 plugin for [Kiwi IRC](https://kiwiirc.com) that adds Age/Sex/Location (ASL) user profiling. It replaces core Kiwi components, adds a user discovery sidebar, and parses ASL data from IRC GECOS (Realname) fields.

This branch targets the Vue 3 port of Kiwi and is built as an **ES module plugin**: Kiwi loads `dist/plugin-asl.mjs` with `import()`, and an import map that Kiwi adds resolves `vue` and `kiwiirc` to Kiwi's own Vue runtime and API (Kiwi's `src/libs/EsmPlugins.js`). Both are external in the build, never bundled.

## Commands

```bash
yarn build        # Vite library build → dist/plugin-asl.mjs (+ dist/plugin-asl/locales/)
yarn watch        # Rebuild on change
ASL_TEST_IIFE=1 yarn build   # Test only: classic-script variant dist/plugin-asl.test-iife.js
                             # (var KiwiPluginAsl, uses kiwi.Vue) for environments without ES modules (jsdom)
```

Deploy by copying `dist/plugin-asl.mjs` and `dist/plugin-asl/` next to each other (Kiwi config: `{ "name": "asl", "url": "static/plugins/plugin-asl.mjs" }`, `plugin-asl.localesPath: "static/plugins/plugin-asl/locales"`). CSS is injected by the JS bundle (see `vite.config.js`). There is no linter set up yet on this branch.

## Architecture

**Entry point:** `src/plugin.js` default exports the plugin function `(kiwi) => {}`, which Kiwi calls like a `kiwi.plugin()` callback. It listens to IRC events (`irc.join`, `irc.wholist`), and registers components using Kiwi's API:
- `kiwi.replaceModule()` — swaps core `UserBox` and `NicklistUser` components
- `kiwi.addStartup()` — injects `CustomWelcome` as the startup screen
- `kiwi.addUi()` — adds `UserBrowserButton` to channel headers (the component object itself, not a mounted element)
- `Misc.mountComponent()` (from `kiwi.require('helpers/Misc')`) — mounts `AslProtection` inside `.kiwi-wrap` on Kiwi's `ready` event, with Kiwi's app context

**Data flow:**
1. User submits ASL on the startup screen (`CustomWelcome.vue`)
2. Data is encoded into a GECOS string and sent to the IRC server
3. On `irc.join` and `irc.wholist` events, `utils.parseGecos()` extracts ASL from incoming users' `realname` fields
4. Parsed ASL is stored directly on user objects in `kiwi.state` (`userObj.asl`, `userObj.colour`)
5. Vue components reactively render this data

**Configuration** is namespaced under `plugin-asl` in Kiwi's settings. Use `config.getSetting('key')` (wraps `kiwi.state.getSetting('settings.plugin-asl.<key>')`) or direct access. Defaults are defined in `src/config.js`, which also builds GECOS regex patterns based on `gecosType` (1 = `[a/s/l] realname`, 2 = `a s l`).

## Key Files

| File | Role |
|------|------|
| `src/plugin.js` | Entry point — event handling, component registration |
| `src/config.js` | Settings defaults, getters, GECOS regex construction |
| `src/libs/utils.js` | `parseGecos()` — extract ASL from GECOS; `getColour()` — color by sex |
| `src/libs/locales.js` | i18n loader — dynamically loads JSON from `res/locales/` |
| `src/components/CustomWelcome.vue` | Startup form with ASL inputs |
| `src/components/CustomUserBox.vue` | User info panel with ASL, whois, ops controls, report form |
| `src/components/UserBrowser.vue` | Searchable/filterable sidebar table of users |
| `src/components/CustomNicklistUser.vue` | Nicklist entry with ASL tooltip |
| `src/components/UserBrowserButton.vue` | Channel header button to toggle UserBrowser |
| `src/libs/icons.js` | Adds the plugin's Font Awesome 7 icons to Kiwi's icon library; draws the gender glyphs as CSS masks |

## Coding Conventions

- **Vue 3 Options API** throughout — no Composition API. Import Vue functions from `'vue'` (`nextTick`, `watch`, `reactive`…), never through `kiwi.Vue`
- The replaced components must keep the props of the Kiwi components they replace (`NicklistUser`: `network, user, nicklist`; `UserBox`: `network, buffer, user, sidebarState`). In Vue 3 Kiwi, mode helpers live on the buffer: `nicklist.buffer.userMode(user)`
- **Icons:** Kiwi's global `<svg-icon icon="fa-solid fa-flag" />` (Font Awesome 7 SVG). Any icon used must be imported and added in `src/libs/icons.js`, including icons chosen by settings such as `userBrowserIcon`. There is no Font Awesome 4 font
- **Less** for component styles
- 4-space indent; semicolons required
- The global `kiwi` object is the main integration point for all IRC state, events, and component APIs
- Kiwi's state objects (users, networks, buffers, `user_settings`) are reactive proxies: assign new properties directly (`userObj.asl = …`). `kiwi.state` itself is not reactive, so properties added on it (e.g. `kiwi.state.pluginASL`) are not either
- Locale keys in config start with `_` but are standard strings in component usage

## Common Patterns

**Updating a user's ASL data:**
```javascript
let userObj = kiwi.state.getUser(net.id, user.nick) || kiwi.state.addUser(net, user);
let parsedGecos = utils.parseGecos(user.realname);
userObj.asl = parsedGecos.asl;
userObj.colour = utils.getColour(userObj.asl);
```

**Accessing plugin settings:**
```javascript
config.getSetting('gecosType')  // shorthand via config.js
kiwi.state.getSetting('settings.plugin-asl.gecosType')  // direct
```
