<template>
    <div class="rounded bg-white shadow w-full p-4">
        <div class="font-bold pb-4">
            <div class="section-title">时间选择</div>
        </div>

        <!-- 循环启用 -->
        <div v-if="needFullTimeOptions">
            <el-form-item label="循环启用" prop="cycled">
                <template #label>
                    <div class="flex items-center gap-1">
                        <span>循环启用</span>
                        <el-tooltip placement="top">
                            <template #content>
                                <div class="max-w-xs">
                                    <p>设置计划是否需要周期性重复执行:</p>
                                    <ul class="list-disc pl-4 mt-1">
                                        <li>选择"是"可以设置固定周期（每周/每月等）或自定义时间间隔</li>
                                        <li>选择"否"则计划只执行一次</li>
                                    </ul>
                                </div>
                            </template>
                            <i class="el-icon-info text-gray-400 cursor-help"></i>
                        </el-tooltip>
                    </div>
                </template>
                <div class="flex gap-4 items-center">
                    <el-radio-group v-model="timeSettings.cycled" @change="handleCycledChange">
                        <el-radio label="1" size="small">是</el-radio>
                        <el-radio label="0" size="small">否</el-radio>
                    </el-radio-group>
                    <span v-if="timeSettings.cycled === '0'" class="text-xs text-gray-500">循环一次</span>
                </div>
            </el-form-item>

            <!-- 循环时间选择 -->
            <el-form-item v-if="timeSettings.cycled === '1'" label="循环时间" prop="cycledTimeType">
                <el-select v-model="selectedCycleOption" clearable placeholder="请选择循环时间"
                    @change="handleCycledTimeChange">
                    <el-option label="每周" value="W_1" />
                    <el-option label="每两周" value="W_2" />
                    <el-option label="每月" value="M_1" />
                    <el-option label="每两月" value="M_2" />
                    <el-option label="每季度" value="M_3" />
                    <el-option label="每半年" value="M_6" />
                    <el-option label="每年" value="Y_1" />
                    <el-option label="自定义" value="custom" />
                </el-select>
            </el-form-item>

            <!-- 自定义循环时间 -->
            <el-form-item v-if="timeSettings.cycled === '1' && timeSettings.cycledTimeType === 'D'" label="自定义循环时间"
                prop="cycledTime">
                <div class="flex items-center gap-2">
                    <el-input v-model="timeSettings.cycledTime" clearable type="number" placeholder="请输入循环时间"
                        style="width: 200px" @input="handleCustomCycleTime" />
                    <el-select v-model="timeSettings.cycledTimeType" placeholder="请选择单位" style="width: 100px"
                        @change="handleCustomCycleType">
                        <el-option label="天" value="D" />
                        <el-option label="周" value="W" />
                        <el-option label="月" value="M" />
                        <el-option label="年" value="Y" />
                    </el-select>
                </div>
            </el-form-item>
        </div>

        <!-- 任务时间段 -->
        <div>
            <el-form-item prop="taskTime">
                <template #label>
                    <div class="flex items-center gap-1">
                        <div class="flex flex-col">
                            <div class="flex items-center gap-1">
                                <span>第一次任务</span>
                                <el-tooltip placement="top">
                                    <template #content>
                                        <div class="max-w-xs">
                                            <p>设置计划的首次执行时间段:</p>
                                            <ul class="list-disc pl-4 mt-1">
                                                <li>开始时间: 计划从什么时候开始执行</li>
                                                <li>结束时间: 本次任务的截止时间</li>
                                                <li>如启用循环,后续任务会按设定的周期自动创建</li>
                                            </ul>
                                        </div>
                                    </template>
                                    <i class="el-icon-info text-gray-400 cursor-help"></i>
                                </el-tooltip>
                            </div>
                            <div class="text-xs text-gray-500">任务时间段</div>
                        </div>
                    </div>
                </template>
                <el-date-picker v-model="timeSettings.taskTime" type="datetimerange" range-separator="至"
                    start-placeholder="开始日期" end-placeholder="结束日期" :picker-options="pickerOptions"
                    @change="handleInput" />
            </el-form-item>
        </div>

        <!-- 到期计划 -->
        <div v-if="needFullTimeOptions">
            <el-form-item prop="closed">
                <template #label>
                    <div class="flex items-center gap-1">
                        <div class="flex flex-col">
                            <div class="flex items-center gap-1">
                                <span>到期计划</span>
                                <el-tooltip placement="top">
                                    <template #content>
                                        <div class="max-w-xs">
                                            <p>设置计划是否需要自动关闭:</p>
                                            <ul class="list-disc pl-4 mt-1">
                                                <li>选择"是"可以设置计划的最终截止时间</li>
                                                <li>到达设定时间后,计划将自动停止执行</li>
                                                <li>适用于有明确结束时间的周期性计划</li>
                                            </ul>
                                        </div>
                                    </template>
                                    <i class="el-icon-info text-gray-400 cursor-help"></i>
                                </el-tooltip>
                            </div>
                            <div class="text-xs text-gray-500">自动关闭</div>
                        </div>
                    </div>
                </template>
                <el-radio-group v-model="timeSettings.closed" @change="handleInput">
                    <el-radio label="1">是</el-radio>
                    <el-radio label="0">否</el-radio>
                </el-radio-group>
            </el-form-item>

            <el-form-item v-if="timeSettings.closed === '1'" prop="closedTime" label="自动关闭时间">
                <el-date-picker v-model="timeSettings.closedTime" type="datetime" placeholder="选择日期时间"
                    @change="handleInput" />
            </el-form-item>
        </div>

        <!-- 预警设置 -->
        <div>
            <el-form-item prop="earlyWarning">
                <template #label>
                    <div class="flex items-center gap-1">
                        <div class="flex flex-col">
                            <div class="flex items-center gap-1">
                                <span>预警启用</span>
                                <el-tooltip placement="top">
                                    <template #content>
                                        <div class="max-w-xs">
                                            <p>设置任务即将超期时的提醒功能:</p>
                                            <ul class="list-disc pl-4 mt-1">
                                                <li>可设置多个预警时间点</li>
                                                <li>系统将在任务到期前指定时间发出提醒</li>
                                                <li>帮助及时跟进即将超期的任务</li>
                                            </ul>
                                        </div>
                                    </template>
                                    <i class="el-icon-info text-gray-400 cursor-help"></i>
                                </el-tooltip>
                            </div>
                            <div class="text-xs text-gray-500">即将超期</div>
                        </div>
                    </div>
                </template>
                <el-radio-group v-model="timeSettings.earlyWarning" @change="handleInput">
                    <el-radio label="1">是</el-radio>
                    <el-radio label="0">否</el-radio>
                </el-radio-group>
            </el-form-item>
        </div>

        <!-- 告警时间设置 -->
        <div v-if="timeSettings.earlyWarning === '1'">
            <el-form-item label="告警时间" prop="alarmTimeList">
                <template #label>
                    <div class="flex items-center gap-1">
                        <span>告警时间</span>
                        <el-tooltip content="设置在任务到期前多少小时发出预警提醒" placement="top">
                            <i class="el-icon-info text-gray-400 cursor-help"></i>
                        </el-tooltip>
                    </div>
                </template>
                <div class="flex flex-col gap-4">
                    <div v-for="(_, index) in timeSettings.alarmTimeList" :key="index" class="flex items-center gap-4">
                        <el-input v-model="timeSettings.alarmTimeList[index]" clearable type="number"
                            placeholder="请输入告警时间（小时）" @input="handleInput" />
                        <el-button type="primary" icon="el-icon-plus" @click="handleAddAlarmTime" />
                        <el-button type="danger" icon="el-icon-minus" @click="handleRemoveAlarmTime(index)"
                            v-if="timeSettings.alarmTimeList.length > 1" />
                    </div>
                </div>
            </el-form-item>
        </div>
    </div>
</template>

<script>
export default {
    name: 'PlanTimeSettings',

    props: {
        value: {
            type: Object,
            required: true
        },
        needFullTimeOptions: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return {
            selectedCycleOption: null, // 添加新的数据属性
            timeSettings: {
                cycled: '0',
                cycledTime: null,
                cycledTimeType: null,
                cycledTimeUnit: 'day',
                taskTime: [],
                closed: '0',
                closedTime: null,
                earlyWarning: '0',
                alarmTimeList: ['']
            },
            pickerOptions: {
                disabledDate(time) {
                    return time.getTime() < Date.now() - 8.64e7
                },
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

    watch: {
        value: {
            handler(val) {
                this.timeSettings = { ...val }
                // 设置选中项
                if (val.cycledTimeType && val.cycledTime) {
                    if (val.cycledTimeType === 'D') {
                        this.selectedCycleOption = 'custom'
                    } else {
                        this.selectedCycleOption = `${val.cycledTimeType}_${val.cycledTime}`
                    }
                }
            },
            immediate: true,
            deep: true
        }
    },

    methods: {
        handleInput() {
            this.$emit('input', { ...this.timeSettings })
        },

        handleCycledChange(value) {
            if (value === '0') {
                this.timeSettings.cycledTimeType = ''
                this.timeSettings.cycledTime = ''
            }
            this.handleInput()
        },

        handleCycledTimeChange(value) {
            if (value === 'custom') {
                this.timeSettings.cycledTimeType = 'D'
                this.timeSettings.cycledTime = ''
                this.selectedCycleOption = 'custom'
            } else {
                // 解析选择的值，格式为：类型_时间
                const [type, time] = value.split('_')
                this.timeSettings.cycledTimeType = type
                this.timeSettings.cycledTime = time
                this.selectedCycleOption = value
            }
            this.handleInput()
        },

        // 添加处理自定义循环时间的方法
        handleCustomCycleTime(value) {
            this.timeSettings.cycledTime = value
            this.handleInput()
        },

        // 添加处理自定义循环类型的方法
        handleCustomCycleType(value) {
            this.timeSettings.cycledTimeType = value
            this.handleInput()
        },

        handleAddAlarmTime() {
            this.timeSettings.alarmTimeList.push('')
            this.handleInput()
        },

        handleRemoveAlarmTime(index) {
            this.timeSettings.alarmTimeList.splice(index, 1)
            this.handleInput()
        }
    }
}
</script>
