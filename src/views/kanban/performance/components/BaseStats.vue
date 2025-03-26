<template>
  <div class="stats-container">
    <!-- 搜索区域 - 根据用户部门ID长度决定是否显示 -->
    <el-card class="search-section">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <!-- 只有当用户部门ID不是7位数时才显示统计区域选择 -->
        <el-form-item label="统计区域" v-if="!isFixedPowerSupply">
          <custom-tree-select
            v-model="searchForm.powerSupply"
            :options="powerSupplyTree"
            :multiple="true"
            :single-select="true"
            :check-strictly="true"
            :user-dept-id="deptId"
            :user-dept-id-length="deptId.toString().length"
            placeholder="请选择供电所"
            @change="handlePowerSupplyChange"
          />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 第一组图表 - 走访覆盖率 -->
    <el-card class="chart-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <!-- 引入近7日走访覆盖率组件 -->
          <coverage-rate-chart
            ref="coverageRateChart"
            :search-params="searchForm"
            :dept-id="deptId"
            :is-senior-manager="isSeniorManager"
            @data-updated="handleCoverageDataUpdated"
          />
        </el-col>
        <el-col :span="12">
          <!-- 引入历史走访覆盖率组件 -->
          <history-coverage-rate-chart
            ref="historyCoverageRateChart"
            :search-params="searchForm"
            :dept-id="deptId"
            :is-senior-manager="isSeniorManager"
            @data-updated="handleHistoryCoverageDataUpdated"
          />
        </el-col>
      </el-row>
    </el-card>

    <!-- 第二组图表 - 巡视完成率 -->
    <el-card class="chart-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <!-- 引入近7日巡视完成率组件 -->
          <completion-rate-chart
            ref="completionRateChart"
            :search-params="searchForm"
            :dept-id="deptId"
            :is-senior-manager="isSeniorManager"
            @data-updated="handleCompletionRateDataUpdated"
          />
        </el-col>
        <el-col :span="12">
          <!-- 引入历史巡视完成率组件 -->
          <history-completion-rate-chart
            ref="historyCompletionRateChart"
            :search-params="searchForm"
            :dept-id="deptId"
            :is-senior-manager="isSeniorManager"
            @data-updated="handleHistoryCompletionRateDataUpdated"
          />
        </el-col>
      </el-row>
    </el-card>

    <!-- 列表区域 -->
    <el-card class="table-section">
      <!-- 添加列表筛选区域 -->
      <div class="filter-section">
        <el-form :inline="true" :model="listSearchForm">
          <!-- 只有当用户部门ID小于7位数时才显示区域筛选 -->
          <el-form-item label="区域筛选" v-if="!isRestrictedUser">
            <custom-tree-select
              v-model="listSearchForm.powerSupply"
              :options="powerSupplyTree"
              :multiple="true"
              :single-select="true"
              :check-strictly="true"
              :user-dept-id="deptId"
              :user-dept-id-length="deptId.toString().length"
              placeholder="请选择供电所"
              @change="handleListPowerSupplyChange"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleListSearch">查询</el-button>
            <el-button @click="resetListForm">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 添加Tab切换 -->
      <el-tabs v-model="tableActiveTab" @tab-click="handleTabChange">
        <el-tab-pane label="走访信息" name="visit"></el-tab-pane>
        <el-tab-pane label="巡视信息" name="inspection"></el-tab-pane>
      </el-tabs>

      <!-- 操作工具栏：添加导出按钮 -->
      <el-row :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button type="warning" plain icon="el-icon-download" size="mini" @click="handleExport"
            >导出</el-button
          >
        </el-col>
        <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table
        v-loading="loading"
        :data="tableData"
        @selection-change="handleSelectionChange"
        border
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="companyName" label="区域名称" show-overflow-tooltip />
        <el-table-column prop="towerName" label="变压器名称" show-overflow-tooltip />
        <el-table-column
          :label="tableActiveTab === 'visit' ? '日常走访数量' : '日常巡视数量'"
          align="center"
        >
          <template slot-scope="scope">
            {{
              tableActiveTab === 'visit'
                ? scope.row.dailyVisitNum || '0'
                : scope.row.dailyTourNum || '0'
            }}
          </template>
        </el-table-column>
        <el-table-column
          :label="tableActiveTab === 'visit' ? '特殊走访数量' : '特殊巡视数量'"
          align="center"
        >
          <template slot-scope="scope">
            {{
              tableActiveTab === 'visit'
                ? scope.row.totalVisitNum || '0'
                : scope.row.totalTourNum || '0'
            }}
          </template>
        </el-table-column>
        <el-table-column :label="tableActiveTab === 'visit' ? '覆盖率' : '完成率'" align="center">
          <template slot-scope="scope">
            {{
              tableActiveTab === 'visit'
                ? scope.row.coverageRate !== null
                  ? scope.row.coverageRate + '%'
                  : '-'
                : scope.row.completionRate !== null
                ? scope.row.completionRate + '%'
                : '-'
            }}
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pagination.currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
        />
      </div>
    </el-card>

    <!-- 修改导出配置弹窗 -->
    <el-dialog title="导出配置" :visible.sync="exportVisible" width="500px" append-to-body>
      <div class="mb-4 text-gray-600">可导出数据总量：{{ pagination.total }}条</div>
      <el-form :model="exportForm" label-width="120px">
        <el-form-item label="单次导出数量">
          <el-radio-group v-model="exportForm.pageSize" @change="handlePageSizeChange">
            <el-radio :label="1000">1000条/次</el-radio>
            <el-radio :label="3000">3000条/次</el-radio>
            <el-radio :label="5000">5000条/次</el-radio>
            <el-radio :label="10000">10000条/次</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="导出页数选择">
          <el-select v-model="exportForm.page" placeholder="请选择要导出的页数">
            <el-option
              v-for="page in totalPages"
              :key="page"
              :label="getPageRangeLabel(page)"
              :value="page"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="exportVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleConfirmExport" :loading="exporting"
          >确 定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
  import { deptTreeSelect } from '@/api/system/user'
  import { mapGetters } from 'vuex'
  import CustomTreeSelect from '@/components/TreeSelect'
  import RightToolbar from '@/components/RightToolbar'
  // 导入所有拆分的组件和接口
  import CoverageRateChart from './CoverageRateChart'
  import HistoryCoverageRateChart from './HistoryCoverageRateChart'
  import CompletionRateChart from './CompletionRateChart'
  import HistoryCompletionRateChart from './HistoryCompletionRateChart'
  import { getVisitInspectionInfo, exportVisitInspectionInfo } from '@/api/kanban'
  import { exportFile } from '@/utils/request' // 添加导入exportFile函数

  export default {
    name: 'BaseStats',
    components: {
      CustomTreeSelect,
      CoverageRateChart,
      HistoryCoverageRateChart,
      CompletionRateChart,
      HistoryCompletionRateChart,
      RightToolbar
    },
    props: {
      type: {
        type: String,
        required: true,
        validator: (value) => ['visit', 'inspection'].includes(value)
      }
    },
    data() {
      return {
        searchForm: {
          powerSupply: null, // 修改为null而不是数组
          dateRange: null
        },
        listSearchForm: {
          powerSupply: null, // 修改为null而不是数组
          dateRange: null
        },
        powerSupplyTree: [],
        tableData: [],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          total: 0
        },
        loading: false,
        // 存储从子组件接收的数据
        coverageData: {
          visit: [],
          inspection: []
        },
        historyCoverageData: {
          visit: [],
          inspection: []
        },
        completionRateData: {
          visit: [],
          inspection: []
        },
        historyCompletionRateData: {
          visit: [],
          inspection: []
        },
        tableActiveTab: 'visit', // 默认选择走访Tab
        // 选中的行数据ID
        ids: [],
        // 选中的行数据
        selection: [],
        showSearch: true,
        // 添加导出相关数据
        exportVisible: false,
        exporting: false,
        exportForm: {
          page: 1,
          pageSize: 1000
        }
      }
    },
    computed: {
      ...mapGetters(['userId', 'deptId']),
      title() {
        return this.type === 'visit' ? '走访' : '巡视'
      },
      isFixedPowerSupply() {
        return this.deptId && this.deptId.toString().length === 7
      },
      isSeniorManager() {
        return this.deptId && this.deptId.toString().length === 5
      },
      isRestrictedUser() {
        // 判断是否是受限用户（deptId大于等于7位）
        return this.deptId && this.deptId.toString().length >= 7
      },
      // 添加计算总页数的计算属性
      totalPages() {
        return Math.ceil(this.pagination.total / this.exportForm.pageSize)
      }
    },
    mounted() {
      window.addEventListener('resize', this.handleResize)
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.handleResize)
    },
    methods: {
      // 处理窗口大小变化
      handleResize() {
        // 各组件内部已经处理了resize事件，这里不需要额外处理
      },

      // 处理从各子组件接收到的数据更新
      handleCoverageDataUpdated(data) {
        this.coverageData[data.type] = data.data
      },

      handleHistoryCoverageDataUpdated(data) {
        this.historyCoverageData[data.type] = data.data
      },

      handleCompletionRateDataUpdated(data) {
        this.completionRateData[data.type] = data.data
      },

      handleHistoryCompletionRateDataUpdated(data) {
        this.historyCompletionRateData[data.type] = data.data
      },

      handleSearch() {
        // 通过ref调用各子组件的refresh方法
        this.$refs.coverageRateChart?.refresh()
        this.$refs.historyCoverageRateChart?.refresh()
        this.$refs.completionRateChart?.refresh()
        this.$refs.historyCompletionRateChart?.refresh()
      },

      resetForm() {
        if (this.isFixedPowerSupply) {
          this.searchForm = {
            powerSupply: this.deptId,
            dateRange: null
          }
        } else if (this.isSeniorManager) {
          this.searchForm = {
            powerSupply: this.deptId,
            dateRange: null
          }
        } else {
          this.searchForm = {
            powerSupply: null,
            dateRange: null
          }
        }

        // 通过调用handleSearch让子组件刷新数据
        this.handleSearch()
      },

      handleSizeChange(val) {
        this.pagination.pageSize = val
        this.handleListSearch()
      },

      handleCurrentChange(val) {
        this.pagination.currentPage = val
        this.handleListSearch()
      },

      handleListSearch() {
        this.loading = true

        // 构建请求参数
        const params = {
          type: this.tableActiveTab === 'visit' ? 1 : 2, // 1: 走访, 2: 巡视
          pageNum: this.pagination.currentPage,
          pageSize: this.pagination.pageSize
        }

        // 添加区域筛选参数的逻辑
        if (this.isRestrictedUser) {
          // deptId ≥ 7位时，必须传自己的deptId作为powerId
          params.powerId = this.deptId
        } else {
          // deptId < 7位时，只有用户选择了区域才传powerId
          if (this.listSearchForm.powerSupply) {
            params.powerId = this.listSearchForm.powerSupply
          }
        }

        // 调用接口获取数据
        getVisitInspectionInfo(params)
          .then((res) => {
            if (res.code === 200) {
              // 修复这里：rows 和 total 在顶层，而不是在 res.data 中
              this.tableData = res.rows || []
              this.pagination.total = res.total || 0
            } else {
              this.$message.error(res.msg || '获取数据失败')
              this.tableData = []
              this.pagination.total = 0
            }
          })
          .catch((error) => {
            console.error('获取表格数据失败:', error)
            this.tableData = []
            this.pagination.total = 0
          })
          .finally(() => {
            this.loading = false
          })
      },

      resetListForm() {
        if (this.isRestrictedUser) {
          // 受限用户重置时保持使用自己的deptId
          this.listSearchForm.powerSupply = this.deptId
        } else {
          // 非受限用户可以清空选择
          this.listSearchForm.powerSupply = null
        }
        this.pagination.currentPage = 1
        this.handleListSearch()
      },

      async fetchData() {
        this.loading = true
        try {
          // 构建查询参数
          const params = {
            topPowerSupply: this.searchForm.powerSupply,
            listPowerSupply: this.listSearchForm.powerSupply,
            dateRange: this.searchForm.dateRange,
            pageNum: this.pagination.currentPage,
            pageSize: this.pagination.pageSize
          }
          // TODO: 调用后端接口获取数据
        } catch (error) {
          console.error('获取数据失败:', error)
        } finally {
          this.loading = false
        }
      },

      async getPowerSupplyTree() {
        try {
          if (this.isFixedPowerSupply) {
            return
          }
          const res = await deptTreeSelect()
          const addParentRef = (nodes, parent = null) => {
            return nodes.map((node) => {
              const newNode = { ...node, parent }
              if (newNode.children && newNode.children.length) {
                newNode.children = addParentRef(newNode.children, newNode)
              }
              return newNode
            })
          }
          let treeData = addParentRef(res.data || [])

          if (this.isSeniorManager) {
            const findUserDept = (nodes) => {
              for (let node of nodes) {
                if (node.id.toString() === this.deptId.toString()) {
                  return node
                }
                if (node.children && node.children.length) {
                  const found = findUserDept(node.children)
                  if (found) return found
                }
              }
              return null
            }
            const userDept = findUserDept(treeData)
            if (userDept) {
              treeData = [userDept]
            }
          }
          this.powerSupplyTree = treeData

          if (this.isSeniorManager) {
            this.searchForm.powerSupply = this.deptId
          }
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },

      normalizer(node) {
        return {
          id: node.id,
          label: node.label,
          children: node.children,
          isDisabled: !this.isNodeSelectable(node)
        }
      },

      isNodeSelectable(node) {
        if (this.isFixedPowerSupply) {
          return false
        }
        if (this.isSeniorManager) {
          const nodeId = node.id ? node.id.toString() : ''
          const userDeptId = this.deptId ? this.deptId.toString() : ''
          return nodeId.startsWith(userDeptId) && nodeId.length === 7
        }
        let level = 1
        let parent = node.parent
        while (parent) {
          level++
          parent = parent.parent
        }
        return level === 3
      },

      handlePowerSupplyChange(selectedNodes) {
        // 直接使用节点ID，不需要判断数组长度
        this.searchForm.powerSupply = selectedNodes.length > 0 ? selectedNodes[0].id : null
        this.handleSearch()
      },

      handleListPowerSupplyChange(selectedNodes) {
        // 直接使用节点ID，不需要判断数组长度
        this.listSearchForm.powerSupply = selectedNodes.length > 0 ? selectedNodes[0].id : null
        this.handleListSearch()
      },

      handleTabChange(tab) {
        this.tableActiveTab = tab.name
        this.handleListSearch()
      },

      // 多选框选中数据
      handleSelectionChange(selection) {
        this.selection = selection
        this.ids = selection.map((item) => item.id)
      },

      // 处理导出
      handleExport() {
        if (this.pagination.total === 0) {
          this.$modal.msgError('当前没有数据可供导出')
          return
        }
        this.exportForm.page = 1
        this.exportVisible = true
      },

      // 确认导出操作
      handleConfirmExport() {
        this.$modal
          .confirm('是否确认导出当前页数据?')
          .then(() => {
            this.exporting = true

            // 构建导出请求参数
            const queryParams = {
              page: this.exportForm.page,
              pageSize: this.exportForm.pageSize,
              type: this.tableActiveTab === 'visit' ? 0 : 1 // 0: 走访, 1: 巡视
            }

            // 添加区域筛选参数的逻辑，与列表查询保持一致
            if (this.isRestrictedUser) {
              // deptId ≥ 7位时，必须传自己的deptId作为powerId
              queryParams.powerId = this.deptId
            } else if (this.listSearchForm.powerSupply) {
              // 只有用户选择了区域才传powerId
              queryParams.powerId = this.listSearchForm.powerSupply
            }

            // 如果有选择行，则只导出选中行
            if (this.ids.length > 0) {
              queryParams.ids = this.ids.join(',')
            }

            // 使用exportFile函数导出
            exportFile(
              '/result/kan/ban/get/page/export',
              queryParams,
              `${this.tableActiveTab === 'visit' ? '走访信息' : '巡视信息'}_第${
                this.exportForm.page
              }页_${new Date().getTime()}.xlsx`,
              {
                timeout: 300000, // 设置5分钟超时
                onDownloadProgress: (progressEvent) => {
                  if (progressEvent.lengthComputable) {
                    const percentCompleted = Math.round(
                      (progressEvent.loaded * 100) / progressEvent.total
                    )
                    console.log(`导出进度: ${percentCompleted}%`)
                  }
                }
              }
            )
              .then(() => {
                this.exporting = false
                this.exportVisible = false
                this.$modal.msgSuccess('导出成功')
              })
              .catch(() => {
                this.exporting = false
              })
          })
          .catch(() => {})
      },

      // 处理单次导出数量变化
      handlePageSizeChange() {
        this.exportForm.page = 1 // 重置页码选择
      },

      // 获取页码范围标签
      getPageRangeLabel(page) {
        const start = (page - 1) * this.exportForm.pageSize
        const remainingItems = this.pagination.total - start
        const itemsInThisPage = Math.min(this.exportForm.pageSize, remainingItems)
        const end = start + itemsInThisPage

        return `第${page}页 (${start + 1}-${end}条)`
      },

      // 兼容RightToolbar组件
      getList() {
        this.handleListSearch()
      }
    },
    watch: {
      'searchForm.dateRange': {
        handler() {
          // 当日期范围变化时，触发子组件更新
          this.handleSearch()
        },
        deep: true
      }
    },
    created() {
      if (this.isFixedPowerSupply) {
        this.searchForm.powerSupply = this.deptId
      }
      this.getPowerSupplyTree()
      // 各组件在挂载时会自行加载初始数据

      // 页面初始化时加载表格数据
      this.$nextTick(() => {
        this.handleListSearch()
      })
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
  .stats-container {
    padding: 20px;
  }
  .search-section,
  .chart-section,
  .table-section {
    margin-bottom: 20px;
  }
  .chart {
    height: 400px;
  }
  .pagination {
    text-align: right;
  }
  .filter-section {
    margin-bottom: 15px;
  }
  .vue-treeselect {
    width: 300px;
  }
  .mb8 {
    margin-bottom: 8px;
  }
  /* 添加Tab样式 */
  .el-tabs {
    margin-bottom: 15px;
  }
  /* 添加导出相关样式 */
  .mb-4 {
    margin-bottom: 15px;
  }

  .text-gray-600 {
    color: #666;
  }
</style>
