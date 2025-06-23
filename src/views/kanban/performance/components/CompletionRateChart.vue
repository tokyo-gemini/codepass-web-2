<template>
  <div class="chart-container">
    <div class="chart-header">
      <el-radio-group v-model="specialType" size="small" @change="handleSpecialTypeChange">
        <el-radio-button label="inspection">近7日日常巡视完成率</el-radio-button>
        <el-radio-button label="visit">近7日特殊巡视完成率</el-radio-button>
      </el-radio-group>
    </div>
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<script>
  import * as echarts from 'echarts'
  import { getWeeklyCompletionRate } from '@/api/kanban'

  export default {
    name: 'CompletionRateChart',
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
        specialType: 'inspection', // 修改为默认显示日常巡视完成率
        specialData: {
          visit: [], // 日常巡视完成率数据
          inspection: [] // 特殊巡视完成率数据
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

        const data = this.specialData[this.specialType] || []

        // 从对象中提取值，处理 null 值
        const values = data.map((item) => (item.value !== null ? item.value : 0))
        const average =
          values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0

        const option = {
          title: {
            text: this.specialType === 'inspection' ? '近7日日常巡视完成率' : '近7日特殊巡视完成率'
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
                  this.specialType === 'inspection' ? '日常巡视完成率' : '特殊巡视完成率'
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
            data: ['完成率', `平均值: ${average}%`],
            top: 25,
            formatter: function (name) {
              if (name.includes('平均值')) {
                return name
              }
              return '完成率'
            }
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
                  { offset: 0, color: '#91cc75' },
                  { offset: 0.5, color: '#67a651' },
                  { offset: 1, color: '#67a651' }
                ])
              }
            },
            {
              name: `平均值: ${average}%`,
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

        this.chart.setOption(option, true)
      },

      // 调整图表大小
      resizeChart() {
        if (this.chart) {
          this.chart.resize()
        }
      },

      // 处理巡视类型切换
      async handleSpecialTypeChange(value) {
        this.specialType = value
        await this.getCompletionData()
      },

      // 获取巡视完成率数据
      async getCompletionData() {
        console.log('🔍 [CompletionRateChart] getCompletionData 被调用')
        console.log('🔍 当前组件状态:', {
          specialType: this.specialType,
          searchParams: this.searchParams
        })

        try {
          const params = {
            ...this.getLastWeekDateRange(),
            xsType: this.specialType === 'visit' ? 1 : 0
          }

          // 如果所属单位有值，就传cityId
          if (this.searchParams.powerSupply) {
            params.cityId = this.searchParams.powerSupply
            console.log('🔍 使用searchParams.powerSupply作为cityId:', params.cityId)
          }

          console.log('🔍 最终请求参数:', params)
          console.log('🔍 即将调用API: /result/kan/ban/get/completionRate/week')

          const res = await getWeeklyCompletionRate(params)

          if (res.code === 200 && res.data) {
            const processedData = res.data.map((item) => ({
              value: Number(item.completionRate || 0),
              totalNum: item.totalTourNum || 0,
              companyName: item.companyName || '未知区域'
            }))

            // 更新对应类型的数据
            this.specialData[this.specialType] = processedData

            // 发出数据更新事件
            this.$emit('data-updated', {
              type: this.specialType,
              data: processedData
            })

            // 更新图表
            this.updateChart()
          }
        } catch (error) {
          console.error('获取巡视完成率数据失败:', error)
        }
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
        this.getCompletionData()
      }
    },
    watch: {
      searchParams: {
        handler(newVal, oldVal) {
          console.log('🔍 [CompletionRateChart] searchParams watch 触发')
          console.log('🔍 oldVal:', oldVal)
          console.log('🔍 newVal:', newVal)

          // 避少初始化时的无效调用：只有当oldVal存在且powerSupply有实际变化时才调用API
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
              console.log('🔍 防抖延迟后执行 getCompletionData')
              this.getCompletionData()
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
              console.log('🔍 防抖延迟后执行 getCompletionData')
              this.getCompletionData()
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
