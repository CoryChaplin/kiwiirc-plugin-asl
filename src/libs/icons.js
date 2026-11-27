/* global kiwi:true */

// Kiwi renders Font Awesome 7 SVG icons with its global <svg-icon> component, from its own icon
// library. It only bundles the icons Kiwi itself uses, so the plugin adds the ones it needs.
// Only icon definitions (SVG data) are imported here: the library is Kiwi's, so there is a single
// Font Awesome core on the page.
import {
    faArrowRight, faArrowUp, faBan, faCakeCandles, faCalendar, faCaretDown, faCheck,
    faCircleCheck, faCircleQuestion, faComment, faCrosshairs, faEye, faFlag, faGavel, faHeart,
    faKey, faLifeRing, faList, faLocationDot, faLock, faMagnifyingGlass, faMars, faPaperclip,
    faRightFromBracket, faRobot, faRotateLeft, faServer, faShieldHalved, faSpinner,
    faTransgender, faTriangleExclamation, faUser, faVenus, faVenusMars, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
    faCircle as farCircle,
    faComment as farComment,
    faIdCard as farIdCard,
    faMoon as farMoon,
} from '@fortawesome/free-regular-svg-icons';

// userBrowserIcon can be set to any of these (faHeart is the default, faList is used on EuropNet)
const icons = [
    faArrowRight, faArrowUp, faBan, faCakeCandles, faCalendar, faCaretDown, faCheck,
    faCircleCheck, faCircleQuestion, faComment, faCrosshairs, faEye, faFlag, faGavel, faHeart,
    faKey, faLifeRing, faList, faLocationDot, faLock, faMagnifyingGlass, faMars, faPaperclip,
    faRightFromBracket, faRobot, faRotateLeft, faServer, faShieldHalved, faSpinner,
    faTransgender, faTriangleExclamation, faUser, faVenus, faVenusMars, faXmark,
    farCircle, farComment, farIdCard, farMoon,
];

export function installIcons() {
    kiwi.svgIcons.library.add(...icons);
    installGenderGlyphStyles();
}

// The gender glyph after a nick (.g-f, .g-m, .g-u, set on the nicklist, userbox and message list
// nicks) used to be a Font Awesome 4 font character. Draw the same icons as a CSS mask instead,
// so they still take the nick colour.
function installGenderGlyphStyles() {
    const glyphs = { f: faVenus, m: faMars, u: faTransgender };
    const selectors = (cls) => ['messagelist', 'nicklist-user', 'userbox']
        .map((part) => `.kiwi-${part}-nick.g-${cls}::after`)
        .join(', ');

    const rules = Object.entries(glyphs).map(([cls, definition]) => {
        const [width, height, , , path] = definition.icon;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
            `<path d="${path}"/></svg>`;
        const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
        return `${selectors(cls)} { -webkit-mask-image: ${url}; mask-image: ${url}; ` +
            `aspect-ratio: ${width} / ${height}; }`;
    });

    const style = document.createElement('style');
    style.dataset.pluginAsl = 'gender-glyphs';
    style.textContent = [
        `${selectors('f')}, ${selectors('m')}, ${selectors('u')} {`,
        '    content: "";',
        '    display: inline-block;',
        '    height: 0.85em;',
        '    margin-left: 0.2em;',
        '    vertical-align: -0.05em;',
        '    background-color: currentColor;',
        '    opacity: 0.85;',
        '    -webkit-mask-repeat: no-repeat;',
        '    mask-repeat: no-repeat;',
        '    -webkit-mask-size: contain;',
        '    mask-size: contain;',
        '}',
        // Smaller next to the big userbox nick, as it was with the font glyph
        `${['f', 'm', 'u'].map((cls) => `.kiwi-userbox-nick.g-${cls}::after`).join(', ')} {`,
        '    height: 0.62em;',
        '    margin-left: 0.32rem;',
        '}',
        ...rules,
    ].join('\n');
    document.head.appendChild(style);
}
