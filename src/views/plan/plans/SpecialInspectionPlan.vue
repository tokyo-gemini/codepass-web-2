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
                :label="item.userName"
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

        <!-- 工单表格 -->
        <el-table
          ref="table"
          :data="tableData"
          :loading="tableLoading"
          border
          stripe
          size="small"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
          @selection-change="handleSelectionChange"
        >
          <el-table-column
            type="selection"
            width="55"
            :selectable="(row) => formData.isSelectAll !== 1"
          />
          <el-table-column prop="provinceName" label="所属省份" min-width="120" />
          <el-table-column prop="areaName" label="所属供电单位" min-width="150" />
          <el-table-column prop="companyName" label="所属城市" min-width="120" />
          <el-table-column prop="powerName" label="所属供电所" min-width="150" />
          <el-table-column prop="userName" label="台区经理" min-width="120" />
          <el-table-column prop="visit" label="走访状态" min-width="100" />
        </el-table>

        <!-- 分页和选择信息 -->
        <div class="mt-2 flex justify-between items-center">
          <div class="text-sm text-gray-500">
            已选择 <span class="text-blue-600 font-medium">{{ selectedCount }}</span> 项
            <span v-if="formData.isSelectAll === 1" class="ml-2">(已全选)</span>
          </div>
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
        userList: [],
        selectedUser: null,
        userListLoading: false,
        formData: {
          towerUserList: [],
          powerSupply: null,
          isSelectAll: 0
        },
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
        selectedMap: {}
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
            pageSize: this.pagination.pageSize
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
        if (!this.selectedDept) {
          this.$message.warning('请选择供电所')
          return false
        }
        // 添加校验：必须选择网格员
        if (!this.selectedUser) {
          this.$message.warning('请选择网格员')
          return false
        }
        // 添加校验：如果未全选，则必须选择至少一个对象
        if (this.formData.isSelectAll !== 1 && this.selectedRows.length === 0) {
          this.$message.warning('请至少选择一个巡视对象或勾选全选')
          return false
        }

        const dtoBlob = formData.get('dto')
        const submitData = JSON.parse(await dtoBlob.text())

        const formDataId = this.$refs.basePlan.formBasicInfo.formId
        if (!formDataId) {
          this.$message.warning('表单ID不能为空')
          return false
        }

        submitData.isSelectAll = this.formData.isSelectAll

        const deptId = Array.isArray(this.selectedDept)
          ? this.selectedDept[0].toString()
          : this.selectedDept.toString()
        submitData.powerIdList = [deptId]
        submitData.deptIdList = [deptId]

        // 如果是全选, towerUserList 传空数组, 否则传 selectedRows
        if (this.formData.isSelectAll === 1) {
          submitData.towerUserList = []
          submitData.total = this.pagination.total
        } else {
          // 添加userId到每个选中的巡视对象
          submitData.towerUserList = this.selectedRows.map((row) => ({
            ...row,
            userId: this.selectedUser // 添加选中的网格员ID
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
      }
    }
  }
</script>

<style lang="scss" scoped>
  .vue-treeselect {
    font-size: 14px;
  }
</style>
