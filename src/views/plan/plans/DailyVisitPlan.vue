<template>
  <base-plan
    :plan-type="'3'"
    ref="basePlan"
    @plan-data-loaded="handlePlanDataLoaded"
    @reset="handleReset"
    @before-submit="handleBeforeSubmit"
  >
    <template #plan-content>
      <div class="rounded bg-white shadow w-full p-4">
        <!-- 现有对象选择头部 -->
        <div class="font-bold pb-4 flex justify-between items-center">
          <div class="section-title">对象选择</div>
          <el-button
            type="primary"
            size="small"
            @click="openSystemDialog"
            :disabled="!!selectedDept"
            :title="selectedDept ? '已选择供电所数据源，不可使用对象选择' : ''"
          >
            <i class="el-icon-plus mr-1"></i>选择对象
          </el-button>
        </div>

        <!-- 供电所选择和表格部分 -->
        <div class="mb-4">
          <div class="flex mb-4">
            <el-form-item label="供电所">
              <div class="flex-1">
                <treeselect
                  style="width: 300px"
                  v-model="selectedDept"
                  :options="powerSupplyTree"
                  :normalizer="normalizer"
                  placeholder="选择供电所"
                  :clearable="true"
                  :disable-branch-nodes="true"
                  @input="handleDeptChange"
                />
              </div>
            </el-form-item>
          </div>

          <!-- 全选复选框 -->
          <div v-if="selectedDept" class="mb-4 flex items-center">
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

          <!-- 表格展示 -->
          <el-table
            v-if="selectedDept || formData.towerUserList.length > 0"
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
            <!-- 复选框列，只在通过供电所选择时显示 -->
            <el-table-column
              v-if="selectedDept"
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
            <el-table-column prop="userName" label="客户经理" min-width="120" />
            <el-table-column prop="visit" label="走访状态" min-width="100" />
          </el-table>

          <!-- 分页和选择信息 -->
          <div
            v-if="selectedDept || formData.towerUserList.length > 0"
            class="mt-2 flex justify-between items-center"
          >
            <div class="text-sm text-gray-500">
              已选择 <span class="text-blue-600 font-medium">{{ selectedCount }}</span> 项
              <span v-if="formData.isSelectAll === 1" class="ml-2">(已全选)</span>
              <!-- 添加数据来源提示 -->
              <span
                v-if="!selectedDept && formData.towerUserList.length > 0"
                class="ml-2 text-blue-500"
              >
                (系统内选择)
              </span>
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

        <!-- 系统内选择弹框 -->
        <el-dialog
          title="系统内对象选择"
          :visible.sync="systemDialogVisible"
          width="80%"
          :before-close="handleSystemDialogClose"
          append-to-body
        >
          <el-tabs v-model="activeTab">
            <!-- 系统内选择 tab -->
            <el-tab-pane label="系统内选择" name="system">
              <system-select
                v-model="tempTowerUserList"
                :plan-type="'3'"
                :is-visit="true"
                :power-depts.sync="formData.powerSupply"
                @update:selectedCount="(val) => (tempSelectedCount = val)"
                @update:total="(val) => (total = val)"
                @update:isSelectAll="(val) => (tempIsSelectAll = val)"
                ref="multipleTable"
              />
            </el-tab-pane>
            <!-- 上传模版-->
            <el-tab-pane label="上传模版" name="upload">
              <upload-template
                v-model="tempTowerUserList"
                :plan-type="'3'"
                @file-change="handleFileChange"
                @upload-success="handleUploadSuccess"
              />
            </el-tab-pane>
          </el-tabs>

          <!-- 弹框底部按钮 -->
          <span slot="footer" class="dialog-footer">
            <el-button @click="systemDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmSystemSelection">确定</el-button>
          </span>
        </el-dialog>
      </div>
    </template>
  </base-plan>
</template>

<script>
  import BasePlan from '../components/BasePlan.vue'
  import SystemSelect from '../components/SystemSelect.vue'
  import UploadTemplate from '../components/UploadTemplate.vue'
  import { deptTreeSelect } from '@/api/system/user'
  import { asyncGetCustomerListByDept } from '@/api/plan'
  import Treeselect from '@riophae/vue-treeselect'
  import '@riophae/vue-treeselect/dist/vue-treeselect.css'

  export default {
    name: 'DailyVisitPlan',
    components: {
      BasePlan,
      SystemSelect,
      UploadTemplate,
      Treeselect
    },
    data() {
      return {
        // 现有数据
        formData: {
          towerUserList: [],
          isSelectAll: 0,
          powerSupply: [], // 修改为数组
          towerIdList: []
        },
        selectedCount: 0,
        total: 0,
        systemDialogVisible: false,
        activeTab: 'system',
        tempTowerUserList: [],
        tempSelectedCount: 0,
        tempIsSelectAll: 0,
        uploadFile: null,

        // 新增数据
        powerSupplyTree: [],
        selectedDept: null,
        tableData: [],
        tableLoading: false,
        pagination: {
          pageNum: 1,
          pageSize: 10,
          total: 0
        },
        selectedRows: []
      }
    },
    created() {
      this.getPowerSupplyTree()
    },
    methods: {
      // 获取供电所树形数据
      async getPowerSupplyTree() {
        try {
          const res = await deptTreeSelect({ type: '1' })
          this.powerSupplyTree = res.data || []
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },

      // 添加处理计划数据加载的方法
      handlePlanDataLoaded(data) {
        if (data.deptIdList?.length) {
          // 如果有供电所数据，清空系统内选择的数据
          this.formData.powerSupply = [] // 重置为空数组
          this.tempTowerUserList = []
          this.tempSelectedCount = 0
          this.tempIsSelectAll = 0

          this.selectedDept = Array.isArray(data.deptIdList) ? data.deptIdList[0] : data.deptIdList
          this.handleDeptChange(this.selectedDept)
        } else if (data.powerIdList) {
          // 如果有系统内选择的数据，清空供电所选择
          this.selectedDept = null
          // 确保 powerSupply 是数组
          this.formData.powerSupply = Array.isArray(data.powerIdList)
            ? data.powerIdList
            : [data.powerIdList]
          this.formData.towerUserList = data.towerUserList || []
          this.tableData = this.formData.towerUserList
          this.pagination.total = this.formData.towerUserList.length
        }

        this.formData.isSelectAll = Number(data.isSelectAll || 0)
        this.selectedCount =
          data.isSelectAll === 1 ? data.total || 0 : data.towerUserList?.length || 0
        this.total = Number(data.total || 0)

        // 更新已选对象展示
        if (this.formData.isSelectAll !== 1 && this.$refs.table) {
          this.$nextTick(() => {
            this.formData.towerUserList.forEach((item) => {
              const row = this.tableData.find((r) => r.customId === item.customId)
              if (row) {
                this.$refs.table.toggleRowSelection(row, true)
              }
            })
          })
        }
      },

      // 处理供电所选择变化
      async handleDeptChange(value) {
        if (!value) {
          this.formData.towerUserList = []
          this.selectedCount = 0
          this.formData.isSelectAll = 0
          this.tableData = []
          this.formData.powerSupply = [] // 重置为空数组
          return
        }

        // 清空系统内选择的数据
        this.tempTowerUserList = []
        this.tempSelectedCount = 0
        this.tempIsSelectAll = 0

        // 确保 powerSupply 始终是数组
        this.formData.powerSupply = Array.isArray(value) ? value : [value]
        await this.getCustomerList()
      },

      // 获取客户列表
      async getCustomerList() {
        if (!this.selectedDept) return

        this.tableLoading = true
        try {
          const params = {
            deptIdList: this.selectedDept,
            pageNum: this.pagination.pageNum,
            pageSize: this.pagination.pageSize
          }

          const res = await asyncGetCustomerListByDept(params)
          if (res.code === 200) {
            this.tableData = res.rows || []
            this.pagination.total = res.total || 0

            // 更新选中计数
            if (this.formData.isSelectAll === 1) {
              this.selectedCount = this.pagination.total
            } else {
              this.selectedCount = this.formData.towerUserList?.length || 0
            }
          }
        } catch (error) {
          console.error('获取客户列表失败:', error)
          this.$message.error('获取客户列表失败')
        } finally {
          this.tableLoading = false
        }
      },

      // 处理全选变化
      handleSelectAllChange(value) {
        this.formData.isSelectAll = value
        if (value === 1) {
          this.selectedCount = this.pagination.total
          this.selectedRows = []
          this.$refs.table?.clearSelection()
        } else {
          this.selectedCount = 0
          this.selectedRows = []
          this.$refs.table?.clearSelection()
        }
      },

      // 处理表格选择变化
      handleSelectionChange(selection) {
        if (this.formData.isSelectAll !== 1) {
          this.selectedRows = selection
          this.formData.towerUserList = selection
          this.selectedCount = selection.length
        }
      },

      // 处理分页变化
      handlePageChange(page) {
        this.pagination.pageNum = page
        this.getCustomerList()
      },

      // 处理每页条数变化
      handleSizeChange(size) {
        this.pagination.pageSize = size
        this.pagination.pageNum = 1
        this.getCustomerList()
      },

      // Tree格式化
      normalizer(node) {
        const getDepth = (node, depth = 1) => {
          if (!node.children || node.children.length === 0) {
            return depth
          }
          return Math.max(...node.children.map((child) => getDepth(child, depth + 1)))
        }

        const processNode = (node, currentDepth = 1) => {
          const isLeaf = !node.children || node.children.length === 0
          let normalizedChildren = undefined

          if (node.children) {
            normalizedChildren = node.children.map((child) => processNode(child, currentDepth + 1))
          }

          // 如果当前节点在第四层，移除其子节点使其成为叶子节点
          if (currentDepth === 4) {
            normalizedChildren = undefined
          }

          return {
            id: node.id,
            label: node.label,
            children: normalizedChildren,
            // 只允许第四层且为叶子节点的节点可选
            disabled: currentDepth !== 4
          }
        }

        return processNode(node)
      },

      // 处理对象选择弹框打开
      openSystemDialog() {
        if (this.selectedDept) {
          this.$modal
            .confirm('切换到系统内选择将清空当前供电所选择的数据，是否继续？')
            .then(() => {
              this.selectedDept = null
              this.tableData = []
              this.systemDialogVisible = true
              this.tempTowerUserList = [...this.formData.towerUserList]
              this.tempSelectedCount = this.selectedCount
              this.tempIsSelectAll = this.formData.isSelectAll
            })
            .catch(() => {})
          return
        }
        this.systemDialogVisible = true
        this.tempTowerUserList = [...this.formData.towerUserList]
        this.tempSelectedCount = this.selectedCount
        this.tempIsSelectAll = this.formData.isSelectAll
      },

      // 修改现有的重置方法
      handleReset() {
        this.selectedDept = null
        this.formData = {
          towerUserList: [],
          isSelectAll: 0,
          powerSupply: [], // 修改为数组
          towerIdList: []
        }
        this.selectedCount = 0
        this.total = 0
        this.activeTab = 'system'
        this.uploadFile = null
        this.tableData = []
        this.pagination.pageNum = 1
        this.pagination.total = 0
        this.$refs.table?.clearSelection()
      },

      // 确认系统内选择
      confirmSystemSelection() {
        // 清空供电所选择
        this.selectedDept = null

        // 设置系统内选择的数据
        this.formData.towerUserList = [...this.tempTowerUserList]
        this.selectedCount = this.tempIsSelectAll === 1 ? this.total : this.tempSelectedCount
        this.formData.isSelectAll = this.tempIsSelectAll

        // 设置表格数据
        this.tableData = this.tempTowerUserList
        this.pagination.total = this.tempTowerUserList.length

        // 关闭弹窗并提示
        this.systemDialogVisible = false

        // 添加成功消息提示
        if (this.tempIsSelectAll === 1) {
          this.$message.success(`已全选${this.total}项对象`)
        } else if (this.tempTowerUserList.length > 0) {
          this.$message.success(`已选择${this.tempTowerUserList.length}项对象`)
        }
      },

      // 修改 handleBeforeSubmit 方法
      async handleBeforeSubmit(formData) {
        console.log('提交前数据检查:', {
          isSelectAll: this.formData.isSelectAll,
          hasUploadFile: !!this.uploadFile,
          towerUserListLength: this.formData.towerUserList.length,
          towerUserList: this.formData.towerUserList,
          formDataKeys: [...formData.keys()]
        })

        // 检查基本条件
        if (
          this.formData.isSelectAll !== 1 &&
          !this.uploadFile &&
          this.formData.towerUserList.length === 0
        ) {
          this.$message.error('请至少选择一个走访对象、勾选全选或上传模板文件')
          return false
        }

        try {
          const dtoBlob = formData.get('dto')
          if (!dtoBlob) {
            console.error('未找到dto数据')
            this.$message.error('表单数据获取失败')
            return false
          }

          const submitData = JSON.parse(await dtoBlob.text())
          console.log('解析后的提交数据:', submitData)

          // 检查必要字段
          if (!submitData.planName) {
            this.$message.error('请输入计划名称')
            return false
          }

          if (!submitData.planDesc) {
            this.$message.error('请输入计划描述')
            return false
          }

          submitData.isSelectAll = this.formData.isSelectAll
          submitData.towerUserList =
            this.formData.isSelectAll === 1 || this.uploadFile ? [] : this.formData.towerUserList
          submitData.powerIdList = this.formData.powerSupply
          submitData.towerIdList = this.formData.towerIdList

          if (this.formData.isSelectAll === 1) {
            submitData.total = this.total
          } else {
            delete submitData.total
          }

          if (formData.has('file')) {
            formData.delete('file')
          }

          if (this.uploadFile) {
            formData.append('file', this.uploadFile)
            submitData.isSelectAll = 0
            submitData.towerUserList = []
            delete submitData.total
            delete submitData.powerIdList
            delete submitData.towerIdList
          }

          console.log('最终提交数据:', submitData)

          formData.set(
            'dto',
            new Blob([JSON.stringify(submitData)], {
              type: 'application/json'
            })
          )

          return true
        } catch (error) {
          console.error('处理提交数据时出错:', error)
          this.$message.error(`提交数据处理失败: ${error.message || '未知错误'}`)
          return false
        }
      },

      handleSystemDialogClose(done) {
        this.$confirm('确认关闭？未保存的选择将会丢失')
          .then(() => done())
          .catch(() => {})
      },
      removeSelectedItem(item) {
        const index = this.formData.towerUserList.findIndex((i) => i.customId === item.customId)
        if (index !== -1) {
          this.formData.towerUserList.splice(index, 1)
          this.selectedCount -= 1
          if (this.formData.isSelectAll === 1) {
            this.formData.isSelectAll = 0
          }
        }
      },
      handleUploadSuccess() {
        this.selectedCount = 0
        this.formData.towerUserList = []
      },
      handleFileChange(file) {
        this.uploadFile = file
      }
    }
  }
</script>
