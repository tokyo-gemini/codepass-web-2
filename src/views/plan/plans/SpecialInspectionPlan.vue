<template>
  <base-plan
    :plan-type="'2'"
    ref="basePlan"
    @plan-data-loaded="handlePlanDataLoaded"
    @reset="handleReset"
    @before-submit="handleBeforeSubmit"
  >
    <template #plan-content>
      <div class="rounded bg-white shadow w-full p-4">
        <div class="font-bold pb-4 flex justify-between items-center">
          <div class="section-title">对象选择</div>
          <el-button type="primary" size="small" @click="openSystemDialog">
            <i class="el-icon-plus mr-1"></i>选择对象
          </el-button>
        </div>

        <!-- 显示已选对象的摘要信息 -->
        <div class="flex flex-col mb-4 border rounded p-4">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center">
              <span class="font-medium">已选择对象:</span>
              <span class="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                共 {{ selectedCount }} 项
              </span>
              <span v-if="formData.isSelectAll === 1" class="ml-2 text-green-600 text-xs">
                (全部选择)
              </span>
            </div>
          </div>

          <!-- 已选对象的摘要列表 -->
          <el-empty
            v-if="selectedCount === 0"
            description="暂无已选对象"
            :image-size="60"
          ></el-empty>
          <div v-else-if="formData.isSelectAll === 1" class="text-gray-600">
            已全选当前筛选条件下的所有对象
          </div>
          <div v-else>
            <el-table
              :data="pagedSelectedObjects"
              border
              stripe
              size="small"
              height="250"
              style="width: 100%"
              :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
            >
              <el-table-column prop="towerId" label="台区编号" min-width="150"></el-table-column>
              <el-table-column prop="towerName" label="台区名称" min-width="200"></el-table-column>
              <el-table-column label="操作" align="center" width="80">
                <template #default="{ row }">
                  <el-button type="text" @click="removeSelectedItem(row)">
                    <i class="el-icon-delete text-red-500"></i>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <!-- 添加分页组件 -->
            <div class="mt-2 flex justify-end">
              <el-pagination
                @current-change="handleSelectedPageChange"
                @size-change="handleSelectedSizeChange"
                :current-page="selectedObjectsQuery.pageNum"
                :page-size="selectedObjectsQuery.pageSize"
                :page-sizes="[5, 10, 20]"
                layout="total, sizes, prev, pager, next"
                :total="selectedCount"
              >
              </el-pagination>
            </div>
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
                :plan-type="'2'"
                :is-visit="false"
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
                :plan-type="'2'"
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

  export default {
    name: 'SpecialInspectionPlan',
    components: {
      BasePlan,
      SystemSelect,
      UploadTemplate
    },
    data() {
      return {
        formData: {
          towerUserList: [],
          isSelectAll: 0,
          powerSupply: null
        },
        selectedCount: 0,
        total: 0,
        systemDialogVisible: false,
        activeTab: 'system',
        tempTowerUserList: [],
        tempSelectedCount: 0,
        tempIsSelectAll: 0,
        uploadFile: null,
        selectedObjectsQuery: {
          pageNum: 1,
          pageSize: 5
        }
      }
    },
    computed: {
      pagedSelectedObjects() {
        if (this.formData.isSelectAll === 1) {
          return []
        }
        const start = (this.selectedObjectsQuery.pageNum - 1) * this.selectedObjectsQuery.pageSize
        const end = start + this.selectedObjectsQuery.pageSize
        return this.formData.towerUserList.slice(start, end)
      }
    },
    methods: {
      handlePlanDataLoaded(data) {
        this.formData.towerUserList = data.towerUserList || []
        this.formData.isSelectAll = data.isSelectAll || 0
        this.formData.powerSupply = data.powerIdList || null
        this.selectedCount =
          data.isSelectAll === 1 ? data.total || 0 : data.towerUserList?.length || 0
      },
      handleReset() {
        this.formData = {
          towerUserList: [],
          isSelectAll: 0,
          powerSupply: null
        }
        this.selectedCount = 0
        this.total = 0
        this.activeTab = 'system'
        this.uploadFile = null
      },
      handleBeforeSubmit(formData) {
        if (this.uploadFile) {
          formData.append('file', this.uploadFile)
        }
      },
      openSystemDialog() {
        this.systemDialogVisible = true
        this.tempTowerUserList = [...this.formData.towerUserList]
        this.tempSelectedCount = this.selectedCount
        this.tempIsSelectAll = this.formData.isSelectAll
      },
      handleSystemDialogClose(done) {
        this.$confirm('确认关闭？未保存的选择将会丢失')
          .then(() => done())
          .catch(() => {})
      },
      confirmSystemSelection() {
        this.formData.towerUserList = [...this.tempTowerUserList]
        this.selectedCount = this.tempIsSelectAll === 1 ? this.total : this.tempSelectedCount
        this.formData.isSelectAll = this.tempIsSelectAll
        this.systemDialogVisible = false

        if (this.tempIsSelectAll === 1) {
          this.$message.success(`已全选${this.total}项对象`)
        }
      },
      removeSelectedItem(item) {
        const index = this.formData.towerUserList.findIndex((i) => i.towerId === item.towerId)
        if (index !== -1) {
          this.formData.towerUserList.splice(index, 1)
          this.selectedCount -= 1
          if (this.formData.isSelectAll === 1) {
            this.formData.isSelectAll = 0
          }
        }
      },
      handleSelectedPageChange(page) {
        this.selectedObjectsQuery.pageNum = page
      },
      handleSelectedSizeChange(size) {
        this.selectedObjectsQuery.pageSize = size
        this.selectedObjectsQuery.pageNum = 1
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
