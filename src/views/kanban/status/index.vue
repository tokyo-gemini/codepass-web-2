<template>
  <div class="status-board-container">
    <!-- 搜索区域 -->
    <div class="search-section">
      <el-form :inline="true" :model="searchForm" class="search-form">
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
    </div>

    <!-- 状态看板区域 -->
    <el-row :gutter="20">
      <!-- 走访状态卡片 -->
      <el-col :span="12">
        <div class="status-card">
          <div class="card-header">
            <span class="card-title">
              <i class="el-icon-user"></i>
              走访状态
            </span>
          </div>
          <div class="status-grid">
            <div
              class="status-item"
              v-for="item in visitStatusData"
              :key="item.statusDataId || item.label"
              :class="item.className"
            >
              <div class="status-label">{{ item.label }}</div>
              <div class="status-count">{{ item.count }}</div>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 巡视状态卡片 -->
      <el-col :span="12">
        <div class="status-card">
          <div class="card-header">
            <span class="card-title">
              <i class="el-icon-view"></i>
              巡视状态
            </span>
          </div>
          <div class="status-grid">
            <div
              class="status-item"
              v-for="item in inspectionStatusData"
              :key="item.statusDataId || item.label"
              :class="item.className"
            >
              <div class="status-label">{{ item.label }}</div>
              <div class="status-count">{{ item.count }}</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
  import { deptTreeSelect } from '@/api/system/user'
  import { mapGetters } from 'vuex'
  import CustomTreeSelect from '@/components/TreeSelect'
  import { getStatusBoardData } from '@/api/kanban'

  export default {
    name: 'StatusBoard',
    components: {
      CustomTreeSelect
    },
    data() {
      return {
        // 搜索表单
        searchForm: {
          powerSupply: [],
          dateRange: []
        },
        // 供电所树形数据
        powerSupplyTree: [],
        // 走访状态数据
        visitStatusData: [],
        // 巡视状态数据
        inspectionStatusData: []
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
        console.log('搜索参数:', this.searchForm)
        // 这里调用API获取状态数据
        this.getStatusData()
      },
      // 重置表单
      resetForm() {
        this.searchForm = {
          powerSupply: [],
          dateRange: []
        }
        this.handleSearch()
      },
      // 获取状态数据
      async getStatusData() {
        try {
          // 构建请求参数
          const params = {}

          // 添加供电所参数
          if (this.searchForm.powerSupply && this.searchForm.powerSupply.length > 0) {
            params.powerId = this.searchForm.powerSupply[0]
          }

          // 添加时间范围参数
          if (this.searchForm.dateRange && this.searchForm.dateRange.length === 2) {
            params.startTime = this.formatDate(this.searchForm.dateRange[0])
            params.endTime = this.formatDate(this.searchForm.dateRange[1])
          }

          console.log('获取状态数据参数:', params)

          // 调用API接口获取数据
          const res = await getStatusBoardData(params)
          if (res.code === 200 && res.data) {
            // 处理返回的数据数组
            res.data.forEach(statusType => {
              if (statusType.statusName === '走访状态') {
                // 处理走访状态数据
                this.visitStatusData = statusType.statusDataList.map(item => ({
                  statusDataId: item.statusDataId,
                  label: item.statusDataName,
                  count: item.statusDataNumber || 0,
                  className: this.getVisitStatusClass(item.statusDataName)
                }))
              } else if (statusType.statusName === '巡视状态') {
                // 处理巡视状态数据
                this.inspectionStatusData = statusType.statusDataList.map(item => ({
                  statusDataId: item.statusDataId,
                  label: item.statusDataName,
                  count: item.statusDataNumber || 0,
                  className: this.getInspectionStatusClass(item.statusDataName)
                }))
              }
            })
          }
        } catch (error) {
          console.error('获取状态数据失败:', error)
          // 如果API调用失败，保持默认数据
        }
      },

      // 获取走访状态样式类名
      getVisitStatusClass(statusName) {
        const classMap = {
          '有诉求': 'status-has-visit',
          '无诉求': 'status-no-visit',
          '未开展': 'status-not-started'
        }
        return classMap[statusName] || 'status-default'
      },

      // 获取巡视状态样式类名
      getInspectionStatusClass(statusName) {
        const classMap = {
          '正常': 'status-normal',
          '一般缺陷': 'status-general',
          '重大缺陷': 'status-serious',
          '紧急缺陷': 'status-urgent',
          '未开展': 'status-not-started-inspection'
        }
        return classMap[statusName] || 'status-default'
      },

      // 格式化日期
      formatDate(date) {
        if (!date) return ''
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    },
    created() {
      // 获取树数据
      this.getPowerSupplyTree()
      // 初始化数据
      this.getStatusData()
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
  .status-board-container {
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

  .status-card {
    background: #fff;
    border-radius: 4px;
    border: 1px solid #ebeef5;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    height: 300px;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 20px;
    border-bottom: 1px solid #ebeef5;
    background: #fafafa;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .card-title i {
    margin-right: 8px;
    color: #409EFF;
  }



  .status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    padding: 20px;
    height: calc(100% - 78px); /* 减去header高度 */
  }

  .status-item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 15px;
    border-radius: 8px;
    position: relative;
    min-height: 60px;
  }

  .status-label {
    font-size: 14px;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .status-count {
    font-size: 24px;
    font-weight: bold;
  }

  /* 走访状态样式 */
  .status-no-visit {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    color: #606266;
  }

  .status-has-visit {
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    color: #e6a23c;
  }

  .status-not-started {
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    color: #909399;
  }

  /* 巡视状态样式 */
  .status-normal {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    color: #67c23a;
  }

  .status-general {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    color: #e6a23c;
  }

  .status-serious {
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    color: #f56c6c;
  }

  .status-urgent {
    background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
    color: #f56c6c;
  }

  .status-not-started-inspection {
    background: linear-gradient(135deg, #e2e3e5 0%, #d1ecf1 100%);
    color: #909399;
  }

  .status-default {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    color: #606266;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .status-grid {
      grid-template-columns: 1fr;
    }

    .status-card {
      height: auto;
      margin-bottom: 20px;
    }
  }
</style>
