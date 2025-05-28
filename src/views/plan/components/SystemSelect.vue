<template>
  <div>
    <!-- 头部过滤和搜索区域 -->
    <div class="mb-4 flex flex-wrap gap-4 items-center">
      <!-- 供电所选择 - 使用新的 VisitTreeselect 替换原来的 Treeselect -->
      <div class="flex-1 min-w-[220px]">
        <visit-treeselect
          v-model="localPowerDepts"
          :options="powerSupplyTree"
          placeholder="选择供电所"
          @change="handlePowerSupplyChangeWithLabel"
        />
      </div>

      <!-- 所属台区筛选 -->
      <div class="min-w-[180px]">
        <el-input
          v-model="towerNameFilter"
          placeholder="输入台区名称筛选"
          clearable
          @input="handleTowerNameChange"
          @clear="handleTowerNameClear"
        >
          <template #prepend>台区名称</template>
        </el-input>
      </div>

      <!-- 全选控制 - 添加禁用条件 -->
      <div class="flex items-center ml-auto">
        <el-checkbox
          v-model="isSelectAllChecked"
          @change="handleSelectAllChange"
          :disabled="tableData.length === 0"
          :title="tableData.length === 0 ? '请先选择供电所并确保有查询结果' : ''"
        >
          全选当前筛选条件下的所有对象
        </el-checkbox>
      </div>
    </div>

    <!-- 表格区域 -->
    <el-table
      ref="multipleTable"
      v-loading="loading"
      :data="tableData"
      tooltip-effect="dark"
      style="width: 100%"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      @selection-change="handleSelectionChange"
      height="410"
    >
      <el-table-column
        type="selection"
        width="50"
        :selectable="(row) => (isSelectAllChecked ? false : true)"
      />
      <!-- 走访类型表格列 -->
      <template v-if="isVisit">
        <el-table-column prop="customName" label="客户名称" />
        <el-table-column prop="customId" label="客户编号" />
        <!-- 所属城市 -->
        <el-table-column prop="areaName" label="所属城市" />
        <el-table-column prop="companyName" label="所属单位区县" />
        <el-table-column prop="powerName" label="所属供电单位" />
        <el-table-column prop="towerName" label="所属台区" />
        <el-table-column prop="userName" label="客户经理" />
        <el-table-column prop="visit" label="走访状态" />
      </template>
      <!-- 巡视类型表格列 -->
      <template v-else>
        <el-table-column prop="towerName" label="台区名称" />
        <el-table-column prop="towerId" label="台区编号" />
        <el-table-column prop="provinceName" label="所属省份" />
        <el-table-column prop="areaName" label="所属城市" />
        <el-table-column prop="companyName" label="所属单位区县" />
        <el-table-column prop="powerName" label="所属供电单位" />
        <el-table-column prop="userName" label="台区经理" />
      </template>
    </el-table>

    <!-- 分页区域 -->
    <div class="mt-4 flex justify-between items-center">
      <div class="text-sm text-gray-500">
        已选择
        <span class="text-blue-600 font-medium">{{
          isSelectAll === 1 ? total : selectedCount
        }}</span>
        项
        <span v-if="isSelectAll === 1" class="ml-2">(已全选)</span>
      </div>
      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getObjectTable"
      />
    </div>
  </div>
</template>

<script>
  import { asyncGetAreaList, asyncGetCustomerList } from '@/api/plan'
  import { deptTreeSelect } from '@/api/system/user' // 添加缺失的导入
  import VisitTreeselect from '@/components/VisitTreeselect'
  import Pagination from '@/components/Pagination'
  import '@riophae/vue-treeselect/dist/vue-treeselect.css'
  export default {
    name: 'SystemSelect',
    components: {
      VisitTreeselect,
      Pagination
    },
    props: {
      value: {
        type: Array,
        default: () => []
      },
      planType: {
        type: String,
        required: true
      },
      isVisit: {
        type: Boolean,
        default: false
      },
      powerDepts: {
        type: Array,
        default: () => []
      }
    },
    data() {
      return {
        loading: false,
        queryParams: {
          pageNum: 1,
          pageSize: 10
        },
        total: 0,
        tableData: [],
        powerSupplyTree: [],
        towerIdList: [],
        selectedCount: 0,
        isSelectAll: 0,
        isSelectAllChecked: false,
        // 记录当前页面的项
        currentPageItems: [],
        // 添加本地状态跟踪 powerDepts
        localPowerDepts: [], // 存储ID
        selectedDeptLabels: [], // 添加此行存储显示用的标签
        towerNameFilter: '', // 台区名称筛选
        searchTimer: null // 搜索防抖定时器
      }
    },
    watch: {
      powerDepts: {
        handler(val) {
          // 确保 localPowerDepts 始终是数组
          this.localPowerDepts = Array.isArray(val) ? [...val] : val ? [val] : []
          if (this.localPowerDepts.length) {
            this.getObjectTable()
          }
        },
        immediate: true
      },
      value: {
        handler(val) {
          // 只在非全选模式下更新 selectedCount
          if (this.isSelectAll !== 1) {
            this.selectedCount = val?.length || 0
            this.$emit('update:selectedCount', this.selectedCount)
          }
        },
        immediate: true
      }
    },
    created() {
      this.getPowerSupplyTree()
    },
    beforeDestroy() {
      // 清理搜索定时器
      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }
    },
    methods: {
      // 刷新选择状态 - 使其成为独立方法并修复实现
      refreshSelection() {
        this.$nextTick(() => {
          // 清除所有选择
          if (this.$refs.multipleTable) {
            this.$refs.multipleTable.clearSelection()

            // 如果是全选状态，显示全选复选框
            this.isSelectAllChecked = this.isSelectAll === 1

            // 如果不是全选状态，根据value进行选择
            if (this.isSelectAll !== 1 && this.tableData?.length) {
              this.tableData.forEach((row) => {
                const shouldSelect = this.value.some((item) => {
                  return this.isVisit
                    ? item.customId === row.customId
                    : item.towerId === row.towerId
                })

                if (shouldSelect) {
                  this.$refs.multipleTable.toggleRowSelection(row, true)
                }
              })
            }
          }
        })
      },

      // 根据计划类型获取对象表格数据
      async getObjectTable(pagination) {
        // 修改这里：使用localPowerDepts而不是powerDepts
        if (!this.localPowerDepts || !this.localPowerDepts.length) {
          this.$modal.msgWarning('请先选择供电所')
          return
        }

        this.loading = true
        try {
          if (this.isVisit) {
            // 走访类型，使用客户查询接口
            const customerParams = {
              pageNum: pagination?.page || this.queryParams.pageNum,
              pageSize: pagination?.limit || this.queryParams.pageSize,
              planId: '', // 新建时无需传planId
              // 修改这里：使用localPowerDepts
              userId: this.localPowerDepts.toString(), // 供电所ID
              towerIdList: '', // 不再传递台区ID
              customName: '', // 不再传递搜索关键字
              towerName: this.towerNameFilter || '' // 添加台区名称筛选参数
            }

            const customerRes = await asyncGetCustomerList(customerParams)
            if (customerRes.code === 200) {
              this.tableData = customerRes.rows || []
              this.total = parseInt(customerRes.total) || 0
              this.$emit('update:total', this.total)

              // 保存当前页items
              this.currentPageItems = this.tableData.map((item) => ({
                customId: item.customId,
                towerId: item.towerId
              }))
              this.refreshSelection()
            }
          } else {
            const params = {
              pageNum: pagination?.page || this.queryParams.pageNum,
              pageSize: pagination?.limit || this.queryParams.pageSize,
              // 修改这里：使用localPowerDepts
              deptIdList: this.localPowerDepts.toString(),
              planId: '',
              towerName: this.towerNameFilter || '' // 添加台区名称筛选参数
            }

            const res = await asyncGetAreaList(params)
            if (res.code === 200) {
              this.tableData = res.rows || []
              this.total = parseInt(res.total) || 0
              this.$emit('update:total', this.total)
              this.currentPageItems = this.tableData.map((item) => ({
                towerId: item.towerId
              }))
              this.refreshSelection()
            }
          }
        } catch (error) {
          console.error('获取列表数据失败:', error)
        } finally {
          this.loading = false
        }
      },

      // 处理表格选择变化
      handleSelectionChange(val) {
        if (this.isSelectAll !== 1) {
          // 添加数据字段打印
          console.log('SystemSelect - 选中的数据:', val)

          // 获取当前页的选择项的关键ID
          const currentPageSelections = val.map((item) => ({
            userId: item.userId,
            userName: item.userName,
            towerId: item.towerId,
            towerName: item.towerName,
            areaName: item.areaName,
            companyName: item.companyName,
            powerName: item.powerName,
            deptId: item.deptId,
            provinceName: item.provinceName,
            customId: item.customId,
            customName: item.customName || item.consName // 确保包含 customName
          }))

          // 从 value 中移除当前页的项
          let newValue = [...this.value]
          newValue = newValue.filter((item) => {
            return !this.currentPageItems.some((pageItem) => {
              return this.isVisit
                ? pageItem.customId === item.customId
                : pageItem.towerId === item.towerId
            })
          })

          // 添加当前页选中的项
          newValue.push(...currentPageSelections)

          // 更新到父组件
          this.$emit('input', newValue)
          this.selectedCount = newValue.length
          this.$emit('update:selectedCount', this.selectedCount)
        }
      },

      // 处理全选变化
      handleSelectAllChange(val) {
        // 如果没有数据，不允许全选
        if (this.tableData.length === 0 && val) {
          this.$message.warning('没有可选择的对象，请先选择供电所并查询数据')
          this.isSelectAllChecked = false
          return
        }

        this.isSelectAll = val ? 1 : 0
        this.$emit('update:isSelectAll', this.isSelectAll)

        if (val) {
          // 全选模式，清空已选项
          this.$emit('input', [])
          this.selectedCount = this.total
          this.$emit('update:selectedCount', this.total)

          // 将当前页的所有项添加到当前页选择中，以便在确认时能看到选择效果
          this.$refs.multipleTable.toggleAllSelection()
        } else {
          // 取消全选，恢复为已选择的项
          this.selectedCount = this.value.length
          this.$emit('update:selectedCount', this.selectedCount)
          this.refreshSelection()
        }
      },

      // 获取供电所树形数据
      async getPowerSupplyTree() {
        try {
          // 日常走访计划(planType=3)时传type=1,其他情况不传type
          // 确保传递type=1参数以获取正确的树形结构
          const params = this.planType === '3' ? { type: '1' } : {}
          const res = await deptTreeSelect(params)
          this.powerSupplyTree = res.data || []
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      }, // 处理供电所变化 - 新增方法获取和显示供电所名称
      handlePowerSupplyChangeWithLabel(nodes) {
        // 重置台区筛选
        this.towerNameFilter = ''

        if (nodes?.length) {
          // 获取选中节点的id和名称
          const ids = nodes.map((node) => node.id)

          // 确保传递数组给父组件
          this.$emit('update:power-depts', ids)
          this.localPowerDepts = ids
          this.queryParams.pageNum = 1
          this.getObjectTable()
        } else {
          this.$emit('update:power-depts', [])
          this.localPowerDepts = []
        }
      },

      // 递归计算节点深度
      getNodeDepth(node, depth = 1) {
        if (!node.children || node.children.length === 0) {
          return depth
        }
        // 取最大深度
        return Math.max(...node.children.map((child) => this.getNodeDepth(child, depth + 1)))
      },

      // Tree格式化，使只有第五层（最底层人员节点）可选
      normalizer(node, depth = 1) {
        // 递归处理子节点
        let children = node.children
        let normalizedChildren = children
          ? children.map((child) => this.normalizer(child, depth + 1))
          : undefined

        // 判断是否是最底层的人员节点（例如"王旭明"、"喝好"）
        // 根据树形结构，这些节点通常在第5层
        const isPersonNode = depth === 5 && (!node.children || node.children.length === 0)

        return {
          id: node.id,
          label: node.label,
          children: normalizedChildren,
          // 只允许最底层的人员节点可选
          isDisabled: !isPersonNode
        }
      },

      // 处理台区名称筛选输入变化
      handleTowerNameChange() {
        // 清除之前的搜索定时器
        if (this.searchTimer) {
          clearTimeout(this.searchTimer)
        }
        // 设置防抖延迟搜索
        this.searchTimer = setTimeout(() => {
          this.queryParams.pageNum = 1 // 重置页码
          this.getObjectTable()
        }, 500) // 500ms 防抖
      },

      // 处理台区名称筛选清空
      handleTowerNameClear() {
        this.towerNameFilter = ''
        this.queryParams.pageNum = 1 // 重置页码
        this.getObjectTable()
      }
    }
  }
</script>
