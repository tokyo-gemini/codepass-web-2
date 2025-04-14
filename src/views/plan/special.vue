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

        <!-- 特殊走访和特殊巡视的内容 -->
        <div class="rounded bg-white shadow w-full p-4">
          <!-- 供电所与网格员选择区域 -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- 供电所选择 -->
            <el-form-item prop="powerSupply" class="w-full">
              <treeselect
                v-model="formData.powerSupply"
                :multiple="false"
                :options="powerSupplyTree"
                :normalizer="normalizer"
                :disable-branch-nodes="true"
                :flat="true"
                placeholder="请选择供电所"
                @input="handlePowerSupplyChange"
                class="w-full"
              />
            </el-form-item>

            <!-- 网格员选择 -->
            <el-form-item label="网格员" prop="userId" class="w-full">
              <el-select
                v-model="formData.userId"
                placeholder="请先选择供电所"
                :disabled="!formData.powerSupply || formData.isSubmitting"
                class="w-full"
              >
                <el-option
                  v-for="item in gridUserOptions"
                  :key="item.userId"
                  :label="item.userName"
                  :value="item.userId"
                >
                </el-option>
              </el-select>
            </el-form-item>
          </div>

          <!-- 修改工单数据表格区域 -->
          <div class="border-t pt-4">
            <div class="rounded border p-4">
              <!-- 表格头部操作区 -->
              <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-4">
                  <h3 class="text-base font-medium">工单列表</h3>
                  <el-checkbox
                    v-model="formData.isSelectAll"
                    :true-label="1"
                    :false-label="0"
                    @change="handleSelectAllChange"
                  >
                    全选
                  </el-checkbox>
                  <span v-if="formData.isSelectAll === 1" class="text-green-600 text-xs">
                    (当前筛选条件下的所有数据)
                  </span>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-sm text-gray-500">已选 {{ selectedCount }} 项</span>
                  <span class="text-sm text-gray-500">共 {{ total }} 条数据</span>
                </div>
              </div>

              <!-- 全选模式下的提示信息 -->
              <div v-if="formData.isSelectAll === 1" class="bg-blue-50 p-4 rounded mb-4">
                <div class="flex items-start">
                  <i class="el-icon-info-circle text-blue-500 mt-1"></i>
                  <div class="ml-2">
                    <p class="text-blue-700">已启用全选模式</p>
                    <p class="text-sm text-blue-600">
                      当前条件下的所有数据将被包含在计划中，无需手动选择。
                    </p>
                  </div>
                </div>
              </div>

              <!-- 统一的工单表格 -->
              <el-table
                ref="workOrderTable"
                v-loading="loading"
                :data="workOrderList"
                border
                stripe
                size="small"
                @selection-change="handleSelectionChange"
                :class="{ 'opacity-60': formData.isSelectAll === 1 }"
                row-key="formDataId"
              >
                <el-table-column type="selection" width="55" :selectable="isSelectable" />
                <el-table-column prop="userName" label="网格员名称" min-width="120" />
                <el-table-column prop="areaName" label="所属供电单位" min-width="120" />
                <el-table-column prop="powerName" label="所属供电所" min-width="120" />
                <el-table-column prop="towerName" label="台区名称" min-width="120" />
              </el-table>

              <!-- 分页组件 -->
              <div class="mt-4 flex justify-end">
                <pagination
                  v-show="total > 0"
                  :total="total"
                  :page.sync="queryParams.pageNum"
                  :limit.sync="queryParams.pageSize"
                  @pagination="getWorkOrderList"
                />
              </div>
            </div>
          </div>
        </div>

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
    asyncGetPlanOptions,
    asyncGetPlanDetail,
    asyncAddPlan,
    asyncEditPlan,
    plannedManageGetUserListByDept,
    plannedManagePageToWorkOrder,
    plannedManagePageToXsWorkOrder,
    plannedManagePageToFeedbackCustom,
    plannedManagePageToTower
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
          userId: null, // 网格员选择（单值）
          isSubmitting: false, // 是否正在提交中
          isSelectAll: 0, // 是否全选标识 0：否 1：是
          selectedWorkOrders: [], // 已选工单列表
          towerUserList: [], // 添加towerUserList字段用于保存给接口
          initialPowerSupply: null // 初始供电所值，用于比较是否变更
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
        },
        selectedCount: 0, // 已选工单数量
        selectedPagination: {
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
      // 修改特殊计划页面时间选项
      needFullTimeOptions() {
        // 修改为 true，使其显示所有时间选项
        return true
      }
    },
    created() {
      this.loadInitData()
    },
    mounted() {
      // 确保表格组件已经挂载
      if (this.$refs.workOrderTable) {
        this.$refs.workOrderTable.$on('selection-change', this.handleSelectionChange)
      }
    },
    beforeDestroy() {
      // 清理事件监听
      if (this.$refs.workOrderTable) {
        this.$refs.workOrderTable.$off('selection-change', this.handleSelectionChange)
      }
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

            // 第一步：先设置所有基础数据，确保这些数据不会被后续操作覆盖
            this.setBasicData(data)

            // 第二步：设置供电所和网格员数据
            if (data.powerIdList?.length > 0) {
              this.formData.powerSupply = data.powerIdList
              // 保存初始供电所值，用于后续比较是否变更
              this.formData.initialPowerSupply = data.powerIdList
              // 获取对应的网格员数据
              await this.fetchuserId([data.powerIdList])
            }

            // 第三步：设置全选状态
            this.formData.isSelectAll = data.isSelectAll || 0

            // 最后：获取已选对象列表，这样就不会影响前面设置的数据
            if (this.formData.powerSupply) {
              // 在编辑模式下，只获取回显数据，不主动调用 XsWorkOrder
              await this.getSelectedWorkOrdersByPlanId(id)
            }
          }
        } catch (error) {
          console.error('获取计划详情失败:', error)
        }
      },

      // 新增方法：设置基础数据
      setBasicData(data) {
        // 设置基本信息
        this.formBasicInfo = {
          planName: data.planName,
          planDesc: data.planDesc,
          formId: data.formId
        }

        // 处理时间区间 - 使用深拷贝避免引用问题
        if (data.startTime && data.endTime) {
          const taskTime = [new Date(data.startTime), new Date(data.endTime)]
          // 同时保存到 timeSettings 和 formData
          this.timeSettings.taskTime = [...taskTime]
          this.formData.taskTime = [...taskTime]
          this.formData.startTime = data.startTime
          this.formData.endTime = data.endTime
        }

        // 处理关闭时间
        if (data.closedTime) {
          const closedTime = new Date(data.closedTime)
          this.timeSettings.closedTime = closedTime
          this.formData.closedTime = data.closedTime
        }

        // 如果有告警时间列表，确保它是数组格式
        const alarmTimeList = Array.isArray(data.alarmTimeList) ? data.alarmTimeList : ['']

        // 设置时间相关配置
        const timeConfig = {
          cycled: data.cycled || '0',
          cycledTime: data.cycledTime || null,
          cycledTimeType: data.cycledTimeType || null,
          cycledTimeUnit: 'day',
          taskTime: this.timeSettings.taskTime || [],
          closed: data.closed || '0',
          closedTime: this.timeSettings.closedTime || null,
          earlyWarning: data.earlyWarning || '0',
          alarmTimeList
        }

        // 同时更新 timeSettings 和 formData
        Object.assign(this.timeSettings, timeConfig)
        Object.assign(this.formData, timeConfig)

        // 设置网格员数据
        if (data.userId) {
          this.formData.userId = data.userId
        }
      },

      // 完全重写获取已选和可选工单数据的方法，确保数据完整性
      async getWorkOrderList() {
        if (!this.formData.powerSupply) return
        this.loading = true

        try {
          const params = {
            deptIdList: Array.isArray(this.formData.powerSupply)
              ? this.formData.powerSupply[0]
              : this.formData.powerSupply,
            pageNum: this.queryParams.pageNum,
            pageSize: this.queryParams.pageSize
          }

          const res = this.isVisit
            ? await plannedManagePageToWorkOrder(params)
            : await plannedManagePageToXsWorkOrder(params)

          if (res.code === 200) {
            // 设置数据
            this.workOrderList = (res.rows || []).map((item) => ({
              ...item,
              selected: '0' // 默认未选中
            }))
            this.total = res.total || 0

            // 恢复选中状态
            this.$nextTick(() => {
              if (this.formData.isSelectAll === 1) {
                return
              }

              // 清除当前选中状态
              this.$refs.workOrderTable.clearSelection()

              // 根据 towerUserList 设置选中状态
              this.formData.towerUserList.forEach((selectedItem) => {
                const row = this.workOrderList.find((r) => r.formDataId === selectedItem.formDataId)
                if (row) {
                  this.$refs.workOrderTable.toggleRowSelection(row, true)
                  row.selected = '1'
                }
              })
            })
          }
        } catch (error) {
          console.error('获取工单数据失败:', error)
        } finally {
          this.loading = false
        }
      },

      // 修改获取已选择的工单列表数据方法
      async getSelectedWorkOrdersByPlanId(planId) {
        if (!planId) return
        this.loading = true
        try {
          const params = { planId }
          const res = this.isVisit
            ? await plannedManagePageToFeedbackCustom(params)
            : await plannedManagePageToTower(params)

          if (res.code === 200) {
            // 处理数据 - 确保每个字段都有默认值
            const workOrders = (res.rows || []).map((item) => ({
              formDataId: item.formDataId,
              userId: item.userId ? String(item.userId) : null, // 确保 userId 是字符串类型
              userName: item.userName || '',
              areaName: item.areaName || '',
              companyName: item.companyName || '',
              powerName: item.powerName || '',
              towerName: item.towerName || '',
              towerId: item.towerId || '',
              deptId: item.deptId || '',
              provinceName: item.provinceName || '',
              customId: item.customId || null,
              customName: item.customName || null,
              selected: item.selected || '0' // 确保有默认值
            }))

            // 设置工单列表数据
            this.workOrderList = workOrders
            this.total = res.total || workOrders.length

            // 更新选中状态
            // 1. 获取所有 selected === '1' 的数据
            const selectedWorkOrders = workOrders.filter((item) => item.selected === '1')

            // 2. 更新 towerUserList
            this.formData.towerUserList = selectedWorkOrders
            this.selectedCount = selectedWorkOrders.length

            // 3. 回显网格员 userId - 如果数组不为空，取第一个值的 userId，并转换为数字类型以适配 select 组件
            if (workOrders.length > 0 && workOrders[0].userId) {
              this.formData.userId = Number(workOrders[0].userId)
            }

            // 打印调试信息 - 筛选前
            console.log(
              '初始化前的选中项：',
              selectedWorkOrders.map((item) => ({
                formDataId: item.formDataId,
                selected: item.selected
              }))
            )

            // 4. 在 nextTick 中更新表格选中状态
            this.$nextTick(() => {
              // 先清除所有选中状态
              this.$refs.workOrderTable?.clearSelection()

              // 遍历设置选中状态
              selectedWorkOrders.forEach((row) => {
                const tableRow = this.workOrderList.find(
                  (item) => item.formDataId === row.formDataId
                )
                if (tableRow) {
                  this.$refs.workOrderTable?.toggleRowSelection(tableRow, true)
                }
              })

              // 打印调试信息 - 完成后
              console.log('数据初始化完成:')
              console.log(
                '- 应该选中的行:',
                selectedWorkOrders.map((item) => item.formDataId)
              )
              console.log(
                '- 实际勾选的行:',
                this.$refs.workOrderTable?.selection.map((item) => item.formDataId)
              )
              console.log(
                '- towerUserList:',
                this.formData.towerUserList.map((item) => item.formDataId)
              )
              console.log('- 回显的网格员ID:', this.formData.userId)
            })
          }
        } catch (error) {
          console.error('获取已选工单数据失败:', error)
          this.$message.error('获取已选工单数据失败')
        } finally {
          this.loading = false
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
          // 修改这里：固定使用 type=2 获取第四层数据，无论是特殊走访还是特殊巡视
          const type = '2'
          const res = await deptTreeSelect({ type })
          this.powerSupplyTree = res.data || []
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },
      // 处理供电所选择变化
      async handlePowerSupplyChange(value) {
        // 以下为新增和编辑模式的逻辑
        if (value) {
          // 加载网格员选项
          await this.fetchuserId([value])
          // 如果是编辑模式，只有用户主动修改供电所时才清除已选工单和调用新接口
          if (this.$route.params.id) {
            // 检查是否与初始值不同，只有在值发生变化时才执行操作
            if (this.formData.powerSupply !== this.formData.initialPowerSupply) {
              this.formData.towerUserList = []
              this.selectedCount = 0
              this.$refs.workOrderTable?.clearSelection()
              this.$message.info('供电所已变更，请重新选择工单')
              // 只有在编辑模式下且供电所变更时才调用 XsWorkOrder 接口
              await this.getWorkOrderList()
            }
          } else {
            // 新增模式下直接加载工单列表
            await this.getWorkOrderList()
          }
        } else {
          // 清空网格员选项和工单列表
          this.gridUserOptions = []
          this.formData.userId = null
          this.workOrderList = []
          this.total = 0
          this.formData.towerUserList = []
          this.selectedCount = 0
          this.$refs.workOrderTable?.clearSelection()
        }
      },
      // 获取网格员数据
      async fetchuserId(deptIds) {
        try {
          if (!deptIds || deptIds.length === 0) {
            this.gridUserOptions = []
            return
          }
          const deptId = deptIds.join(',')
          const res = await plannedManageGetUserListByDept(deptId)
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
          if (!this.formData.powerSupply) {
            this.$modal.msgWarning('请选择供电所！')
            return
          }
          if (!this.formData.userId) {
            this.$modal.msgWarning('请选择网格员！')
            return
          }
          if (this.formData.isSelectAll === 0 && this.formData.towerUserList.length === 0) {
            this.$modal.msgWarning('请至少选择一项工单！')
            return
          }

          // 处理提交数据
          const submitData = {
            planName: this.formBasicInfo.planName, // 从 formBasicInfo 中获取
            planDesc: this.formBasicInfo.planDesc, // 从 formBasicInfo 中获取
            formId: this.formBasicInfo.formId, // 从 formBasicInfo 中获取
            planType: this.planType,
            powerIdList: Array.isArray(this.formData.powerSupply)
              ? this.formData.powerSupply
              : [this.formData.powerSupply],
            userId: this.formData.userId,
            isSelectAll: this.formData.isSelectAll,
            // 添加循环启用相关参数
            cycled: this.formData.cycled,
            cycledTimeType: this.formData.cycledTimeType,
            cycledTime: this.formData.cycledTime,
            // 添加到期自动关闭相关参数
            closed: this.formData.closed,
            closedTime: this.formData.closedTime,
            earlyWarning: this.formData.earlyWarning,
            alarmTimeList: this.formData.alarmTimeList?.filter((time) => time !== ''),
            towerUserList:
              this.formData.isSelectAll === 1
                ? []
                : this.formData.towerUserList.map((item) => ({
                    ...item,
                    userId: this.formData.userId
                  }))
          }

          // 特殊走访和特殊巡视的全选状态处理：添加 deptIdList 字段
          if (this.formData.isSelectAll === 1 && this.formData.powerSupply) {
            // 确保 powerSupply 存在且转换为数组形式
            submitData.deptIdList = Array.isArray(this.formData.powerSupply)
              ? this.formData.powerSupply
              : [this.formData.powerSupply]
          }

          // 处理循环启用参数
          if (this.formData.cycled === '1') {
            // 处理循环时间单位转换
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
              }
            }
          } else {
            // 未启用循环时，删除相关字段
            delete submitData.cycledTime
            delete submitData.cycledTimeType
          }

          // 处理任务时间段 - 修改这部分
          // 优先从 timeSettings 中获取时间，如果不存在则尝试从 formData 中获取
          if (this.timeSettings.taskTime?.length === 2) {
            submitData.startTime = dayjs(this.timeSettings.taskTime[0]).format(
              'YYYY-MM-DD HH:mm:ss'
            )
            submitData.endTime = dayjs(this.timeSettings.taskTime[1]).format('YYYY-MM-DD HH:mm:ss')
          } else if (this.formData.taskTime?.length === 2) {
            submitData.startTime = dayjs(this.formData.taskTime[0]).format('YYYY-MM-DD HH:mm:ss')
            submitData.endTime = dayjs(this.formData.taskTime[1]).format('YYYY-MM-DD HH:mm:ss')
          } else if (this.formData.startTime && this.formData.endTime) {
            // 如果有直接的 startTime 和 endTime 字符串，直接使用
            submitData.startTime = this.formData.startTime
            submitData.endTime = this.formData.endTime
          } else {
            // 如果以上都不满足，显示错误消息
            this.$modal.msgWarning('请选择任务时间区间！')
            return
          }

          // 新增时enabled为1，编辑时保持原值
          submitData.enabled = this.$route.params.id ? this.formData.enabled : 1

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
          userId: null,
          isSubmitting: false,
          isSelectAll: 0,
          selectedWorkOrders: [],
          towerUserList: [],
          initialPowerSupply: null
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
        this.selectedCount = 0
        this.selectedPagination = {
          pageNum: 1,
          pageSize: 10
        }
        this.loadInitData()
      },
      // 修改全选按钮处理方法
      handleSelectAllChange(val) {
        this.formData.isSelectAll = val
        if (val === 1) {
          // 全选时清空已选列表和表格选中状态
          this.formData.towerUserList = []
          this.$refs.workOrderTable.clearSelection()
          this.selectedCount = this.total
          this.$message.success(`已启用全选模式，将包含所有符合条件的数据`)
        } else {
          // 取消全选时重置状态
          this.selectedCount = 0
          this.$message.success('已退出全选模式，可以继续选择数据')
        }
        // 重新加载数据
        this.getWorkOrderList()
      },
      // 新增方法：判断行是否可选
      isSelectable(row) {
        return !this.formData.isSelectAll
      },
      // 修改选择变化处理方法，优化更新逻辑
      handleSelectionChange(selection) {
        if (this.formData.isSelectAll === 1) return

        // 更新工单列表中的selected状态
        this.workOrderList.forEach((item) => {
          item.selected = selection.some((row) => row.formDataId === item.formDataId) ? '1' : '0'
        })

        // 直接使用选中的行更新 towerUserList
        this.formData.towerUserList = selection.map((row) => ({
          ...row,
          userId: this.formData.userId || row.userId,
          selected: '1'
        }))

        // 更新选中计数
        this.selectedCount = selection.length

        // 打印调试信息
        console.log('选择变更后:')
        console.log(
          '当前选中行数据:',
          selection.map((row) => ({
            formDataId: row.formDataId,
            selected: row.selected
          }))
        )
        console.log(
          '更新后的 towerUserList:',
          this.formData.towerUserList.map((item) => ({
            formDataId: item.formDataId,
            selected: item.selected
          }))
        )
      },
      // 处理时间设置变化
      handleTimeSettingsChange(val) {
        // 更新表单数据中的时间相关字段
        Object.assign(this.formData, {
          cycled: val.cycled,
          cycledTime: val.cycledTime,
          cycledTimeType: val.cycledTimeType,
          cycledTimeUnit: val.cycledTimeUnit,
          taskTime: val.taskTime,
          closed: val.closed,
          closedTime: val.closedTime,
          earlyWarning: val.earlyWarning,
          alarmTimeList: val.alarmTimeList
        })
      },
      // 处理基本信息变化
      handleBasicInfoChange(val) {
        // 更新 formData 中的基本信息字段
        this.formData.planName = val.planName
        this.formData.planDesc = val.planDesc
        this.formData.formId = val.formId

        // 同时更新 formBasicInfo
        this.formBasicInfo = {
          planName: val.planName,
          planDesc: val.planDesc,
          formId: val.formId
        }
      }
    }
  }
</script>
