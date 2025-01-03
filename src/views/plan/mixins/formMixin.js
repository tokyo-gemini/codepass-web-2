import { asyncGetPlanOptions, asyncAddPlan, asyncEditPlan, asyncGetPlanDetail } from '@/api/plan'

export default {
    data() {
        return {
            // 表单数据
            formData: {
                planType: null, //计划类型
                planName: null, //计划名称
                planDesc: null, //计划描述
                formId: null, //计划表单
                cycled: "0", //是否循环启用
                cycledTime: null, //循环时间，开启循环后该值不为空
                cycledTimeType: null, //循环时间类型
                startTime: null, //任务开始时间
                endTime: null, //任务结束时间
                closed: "0", //是否到期自动关闭 0:否 1：是
                closedTime: null, //任务自动关闭时间
                earlyWarning: "0", //是否超期预警 0：否 1：是
                alarmTimeList: [""], //告警时间
                towerUserList: [], //台区用户入参信息集合
                isSelectAll: 0, //是否全选标识 0：否 1：是
                powerSupply: null, // 供电所选择
                towerIdList: null, // 台区列表
                taskTime: null // 任务时间段
            },
            formList: [], //根据类型查询的表单列表
            // 表单校验规则
            rules: {
                planName: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
                formId: [{ required: true, message: '请选择计划表单', trigger: 'change' }],
                powerSupply: [{ required: true, message: '请选择所属供电所', trigger: 'change' }],
                taskTime: [{ required: true, message: '请选择任务时间段', trigger: 'change' }]
            }
        }
    },

    methods: {
        // 获取表单列表
        async getFormListByType() {
            try {
                const res = await asyncGetPlanOptions(this.planType)
                this.formList = res.data || []
            } catch (error) {
                console.error('获取表单列表失败:', error)
                this.$modal.msgError('获取表单列表失败')
            }
        },

        // 获取计划详情
        async getPlanDetail() {
            if (!this.$route.params.id) return
            try {
                const { id } = this.$route.params
                const res = await asyncGetPlanDetail(id)
                if (res.code === 200 && res.data) {
                    const data = res.data

                    // 保存原始的towerUserList
                    const originalTowerUserList = data.towerUserList || []

                    // 处理时间区间
                    if (data.startTime && data.endTime) {
                        data.taskTime = [new Date(data.startTime), new Date(data.endTime)]
                    }

                    // 处理供电所数据
                    if (data.powerIdList && data.powerIdList.length > 0) {
                        data.powerSupply = data.powerIdList
                    }

                    // 处理关闭时间
                    if (data.closedTime) {
                        data.closedTime = new Date(data.closedTime)
                    }

                    // 处理告警时间列表
                    if (!data.alarmTimeList || !Array.isArray(data.alarmTimeList)) {
                        data.alarmTimeList = ['']
                    }

                    // 更新表单数据
                    this.formData = {
                        ...this.formData,
                        ...data,
                        towerUserList: originalTowerUserList
                    }
                }
            } catch (error) {
                console.error('获取计划详情失败:', error)
                this.$modal.msgError('获取计划详情失败')
            }
        },

        // 提交表单
        async handleSubmit() {
            try {
                // 表单校验
                await this.$refs.form.validate()

                // 校验是否选择了台区信息
                if (!this.formData.isSelectAll && !this.formData.towerUserList?.length) {
                    this.$modal.msgWarning('请至少勾选一个台区后再提交！')
                    return
                }

                // 处理提交数据
                const submitData = this.processSubmitData()

                // 判断是新增还是编辑
                const { id } = this.$route.params
                if (id) {
                    submitData.planId = id
                    await asyncEditPlan(submitData)
                    this.$modal.msgSuccess('修改成功')
                } else {
                    await asyncAddPlan(submitData)
                    this.$modal.msgSuccess('新增成功')
                }

                // 返回列表页
                this.$tab.closeOpenPage({ path: '/plan/index', title: '计划管理' })
            } catch (error) {
                console.error('保存失败:', error)
                this.$modal.msgError(error.msg || '保存失败')
            }
        },

        // 处理提交数据
        processSubmitData() {
            const submitData = {}

            // 基础字段处理
            Object.entries(this.formData).forEach(([key, value]) => {
                if (value !== null) {
                    submitData[key] = value
                }
            })

            // 特殊字段处理
            submitData.planType = this.planType
            submitData.enabled = this.$route.params.id ? submitData.enabled : 1

            // 时间相关字段处理
            if (this.needFullTimeOptions) {
                submitData.cycled = this.formData.cycled
                if (this.formData.cycled === '1') {
                    submitData.cycledTimeType = this.formData.cycledTimeType
                    if (this.formData.cycledTimeType === 'custom') {
                        submitData.cycledTime = Number(this.formData.cycledTime)
                    }
                }

                submitData.closed = this.formData.closed
                if (this.formData.closed === '1') {
                    submitData.closedTime = this.formatDateTime(this.formData.closedTime)
                }
            }

            // 任务时间段处理
            if (this.formData.taskTime?.length === 2) {
                submitData.startTime = this.formatDateTime(this.formData.taskTime[0])
                submitData.endTime = this.formatDateTime(this.formData.taskTime[1])
            }

            // 预警相关处理
            submitData.earlyWarning = this.formData.earlyWarning
            if (this.formData.earlyWarning === '1') {
                submitData.alarmTimeList = this.formData.alarmTimeList.filter(time => time !== '')
            }

            // 对象选择相关处理
            submitData.isSelectAll = this.formData.isSelectAll
            if (this.formData.powerSupply?.length) {
                submitData.powerIdList = this.formData.powerSupply
            }

            return submitData
        },

        // 验证表单时间
        validateFormTimes() {
            const { taskTime, closed, closedTime } = this.formData
            if (!taskTime || taskTime.length !== 2) {
                this.$modal.msgWarning('请选择任务时间段')
                return false
            }
            if (closed === '1' && !closedTime) {
                this.$modal.msgWarning('请选择自动关闭时间')
                return false
            }
            return true
        },

        // 重置表单
        handleReset() {
            this.$refs.form.resetFields()
            this.formData = {
                planType: null,
                planName: null,
                planDesc: null,
                formId: null,
                cycled: "0",
                cycledTime: null,
                cycledTimeType: null,
                startTime: null,
                endTime: null,
                closed: "0",
                closedTime: null,
                earlyWarning: "0",
                alarmTimeList: [""],
                towerUserList: [],
                isSelectAll: 0,
                powerSupply: null,
                towerIdList: null,
                taskTime: null
            }
            this.selectedCount = 0
            this.tableData = []
            this.searchKeyword = ''
            this.queryParams.pageNum = 1
            this.queryParams.pageSize = 10
            // 重新加载初始数据
            this.loadInitData()
        }
    }
}
