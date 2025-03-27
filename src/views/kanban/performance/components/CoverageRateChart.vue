<template>
  <div class="chart-container">
    <div class="chart-header">
      <el-radio-group v-model="coverageType" size="small" @change="handleCoverageTypeChange">
        <el-radio-button label="inspection">近7日日常走访覆盖率</el-radio-button>
        <el-radio-button label="visit">近7日特殊走访覆盖率</el-radio-button>
      </el-radio-group>
    </div>
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<script>
  import * as echarts from 'echarts'
  import { getWeeklyCoverageRate } from '@/api/kanban'

  export default {
    name: 'CoverageRateChart',
    props: {
      searchParams: {
        type: Object,
        default: () => ({})
      },
      deptId: {
        type: [Number, String],
        default: ''
      },
      isSeniorManager: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        chart: null,
        coverageType: 'inspection', // 修改默认为日常走访覆盖率
        coverageData: {
          visit: [], // 特殊走访覆盖率数据
          inspection: [] // 日常走访覆盖率数据
        }
      }
    },
    mounted() {
      this.initChart()
      this.getCoverageData()
      window.addEventListener('resize', this.resizeChart)
    },
    beforeDestroy() {
      if (this.chart) {
        this.chart.dispose()
        this.chart = null
      }
      window.removeEventListener('resize', this.resizeChart)
    },
    methods: {
      initChart() {
        if (!this.$refs.chartRef) return

        if (this.chart) {
          this.chart.dispose()
        }

        this.chart = echarts.init(this.$refs.chartRef)
        this.updateChart()
      },

      // 更新图表数据
      updateChart() {
        if (!this.chart) return

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

        this.chart.setOption(option, true)
      },

      // 调整图表大小
      resizeChart() {
        if (this.chart) {
          this.chart.resize()
        }
      },

      // 处理覆盖率类型切换
      async handleCoverageTypeChange(value) {
        this.coverageType = value
        await this.getCoverageData()
      },

      // 获取覆盖率数据
      async getCoverageData() {
        try {
          const params = {
            ...this.getLastWeekDateRange(),
            zfType: this.coverageType === 'visit' ? 1 : 0 // 1: 特殊走访, 0: 日常走访
          }

          // 添加区域筛选参数 - 修改为处理单选情况
          if (this.searchParams.powerSupply) {
            params.companyId = this.searchParams.powerSupply
          } else {
            // 检查是否是超级管理员
            const roles = this.$store.getters && this.$store.getters.roles
            const isAdmin = roles.includes('admin')
            if (!isAdmin) {
              // 非超级管理员时才根据 deptId 添加参数
              const deptIdStr = this.deptId.toString()
              if (deptIdStr.length <= 5) {
                params.cityId = this.deptId
              } else if (deptIdStr.length >= 7) {
                params.companyId = this.deptId
              }
            }
          }

          const res = await getWeeklyCoverageRate(params)

          if (res.code === 200 && res.data) {
            const processedData = res.data.map((item) => ({
              value: Number(item.coverageRate || 0), // 使用 coverageRate 绘制覆盖率图表
              totalNum: item.totalVisitNum || 0,
              companyName: item.companyName || '未知区域'
            }))

            // 更新对应类型的数据
            this.coverageData[this.coverageType] = processedData

            // 发出数据更新事件
            this.$emit('data-updated', {
              type: this.coverageType,
              data: processedData
            })

            // 更新图表
            this.updateChart()
          }
        } catch (error) {
          console.error('获取覆盖率数据失败:', error)
        }
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

      // 获取近7天日期范围的方法
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
      },

      // 暴露给父组件的重新获取数据方法
      refresh() {
        this.getCoverageData()
      }
    },
    watch: {
      searchParams: {
        handler() {
          this.getCoverageData()
        },
        deep: true
      }
    }
  }
</script>

<style scoped>
  .chart-container {
    width: 100%;
    height: 100%;
  }
  .chart {
    height: 400px;
  }
  .chart-header {
    padding: 10px;
    margin-bottom: 10px;
    text-align: center;
  }
</style>
