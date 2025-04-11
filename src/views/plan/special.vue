<template>
  <div class="app-container">
    <page-header :title="pageTitle" @back="handleBack" @submit="handleSubmit" @reset="handleReset" />
    <el-form ref="form" :model="formData" label-width="120px" inline>
      <div class="flex flex-col gap-4">
        <plan-basic-info :plan-type="planType" v-model="formBasicInfo" @input="handleBasicInfoChange" />

        <!-- 特殊走访和特殊巡视的内容 -->
        <div class="rounded bg-white shadow w-full p-4">
          <!-- 供电所与网格员选择区域 -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
            <!-- 供电所选择 -->
            <el-form-item label="供电所" prop="powerSupply" class="w-full">
              <treeselect v-model="formData.powerSupply" :multiple="false" :options="powerSupplyTree"
                :normalizer="normalizer" :disable-branch-nodes="true" :flat="true" placeholder="请选择供电所"
                @input="handlePowerSupplyChange" class="w-full" />
            </el-form-item>

            <!-- 网格员选择 -->
            <el-form-item label="网格员" prop="gridUsers" class="w-full">
              <el-select v-model="formData.gridUsers" placeholder="请先选择供电所"
                :disabled="!formData.powerSupply || formData.isSubmitting" class="w-full"
                @change="handleGridUserChange">
                <el-option v-for="item in gridUserOptions" :key="item.userId" :label="item.userName"
                  :value="item.userId">
                </el-option>
              </el-select>
            </el-form-item>
          </div>

          <!-- 工单数据表格区域 -->
          <div v-if="formData.powerSupply" class="border-t pt-4">
            <div class="flex justify-between items-center mb-4">
              <div class="text-sm text-gray-500">95598{{ isVisit ? '特殊走访' : '特殊巡视' }}工单</div>
              <div class="text-sm text-gray-500">共 {{ total }} 条数据</div>
            </div>

            <el-table v-loading="loading" :data="workOrderList" border stripe size="small" style="width: 100%"
              :header-cell-style="{ background: '#f5f7fa', color: '#606266' }">
              <el-table-column prop="userId" label="用户ID" width="150" />
              <el-table-column prop="userName" label="台区经理名称" min-width="180" />
              <el-table-column prop="areaName" label="市" width="120" />
              <el-table-column prop="companyName" label="公司名称" min-width="180" />
              <el-table-column prop="powerName" label="供电所名称" min-width="180" />
              <el-table-column prop="towerName" label="台区名称" min-width="180" />
              <el-table-column prop="towerId" label="台区主键ID" width="150" />
              <el-table-column prop="deptId" label="单位ID" width="150" />
              <el-table-column prop="provinceName" label="省" width="120" />
              <el-table-column prop="customId" label="客户ID" width="150" />
              <el-table-column prop="customName" label="客户姓名" min-width="180" />
            </el-table>

            <!-- 分页组件 -->
            <div class="mt-4 flex justify-end">
              <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum"
                :limit.sync="queryParams.pageSize" @pagination="getWorkOrderList" />
            </div>
          </div>
        </div>

        <plan-time-settings v-model="timeSettings" :need-full-time-options="needFullTimeOptions"
          @input="handleTimeSettingsChange" />
      </div>
    </el-form>
  </div>
</template>

<script>
import {
  asyncGetPlanOptions,
  asyncGetPlanDetail,
  asyncAddPlan,
  asyncEditPlan,
  asyncGetUserListByDept,
  asyncGetVisitWorkOrderList,
  asyncGetInspectWorkOrderList
} from '@/api/plan'
import { deptTreeSelect } from '@/api/system/user'
import Treeselect from '@riophae/vue-treeselect'
import PlanBasicInfo from './components/PlanBasicInfo.vue'
import PlanTimeSettings from './components/PlanTimeSettings.vue'
import PageHeader from './components/PageHeader.vue'
import '@riophae/vue-treeselect/dist/vue-treeselect.css'
import dayjs from 'dayjs'

export default {
  name: 'PlanSpecial',
  components: {
    PageHeader,
    Treeselect,
    PlanBasicInfo,
    PlanTimeSettings
  },
  dicts: ['plan_type_option'],
  data() {
    return {
      formBasicInfo: {
        planName: null,
        planDesc: null,
        formId: null
      },
      formData: {
        planType: null, //计划类型
        planName: null, //计划名称
        planDesc: null, //计划描述
        formId: null, //计划表单
        cycled: '0', //是否循环启用
        cycledTime: null, //循环时间，开启循环后该值不为空
        cycledTimeType: null, //循环时间类型
        cycledTimeUnit: 'day', // 添加循环时间单位字段
        startTime: null, //任务开始时间
        endTime: null, //任务结束时间
        closed: '0', //是否到期自动关闭 0:否 1：是
        closedTime: null, //任务自动关闭时间
        earlyWarning: '0', //是否超期预警 0：否 1：是
        alarmTimeList: [''], //告警时间
        powerSupply: null, // 供电所选择
        gridUsers: null, // 网格员选择（单值）
        isSubmitting: false // 是否正在提交中
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
      },
      powerSupplyTree: [], // 供电所树形数据
      gridUserOptions: [], // 网格员选项
      workOrderList: [], // 工单数据列表
      total: 0, // 工单总数
      loading: false, // 加载状态
      queryParams: {
        pageNum: 1,
        pageSize: 10
      }
    }
  },
  computed: {
    // 走访标识
    isVisit() {
      return this.planType === '4' // 只判断特殊走访
    },
    // 页面标题
    pageTitle() {
      if (this.$route.params.id) {
        return '编辑计划'
      }
      return this.planType === '4' ? '新增特殊走访计划' : '新增特殊巡视计划'
    },
    // 当前计划类型
    planType() {
      return this.$route.params.type
    },
    // 特殊计划页面不需要完整时间选项
    needFullTimeOptions() {
      return false
    }
  },
  created() {
    this.loadInitData()
  },
  methods: {
    // 初始化数据
    async loadInitData() {
      this.getFormListByType()
      this.getPowerSupplyTree()
      this.getPlanDetail()
    },
    // 获取计划详情
    async getPlanDetail() {
      if (!this.$route.params.id) return
      try {
        const { id } = this.$route.params
        const res = await asyncGetPlanDetail(id)

        if (res.code === 200 && res.data) {
          const data = res.data

          // 处理时间区间
          if (data.startTime && data.endTime) {
            data.taskTime = [new Date(data.startTime), new Date(data.endTime)]
          }

          // 处理供电所数据
          if (data.powerIdList && data.powerIdList.length > 0) {
            this.formData.powerSupply = data.powerIdList
            // 获取对应的网格员数据
            await this.fetchGridUsers([data.powerIdList])
            // 获取工单列表
            await this.getWorkOrderList()
          }

          // 处理网格员数据
          if (data.gridUsers) {
            this.formData.gridUsers = data.gridUsers
          }

          // 处理关闭时间
          if (data.closedTime) {
            data.closedTime = new Date(data.closedTime)
          }

          // 如果有告警时间列表，确保它是数组格式
          if (!data.alarmTimeList || !Array.isArray(data.alarmTimeList)) {
            data.alarmTimeList = ['']
          }

          // 设置基本信息
          this.formBasicInfo = {
            planName: data.planName,
            planDesc: data.planDesc,
            formId: data.formId
          }

          // 设置时间设置
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
        }
      } catch (error) {
        console.error('获取计划详情失败:', error)
      }
    },
    // 回到计划管理页面
    handleBack() {
      this.$tab.closeOpenPage({ path: '/plan/index', title: '计划管理' })
    },
    // 根据类型获取表单列表
    async getFormListByType() {
      try {
        const res = await asyncGetPlanOptions(this.planType)
        this.formList = res.data || []
      } catch (error) {
        console.error('获取表单列表失败:', error)
      }
    },
    // 获取供电所树形数据
    async getPowerSupplyTree() {
      try {
        // 根据是否是走访类型设置type值
        const type = this.isVisit ? '1' : '2'
        const res = await deptTreeSelect({ type })
        this.powerSupplyTree = res.data || []
      } catch (error) {
        console.error('获取供电所树形数据失败:', error)
      }
    },
    // 处理供电所选择变化
    async handlePowerSupplyChange(value) {
      if (value) {
        // 加载网格员选项
        await this.fetchGridUsers([value])
        // 立即加载工单列表
        await this.getWorkOrderList()
      } else {
        // 清空网格员选项和工单列表
        this.gridUserOptions = []
        this.formData.gridUsers = null
        this.workOrderList = []
        this.total = 0
      }
    },
    // 获取网格员数据
    async fetchGridUsers(deptIds) {
      try {
        if (!deptIds || deptIds.length === 0) {
          this.gridUserOptions = []
          return
        }

        const deptId = deptIds.join(',')
        const res = await asyncGetUserListByDept(deptId)

        if (res.code === 200) {
          this.gridUserOptions = res.data || []
        } else {
          this.$message.error(res.msg || '获取网格员列表失败')
          this.gridUserOptions = []
        }
      } catch (error) {
        console.error('获取网格员列表失败:', error)
        this.gridUserOptions = []
      }
    },
    // TreeSelect 节点格式化
    normalizer(node) {
      return {
        id: node.id,
        label: node.label,
        children: node.children
      }
    },
    // 保存方法
    async handleSubmit() {
      try {
        await this.$refs.form.validate()

        // 检查供电所和网格员是否选择
        if (!this.formData.powerSupply) {
          this.$modal.msgWarning('请选择供电所！')
          return
        }

        if (!this.formData.gridUsers) {
          this.$modal.msgWarning('请选择网格员！')
          return
        }

        // 设置提交状态
        this.formData.isSubmitting = true

        // 处理提交数据
        const submitData = {
          planName: this.formData.planName,
          planDesc: this.formData.planDesc,
          formId: this.formData.formId,
          planType: this.planType,
          powerIdList: [this.formData.powerSupply],
          gridUsers: this.formData.gridUsers,
          earlyWarning: this.formData.earlyWarning
        }

        // 新增时enabled为1，编辑时保持原值
        submitData.enabled = this.$route.params.id ? this.formData.enabled : 1

        // 任务时间段
        if (this.formData.taskTime?.length === 2) {
          submitData.taskTime = [
            dayjs(this.formData.taskTime[0]).format('YYYY-MM-DD HH:mm:ss'),
            dayjs(this.formData.taskTime[1]).format('YYYY-MM-DD HH:mm:ss')
          ]
          submitData.startTime = submitData.taskTime[0]
          submitData.endTime = submitData.taskTime[1]
        }

        // 处理关闭时间
        if (this.formData.closedTime) {
          submitData.closedTime = dayjs(this.formData.closedTime).format('YYYY-MM-DD HH:mm:ss')
        }

        // 预警相关
        if (this.formData.earlyWarning === '1') {
          submitData.alarmTimeList = this.formData.alarmTimeList.filter((time) => time !== '')
        }

        const { id } = this.$route.params
        if (id) {
          submitData.planId = id
        }

        const formData = new FormData()
        const jsonBlob = new Blob([JSON.stringify(submitData)], {
          type: 'application/json'
        })
        formData.append('dto', jsonBlob)

        // 保存数据
        if (id) {
          await asyncEditPlan(formData)
        } else {
          await asyncAddPlan(formData)
        }

        this.$modal.msgSuccess(id ? '修改成功' : '新增成功')
        this.handleBack()
      } catch (error) {
        console.error('保存失败:', error)
      } finally {
        this.formData.isSubmitting = false
      }
    },
    // 重置表单
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
        powerSupply: null,
        gridUsers: null,
        isSubmitting: false
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
      this.gridUserOptions = []
      this.workOrderList = []
      this.total = 0
      this.loadInitData()
    },
    // 处理基本信息变化
    handleBasicInfoChange(val) {
      this.formData.planName = val.planName
      this.formData.planDesc = val.planDesc
      this.formData.formId = val.formId
    },
    // 处理时间设置变化
    handleTimeSettingsChange(val) {
      Object.assign(this.formData, val)
    },
    // 获取工单数据列表
    async getWorkOrderList() {
      if (!this.formData.powerSupply) return
      this.loading = true
      try {
        const params = {
          deptIdList: this.formData.powerSupply,
          pageNum: this.queryParams.pageNum,
          pageSize: this.queryParams.pageSize
        }
        const res = this.isVisit
          ? await asyncGetVisitWorkOrderList(params)
          : await asyncGetInspectWorkOrderList(params)
        if (res.code === 200) {
          this.workOrderList = res.rows || []
          this.total = res.total || 0
        } else {
          this.$message.error(res.msg || '获取工单数据失败')
        }
      } catch (error) {
        console.error('获取工单数据失败:', error)
      } finally {
        this.loading = false
      }
    },
    // 网格员选择变化处理
    handleGridUserChange() {
      // 由于工单列表不依赖网格员，所以这里不需要重新加载工单列表
    }
  }
}
</script>