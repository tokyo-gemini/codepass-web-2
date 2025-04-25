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

        <!-- 表格区域 - 根据全选状态显示/隐藏 -->
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
                <el-table-column prop="customName" label="客户名称" show-overflow-tooltip />
                <el-table-column prop="customId" label="客户编号" show-overflow-tooltip />
                <el-table-column prop="provinceName" label="所属省份" show-overflow-tooltip />
                <el-table-column prop="areaName" label="所属城市" show-overflow-tooltip />
                <el-table-column prop="companyName" label="所属单位区县" show-overflow-tooltip />
                <el-table-column prop="powerName" label="所属供电单位" show-overflow-tooltip />
                <el-table-column prop="userName" label="台区经理" show-overflow-tooltip />
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
                <span class="text-sm text-gray-500 ml-2"> (共 {{ selectedCount }} 项) </span>
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
                <el-table-column prop="customName" label="客户名称" show-overflow-tooltip />
                <el-table-column prop="customId" label="客户编号" show-overflow-tooltip />
                <el-table-column prop="provinceName" label="所属省份" show-overflow-tooltip />
                <el-table-column prop="areaName" label="所属城市" show-overflow-tooltip />
                <el-table-column prop="companyName" label="所属单位区县" show-overflow-tooltip />
                <el-table-column prop="powerName" label="所属供电单位" show-overflow-tooltip />
                <el-table-column prop="userName" label="台区经理" show-overflow-tooltip />
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
        selectedCount: 0, // 添加选中计数
        isInitializing: false,
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
          this.selectedCount = 0
          this.formData.isSelectAll = 0
          return
        }

        this.selectedUser = null
        this.userList = []
        this.selectedCount = 0
        this.formData.isSelectAll = 0

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

            // 更新选中计数 - 全选时使用 total，否则使用 towerUserList 大小
            if (this.formData.isSelectAll === 1) {
              this.selectedCount = this.pagination.total
            } else {
              this.selectedCount = this.formData.towerUserList.length
            }
          }
        } catch (error) {
          console.error('获取工单列表失败:', error)
          this.$message.error('获取工单列表失败')
        } finally {
          this.tableLoading = false
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

      // 判断行是否已被选中
      isRowSelected(row) {
        return this.formData.towerUserList.some((item) => item.customId === row.customId)
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
          (item) => item.customId === row.customId
        )
        if (index !== -1) {
          this.formData.towerUserList.splice(index, 1)
          this.selectedCount = this.formData.towerUserList.length
        }
      },

      // 处理全选变化
      handleSelectAllChange(value) {
        this.formData.isSelectAll = value
        if (value === 1) {
          // 全选模式
          this.selectedCount = this.pagination.total
          this.formData.towerUserList = [] // 清空已选列表
        } else {
          // 取消全选
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
        this.selectedPagination.pageNum = 1 // 切换每页条数时重置为第一页
      },

      handlePlanDataLoaded(data) {
        console.log('SpecialVisitPlan - 开始处理计划数据')
        this.isInitializing = true

        if (data.powerIdList || data.powerIdList === 0) {
          this.formData.powerSupply = data.powerIdList
          this.formData.towerUserList = data.towerUserList || [] // 原始选中列表
          this.formData.isSelectAll = Number(data.isSelectAll || 0)

          const deptId = Array.isArray(data.powerIdList) ? data.powerIdList[0] : data.powerIdList
          const userId = data.userId

          // 直接加载网格员列表和工单列表，避免重复调用API
          this.userListLoading = true

          // 设置选中部门但不触发watch
          setTimeout(() => {
            this.$nextTick(() => {
              this.selectedDept = deptId
            })
          }, 0)

          // 并行执行两个请求
          Promise.all([
            asyncGetUserListByDept(deptId),
            asyncGetWorkOrders({
              deptIdList: deptId,
              pageNum: this.pagination.pageNum, // 使用当前分页
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

                // 更新选中计数和勾选状态
                if (this.formData.isSelectAll === 1) {
                  this.selectedCount = this.pagination.total
                } else {
                  this.selectedCount = this.formData.towerUserList.length
                }
              } else {
                this.$message.error(orderRes.msg || '获取工单列表失败')
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
          // 处理没有 powerIdList 的情况 (例如从系统对象选择)
          this.formData.towerUserList = data.towerUserList || []
          this.formData.isSelectAll = Number(data.isSelectAll || 0)
          this.selectedCount = this.formData.towerUserList.length

          this.isInitializing = false
          console.log('SpecialVisitPlan - 处理计划数据完成(无供电所)')
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
        this.selectedCount = 0
        this.tableData = []
        this.pagination.pageNum = 1
        this.pagination.total = 0
        this.selectedPagination = {
          pageNum: 1,
          pageSize: 10
        }
        this.$emit('reset') // 确保调用父组件的 reset
      },

      async handleBeforeSubmit(formData) {
        if (!this.selectedDept || !this.selectedUser) {
          this.$message.warning('请选择供电所和网格员')
          return false
        }
        // 添加校验：如果未全选，则必须选择至少一个对象
        const finalSelectedCount =
          this.formData.isSelectAll === 1
            ? this.pagination.total
            : this.formData.towerUserList.length
        if (this.formData.isSelectAll !== 1 && finalSelectedCount === 0) {
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
          submitData.towerUserList = [] // 全选时不传递具体列表
          submitData.total = this.pagination.total
        } else {
          // 非全选时，提交 towerUserList 中的所有数据
          submitData.towerUserList = this.formData.towerUserList.map((row) => ({
            ...row,
            userId: this.selectedUser // 确保每个对象都有 userId
          }))
          delete submitData.total // 非全选不传 total
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

  .el-button.is-disabled {
    color: #c0c4cc;
    cursor: not-allowed;
  }
</style>
