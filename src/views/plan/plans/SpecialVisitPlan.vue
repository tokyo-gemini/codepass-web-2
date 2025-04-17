<template>
  <base-plan
    :plan-type="'4'"
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

          <!-- 网格员选择 - 添加禁用逻辑 -->
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
          <el-table-column prop="customName" label="客户名称" min-width="200" />
          <el-table-column prop="customId" label="客户编号" min-width="150" />
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
  import { asyncGetUserListByDept, asyncGetWorkOrders } from '@/api/plan'
  import Treeselect from '@riophae/vue-treeselect'
  import '@riophae/vue-treeselect/dist/vue-treeselect.css'

  export default {
    name: 'SpecialVisitPlan',
    components: {
      BasePlan,
      Treeselect
    },
    data() {
      return {
        powerSupplyTree: [], // 供电所树形数据
        selectedDept: null, // 选中的供电所
        userList: [], // 网格员列表
        selectedUser: null, // 选中的网格员
        userListLoading: false, // 网格员列表加载状态
        formData: {
          towerUserList: [],
          powerSupply: null,
          isSelectAll: 0 // 添加全选状态
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
        isInitializing: false
      }
    },
    watch: {
      // 监听供电所变化，当供电所清空时，清空网格员选择
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
      // 获取供电所树形数据
      async getPowerSupplyTree() {
        try {
          // 特殊走访计划不需要传入type参数
          const res = await deptTreeSelect()
          this.powerSupplyTree = res.data || []
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },

      // 处理供电所选择变化
      async handleDeptChange(value) {
        // 处理清空供电所的情况
        if (!value) {
          this.selectedUser = null
          this.userList = []
          this.formData.towerUserList = []
          this.selectedRows = []
          this.selectedCount = 0
          this.formData.isSelectAll = 0
          return
        }

        // 初始化时不清空数据
        if (this.isInitializing) {
          this.formData.powerSupply = value
          this.$emit('update:power-depts', value)

          // 加载网格员列表
          this.selectedUser = null
          this.userList = []
          this.userListLoading = true
          try {
            // 确保传入的是单个ID而不是数组
            const deptId = Array.isArray(value) ? value[0] : value
            const res = await asyncGetUserListByDept(deptId)
            if (res.code === 200) {
              this.userList = res.data || []
            }
          } catch (error) {
            console.error('获取网格员列表失败:', error)
          } finally {
            this.userListLoading = false
          }

          // 查询工单列表
          await this.getWorkOrderList()
          return
        }

        // 移除确认对话框和清空逻辑
        this.selectedUser = null
        this.userList = []
        this.userListLoading = true
        try {
          // 确保传入的是单个ID而不是数组
          const deptId = Array.isArray(value) ? value[0] : value
          const res = await asyncGetUserListByDept(deptId)
          if (res.code === 200) {
            this.userList = res.data || []
          }
        } catch (error) {
          console.error('获取网格员列表失败:', error)
        } finally {
          this.userListLoading = false
        }

        this.formData.powerSupply = value
        this.$emit('update:power-depts', value)

        // 查询工单列表
        await this.getWorkOrderList()
      },

      // 获取工单列表
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

          const res = await asyncGetWorkOrders(params)

          if (res.code === 200) {
            this.tableData = res.rows || []
            this.pagination.total = res.total || 0

            // 修改编辑时的回显选中逻辑
            if (this.$route.params.id) {
              this.$nextTick(() => {
                this.tableData.forEach((row) => {
                  // 根据 towerUserList 判断是否选中
                  const isSelected = this.formData.towerUserList?.some(
                    (item) => item.customId === row.customId
                  )
                  if (isSelected) {
                    this.$refs.table.toggleRowSelection(row, true)
                  }
                })
              })
            }

            // 更新选中计数
            if (this.formData.isSelectAll === 1) {
              this.selectedCount = this.pagination.total
            } else {
              this.selectedCount = this.formData.towerUserList?.length || 0
            }
          }
        } catch (error) {
          console.error('获取工单列表失败:', error)
          this.$message.error('获取工单列表失败')
        } finally {
          this.tableLoading = false
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

      // 处理分页变化
      handlePageChange(page) {
        this.pagination.pageNum = page
        this.getWorkOrderList()
      },

      // 处理每页条数变化
      handleSizeChange(size) {
        this.pagination.pageSize = size
        this.pagination.pageNum = 1
        this.getWorkOrderList()
      },

      // 处理网格员选择变化
      handleUserChange(value) {
        // 可以在这里处理网格员选择变化的逻辑
      },

      // 处理表格选择变化
      handleSelectionChange(selection) {
        // 只有在非全选状态下才更新 selectedRows 和 selectedCount
        if (this.formData.isSelectAll !== 1) {
          this.selectedRows = selection
          this.selectedCount = selection.length
        }
      },

      // 处理全选复选框变化
      handleSelectAllChange(value) {
        this.formData.isSelectAll = value // 更新 formData 中的状态

        if (value === 1) {
          // 全选模式
          this.selectedCount = this.pagination.total
          this.selectedRows = [] // 全选时清空具体选择项
          this.$refs.table.clearSelection() // 清空表格勾选
        } else {
          // 取消全选，恢复为手动选择模式
          this.selectedCount = 0
          this.selectedRows = []
          this.$refs.table.clearSelection()
        }
      },

      handlePlanDataLoaded(data) {
        console.log('SpecialVisitPlan - 开始处理计划数据')
        this.isInitializing = true

        if (data.powerIdList || data.powerIdList === 0) {
          this.formData.powerSupply = data.powerIdList
          this.formData.towerUserList = data.towerUserList || []
          this.formData.isSelectAll = Number(data.isSelectAll || 0)

          const deptId = Array.isArray(data.powerIdList) ? data.powerIdList[0] : data.powerIdList
          const userId = data.userId

          // 直接加载网格员列表和工单列表，避免重复调用API
          this.userListLoading = true

          // 设置选中部门但不触发watch
          setTimeout(() => {
            // 使用nextTick确保设置selectedDept不会触发handleDeptChange
            this.$nextTick(() => {
              this.selectedDept = deptId
            })
          }, 0)

          // 并行执行两个请求
          Promise.all([
            asyncGetUserListByDept(deptId),
            asyncGetWorkOrders({
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
                  // 直接使用后台返回的userId
                  this.selectedUser =
                    this.userList.find((user) => String(user.userId) === String(userId))?.userId ||
                    null
                }
              }

              if (orderRes.code === 200) {
                this.tableData = orderRes.rows || []
                this.pagination.total = orderRes.total || 0

                // 更新选中计数和勾选状态
                if (this.formData.isSelectAll === 1) {
                  this.selectedCount = this.pagination.total
                } else {
                  this.selectedCount = this.formData.towerUserList?.length || 0
                  // 保存towerUserList到selectedRows，确保表单提交时有数据
                  this.selectedRows = [...this.formData.towerUserList]
                }

                // 设置勾选状态 - 添加延迟保证DOM更新完成
                setTimeout(() => {
                  if (this.$refs.table && this.formData.towerUserList?.length > 0) {
                    console.log('设置表格选中状态，项数：', this.formData.towerUserList.length)
                    // 先清空所有选择
                    this.$refs.table.clearSelection()

                    this.tableData.forEach((row) => {
                      // 增加更多匹配条件，确保能找到对应项
                      const isSelected = this.formData.towerUserList.some((item) => {
                        return (
                          (item.customId && item.customId === row.customId) ||
                          (item.towerId && item.towerId === row.towerId)
                        )
                      })
                      if (isSelected) {
                        this.$refs.table.toggleRowSelection(row, true)
                      }
                    })
                  }
                }, 100)
              }

              // 最后设置isInitializing
              setTimeout(() => {
                this.isInitializing = false
                console.log('SpecialVisitPlan - 处理计划数据完成')
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
          console.log('SpecialVisitPlan - 处理计划数据完成(其他情况)')
        }
      },

      handleReset() {
        this.selectedDept = null
        this.selectedUser = null
        this.userList = []
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
        this.$refs.table?.clearSelection()
        this.$emit('reset') // 确保调用父组件的 reset
      },

      async handleBeforeSubmit(formData) {
        if (!this.selectedDept || !this.selectedUser) {
          this.$message.warning('请选择供电所和网格员')
          return false
        }
        // 添加校验：如果未全选，则必须选择至少一个对象
        if (this.formData.isSelectAll !== 1 && this.selectedRows.length === 0) {
          this.$message.warning('请至少选择一个走访对象或勾选全选')
          return false
        }

        const dtoBlob = formData.get('dto')
        const submitData = JSON.parse(await dtoBlob.text())

        submitData.formDataId = this.$refs.basePlan.formBasicInfo.formId
        submitData.isSelectAll = this.formData.isSelectAll || 0

        const deptId = Array.isArray(this.selectedDept)
          ? this.selectedDept[0].toString()
          : this.selectedDept.toString()
        submitData.powerIdList = [deptId]
        submitData.deptIdList = [deptId]
        submitData.userId = this.selectedUser // 保留userId

        if (this.formData.isSelectAll === 1) {
          submitData.towerUserList = []
          submitData.total = this.pagination.total
        } else {
          // 只保留原始数据和userId，不添加formDataId
          submitData.towerUserList = this.selectedRows.map((row) => ({
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
      }
    }
  }
</script>

<style lang="scss" scoped>
  .vue-treeselect {
    font-size: 14px;
  }
</style>
