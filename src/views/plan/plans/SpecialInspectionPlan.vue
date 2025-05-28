<template>
  <base-plan
    :plan-type="'2'"
    ref="basePlan"
    @plan-data-loaded="handlePlanDataLoaded"
    @reset="handleReset"
    @before-submit="handleBeforeSubmit"
  >
    <template #plan-content>
      <div class="rounded bg-white shadow w-full p-4 min-h-[650px]">
        <div class="flex gap-4">
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

          <!-- 添加所属台区筛选输入框 -->
          <el-form-item label="所属台区">
            <el-input
              v-model="towerNameFilter"
              placeholder="输入台区名称筛选"
              clearable
              @input="handleTowerNameChange"
              @clear="handleTowerNameClear"
              style="width: 220px"
            />
          </el-form-item>

          <!-- 网格员选择 -->
          <el-form-item label="网格员" required>
            <el-select
              v-model="selectedUser"
              filterable
              clearable
              placeholder="请先选择供电所"
              :loading="userListLoading"
              :disabled="!selectedDept"
              @change="handleUserChange"
            >
              <el-option
                v-for="item in userList"
                :key="item.userId"
                :label="item.nickName"
                :value="item.userId"
              />
            </el-select>
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
                  label="台区名称"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="towerId"
                  label="台区编号"
                  min-width="120"
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
                  label="台区名称"
                  min-width="150"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="towerId"
                  label="台区编号"
                  min-width="120"
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
  import { asyncGetXsWorkOrders, asyncGetUserListByDept } from '@/api/plan'
  import Treeselect from '@riophae/vue-treeselect'
  import '@riophae/vue-treeselect/dist/vue-treeselect.css'

  export default {
    name: 'SpecialInspectionPlan',
    components: {
      BasePlan,
      Treeselect
    },
    data() {
      return {
        powerSupplyTree: [],
        selectedDept: null,
        towerNameFilter: '', // 添加台区名称筛选
        userList: [],
        selectedUser: null,
        userListLoading: false,
        formData: {
          towerUserList: [],
          powerSupply: null,
          isSelectAll: 0
        },
        searchTimer: null, // 搜索防抖定时器
        tableLoading: false,
        tableData: [],
        pagination: {
          total: 0,
          pageNum: 1,
          pageSize: 10
        },
        selectedRows: [],
        selectedCount: 0,
        isInitializing: false,
        // 添加全局选中记录映射表
        selectedMap: {},
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
      selectedDept(val) {
        if (!val) {
          this.selectedUser = null
          this.userList = []
        }
      }
    },
    created() {
      this.getPowerSupplyTree()
    },
    methods: {
      async getPowerSupplyTree() {
        try {
          const res = await deptTreeSelect()
          this.powerSupplyTree = res.data || []
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },

      // 处理台区名称筛选变化
      handleTowerNameChange() {
        // 清除之前的定时器
        if (this.searchTimer) {
          clearTimeout(this.searchTimer)
        }

        // 设置防抖延迟
        this.searchTimer = setTimeout(() => {
          this.pagination.pageNum = 1 // 重置页码
          this.getWorkOrderList() // 重新获取数据
        }, 500) // 500ms防抖
      },

      // 处理台区名称筛选清空
      handleTowerNameClear() {
        this.towerNameFilter = ''
        this.pagination.pageNum = 1 // 重置页码
        this.getWorkOrderList() // 重新获取数据
      },

      async handleDeptChange(value) {
        if (this.isInitializing) {
          return
        }

        if (!value) {
          this.selectedUser = null
          this.userList = []
          this.formData.towerUserList = []
          this.selectedRows = []
          this.selectedCount = 0
          this.formData.isSelectAll = 0
          this.tableData = []
          return
        }

        this.towerNameFilter = '' // 清空台区筛选
        this.formData.powerSupply = value
        this.$emit('update:power-depts', value)

        await this.getUserList()
        await this.getWorkOrderList()
      },

      async getUserList() {
        if (!this.selectedDept) return

        this.userListLoading = true
        try {
          const res = await asyncGetUserListByDept(
            Array.isArray(this.selectedDept) ? this.selectedDept[0] : this.selectedDept
          )

          if (res.code === 200) {
            this.userList = res.data || []
          }
        } catch (error) {
          console.error('获取网格员列表失败:', error)
          this.$message.error('获取网格员列表失败')
        } finally {
          this.userListLoading = false
        }
      },

      handleUserChange(value) {
        if (value) {
          this.selectedUser = value
          this.getWorkOrderList()
        } else {
          this.selectedUser = null
        }
      },

      async getWorkOrderList() {
        if (!this.selectedDept) return

        this.tableLoading = true
        try {
          const params = {
            deptIdList: Array.isArray(this.selectedDept) ? this.selectedDept[0] : this.selectedDept,
            pageNum: this.pagination.pageNum,
            pageSize: this.pagination.pageSize,
            towerName: this.towerNameFilter || '' // 添加台区名称筛选参数
          }

          if (this.$route.params.id) {
            params.planId = this.$route.params.id
          }

          const res = await asyncGetXsWorkOrders(params)

          if (res.code === 200) {
            this.tableData = res.rows || []
            this.pagination.total = res.total || 0

            if (this.formData.isSelectAll === 1) {
              this.selectedCount = this.pagination.total
            } else {
              this.selectedCount = this.formData.towerUserList?.length || 0
            }

            this.$nextTick(() => {
              this.updateSelectionState()
            })
          }
        } catch (error) {
          console.error('获取工单列表失败:', error)
          this.$message.error('获取工单列表失败')
        } finally {
          this.tableLoading = false
        }
      },

      handlePageChange(page) {
        this.pagination.pageNum = page
        this.getWorkOrderList().then(() => {
          // 恢复选中状态
          this.restoreSelection()
        })
      },

      handleSizeChange(size) {
        this.pagination.pageSize = size
        this.pagination.pageNum = 1
        this.getWorkOrderList().then(() => {
          // 恢复选中状态
          this.restoreSelection()
        })
      },

      handleSelectionChange(selection) {
        if (this.formData.isSelectAll !== 1) {
          this.selectedRows = selection
          this.selectedCount = selection.length

          // 更新全局选中记录
          const currentPageIds = this.tableData.map((row) => row.formDataId)

          // 从全局记录中移除当前页已经不再选中的项
          currentPageIds.forEach((id) => {
            if (!selection.some((item) => item.formDataId === id)) {
              delete this.selectedMap[id]
            }
          })

          // 添加当前页新选中的项
          selection.forEach((row) => {
            this.selectedMap[row.formDataId] = true
          })
        }
      },

      handleSelectAllChange(value) {
        this.formData.isSelectAll = value
        if (value === 1) {
          this.selectedCount = this.pagination.total
          this.selectedRows = []
          this.$refs.table.clearSelection()
        } else {
          this.selectedCount = 0
          this.selectedRows = []
          this.$refs.table.clearSelection()
        }
      },

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
              this.$refs.table.clearSelection()
              this.tableData.forEach((row) => {
                const isSelected = this.formData.towerUserList.some((item) => {
                  return item.formDataId === row.formDataId // 修改为使用 formDataId 匹配
                })
                if (isSelected) {
                  this.$refs.table.toggleRowSelection(row, true)
                }
              })
            }
          })
        }
      },

      // 添加恢复选中状态的方法
      restoreSelection() {
        if (this.formData.isSelectAll === 1) return

        this.$nextTick(() => {
          if (this.$refs.table) {
            // 先清空所有选择
            this.$refs.table.clearSelection()

            // 恢复选中状态
            this.tableData.forEach((row) => {
              if (this.selectedMap[row.formDataId]) {
                this.$refs.table.toggleRowSelection(row, true)
              }
            })
          }
        })
      },

      async handlePlanDataLoaded(data) {
        this.isInitializing = true

        // 清空台区筛选
        this.towerNameFilter = ''

        // 加载部门数据
        if (data.department) {
          this.selectedDepartment = data.department
          this.formData.department = data.department
        }

        if (data.powerIdList || data.powerIdList === 0) {
          this.formData.powerSupply = data.powerIdList
          this.formData.towerUserList = data.towerUserList || []
          this.formData.isSelectAll = Number(data.isSelectAll || 0)

          const deptId = Array.isArray(data.powerIdList) ? data.powerIdList[0] : data.powerIdList
          const userId = data.userId

          this.userListLoading = true
          Promise.all([
            asyncGetUserListByDept(deptId),
            asyncGetXsWorkOrders({
              deptIdList: deptId,
              pageNum: this.pagination.pageNum,
              pageSize: this.pagination.pageSize,
              planId: this.$route.params.id || ''
            })
          ])
            .then(([userRes, orderRes]) => {
              if (userRes.code === 200) {
                this.userList = userRes.data || []
                if (userId && this.userList.length) {
                  this.selectedUser =
                    this.userList.find((user) => String(user.userId) === String(userId))?.userId ||
                    null
                }
              }

              if (orderRes.code === 200) {
                this.tableData = orderRes.rows || []
                this.pagination.total = orderRes.total || 0

                if (this.formData.isSelectAll === 1) {
                  this.selectedCount = this.pagination.total
                } else {
                  this.selectedCount = this.formData.towerUserList?.length || 0
                  this.selectedRows = [...this.formData.towerUserList]
                }

                setTimeout(() => {
                  if (this.$refs.table && this.formData.towerUserList?.length > 0) {
                    console.log(
                      '设置特殊巡视表格选中状态，项数：',
                      this.formData.towerUserList.length
                    )
                    this.$refs.table.clearSelection()

                    this.tableData.forEach((row) => {
                      const isSelected = this.formData.towerUserList.some((item) => {
                        return item.formDataId === row.formDataId // 修改为使用 formDataId 匹配
                      })
                      if (isSelected) {
                        this.$refs.table.toggleRowSelection(row, true)
                      }
                    })
                  }
                }, 100)
              }

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
              this.userListLoading = false
              this.tableLoading = false
            })
        } else {
          this.formData.towerUserList = data.towerUserList || []
          this.formData.isSelectAll = Number(data.isSelectAll || 0)
          this.pagination.total = Number(data.total || 0)
          this.selectedRows = [...this.formData.towerUserList]
          this.selectedCount =
            this.formData.isSelectAll === 1
              ? this.pagination.total
              : this.formData.towerUserList?.length || 0
          this.isInitializing = false
        }
      },

      handleReset() {
        this.selectedDept = null
        this.selectedUser = null
        this.towerNameFilter = '' // 重置台区筛选
        this.userList = []
        this.formData = {
          towerUserList: [],
          powerSupply: null,
          isSelectAll: 0
        }
        this.selectedRows = []
        this.selectedCount = 0
        this.tableData = []
        this.pagination.pageNum = 1
        this.pagination.total = 0
        this.$refs.table?.clearSelection()
        this.$emit('reset')
      },

      async handleBeforeSubmit(formData) {
        if (!this.selectedDept || !this.selectedUser) {
          this.$message.warning('请选择必填项')
          return false
        }
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

        submitData.formDataId = this.$refs.basePlan.formBasicInfo.formId
        submitData.isSelectAll = this.formData.isSelectAll || 0

        // 添加部门字段
        if (this.selectedDepartment) {
          submitData.department = this.selectedDepartment
        }

        const deptId = Array.isArray(this.selectedDept)
          ? this.selectedDept[0].toString()
          : this.selectedDept.toString()
        submitData.powerIdList = [deptId]
        submitData.deptIdList = [deptId]
        submitData.userId = this.selectedUser

        if (this.formData.isSelectAll === 1) {
          submitData.towerUserList = []
          submitData.total = this.pagination.total
        } else {
          submitData.towerUserList = this.formData.towerUserList.map((row) => ({
            ...row,
            userId: this.selectedUser
          }))
          delete submitData.total
        }

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
        return this.formData.towerUserList.some((item) => item.formDataId === row.formDataId)
      },

      // 选择一行数据
      handleSelect(row) {
        this.formData.towerUserList.push({
          ...row,
          userId: this.selectedUser // 添加网格员ID
        })
        this.selectedCount = this.formData.towerUserList.length
      },

      // 取消选择一行数据
      handleUnselect(row) {
        const index = this.formData.towerUserList.findIndex(
          (item) => item.formDataId === row.formDataId
        )
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
      }
    },
    beforeDestroy() {
      // 清理定时器
      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }
    }
  }
</script>

<style lang="scss" scoped>
  .vue-treeselect {
    font-size: 14px;
  }
</style>
