/* global kiwi:true */

export default class Locales {
    constructor() {
        this.fallbackLocale = null;
        this.localesPath = '';
        this.nameSpace = '';
        this.testKey = '';
        this.onLoaded = () => {};
        this.pendingLocales = 0;
    }

    // onLoaded runs once the locales being loaded are all applied, and on each language change
    init(localesPath, nameSpace, testKey, onLoaded) {
        this.localesPath = localesPath;
        this.nameSpace = nameSpace;
        this.testKey = testKey;
        this.onLoaded = onLoaded || this.onLoaded;

        kiwi.i18n.on('languageChanged', (lang) => {
            if (kiwi.i18n.getResource(lang, this.nameSpace, this.testKey)) {
                if (!this.pendingLocales) {
                    this.onLoaded();
                }
                return;
            }
            this.loadLocale(lang);
        });

        if (kiwi.i18n.language !== 'en-us') {
            // load the fallback language
            this.loadLocale('en-us');
        }

        // load the current language
        this.loadLocale(kiwi.i18n.language);
    }

    loadLocale(_lang) {
        let lang = _lang.toLowerCase();
        let xhttp = new XMLHttpRequest();
        this.pendingLocales++;
        xhttp.onerror = (event) => {
            this.applyLocale(lang, null);
        };
        xhttp.onload = (event) => {
            let localeData = null;
            if (xhttp.status === 200) {
                try {
                    localeData = JSON.parse(xhttp.responseText);
                } catch (err) {
                    // Not a locale file, eg. a server answering with its index page
                }
            }
            // A null locale applies the fallback
            this.applyLocale(lang, localeData);
        };
        xhttp.open('GET', this.localesPath + '/' + lang + '.json');
        xhttp.send();
    }

    applyLocale(lang, localeData) {
        if (!this.fallbackLocale && lang === 'en-us') {
            this.fallbackLocale = localeData;
        }
        kiwi.i18n.addResourceBundle(lang, this.nameSpace, localeData || this.fallbackLocale);

        this.pendingLocales--;
        if (!this.pendingLocales) {
            this.onLoaded();
        }
    }
}
