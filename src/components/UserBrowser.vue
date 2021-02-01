<template>
    <div class="plugin-asl-userbrowser-container">
        <div class="plugin-asl-userbrowser-filters">
            <div
                v-for="(value, name) in sexes"
                :key="'sexes-'+name"
                :style="{ 'color': sexes[name].colour }"
                class="plugin-asl-userbrowser-sexes"
            >
                <input
                    :id="'asl-'+name"
                    :checked="selectedSexes[name]"
                    type="checkbox"
                    @change="toggleSex($event, name)"
                >
                <label :for="'asl-'+name">
                    {{ name[0] === '_' ? $t('plugin-asl:' + name.substr(1)) : name }}
                </label>
            </div>
            <div class="plugin-asl-userbrowser-label plugin-asl-userbrowser-age">
                &nbsp;&nbsp;{{ $t('plugin-asl:age') }} <select
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
                Liste globale <label class="switch">
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
            <table class="plugin-asl-userbrowser-users-table">
                <tr>
                    <th style="width: 35%; text-align: left;">{{ $t('nick') }}</th>
                    <th style="width: 15%;">{{ $t('plugin-asl:age') }}</th>
                    <th style="width: 50%; text-align: left;">{{ $t('plugin-asl:location') }}</th>
                </tr>
                <tr v-for="user in filteredUsers" :key="'users-'+user.nick">
                    <td
                        :style="{ 'color': user.colour }"
                        class="plugin-asl-userbrowser-users-nick"
                        @click.stop="openUserbox(user);"
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

export default {
    props: ['network', 'buffer', 'sidebarState'],
    data() {
        return {
            sexes: {},
            selectedSexes: {},
            ageRanges: [],
            age: '',
            filter: '',
            globalScope: kiwi.state.getSetting('settings.plugin-asl.browseAllUsers'),
        };
    },
    computed: {
        filteredUsers() {
            let filter = this.filter.toLowerCase();
            let users;

            if (this.globalScope) {
                users = kiwi.state.getActiveNetwork().users;
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
    created() {
        this.sexes = kiwi.state.setting('plugin-asl.sexes');
        this.ageRanges = kiwi.state.setting('plugin-asl.ageRanges');
        this.age = kiwi.state.pluginASL.selectedAgeRange;
        this.selectedSexes = kiwi.state.pluginASL.selectedSexes;
        this.filter = kiwi.state.pluginASL.userFilter;
    },
    beforeDestroy() {
        kiwi.state.$emit('plugin-asl.userbrowser.close');
    },
    methods: {
        openUserbox(user) {
            kiwi.state.$emit('userbox.show', user, {
                buffer: this.buffer,
            });
        },
        toggleSex(event, name) {
            this.selectedSexes[name] = event.target.checked;
            kiwi.state.pluginASL.selectedSexes = this.selectedSexes;
        },
        toggleScope(event) {
            this.globalScope = event.target.checked;
        },
        updateSelectedAgeRange() {
            kiwi.state.pluginASL.selectedAgeRange = this.age;
        },
        updateUserFilter() {
            kiwi.state.pluginASL.userFilter = this.filter;
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
}

.plugin-asl-userbrowser-search {
    margin-top: 10px;
    margin-left: 7px;
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
    margin-left: 10px;
}

.plugin-asl-userbrowser-sexes {
    display: inline-block;
    font-weight: bold;
}

.plugin-asl-userbrowser-sexes input,
.plugin-asl-userbrowser-sexes label {
    vertical-align: middle;
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
    margin-left: 10px;
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
</style>
