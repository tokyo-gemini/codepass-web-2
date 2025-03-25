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

    <!-- 第一组图表 -->
    <el-card class="chart-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="chart-header">
            <el-radio-group v-model="coverageType" size="small" @change="handleCoverageTypeChange">
              <el-radio-button label="visit">近7日特殊走访覆盖率</el-radio-button>
              <el-radio-button label="inspection">近7日日常走访覆盖率</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="verticalChart" class="chart"></div>
        </el-col>
        <el-col :span="12">
          <div class="chart-header">
            <el-radio-group
              v-model="historyCoverageType"
              size="small"
              @change="handleHistoryCoverageTypeChange"
            >
              <el-radio-button label="visit">历史特殊走访覆盖率</el-radio-button>
              <el-radio-button label="inspection">历史日常走访覆盖率</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="historyChart" class="chart"></div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 第二组图表 -->
    <el-card class="chart-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="chart-header">
            <el-radio-group v-model="specialType" size="small" @change="handleSpecialTypeChange">
              <el-radio-button label="visit">近7日日常巡视完成率</el-radio-button>
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
              <el-radio-button label="visit">历史日常巡视完成率</el-radio-button>
              <el-radio-button label="inspection">历史特殊巡视完成率</el-radio-button>
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
            <custom-tree-select
              v-model="listSearchForm.powerSupply"
              :options="powerSupplyTree"
              :multiple="true"
              :user-dept-id="deptId"
              :user-dept-id-length="deptId.toString().length"
              placeholder="请选择供电所"
              @change="handleListPowerSupplyChange"
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
  import { mapGetters } from 'vuex'
  import CustomTreeSelect from '@/components/TreeSelect'
  import {
    getWeeklyCoverageRate,
    getWeeklyCompletionRate,
    getHistoryCoverageRate,
    getCompletionRateHistory
  } from '@/api/kanban'

  export default {
    name: 'BaseStats',
    components: {
      CustomTreeSelect
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
          powerSupply: [],
          dateRange: null // 修改为 null，不再设置默认值
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
          horizontal2: null,
          history: null
        },
        loading: false, // 添加loading状态
        coverageType: 'visit', // 默认类型：特殊走访覆盖率
        specialType: 'visit', // 默认类型：特殊巡视完成率
        coverageData: {
          visit: [], // 特殊走访覆盖率数据
          inspection: [] // 日常走访覆盖率数据
        },
        specialData: {
          visit: [], // 特殊巡视完成率数据
          inspection: [] // 日常巡视完成率数据
        },
        horizontalCoverageType: 'visit', // 横向图表的类型
        horizontalCoverageData: {
          visit: [],
          inspection: []
        },
        horizontalSpecialType: 'visit', // 横向特殊图表的类型
        horizontalSpecialData: {
          visit: [],
          inspection: []
        },
        historyCoverageType: 'visit', // 默认类型：历史特殊走访覆盖率
        historyCoverageData: {
          visit: [], // 历史特殊走访覆盖率数据
          inspection: [] // 历史日常走访覆盖率数据
        }
      }
    },
    computed: {
      ...mapGetters([
        'userId',
        'deptId' // 添加 deptId 获取器
      ]),
      title() {
        return this.type === 'visit' ? '走访' : '巡视'
      },
      // 判断是否是固定供电所用户（7位部门ID）
      isFixedPowerSupply() {
        return this.deptId && this.deptId.toString().length === 7
      },
      // 新增：判断是否是高级管理用户（5位部门ID）
      isSeniorManager() {
        return this.deptId && this.deptId.toString().length === 5
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
          if (this.$refs.historyChart) {
            this.charts.history = echarts.init(this.$refs.historyChart)
            this.initHistoryCoverageChart(this.charts.history)
          }
        } catch (error) {
          console.error('图表初始化失败:', error)
        }
      },
      // 修改为覆盖率图表初始化方法
      initCoverageChart(chart) {
        if (!chart) return

        const data = this.coverageData[this.coverageType] || []
        const values = data.map((item) => item.value) // 提取数值
        const average =
          values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0
        const dates = this.getLast7Days()

        const option = {
          title: {
            text: this.coverageType === 'visit' ? '近7日特殊走访覆盖率' : '近7日日常走访覆盖率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
              const item = params[0]
              const dataItem = data[item.dataIndex] || {}
              return `<div>
                <div>${dates[item.dataIndex]}</div>
                <div>${this.coverageType === 'visit' ? '走访' : '巡视'}覆盖率：${item.value}%</div>
                <div>总次数：${dataItem.totalNum}</div>
              </div>`
            }
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
            data: dates,
            axisLabel: { rotate: 45 }
          },
          yAxis: {
            type: 'value',
            name: '覆盖率',
            axisLabel: { formatter: '{value}%' },
            min: 0,
            max: 100
          },
          series: [
            {
              name: '覆盖率',
              type: 'bar',
              data: values.map((value) => ({
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
              data: new Array(dates.length).fill(average),
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
        chart.setOption(option, true)
      },
      // 新增特殊完成率图表初始化方法
      initSpecialChart(chart) {
        if (!chart) return
        const data = this.specialData[this.specialType] || []

        // 从对象中提取值，处理 null 值
        const values = data.map((item) => (item.value !== null ? item.value : 0))
        const average =
          values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0

        const option = {
          title: {
            text: this.specialType === 'visit' ? '近7日特殊巡视完成率' : '近7日日常巡视完成率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
              const item = params[0]
              const dataItem = data[item.dataIndex] || {}
              return `<div style="padding: 8px">
                      <div style="font-weight: bold; margin-bottom: 8px; color: #333">${
                        dataItem.companyName
                      }</div>
                      <div style="color: #666; margin-bottom: 4px">
                        ${
                          this.specialType === 'visit' ? '特殊巡视完成率' : '日常巡视完成率'
                        } <span style="float: right; color: #67a651; font-weight: bold">${
                item.value
              }%</span>
                      </div>
                      <div style="color: #666">
                        总次数 <span style="float: right; color: #67a651; font-weight: bold">${
                          dataItem.totalNum
                        }</span>
                      </div>
                    </div>`
            }
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
            data: data.map((item) => item.companyName || '未知区域'),
            axisLabel: { rotate: 45 }
          },
          yAxis: {
            type: 'value',
            name: '完成率',
            axisLabel: { formatter: '{value}%' },
            min: 0,
            max: 100
          },
          series: [
            {
              name: '完成率',
              type: 'bar',
              data: values.map((value) => ({
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
              data: new Array(data.length).fill(average),
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
        chart.setOption(option, true)
      },
      // 初始化横向覆盖率图表
      initHorizontalCoverageChart(chart) {
        if (!chart) return

        const data = this.horizontalCoverageData[this.horizontalCoverageType] || []
        const companies = data.map((item) => item.companyName)
        const values = data.map((item) => item.value)

        const option = {
          title: {
            text:
              this.horizontalCoverageType === 'visit' ? '历史日常走访覆盖率' : '历史日常巡视覆盖率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
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
            axisLabel: { formatter: '{value}%' },
            min: 0,
            max: 100
          },
          yAxis: {
            type: 'category',
            data: companies,
            axisLabel: { rotate: 0 }
          },
          series: [
            {
              name: '覆盖率',
              type: 'bar',
              data: data.map((item, index) => ({
                value: item.value,
                itemStyle: {
                  color:
                    index % 2 === 0
                      ? new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                          { offset: 0, color: '#83bff6' },
                          { offset: 0.5, color: '#188df0' },
                          { offset: 1, color: '#188df0' }
                        ])
                      : new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                          { offset: 0, color: '#76c3fa' },
                          { offset: 0.5, color: '#4aafed' },
                          { offset: 1, color: '#4aafed' }
                        ])
                }
              }))
            }
          ]
        }
        chart.setOption(option, true)
      },
      // 初始化横向特殊覆盖率图表
      initHorizontalSpecialChart(chart) {
        if (!chart) return
        const data = this.horizontalSpecialData[this.horizontalSpecialType] || []

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
              const dataItem = data[params[0].dataIndex] || {}
              return `<div style="padding: 8px">
                      <div style="font-weight: bold; margin-bottom: 8px; color: #333">${
                        dataItem.companyName || ''
                      }</div>
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
                        <span style="float: right; color: #67a651; font-weight: bold">${
                          dataItem.totalNum
                        }</span>
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
              data: data
                .map((item, index) => ({
                  value: item.value,
                  // 添加斑马样式：根据索引奇偶性选择不同的颜色样式
                  itemStyle: {
                    color:
                      index % 2 === 0
                        ? new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                            { offset: 0, color: '#91cc75' },
                            { offset: 0.5, color: '#67a651' },
                            { offset: 1, color: '#67a651' }
                          ])
                        : new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                            { offset: 0, color: '#a8d98a' },
                            { offset: 0.5, color: '#84b96b' },
                            { offset: 1, color: '#84b96b' }
                          ])
                  }
                }))
                .reverse()
            }
          ]
        }
        chart.setOption(option)
      },
      // 初始化历史覆盖率图表
      initHistoryCoverageChart(chart) {
        if (!chart) return
        const data = this.historyCoverageData[this.historyCoverageType] || []

        const option = {
          title: {
            text: this.historyCoverageType === 'visit' ? '历史特殊走访覆盖率' : '历史日常走访覆盖率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
              const item = params[0]
              const dataItem = data[item.dataIndex] || {}
              return `<div style="padding: 8px">
                      <div style="font-weight: bold; margin-bottom: 8px; color: #333">${
                        dataItem.companyName
                      }</div>
                      <div style="color: #666; margin-bottom: 4px">
                        ${
                          this.historyCoverageType === 'visit' ? '特殊走访覆盖率' : '日常走访覆盖率'
                        } <span style="float: right; color: #67a651; font-weight: bold">${
                item.value
              }%</span>
                      </div>
                      <div style="color: #666">
                        总次数 <span style="float: right; color: #67a651; font-weight: bold">${
                          dataItem.totalNum
                        }</span>
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
            type: 'category',
            data: data.map((item) => item.companyName || '未知区域'),
            axisLabel: { rotate: 45 }
          },
          yAxis: {
            type: 'value',
            name: '覆盖率',
            axisLabel: { formatter: '{value}%' },
            min: 0,
            max: 100
          },
          series: [
            {
              name: '覆盖率',
              type: 'bar',
              data: data.map((item) => ({
                value: item.value,
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
            }
          ]
        }
        chart.setOption(option, true)
      },
      // 调整图表大小
      resizeCharts() {
        Object.values(this.charts).forEach((chart) => {
          chart && chart.resize()
        })
      },
      // 修改 handleSearch 方法
      handleSearch() {
        // 点击查询时，重新获取所有数据
        this.getCoverageData()
        this.getSpecialData()
        this.getHistoryCoverageData() // 查询时更新历史覆盖率数据
        this.getHistoryCompletionRate()
      },

      // 点击重置时清空条件并重新查询
      resetForm() {
        if (this.isFixedPowerSupply) {
          this.searchForm = {
            powerSupply: [this.deptId],
            dateRange: null
          }
        } else if (this.isSeniorManager) {
          this.searchForm = {
            powerSupply: [this.deptId],
            dateRange: null
          }
        } else {
          this.searchForm = {
            powerSupply: [],
            dateRange: null
          }
        }
        // 重置后重新查询数据
        this.getCoverageData()
        this.getSpecialData()
        this.getHistoryCoverageData() // 查询时更新历史覆盖率数据
        this.getHistoryCompletionRate()
      },

      // 移除不需要的 fetchData 方法，因为我们直接使用 getCoverageData 和 getSpecialData

      // 列表相关的分页方法保持不变
      handleSizeChange(val) {
        this.pagination.pageSize = val
        this.handleListSearch() // 修改为使用 handleListSearch
      },

      handleCurrentChange(val) {
        this.pagination.currentPage = val
        this.handleListSearch() // 修改为使用 handleListSearch
      },

      // 修改列表搜索方法
      handleListSearch() {
        // TODO: 实现列表数据查询逻辑
        this.loading = true
        try {
          // 这里添加获取列表数据的接口调用
          // ...
        } catch (error) {
          console.error('获取列表数据失败:', error)
        } finally {
          this.loading = false
        }
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
      // 修改获取供电所树形数据方法
      async getPowerSupplyTree() {
        try {
          // 如果是固定供电所用户(7位deptId)，不需要调用接口获取树形数据
          if (this.isFixedPowerSupply) {
            return
          }
          const res = await deptTreeSelect()
          // 修改添加parent引用的方法
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

          // 如果是高级管理用户（5位数deptId），只保留用户所属部门及其子部门
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

          // 如果是高级管理用户，默认选择自己的部门
          if (this.isSeniorManager) {
            this.searchForm.powerSupply = [this.deptId]
          }
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },
      // 修改 normalizer 方法来处理节点
      normalizer(node) {
        return {
          id: node.id,
          label: node.label,
          children: node.children,
          isDisabled: !this.isNodeSelectable(node) // 修改为新的判断方法
        }
      },
      // 修改判断节点是否可选的方法
      isNodeSelectable(node) {
        // 如果是固定供电所用户(7位deptId)，全部禁用选择
        if (this.isFixedPowerSupply) {
          return false
        }
        // 如果是高级管理用户(5位deptId)
        if (this.isSeniorManager) {
          // 当前节点是否是用户部门的直接子部门
          const nodeId = node.id ? node.id.toString() : ''
          const userDeptId = this.deptId ? this.deptId.toString() : ''
          // 检查这个节点是否是当前用户部门的直接子部门
          // 判断方法：节点ID以用户部门ID开头，且节点ID长度为7
          return nodeId.startsWith(userDeptId) && nodeId.length === 7
        }
        // 其他用户保持原有的三级可选逻辑
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
      async handleCoverageTypeChange(value) {
        this.coverageType = value
        await this.getCoverageData()
      },
      // 处理横向覆盖率类型切换
      handleHorizontalCoverageTypeChange(value) {
        this.horizontalCoverageType = value
        if (this.charts.horizontal) {
          this.initHorizontalCoverageChart(this.charts.horizontal)
        }
      },
      // 处理特殊类型切换
      async handleSpecialTypeChange(value) {
        this.specialType = value
        await this.getSpecialData() // 切换 Tab 时重新获取数据
      },
      // 处理横向特殊类型切换
      async handleHorizontalSpecialTypeChange(value) {
        this.horizontalSpecialType = value
        await this.getHistoryCompletionRate()
      },
      // 处理历史覆盖率类型切换
      async handleHistoryCoverageTypeChange(value) {
        this.historyCoverageType = value
        await this.getHistoryCoverageData() // 切换 Tab 时重新获取数据
      },
      // 获取覆盖率数据
      async getCoverageData() {
        try {
          const params = {
            ...this.getLastWeekDateRange() // 添加近7天的时间范围参数
          }

          // 根据当前选择的类型设置参数
          if (this.coverageType === 'visit') {
            params.zfType = 1 // 特殊走访
          } else {
            params.zfType = 0 // 日常走访
          }

          // 添加区域筛选参数
          if (this.isSeniorManager) {
            if (
              !this.searchForm.powerSupply?.length ||
              this.searchForm.powerSupply[0] === this.deptId
            ) {
              params.cityId = this.deptId
            } else {
              params.companyId = this.searchForm.powerSupply.join(',')
            }
          } else {
            params.companyId = this.searchForm.powerSupply?.join(',') || ''
          }

          const res = await getWeeklyCompletionRate(params)

          if (res.code === 200 && res.data) {
            const processedData = res.data.map((item) => ({
              value: Number(item.coverageRate || 0), // 使用 coverageRate 绘制覆盖率图表
              totalNum: item.totalVisitNum || 0,
              companyName: item.companyName || '未知区域'
            }))

            // 更新对应类型的数据
            this.coverageData[this.coverageType] = processedData
            this.horizontalCoverageData[this.coverageType] = processedData

            // 更新图表
            this.initCoverageChart(this.charts.vertical)
            this.initHorizontalCoverageChart(this.charts.horizontal)
          }
        } catch (error) {
          console.error('获取覆盖率数据失败:', error)
        }
      },

      // 获取特殊完成率数据
      async getSpecialData() {
        try {
          const params = {
            ...this.getLastWeekDateRange() // 添加近7天的时间范围参数
          }

          // 根据当前选择的类型设置 xsType 参数
          params.xsType = this.specialType === 'visit' ? 1 : 0 // 1: 特殊巡视, 0: 日常巡视

          // 添加区域筛选参数
          if (this.isSeniorManager) {
            if (
              !this.searchForm.powerSupply?.length ||
              this.searchForm.powerSupply[0] === this.deptId
            ) {
              params.cityId = this.deptId
            } else {
              params.companyId = this.searchForm.powerSupply.join(',')
            }
          } else {
            params.companyId = this.searchForm.powerSupply?.join(',') || ''
          }

          const res = await getWeeklyCompletionRate(params)

          if (res.code === 200 && res.data) {
            const processedData = res.data.map((item) => ({
              value: Number(item.completionRate || 0), // 使用 completionRate 绘制完成率图表
              totalNum: item.totalTourNum || 0,
              companyName: item.companyName || '未知区域'
            }))

            // 更新对应类型的数据
            this.specialData[this.specialType] = processedData

            // 更新图表
            this.initSpecialChart(this.charts.vertical2)
          }
        } catch (error) {
          console.error('获取特殊完成率数据失败:', error)
        }
      },

      // 获取历史覆盖率数据
      async getHistoryCoverageData() {
        try {
          const params = {
            xsType: this.historyCoverageType === 'visit' ? 1 : 0 // 1: 特殊走访, 0: 日常走访
          }

          // 如果用户选择了时间范围，则添加日期筛选参数
          if (this.searchForm.dateRange && this.searchForm.dateRange.length === 2) {
            const [start, end] = this.searchForm.dateRange
            params.startTime = this.formatDate(start)
            params.endTime = this.formatDate(end)
          }

          // 添加区域筛选参数
          if (this.isSeniorManager) {
            if (
              !this.searchForm.powerSupply?.length ||
              this.searchForm.powerSupply[0] === this.deptId
            ) {
              params.cityId = this.deptId
            } else {
              params.companyId = this.searchForm.powerSupply.join(',')
            }
          } else {
            params.companyId = this.searchForm.powerSupply?.join(',') || ''
          }

          const res = await getHistoryCoverageRate(params) // 修改这里，使用正确的接口

          if (res.code === 200 && res.data) {
            const processedData = res.data.map((item) => ({
              value: Number(item.coverageRate || 0),
              totalNum: item.totalVisitNum || 0,
              companyName: item.companyName || '未知区域'
            }))

            this.historyCoverageData[this.historyCoverageType] = processedData
            this.initHistoryCoverageChart(this.charts.history)
          }
        } catch (error) {
          console.error('获取历史覆盖率数据失败:', error)
        }
      },

      // 获取历史完成率数据
      async getHistoryCompletionRate() {
        try {
          const params = {
            xsType: this.horizontalSpecialType === 'visit' ? 0 : 1 // 0: 日常巡视, 1: 特殊巡视
          }

          // 如果用户选择了时间范围，则添加日期筛选参数
          if (this.searchForm.dateRange && this.searchForm.dateRange.length === 2) {
            const [start, end] = this.searchForm.dateRange
            params.startTime = this.formatDate(start)
            params.endTime = this.formatDate(end)
          }

          // 添加区域筛选参数
          if (this.isSeniorManager) {
            if (
              !this.searchForm.powerSupply?.length ||
              this.searchForm.powerSupply[0] === this.deptId
            ) {
              params.cityId = this.deptId
            } else {
              params.companyId = this.searchForm.powerSupply.join(',')
            }
          } else {
            params.companyId = this.searchForm.powerSupply?.join(',') || ''
          }

          const res = await getCompletionRateHistory(params)

          if (res.code === 200 && res.data) {
            const processedData = res.data.map((item) => ({
              value: Number(item.completionRate || 0),
              totalNum: item.totalTourNum || 0,
              companyName: item.companyName || '未知区域'
            }))

            this.horizontalSpecialData[this.horizontalSpecialType] = processedData
            this.initHorizontalSpecialChart(this.charts.horizontal2)
          }
        } catch (error) {
          console.error('获取历史巡视完成率数据失败:', error)
        }
      },

      // 添加日期格式化方法
      formatDate(date) {
        if (!date) return ''
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      },

      // 添加一个用于处理供电所选择变化的方法
      handlePowerSupplyChange(selectedNodes) {
        this.searchForm.powerSupply = selectedNodes.map((node) => node.id)
        // 每次选择变化时重新获取数据
        this.getCoverageData()
        this.getSpecialData()
        this.getHistoryCoverageData() // 查询时更新历史覆盖率数据
        this.getHistoryCompletionRate()
      },

      // 添加处理列表筛选区域供电所选择变化的方法
      handleListPowerSupplyChange(selectedNodes) {
        this.listSearchForm.powerSupply = selectedNodes.map((node) => node.id)
        this.handleListSearch()
      },
      // 移除 getDefaultDateRange 方法，因为不再需要
      // 添加获取近7天日期范围的方法
      getLastWeekDateRange() {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 6) // 获取7天前的日期（包含今天）
        // 格式化日期为 YYYY-MM-DD
        const formatDate = (date) => {
          return date.toISOString().split('T')[0]
        }
        return {
          startTime: formatDate(start),
          endTime: formatDate(end)
        }
      }
    },
    watch: {
      'searchForm.dateRange': {
        handler(newVal) {
          // 当日期范围变化时，重新获取历史覆盖率数据
          this.getHistoryCoverageData()
          this.getHistoryCompletionRate()
        },
        deep: true
      }
    },
    created() {
      // 初始化搜索表单的供电所ID
      if (this.isFixedPowerSupply) {
        this.searchForm.powerSupply = [this.deptId]
      }
      // 移除设置默认日期范围的代码
      this.getPowerSupplyTree()
      this.getCoverageData()
      this.getSpecialData()
      this.getHistoryCoverageData() // 初始化获取历史覆盖率数据
      this.getHistoryCompletionRate()
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
