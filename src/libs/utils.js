/* global kiwi:true */

export function parseGecos(gecos) {
    let types = kiwi.state.pluginASL.gecosTypes;
    let gecosType = kiwi.state.getSetting('settings.plugin-asl.gecosType') - 1;

    let sex = types[gecosType].other;
    let tempGecos;
    let location = '';
    let age = '';

    // Test male
    let tempGecosMale = gecos.split(sexRegexThis(types[gecosType].male));
    if (tempGecosMale.length > 1) {
        sex = types[gecosType].male;
        tempGecos = tempGecosMale;
    } else {
        // Test female
        let tempGecosFemale = gecos.split(sexRegexThis(types[gecosType].female));
        if (tempGecosFemale.length > 1) {
            sex = types[gecosType].female;
            tempGecos = tempGecosFemale;
        } else {
            tempGecos = gecos.split(sexRegexThis(types[gecosType].other));
        }
    }
    if (tempGecos.length > 1) {
        location = tempGecos[1];
    }

    if (tempGecos[0] !== undefined && tempGecos[0].match(/[0-9]/)) {
        age = tempGecos[0];
    }

    if (tempGecos.length > 0) {
        if (age === '' && sex === types[gecosType].other && location === '') {
            return {
                asl: {
                    a: age,
                    s: getSex(sex),
                    l: location,
                },
                realname: gecos,
            };
        }
        return {
            asl: {
                a: age,
                s: getSex(sex),
                l: location,
            },
        };
    }
    return {
        asl: null,
        realname: gecos,
    };
}

export function getColour(asl) {
    let sex = asl && asl.s ? asl.s : '';
    let sexes = kiwi.state.getSetting('settings.plugin-asl.sexes');
    let fallbackColour = kiwi.state.getSetting('settings.plugin-asl.fallbackColour');
    return sexes[sex] ? sexes[sex].colour : fallbackColour;
}

export function getSexChar(sex) {
    let sexes = kiwi.state.getSetting('settings.plugin-asl.sexes');
    return sexes[sex] ? sexes[sex].chars[0] : null;
}

function getSex(sexChar) {
    let sexes = kiwi.state.getSetting('settings.plugin-asl.sexes');
    let sexesKeys = Object.keys(sexes);
    for (let i = 0; i < sexesKeys.length; i++) {
        let sex = sexesKeys[i];
        if (sexes[sex].chars.indexOf(sexChar) !== -1) {
            return sex;
        }
    }
    return null;
}

function sexRegexThis(string) {
    let sexRegexString = '^' + string + ' | ' + string + '$|^' + string + '$| ' + string + ' ';
    let regex = new RegExp(sexRegexString, 'gi');

    return regex;
}
