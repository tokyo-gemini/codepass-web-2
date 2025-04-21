<template>
  <div class="chart-container">
    <div class="chart-header">
      <el-radio-group
        v-model="horizontalSpecialType"
        size="small"
        @change="handleHorizontalSpecialTypeChange"
      >
        <el-radio-button label="inspection">历史日常巡视完成率</el-radio-button>
        <el-radio-button label="visit">历史特殊巡视完成率</el-radio-button>
      </el-radio-group>
    </div>
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<script>
  import * as echarts from 'echarts'
  import { getCompletionRateHistory } from '@/api/kanban'

  export default {
    name: 'HistoryCompletionRateChart',
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
        horizontalSpecialType: 'inspection', // 修改为默认显示历史日常巡视完成率
        horizontalSpecialData: {
          visit: [], // 历史日常巡视完成率数据
          inspection: [] // 历史特殊巡视完成率数据
        }
      }
    },
    mounted() {
      this.initChart()
      this.getHistoryCompletionRate()
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

        const data = this.horizontalSpecialData[this.horizontalSpecialType] || []

        // 按完成率降序排序，忽略 null 或 undefined 值
        const sortedData = [...data]
          .filter((item) => item.value !== null && item.value !== undefined)
          .sort((a, b) => b.value - a.value)

        // 提取公司名和对应的值
        const companies = sortedData.map((item) => item.companyName)
        const values = sortedData.map((item) => item.value)

        // 计算平均值
        const average =
          values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0

        const option = {
          title: {
            text:
              this.horizontalSpecialType === 'visit' ? '历史日常巡视完成率' : '历史特殊巡视完成率'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            },
            formatter: (params) => {
              const dataIndex = params[0].dataIndex
              const dataItem = sortedData[dataIndex] || {}
              return `<div style="padding: 8px">
                      <div style="font-weight: bold; margin-bottom: 8px; color: #333">
                        ${dataItem.companyName || ''}
                      </div>
                      <div style="color: #666; margin-bottom: 4px">
                        ${
                          this.horizontalSpecialType === 'visit'
                            ? '日常巡视完成率'
                            : '特殊巡视完成率'
                        }
                        <span style="float: right; color: #67a651; font-weight: bold">
                          ${params[0].value}%
                        </span>
                      </div>
                      <div style="color: #666">
                        总${this.horizontalSpecialType === 'visit' ? '日常' : '特殊'}巡视次数
                        <span style="float: right; color: #67a651; font-weight: bold">
                          ${dataItem.totalNum || 0}
                        </span>
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
            top: '15%',
            containLabel: true
          },
          legend: {
            data: ['完成率', '平均值'],
            top: 25
          },
          xAxis: {
            type: 'value',
            name: '完成率',
            axisLabel: {
              formatter: '{value}%'
            },
            min: 0,
            max: function (value) {
              return Math.max(100, Math.ceil(value.max))
            }
          },
          yAxis: {
            type: 'category',
            data: companies,
            axisLabel: {
              interval: 0,
              rotate: 0
            }
          },
          series: [
            {
              name: '完成率',
              type: 'bar',
              data: sortedData.map((item, index) => ({
                value: item.value,
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
                },
                label: {
                  show: true,
                  position: 'right',
                  formatter: '{c}%'
                }
              }))
            },
            {
              name: '平均值',
              type: 'line',
              yAxisIndex: 0,
              markLine: {
                data: [{ xAxis: average, name: '平均值' }],
                label: {
                  formatter: '平均值: {c}%',
                  position: 'insideEndTop'
                },
                lineStyle: {
                  type: 'dashed',
                  color: '#FF9800',
                  width: 2
                },
                symbol: ['none', 'none']
              },
              data: []
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

      // 处理历史巡视类型切换
      async handleHorizontalSpecialTypeChange(value) {
        this.horizontalSpecialType = value
        await this.getHistoryCompletionRate()
      },

      // 获取历史巡视完成率数据
      async getHistoryCompletionRate() {
        try {
          const params = {
            xsType: this.horizontalSpecialType === 'inspection' ? 0 : 1
          }

          // 如果用户选择了时间范围，则添加日期筛选参数
          if (this.searchParams.dateRange && this.searchParams.dateRange.length === 2) {
            const [start, end] = this.searchParams.dateRange
            params.startTime = this.formatDate(start)
            params.endTime = this.formatDate(end)
          }

          // 优先添加用户选择的统计区域，不管是否为超级管理员
          if (this.searchParams.powerSupply) {
            params.companyId = Array.isArray(this.searchParams.powerSupply)
              ? this.searchParams.powerSupply.join(',')
              : this.searchParams.powerSupply
          } else {
            // 用户没有选择统计区域，检查是否为超级管理员
            const roles = this.$store.getters && this.$store.getters.roles
            const isAdmin = roles.includes('admin')

            // 非超级管理员时才使用deptId
            if (!isAdmin) {
              const deptIdStr = this.deptId.toString()
              if (deptIdStr.length <= 5) {
                params.cityId = this.deptId
              } else if (deptIdStr.length >= 7) {
                params.companyId = this.deptId
              }
            }
          }

          const res = await getCompletionRateHistory(params)

          if (res.code === 200 && res.data) {
            // 数据处理：去重、处理空值，并转换数据格式
            const uniqueCompanies = new Map()

            res.data.forEach((item) => {
              // 如果是有效数据且公司名没有重复，则保留该条记录
              if (item.companyName && !uniqueCompanies.has(item.companyName)) {
                uniqueCompanies.set(item.companyName, {
                  value: Number(item.completionRate || 0),
                  totalNum: item.totalTourNum || 0,
                  companyName: item.companyName
                })
              }
            })

            const processedData = Array.from(uniqueCompanies.values())

            this.horizontalSpecialData[this.horizontalSpecialType] = processedData

            // 发出数据更新事件
            this.$emit('data-updated', {
              type: this.horizontalSpecialType,
              data: processedData
            })

            // 更新图表
            this.updateChart()
          }
        } catch (error) {
          console.error('获取历史巡视完成率数据失败:', error)
        }
      },

      // 日期格式化方法
      formatDate(date) {
        if (!date) return ''
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      },

      // 暴露给父组件的重新获取数据方法
      refresh() {
        this.getHistoryCompletionRate()
      }
    },
    watch: {
      searchParams: {
        handler() {
          this.getHistoryCompletionRate()
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
