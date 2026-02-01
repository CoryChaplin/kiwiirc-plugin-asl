<template>
    <div class="plugin-asl-userbrowser-container">
        <div class="plugin-asl-userbrowser-filters">
            <div
                v-for="(value, name) in sexes"
                :key="'sexes-'+name"
                class="plugin-asl-userbrowser-sexes"
            >
                <input
                    :id="'asl-'+name"
                    :checked="selectedSexes[name]"
                    type="checkbox"
                    @change="toggleSex($event, name)"
                >
                <label :for="'asl-'+name" :style="{ 'color': sexes[name].colour }">
                    {{ name[0] === '_' ? $t('plugin-asl:' + name.substr(1)) : name }}
                </label>
            </div>
            <div class="plugin-asl-userbrowser-label plugin-asl-userbrowser-age">
                {{ $t('plugin-asl:age') }} <select
                    v-model="age"
                    class="u-form"
                    @change="updateSelectedAgeRange()"
                >
                    <option
                        v-for="ageRange in ageRanges"
                        :key="'agerange-'+ageRange.value"
                        :value="ageRange.value"
                    >
                        {{
                            ageRange.name[0] === '_' ?
                                $t('plugin-asl:' + ageRange.name.substr(1)) :
                                ageRange.name
                        }}
                    </option>
                </select>
            </div>
            <div class="plugin-asl-userbrowser-search">
                {{ $t('plugin-asl:search') }}
                <input
                    v-model="filter"
                    class="u-form"
                    type="text"
                    :placeholder="$t('nick')"
                    @change="updateUserFilter()"
                >
                <i v-if="filter !== ''" class="fa fa-undo" aria-hidden="true" @click="filter = ''"/>
            </div>
            <div class="plugin-asl-userbrowser-scope">
                {{ $t('plugin-asl:global_list') }} <label class="switch">
                    <input
                        type="checkbox"
                        @change="toggleScope($event)"
                        :checked="globalScope"
                    >
                    <span class="slider round" />
                </label>
            </div>
        </div>
        <div class="plugin-asl-userbrowser-users">
            <div
                v-if="!globalScope && !buffer.joined"
                class="plugin-asl-userbrowser-parted"
            >
                {{ $t('plugin-asl:channel_parted') }}
            </div>
            <table v-else class="plugin-asl-userbrowser-users-table">
                <tr>
                    <th style="width: 35%; text-align: left;">
                        <a class="plugin-asl-userbrowser-nick">{{ $t('nick') }}</a>
                    </th>
                    <th style="width: 15%;">
                        <a class="plugin-asl-userbrowser-age">{{ $t('plugin-asl:age') }}</a>
                    </th>
                    <th style="width: 50%; text-align: left;">
                        <a class="plugin-asl-userbrowser-location">
                            {{ $t('plugin-asl:location') }}</a>
                    </th>
                </tr>
                <tr v-for="user in filteredUsers" :key="'users-'+user.nick">
                    <td
                        :style="{ 'color': user.colour }"
                        class="plugin-asl-userbrowser-users-nick"
                        @click.stop="openQuery(user);"
                    >{{ user.nick }}</td>
                    <td class="plugin-asl-userbrowser-users-age">{{ user.asl.a || '&nbsp;' }}</td>
                    <td>{{ user.asl.l || '&nbsp;' }}</td>
                </tr>
            </table>
        </div>
    </div>
</template>

<script>

/* global _:true */
/* global kiwi:true */

import * as config from '../config.js';

export default {
    props: ['network', 'buffer', 'sidebarState'],
    data() {
        return {
            sexes: {},
            selectedSexes: {},
            ageRanges: [],
            age: '',
            filter: '',
            globalScope: config.getSetting('browseAllUsers'),
            usersTick: 0,
        };
    },
    computed: {
        filteredUsers() {
            // Force dependency on usersTick to trigger recalculation
            // when IRC events occur (join/part/quit/kick of self or others)
            // eslint-disable-next-line no-unused-vars
            let tick = this.usersTick;
            let filter = this.filter.toLowerCase();
            let users;

            if (this.globalScope) {
                users = this.$state.getActiveNetwork().users;
            } else {
                users = this.buffer.users;
            }

            users = _.filter(users, (user) => {
                if (!user.asl) {
                    return false;
                }

                // dont show self in the list
                if (user.nick === this.network.currentUser().nick) {
                    return false;
                }

                // Filter by sex
                let sexesKeys = Object.keys(this.sexes);
                for (let i = 0; i < sexesKeys.length; i++) {
                    let sex = sexesKeys[i];
                    if (user.asl.s === sex && !this.selectedSexes[sex]) {
                        return false;
                    }
                }

                // Filter by age
                if (this.age[0] === '<' && user.asl.a >= parseInt(this.age.slice(1), 10)) {
                    return false;
                }
                if (this.age[0] === '>' && user.asl.a <= parseInt(this.age.slice(1), 10)) {
                    return false;
                }
                let range = this.age.split('-');
                if (range.length === 2 && (user.asl.a < range[0] || user.asl.a > range[1])) {
                    return false;
                }

                // Filter by nick
                if (user.nick.toLowerCase().indexOf(filter) !== -1) {
                    return true;
                }

                // Filter by location
                if (user.asl.l && user.asl.l.toLowerCase().indexOf(filter) !== -1) {
                    return true;
                }

                return false;
            });

            return _.sortBy(users, (user) => user.nick);
        },
    },
    watch: {
        'buffer.joined'() {
            // Delay to ensure Kiwi has fully updated network.users after part/kick
            setTimeout(() => {
                this.usersTick++;
            }, 500);
        },
        globalScope() {
            // Force refresh when switching between local/global view
            this.$nextTick(() => {
                this.usersTick++;
            });
        },
    },
    created() {
        let onUpdate = (event, net) => {
            if (this.network && net && this.network.id !== net.id) {
                return;
            }
            // Delay to ensure Kiwi has fully updated its user lists
            setTimeout(() => {
                this.usersTick++;
            }, 500);
        };

        if (typeof kiwi !== 'undefined') {
            kiwi.on('irc.join', onUpdate);
            kiwi.on('irc.part', onUpdate);
            kiwi.on('irc.quit', onUpdate);
            kiwi.on('irc.kick', onUpdate);
            kiwi.on('irc.nick', onUpdate);
            kiwi.on('irc.wholist', onUpdate);
            kiwi.on('irc.names', onUpdate);

            this.$once('hook:beforeDestroy', () => {
                kiwi.off('irc.join', onUpdate);
                kiwi.off('irc.part', onUpdate);
                kiwi.off('irc.quit', onUpdate);
                kiwi.off('irc.kick', onUpdate);
                kiwi.off('irc.nick', onUpdate);
                kiwi.off('irc.wholist', onUpdate);
                kiwi.off('irc.names', onUpdate);
            });
        }

        this.sexes = config.setting('sexes');
        this.ageRanges = config.setting('ageRanges');
        this.age = this.$state.pluginASL.selectedAgeRange;
        this.selectedSexes = this.$state.pluginASL.selectedSexes;
        this.filter = this.$state.pluginASL.userFilter;
    },
    beforeDestroy() {
        this.$state.$emit('plugin-asl.userbrowser.close');
    },
    methods: {
        openUserbox(user) {
            this.$state.$emit('userbox.show', user, {
                buffer: this.buffer,
            });
        },
        openQuery(user) {
            let buffer = this.$state.addBuffer(this.network.id, user.nick);
            this.$state.setActiveBuffer(this.network.id, buffer.name);
            if (this.$state.ui.is_narrow) {
                this.$state.$emit('userbox.hide');
            }
        },
        toggleSex(event, name) {
            this.selectedSexes[name] = event.target.checked;
            this.$state.pluginASL.selectedSexes = this.selectedSexes;
        },
        toggleScope(event) {
            this.globalScope = event.target.checked;
        },
        updateSelectedAgeRange() {
            this.$state.pluginASL.selectedAgeRange = this.age;
        },
        updateUserFilter() {
            this.$state.pluginASL.userFilter = this.filter;
        },
    },
};
</script>

<style>
.plugin-asl-userbrowser-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.plugin-asl-userbrowser-container .u-form {
    background-color: #fff;
    height: 25px;
}

.plugin-asl-userbrowser-age select {
    width: 110px;
    margin: 10px 0 0 7px;
}

.plugin-asl-userbrowser-search {
    margin: 10px 0 0 7px;
    display: inline-block;
}

.plugin-asl-userbrowser-search input {
    border-width: 1px;
    border-radius: 3px;
    width: 160px;
}

.plugin-asl-userbrowser-filters {
    background-color: #dbdbdb;
    border: 1px solid #c4c4c4;
    border-radius: 5px;
    margin: 10px;
    padding: 0.5em;
}

.plugin-asl-userbrowser-label {
    display: inline-block;
    margin: 10px 0 0 7px;
}

.plugin-asl-userbrowser-sexes {
    display: inline-block;
    font-weight: bold;
    margin: 4px 4px 4px 10px;
}

.plugin-asl-userbrowser-sexes input,
.plugin-asl-userbrowser-sexes label {
    vertical-align: middle;
    display: inline-block;
}

.plugin-asl-userbrowser-ages {
    margin: 4px;
}

.plugin-asl-userbrowser-filter {
    margin-left: 10px;
    width: 100%;
}

.plugin-asl-userbrowser-filter input {
    width: 300px;
}

.plugin-asl-userbrowser-filter i {
    margin-left: 10px;
}

.plugin-asl-userbrowser-users {
    height: 100%;
    margin: 4px;
    overflow-y: auto;
}

.plugin-asl-userbrowser-users-table {
    width: 100%;
    border-collapse: collapse;
}

.plugin-asl-userbrowser-users-table tr:nth-child(even) {
    background: rgba(0, 0, 0, 0.1);
}

.plugin-asl-userbrowser-users-table td,
.plugin-asl-userbrowser-users-table th {
    padding: 0 4px;
}

.plugin-asl-userbrowser-users-nick {
    font-weight: bold;
    cursor: pointer;
}

.plugin-asl-userbrowser-users-age {
    text-align: center;
}

.plugin-asl-userbrowser-scope {
    display: inline-block;
    margin: 10px 0 0 7px;
}

.plugin-asl-userbrowser-scope .switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 24px;
}

.plugin-asl-userbrowser-scope .switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.plugin-asl-userbrowser-scope .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: 0.4s;
    transition: 0.4s;
}

.plugin-asl-userbrowser-scope .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 4px;
    bottom: 3px;
    background-color: white;
    -webkit-transition: 0.4s;
    transition: 0.4s;
}

.plugin-asl-userbrowser-scope input:checked + .slider {
    background-color: #428bca;
}

.plugin-asl-userbrowser-scope input:focus + .slider {
    box-shadow: 0 0 1px #428bca;
}

.plugin-asl-userbrowser-scope input:checked + .slider:before {
    -webkit-transform: translateX(14px);
    -ms-transform: translateX(14px);
    transform: translateX(14px);
}

/* Rounded sliders */
.plugin-asl-userbrowser-scope .slider.round {
    border-radius: 24px;
}

.plugin-asl-userbrowser-scope .slider.round:before {
    border-radius: 50%;
}

.plugin-asl-userbrowser-parted {
    text-align: center;
    margin-top: 1em;
}
</style>
