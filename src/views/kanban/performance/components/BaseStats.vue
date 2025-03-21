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
            :normalizer="normalizer"
            :disable-branch-nodes="true"
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
          <div class="chart-header">
            <el-radio-group v-model="coverageType" size="small" @change="handleCoverageTypeChange">
              <el-radio-button label="visit">近7日常走访覆盖率</el-radio-button>
              <el-radio-button label="inspection">近7日常巡视覆盖率</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="verticalChart" class="chart"></div>
        </el-col>
        <el-col :span="12">
          <div class="chart-header">
            <el-radio-group
              v-model="horizontalCoverageType"
              size="small"
              @change="handleHorizontalCoverageTypeChange"
            >
              <el-radio-button label="visit">近7日常走访覆盖率</el-radio-button>
              <el-radio-button label="inspection">近7日常巡视覆盖率</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="horizontalChart" class="chart"></div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 第二组图表 -->
    <el-card class="chart-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="chart-header">
            <el-radio-group v-model="specialType" size="small" @change="handleSpecialTypeChange">
              <el-radio-button label="visit">近7日特殊走访完成率</el-radio-button>
              <el-radio-button label="inspection">近7日特殊巡视完成率</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="verticalChart2" class="chart"></div>
        </el-col>
        <el-col :span="12">
          <div class="chart-header">
            <el-radio-group
              v-model="horizontalSpecialType"
              size="small"
              @change="handleHorizontalSpecialTypeChange"
            >
              <el-radio-button label="visit">历史特殊走访覆盖率</el-radio-button>
              <el-radio-button label="inspection">历史特殊巡视覆盖率</el-radio-button>
            </el-radio-group>
          </div>
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
              :normalizer="normalizer"
              :disable-branch-nodes="true"
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
  import { getWeeklyCoverageRate, getWeeklyCompletionRate } from '@/api/kanban'

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
        charts: {
          vertical: null,
          horizontal: null,
          vertical2: null,
          horizontal2: null
        },
        loading: false, // 添加loading状态
        coverageType: 'visit', // 覆盖率类型：走访/巡视
        coverageData: {
          visit: [], // 走访覆盖率数据
          inspection: [] // 巡视覆盖率数据
        },
        specialType: 'visit', // 特殊类型：走访/巡视
        specialData: {
          visit: [], // 特殊走访完成率数据
          inspection: [] // 特殊巡视完成率数据
        },
        horizontalCoverageType: 'visit', // 横向图表的类型
        horizontalCoverageData: {
          // 横向图表的数据
          visit: [],
          inspection: []
        },
        horizontalSpecialType: 'visit', // 横向特殊图表的类型
        horizontalSpecialData: {
          // 横向特殊图表的数据
          visit: [],
          inspection: []
        }
      }
    },
    computed: {
      title() {
        return this.type === 'visit' ? '走访' : '巡视'
      }
    },
    mounted() {
      // 在nextTick中初始化图表，确保DOM已经渲染
      this.$nextTick(() => {
        this.initCharts()
        this.fetchData()
      })
      window.addEventListener('resize', this.resizeCharts)
    },
    beforeDestroy() {
      // 清理图表实例
      Object.values(this.charts).forEach((chart) => {
        chart && chart.dispose()
      })
      window.removeEventListener('resize', this.resizeCharts)
    },
    methods: {
      initCharts() {
        try {
          // 先销毁已存在的图表实例
          Object.values(this.charts).forEach((chart) => {
            chart && chart.dispose()
          })

          // 初始化第一组图表
          if (this.$refs.verticalChart) {
            this.charts.vertical = echarts.init(this.$refs.verticalChart)
            this.initCoverageChart(this.charts.vertical)
          }

          if (this.$refs.horizontalChart) {
            this.charts.horizontal = echarts.init(this.$refs.horizontalChart)
            this.initHorizontalCoverageChart(this.charts.horizontal)
          }

          // 初始化第三组图表
          if (this.$refs.verticalChart2) {
            this.charts.vertical2 = echarts.init(this.$refs.verticalChart2)
            this.initSpecialChart(this.charts.vertical2)
          }

          if (this.$refs.horizontalChart2) {
            this.charts.horizontal2 = echarts.init(this.$refs.horizontalChart2)
            this.initHorizontalSpecialChart(this.charts.horizontal2)
          }
        } catch (error) {
          console.error('图表初始化失败:', error)
        }
      },
      // 修改为覆盖率图表初始化方法
      initCoverageChart(chart) {
        if (!chart) return
        const data = this.coverageData[this.coverageType] || []
        const average =
          data.length > 0 ? (data.reduce((a, b) => a + b, 0) / data.length).toFixed(2) : 0

        const option = {
          title: {
            text: this.coverageType === 'visit' ? '近7日常走访覆盖率' : '近7日常巡视覆盖率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          legend: {
            data: ['覆盖率', '平均值'],
            top: 25
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: this.getLast7Days(),
            axisLabel: { rotate: 45 }
          },
          yAxis: {
            type: 'value',
            name: '覆盖率',
            axisLabel: { formatter: '{value}%' }
          },
          series: [
            {
              name: '覆盖率',
              type: 'bar',
              data: data.map((value) => ({
                value,
                label: {
                  show: true,
                  position: 'top',
                  formatter: '{c}%'
                }
              })),
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#83bff6' },
                  { offset: 0.5, color: '#188df0' },
                  { offset: 1, color: '#188df0' }
                ])
              }
            },
            {
              name: '平均值',
              type: 'line',
              data: new Array(7).fill({
                value: average,
                label: {
                  show: true,
                  formatter: '平均值: {c}%',
                  position: 'top',
                  color: '#FF9800',
                  fontSize: 12,
                  fontWeight: 'bold'
                }
              }),
              symbol: 'none',
              lineStyle: {
                type: 'dashed',
                color: '#FF9800',
                width: 2
              },
              itemStyle: {
                color: '#FF9800'
              }
            }
          ]
        }
        chart.setOption(option)
      },
      // 新增特殊完成率图表初始化方法
      initSpecialChart(chart) {
        if (!chart) return
        const data = this.specialData[this.specialType] || []
        const average =
          data.length > 0 ? (data.reduce((a, b) => a + b, 0) / data.length).toFixed(2) : 0

        const option = {
          title: {
            text: this.specialType === 'visit' ? '近7日特殊走访完成率' : '近7日特殊巡视完成率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          legend: {
            data: ['完成率', '平均值'],
            top: 25
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: this.getLast7Days(),
            axisLabel: { rotate: 45 }
          },
          yAxis: {
            type: 'value',
            name: '完成率',
            axisLabel: { formatter: '{value}%' }
          },
          series: [
            {
              name: '完成率',
              type: 'bar',
              data: data.map((value) => ({
                value,
                label: {
                  show: true,
                  position: 'top',
                  formatter: '{c}%'
                }
              })),
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#91cc75' },
                  { offset: 0.5, color: '#67a651' },
                  { offset: 1, color: '#67a651' }
                ])
              }
            },
            {
              name: '平均值',
              type: 'line',
              data: new Array(7).fill({
                value: average,
                label: {
                  show: true,
                  formatter: '平均值: {c}%',
                  position: 'top',
                  color: '#FF9800',
                  fontSize: 12,
                  fontWeight: 'bold'
                }
              }),
              symbol: 'none',
              lineStyle: {
                type: 'dashed',
                color: '#FF9800',
                width: 2
              },
              itemStyle: {
                color: '#FF9800'
              }
            }
          ]
        }
        chart.setOption(option)
      },
      // 初始化横向覆盖率图表
      initHorizontalCoverageChart(chart) {
        if (!chart) return
        const data = this.horizontalCoverageData[this.horizontalCoverageType] || []

        const option = {
          title: {
            text:
              this.horizontalCoverageType === 'visit' ? '近7日常走访覆盖率' : '近7日常巡视覆盖率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            },
            formatter: function (params) {
              const data = params[0]
              return `<div style="padding: 8px">
                        <div style="font-weight: bold; margin-bottom: 8px; color: #333">${data.data.companyName}</div>
                        <div style="color: #666; margin-bottom: 4px">
                          历史走访覆盖率 <span style="float: right; color: #188df0; font-weight: bold">${data.data.value}%</span>
                        </div>
                        <div style="color: #666">
                          总走访次数 <span style="float: right; color: #188df0; font-weight: bold">${data.data.totalNum}</span>
                        </div>
                      </div>`
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            name: '覆盖率',
            axisLabel: {
              formatter: '{value}%'
            }
          },
          yAxis: {
            type: 'category',
            data: this.getLast7Days().reverse(), // 反转数组使日期从上到下显示
            axisLabel: {
              rotate: 0 // 横向显示不需要旋转标签
            }
          },
          series: [
            {
              name: '覆盖率',
              type: 'bar',
              data: data
                .map((item) => ({
                  value: item.value,
                  totalNum: item.totalNum,
                  companyName: item.companyName
                }))
                .reverse(),
              itemStyle: {
                color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                  // 修改渐变方向为横向
                  { offset: 0, color: '#83bff6' },
                  { offset: 0.5, color: '#188df0' },
                  { offset: 1, color: '#188df0' }
                ])
              }
            }
          ]
        }
        chart.setOption(option)
      },
      // 初始化横向特殊覆盖率图表
      initHorizontalSpecialChart(chart) {
        if (!chart) return
        const option = {
          title: {
            text:
              this.horizontalSpecialType === 'visit' ? '历史特殊走访覆盖率' : '历史特殊巡视覆盖率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            },
            formatter: (params) => {
              const totalVisits = Math.round(params[0].value * 2)
              return `<div style="padding: 8px">
                        <div style="font-weight: bold; margin-bottom: 8px; color: #333">枣阳市下级站所7</div>
                        <div style="display: flex; align-items: center; margin-bottom: 6px">
                          <span style="color: #666">${
                            this.horizontalSpecialType === 'visit'
                              ? '特殊走访覆盖率'
                              : '特殊巡视覆盖率'
                          }</span>
                          <span style="margin-left: auto; color: #67a651; font-weight: bold">${
                            params[0].value
                          }%</span>
                        </div>
                        <div style="color: #666">
                          总${this.horizontalSpecialType === 'visit' ? '走访' : '巡视'}次数
                          <span style="float: right; color: #67a651; font-weight: bold">${totalVisits}</span>
                        </div>
                      </div>`
            },
            backgroundColor: '#fff',
            borderColor: '#eee',
            borderWidth: 1,
            padding: 0,
            textStyle: {
              fontSize: 12
            },
            extraCssText: 'box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);'
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            name: '覆盖率',
            axisLabel: {
              formatter: '{value}%'
            }
          },
          yAxis: {
            type: 'category',
            data: this.getLast7Days().reverse(),
            axisLabel: {
              rotate: 0
            }
          },
          series: [
            {
              name: '覆盖率',
              type: 'bar',
              data: (this.horizontalSpecialData[this.horizontalSpecialType] || []).reverse(),
              itemStyle: {
                color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                  { offset: 0, color: '#91cc75' },
                  { offset: 0.5, color: '#67a651' },
                  { offset: 1, color: '#67a651' }
                ])
              }
            }
          ]
        }
        chart.setOption(option)
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
          const type = this.type === 'visit' ? '1' : '2' // 使用当前选择的类型
          const res = await deptTreeSelect({ type })
          // 添加parent引用
          const addParentRef = (nodes, parent = null) => {
            return nodes.map((node) => {
              node.parent = parent
              if (node.children && node.children.length) {
                node.children = addParentRef(node.children, parent)
              }
              return node
            })
          }
          this.powerSupplyTree = addParentRef(res.data || [])
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },
      // 添加 normalizer 方法来处理节点
      normalizer(node) {
        return {
          id: node.id,
          label: node.label,
          children: node.children,
          isDisabled: !this.isThirdLevel(node) // 只有第三层级可选
        }
      },
      // 判断是否是第三层级节点
      isThirdLevel(node) {
        // 检查当前节点的层级
        let level = 1
        let parent = node.parent
        while (parent) {
          level++
          parent = parent.parent
        }
        return level === 3
      },
      // 获取近7天日期
      getLast7Days() {
        const dates = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          dates.push(date.toLocaleDateString())
        }
        return dates
      },
      // 处理覆盖率类型切换
      handleCoverageTypeChange(value) {
        this.coverageType = value
        // 更新图表
        if (this.charts.vertical) {
          this.initCoverageChart(this.charts.vertical)
        }
      },
      // 处理横向覆盖率类型切换
      handleHorizontalCoverageTypeChange(value) {
        this.horizontalCoverageType = value
        if (this.charts.horizontal) {
          this.initHorizontalCoverageChart(this.charts.horizontal)
        }
      },
      // 处理特殊类型切换
      handleSpecialTypeChange(value) {
        this.specialType = value
        // 更新图表
        if (this.charts.vertical2) {
          this.initSpecialChart(this.charts.vertical2)
        }
      },
      // 处理横向特殊类型切换
      handleHorizontalSpecialTypeChange(value) {
        this.horizontalSpecialType = value
        if (this.charts.horizontal2) {
          this.initHorizontalSpecialChart(this.charts.horizontal2)
        }
      },
      // 获取覆盖率数据
      async getCoverageData() {
        try {
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - 6)

          const params = {
            companyId: this.searchForm.powerSupply?.join(','), // 供电公司ID
            startTime: startDate.toISOString().split('T')[0], // 七天前
            endTime: new Date().toISOString().split('T')[0], // 今天
            zfType: this.coverageType === 'visit' ? 0 : 1, // 0-日常走访 1-特殊走访
            xsType: this.coverageType === 'visit' ? 0 : 1 // 0-日常巡视 1-特殊巡视
          }

          const res = await getWeeklyCoverageRate(params)

          if (res.code === 200) {
            // 处理返回的数据
            const isVisitType = this.coverageType === 'visit'
            this.coverageData = {
              visit: res.data.map((item) => ({
                value: isVisitType ? item.coverageRate : item.completionRate,
                totalNum: isVisitType ? item.totalVisitNum : item.totalTourNum,
                companyName: item.companyName
              })),
              inspection: res.data.map((item) => ({
                value: isVisitType ? item.coverageRate : item.completionRate,
                totalNum: isVisitType ? item.totalVisitNum : item.totalTourNum,
                companyName: item.companyName
              }))
            }

            // 横向图表使用相同的数据
            this.horizontalCoverageData = {
              visit: [...this.coverageData.visit],
              inspection: [...this.coverageData.inspection]
            }

            // 更新图表
            if (this.charts.vertical) {
              this.initCoverageChart(this.charts.vertical)
            }
            if (this.charts.horizontal) {
              this.initHorizontalCoverageChart(this.charts.horizontal)
            }
          }
        } catch (error) {
          console.error('获取覆盖率数据失败:', error)
        }
      },
      // 获取特殊完成率数据
      async getSpecialData() {
        try {
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - 6)

          const params = {
            companyId: this.searchForm.powerSupply?.join(','),
            startTime: startDate.toISOString().split('T')[0],
            endTime: new Date().toISOString().split('T')[0],
            zfType: this.specialType === 'visit' ? 0 : 1,
            xsType: this.specialType === 'visit' ? 0 : 1
          }

          const res = await getWeeklyCompletionRate(params)

          if (res.code === 200) {
            // 处理返回的数据
            const isVisitType = this.specialType === 'visit'
            this.specialData = {
              visit: res.data.map((item) => ({
                value: isVisitType ? item.completionRate : item.coverageRate,
                totalNum: isVisitType ? item.totalVisitNum : item.totalTourNum,
                companyName: item.companyName
              })),
              inspection: res.data.map((item) => ({
                value: isVisitType ? item.completionRate : item.coverageRate,
                totalNum: isVisitType ? item.totalVisitNum : item.totalTourNum,
                companyName: item.companyName
              }))
            }

            // 横向图表使用相同的数据
            this.horizontalSpecialData = {
              visit: [...this.specialData.visit],
              inspection: [...this.specialData.inspection]
            }

            // 更新两个图表
            if (this.charts.vertical2) {
              this.initSpecialChart(this.charts.vertical2)
            }
            if (this.charts.horizontal2) {
              this.initHorizontalSpecialChart(this.charts.horizontal2)
            }
          }
        } catch (error) {
          console.error('获取特殊完成率数据失败:', error)
        }
      }
    },
    created() {
      this.getPowerSupplyTree()
      this.getCoverageData()
      this.getSpecialData() // 添加获取特殊完成率数据
    }
  }
</script>

<style>
  /* 添加全局样式确保下拉菜单显示在最上层 */
  .vue-treeselect__menu {
    z-index: 9999 !important;
  }

  .vue-treeselect__portal-target {
    z-index: 9999 !;
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
  .chart-header {
    padding: 10px;
    margin-bottom: 10px;
    text-align: center;
  }
</style>
