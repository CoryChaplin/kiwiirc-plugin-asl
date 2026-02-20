# Kiwi IRC ASL Plugin - AI Instructions

## Project Overview
This is a Vue.js plugin for [Kiwi IRC](https://kiwiirc.com) that adds Age/Sex/Location (ASL) functionality. It customizes the startup screen, user box, and nicklist, and adds a user browser.

## Architecture & Core Concepts
- **Entry Point:** `src/plugin.js` registers the plugin via `kiwi.plugin('asl', ...)`. It handles global event listeners (`irc.join`, `irc.wholist`) and initializes configuration/localization.
- **Kiwi Integration:**
  - Uses `kiwi.replaceModule()` to swap core components (`UserBox`, `NicklistUser`).
  - Uses `kiwi.addStartup()` to inject `CustomWelcome`.
  - Uses `kiwi.addUi()` to add the `UserBrowserButton`.
  - Accesses global state via `kiwi.state`.
- **Data Flow:**
  - ASL data is parsed from the user's **GECOS (Realname)** field.
  - `src/libs/utils.js` -> `parseGecos()` extracts age, sex, and location based on configured patterns.
  - User data is stored directly on the user objects in `kiwi.state` (e.g., `userObj.asl`, `userObj.colour`).

## Key Files
- `src/plugin.js`: Main logic, event handling, and component registration.
- `src/config.js`: Default configuration and settings retrieval logic.
- `src/libs/utils.js`: Core logic for parsing GECOS strings and determining user colors.
- `src/components/CustomWelcome.vue`: Replacement startup screen with ASL inputs.
- `src/components/UserBrowser.vue`: New UI for searching/filtering users.

## Development Workflows
- **Build:** `yarn build` (Production build to `dist/plugin-asl.js`).
- **Watch:** `yarn watch` (Rebuilds on change).
- **Dev Server:** `yarn dev` (Webpack dev server).
- **Linting:** `yarn lint` (Runs both ESLint and Stylelint).

## Coding Conventions
- **Vue.js:** Uses Vue 2 with the Options API.
- **Global `kiwi` Object:** The `kiwi` instance is available globally or passed to the plugin callback. Use it for all IRC interactions and state access.
- **Localization:** Uses a custom `Locales` class (`src/libs/locales.js`) loading JSON from `res/locales/`. Keys often start with `_` in config but are standard in usage.
- **Configuration:** Settings are namespaced under `plugin-asl` (e.g., `kiwi.state.getSetting('settings.plugin-asl.gecosType')`).
- **Styles:** Uses Less (`.less`) and CSS.

## Common Patterns
- **Updating User Data:**
  ```javascript
  // From src/plugin.js
  function updateUser(net, user) {
      let userObj = kiwi.state.getUser(net.id, user.nick) || kiwi.state.addUser(net, user);
      let parsedGecos = utils.parseGecos(user.realname);
      userObj.asl = parsedGecos.asl;
      // ...
  }
  ```
- **Accessing Settings:**
  Always check `kiwi.state.getSetting('settings.plugin-asl.<KEY>')` before falling back to defaults.

## Dependencies
- **Runtime:** Vue.js (provided by Kiwi IRC environment), FontAwesome (assumed available).
- **Build:** Webpack, Babel, Less.
