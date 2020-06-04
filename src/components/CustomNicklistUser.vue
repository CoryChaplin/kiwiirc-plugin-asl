<template functional>
    <div
        :class="[
            props.nicklist.userMode(props.user) ?
                'kiwi-nicklist-user--mode-' + props.nicklist.userMode(props.user) :
                '',
            props.user.away ? 'kiwi-nicklist-user--away' : '',
            props.user.ignore ? 'kiwi-nicklist-user--ignore' : '',
            data.staticClass,
        ]"
        :data-nick="(props.user.nick||'').toLowerCase()"
        class="kiwi-nicklist-user"
        @click="props.nicklist.openUserbox(props.user)"
    >
        <div v-if="props.m().shouldShowAvatars()" class="kiwi-avatar-container">
            <component
                :is="injections.components.Avatar"
                v-if="props.user"
                :user="props.user"
                size="small"
            />
            <component
                :is="injections.components.AwayStatusIndicator"
                :network="props.network"
                :user="props.user"
                :toggle="false"
            />
        </div>
        <div v-else>
            <component
                :is="injections.components.AwayStatusIndicator"
                :network="props.network"
                :user="props.user"
                :toggle="false"
            />
        </div>
        <span class="kiwi-nicklist-user-prefix">
            {{ props.nicklist.userModePrefix(props.user) }}
        </span><span
            :style="{ 'color': props.m().userColour() }"
            class="kiwi-nicklist-user-nick"
        >{{ props.user.nick }}
        </span>
        <span class="kiwi-nicklist-messageuser" @click.stop="props.nicklist.openQuery(props.user)">
            <i class="fa fa-comment" aria-hidden="true" />
        </span>
        <component
            :is="injections.components.TypingStatusIndicator"
            :user="props.user"
            :buffer="props.nicklist.buffer"
        />
        <div class="kiwi-userbox-tooltip"
             v-if="props.user.asl"
        >
            <div class="kiwi-userbox-tooltipNick">{{ props.user.nick }}</div>
            <div class="kiwi-userbox-tooltipInfo">{{ props.user.asl.a }}
                {{ props.user.asl.s }}<br />{{ props.user.asl.l }}</div>
        </div>
    </div>
</template>

<script>
/* global kiwi:true */

let AwayStatusIndicator = kiwi.require('components/AwayStatusIndicator');
let TypingStatusIndicator = kiwi.require('components/TypingStatusIndicator');
let Avatar = kiwi.require('components/Avatar');

const methods = {
    props: {},
    userColour() {
        let props = this.props;
        if (props.nicklist.useColouredNicks) {
            return props.user.getColour();
        }
        return '';
    },
    shouldShowAvatars() {
        let props = this.props;
        return props.nicklist.buffer.setting('nicklist_avatars');
    },
};

export default {
    inject: {
        components: {
            default: {
                AwayStatusIndicator,
                TypingStatusIndicator,
                Avatar,
            },
        },
    },
    props: {
        network: Object,
        user: Object,
        nicklist: Object,
        m: {
            default: function m() {
                // vue uses this function to generate the prop. `this`==null Return our own function
                return function n() {
                    // Give our methods some props context before its function is called.
                    // This is only safe because the function on the methods object is called on
                    // the same js tick
                    methods.props = this;
                    return methods;
                };
            },
        },
    },
};
</script>

<style>
.kiwi-nicklist-user {
    line-height: 26px;
    padding: 0 12px 0 12px;
    border-left: 4px solid;
    margin: 0 0 0 0;
    position: relative;
    box-sizing: border-box;
    transition: all 0.1s;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
}

.kiwi-nicklist--avatars .kiwi-nicklist-user {
    line-height: 32px;
    padding-bottom: 6px;
}

.kiwi-nicklist-user-nick {
    font-weight: bold;
    cursor: pointer;
    flex: 1;
}

.kiwi-nicklist-messageuser {
    position: absolute;
    content: '\f075';
    right: -1em;
    font-family: fontAwesome, sans-serif;
    line-height: 26px;
    opacity: 0;
}

.kiwi-nicklist-messageuser:hover {
    cursor: pointer;
    transition: all 0.2s;
}

.kiwi-nicklist-user:hover .kiwi-nicklist-messageuser {
    opacity: 1;
    right: 1em;
    transition: all 0.2s;
    transition-delay: 0.1s;
}

.kiwi-avatar-container {
    position: relative;
    margin-right: 10px;
    flex: 0;
}

.kiwi-avatar-container .kiwi-avatar {
    width: 30px;
    height: 30px;
}

.kiwi-avatar-container .kiwi-awaystatusindicator {
    position: absolute;
    top: 0;
    right: 0;
    margin: 0;
}

.kiwi-avatar-container-user-prefix {
    flex: 0;
}

.kiwi-nicklist-user .kiwi-userbox-tooltip {
    background-clip: padding-box;
    background-color: #fff;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
    max-width: 276px;
    padding: 1px;
    position: absolute;
    text-align: left;
    top: 0;
    white-space: normal;
    width: 200px;
    right: -9em;
}

.kiwi-nicklist-user:hover {
    cursor: pointer;
    transition: all 0.2s;
}

.kiwi-nicklist-user:hover .kiwi-userbox-tooltip {
    opacity: 1;
    right: 1em;
    transition: all 0.2s;
    transition-delay: 0.1s;
}

.kiwi-nicklist-user .kiwi-userbox-tooltipNick {
    background-color: #eee;
    border-bottom: 1px solid #ebebeb;
    border-radius: 5px 5px 0 0;
    font-size: 14px;
    font-weight: 400;
    line-height: 18px;
    margin: 0;
    padding: 8px 14px;
}

.kiwi-userbox-tooltipInfo {
    padding: 9px 14px;
}
</style>
