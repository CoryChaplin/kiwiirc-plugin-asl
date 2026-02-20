# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue.js plugin for [Kiwi IRC](https://kiwiirc.com) that adds Age/Sex/Location (ASL) user profiling. It replaces core Kiwi components, adds a user discovery sidebar, and parses ASL data from IRC GECOS (Realname) fields.

## Commands

```bash
yarn build        # Production build → dist/plugin-asl.js
yarn watch        # Watch mode rebuild
yarn dev          # Webpack dev server on port 9000
yarn lint         # Run ESLint + Stylelint
yarn lint:eslint  # ESLint only (.js, .vue files)
yarn lint:stylelint  # Stylelint only
```

## Architecture

**Entry point:** `src/plugin.js` registers the plugin via `kiwi.plugin('asl', ...)`, listens to IRC events (`irc.join`, `irc.wholist`), and registers components using Kiwi's API:
- `kiwi.replaceModule()` — swaps core `UserBox` and `NicklistUser` components
- `kiwi.addStartup()` — injects `CustomWelcome` as the startup screen
- `kiwi.addUi()` — adds `UserBrowserButton` to channel headers

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

## Coding Conventions

- **Vue 2 Options API** throughout — no Composition API
- **Less** for component styles
- **ESLint:** airbnb-base + vue/recommended + standard; 4-space indent; semicolons required
- The global `kiwi` object is the main integration point for all IRC state, events, and component APIs
- When reactively setting new properties on user objects, use `kiwi.Vue.set(userObj, 'prop', value)` to ensure reactivity
- Locale keys in config start with `_` but are standard strings in component usage

## Common Patterns

**Updating a user's ASL data:**
```javascript
let userObj = kiwi.state.getUser(net.id, user.nick) || kiwi.state.addUser(net, user);
let parsedGecos = utils.parseGecos(user.realname);
kiwi.Vue.set(userObj, 'asl', parsedGecos.asl);
kiwi.Vue.set(userObj, 'colour', utils.getColour(userObj.asl));
```

**Accessing plugin settings:**
```javascript
config.getSetting('gecosType')  // shorthand via config.js
kiwi.state.getSetting('settings.plugin-asl.gecosType')  // direct
```
