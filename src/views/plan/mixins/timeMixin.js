export default {
    data() {
        return {
            pickerOptions: {
                // 禁用今天之前的日期
                disabledDate(time) {
                    return time.getTime() < Date.now() - 8.64e7
                },
                // 快捷选项
                shortcuts: [
                    {
                        text: '未来一周',
                        onClick(picker) {
                            const end = new Date()
                            const start = new Date()
                            end.setTime(start.getTime() + 3600 * 1000 * 24 * 7)
                            picker.$emit('pick', [start, end])
                        }
                    },
                    {
                        text: '未来一个月',
                        onClick(picker) {
                            const end = new Date()
                            const start = new Date()
                            end.setMonth(start.getMonth() + 1)
                            picker.$emit('pick', [start, end])
                        }
                    },
                    {
                        text: '未来三个月',
                        onClick(picker) {
                            const end = new Date()
                            const start = new Date()
                            end.setMonth(start.getMonth() + 3)
                            picker.$emit('pick', [start, end])
                        }
                    }
                ]
            }
        }
    },

    methods: {
        // 循环启用改变事件
        cycledChange(value) {
            if (value === '0') {
                // 关闭循环时清空相关字段
                this.formData.cycledTimeType = ''
                this.formData.cycledTime = ''
            }
        },

        // 格式化日期时间
        formatDateTime(date) {
            if (!date) return ''
            const dt = new Date(date)
            const year = dt.getFullYear()
            const month = String(dt.getMonth() + 1).padStart(2, '0')
            const day = String(dt.getDate()).padStart(2, '0')
            const hours = String(dt.getHours()).padStart(2, '0')
            const minutes = String(dt.getMinutes()).padStart(2, '0')
            const seconds = String(dt.getSeconds()).padStart(2, '0')
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        },

        // 增加告警时间
        addAlarmTime() {
            this.formData.alarmTimeList.push('')
            // 添加后自动滚动到底部
            this.$nextTick(() => {
                const container = document.querySelector('.app-container')
                if (container) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    })
                }
            })
        },

        // 删除告警时间
        removeAlarmTime(index) {
            // 至少保留一个告警时间输入框
            if (this.formData.alarmTimeList.length > 1) {
                this.formData.alarmTimeList.splice(index, 1)
            }
        },

        // 验证时间输入
        validateTimeInput(time) {
            if (!time) return true
            // 验证是否为正数
            const num = Number(time)
            return !isNaN(num) && num > 0
        },

        // 获取循环时间类型对应的天数
        getCycledDays(type) {
            const cycledMap = {
                'weekly': 7,
                'biweekly': 14,
                'monthly': 30,
                'bimonthly': 60,
                'quarterly': 90,
                'semiannually': 180,
                'annually': 365
            }
            return cycledMap[type] || 0
        },

        // 计算下一次循环时间
        calculateNextCycleTime(startTime, cycleType, customDays) {
            const start = new Date(startTime)
            let days = 0

            if (cycleType === 'custom') {
                days = Number(customDays) || 0
            } else {
                days = this.getCycledDays(cycleType)
            }

            if (days > 0) {
                const nextTime = new Date(start)
                nextTime.setDate(start.getDate() + days)
                return this.formatDateTime(nextTime)
            }
            return null
        }
    }
}
