<template>
  <base-plan
    :plan-type="'1'"
    ref="basePlan"
    @plan-data-loaded="handlePlanDataLoaded"
    @reset="handleReset"
    @before-submit="handleBeforeSubmit"
  >
    <template #plan-content>
      <div class="rounded bg-white shadow w-full p-4 min-h-[650px]">
        <div class="flex">
          <!-- 供电所单选 -->
          <el-form-item label="供电所" required>
            <div class="flex-1">
              <treeselect
                style="width: 300px"
                v-model="selectedDept"
                :options="powerSupplyTree"
                :normalizer="normalizer"
                placeholder="选择供电所"
                :clearable="false"
                :disable-branch-nodes="true"
                @input="handleDeptChange"
              />
            </div>
          </el-form-item>
        </div>

        <!-- 全选复选框 -->
        <div class="mb-4 flex items-center">
          <el-checkbox
            v-model="formData.isSelectAll"
            :true-label="1"
            :false-label="0"
            @change="handleSelectAllChange"
            :disabled="!tableData.length"
            :title="!tableData.length ? '请先选择供电所并确保有查询结果' : ''"
          >
            全选当前筛选条件下的所有对象
          </el-checkbox>
        </div>

        <!-- 替换原有表格为左右布局 -->
        <template v-if="formData.isSelectAll !== 1">
          <div class="flex gap-4">
            <!-- 左侧可选列表 -->
            <div class="flex-1 w-1/2">
              <div class="font-medium mb-2">可选对象</div>
              <el-table
                ref="availableTable"
                :data="tableData"
                :loading="tableLoading"
                border
                stripe
                size="small"
                style="width: 100%"
                :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
              >
                <el-table-column
                  prop="towerName"
                  label="所属台区"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="provinceName"
                  label="所属省份"
                  min-width="120"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="areaName"
                  label="所属城市"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="companyName"
                  label="所属单位区县"
                  min-width="120"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="powerName"
                  label="所属供电单位"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="userName"
                  label="台区经理"
                  min-width="120"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="visit"
                  label="走访状态"
                  min-width="100"
                  show-overflow-tooltip
                />
                <el-table-column width="80" fixed="right">
                  <template #default="scope">
                    <el-button
                      type="text"
                      @click="handleSelect(scope.row)"
                      :disabled="isRowSelected(scope.row)"
                    >
                      {{ isRowSelected(scope.row) ? '已选择' : '选择' }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <!-- 分页 -->
              <div class="mt-2 flex justify-end">
                <el-pagination
                  @current-change="handlePageChange"
                  @size-change="handleSizeChange"
                  :current-page="pagination.pageNum"
                  :page-size="pagination.pageSize"
                  :page-sizes="[5, 10, 20]"
                  layout="total, sizes, prev, pager, next"
                  :total="pagination.total"
                  background
                />
              </div>
            </div>

            <!-- 右侧已选列表 -->
            <div class="flex-1 w-1/2">
              <div class="font-medium mb-2">
                已选对象
                <span class="text-sm text-gray-500 ml-2">(共 {{ selectedCount }} 项)</span>
              </div>
              <el-table
                ref="selectedTable"
                :data="paginatedSelectedList"
                border
                stripe
                size="small"
                style="width: 100%"
                :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
              >
                <el-table-column
                  prop="towerName"
                  label="所属台区"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="provinceName"
                  label="所属省份"
                  min-width="120"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="areaName"
                  label="所属城市"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="companyName"
                  label="所属单位区县"
                  min-width="120"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="powerName"
                  label="所属供电单位"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="userName"
                  label="台区经理"
                  min-width="120"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="visit"
                  label="走访状态"
                  min-width="100"
                  show-overflow-tooltip
                />
                <el-table-column width="80" fixed="right">
                  <template #default="scope">
                    <el-button type="text" @click="handleUnselect(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <!-- 已选列表分页 -->
              <div class="mt-2 flex justify-end">
                <el-pagination
                  @current-change="handleSelectedPageChange"
                  @size-change="handleSelectedSizeChange"
                  :current-page="selectedPagination.pageNum"
                  :page-size="selectedPagination.pageSize"
                  :page-sizes="[5, 10, 20]"
                  layout="total, sizes, prev, pager, next"
                  :total="selectedCount"
                  background
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 全选时的提示 -->
        <template v-else>
          <div class="text-center py-8 text-gray-500">
            <i class="el-icon-info text-xl mr-2"></i>
            已全选当前条件下的所有对象 (共 {{ pagination.total }} 项)
          </div>
        </template>
      </div>
    </template>
  </base-plan>
</template>

<script>
  import BasePlan from '../components/BasePlan.vue'
  import { deptTreeSelect } from '@/api/system/user'
  import { asyncGetAreaList } from '@/api/plan'
  import Treeselect from '@riophae/vue-treeselect'
  import '@riophae/vue-treeselect/dist/vue-treeselect.css'

  export default {
    name: 'DailyInspectionPlan',
    components: {
      BasePlan,
      Treeselect
    },
    data() {
      return {
        powerSupplyTree: [], // 供电所树形数据
        selectedDept: null, // 选中的供电所
        formData: {
          towerUserList: [],
          powerSupply: null,
          isSelectAll: 0 // 添加全选状态, 0: 未全选, 1: 全选
        },
        tableLoading: false,
        tableData: [],
        pagination: {
          total: 0,
          pageNum: 1,
          pageSize: 10
        },
        selectedRows: [], // 存储选中的行
        selectedCount: 0, // 添加选中计数
        isInitializing: false, // 添加初始化状态
        selectedMap: {}, // 添加全局选中记录映射表
        selectedPagination: {
          pageNum: 1,
          pageSize: 10
        }
      }
    },
    computed: {
      // 计算分页后的已选列表数据
      paginatedSelectedList() {
        const start = (this.selectedPagination.pageNum - 1) * this.selectedPagination.pageSize
        const end = start + this.selectedPagination.pageSize
        return this.formData.towerUserList.slice(start, end)
      }
    },
    watch: {
      // 监听供电所变化，当供电所清空时，清空相关选择
      selectedDept(val) {
        if (!val) {
          this.formData.towerUserList = []
          this.selectedRows = []
          this.selectedCount = 0
          this.formData.isSelectAll = 0
          this.tableData = []
        }
      }
    },
    created() {
      this.getPowerSupplyTree()
    },
    methods: {
      // 获取供电所树形数据
      async getPowerSupplyTree() {
        try {
          // 日常巡视计划不需要传入type参数
          const res = await deptTreeSelect()
          this.powerSupplyTree = res.data || []
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },

      // 处理供电所选择变化
      async handleDeptChange(value) {
        console.log(
          'DailyInspectionPlan - handleDeptChange被调用，初始化状态:',
          this.isInitializing,
          '值:',
          value
        )

        // 如果正在初始化，直接返回，不执行任何操作
        if (this.isInitializing) {
          console.log('DailyInspectionPlan - 正在初始化中，跳过handleDeptChange中的请求操作')
          return
        }

        if (!value) {
          this.formData.towerUserList = []
          this.selectedRows = [] // 确保清空selectedRows
          this.selectedCount = 0
          this.formData.isSelectAll = 0
          this.tableData = []
          return
        }

        this.formData.powerSupply = value
        this.$emit('update:power-depts', value)

        // 查询台区列表
        await this.getAreaList()
      },

      // 获取台区列表
      async getAreaList() {
        if (!this.selectedDept) return

        this.tableLoading = true
        try {
          const params = {
            deptIdList: Array.isArray(this.selectedDept) ? this.selectedDept[0] : this.selectedDept,
            pageNum: this.pagination.pageNum,
            pageSize: this.pagination.pageSize
          }

          // 编辑时添加planId
          if (this.$route.params.id) {
            params.planId = this.$route.params.id
          }

          const res = await asyncGetAreaList(params)

          if (res.code === 200) {
            this.tableData = res.rows || []
            this.pagination.total = res.total || 0

            // 更新选中计数
            if (this.formData.isSelectAll === 1) {
              this.selectedCount = this.pagination.total
            } else {
              // 修改这里：同步更新 selectedRows 和 formData.towerUserList
              this.selectedCount = this.formData.towerUserList?.length || 0
              this.selectedRows = [...this.formData.towerUserList]
            }

            // 恢复选中状态
            this.$nextTick(() => {
              this.restoreSelection()
            })
          }
        } catch (error) {
          console.error('获取台区列表失败:', error)
          this.$message.error('获取台区列表失败')
        } finally {
          this.tableLoading = false
        }
      },

      // 处理分页变化
      handlePageChange(page) {
        this.pagination.pageNum = page
        this.getAreaList().then(() => {
          // 恢复选中状态
          this.restoreSelection()
        })
      },

      // 处理每页条数变化
      handleSizeChange(size) {
        this.pagination.pageSize = size
        this.pagination.pageNum = 1
        this.getAreaList().then(() => {
          // 恢复选中状态
          this.restoreSelection()
        })
      },

      handlePlanDataLoaded(data) {
        // 设置初始化标志位
        this.isInitializing = true

        if (data.powerIdList || data.powerIdList === 0) {
          this.formData.powerSupply = data.powerIdList
          this.formData.towerUserList = data.towerUserList || []
          this.formData.isSelectAll = Number(data.isSelectAll || 0)

          const deptId = Array.isArray(data.powerIdList) ? data.powerIdList[0] : data.powerIdList

          // 直接加载台区列表，避免重复调用API
          this.tableLoading = true

          asyncGetAreaList({
            deptIdList: deptId,
            pageNum: this.pagination.pageNum,
            pageSize: this.pagination.pageSize,
            planId: this.$route.params.id || ''
          })
            .then((areaRes) => {
              if (areaRes.code === 200) {
                this.tableData = areaRes.rows || []
                this.pagination.total = areaRes.total || 0

                // 更新选中计数和勾选状态
                if (this.formData.isSelectAll === 1) {
                  this.selectedCount = this.pagination.total
                } else {
                  this.selectedCount = this.formData.towerUserList?.length || 0
                  // 保存towerUserList到selectedRows，确保表单提交时有数据
                  this.selectedRows = [...this.formData.towerUserList]
                }

                // 设置勾选状态 - 增加延时确保DOM已更新完成
                setTimeout(() => {
                  if (this.$refs.table && this.formData.towerUserList?.length > 0) {
                    console.log(
                      '设置DailyInspection表格选中状态，项数：',
                      this.formData.towerUserList.length
                    )
                    // 先清空所有选中状态
                    this.$refs.table.clearSelection()

                    this.tableData.forEach((row) => {
                      // 使用更多字段进行匹配，提高匹配精度
                      const isSelected = this.formData.towerUserList.some((item) => {
                        return item.towerId && item.towerId === row.towerId
                      })
                      if (isSelected) {
                        this.$refs.table.toggleRowSelection(row, true)
                      }
                    })
                  }
                }, 100)
              }

              // 最后设置selectedDept，避免触发watch
              setTimeout(() => {
                this.selectedDept = deptId
                this.isInitializing = false
              }, 200)
            })
            .catch((error) => {
              console.error('加载数据失败:', error)
              this.isInitializing = false
            })
            .finally(() => {
              this.tableLoading = false
            })
        } else {
          // 其他情况处理
          this.formData.towerUserList = data.towerUserList || []
          this.formData.isSelectAll = Number(data.isSelectAll || 0)
          this.pagination.total = Number(data.total || 0)

          // 直接设置选中数据
          this.selectedRows = [...this.formData.towerUserList]
          this.selectedCount =
            this.formData.isSelectAll === 1
              ? this.pagination.total
              : this.formData.towerUserList?.length || 0

          this.isInitializing = false
        }
      },

      // 更新选中状态和表格勾选
      updateSelectionState() {
        if (this.formData.isSelectAll === 1) {
          this.selectedCount = this.pagination.total
          this.$nextTick(() => {
            this.$refs.table?.clearSelection()
          })
        } else {
          this.selectedCount = this.formData.towerUserList?.length || 0
          this.$nextTick(() => {
            if (this.formData.towerUserList.length && this.$refs.table) {
              this.$refs.table.clearSelection() // 先清空
              this.formData.towerUserList.forEach((item) => {
                const row = this.tableData.find((r) => r.formDataId === item.formDataId)
                if (row) {
                  this.$refs.table.toggleRowSelection(row, true)
                }
              })
            }
          })
        }
      },

      handleReset() {
        this.selectedDept = null
        this.formData = {
          towerUserList: [],
          powerSupply: null,
          isSelectAll: 0 // 重置全选状态
        }
        this.selectedRows = []
        this.selectedCount = 0
        this.tableData = []
        this.pagination.pageNum = 1
        this.pagination.total = 0
        this.selectedMap = {} // 清空全局选中记录
        this.$refs.table?.clearSelection()
        this.$emit('reset') // 确保调用父组件的 reset
      },

      async handleBeforeSubmit(formData) {
        if (!this.selectedDept) {
          return false
        }

        console.log('准备提交数据:', {
          isSelectAll: this.formData.isSelectAll,
          selectedCount: this.selectedCount,
          towerUserListLength: this.formData.towerUserList.length,
          selectedRowsLength: this.selectedRows.length
        })

        // 添加校验：如果未全选，则必须选择至少一个对象
        const finalSelectedCount =
          this.formData.isSelectAll === 1
            ? this.pagination.total
            : this.formData.towerUserList.length

        if (this.formData.isSelectAll !== 1 && finalSelectedCount === 0) {
          this.$message.warning('请至少选择一个巡视对象或勾选全选')
          return false
        }

        const dtoBlob = formData.get('dto')
        const submitData = JSON.parse(await dtoBlob.text())

        // 确保有formDataId
        submitData.formDataId = this.$refs.basePlan.formBasicInfo.formId
        if (!submitData.formDataId) {
          this.$message.warning('表单ID不能为空')
          return false
        }

        // 修改这里：将 powerIdList 和 deptIdList 都转换为字符串数组格式
        const deptId = Array.isArray(this.selectedDept)
          ? this.selectedDept[0].toString()
          : this.selectedDept.toString()

        submitData.powerIdList = [deptId]
        submitData.deptIdList = [deptId]
        submitData.isSelectAll = this.formData.isSelectAll || 0

        // 如果是全选，towerUserList 传空数组，否则传 selectedRows
        if (this.formData.isSelectAll === 1) {
          submitData.towerUserList = []
          submitData.total = this.pagination.total
        } else {
          submitData.towerUserList = [...this.formData.towerUserList]
          delete submitData.total
        }

        console.log('最终提交数据:', submitData)

        formData.set(
          'dto',
          new Blob([JSON.stringify(submitData)], {
            type: 'application/json'
          })
        )

        return true
      },

      normalizer(node) {
        return {
          id: node.id,
          label: node.label,
          children: node.children
        }
      },

      // 判断行是否已被选中
      isRowSelected(row) {
        return this.formData.towerUserList.some((item) => item.towerId === row.towerId)
      },

      // 选择一行数据
      handleSelect(row) {
        this.formData.towerUserList.push(row)
        this.selectedCount = this.formData.towerUserList.length
      },

      // 取消选择一行数据
      handleUnselect(row) {
        const index = this.formData.towerUserList.findIndex((item) => item.towerId === row.towerId)
        if (index !== -1) {
          this.formData.towerUserList.splice(index, 1)
          this.selectedCount = this.formData.towerUserList.length
        }
      },

      // 处理已选列表分页变化
      handleSelectedPageChange(page) {
        this.selectedPagination.pageNum = page
      },

      // 处理已选列表每页条数变化
      handleSelectedSizeChange(size) {
        this.selectedPagination.pageSize = size
        this.selectedPagination.pageNum = 1
      },

      // 处理表格选择变化
      handleSelectionChange(selection) {
        if (this.formData.isSelectAll !== 1) {
          this.selectedRows = selection
          this.selectedCount = selection.length

          // 更新全局选中记录
          const currentPageIds = this.tableData.map((row) => row.towerId)

          // 从全局记录中移除当前页已经不再选中的项
          currentPageIds.forEach((id) => {
            if (!selection.some((item) => item.towerId === id)) {
              delete this.selectedMap[id]
            }
          })

          // 添加当前页新选中的项
          selection.forEach((row) => {
            this.selectedMap[row.towerId] = true
          })
        }
      },

      // 恢复选中状态
      restoreSelection() {
        if (this.formData.isSelectAll === 1) return

        this.$nextTick(() => {
          if (this.$refs.table) {
            // 先清空所有选择
            this.$refs.table.clearSelection()

            // 恢复选中状态
            this.tableData.forEach((row) => {
              if (this.selectedMap[row.towerId]) {
                this.$refs.table.toggleRowSelection(row, true)
              }
            })
          }
        })
      },

      // 处理全选复选框变化
      handleSelectAllChange(value) {
        this.formData.isSelectAll = value // 更新 formData 中的状态

        if (value === 1) {
          // 全选模式
          this.selectedCount = this.pagination.total
          this.selectedRows = [] // 全选时清空具体选择项
          this.selectedMap = {} // 清空全局选中记录
          this.$refs.table.clearSelection() // 清空表格勾选
        } else {
          // 取消全选，恢复为手动选择模式
          this.selectedCount = 0
          this.selectedRows = []
          this.selectedMap = {} // 清空全局选中记录
          this.$refs.table.clearSelection()
        }
      }
    }
  }
</script>

<style lang="scss" scoped>
  .vue-treeselect {
    font-size: 14px;
  }
</style>
