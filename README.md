# Custom Startup for [Kiwi IRC](https://kiwiirc.com)

This plugin creates a customised startup screen for age/sex/location based off Welcome.vue

It then display's this data in a customised userbox based off UserBox.vue

It also provides a nicklist style user list with search/filter for users to find other chatters

#### Dependencies
* node (https://nodejs.org/)
* yarn (https://yarnpkg.com/)

#### Building and installing

1. Build the plugin

   ```console
   $ yarn
   $ yarn build
   ```

   The plugin will then be created at `dist/plugin-asl.js`

2. Copy the plugin to your Kiwi webserver

   The plugin file must be loadable from a webserver. Creating a `plugins/` folder with your KiwiIRC files is a good place to put it.

3. Add the plugin to KiwiIRC

   In your kiwi `config.json` file, find the `plugins` section and add:
   ```json
   {"name": "asl", "url": "/plugins/plugin-asl.js"}
   ```

   To enable the startup screen, tell KiwiIRC to use the startup screen from the plugin. Set `"startupScreen"` to `plugin-asl`.

#### Configuration

[More details on the wiki](https://github.com/ItsOnlyBinary/kiwiirc-plugin-asl/wiki/Configuration)

##### Plugin settings (`plugin-asl`)

note: the variables starting with _ are treated as translation keys

```json
"plugin-asl" : {
    "localesPath": "/static/plugins/plugin-asl/locales",
    "gecosType": 1,
    "showLocation": true,
    "showRealname": false,
    "showUserBrowser": true,
    "userBrowserIcon": "fa-heart",
    "fallbackColour": "default",
    "singleLineUserbox": true,
    "singleLineString": {
        "age": "%a years",
        "sex": "%s",
        "location": "%l",
        "separator": " "
    },
    "allowedAge": {
        "min": 18,
        "max": 99
    },
    "ageRanges": [
        { "name": "_all", "value": "all" },
        { "name": "< 25", "value": "<25" },
        { "name": "25 - 45", "value": "25-46" },
        { "name": "> 45", "value": ">45" }
    ],
    "sexes": {
        "_male": { "chars": "M", "colour": "#00F" },
        "_female": { "chars": "F", "colour": "#F0F" },
        "_other": { "chars": "O", "colour": "#0F0" }
    },
    "queryKeys": {
        "age": "age",
        "sex": "sex",
        "sexe": "sexe",
        "location": "location",
        "ville": "ville",
        "realname": "realname",
        "channel": "channel"
    },
    "requiredFields": [],
    "welcomeUsesLocalStorage": true,
    "reportChannel": "#abuse",
    "browseAllUsers": false
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `localesPath` | string | `(auto)/plugin-asl/locales` | Path to locale JSON files |
| `gecosType` | integer | `1` | GECOS format: `1` = `[a/s/l] realname`, `2` = `a s l` |
| `showLocation` | boolean | `true` | Show location input on welcome screen |
| `showRealname` | boolean | `false` | Show realname input (only with gecosType 1) |
| `showUserBrowser` | boolean | `true` | Enable User Browser panel |
| `userBrowserIcon` | string | `"fa-heart"` | FontAwesome icon for User Browser button |
| `fallbackColour` | string | `"default"` | Colour when sex is not provided. `"default"` = CSS default, `""` = random |
| `singleLineUserbox` | boolean | `true` | Show A/S/L as one line in the userbox; `false` = one row per fact |
| `singleLineString` | object | | Template for single-line display. `%a` = age, `%s` = sex, `%l` = location |
| `allowedAge` | object | `{"min": 18, "max": 99}` | Age range for the Connect button to be enabled |
| `ageRanges` | array | | Age filter options in User Browser. Values: `"all"`, `"<N"`, `">N"`, `"N-N"` |
| `sexes` | object | | Sex definitions. `chars` is for GECOS matching, first char used in creation. Keys starting with `_` are translation keys |
| `queryKeys` | object | | URL query string parameter names for pre-filling ASL fields |
| `requiredFields` | array | `[]` | Fields required for connect button. Options: `"age"`, `"sex"`, `"location"`, `"realname"` |
| `welcomeUsesLocalStorage` | boolean | `true` | Restore last ASL values from previous session |
| `reportChannel` | string | `"#abuse"` | Channel for abuse reports |
| `browseAllUsers` | boolean | `false` | Show all users from common channels in User Browser |

##### Startup options (`startupOptions`)

These settings go in the KiwiIRC `startupOptions` section, not under `plugin-asl`:

```json
"startupOptions": {
    "server": "irc.example.com:+6697",
    "channel": "#welcome",
    "nick": "guest_?",
    "greetingText": "<h2>Welcome!</h2>",
    "footerText": "<p>Have fun chatting</p>",
    "buttonText": "Connect",
    "termsContent": "<a href='/rules'>I accept the terms of use</a>",
    "termsAutoAccept": true,
    "autoConnect": true
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `greetingText` | string | (localized) | HTML content shown as the form heading |
| `footerText` | string | `""` | HTML content shown below the connect button |
| `buttonText` | string | (localized) | HTML content for the connect button label |
| `termsContent` | string | `""` | HTML content for terms and conditions. When set, terms are displayed on the form |
| `termsAutoAccept` | boolean | `false` | When `true`, clicking the connect button implicitly accepts terms (no checkbox). Also allows `?chatnow=1` to auto-connect without being blocked by terms |
| `autoConnect` | boolean | `false` | Enable auto-connect support via `?chatnow=1` query string |
| `showChannel` | boolean | `true` | Show channel input on the form |
| `showNick` | boolean | `true` | Show nick input on the form |
| `showPassword` | boolean | `true` | Show password option on the form |
| `toggablePassword` | boolean | `true` | Allow toggling password field visibility. When `false`, password is always shown and required |
| `allowNoChannel` | boolean | `false` | Allow connecting without specifying a channel |
| `bouncer` | boolean | `false` | Enable bouncer mode (forces password, hides channel) |
| `nick_format` | string | `""` | Regex pattern to validate nick format |

##### Query string parameters

The welcome screen supports pre-filling fields via URL query strings. The parameter names are configurable via `queryKeys`:

| Parameter | Description |
|-----------|-------------|
| `?nick=` | Pre-fill nickname |
| `?age=` | Pre-fill age |
| `?sex=` | Pre-fill sex (M/F/O) |
| `?location=` | Pre-fill location |
| `?realname=` | Pre-fill realname |
| `?channel=` | Pre-fill channel (auto-prefixes with #) |
| `?chatnow=1` | Auto-connect on page load (requires `autoConnect: true`) |
| `?sexe=` | Legacy alias for sex |
| `?ville=` | Legacy alias for location |

## License

[Licensed under the Apache License, Version 2.0](LICENSE).
