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
        },
        debounceTimer: null // 防抖定时器
      }
    },
    mounted() {
      this.initChart()
      window.addEventListener('resize', this.resizeChart)
    },
    beforeDestroy() {
      if (this.chart) {
        this.chart.dispose()
        this.chart = null
      }
      window.removeEventListener('resize', this.resizeChart)
      // 清理防抖定时器
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
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
              this.horizontalSpecialType === 'inspection'
                ? '历史日常巡视完成率'
                : '历史特殊巡视完成率'
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
                          this.horizontalSpecialType === 'inspection'
                            ? '日常巡视完成率'
                            : '特殊巡视完成率'
                        }
                        <span style="float: right; color: #67a651; font-weight: bold">
                          ${params[0].value}%
                        </span>
                      </div>
                      <div style="color: #666">
                        总${this.horizontalSpecialType === 'inspection' ? '日常' : '特殊'}巡视次数
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
            data: ['完成率', `平均值: ${average}%`],
            top: 25,
            formatter: function (name) {
              if (name.includes('平均值')) {
                return name
              }
              return '完成率'
            }
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
              name: `平均值: ${average}%`,
              type: 'line',
              yAxisIndex: 0,
              lineStyle: {
                type: 'dashed',
                color: '#FF9800',
                width: 2
              },
              symbol: 'none',
              data: new Array(companies.length).fill(average)
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
        console.log('🔍 [HistoryCompletionRateChart] getHistoryCompletionRate 被调用')
        console.log('🔍 当前组件状态:', {
          horizontalSpecialType: this.horizontalSpecialType,
          searchParams: this.searchParams
        })

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

          // 如果所属单位有值，就传cityId
          if (this.searchParams.powerSupply) {
            params.cityId = this.searchParams.powerSupply
            console.log('🔍 使用searchParams.powerSupply作为cityId:', params.cityId)
          }

          console.log('🔍 最终请求参数:', params)
          console.log('🔍 即将调用API: /result/kan/ban/get/completion/history')

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
        handler(newVal, oldVal) {
          console.log('🔍 [HistoryCompletionRateChart] searchParams watch 触发')
          console.log('🔍 oldVal:', oldVal)
          console.log('🔍 newVal:', newVal)

          // 避免初始化时的无效调用：只有当oldVal存在且powerSupply有实际变化时才调用API
          if (
            !oldVal ||
            oldVal.powerSupply !== newVal.powerSupply ||
            JSON.stringify(oldVal.dateRange) !== JSON.stringify(newVal.dateRange)
          ) {
            // 清除之前的定时器
            if (this.debounceTimer) {
              clearTimeout(this.debounceTimer)
            }
            // 设置防抖延迟，避免短时间内重复调用
            this.debounceTimer = setTimeout(() => {
              console.log('🔍 防抖延迟后执行 getHistoryCompletionRate')
              this.getHistoryCompletionRate()
            }, 100) // 100ms 防抖
          } else {
            console.log('🔍 searchParams无实际变化，跳过API调用')
          }
        },
        deep: true,
        immediate: true
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
            }
            // 设置防抖延迟，避免短时间内重复调用
            this.debounceTimer = setTimeout(() => {
              console.log('🔍 防抖延迟后执行 getHistoryCompletionRate')
              this.getHistoryCompletionRate()
            }, 100) // 100ms 防抖
          } else {
            console.log('🔍 searchParams无实际变化，跳过API调用')
          }
        },
        deep: true,
        immediate: true
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
