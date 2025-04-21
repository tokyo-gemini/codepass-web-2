<template>
  <div class="app-container">
    <page-header
      :title="pageTitle"
      @back="handleBack"
      @submit="handleSubmit"
      @reset="handleReset"
    />
    <el-form ref="form" :model="formData" label-width="120px" inline>
      <div class="flex flex-col gap-4">
        <plan-basic-info
          :plan-type="planType"
          v-model="formBasicInfo"
          @input="handleBasicInfoChange"
        />

        <!-- 具体计划内容将由子类实现 -->
        <slot name="plan-content"></slot>

        <plan-time-settings
          v-model="timeSettings"
          :need-full-time-options="needFullTimeOptions"
          @input="handleTimeSettingsChange"
        />
      </div>
    </el-form>
  </div>
</template>

<script>
  import {
    asyncGetPlanDetail,
    asyncAddPlan,
    asyncEditPlan,
    asyncAddSelfPlan,
    asyncEditSelfPlan,
    asyncGetSelfPlanDetail
  } from '@/api/plan'
  import PlanBasicInfo from './PlanBasicInfo.vue'
  import PlanTimeSettings from './PlanTimeSettings.vue'
  import PageHeader from './PageHeader.vue'
  import dayjs from 'dayjs'

  export default {
    name: 'BasePlan',
    components: {
      PageHeader,
      PlanBasicInfo,
      PlanTimeSettings
    },
    props: {
      planType: {
        type: String,
        required: true
      }
    },
    data() {
      return {
        formBasicInfo: {
          planName: null,
          planDesc: null,
          formId: null
        },
        formData: {
          planType: null,
          planName: null,
          planDesc: null,
          formId: null,
          cycled: '0',
          cycledTime: null,
          cycledTimeType: null,
          cycledTimeUnit: 'day',
          startTime: null,
          endTime: null,
          closed: '0',
          closedTime: null,
          earlyWarning: '0',
          alarmTimeList: ['']
        },
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
        }
      }
    },
    computed: {
      pageTitle() {
        if (this.$route.params.id) {
          return '编辑计划'
        }
        return '新增计划'
      },
      needFullTimeOptions() {
        return ['1', '2', '3', '4', '5'].includes(this.planType)
      },
      isSelfReport() {
        return ['5', '6'].includes(this.planType)
      }
    },
    created() {
      this.init()
    },
    methods: {
      async init() {
        if (this.$route.params.id) {
          await this.getPlanDetail()
        }
      },
      async getPlanDetail() {
        try {
          const { id } = this.$route.params
          const res = this.isSelfReport
            ? await asyncGetSelfPlanDetail(id)
            : await asyncGetPlanDetail(id)

          if (res.code === 200 && res.data) {
            const data = res.data
            if (data.startTime && data.endTime) {
              data.taskTime = [new Date(data.startTime), new Date(data.endTime)]
            }
            if (data.closedTime) {
              data.closedTime = new Date(data.closedTime)
            }
            if (!data.alarmTimeList || !Array.isArray(data.alarmTimeList)) {
              data.alarmTimeList = ['']
            }

            this.formData = { ...data }
            this.formBasicInfo = {
              planName: data.planName,
              planDesc: data.planDesc,
              formId: data.formId
            }
            this.timeSettings = {
              cycled: data.cycled || '0',
              cycledTime: data.cycledTime || null,
              cycledTimeType: data.cycledTimeType || null,
              cycledTimeUnit: 'day',
              taskTime: data.taskTime || [],
              closed: data.closed || '0',
              closedTime: data.closedTime || null,
              earlyWarning: data.earlyWarning || '0',
              alarmTimeList: data.alarmTimeList || ['']
            }

            // 触发子类的数据加载
            this.$emit('plan-data-loaded', data)
          }
        } catch (error) {
          console.error('获取计划详情失败:', error)
        }
      },
      handleBack() {
        this.$tab.closeOpenPage({ path: '/plan/index', title: '计划管理' })
      },
      async handleSubmit() {
        try {
          await this.$refs.form.validate()

          // 处理提交数据
          const submitData = this.prepareSubmitData()
          const formData = new FormData()

          // 将 JSON 转换为二进制 blob
          const jsonBlob = new Blob([JSON.stringify(submitData)], {
            type: 'application/json'
          })
          formData.append('dto', jsonBlob)

          // 触发before-submit事件,让子组件处理特定逻辑
          const listeners = this._events['before-submit']
          let shouldContinue = true

          if (listeners && listeners.length > 0) {
            try {
              shouldContinue = await listeners[0](formData)
            } catch (error) {
              console.error('处理before-submit事件时出错:', error)
              shouldContinue = false
            }
          }

          if (!shouldContinue) {
            return
          }

          // 在提交前打印最终要提交的数据内容
          const dtoBlob = formData.get('dto')
          if (dtoBlob) {
            const reader = new FileReader()
            reader.onload = () => {
              console.log('最终提交的JSON数据:', reader.result)
            }
            reader.readAsText(dtoBlob)
          }

          // 提交表单
          const { id } = this.$route.params
          let res
          if (this.isSelfReport) {
            res = id ? await asyncEditSelfPlan(formData) : await asyncAddSelfPlan(formData)
          } else {
            res = id ? await asyncEditPlan(formData) : await asyncAddPlan(formData)
          }

          if (res.code === 200) {
            this.$modal.msgSuccess(id ? '修改成功' : '新增成功')
            this.handleBack()
          }
        } catch (error) {
          console.error('保存失败:', error)
          this.$modal.msgError(error.message || '保存失败')
        }
      },
      prepareSubmitData() {
        const submitData = {
          ...Object.fromEntries(
            Object.entries(this.formData).filter(([key, value]) => value !== null)
          ),
          planType: this.planType
        }

        if (this.needFullTimeOptions) {
          submitData.cycled = this.formData.cycled
          if (this.formData.cycled === '1') {
            submitData.cycledTimeType = this.formData.cycledTimeType
            if (this.formData.cycledTimeType === 'D') {
              const time = Number(this.formData.cycledTime)
              switch (this.formData.cycledTimeUnit) {
                case 'day':
                  submitData.cycledTime = time.toString()
                  break
                case 'week':
                  submitData.cycledTimeType = 'W'
                  submitData.cycledTime = time.toString()
                  break
                case 'month':
                  submitData.cycledTimeType = 'M'
                  submitData.cycledTime = time.toString()
                  break
                case 'year':
                  submitData.cycledTimeType = 'Y'
                  submitData.cycledTime = time.toString()
                  break
                default:
                  break
              }
            } else {
              submitData.cycledTime = this.formData.cycledTime
            }
          }
        }

        if (this.formData.taskTime?.length === 2) {
          submitData.startTime = dayjs(this.formData.taskTime[0]).format('YYYY-MM-DD HH:mm:ss')
          submitData.endTime = dayjs(this.formData.taskTime[1]).format('YYYY-MM-DD HH:mm:ss')
        }

        if (this.formData.closedTime) {
          submitData.closedTime = dayjs(this.formData.closedTime).format('YYYY-MM-DD HH:mm:ss')
        }

        if (this.formData.earlyWarning === '1') {
          submitData.alarmTimeList = this.formData.alarmTimeList.filter((time) => time !== '')
        } else {
          delete submitData.alarmTimeList
        }

        submitData.enabled = this.$route.params.id ? submitData.enabled : 1

        return submitData
      },
      handleReset() {
        this.$refs.form.resetFields()
        this.formBasicInfo = {
          planName: null,
          planDesc: null,
          formId: null
        }
        this.formData = {
          planType: null,
          planName: null,
          planDesc: null,
          formId: null,
          cycled: '0',
          cycledTime: null,
          cycledTimeType: null,
          cycledTimeUnit: 'day',
          startTime: null,
          endTime: null,
          closed: '0',
          closedTime: null,
          earlyWarning: '0',
          alarmTimeList: [''],
          towerUserList: [],
          isSelectAll: 0,
          powerSupply: null,
          towerIdList: null,
          powerIdList: null,
          userId: null
        }
        this.timeSettings = {
          cycled: '0',
          cycledTime: null,
          cycledTimeType: null,
          cycledTimeUnit: 'day',
          taskTime: [],
          closed: '0',
          closedTime: null,
          earlyWarning: '0',
          alarmTimeList: ['']
        }
        this.$emit('reset')
      },
      handleBasicInfoChange(val) {
        this.formData.planName = val.planName
        this.formData.planDesc = val.planDesc
        this.formData.formId = val.formId
      },
      handleTimeSettingsChange(val) {
        Object.assign(this.formData, val)
      }
    }
  }
</script>
