<template>
  <div class="stats-container">
    <!-- 搜索区域 -->
    <el-card class="search-section">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="统计区域">
          <treeselect
            v-model="searchForm.powerSupply"
            :options="powerSupplyTree"
            :multiple="true"
            :append-to-body="true"
            placeholder="请选择供电所"
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

    <!-- 第一组图表 -->
    <el-card class="chart-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <div ref="verticalChart" class="chart"></div>
        </el-col>
        <el-col :span="12">
          <div ref="horizontalChart" class="chart"></div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 第二组图表 -->
    <el-card class="chart-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <div ref="verticalChart2" class="chart"></div>
        </el-col>
        <el-col :span="12">
          <div ref="horizontalChart2" class="chart"></div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 列表区域 -->
    <el-card class="table-section">
      <!-- 添加列表筛选区域 -->
      <div class="filter-section">
        <el-form :inline="true" :model="listSearchForm">
          <el-form-item label="区域筛选">
            <treeselect
              v-model="listSearchForm.powerSupply"
              :options="powerSupplyTree"
              :multiple="true"
              :append-to-body="true"
              placeholder="请选择供电所"
            />
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="date" label="日期" />
        <el-table-column prop="type" label="类型" />
        <el-table-column prop="area" label="区域" />
        <el-table-column prop="count" label="数量" />
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
  </div>
</template>

<script>
  import * as echarts from 'echarts'
  import { deptTreeSelect } from '@/api/system/user'
  import Treeselect from '@riophae/vue-treeselect'
  import '@riophae/vue-treeselect/dist/vue-treeselect.css'

  export default {
    name: 'BaseStats',
    components: {
      Treeselect
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
          powerSupply: [], // 修改为供电所选择
          dateRange: []
        },
        listSearchForm: {
          powerSupply: [] // 修改为供电所选择
        },
        powerSupplyTree: [], // 供电所树形数据
        tableData: [], // 表格数据
        pagination: {
          currentPage: 1,
          pageSize: 10,
          total: 0
        },
        charts: {},
        loading: false // 添加loading状态
      }
    },
    computed: {
      title() {
        return this.type === 'visit' ? '走访' : '巡视'
      }
    },
    mounted() {
      this.initCharts()
      this.fetchData()
      // 添加窗口大小变化监听
      window.addEventListener('resize', this.resizeCharts)
    },
    beforeDestroy() {
      // 移除事件监听
      window.removeEventListener('resize', this.resizeCharts)
    },
    methods: {
      initCharts() {
        // 初始化垂直柱状图
        this.charts.vertical = this.initVerticalChart('verticalChart')
        // 初始化水平柱状图
        this.charts.horizontal = this.initHorizontalChart('horizontalChart')
        // 初始化第二组图表
        this.charts.vertical2 = this.initVerticalChart('verticalChart2')
        this.charts.horizontal2 = this.initHorizontalChart('horizontalChart2')
      },
      initVerticalChart(ref) {
        const chart = echarts.init(this.$refs[ref])
        const option = {
          title: { text: '垂直柱状图' },
          tooltip: {},
          xAxis: { data: ['A', 'B', 'C', 'D', 'E'] },
          yAxis: {},
          series: [
            {
              type: 'bar',
              data: [10, 20, 30, 40, 50],
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#83bff6' },
                  { offset: 0.5, color: '#188df0' },
                  { offset: 1, color: '#188df0' }
                ])
              }
            }
          ]
        }
        chart.setOption(option)
        return chart
      },
      initHorizontalChart(ref) {
        const chart = echarts.init(this.$refs[ref])
        const option = {
          title: { text: '水平柱状图' },
          tooltip: {},
          yAxis: { data: ['A', 'B', 'C', 'D', 'E'] },
          xAxis: {},
          series: [
            {
              type: 'bar',
              data: [10, 20, 30, 40, 50]
            }
          ]
        }
        chart.setOption(option)
        return chart
      },
      // 调整图表大小
      resizeCharts() {
        Object.values(this.charts).forEach((chart) => {
          chart && chart.resize()
        })
      },
      handleSearch() {
        this.fetchData()
      },
      resetForm() {
        this.searchForm = {
          powerSupply: [],
          dateRange: []
        }
        this.fetchData()
      },
      handleSizeChange(val) {
        this.pagination.pageSize = val
        this.fetchData()
      },
      handleCurrentChange(val) {
        this.pagination.currentPage = val
        this.fetchData()
      },
      handleListSearch() {
        this.fetchData()
      },
      // 获取数据的方法
      async fetchData() {
        this.loading = true
        try {
          // 构建查询参数
          const params = {
            topPowerSupply: this.searchForm.powerSupply, // 顶部统计区域选择的供电所
            listPowerSupply: this.listSearchForm.powerSupply, // 列表区域筛选的供电所
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
      // 获取供电所树形数据
      async getPowerSupplyTree() {
        try {
          const type = this.type === 'visit' ? '1' : '2' // 根据类型设置不同的type
          const res = await deptTreeSelect({ type })
          this.powerSupplyTree = res.data || []
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      }
    },
    created() {
      this.getPowerSupplyTree()
    }
  }
</script>

<style>
  /* 添加全局样式确保下拉菜单显示在最上层 */
  .vue-treeselect__menu {
    z-index: 9999 !important;
  }

  .vue-treeselect__portal-target {
    z-index: 9999 !important;
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
    margin-top: 20px;
    text-align: right;
  }
  .filter-section {
    margin-bottom: 15px;
  }
  .vue-treeselect {
    width: 300px;
  }
</style>
