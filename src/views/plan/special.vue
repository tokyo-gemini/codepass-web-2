<template>
  <div class="app-container">
    <page-header :title="pageTitle" @back="handleBack" @submit="handleSubmit" @reset="handleReset" />
    <el-form ref="form" :model="formData" label-width="120px" inline>
      <div class="flex flex-col gap-4">
        <plan-basic-info :plan-type="planType" v-model="formBasicInfo" @input="handleBasicInfoChange" />

        <!-- 特殊走访和特殊巡视的内容 -->
        <div class="rounded bg-white shadow w-full p-4">
          <!-- 供电所与网格员选择区域 -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 ">
            <!-- 供电所选择 -->
            <el-form-item prop="powerSupply" class="w-full">
              <treeselect v-model="formData.powerSupply" :multiple="false" :options="powerSupplyTree"
                :normalizer="normalizer" :disable-branch-nodes="true" :flat="true" placeholder="请选择供电所"
                @input="handlePowerSupplyChange" class="w-full" />
            </el-form-item>

            <!-- 网格员选择 -->
            <el-form-item label="网格员" prop="gridUsers" class="w-full">
              <el-select v-model="formData.gridUsers" placeholder="请先选择供电所"
                :disabled="!formData.powerSupply || formData.isSubmitting" class="w-full">
                <el-option v-for="item in gridUserOptions" :key="item.userId" :label="item.userName"
                  :value="item.userId">
                </el-option>
              </el-select>
            </el-form-item>
          </div>

          <!-- 工单数据表格区域 -->
          <div class="border-t pt-4">
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-center">
                <span class="text-sm text-gray-500">共 {{ total }} 条数据</span>
                <el-checkbox v-model="formData.isSelectAll" :true-label="1" :false-label="0" class="ml-4"
                  @change="handleSelectAllChange">全选</el-checkbox>
                <span v-if="formData.isSelectAll === 1" class="ml-2 text-green-600 text-xs">(全部选择)</span>
                <span class="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">已选 {{ selectedCount }}
                  项</span>
              </div>
            </div>

            <el-table v-loading="loading" :data="workOrderList" border stripe size="small" style="width: 100%"
              :header-cell-style="{ background: '#f5f7fa', color: '#606266' }" row-key="customId" ref="workOrderTable"
              @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="55" :reserve-selection="true" />
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
        isSubmitting: false, // 是否正在提交中
        isSelectAll: 0, // 是否全选标识 0：否 1：是
        selectedWorkOrders: [], // 已选工单列表
        towerUserList: [] // 添加towerUserList字段用于保存给接口
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
      selectedCount: 0 // 已选工单数量
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

        // 处理 towerUserList 数据，添加 userId 和 formDataId
        if (this.formData.isSelectAll !== 1 && this.formData.towerUserList.length > 0) {
          // 为每个选中项添加网格员ID和表单ID
          this.formData.towerUserList = this.formData.towerUserList.map(item => ({
            ...item,
            userId: this.formData.gridUsers, // 添加网格员ID
            formDataId: this.formData.formId // 添加计划表单ID
          }));
        }

        // 处理提交数据
        const submitData = {
          planName: this.formBasicInfo.planName, // 从 formBasicInfo 中获取
          planDesc: this.formBasicInfo.planDesc, // 从 formBasicInfo 中获取
          formId: this.formBasicInfo.formId,     // 从 formBasicInfo 中获取
          planType: this.planType,
          powerIdList: [this.formData.powerSupply],
          gridUsers: this.formData.gridUsers,
          earlyWarning: this.formData.earlyWarning,
          isSelectAll: this.formData.isSelectAll,
          // 添加循环启用相关参数
          cycled: this.formData.cycled,
          cycledTimeType: this.formData.cycledTimeType,
          cycledTime: this.formData.cycledTime,
          // 添加到期自动关闭相关参数
          closed: this.formData.closed,
          closedTime: this.formData.closedTime,
          // 添加预警相关参数
          alarmTimeList: this.formData.alarmTimeList?.filter(time => time !== '')
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

        // 处理任务时间段
        if (this.formData.taskTime?.length === 2) {
          submitData.startTime = dayjs(this.formData.taskTime[0]).format('YYYY-MM-DD HH:mm:ss')
          submitData.endTime = dayjs(this.formData.taskTime[1]).format('YYYY-MM-DD HH:mm:ss')
        }

        // 处理到期自动关闭时间
        if (this.formData.closed === '1' && this.formData.closedTime) {
          submitData.closedTime = dayjs(this.formData.closedTime).format('YYYY-MM-DD HH:mm:ss')
        } else {
          delete submitData.closedTime
        }

        // 如果不是全选状态且有选中的工单，则传递 towerUserList
        if (this.formData.isSelectAll !== 1 && this.formData.towerUserList.length > 0) {
          submitData.towerUserList = this.formData.towerUserList;
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
        gridUsers: null,
        isSubmitting: false,
        isSelectAll: 0,
        selectedWorkOrders: [],
        towerUserList: []
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
      this.loadInitData()
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
          // 在数据加载完成后进行勾选
          this.$nextTick(() => {
            if (this.$refs.workOrderTable) {
              this.$refs.workOrderTable.clearSelection();
              if (this.formData.isSelectAll === 1) {
                this.workOrderList.forEach(row => {
                  this.$refs.workOrderTable.toggleRowSelection(row, true);
                });
                this.selectedCount = this.total;
              } else {
                this.workOrderList.forEach(row => {
                  const shouldSelect = this.formData.selectedWorkOrders.some(item => item.customId === row.customId);
                  if (shouldSelect) {
                    this.$refs.workOrderTable.toggleRowSelection(row, true);
                  }
                });
                this.selectedCount = this.formData.selectedWorkOrders.length;
              }
            }
          });
        } else {
          this.$message.error(res.msg || '获取工单数据失败')
        }
      } catch (error) {
        console.error('获取工单数据失败:', error)
      } finally {
        this.loading = false
      }
    },
    // 处理全选变化
    handleSelectAllChange(val) {
      this.formData.isSelectAll = val;
      if (val === 1) {
        // 全选时，清空已选列表，因为后端只需要 isSelectAll=1
        this.selectedCount = this.total;
        this.formData.selectedWorkOrders = [];
        this.formData.towerUserList = []; // 也清空 towerUserList
        // 选中当前页所有行
        this.workOrderList.forEach(row => {
          this.$refs.workOrderTable.toggleRowSelection(row, true);
        });
      } else {
        // 取消全选时，清空所有状态
        this.selectedCount = 0;
        this.formData.selectedWorkOrders = [];
        this.formData.towerUserList = []; // 也清空 towerUserList
        this.$refs.workOrderTable.clearSelection();
      }
    },
    // 处理选择变化
    handleSelectionChange(val) {
      if (this.formData.isSelectAll !== 1) {
        // 获取当前页面所有的 ID，用于处理当前页的取消选择
        const currentPageIds = this.workOrderList.map(item => item.customId);

        // 从已选列表中移除当前页所有记录（因为我们要用新的选择状态替换它们）
        this.formData.selectedWorkOrders = this.formData.selectedWorkOrders.filter(
          item => !currentPageIds.includes(item.customId)
        );

        // 将当前页新选中的记录添加到已选列表
        const newSelections = val.map(item => ({
          userId: item.userId,
          userName: item.userName,
          areaName: item.areaName,
          companyName: item.companyName,
          powerName: item.powerName,
          towerName: item.towerName,
          towerId: item.towerId,
          deptId: item.deptId,
          provinceName: item.provinceName,
          customId: item.customId,
          customName: item.customName
        }));

        // 合并新选中的记录到已选列表
        this.formData.selectedWorkOrders.push(...newSelections);

        // 更新选中计数
        this.selectedCount = this.formData.selectedWorkOrders.length;

        // 如果手动选择的数量小于总数，确保不是全选状态
        if (this.selectedCount < this.total) {
          this.formData.isSelectAll = 0;
        }

        // 更新 towerUserList 用于保存接口 - 复制 selectedWorkOrders 的内容
        this.formData.towerUserList = [...this.formData.selectedWorkOrders];
      }
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
      });
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
    },

  }
}
</script>