<template>
    <div class="custom-switch" :class="{ 'is-checked': checked }" @click="handleClick" :style="{
        '--switch-on-color': theme || '#409eff',
        '--switch-off-color': '#dcdfe6'
    }">
        <span class="custom-switch__core">
            <span class="custom-switch__button"></span>
        </span>
        <span v-if="loading" class="loading-icon">
            <i class="el-icon-loading"></i>
        </span>
    </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
    name: 'CustomSwitch',
    props: {
        value: {
            type: [String, Number, Boolean],
            default: false
        },
        activeValue: {
            default: true
        },
        inactiveValue: {
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            loading: false
        }
    },
    computed: {
        ...mapState({
            theme: state => state.settings.theme
        }),
        checked() {
            return this.value === this.activeValue
        }
    },
    methods: {
        async handleClick() {
            if (this.disabled || this.loading) return

            this.loading = true
            const newValue = this.checked ? this.inactiveValue : this.activeValue

            try {
                // 发送事件并等待响应,使用 Promise.reject 来确保错误正确传递
                await new Promise((resolve, reject) => {
                    this.$emit('change', newValue, resolve, reject)
                })
                // 成功时更新状态
                this.$emit('input', newValue)
            } catch (error) {
                console.error('Switch operation failed:', error)
                // 不更新状态
            } finally {
                this.loading = false
            }
        }
    }
}
</script>

<style lang="scss" scoped>
.custom-switch {
    display: inline-flex;
    align-items: center;
    position: relative;
    font-size: 14px;
    height: 20px;
    line-height: 20px;
    vertical-align: middle;
    cursor: pointer;

    &__core {
        display: inline-block;
        position: relative;
        width: 40px;
        height: 20px;
        border: 1px solid #dcdfe6;
        outline: none;
        border-radius: 10px;
        box-sizing: border-box;
        background: var(--switch-off-color);
        transition: border-color .3s, background-color .3s;
    }

    &__button {
        position: absolute;
        top: 1px;
        left: 1px;
        border-radius: 100%;
        width: 16px;
        height: 16px;
        background-color: #fff;
        transition: transform .3s;
    }

    &.is-checked {
        .custom-switch__core {
            border-color: var(--switch-on-color);
            background-color: var(--switch-on-color);
        }

        .custom-switch__button {
            transform: translateX(20px);
        }
    }

    .loading-icon {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        color: var(--switch-on-color);
    }
}
</style>
