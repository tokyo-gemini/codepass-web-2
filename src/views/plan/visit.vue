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

        <!-- 根据planType选择不同的对象选择组件 -->
        <template v-if="isSelfReport">
          <self-report-template
            v-model="formData.towerUserList"
            :plan-type="planType"
            :customs-list="formData.customs"
            @file-change="handleFileChange"
          />
        </template>
        <template v-else>
          <div class="rounded bg-white shadow w-full p-4">
            <div class="font-bold pb-4 flex justify-between items-center">
              <div class="section-title">对象选择</div>
              <el-button type="primary" size="small" @click="openSystemDialog">
                <i class="el-icon-plus mr-1"></i>选择对象
              </el-button>
            </div>

            <!-- 显示已选对象的摘要信息 -->
            <div class="flex flex-col mb-4 border rounded p-4">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center">
                  <span class="font-medium">已选择对象:</span>
                  <span class="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                    共 {{ selectedCount }} 项
                  </span>
                  <span v-if="formData.isSelectAll === 1" class="ml-2 text-green-600 text-xs">
                    (全部选择)
                  </span>
                </div>
              </div>

              <!-- 已选对象的摘要列表 - 仅在非全选状态下显示 -->
              <el-empty
                v-if="selectedCount === 0"
                description="暂无已选对象"
                :image-size="60"
              ></el-empty>
              <div v-else-if="formData.isSelectAll === 1" class="text-gray-600">
                已全选当前筛选条件下的所有对象
              </div>

              <!-- 替换标签为表格展示 -->
              <div v-else>
                <el-table
                  :data="pagedSelectedObjects"
                  border
                  stripe
                  size="small"
                  height="250"
                  style="width: 100%"
                  :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
                >
                  <!-- 根据走访类型显示不同列 -->
                  <template v-if="isVisit">
                    <el-table-column
                      prop="customId"
                      label="客户编号"
                      min-width="150"
                    ></el-table-column>
                    <el-table-column
                      prop="customName"
                      label="客户名称"
                      min-width="200"
                    ></el-table-column>
                  </template>
                  <template v-else>
                    <el-table-column
                      prop="towerId"
                      label="台区编号"
                      min-width="150"
                    ></el-table-column>
                    <el-table-column
                      prop="towerName"
                      label="台区名称"
                      min-width="200"
                    ></el-table-column>
                  </template>
                  <el-table-column label="操作" align="center" width="80">
                    <template #default="{ row }">
                      <el-button type="text" @click="removeSelectedItem(row)">
                        <i class="el-icon-delete text-red-500"></i>
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <!-- 添加分页组件 -->
                <div class="mt-2 flex justify-end">
                  <el-pagination
                    @current-change="handleSelectedPageChange"
                    @size-change="handleSelectedSizeChange"
                    :current-page="selectedObjectsQuery.pageNum"
                    :page-size="selectedObjectsQuery.pageSize"
                    :page-sizes="[5, 10, 20]"
                    layout="total, sizes, prev, pager, next"
                    :total="selectedCount"
                  >
                  </el-pagination>
                </div>
              </div>
            </div>

            <!-- 系统内选择弹框 -->
            <el-dialog
              title="系统内对象选择"
              :visible.sync="systemDialogVisible"
              width="80%"
              :before-close="handleSystemDialogClose"
              append-to-body
            >
              <el-tabs v-model="activeTab">
                <!-- 系统内选择 tab -->
                <el-tab-pane label="系统内选择" name="system">
                  <system-select
                    v-model="tempTowerUserList"
                    :plan-type="planType"
                    :is-visit="isVisit"
                    :power-depts.sync="formData.powerSupply"
                    @update:selectedCount="(val) => (tempSelectedCount = val)"
                    @update:total="(val) => (total = val)"
                    @update:isSelectAll="(val) => (tempIsSelectAll = val)"
                    ref="multipleTable"
                  />
                </el-tab-pane>
                <!-- 上传模版-->
                <el-tab-pane label="上传模版" name="upload">
                  <!-- 添加说明信息 -->
                  <div class="bg-gray-50 p-4 mb-4 rounded text-sm text-gray-600">
                    <div class="flex items-start gap-2">
                      <i class="el-icon-info-circle text-blue-500 mt-0.5"></i>
                      <div>
                        <p class="font-medium mb-2">批量导入说明:</p>
                        <ul class="list-disc pl-4 space-y-1">
                          <li>下载模板: 获取标准格式的Excel模板文件</li>
                          <li>填写数据: 请按模板要求填写目标对象信息</li>
                          <li>上传文件: 支持.xlsx/.xls格式,大小不超过2MB</li>
                          <li>导入后可以在表格中查看和调整选择的对象</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <upload-template
                    v-model="tempTowerUserList"
                    :plan-type="planType"
                    @file-change="handleFileChange"
                    @upload-success="handleUploadSuccess"
                  />
                </el-tab-pane>
              </el-tabs>

              <!-- 系统内选择弹框底部按钮 -->
              <span slot="footer" class="dialog-footer">
                <el-button @click="systemDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmSystemSelection">确定</el-button>
              </span>
            </el-dialog>
          </div>
        </template>

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
    asyncGetAreaList,
    asyncGetPlanDetail,
    asyncGetCustomerList,
    asyncAddPlan,
    asyncEditPlan,
    asyncAddSelfPlan,
    asyncEditSelfPlan,
    selfPlannedGetDetail,
    plannedManagePageToFeedbackCustom,
    plannedManagePageToTower
  } from '@/api/plan'
  import { deptTreeSelect } from '@/api/system/user'
  import Treeselect from '@riophae/vue-treeselect'
  import PlanBasicInfo from './components/PlanBasicInfo.vue'
  import PlanTimeSettings from './components/PlanTimeSettings.vue'
  import UploadTemplate from './components/UploadTemplate.vue'
  import PageHeader from './components/PageHeader.vue'
  import SystemSelect from './components/SystemSelect.vue'
  import SelfReportTemplate from './components/SelfReportTemplate.vue'
  import '@riophae/vue-treeselect/dist/vue-treeselect.css'
  import dayjs from 'dayjs'

  export default {
    name: 'PlanVisit',
    components: {
      PageHeader,
      Treeselect,
      PlanBasicInfo,
      PlanTimeSettings,
      UploadTemplate,
      SelfReportTemplate,
      SystemSelect
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
          towerUserList: [], //台区用户入参信息集合
          isSelectAll: 0, //是否全选标识 0：否 1：是
          powerSupply: null, // 供电所选择
          towerIdList: null
        },
        // 查询参数
        queryParams: {
          pageNum: 1,
          pageSize: 10
        },
        total: 0, // 总数
        formList: [], //根据类型查询的表单列表
        customerTagTree: [],
        filter: {
          cityName: '',
          countyName: '',
          powerSupplyName: '',
          keyword: ''
        },
        towerIdListOption: [], // 台区列表
        tableData: [], // 表格数据
        powerSupplyTree: [], // 供电所树形数据
        selectedCount: 0,
        searchKeyword: '', // 添加搜索关键字
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
        activeTab: 'system', // 当前激活的标签页
        uploadFile: null, // 新增:保存上传的文件

        // 新增弹框相关状态
        systemDialogVisible: false,
        tempTowerUserList: [], // 临时存储选择的对象列表
        tempSelectedCount: 0, // 临时存储选择的对象数量
        tempIsSelectAll: 0, // 临时存储是否全选
        selectedObjectsQuery: {
          pageNum: 1,
          pageSize: 5
        },
        loading: false // 新增:加载状态
      }
    },
    computed: {
      // 走访
      isVisit() {
        return (
          this.planType === '3' ||
          this.planType === '4' ||
          this.planType === '5' ||
          this.planType === '6'
        )
      },
      pageTitle() {
        if (this.$route.params.id) {
          return '编辑计划'
        }
        if (this.isSelfReport) {
          console.log(this.planType)

          return this.planType === '5' ? '自主填报日常走访' : '自主填报特殊走访'
        }
        return '新增计划'
      },
      // 当前计划类型
      planType() {
        return this.$route.params.type
      },
      // 是否需要显示完整时间选项（循环启用和到期计划）
      needFullTimeOptions() {
        // 修改判断逻辑：自主填报走访与对应的普通走访使用相同的时间选项
        if (this.planType === '5') {
          // 自主日常走访用日常走访的时间选项
          return true // 因为普通日常走访(3)是需要完整时间选项的
        } else if (this.planType === '6') {
          // 自主特殊走访用特殊走访的时间选项
          return false // 因为普通特殊走访(4)不需要完整时间选项
        }
        // 原有的普通计划判断逻辑
        return this.planType === '1' || this.planType === '3'
      },
      // 添加自主填报判断
      isSelfReport() {
        return this.planType === '5' || this.planType === '6'
      },
      // 计算要展示的已选对象（最多10个）
      displaySelectedItems() {
        return this.formData.towerUserList.slice(0, 10)
      },
      // 计算分页后的已选对象列表
      pagedSelectedObjects() {
        if (this.formData.isSelectAll === 1) {
          return []
        }
        const start = (this.selectedObjectsQuery.pageNum - 1) * this.selectedObjectsQuery.pageSize
        const end = start + this.selectedObjectsQuery.pageSize
        return this.formData.towerUserList.slice(start, end)
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
      // 如果是编辑页面，获取计划详情
      async getPlanDetail() {
        if (!this.$route.params.id) return
        try {
          const { id } = this.$route.params
          // 根据是否是自主填报选择不同的详情接口
          const res = this.isSelfReport
            ? await selfPlannedGetDetail(id)
            : await asyncGetPlanDetail(id)
          console.log(res)

          if (res.code === 200 && res.data) {
            const data = res.data
            // 保存原始的选择列表，区分自主填报和普通计划
            const originalList = this.isSelfReport
              ? data.customs || [] // 自主填报用 customs
              : data.towerUserList || [] // 普通计划用 towerUserList

            // 处理时间区间
            if (data.startTime && data.endTime) {
              data.taskTime = [new Date(data.startTime), new Date(data.endTime)]
            }
            // 处理供电所数据
            if (data.powerIdList && data.powerIdList.length > 0) {
              data.powerSupply = data.powerIdList
              // 先等待供电所数据加载完成
              await this.handlePowerSupplyChange(data.powerIdList)
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
            // 对于自主填报，依然使用原有逻辑
            if (this.isSelfReport) {
              this.formData.customs = originalList
            } else {
              // 普通计划(日常走访/日常巡视)使用新接口获取已选对象列表
              // 保存原计划的全选状态
              this.formData.isSelectAll = data.isSelectAll || 0

              // 不再使用 towerUserList，而是通过专用接口获取已选对象列表
              await this.getSelectedObjectsByPlanId(id)
            }
          }
        } catch (error) {
          console.error('获取计划详情失败:', error)
        }
      },
      // 新增方法：根据计划ID获取已选对象列表
      async getSelectedObjectsByPlanId(planId) {
        if (!planId) return

        this.loading = true
        try {
          // 判断类型：日常走访(3)、特殊走访(4)、自主走访(5,6)使用客户接口，其余使用台区接口
          const isVisitType = ['3', '4', '5', '6'].includes(this.planType)

          // 准备查询参数
          const params = {
            planId: planId,
            deptIdList: this.formData.powerSupply.toString()
          }

          // 根据类型调用不同API
          const res = isVisitType
            ? await plannedManagePageToFeedbackCustom(params) // 走访类型
            : await plannedManagePageToTower(params) // 巡视类型

          if (res.code === 200) {
            // 如果是全选状态，只记录总数
            if (this.formData.isSelectAll === 1) {
              this.selectedCount = res.total || 0
              this.formData.towerUserList = [] // 清空列表
              this.total = res.total || 0
            } else {
              // 非全选状态，记录具体选中的对象
              const selectedObjects = res.rows || []

              // 根据不同类型设置不同的字段
              this.formData.towerUserList = selectedObjects.map((item) => {
                return {
                  userId: item.userId,
                  userName: item.userName,
                  towerId: item.towerId,
                  towerName: item.towerName,
                  areaName: item.areaName,
                  companyName: item.companyName,
                  powerName: item.powerName,
                  deptId: item.deptId,
                  provinceName: item.provinceName,
                  customId: item.customId,
                  customName: item.customName
                }
              })

              this.selectedCount = this.formData.towerUserList.length
              this.total = res.total || 0
            }

            // 如果有台区ID列表数据，设置它
            if (this.isVisit && res.data?.towerIdList) {
              this.formData.towerIdList = res.data.towerIdList
            }

            // 刷新表格选中状态
            this.$nextTick(() => {
              if (this.$refs.multipleTable) {
                this.$refs.multipleTable.refreshSelection()
              }
            })
          }
        } catch (error) {
          console.error('获取已选对象列表失败:', error)
        } finally {
          this.loading = false
        }
      },
      // Modify the handleSelectionChange method
      handleSelectionChange(val) {
        if (this.formData.isSelectAll !== 1) {
          // 更新选中计数
          this.selectedCount = this.formData.towerUserList.length
          // 处理当前页的选中状态
          const currentPageSelections = val.map((item) => ({
            userId: item.userId,
            userName: item.userName,
            towerId: item.towerId,
            towerName: item.towerName,
            areaName: item.areaName,
            companyName: item.companyName,
            powerName: item.powerName,
            deptId: item.deptId,
            provinceName: item.provinceName,
            customId: item.customId
          }))
          // 获取当前页面所有的 customId 或 towerId
          const currentPageIds = this.tableData.map((item) => ({
            towerId: item.towerId,
            userId: item.userId,
            customId: item.customId
          }))
          // 从 towerUserList 中移除当前页面的所有记录
          this.formData.towerUserList = this.formData.towerUserList.filter((item) => {
            return !currentPageIds.some(
              (pageItem) => pageItem.towerId === item.towerId && pageItem.customId === item.customId
            )
          })
          // 将当前页的选中项添加到 towerUserList
          this.formData.towerUserList.push(...currentPageSelections)
          // 更新选中计数
          this.selectedCount = this.formData.towerUserList.length
          // 如果手动取消了某些选择，更新全选状态
          if (this.selectedCount < this.total) {
            this.formData.isSelectAll = 0
          }
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
          this.formList = res.data || [] // 设置 formList 数据
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
      // 修改 getObjectTable 方法，添加勾选逻辑
      async getObjectTable(pagination) {
        if (!this.formData.powerSupply || !this.formData.powerSupply.length) {
          this.$modal.msgWarning('请先选择供电所')
          return
        }
        try {
          if (this.isVisit) {
            // 走访类型，使用客户查询接口
            const customerParams = {
              pageNum: pagination?.page || this.queryParams.pageNum,
              pageSize: pagination?.limit || this.queryParams.pageSize,
              planId: this.$route.params.id || '', // 编辑时传入planId
              userId: this.formData.powerSupply.toString(), // 修改这里：使用 userId
              towerIdList: Array.isArray(this.formData.towerIdList)
                ? this.formData.towerIdList.join(',')
                : '', // 台区ID列表
              customName: this.searchKeyword // 添加客户名称搜索
            }
            const customerRes = await asyncGetCustomerList(customerParams)
            // 更新客户表格数据
            if (customerRes.code === 200) {
              this.tableData = customerRes.rows || []
              this.total = parseInt(customerRes.total) || 0
              // 在数据加载完成后进行勾选
              this.$nextTick(() => {
                // 检查 $refs.multipleTable 是否存在，避免访问 undefined 的属性
                if (!this.$refs.multipleTable) {
                  console.warn('multipleTable ref not found, skipping selection setup')
                  return
                }

                // 清除当前页的选择
                this.$refs.multipleTable.clearSelection()
                // 根据不同状态进行勾选
                if (this.formData.isSelectAll === 1) {
                  // 全选状态，勾选当前页所有行
                  this.tableData.forEach((row) => {
                    this.$refs.multipleTable.toggleRowSelection(row, true)
                  })
                  // 维护选中计数为总数
                  this.selectedCount = this.total
                } else {
                  // 部分选中状态，根据 towerUserList 进行勾选
                  this.tableData.forEach((row) => {
                    const shouldSelect = this.formData.towerUserList.some(
                      (item) => item.customId === row.customId
                    )
                    if (shouldSelect) {
                      this.$refs.multipleTable.toggleRowSelection(row, true)
                    }
                  })
                  // 维护选中计数为 towerUserList 的长度
                  this.selectedCount = this.formData.towerUserList.length
                }
              })
            }
          } else {
            // 巡检类型
            const params = {
              pageNum: pagination?.page || this.queryParams.pageNum,
              pageSize: pagination?.limit || this.queryParams.pageSize,
              deptIdList: this.formData.powerSupply.toString(),
              planId: this.$route.params.id || '',
              towerName: this.searchKeyword
            }
            const res = await asyncGetAreaList(params)
            if (res.code === 200) {
              this.tableData = res.rows || []
              this.total = parseInt(res.total) || 0
              // 在数据加载完成后进行勾选
              this.$nextTick(() => {
                // 检查 $refs.multipleTable 是否存在，避免访问 undefined 的属性
                if (!this.$refs.multipleTable) {
                  console.warn('multipleTable ref not found, skipping selection setup')
                  return
                }

                // 清除当前页的选择
                this.$refs.multipleTable.clearSelection()
                // 根据不同状态进行勾选
                if (this.formData.isSelectAll === 1) {
                  // 全选状态，勾选当前页所有行
                  this.tableData.forEach((row) => {
                    this.$refs.multipleTable.toggleRowSelection(row, true)
                  })
                  // 维护选中计数为总数
                  this.selectedCount = this.total
                } else {
                  // 部分选中状态，根据 towerUserList 进行勾选
                  this.tableData.forEach((row) => {
                    const shouldSelect = this.formData.towerUserList.some(
                      (item) => item.towerId === row.towerId
                    )
                    if (shouldSelect) {
                      this.$refs.multipleTable.toggleRowSelection(row, true)
                    }
                  })
                  // 维护选中计数为 towerUserList 的长度
                  this.selectedCount = this.formData.towerUserList.length
                }
              })
            }
          }
        } catch (error) {
          console.error('获取列表数据失败:', error)
          // this.$modal.msgError('获取列表数据失败');
        }
      },
      // 处理供电所选择变化
      async handlePowerSupplyChange(value) {
        if (value && value.length > 0) {
          // 重置分页参数
          this.queryParams.pageNum = 1
          this.searchKeyword = '' // 清空搜索关键字
          if (this.isVisit) {
            // 获取台区列表数据用于treeselect
            const areaParams = {
              pageNum: 1,
              pageSize: 9999,
              userId: value.toString() // 修改这里：走访类型使用userId
            }
            const areaRes = await asyncGetAreaList(areaParams)
            if (areaRes.code === 200) {
              // 处理台区数据
              const seen = new Set()
              this.towerIdListOption = (areaRes.rows || [])
                .filter((item) => {
                  if (!item || !item.towerId || seen.has(item.towerId)) return false
                  seen.add(item.towerId)
                  return true
                })
                .map((item) => ({
                  id: item.towerId,
                  label: item.towerName,
                  isDisabled: false,
                  isLeaf: true
                }))
            }
          }
          this.getObjectTable()
        } else {
          this.tableData = []
          this.towerIdListOption = []
          this.total = 0
        }
      },
      // 处理台区选择变化
      handleTowerChange(value) {
        if (this.isVisit && this.formData.powerSupply) {
          this.queryParams.pageNum = 1
          this.searchKeyword = '' // 清空搜索关键字
          this.formData.towerIdList = value || [] // 确保value为数组
          // 只查询客户列表
          this.getObjectTable()
        }
      },
      // 添加保存方法
      async handleSubmit() {
        try {
          await this.$refs.form.validate()

          // 修改验证逻辑: 如果是系统内选择且没有选中对象,或者是上传模板但没有文件
          if (
            this.activeTab === 'system' &&
            !this.formData.isSelectAll &&
            !this.formData.towerUserList?.length
          ) {
            if (!this.isSelfReport) {
              this.$modal.msgWarning('请至少勾选一个台区或切换到上传模版进行导入！')
              return
            }
          }

          if (this.activeTab === 'upload' && !this.uploadFile) {
            this.$modal.msgWarning('请选择要上传的文件！')
            return
          }

          // 处理提交数据
          const submitData = {
            ...Object.fromEntries(
              Object.entries(this.formData).filter(([key, value]) => value !== null)
            ),
            powerIdList: this.formData.powerSupply, // 确保添加 powerIdList
            planType: this.planType // 明确添加 planType
          }

          // 如果是上传模版，强制设置isSelectAll为0
          if (this.activeTab === 'upload') {
            submitData.isSelectAll = '0'
          } else {
            submitData.isSelectAll = this.formData.isSelectAll
            submitData.powerIdList = this.formData.powerSupply // 再次确保添加
          }

          // 新增的话enabled 为1,否则根据原来的值
          submitData.enabled = this.$route.params.id ? submitData.enabled : 1

          // 处理时间相关字段
          if (this.needFullTimeOptions) {
            submitData.cycled = this.formData.cycled
            if (this.formData.cycled === '1') {
              // 1. 设置循环类型
              submitData.cycledTimeType = this.formData.cycledTimeType

              // 2. 处理循环时间
              if (this.formData.cycledTimeType === 'D') {
                // 自定义时间，需要转换单位
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
                // 预设选项，直接使用已设置的值
                submitData.cycledTime = this.formData.cycledTime
              }
            }
          }

          // 任务时间段
          if (this.formData.taskTime?.length === 2) {
            // 使用 dayjs 格式化日期
            submitData.taskTime = [
              dayjs(this.formData.taskTime[0]).format('YYYY-MM-DD HH:mm:ss'),
              dayjs(this.formData.taskTime[1]).format('YYYY-MM-DD HH:mm:ss')
            ]
            submitData.startTime = submitData.taskTime[0]
            submitData.endTime = submitData.taskTime[1]
          }

          // 处理 closedTime
          if (this.formData.closedTime) {
            submitData.closedTime = dayjs(this.formData.closedTime).format('YYYY-MM-DD HH:mm:ss')
          }

          // 预警相关
          submitData.earlyWarning = this.formData.earlyWarning
          // 只有在预警启用为"是"时才添加告警时间列表
          if (this.formData.earlyWarning === '1') {
            // 过滤掉空值
            submitData.alarmTimeList = this.formData.alarmTimeList.filter((time) => time !== '')
          } else {
            delete submitData.alarmTimeList
          }

          // 对象选择相关
          // 如果是上传模版，强制设置isSelectAll为0
          if (this.activeTab === 'upload') {
            submitData.isSelectAll = '0'
          } else {
            submitData.isSelectAll = this.formData.isSelectAll
          }

          if (this.formData.powerSupply?.length) {
            submitData.powerIdList = this.formData.powerSupply
          }

          // 根据不同类型设置不同的选择字段
          if (this.isVisit) {
            if (this.formData.towerUserList?.length) {
              submitData.towerUserList = this.formData.towerUserList
            }
          } else if (this.formData.towerIdList?.length) {
            submitData.towerUserList = this.formData.towerUserList
          }

          // 处理自主填报的选择列表
          if (this.isSelfReport) {
            // 合并两个表格数据并去重
            const combined = [
              ...(this.formData.customs || []),
              ...(this.formData.towerUserList || [])
            ]
            const uniqueMap = {}
            const deduplicated = []
            for (const item of combined) {
              const key = `${item.tgNo || ''}-${item.consNo || ''}-${item.gridNo || ''}`
              if (!uniqueMap[key]) {
                uniqueMap[key] = true
                deduplicated.push(item)
              }
            }
            submitData.customs = deduplicated
            submitData.isSelectAll = 0
            delete submitData.towerUserList
          }

          // 编辑时需要添加planId
          const { id } = this.$route.params
          const formData = new FormData()
          const jsonBlob = new Blob([JSON.stringify(submitData)], {
            type: 'application/json'
          })
          formData.append('dto', jsonBlob)

          if (this.uploadFile) {
            formData.append('file', this.uploadFile)
          }

          // 根据是否是自主填报使用不同的接口
          if (this.isSelfReport) {
            if (id) {
              await asyncEditSelfPlan(formData)
            } else {
              await asyncAddSelfPlan(formData)
            }
          } else {
            if (id) {
              await asyncEditPlan(formData)
            } else {
              await asyncAddPlan(formData)
            }
          }

          this.$modal.msgSuccess(id ? '修改成功' : '新增成功')
          this.handleBack()
        } catch (error) {
          console.error('保存失败:', error)
          // this.$modal.msgError(error.msg || '保存失败');
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
          towerUserList: [],
          isSelectAll: 0,
          powerSupply: null,
          towerIdList: null
        }
        this.selectedCount = 0
        this.tableData = []
        this.searchKeyword = ''
        this.queryParams.pageNum = 1
        this.queryParams.pageSize = 10
        this.activeTab = 'system'
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
      // 添加新的上传成功处理方法
      handleUploadSuccess() {
        // 清空系统内选择的数据
        this.selectedCount = 0
        this.formData.towerUserList = []
      },
      // 处理文件变化
      handleFileChange(file) {
        this.uploadFile = file
      },
      // 打开系统内选择弹框
      openSystemDialog() {
        this.systemDialogVisible = true
        // 初始化临时数据
        this.tempTowerUserList = [...this.formData.towerUserList]
        this.tempSelectedCount = this.selectedCount
        this.tempIsSelectAll = this.formData.isSelectAll

        this.$nextTick(() => {
          // 检查 $refs.multipleTable 是否存在，避免访问 undefined 的属性
          if (this.$refs.multipleTable) {
            // 通知SystemSelect组件刷新选择状态
            this.$refs.multipleTable.refreshSelection()
          }
        })
      },

      // 处理系统内选择弹框关闭
      handleSystemDialogClose(done) {
        this.$confirm('确认关闭？未保存的选择将会丢失')
          .then(() => {
            done()
          })
          .catch(() => {})
      },

      // 确认系统内选择
      confirmSystemSelection() {
        // 更新主数据
        this.formData.towerUserList = [...this.tempTowerUserList]
        this.selectedCount = this.tempIsSelectAll === 1 ? this.total : this.tempSelectedCount
        this.formData.isSelectAll = this.tempIsSelectAll

        // 关闭弹窗
        this.systemDialogVisible = false

        // 如果是全选，在UI上显示"全部选择"
        if (this.tempIsSelectAll === 1) {
          this.$nextTick(() => {
            this.$message.success(`已全选${this.total}项对象`)
          })
        }
      },

      // 移除已选对象
      removeSelectedItem(item) {
        const index = this.formData.towerUserList.findIndex((i) => {
          if (this.isVisit) {
            return i.customId === item.customId
          }
          return i.towerId === item.towerId
        })

        if (index !== -1) {
          this.formData.towerUserList.splice(index, 1)
          this.selectedCount -= 1

          // 如果有选项被移除，那么就不再是全选状态
          if (this.formData.isSelectAll === 1) {
            this.formData.isSelectAll = 0
          }
        }
      },

      // 计算显示的标签名称
      displayTagName(item) {
        if (this.isVisit) {
          return item.consName || item.userName || item.customId || '未命名用户'
        }
        return item.towerName || '未命名台区'
      },
      // 处理已选对象分页变化
      handleSelectedPageChange(page) {
        this.selectedObjectsQuery.pageNum = page
      },

      // 处理已选对象每页数量变化
      handleSelectedSizeChange(size) {
        this.selectedObjectsQuery.pageSize = size
        this.selectedObjectsQuery.pageNum = 1
      }
    }
  }
</script>
