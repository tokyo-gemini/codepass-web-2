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
            v-if="!$route.params.id"
            type="primary"
            size="small"
            @click="openSystemDialog"
            :disabled="selectedDept && selectedDept.length > 0"
            :title="
              selectedDept && selectedDept.length > 0 ? '已选择供电所数据源，不可使用对象选择' : ''
            "
          >
            <i class="el-icon-plus mr-1"></i>选择对象
          </el-button>
        </div>

        <!-- 供电所选择和表格部分 -->
        <div class="mb-4">
          <div class="flex mb-4">
            <el-form-item label="供电所">
              <div class="flex-1">
                <visit-treeselect
                  style="width: 300px"
                  v-model="selectedDept"
                  :options="powerSupplyTree"
                  placeholder="选择供电所"
                  @change="handleDeptChangeWithLabel"
                />
              </div>
            </el-form-item>
          </div>

          <!-- 全选复选框 -->
          <div v-if="selectedDept && selectedDept.length > 0" class="mb-4 flex items-center">
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

          <!-- 表格区域 - 供电所选择和系统内选择使用不同的布局 -->
          <template v-if="selectedDept && selectedDept.length > 0 && formData.isSelectAll !== 1">
            <!-- 供电所选择时显示左右布局 -->
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
                    prop="customName"
                    label="客户名称"
                    min-width="200"
                    show-overflow-tooltip
                  />
                  <el-table-column
                    prop="customId"
                    label="客户编号"
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
                    label="客户经理"
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
                    prop="customName"
                    label="客户名称"
                    min-width="200"
                    show-overflow-tooltip
                  />
                  <el-table-column
                    prop="customId"
                    label="客户编号"
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
                    label="客户经理"
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

          <template v-else-if="formData.isSelectAll === 1">
            <!-- 全选时的提示 -->
            <div class="text-center py-8 text-gray-500">
              <i class="el-icon-info text-xl mr-2"></i>
              已全选当前条件下的所有对象 (共 {{ pagination.total }} 项)
            </div>
          </template>

          <template v-else>
            <!-- 选择所属单位时只显示已选列表，使用与对象选择相同的树形选择器逻辑 -->
            <div class="w-full">
              <div class="font-medium mb-2">
                已选对象
                <span class="text-sm text-gray-500 ml-2">(共 {{ selectedCount }} 项)</span>
                <span class="ml-2 text-blue-500">(选择所属单位)</span>
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
                <!-- 表格列配置与已选列表相同 -->
                <el-table-column
                  prop="customName"
                  label="客户名称"
                  min-width="200"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="customId"
                  label="客户编号"
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
                  label="客户经理"
                  min-width="120"
                  show-overflow-tooltip
                />
                <el-table-column width="80" fixed="right">
                  <template #default="scope">
                    <el-button type="text" @click="handleUnselect(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <!-- 选择所属单位的分页 -->
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
          </template>
        </div>

        <!-- 选择所属单位弹框 -->
        <el-dialog
          title="选择所属单位"
          :visible.sync="systemDialogVisible"
          width="80%"
          :before-close="handleSystemDialogClose"
          append-to-body
        >
          <el-tabs v-model="activeTab">
            <!-- 选择所属单位 tab -->
            <el-tab-pane label="选择所属单位" name="system">
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
              <!-- 替换为简化的上传表单和数据显示 -->
              <div class="upload-template">
                <!-- 未上传状态 -->
                <div v-if="!uploadSuccessful" class="upload-area">
                  <!-- 添加下载模板按钮 -->
                  <div class="flex gap-4 mb-4">
                    <el-button type="primary" @click="handleDownloadTemplate">
                      <i class="el-icon-download mr-1"></i>下载模板
                    </el-button>
                    <el-upload
                      class="upload-component"
                      action=""
                      :http-request="handleUploadRequest"
                      :limit="1"
                      :before-upload="beforeUpload"
                      :on-remove="handleFileRemove"
                      :file-list="uploadFileList"
                      accept=".xls,.xlsx"
                    >
                      <el-button size="small" type="primary">
                        <i class="el-icon-upload mr-1"></i>上传Excel模板
                      </el-button>
                      <div slot="tip" class="el-upload__tip">
                        请上传Excel文件, 文件大小不超过10MB
                      </div>
                    </el-upload>
                  </div>

                  <!-- 上传进度 -->
                  <div v-if="uploadProgress > 0 && !uploadSuccessful" class="mt-4">
                    <el-progress :percentage="uploadProgress" :show-text="false"></el-progress>
                    <div class="text-center text-sm text-gray-500 mt-1">
                      文件上传中，请稍候...{{ uploadProgress }}%
                    </div>
                  </div>
                </div>

                <!-- 上传成功后状态 -->
                <div v-if="uploadSuccessful" class="uploaded-data">
                  <div class="flex justify-between items-center mb-4">
                    <div class="text-success">
                      <i class="el-icon-success mr-1"></i>
                      文件解析成功，共获取 {{ tempTowerUserList.length }} 条数据
                    </div>
                    <el-button size="small" @click="handleFileRemove">重新上传</el-button>
                  </div>

                  <!-- 数据预览表格 -->
                  <el-table
                    :data="tempTowerUserList.slice(0, 5)"
                    border
                    stripe
                    size="small"
                    style="width: 100%"
                    :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
                  >
                    <el-table-column
                      prop="customName"
                      label="客户名称"
                      min-width="200"
                      show-overflow-tooltip
                    />
                    <el-table-column
                      prop="customId"
                      label="客户编号"
                      min-width="150"
                      show-overflow-tooltip
                    />
                    <el-table-column
                      prop="areaName"
                      label="所属城市"
                      min-width="150"
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
                      label="客户经理"
                      min-width="120"
                      show-overflow-tooltip
                    />
                  </el-table>

                  <!-- 如果有更多行，显示省略提示 -->
                  <div
                    v-if="tempTowerUserList.length > 5"
                    class="text-center text-sm text-gray-500 mt-2"
                  >
                    (仅显示前5条数据，完整数据将在提交后保存)
                  </div>
                </div>
              </div>
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
  import {
    asyncGetCustomerListByDept,
    asyncUploadSelfInfo,
    asyncDownloadTemplatePlannedManage
  } from '@/api/plan' // 添加导入
  import VisitTreeselect from '@/components/VisitTreeselect'

  export default {
    name: 'DailyVisitPlan',
    components: {
      BasePlan,
      SystemSelect,
      UploadTemplate,
      VisitTreeselect
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
        uploadProgress: 0,
        uploadSuccessful: false, // 新增：标记上传成功状态
        uploadFileList: [], // 新增：上传文件列表

        // 新增数据
        powerSupplyTree: [],
        selectedDept: [], // 改为数组以适应 VisitTreeselect 组件
        tableData: [],
        tableLoading: false,
        pagination: {
          pageNum: 1,
          pageSize: 10,
          total: 0
        },
        selectedRows: [],
        isInitializing: false, // 标志位：是否正在初始化
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
      // 监听树形数据变化，确保在树形数据加载完成后能够正确设置选中值
      powerSupplyTree: {
        handler(newVal) {
          if (newVal && newVal.length > 0 && this.selectedDept && this.selectedDept.length > 0) {
            console.log('树形数据变化，尝试重新设置selectedDept:', this.selectedDept)
            const tempSelectedDept = [...this.selectedDept]
            this.selectedDept = []
            this.$nextTick(() => {
              this.selectedDept = tempSelectedDept
              console.log('树形数据变化后，重新设置selectedDept为:', this.selectedDept)
            })
          }
        }
      }
    },
    created() {
      this.getPowerSupplyTree()
    },
    methods: {
      // 获取供电所树形数据（用于 Treeselect，传递 type=1 参数）
      async getPowerSupplyTree() {
        try {
          // 添加 type=1 参数，确保获取正确的树形结构
          const res = await deptTreeSelect({ type: '1' })
          this.powerSupplyTree = res.data || []

          // 如果是编辑模式，尝试从路由参数中获取ID并加载数据
          if (this.$route.params.id) {
            console.log('编辑模式，等待树形数据加载完成后尝试回显供电所')
            this.$nextTick(() => {
              // 如果已经有了selectedDept数据，尝试重新设置一次
              if (this.selectedDept && this.selectedDept.length > 0) {
                console.log('树形数据加载完成后，重新设置selectedDept:', this.selectedDept)
                const tempSelectedDept = [...this.selectedDept]
                this.selectedDept = []
                this.$nextTick(() => {
                  this.selectedDept = tempSelectedDept
                })
              }
            })
          }
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
        }
      },

      // 添加处理计划数据加载的方法
      async handlePlanDataLoaded(data) {
        console.log('DailyVisitPlan - 开始处理计划数据', data)
        this.isInitializing = true

        // 保存 towerUserList 数据
        if (data.towerUserList && data.towerUserList.length > 0) {
          console.log('收到towerUserList数据:', data.towerUserList.length, '条')
          this.formData.towerUserList = [...data.towerUserList]
          this.selectedRows = [...data.towerUserList]
        } else {
          console.log('没有接收到towerUserList数据或数据为空')
          this.formData.towerUserList = []
          this.selectedRows = []
        }

        // 初始化 selectedMap，使用统一的键格式
        this.selectedMap = {}
        this.formData.towerUserList.forEach((item) => {
          const key = `${item.customId}_${item.towerId}`
          this.selectedMap[key] = true
        })

        // 根据接口返回的数据，确定使用哪个ID进行回显
        // 优先使用 powerIdList，因为这是供电所的实际ID
        if (data.powerIdList?.length) {
          console.log('使用powerIdList回显供电所:', data.powerIdList)
          this.formData.powerSupply = Array.isArray(data.powerIdList)
            ? data.powerIdList
            : [data.powerIdList]
          const deptId = Array.isArray(data.powerIdList) ? data.powerIdList[0] : data.powerIdList

          this.tableLoading = true
          const params = {
            deptIdList: deptId,
            userId: data.userId || deptId, // 使用接口返回的userId，如果没有则使用deptId
            pageNum: this.pagination.pageNum,
            pageSize: this.pagination.pageSize,
            planId: this.$route.params.id || ''
          }

          // 设置 selectedDept，不触发 handleDeptChange
          // 确保树形数据已经加载完成
          if (this.powerSupplyTree && this.powerSupplyTree.length > 0) {
            console.log('树形数据已加载，直接设置selectedDept')
            // 先清空，然后在下一个事件循环中设置，确保组件能够正确响应变化
            this.selectedDept = []
            this.$nextTick(() => {
              // 对于 VisitTreeselect 组件，selectedDept 需要是数组
              this.selectedDept = Array.isArray(deptId) ? deptId : [deptId]
              console.log('设置selectedDept为:', this.selectedDept)
            })
          } else {
            console.log('树形数据尚未加载，等待加载完成后再设置selectedDept')
            // 先保存值，等待树形数据加载完成后在getPowerSupplyTree中设置
            this.selectedDept = Array.isArray(deptId) ? deptId : [deptId]
            console.log('暂存selectedDept为:', this.selectedDept)
          }

          try {
            const res = await asyncGetCustomerListByDept(params)
            if (res.code === 200) {
              this.tableData = res.rows || []
              this.pagination.total = res.total || 0

              this.formData.isSelectAll = Number(data.isSelectAll || 0)
              this.selectedCount =
                this.formData.isSelectAll === 1
                  ? this.pagination.total
                  : this.formData.towerUserList.length
              this.total = this.pagination.total

              // 等待 DOM 更新后设置勾选状态
              this.$nextTick(() => {
                if (this.$refs.table && this.formData.towerUserList?.length > 0) {
                  this.$refs.table.clearSelection()
                  this.tableData.forEach((row) => {
                    const rowKey = `${row.customId}_${row.towerId}`
                    if (this.selectedMap[rowKey]) {
                      this.$refs.table.toggleRowSelection(row, true)
                    }
                  })
                }
                this.isInitializing = false
                console.log('DailyVisitPlan - 处理计划数据完成')
              })
            } else {
              this.isInitializing = false
            }
          } catch (error) {
            console.error('获取客户列表失败:', error)
            this.$message.error('获取客户列表失败')
            this.isInitializing = false
          } finally {
            this.tableLoading = false
          }
        }
        // 如果没有powerIdList但有userId，则使用userId
        else if (data.userId) {
          console.log('使用userId回显供电所:', data.userId)
          const userId = data.userId

          // 设置 powerSupply
          this.formData.powerSupply = Array.isArray(userId) ? userId : [userId]

          this.tableLoading = true
          const params = {
            deptIdList: userId,
            userId: userId, // 添加 userId 参数，与 deptIdList 保持一致
            pageNum: this.pagination.pageNum,
            pageSize: this.pagination.pageSize,
            planId: this.$route.params.id || ''
          }

          // 设置 selectedDept，不触发 handleDeptChange
          // 确保树形数据已经加载完成
          if (this.powerSupplyTree && this.powerSupplyTree.length > 0) {
            console.log('树形数据已加载，直接设置selectedDept')
            // 先清空，然后在下一个事件循环中设置，确保组件能够正确响应变化
            this.selectedDept = []
            this.$nextTick(() => {
              // 对于 VisitTreeselect 组件，selectedDept 需要是数组
              this.selectedDept = Array.isArray(userId) ? userId : [userId]
              console.log('设置selectedDept为:', this.selectedDept)
            })
          } else {
            console.log('树形数据尚未加载，等待加载完成后再设置selectedDept')
            // 先保存值，等待树形数据加载完成后在getPowerSupplyTree中设置
            this.selectedDept = Array.isArray(userId) ? userId : [userId]
            console.log('暂存selectedDept为:', this.selectedDept)
          }

          try {
            const res = await asyncGetCustomerListByDept(params)
            if (res.code === 200) {
              this.tableData = res.rows || []
              this.pagination.total = res.total || 0

              this.formData.isSelectAll = Number(data.isSelectAll || 0)
              this.selectedCount =
                this.formData.isSelectAll === 1
                  ? this.pagination.total
                  : this.formData.towerUserList.length
              this.total = this.pagination.total

              // 等待 DOM 更新后设置勾选状态
              this.$nextTick(() => {
                if (this.$refs.table && this.formData.towerUserList?.length > 0) {
                  this.$refs.table.clearSelection()
                  this.tableData.forEach((row) => {
                    const rowKey = `${row.customId}_${row.towerId}`
                    if (this.selectedMap[rowKey]) {
                      this.$refs.table.toggleRowSelection(row, true)
                    }
                  })
                }
                this.isInitializing = false
                console.log('DailyVisitPlan - 处理计划数据完成')
              })
            } else {
              this.isInitializing = false
            }
          } catch (error) {
            console.error('获取客户列表失败:', error)
            this.$message.error('获取客户列表失败')
            this.isInitializing = false
          } finally {
            this.tableLoading = false
          }
        } else if (data.deptIdList?.length) {
          // 系统内选择的情况
          console.log('使用deptIdList回显:', data.deptIdList)
          this.selectedDept = null
          this.formData.powerSupply = Array.isArray(data.deptIdList)
            ? data.deptIdList
            : [data.deptIdList]
          this.tableData = this.formData.towerUserList
          this.pagination.total = this.formData.towerUserList.length
          this.formData.isSelectAll = Number(data.isSelectAll || 0)
          this.selectedCount =
            this.formData.isSelectAll === 1 ? data.total || 0 : this.formData.towerUserList.length
          this.total = Number(data.total || 0)
          this.isInitializing = false
        } else {
          // 无供电所和部门ID的情况
          console.log('没有供电所和部门ID数据')
          this.selectedDept = null
          this.formData.powerSupply = []
          this.tableData = this.formData.towerUserList
          this.pagination.total = this.formData.towerUserList.length
          this.formData.isSelectAll = Number(data.isSelectAll || 0)
          this.selectedCount =
            this.formData.isSelectAll === 1 ? data.total || 0 : this.formData.towerUserList.length
          this.total = Number(data.total || 0)
          this.isInitializing = false
        }
      },

      // 处理供电所选择变化 - 使用 VisitTreeselect 组件的方法
      async handleDeptChangeWithLabel(nodes) {
        console.log(
          'handleDeptChangeWithLabel被调用，初始化状态:',
          this.isInitializing,
          '值:',
          nodes
        )

        // 如果正在初始化，直接返回，不执行任何操作
        if (this.isInitializing) {
          console.log('正在初始化中，跳过handleDeptChangeWithLabel中的请求操作')
          return
        }

        if (!nodes || !nodes.length) {
          this.formData.towerUserList = []
          this.selectedRows = []
          this.selectedCount = 0
          this.formData.isSelectAll = 0
          this.tableData = []
          this.formData.powerSupply = []
          this.selectedDept = []
          return
        }

        // 获取选中节点的id
        const ids = nodes.map((node) => node.id)

        // 更新供电所数据
        this.selectedDept = ids
        this.formData.powerSupply = ids
        await this.getCustomerList()
      },

      // 保留旧方法以兼容现有代码
      async handleDeptChange(value) {
        if (this.isInitializing) return

        if (!value) {
          this.formData.towerUserList = []
          this.selectedRows = []
          this.selectedCount = 0
          this.formData.isSelectAll = 0
          this.tableData = []
          this.formData.powerSupply = []
          return
        }

        // 更新供电所数据
        this.formData.powerSupply = Array.isArray(value) ? value : [value]
        await this.getCustomerList()
      },

      // 获取客户列表
      async getCustomerList() {
        if (
          !this.selectedDept ||
          (Array.isArray(this.selectedDept) && this.selectedDept.length === 0)
        )
          return

        this.tableLoading = true
        try {
          const deptId = Array.isArray(this.selectedDept) ? this.selectedDept[0] : this.selectedDept

          const params = {
            deptIdList: deptId,
            userId: deptId, // 添加 userId 参数，与 deptIdList 保持一致
            pageNum: this.pagination.pageNum,
            pageSize: this.pagination.pageSize,
            planId: this.$route.params.id || '' // 添加 planId 参数
          }

          const res = await asyncGetCustomerListByDept(params)
          if (res.code === 200) {
            this.tableData = res.rows || []
            this.pagination.total = res.total || 0
            // 更新选中计数 - 编辑时清空之前的选择
            if (this.$route.params.id) {
              this.selectedCount = 0
            } else {
              // 新增时保持原有逻辑
              if (this.formData.isSelectAll === 1) {
                this.selectedCount = this.pagination.total
              } else {
                this.selectedCount = this.formData.towerUserList?.length || 0
              }
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
          this.selectedCount = selection.length

          // 同步更新 formData.towerUserList，确保提交时包含最新选中数据
          this.formData.towerUserList = [...selection]

          // 更新全局选中记录
          const currentPageIds = this.tableData.map((row) => row.customId)

          // 从全局记录中移除当前页已经不再选中的项
          currentPageIds.forEach((id) => {
            if (!selection.some((item) => item.customId === id)) {
              delete this.selectedMap[id]
            }
          })

          // 添加当前页新选中的项
          selection.forEach((row) => {
            this.selectedMap[row.customId] = true
          })
        }
      },

      // 新增方法：统一处理选择状态应用
      restoreSelection() {
        if (this.formData.isSelectAll === 1) return

        this.$nextTick(() => {
          if (this.$refs.table) {
            // 清空当前页的所有选择
            this.$refs.table.clearSelection()

            // 遍历当前页数据，根据 selectedMap 恢复选中状态
            this.tableData.forEach((row) => {
              const rowKey = `${row.customId}_${row.towerId}`
              if (this.selectedMap[rowKey]) {
                this.$refs.table.toggleRowSelection(row, true)
              }
            })
          }
        })
      },

      // 处理分页变化
      handlePageChange(page) {
        this.pagination.pageNum = page
        this.getCustomerList().then(() => {
          // 添加这一行来恢复选中状态
          this.restoreSelection()
        })
      },

      // 处理每页条数变化
      handleSizeChange(size) {
        this.pagination.pageSize = size
        this.pagination.pageNum = 1
        this.getCustomerList().then(() => {
          // 添加这一行来恢复选中状态
          this.restoreSelection()
        })
      },

      // Tree格式化 - 修改为只允许选择最底层的人员节点
      normalizer(node) {
        // 递归处理节点，确保只有最底层的人员节点可选
        const processNode = (node, currentDepth = 1) => {
          let normalizedChildren = undefined

          if (node.children && node.children.length > 0) {
            normalizedChildren = node.children.map((child) => processNode(child, currentDepth + 1))
          }

          // 判断是否是最底层的人员节点（例如"王旭明"、"喝好"）
          // 根据树形结构，这些节点通常在第5层或更深层次
          const isPersonNode = currentDepth === 5 && (!node.children || node.children.length === 0)

          return {
            id: node.id,
            label: node.label,
            children: normalizedChildren,
            // 只允许最底层的人员节点可选
            disabled: !isPersonNode
          }
        }

        return processNode(node)
      },

      // 处理对象选择弹框打开
      openSystemDialog() {
        if (this.selectedDept && this.selectedDept.length > 0) {
          this.$modal
            .confirm('切换到选择所属单位将清空当前供电所选择的数据，是否继续？')
            .then(() => {
              this.selectedDept = []
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
        this.selectedDept = [] // 改为空数组以适应 VisitTreeselect 组件
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
        this.uploadFileList = []
        this.uploadProgress = 0
        this.uploadSuccessful = false // 重置上传状态
        this.tableData = []
        this.pagination.pageNum = 1
        this.pagination.total = 0
        this.$refs.table?.clearSelection()
      },

      // 确认选择所属单位
      confirmSystemSelection() {
        this.selectedDept = [] // 改为空数组以适应 VisitTreeselect 组件

        // 如果是通过上传文件方式
        if (this.uploadFile && this.tempTowerUserList.length > 0) {
          console.log('确认通过文件上传选择的数据:', this.tempTowerUserList.length, '条')
          // 将解析后的数据更新到formData，确保数据格式统一
          this.formData.towerUserList = this.tempTowerUserList.map((item) => ({
            ...item,
            customName: item.customName || item.consName || '未知客户',
            customId: item.customId || item.consNo,
            towerId: item.towerId || item.tgNo,
            towerName: item.towerName || item.tgName,
            areaName: item.areaName || item.orgName,
            powerName: item.powerName || item.orgName,
            userName: item.userName || item.gridName,
            userId: item.userId || item.gridNo,
            visit: item.visit || '未走访'
          }))
          this.selectedCount = this.formData.towerUserList.length
          this.formData.isSelectAll = 0
          this.systemDialogVisible = false
          this.$message.success(`已选择${this.formData.towerUserList.length}项对象`)
          console.log(
            '文件上传数据已确认，formData.towerUserList:',
            this.formData.towerUserList.length,
            '条'
          )
          return
        }

        // 选择所属单位的逻辑保持不变
        this.formData.towerUserList = this.tempTowerUserList.map((item) => ({
          ...item,
          customName: item.customName || item.consName || item.userName || '未知客户',
          customId: item.customId || item.consNo,
          towerId: item.towerId || item.tgNo,
          provinceName: item.provinceName,
          areaName: item.areaName || item.orgName,
          companyName: item.companyName,
          powerName: item.powerName,
          userName: item.userName || item.gridName,
          visit: item.visit || '未走访'
        }))
        this.selectedCount = this.tempIsSelectAll === 1 ? this.total : this.tempSelectedCount
        this.formData.isSelectAll = this.tempIsSelectAll

        this.systemDialogVisible = false

        if (this.tempIsSelectAll === 1) {
          this.$message.success(`已全选${this.total}项对象`)
        } else if (this.formData.towerUserList.length > 0) {
          this.$message.success(`已选择${this.formData.towerUserList.length}项对象`)
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
          if (!submitData.planName || !submitData.planDesc) {
            this.$message.error(!submitData.planName ? '请输入计划名称' : '请输入计划描述')
            return false
          }
          // 添加 formDataId 字段
          if (submitData.formId) {
            submitData.formDataId = submitData.formId
          }
          // 如果是从供电所选择的数据源，添加 deptIdList
          if (
            this.selectedDept &&
            (Array.isArray(this.selectedDept) ? this.selectedDept.length > 0 : true)
          ) {
            const deptId = Array.isArray(this.selectedDept)
              ? this.selectedDept[0]
              : this.selectedDept

            // 确保 deptId 不是 undefined
            if (deptId) {
              // 日常走访使用powerIdList而不是deptIdList
              submitData.powerIdList = [deptId.toString()]
              // 添加userId参数，值为选中的供电所ID
              submitData.userId = deptId.toString()
              delete submitData.deptIdList // 确保删除不需要的字段
            } else {
              // 如果 deptId 是 undefined，使用 formData.powerSupply
              submitData.powerIdList = this.formData.powerSupply
              // 如果有powerSupply，使用第一个作为userId
              if (this.formData.powerSupply && this.formData.powerSupply.length > 0) {
                submitData.userId = Array.isArray(this.formData.powerSupply)
                  ? this.formData.powerSupply[0].toString()
                  : this.formData.powerSupply.toString()
              }
              delete submitData.deptIdList
            }
          } else {
            // 选择所属单位时
            submitData.powerIdList = this.formData.powerSupply // 选择所属单位时保留powerIdList
            // 如果有powerSupply，使用第一个作为userId
            if (this.formData.powerSupply && this.formData.powerSupply.length > 0) {
              submitData.userId = Array.isArray(this.formData.powerSupply)
                ? this.formData.powerSupply[0].toString()
                : this.formData.powerSupply.toString()
            } else if (this.selectedUser) {
              submitData.userId = this.selectedUser
            }
            delete submitData.deptIdList
          }

          submitData.isSelectAll = this.formData.isSelectAll
          // 修复：上传文件时也应该保留 towerUserList 数据
          submitData.towerUserList =
            this.formData.isSelectAll === 1 ? [] : [...this.formData.towerUserList] // 确保包含最新勾选的数据
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
            // 修复：保留解析后的数据，不清空 towerUserList
            submitData.towerUserList = this.formData.towerUserList || []
            delete submitData.total
            delete submitData.powerIdList
            delete submitData.towerIdList
            delete submitData.deptIdList
            // 保留userId参数，不删除
            console.log('上传文件模式 - towerUserList数据:', submitData.towerUserList.length, '条')

            // 验证上传文件模式下的数据完整性
            if (submitData.towerUserList.length === 0) {
              this.$message.warning('上传文件解析的数据为空，请检查文件内容或重新上传')
              return false
            }
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

      // 修改文件上传前处理
      beforeUpload(file) {
        const isExcel = /\.(xlsx|xls)$/.test(file.name.toLowerCase())
        const isLt10M = file.size / 1024 / 1024 < 10

        if (!isExcel) {
          this.$message.error('上传文件只能是 Excel 格式!')
          return false
        }
        if (!isLt10M) {
          this.$message.error('上传文件大小不能超过 10MB!')
          return false
        }
        return true
      },

      // 新增：自定义上传请求处理
      handleUploadRequest({ file }) {
        this.handleFileChange(file)
        return { abort: () => {} } // 返回一个dummy abort方法
      },

      // 修改文件上传处理方法
      async handleFileChange(file) {
        if (!file) return

        try {
          // 设置上传文件列表用于显示
          this.uploadFileList = [{ name: file.name, url: '' }]

          // 创建 FormData 对象用于上传
          const formData = new FormData()
          formData.append('file', file)

          // 清除之前的数据
          this.tempTowerUserList = []
          this.uploadFile = null
          this.uploadProgress = 0
          this.uploadSuccessful = false // 重置上传状态

          // 开始显示上传进度
          const interval = setInterval(() => {
            if (this.uploadProgress < 90) {
              this.uploadProgress += 10
            }
          }, 200)

          // 调用上传接口
          const res = await asyncUploadSelfInfo(formData)

          // 清除进度条
          clearInterval(interval)
          this.uploadProgress = 100 // 设置为100%

          if (res.code === 200) {
            console.log('解析成功，返回数据:', res.data)

            // 格式化返回的数据,使其与自助填报格式一致
            this.tempTowerUserList = (res.data || []).map((item) => ({
              customId: item.consNo,
              customName: item.consName,
              towerId: item.tgNo,
              towerName: item.tgName,
              areaName: item.orgName,
              powerName: item.orgName,
              userName: item.gridName,
              userId: item.gridNo,
              visit: '未走访'
            }))

            // 保存文件和更新状态
            this.uploadFile = file

            // 延迟更新成功状态，确保进度条完成显示
            setTimeout(() => {
              this.uploadSuccessful = true
              this.$message.success(`文件解析成功，获取到${this.tempTowerUserList.length}条数据`)
            }, 500)
          } else {
            this.uploadProgress = 0 // 出错时重置进度
            this.$message.error(res.msg || '文件解析失败')
            this.handleFileRemove()
          }
        } catch (error) {
          console.error('文件上传失败:', error)
          this.$message.error('文件上传失败')
          this.handleFileRemove()
          this.uploadProgress = 0 // 出错时重置进度
        }
      },

      // 修改文件移除处理方法
      handleFileRemove() {
        this.uploadFile = null
        this.uploadFileList = []
        this.tempTowerUserList = []
        this.uploadProgress = 0
        this.uploadSuccessful = false // 重置上传状态
      },

      // 判断行是否已被选中
      isRowSelected(row) {
        return this.formData.towerUserList.some((item) => item.customId === row.customId)
      },

      // 选择一行数据
      handleSelect(row) {
        this.formData.towerUserList.push(row)
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

      // 处理已选列表分页变化
      handleSelectedPageChange(page) {
        this.selectedPagination.pageNum = page
      },

      // 处理已选列表每页条数变化
      handleSelectedSizeChange(size) {
        this.selectedPagination.pageSize = size
        this.selectedPagination.pageNum = 1
      },

      // 修改下载模板方法，使其与 SelfReportTemplate 组件中的逻辑一致
      async handleDownloadTemplate() {
        try {
          // 日常走访计划使用不同的API路径，但保持相同的调用逻辑
          const res = await asyncDownloadTemplatePlannedManage(
            { type: 'zf' },
            '/plannedManage/downloadTemplate'
          )
          const fileName = '走访类计划任务派单模板.xlsx'
          const link = document.createElement('a')
          link.href = window.URL.createObjectURL(new Blob([res]))
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(link.href)
        } catch (error) {
          console.error('下载模板失败:', error)
          this.$modal.msgError('下载模板失败')
        }
      }
    }
  }
</script>

<style scoped>
  .upload-area {
    padding: 20px;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    text-align: center;
    background-color: #fafafa;
  }

  .upload-component {
    display: inline-block;
  }

  .uploaded-data {
    padding: 15px;
    border: 1px solid #e6f7ff;
    border-radius: 6px;
    background-color: #f0f9ff;
  }
</style>
