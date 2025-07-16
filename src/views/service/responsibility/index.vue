<template>
  <div class="app-container">
    <el-tabs v-model="queryParams.type" @tab-click="handleTypeChange">
      <el-tab-pane label="公司领导" name="9"></el-tab-pane>
      <el-tab-pane label="公司专业部门" name="10"></el-tab-pane>
      <el-tab-pane label="供电单位领导" name="11"></el-tab-pane>
      <el-tab-pane label="县级部门" name="12"></el-tab-pane>
      <el-tab-pane label="班站所负责人" name="13"></el-tab-pane>
    </el-tabs>

    <template>
      <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="100px">
        <!-- 公共筛选项 -->
        <!-- 所属供电所 - 独占一行 -->
        <div class="w-full mb-4">
          <el-form-item label="所属供电所" prop="powerId">
            <treeselect v-model="selectedPowerId" :options="powerSupplyOptions" :normalizer="normalizer"
              :clearable="true" :searchable="true" :disable-branch-nodes="true" :default-expand-level="0"
              :disable-fuzzy-matching="true" :multiple="false" :flat="false" :always-show-clear="true"
              :append-to-body="true" :close-on-select="true" :show-count="true" placeholder="请选择所属供电所" class="w-full"
              @input="handlePowerIdChange" />
          </el-form-item>
        </div>

        <el-form-item label="履责日期" prop="dispatchTimeRange">
          <el-date-picker v-model="dispatchTimeRange" type="daterange" range-separator="至" start-placeholder="开始日期"
            end-placeholder="结束日期" value-format="yyyy-MM-dd" @change="handleDispatchTimeRangeChange"></el-date-picker>
        </el-form-item>



        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格顶部操作区 -->
      <div class="mb-4 w-full flex justify-end items-center">
        <el-button type="text" icon="el-icon-setting" @click="showColumnSettings">列设置</el-button>
        <!-- <el-button type="primary" plain icon="el-icon-download" @click="handleExport"
          v-hasPermi="['system:user:export']">导出</el-button> -->
      </div>

      <el-row :gutter="10" class="mb-8">
        <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <!-- 表格数据 -->
      <el-table v-loading="loading" :data="visitList" border :empty-text="emptyText">
        <el-table-column label="表单编号" align="center" prop="formDataId" />
        <el-table-column label="履责类型" align="center" prop="formType">
          <template slot-scope="scope">
            {{ getFormTypeLabel(scope.row.formType) }}
          </template>
        </el-table-column>
        <el-table-column label="供电站所" align="center" prop="powerName" />
        <el-table-column label="提交时间" align="center" prop="submitTime" width="180" />
        <el-table-column label="提交人" align="center" prop="userName" />

        <!-- 动态列 -->
        <el-table-column v-for="col in dynamicColumns.filter((col) => col.visible)" :key="col.prop" align="center"
          class-name="dynamic-column" :width="getColumnWidth(col.prop, col.label)">
          <template slot="header">
            <span>{{ col.label }}</span>
          </template>
          <template slot-scope="scope">
            <span v-if="scope.row.formWidgetList">
              {{ getFieldValue(scope.row.formWidgetList, col.prop) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 操作列已移除 -->
      </el-table>

      <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
        @pagination="getList" />

      <!-- 详情弹窗已移除 -->
      <!--
      <el-dialog title="详情查看" :visible.sync="detailVisible" width="80%" append-to-body>
        <div v-if="detailInfo.jsonData">
          <pre>{{ JSON.stringify(JSON.parse(detailInfo.jsonData || '{}'), null, 2) }}</pre>
        </div>
        <div v-else>
          <el-empty description="暂无详情数据"></el-empty>
        </div>
      </el-dialog>
      -->

      <!-- 列设置弹窗 -->
      <el-dialog title="列设置" :visible.sync="columnSettingsVisible" width="500px" append-to-body
        custom-class="column-settings-dialog">
        <div class="column-settings-content">
          <div class="search-section">
            <el-input v-model="columnSearchKeyword" placeholder="搜索列名" prefix-icon="el-icon-search" clearable
              class="search-input" />
            <div class="action-buttons">
              <el-button type="text" @click="selectAllColumns">全选</el-button>
              <el-button type="text" @click="unselectAllColumns">取消全选</el-button>
            </div>
          </div>

          <el-checkbox-group v-model="selectedColumns" class="column-list">
            <el-checkbox v-for="column in filteredDynamicColumns" :key="column.prop" :label="column.prop"
              class="column-item">
              {{ column.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <div slot="footer" class="dialog-footer">
          <el-button @click="columnSettingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveColumnSettings">确定</el-button>
        </div>
      </el-dialog>
    </template>
  </div>
</template>

<script>
import { deptTreeSelect } from '@/api/system/user'
import {
  asyncGetVisitList,
  asyncGetDetail,
  asyncGetServiceInfo,
  asyncGetFormControls
} from '@/api/synthesize'
import Treeselect from '@riophae/vue-treeselect'
import '@riophae/vue-treeselect/dist/vue-treeselect.css'
import request, { exportFile } from '@/utils/request'
import RightToolbar from '@/components/RightToolbar'
import Pagination from '@/components/Pagination'

export default {
  name: 'ServiceResponsibility',
  dicts: ['form_type_option'],
  components: {
    Treeselect,
    RightToolbar,
    Pagination
  },
  data() {
    return {
      // 遮罩层
      loading: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 走访列表数据
      visitList: [],
      // 站所选项
      powerSupplyOptions: [],
      // 添加TreeSelect使用的选中值
      selectedPowerId: null,
      // 查询参数
      queryParams: {
        type: '9', // 默认公司领导
        formId: '', // 表单ID，从服务履责接口获取
        formType: '', // 表单类型，从服务履责接口获取
        cityId: '',
        companyId: '',
        powerId: null,
        dispatchStartTime: '',
        dispatchEndTime: '',
        tagIdList: [],
        formDataId: '',
        statusDatald: '',
        statusTypeId: '',
        formStatus: '',
        busiTypeId: '',
        oneTypeId: '',
        twoTypeId: '',
        threeTypeId: '',
        pageNum: 1,
        pageSize: 10
      },
      dispatchTimeRange: [], // 用于日期范围选择
      emptyText: '暂无数据', // 空数据提示文本
      // detailVisible: false, // 详情弹窗显示状态（已移除）
      // detailInfo: {}, // 详情数据（已移除）
      baseURL: process.env.VUE_APP_BASE_API, // 添加基础URL
      // 动态列配置
      dynamicColumns: [],
      selectedColumns: [],
      columnSettingsVisible: false, // 列设置弹窗显示状态
      columnSearchKeyword: '' // 列搜索关键字
    }
  },
  async created() {
    // 1. 获取站所数据
    await this.getPowerSupplyOptions()
    // 2. 获取服务履责数据（会自动调用getFormControls）
    await this.getServiceInfo()
    // 3. 获取列表数据
    await this.getList()
  },
  computed: {
    // 过滤后的动态列
    filteredDynamicColumns() {
      if (!this.columnSearchKeyword) return this.dynamicColumns
      const keyword = this.columnSearchKeyword.toLowerCase()
      return this.dynamicColumns.filter((column) => column.label.toLowerCase().includes(keyword))
    }
  },
  methods: {
    /** 获取站所数据 */
    async getPowerSupplyOptions() {
      try {
        const res = await deptTreeSelect()
        this.powerSupplyOptions = res.data
      } catch (error) {
        console.error('获取站所数据失败', error)
      }
    },
    /** 获取服务履责数据 */
    async getServiceInfo() {
      try {
        const res = await asyncGetServiceInfo(this.queryParams.type)
        console.log('服务履责数据:', res.data)

        // 如果返回了数据数组且有内容，取第一个元素的id和formType
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          this.queryParams.formId = res.data[0].id
          this.queryParams.formType = res.data[0].formType
          await this.getFormControls()
        }
      } catch (error) {
        console.error('获取服务履责数据失败:', error)
      }
    },

    /** 获取表单控件配置 */
    async getFormControls() {
      try {
        if (!this.queryParams.formId) return

        const res = await asyncGetFormControls(this.queryParams.formId)
        if (res.data?.length) {
          // 初始化动态列配置
          this.dynamicColumns = res.data.map((item) => ({
            prop: item.prop,
            label: item.label,
            visible: true // 默认显示所有列
          }))

          // 初始化选中列
          this.selectedColumns = this.dynamicColumns.map((col) => col.prop)

          // 尝试恢复上次的列显示设置
          this.restoreColumnSettings()

          console.log('表单控件配置已更新，formId:', this.queryParams.formId)
        } else {
          console.log('未获取到表单控件配置')
          this.dynamicColumns = []
          this.selectedColumns = []
        }
      } catch (error) {
        console.error('获取表单控件配置失败:', error)
        this.dynamicColumns = []
        this.selectedColumns = []
      }
    },

    /** 查询走访列表 */
    async getList() {
      this.loading = true
      try {
        // 为服务履责页面固定设置type为'fwlz'，并包含formType
        const params = {
          ...this.queryParams,
          type: 'fwlz',
          formType: this.queryParams.formType
        }
        const response = await asyncGetVisitList(params)
        // 确保每行数据都有 formWidgetList 字段
        this.visitList = response.rows.map((row) => {
          // 如果 formWidgetList 不是数组，初始化为空数组
          if (!row.formWidgetList || !Array.isArray(row.formWidgetList)) {
            row.formWidgetList = []
          }
          return row
        })

        this.total = response.total
      } catch (error) {
        console.error('获取列表数据失败:', error)
        this.$message.error('获取列表数据失败')
        this.visitList = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    /** 处理查询类型变化 */
    async handleTypeChange() {
      // 切换类型时显示加载提示
      this.emptyText = '加载中...'

      // 获取服务履责数据（会自动调用getFormControls）
      await this.getServiceInfo()

      // 重新获取列表数据
      await this.getList()

      // 更新页面标题显示
      document.title = this.getTabTypeLabel(this.queryParams.type) || '服务履责'
    },

    /** 处理日期范围变化 */
    handleDispatchTimeRangeChange(val) {
      if (val) {
        this.queryParams.dispatchStartTime = val[0]
        this.queryParams.dispatchEndTime = val[1]
      } else {
        this.queryParams.dispatchStartTime = ''
        this.queryParams.dispatchEndTime = ''
      }
    },
    /** 处理供电所选择变化 */
    handlePowerIdChange(value) {
      if (!value) {
        // 当清除选择时
        this.queryParams.powerId = null
        return
      }

      // 查找选中节点的原始ID
      const findOriginalId = (nodes, id) => {
        for (const node of nodes) {
          if (node.id === id) {
            return node.originalId
          }
          if (node.children && node.children.length) {
            const result = findOriginalId(node.children, id)
            if (result) return result
          }
        }
        return null
      }

      // 将唯一ID转换为原始ID，确保是单个值
      const originalId = findOriginalId(this.powerSupplyOptions, value)
      if (originalId) {
        // 确保传递的是单个值，不是数组
        this.queryParams.powerId = Array.isArray(originalId) ? originalId[0] : originalId
        console.log('已将供电所ID转换为原始ID:', this.queryParams.powerId)
      } else {
        console.warn('未找到对应的原始ID:', value)
        // 确保传递的是单个值，不是数组
        this.queryParams.powerId = Array.isArray(value) ? value[0] : value
      }
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.dispatchTimeRange = []
      // 保持查询类型不变
      const type = this.queryParams.type
      // 保存formId和formType
      const { formId, formType } = this.queryParams
      this.resetForm('queryForm')
      this.queryParams = {
        ...this.queryParams,
        type,
        formId, // 保留formId
        formType, // 保留formType
        powerId: null,
        dispatchStartTime: '',
        dispatchEndTime: '',
        tagIdList: [],
        formDataId: '',
        statusDatald: '',
        statusTypeId: '',
        formStatus: '',
        busiTypeId: '',
        oneTypeId: '',
        twoTypeId: '',
        threeTypeId: '',
        pageNum: 1,
        pageSize: 10
      }

      // 重置TreeSelect选中值
      this.selectedPowerId = null

      this.emptyText = '暂无数据'
      this.handleQuery()
    },
    /** 导出按钮操作 */
    async handleExport() {
      try {
        this.$message.info('正在导出，请稍候...')
        // 使用与综合查询相同的导出接口，只是传递不同的参数
        const res = await request({
          url: '/search/export/page',
          method: 'get',
          params: this.queryParams,
          responseType: 'blob'
        })
        exportFile(res, '服务履责数据.xlsx')
      } catch (error) {
        console.error('导出失败', error)
        this.$message.error('导出失败')
      }
    },

    /** 显示列设置弹窗 */
    showColumnSettings() {
      this.columnSettingsVisible = true
      // 初始化选中状态
      this.selectedColumns = this.dynamicColumns
        .filter((col) => col.visible)
        .map((col) => col.prop)
    },

    /** 全选列 */
    selectAllColumns() {
      this.selectedColumns = this.dynamicColumns.map((col) => col.prop)
    },

    /** 取消全选列 */
    unselectAllColumns() {
      this.selectedColumns = []
    },

    /** 保存列设置 */
    saveColumnSettings() {
      // 更新列的可见性
      this.dynamicColumns = this.dynamicColumns.map((col) => ({
        ...col,
        visible: this.selectedColumns.includes(col.prop)
      }))

      // 保存设置到本地存储
      this.saveColumnSettingsToStorage()
      this.columnSettingsVisible = false

      // 强制重新渲染表格
      this.$nextTick(() => {
        setTimeout(() => {
          this.loading = false
        }, 100)
      })
    },

    /** 保存列设置到本地存储 */
    saveColumnSettingsToStorage() {
      const settings = {
        formId: this.queryParams.formId,
        columns: this.dynamicColumns.map((col) => ({
          prop: col.prop,
          visible: col.visible
        }))
      }
      localStorage.setItem('serviceResponsibilityColumnSettings', JSON.stringify(settings))
    },

    /** 从本地存储恢复列设置 */
    restoreColumnSettings() {
      try {
        const settings = JSON.parse(localStorage.getItem('serviceResponsibilityColumnSettings'))
        if (settings?.formId === this.queryParams.formId) {
          this.dynamicColumns.forEach((col) => {
            const saved = settings.columns.find((s) => s.prop === col.prop)
            if (saved) {
              col.visible = saved.visible
            }
          })
        }
      } catch (error) {
        console.error('恢复列设置失败:', error)
      }
    },

    /** 获取列宽度 */
    getColumnWidth(prop, label) {
      // 根据字段类型设置宽度
      if (prop.includes('time') || prop.includes('Time') || prop.includes('date') || prop.includes('Date')) {
        return 180
      }
      if (prop.includes('phone') || prop.includes('Phone') || prop.includes('mobile') || prop.includes('Mobile')) {
        return 120
      }
      if (prop.includes('name') || prop.includes('Name')) {
        return 100
      }
      // 根据标签长度动态计算
      const labelLength = label ? label.length : 4
      return Math.max(80, Math.min(200, labelLength * 15 + 40))
    },

    /** 获取字段值 */
    getFieldValue(formWidgetList, prop) {
      if (!formWidgetList || !Array.isArray(formWidgetList)) return '-'
      const widget = formWidgetList.find(item => item.prop === prop)
      return widget ? (widget.value || '-') : '-'
    },

    /** 获取类型对应的标签文本
     * @param {string} type - 类型值
     * @param {boolean} [withPrefix=false] - 是否带前缀
     */
    getTypeLabel(type, withPrefix = false) {
      const typeLabels = {
        '9': '公司领导',
        '10': '公司专业部门',
        '11': '供电单位领导',
        '12': '县级部门',
        '13': '班站所负责人'
      }
      const baseLabel = typeLabels[String(type)] || type
      return withPrefix ? `服务履责-${baseLabel}` : baseLabel
    },

    // 替换原有的 getTabTypeLabel，改为调用统一方法
    getTabTypeLabel(type) {
      return this.getTypeLabel(type, true)
    },

    // 替换原有的 getFormTypeLabel，改为调用统一方法
    getFormTypeLabel(type) {
      return this.getTypeLabel(type)
    },

    /** 树形数据转换 */
    normalizer(node) {
      return {
        id: node.id,
        label: node.label,
        children: node.children
      }
    }
  }
}
</script>

<style scoped>
.column-settings-content {
  max-height: 400px;
}

.search-section {
  margin-bottom: 16px;
}

.search-input {
  margin-bottom: 12px;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.column-item {
  margin-bottom: 8px;
  margin-right: 0;
}

.dynamic-column {
  background-color: #f8f9fa;
}

/* 列设置弹窗样式 */
::v-deep .column-settings-dialog .el-dialog__body {
  padding: 20px;
}

::v-deep .column-settings-dialog .el-checkbox-group {
  display: flex;
  flex-direction: column;
}

::v-deep .column-settings-dialog .el-checkbox {
  margin-right: 0;
  margin-bottom: 8px;
}
</style>