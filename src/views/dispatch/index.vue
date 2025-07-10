<template>
  <div class="dispatch-container">
    <!-- 页面标题和描述 -->
    <div class="page-header">
      <h2 class="page-title">派单策略</h2>
      <p class="page-description">
        可以开启并启用派单策略，来提升工单派发后的客户配置的自动化派单情况。
      </p>

    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <!-- 供电所筛选 -->
        <el-form-item label="供电所">
          <custom-tree-select
            v-model="searchForm.powerSupply"
            :options="powerSupplyTree"
            :multiple="true"
            :single-select="true"
            :check-strictly="true"
            :user-dept-id="deptId"
            :user-dept-id-length="deptId.toString().length"
          />
        </el-form-item>
        <!-- 状态筛选 -->
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="全部" value=""></el-option>
            <el-option label="启用" value="1"></el-option>
            <el-option label="禁用" value="0"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作按钮 -->
    <div class="batch-actions">
      <el-button
        type="primary"
        icon="el-icon-plus"
        @click="handleAdd"
      >
        新增策略
      </el-button>
      <el-button
        type="success"
        icon="el-icon-check"
        :disabled="selectedRows.length === 0"
        @click="handleBatchEnable"
      >
        批量启用
      </el-button>
      <el-button
        type="danger"
        icon="el-icon-close"
        :disabled="selectedRows.length === 0"
        @click="handleBatchDisable"
      >
        批量禁用
      </el-button>
    </div>

    <!-- 数据表格区域 -->
    <div class="table-section">
      <el-table
        ref="dispatchTable"
        :data="tableData"
        :loading="tableLoading"
        border
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="55"
          align="center"
        />
        <el-table-column
          prop="tradeCode"
          label="工单来源"
          min-width="120"
          show-overflow-tooltip
        >
          <template slot-scope="scope">
            <el-tag size="medium" type="primary">{{ scope.row.tradeCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="workOrderType"
          label="创建工单计划类型"
          min-width="150"
          show-overflow-tooltip
        >
          <template slot-scope="scope">
            <el-tag
              size="medium"
              :type="scope.row.workOrderType === '特殊走访' ? 'success' : 'warning'"
            >
              {{ scope.row.workOrderType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="branchType"
          label="关联表单"
          min-width="120"
          show-overflow-tooltip
        >
          <template slot-scope="scope">
            <el-tag
              size="medium"
              :type="scope.row.branchType === '特殊走访' ? 'success' : 'warning'"
            >
              {{ scope.row.branchType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="100"
          align="center"
        >
          <template slot-scope="scope">
            <el-switch
              v-model="scope.row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          align="center"
        >
          <template slot-scope="scope">
            <el-button
              type="text"
              size="small"
              @click="handleEdit(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              type="text"
              size="small"
              @click="handleView(scope.row)"
            >
              查看
            </el-button>
            <el-button
              type="text"
              size="small"
              @click="handleCopy(scope.row)"
            >
              复制
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="tableTotal > 0"
        :total="tableTotal"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getTableData"
      />
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      :visible.sync="dialogVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="dialog-content">
        <!-- 基本信息标题 -->
        <div class="section-title">
          <span class="title-text">基本信息</span>
        </div>
        <div class="section-description">
          可以设置文档基本信息以及各类生成工单的基本信息
        </div>

        <el-form ref="form" :model="form" :rules="rules" label-width="120px" class="form-container">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="策略名称" prop="strategyName">
                <el-input
                  v-model="form.strategyName"
                  :disabled="dialogType === 'view'"
                  placeholder="请输入策略名称"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="策略类型" prop="strategyType">
                <el-select
                  v-model="form.strategyType"
                  :disabled="dialogType === 'view'"
                  placeholder="请选择策略类型"
                  style="width: 100%"
                >
                  <el-option label="自动派单" value="auto_dispatch" />
                  <el-option label="手动派单" value="manual_dispatch" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="工单来源" prop="tradeCode">
                <el-input
                  v-model="form.tradeCode"
                  :disabled="dialogType === 'view'"
                  placeholder="请输入工单来源"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="优先级" prop="priority">
                <el-select
                  v-model="form.priority"
                  :disabled="dialogType === 'view'"
                  placeholder="请选择优先级"
                  style="width: 100%"
                >
                  <el-option label="高" value="high" />
                  <el-option label="中" value="medium" />
                  <el-option label="低" value="low" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="创建工单计划类型" prop="workOrderType">
                <el-select
                  v-model="form.workOrderType"
                  :disabled="dialogType === 'view'"
                  placeholder="请选择创建工单计划类型"
                  style="width: 100%"
                >
                  <el-option label="特殊走访" value="特殊走访" />
                  <el-option label="特殊巡视" value="特殊巡视" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="关联表单" prop="branchType">
                <el-select
                  v-model="form.branchType"
                  :disabled="dialogType === 'view'"
                  placeholder="请选择关联表单"
                  style="width: 100%"
                >
                  <el-option label="特殊走访" value="特殊走访" />
                  <el-option label="特殊巡视" value="特殊巡视" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="状态" prop="status">
                <el-switch
                  v-model="form.status"
                  :active-value="1"
                  :inactive-value="0"
                  active-text="启用"
                  inactive-text="禁用"
                  :disabled="dialogType === 'view'"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="执行时间" prop="executeTime">
                <el-time-picker
                  v-model="form.executeTime"
                  :disabled="dialogType === 'view'"
                  placeholder="请选择执行时间"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="策略描述" prop="description">
                <el-input
                  v-model="form.description"
                  :disabled="dialogType === 'view'"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入策略描述"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20" v-if="dialogType !== 'add' && dialogType !== 'copy'">
            <el-col :span="12">
              <el-form-item label="创建时间">
                <el-input v-model="form.createTime" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="更新时间">
                <el-input v-model="form.updateTime" disabled />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="dialogType !== 'view'" type="primary" @click="handleSubmit">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
  import { deptTreeSelect } from '@/api/system/user'
  import { mapGetters } from 'vuex'
  import CustomTreeSelect from '@/components/TreeSelect'
  import Pagination from '@/components/Pagination'
  // 注意：由于接口暂未开发完成，暂时注释掉API导入
  // import { getDispatchList, updateDispatchStatus, batchUpdateDispatchStatus } from '@/api/kanban'

  export default {
    name: 'DispatchStrategy',
    components: {
      CustomTreeSelect,
      Pagination
    },
    data() {
      return {
        // 搜索表单
        searchForm: {
          powerSupply: [],
          status: ''
        },
        // 供电所树形数据
        powerSupplyTree: [],
        // 表格数据
        tableData: [],
        // 表格加载状态
        tableLoading: false,
        // 表格总数
        tableTotal: 0,
        // 查询参数
        queryParams: {
          pageNum: 1,
          pageSize: 20
        },
        // 选中的行
        selectedRows: [],
        // 对话框相关
        dialogVisible: false,
        dialogTitle: '',
        dialogType: '', // 'add', 'edit', 'view', 'copy'
        // 表单数据
        form: {
          id: null,
          strategyName: '',
          strategyType: 'auto_dispatch',
          tradeCode: '供指2.0',
          priority: 'medium',
          workOrderType: '',
          branchType: '',
          status: 1,
          executeTime: null,
          description: '',
          createTime: '',
          updateTime: ''
        },
        // 表单验证规则
        rules: {
          strategyName: [
            { required: true, message: '策略名称不能为空', trigger: 'blur' },
            { min: 2, max: 50, message: '策略名称长度在 2 到 50 个字符', trigger: 'blur' }
          ],
          strategyType: [
            { required: true, message: '请选择策略类型', trigger: 'change' }
          ],
          tradeCode: [
            { required: true, message: '工单来源不能为空', trigger: 'blur' }
          ],
          priority: [
            { required: true, message: '请选择优先级', trigger: 'change' }
          ],
          workOrderType: [
            { required: true, message: '请选择创建工单计划类型', trigger: 'change' }
          ],
          branchType: [
            { required: true, message: '请选择关联表单', trigger: 'change' }
          ]
        }
      }
    },
    computed: {
      ...mapGetters(['deptId']),
      // 判断是否为固定供电所（部门ID为7位数）
      isFixedPowerSupply() {
        return this.deptId && this.deptId.toString().length === 7
      }
    },
    methods: {
      // 生成假数据的辅助函数
      generateMockData() {
        const workOrderTypes = ['特殊走访', '特殊巡视']
        const strategyTypes = ['auto_dispatch', 'manual_dispatch']
        const priorities = ['high', 'medium', 'low']
        const mockRows = []

        // 生成8条假数据，交替使用特殊走访和特殊巡视
        for (let i = 1; i <= 8; i++) {
          const typeIndex = (i - 1) % 2
          const workOrderType = workOrderTypes[typeIndex]
          const strategyType = strategyTypes[i % 2]
          const priority = priorities[i % 3]

          mockRows.push({
            id: i,
            strategyName: `${workOrderType}派单策略${i}`,
            strategyType: strategyType,
            tradeCode: '供指2.0', // 工单来源固定为供指2.0
            priority: priority,
            workOrderType: workOrderType, // 创建工单计划类型
            branchType: workOrderType, // 关联表单与计划类型保持一致
            status: 1, // 默认状态为开启
            executeTime: new Date(`2024-01-01 ${8 + (i % 12)}:00:00`),
            description: `这是${workOrderType}的自动派单策略，用于处理相关工单的自动分配。`,
            createTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 随机生成最近30天的创建时间
            updateTime: new Date().toISOString().split('T')[0] // 更新时间为今天
          })
        }

        return {
          code: 200,
          rows: mockRows,
          total: mockRows.length
        }
      },

      // 获取供电所树形数据
      async getPowerSupplyTree() {
        try {
          const res = await deptTreeSelect()
          if (res.code === 200) {
            this.powerSupplyTree = res.data || []
          }
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },
      // 处理搜索
      handleSearch() {
        this.queryParams.pageNum = 1
        this.getTableData()
      },
      // 重置表单
      resetForm() {
        this.searchForm = {
          powerSupply: [],
          status: ''
        }
        this.queryParams.pageNum = 1
        this.getTableData()
      },
      // 获取表格数据
      async getTableData() {
        this.tableLoading = true
        try {
          // 构建请求参数
          const params = {
            pageNum: this.queryParams.pageNum,
            pageSize: this.queryParams.pageSize
          }

          // 添加供电所参数
          if (this.searchForm.powerSupply && this.searchForm.powerSupply.length > 0) {
            params.powerId = this.searchForm.powerSupply[0]
          }

          // 添加状态参数
          if (this.searchForm.status !== '') {
            params.status = this.searchForm.status
          }

          console.log('获取派单策略数据参数:', params)

          // TODO: 待接口开发完成后启用真实API调用
          // const res = await getDispatchList(params)

          // 使用假数据生成函数创建模拟数据
          // 业务需求说明：
          // 1. 工单来源默认是供指2.0
          // 2. 创建工单计划类型下拉：特殊走访、特殊巡视
          // 3. 关联表单也是：特殊走访、特殊巡视
          // 4. 默认状态直接为开启(status: 1)
          const mockData = this.generateMockData()

          // 根据搜索条件过滤数据
          let filteredRows = mockData.rows

          // 根据状态筛选
          if (params.status !== undefined) {
            filteredRows = filteredRows.filter(row => row.status == params.status)
          }

          // 根据供电所筛选（这里可以添加更复杂的筛选逻辑）
          if (params.powerId) {
            // 模拟根据供电所ID筛选，实际应该根据业务逻辑来筛选
            console.log('根据供电所筛选，供电所ID:', params.powerId)
          }

          // 分页处理
          const startIndex = (params.pageNum - 1) * params.pageSize
          const endIndex = startIndex + params.pageSize
          const paginatedRows = filteredRows.slice(startIndex, endIndex)

          if (mockData.code === 200) {
            this.tableData = paginatedRows
            this.tableTotal = filteredRows.length

            console.log('获取派单策略数据成功，总数据条数:', filteredRows.length, '当前页数据条数:', paginatedRows.length)
          }
        } catch (error) {
          console.error('获取派单策略数据失败:', error)
        } finally {
          this.tableLoading = false
        }
      },
      // 处理选择变化
      handleSelectionChange(selection) {
        this.selectedRows = selection
      },
      // 处理状态变化 - 使用假数据，不调用接口
      handleStatusChange(row) {
        try {
          // 模拟状态切换成功
          const statusText = row.status === 1 ? '启用' : '禁用'
          this.$message.success(`${statusText}成功`)

          console.log(`策略ID ${row.id} 状态已切换为: ${statusText}`)
        } catch (error) {
          // 如果出现异常，恢复原状态
          row.status = row.status === 1 ? 0 : 1
          console.error('状态更新失败:', error)
          this.$message.error('状态更新失败')
        }
      },
      // 批量启用 - 使用假数据，不调用接口
      handleBatchEnable() {
        if (this.selectedRows.length === 0) {
          this.$message.warning('请选择要启用的策略')
          return
        }

        try {
          // 模拟批量启用操作
          this.selectedRows.forEach(row => {
            // 在表格数据中找到对应行并更新状态
            const tableRow = this.tableData.find(item => item.id === row.id)
            if (tableRow) {
              tableRow.status = 1
            }
          })

          this.$message.success(`批量启用成功，共启用 ${this.selectedRows.length} 条策略`)
          this.$refs.dispatchTable.clearSelection()

          console.log('批量启用的策略ID:', this.selectedRows.map(row => row.id))
        } catch (error) {
          console.error('批量启用失败:', error)
          this.$message.error('批量启用失败')
        }
      },

      // 批量禁用 - 使用假数据，不调用接口
      handleBatchDisable() {
        if (this.selectedRows.length === 0) {
          this.$message.warning('请选择要禁用的策略')
          return
        }

        try {
          // 模拟批量禁用操作
          this.selectedRows.forEach(row => {
            // 在表格数据中找到对应行并更新状态
            const tableRow = this.tableData.find(item => item.id === row.id)
            if (tableRow) {
              tableRow.status = 0
            }
          })

          this.$message.success(`批量禁用成功，共禁用 ${this.selectedRows.length} 条策略`)
          this.$refs.dispatchTable.clearSelection()

          console.log('批量禁用的策略ID:', this.selectedRows.map(row => row.id))
        } catch (error) {
          console.error('批量禁用失败:', error)
          this.$message.error('批量禁用失败')
        }
      },

      // 新增
      handleAdd() {
        this.dialogType = 'add'
        this.dialogTitle = '新增派单策略'
        this.form = {
          id: null,
          strategyName: '',
          strategyType: 'auto_dispatch',
          tradeCode: '供指2.0',
          priority: 'medium',
          workOrderType: '',
          branchType: '',
          status: 1,
          executeTime: null,
          description: '',
          createTime: '',
          updateTime: ''
        }
        this.dialogVisible = true
        console.log('新增策略')
      },

      // 编辑
      handleEdit(row) {
        this.dialogType = 'edit'
        this.dialogTitle = '编辑派单策略'
        this.form = {
          id: row.id,
          strategyName: row.strategyName,
          strategyType: row.strategyType,
          tradeCode: row.tradeCode,
          priority: row.priority,
          workOrderType: row.workOrderType,
          branchType: row.branchType,
          status: row.status,
          executeTime: row.executeTime,
          description: row.description,
          createTime: row.createTime,
          updateTime: row.updateTime
        }
        this.dialogVisible = true
        console.log('编辑策略:', row)
      },

      // 查看
      handleView(row) {
        this.dialogType = 'view'
        this.dialogTitle = '查看派单策略'
        this.form = {
          id: row.id,
          strategyName: row.strategyName,
          strategyType: row.strategyType,
          tradeCode: row.tradeCode,
          priority: row.priority,
          workOrderType: row.workOrderType,
          branchType: row.branchType,
          status: row.status,
          executeTime: row.executeTime,
          description: row.description,
          createTime: row.createTime,
          updateTime: row.updateTime
        }
        this.dialogVisible = true
        console.log('查看策略:', row)
      },

      // 复制
      handleCopy(row) {
        this.dialogType = 'copy'
        this.dialogTitle = '复制派单策略'
        this.form = {
          id: null, // 复制时ID为空
          strategyName: `${row.strategyName}_副本`,
          strategyType: row.strategyType,
          tradeCode: row.tradeCode,
          priority: row.priority,
          workOrderType: row.workOrderType,
          branchType: row.branchType,
          status: 1, // 复制的策略默认启用
          executeTime: row.executeTime,
          description: row.description,
          createTime: '',
          updateTime: ''
        }
        this.dialogVisible = true
        console.log('复制策略:', row)
      },

      // 提交表单
      handleSubmit() {
        this.$refs.form.validate((valid) => {
          if (valid) {
            if (this.dialogType === 'add') {
              this.handleAddSubmit()
            } else if (this.dialogType === 'edit') {
              this.handleEditSubmit()
            } else if (this.dialogType === 'copy') {
              this.handleCopySubmit()
            }
          }
        })
      },

      // 新增提交
      handleAddSubmit() {
        // 生成新的ID
        const newId = this.tableData.length > 0 ? Math.max(...this.tableData.map(item => item.id)) + 1 : 1
        const newRow = {
          id: newId,
          strategyName: this.form.strategyName,
          strategyType: this.form.strategyType,
          tradeCode: this.form.tradeCode,
          priority: this.form.priority,
          workOrderType: this.form.workOrderType,
          branchType: this.form.branchType,
          status: this.form.status,
          executeTime: this.form.executeTime,
          description: this.form.description,
          createTime: new Date().toISOString().split('T')[0],
          updateTime: new Date().toISOString().split('T')[0]
        }

        // 添加到表格数据
        this.tableData.unshift(newRow)
        this.tableTotal += 1

        this.$message.success('新增成功')
        this.dialogVisible = false
        console.log('新增提交:', newRow)
      },

      // 编辑提交
      handleEditSubmit() {
        // 在表格数据中找到对应行并更新
        const index = this.tableData.findIndex(item => item.id === this.form.id)
        if (index !== -1) {
          this.tableData[index] = {
            ...this.tableData[index],
            strategyName: this.form.strategyName,
            strategyType: this.form.strategyType,
            tradeCode: this.form.tradeCode,
            priority: this.form.priority,
            workOrderType: this.form.workOrderType,
            branchType: this.form.branchType,
            status: this.form.status,
            executeTime: this.form.executeTime,
            description: this.form.description,
            updateTime: new Date().toISOString().split('T')[0]
          }
        }

        this.$message.success('编辑成功')
        this.dialogVisible = false
        console.log('编辑提交:', this.form)
      },

      // 复制提交
      handleCopySubmit() {
        // 生成新的ID
        const newId = Math.max(...this.tableData.map(item => item.id)) + 1
        const newRow = {
          id: newId,
          strategyName: this.form.strategyName,
          strategyType: this.form.strategyType,
          tradeCode: this.form.tradeCode,
          priority: this.form.priority,
          workOrderType: this.form.workOrderType,
          branchType: this.form.branchType,
          status: this.form.status,
          executeTime: this.form.executeTime,
          description: this.form.description,
          createTime: new Date().toISOString().split('T')[0],
          updateTime: new Date().toISOString().split('T')[0]
        }

        // 添加到表格数据
        this.tableData.unshift(newRow)
        this.tableTotal += 1

        this.$message.success('复制成功')
        this.dialogVisible = false
        console.log('复制提交:', newRow)
      }
    },
    created() {
      // 获取树数据
      this.getPowerSupplyTree()
      // 初始化表格数据
      this.getTableData()
    }
  }
</script>

<style>
  /* 添加全局样式确保下拉菜单显示在最上层 */
  .vue-treeselect__menu {
    z-index: 9999 !important;
  }
  .vue-treeselect__portal-target {
    z-index: 9999;
  }
</style>

<style scoped>
  .dispatch-container {
    padding: 20px;
  }

  .page-header {
    margin-bottom: 20px;
  }

  .page-title {
    font-size: 24px;
    font-weight: bold;
    color: #303133;
    margin: 0 0 10px 0;
  }

  .page-description {
    font-size: 14px;
    color: #606266;
    margin: 0;
    line-height: 1.5;
  }

  .search-section {
    background: #fff;
    border-radius: 4px;
    border: 1px solid #ebeef5;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 20px;
    margin-bottom: 20px;
  }

  .vue-treeselect {
    width: 300px;
  }

  .batch-actions {
    margin-bottom: 20px;
  }

  .batch-actions .el-button {
    margin-right: 10px;
  }

  .table-section {
    background: #fff;
    border-radius: 4px;
    border: 1px solid #ebeef5;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 20px;
  }

  /* 对话框样式 */
  .dialog-content {
    padding: 0 20px;
  }

  .section-title {
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebeef5;
  }

  .title-text {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
  }

  .section-description {
    font-size: 14px;
    color: #606266;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .form-container {
    margin-top: 20px;
  }

  .dialog-footer {
    text-align: right;
    padding: 20px 0 0 0;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .dispatch-container {
      padding: 10px;
    }

    .page-title {
      font-size: 20px;
    }

    .search-section {
      padding: 15px;
    }

    .vue-treeselect {
      width: 100%;
    }

    .batch-actions {
      text-align: center;
    }

    .batch-actions .el-button {
      margin: 5px;
    }

    .dialog-content {
      padding: 0 10px;
    }
  }
</style>
