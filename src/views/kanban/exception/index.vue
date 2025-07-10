<template>
  <div class="exception-board-container">
    <!-- 搜索区域 -->
    <div class="search-section">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <!-- 类型筛选 -->
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="请选择类型">
            <el-option label="走访" value="zf"></el-option>
            <el-option label="巡视" value="xs"></el-option>
          </el-select>
        </el-form-item>
        <!-- 只有当用户部门ID不是7位数时才显示所属单位选择 -->
        <el-form-item label="所属单位" v-if="!isFixedPowerSupply">
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
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计卡片区域 -->
    <el-row :gutter="20" class="stats-section">
      <el-col :span="8">
        <div class="stats-card">
          <div class="stats-content">
            <div class="stats-number">{{ statsData.noCodeCount || 0 }}个</div>
            <div class="stats-label">无码</div>
          </div>
          <div class="stats-icon no-code-icon">
            <i class="el-icon-warning-outline"></i>
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stats-card">
          <div class="stats-content">
            <div class="stats-number">{{ statsData.lackCodeCount || 0 }}个</div>
            <div class="stats-label">错码</div>
          </div>
          <div class="stats-icon error-code-icon">
            <i class="el-icon-close"></i>
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stats-card">
          <div class="stats-content">
            <div class="stats-number">{{ statsData.exceptionCodeCount || 0 }}个</div>
            <div class="stats-label">异常信息</div>
          </div>
          <div class="stats-icon abnormal-info-icon">
            <i class="el-icon-info"></i>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 数据表格区域 -->
    <div class="table-section">
      <el-table
        :data="tableData"
        :loading="tableLoading"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column
          type="index"
          label="序号"
          width="80"
          align="center"
        />
        <el-table-column
          prop="formDataId"
          label="表单数据ID"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="exceptionType"
          label="异常类型"
          width="100"
          align="center"
        >
          <template slot-scope="scope">
            <el-tag
              :type="getExceptionTypeTagType(scope.row.exceptionType)"
              size="small"
            >
              {{ getExceptionTypeText(scope.row.exceptionType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="exceptionInfo"
          label="异常信息"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="towerName"
          label="台区名称"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="powerName"
          label="供电所名称"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="companyName"
          label="公司名称"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column
          prop="customName"
          label="客户姓名"
          width="100"
          align="center"
        />
        <el-table-column
          prop="customPhoneNumber"
          label="客户电话"
          width="120"
          align="center"
        />
        <el-table-column
          prop="submitTime"
          label="提交时间"
          width="160"
          align="center"
        />
        <el-table-column
          prop="userName"
          label="用户名"
          width="100"
          align="center"
        />
      </el-table>

      <pagination
        v-show="tableTotal > 0"
        :total="tableTotal"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getTableData"
      />
    </div>
  </div>
</template>

<script>
  import { deptTreeSelect } from '@/api/system/user'
  import { mapGetters } from 'vuex'
  import CustomTreeSelect from '@/components/TreeSelect'
  import Pagination from '@/components/Pagination'
  import { getExceptionBoardData, getExceptionTableData } from '@/api/kanban'

  export default {
    name: 'ExceptionBoard',
    components: {
      CustomTreeSelect,
      Pagination
    },
    data() {
      return {
        // 搜索表单
        searchForm: {
          type: 'zf', // 默认选择走访
          powerSupply: []
        },
        // 供电所树形数据
        powerSupplyTree: [],
        // 统计数据
        statsData: {
          noCodeCount: 0,
          lackCodeCount: 0,
          exceptionCodeCount: 0
        },
        // 加载状态
        loading: false,
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
        this.getExceptionData()
        this.getTableData()
      },
      // 重置表单
      resetForm() {
        this.searchForm = {
          type: 'zf', // 重置时默认选择走访
          powerSupply: []
        }
        this.handleSearch()
      },
      // 获取异常数据
      async getExceptionData() {
        this.loading = true
        try {
          // 构建请求参数
          const params = {}

          // 添加类型参数（必填）
          params.type = this.searchForm.type

          // 添加供电所参数
          if (this.searchForm.powerSupply && this.searchForm.powerSupply.length > 0) {
            params.powerId = this.searchForm.powerSupply[0]
          }

          console.log('获取异常数据参数:', params)

          // 调用API接口获取数据
          const res = await getExceptionBoardData(params)
          if (res.code === 200 && res.data) {
            // 处理统计数据 - 根据实际接口返回的数据结构
            this.statsData = {
              noCodeCount: res.data.noCodeCount || 0,
              lackCodeCount: res.data.lackCodeCount || 0,
              exceptionCodeCount: res.data.exceptionCodeCount || 0
            }

            console.log('处理后的统计数据:', this.statsData)
          }
        } catch (error) {
          console.error('获取异常数据失败:', error)
        } finally {
          this.loading = false
        }
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

          // 添加类型参数（必填）
          params.type = this.searchForm.type

          // 添加供电所参数
          if (this.searchForm.powerSupply && this.searchForm.powerSupply.length > 0) {
            params.powerId = this.searchForm.powerSupply[0]
          }

          console.log('获取表格数据参数:', params)

          // 调用API接口获取表格数据
          const res = await getExceptionTableData(params)
          if (res.code === 200) {
            this.tableData = res.rows || []
            this.tableTotal = res.total || 0

            console.log('获取表格数据成功，数据条数:', this.tableData.length)
          }
        } catch (error) {
          console.error('获取表格数据失败:', error)
        } finally {
          this.tableLoading = false
        }
      },
      // 获取异常类型文本
      getExceptionTypeText(type) {
        const typeMap = {
          '1': '无码',
          '2': '缺码',
          '3': '异常信息'
        }
        return typeMap[type] || '未知类型'
      },
      // 获取异常类型标签颜色
      getExceptionTypeTagType(type) {
        const typeMap = {
          '1': 'warning',  // 无码 - 橙色
          '2': 'danger',   // 缺码 - 红色
          '3': 'info'      // 异常信息 - 蓝色
        }
        return typeMap[type] || 'default'
      }
    },
    created() {
      // 获取树数据
      this.getPowerSupplyTree()
      // 初始化数据
      this.getExceptionData()
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
  .exception-board-container {
    padding: 20px;
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

  .stats-section {
    margin-bottom: 20px;
  }

  .stats-card {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #ebeef5;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100px;
  }

  .stats-content {
    flex: 1;
  }

  .stats-number {
    font-size: 28px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 8px;
  }

  .stats-label {
    font-size: 14px;
    color: #606266;
  }

  .stats-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .no-code-icon {
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    color: #e6a23c;
  }

  .error-code-icon {
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    color: #f56c6c;
  }

  .abnormal-info-icon {
    background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
    color: #17a2b8;
  }

  .table-section {
    background: #fff;
    border-radius: 4px;
    border: 1px solid #ebeef5;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 20px;
  }

  .pagination-wrapper {
    margin-top: 20px;
    text-align: right;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .stats-section .el-col {
      margin-bottom: 20px;
    }

    .stats-card {
      height: auto;
      min-height: 80px;
    }

    .stats-number {
      font-size: 24px;
    }

    .stats-icon {
      width: 50px;
      height: 50px;
      font-size: 20px;
    }
  }
</style>
