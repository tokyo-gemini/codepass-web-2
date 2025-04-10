<template>
  <div class="rounded bg-white shadow w-full p-4">
    <div class="font-bold pb-4">
      <div class="section-title">对象选择</div>
    </div>
    <!-- 添加说明信息 -->
    <div class="bg-gray-50 p-4 mb-4 rounded text-sm text-gray-600">
      <div class="flex items-start gap-2">
        <i class="el-icon-info-circle text-blue-500 mt-0.5"></i>
        <div>
          <p class="font-medium mb-2">自主填报说明:</p>
          <ul class="list-disc pl-4 space-y-1">
            <li>下载模板: 获取标准格式的Excel模板文件</li>
            <li>填写数据: 请按模板要求填写目标对象信息</li>
            <li>上传文件: 支持.xlsx/.xls格式,大小不超过2MB</li>
            <li>上传后系统会自动解析并显示数据</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 显示已选对象的摘要信息 -->
    <div class="flex flex-col mb-4 border rounded p-4">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center">
          <span class="font-medium">已选择对象:</span>
          <span class="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
            共 {{ totalSelectedCount }} 项
          </span>
        </div>
        <el-button type="primary" size="small" @click="openDialog">
          <i class="el-icon-plus mr-1"></i>选择对象
        </el-button>
      </div>

      <!-- 已选对象的摘要表格 -->
      <el-empty
        v-if="totalSelectedCount === 0"
        description="暂无已选对象"
        :image-size="60"
      ></el-empty>
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
          <el-table-column prop="consNo" label="客户编号" min-width="150"></el-table-column>
          <el-table-column prop="consName" label="客户名称" min-width="200"></el-table-column>
          <el-table-column label="操作" align="center" width="80">
            <template #default="{ row }">
              <el-button type="text" @click="removeObject(row)">
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
            :total="totalSelectedCount"
          >
          </el-pagination>
        </div>
      </div>
    </div>

    <!-- 弹框组件 -->
    <el-dialog
      title="自主填报对象选择"
      :visible.sync="dialogVisible"
      width="80%"
      :before-close="handleDialogClose"
      append-to-body
    >
      <div class="flex gap-4">
        <el-button type="primary" class="h-10" @click="handleDownloadTemplate">
          <i class="el-icon-download mr-1"></i>下载模版
        </el-button>
        <div class="flex gap-4 mb-4">
          <el-upload
            class="upload-demo"
            :action="uploadUrl"
            :auto-upload="false"
            :on-change="handleFileChange"
            :before-upload="beforeUpload"
            :on-remove="handleFileRemove"
            :on-exceed="handleExceed"
            :limit="1"
            accept=".xlsx, .xls"
            :show-file-list="true"
          >
            <el-button type="success" class="h-10">
              <i class="el-icon-upload mr-1"></i>上传文件
            </el-button>
            <template #tip>
              <div>
                <div class="text-xs text-gray-500 mt-1">上传格式: .xlsx, .xls</div>
                <div v-if="uploadProgress > 0" class="mt-2 w-full">
                  <el-progress :percentage="uploadProgress" :format="progressFormat" />
                </div>
              </div>
            </template>
          </el-upload>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane
          v-if="customsList && customsList.length > 0"
          label="已存在的自主填报客户"
          name="exist"
        >
          <div class="flex justify-end items-center mb-2">
            <el-button
              type="danger"
              :disabled="!multipleSelection.length"
              size="mini"
              @click="handleBatchDelete"
            >
              批量删除
            </el-button>
          </div>
          <el-table
            ref="existTable"
            :data="pagedCustoms"
            height="410"
            :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="consName" label="客户名称" />
            <el-table-column prop="tgNo" label="台区编号" />
            <el-table-column prop="consNo" label="户号" />
            <el-table-column prop="gridNo" label="网格编号" />
            <el-table-column label="操作" align="center" width="80">
              <template #default="{ row }">
                <el-button type="text" @click="handleDeleteCustom(row)">
                  <i class="el-icon-delete text-red-500"></i>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="mt-4 flex justify-end">
            <el-pagination
              @current-change="handlePageChange"
              @size-change="handleSizeChange"
              :current-page="customsQuery.pageNum"
              :page-size="customsQuery.pageSize"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              :total="customsList.length"
            >
            </el-pagination>
          </div>
        </el-tab-pane>

        <!-- 只有在 uploadedData.length > 0 时才显示 -->
        <el-tab-pane v-if="uploadedData.length > 0" label="上传模版数据" name="uploaded">
          <!-- 展示数据列表 -->
          <el-table
            v-if="uploadedData.length > 0"
            :data="currentPageData"
            height="410"
            :header-cell-style="{
              background: '#f5f7fa',
              color: '#606266'
            }"
          >
            <el-table-column prop="orgNo" label="供电单位编码" min-width="120">
              <template #header>
                <span>供电单位编码</span>
                <span class="text-gray-400 text-xs">(选填)</span>
              </template>
            </el-table-column>
            <el-table-column prop="orgName" label="供电单位名称" min-width="120">
              <template #header>
                <span>供电单位名称</span>
                <span class="text-gray-400 text-xs">(选填)</span>
              </template>
            </el-table-column>
            <el-table-column prop="tgNo" label="台区编码" min-width="120">
              <template #header>
                <span>台区编码</span>
                <span class="text-red-500 text-xs">(必填)</span>
              </template>
            </el-table-column>
            <el-table-column prop="tgName" label="台区名称" min-width="120">
              <template #header>
                <span>台区名称</span>
                <span class="text-gray-400 text-xs">(选填)</span>
              </template>
            </el-table-column>
            <el-table-column prop="consNo" label="用户编号" min-width="120">
              <template #header>
                <span>用户编号</span>
                <span class="text-red-500 text-xs">(必填)</span>
              </template>
            </el-table-column>
            <el-table-column prop="consName" label="用户名称" min-width="120">
              <template #header>
                <span>用户名称</span>
                <span class="text-red-500 text-xs">(必填)</span>
              </template>
            </el-table-column>
            <el-table-column prop="elecAddr" label="用电地址" min-width="150">
              <template #header>
                <span>用电地址</span>
                <span class="text-gray-400 text-xs">(选填)</span>
              </template>
            </el-table-column>
            <el-table-column prop="telNo" label="联系电话" min-width="120">
              <template #header>
                <span>联系电话</span>
                <span class="text-gray-400 text-xs">(选填)</span>
              </template>
            </el-table-column>

            <!-- 添加新的网格员相关列 -->
            <el-table-column prop="gridNo" label="网格员编号" min-width="120">
              <template #header>
                <span>网格员编号</span>
                <span class="text-red-500 text-xs">(必填)</span>
              </template>
            </el-table-column>
            <el-table-column prop="gridName" label="网格员名称" min-width="120">
              <template #header>
                <span>网格员名称</span>
                <span class="text-gray-400 text-xs">(选填)</span>
              </template>
            </el-table-column>
          </el-table>

          <!-- 添加分页组件 -->
          <pagination
            v-if="uploadedData.length > 0"
            :total="uploadedData.length"
            :page.sync="currentPage"
            :limit.sync="pageSize"
            @pagination="handlePagination"
          />
        </el-tab-pane>
      </el-tabs>

      <!-- 弹框底部按钮 -->
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSelection">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
  import { asyncDownLoadSelfTemplate, asyncUploadSelfInfo } from '@/api/plan'
  import Pagination from '@/components/Pagination'

  export default {
    name: 'SelfReportTemplate',
    components: {
      Pagination
    },
    props: {
      planType: {
        type: String,
        required: true
      },
      value: {
        type: Array,
        default: () => []
      },
      // 传入已存在的自主填报数据
      customsList: {
        type: Array,
        default: () => []
      }
    },

    data() {
      return {
        uploadedData: [], // 保存所有数据
        currentPage: 1, // 当前页码
        pageSize: 10, // 每页显示条数
        uploadFile: null,
        uploadUrl: process.env.VUE_APP_BASE_API + '/plan/upload',
        customsQuery: {
          pageNum: 1,
          pageSize: 10
        },
        activeTab: 'exist',
        multipleSelection: [],
        uploadProgress: 0,
        // 新增弹框相关的数据
        dialogVisible: false,
        tempSelectedObjects: [], // 临时存储选择的对象
        selectedObjectsQuery: {
          pageNum: 1,
          pageSize: 5
        }
      }
    },

    computed: {
      isVisit() {
        return this.planType === '5' || this.planType === '6'
      },

      // 计算当前页数据
      currentPageData() {
        const start = (this.currentPage - 1) * this.pageSize
        const end = start + this.pageSize
        return this.uploadedData.slice(start, end)
      },

      pagedCustoms() {
        const start = (this.customsQuery.pageNum - 1) * this.customsQuery.pageSize
        const end = start + this.customsQuery.pageSize
        return this.customsList.slice(start, end)
      },

      // 计算已选对象的总数
      totalSelectedCount() {
        return (this.value || []).length + (this.customsList || []).length
      },

      // 显示前10个已选对象
      displaySelectedObjects() {
        const allObjects = [...(this.customsList || []), ...(this.value || [])]
        return allObjects.slice(0, 10)
      },

      // 计算分页后的已选对象列表
      pagedSelectedObjects() {
        const allObjects = [...(this.customsList || []), ...(this.value || [])]
        const start = (this.selectedObjectsQuery.pageNum - 1) * this.selectedObjectsQuery.pageSize
        const end = start + this.selectedObjectsQuery.pageSize
        return allObjects.slice(start, end)
      }
    },

    created() {
      // 初始化临时选择数据
      this.tempSelectedObjects = [...(this.value || [])]
    },

    methods: {
      // 打开对象选择弹框
      openDialog() {
        this.dialogVisible = true
        // 初始化临时选择数据
        this.tempSelectedObjects = [...(this.value || [])]
      },

      // 处理弹框关闭事件
      handleDialogClose(done) {
        this.$confirm('确认关闭？未保存的选择将会丢失')
          .then(() => {
            done()
          })
          .catch(() => {})
      },

      // 确认选择并关闭弹框
      confirmSelection() {
        // 确认当前选择的数据，更新到父组件
        this.$emit('input', this.uploadedData)
        this.dialogVisible = false
      },

      // 移除已选对象
      removeObject(item) {
        if (this.customsList.includes(item)) {
          const index = this.customsList.indexOf(item)
          this.customsList.splice(index, 1)
        } else if (this.value.includes(item)) {
          const index = this.value.indexOf(item)
          const newValue = [...this.value]
          newValue.splice(index, 1)
          this.$emit('input', newValue)
        }
      },

      async handleDownloadTemplate() {
        try {
          const res = await asyncDownLoadSelfTemplate()
          const fileName = '自主走访计划任务模板.xlsx'
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
      },

      beforeUpload(file) {
        const isExcel =
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel'
        const isLt2M = file.size / 1024 / 1024 < 2
        if (!isExcel) {
          this.$message.error('只能上传Excel文件!')
          return false
        }
        if (!isLt2M) {
          this.$message.error('文件大小不能超过 2MB!')
          return false
        }
        return true
      },

      progressFormat(percentage) {
        return percentage === 100 ? '解析中...' : `${percentage}%`
      },

      async handleFileChange(file) {
        if (file) {
          try {
            this.uploadProgress = 0
            const interval = setInterval(() => {
              if (this.uploadProgress < 90) {
                this.uploadProgress += 10
              }
            }, 200)

            this.uploadFile = file.raw

            // 创建 FormData 对象用于上传
            const formData = new FormData()
            formData.append('file', file.raw)

            // 调用自主填报上传接口
            const res = await asyncUploadSelfInfo(formData)

            clearInterval(interval)
            this.uploadProgress = 100

            if (res.code === 200) {
              // 重置分页参数
              this.currentPage = 1
              this.uploadedData = res.data || []
              this.$emit('input', this.uploadedData)
              this.$emit('file-change', this.uploadFile)
              this.$modal.msgSuccess('文件解析成功')
              this.activeTab = 'uploaded'

              // 成功后3秒清除进度条
              setTimeout(() => {
                this.uploadProgress = 0
              }, 3000)
            } else {
              this.$modal.msgError(res.msg || '文件解析失败')
              this.handleFileRemove()
            }
          } catch (error) {
            clearInterval(interval)
            this.uploadProgress = 0
            console.error('文件上传失败:', error)
            this.$modal.msgError('文件上传失败')
            this.handleFileRemove()
          }
        }
      },

      handleFileRemove() {
        this.uploadFile = null
        this.uploadedData = []
        this.currentPage = 1
        this.uploadProgress = 0
        this.$emit('file-change', null)
        this.$emit('input', [])
      },

      handleExceed() {
        this.$message.warning('最多只能上传1个文件')
      },

      // 处理分页变化
      handlePagination(val) {
        this.currentPage = val.page
        this.pageSize = val.limit
      },

      handlePageChange(page) {
        this.customsQuery.pageNum = page
      },
      handleSizeChange(size) {
        this.customsQuery.pageSize = size
        this.customsQuery.pageNum = 1
      },

      // 删除已存在的自主填报客户
      handleDeleteCustom(row) {
        this.$confirm('确定要删除该条记录吗？', '提示', { type: 'warning' })
          .then(() => {
            const index = this.customsList.indexOf(row)
            if (index !== -1) {
              this.customsList.splice(index, 1)
            }
            this.checkHideTab()
          })
          .catch(() => {})
      },

      // 批量删除选中的记录
      handleBatchDelete() {
        this.$confirm('确定要删除选中的记录吗？', '提示', { type: 'warning' })
          .then(() => {
            // 从 customsList 中去除 multipleSelection 中的所有项
            this.multipleSelection.forEach((item) => {
              const idx = this.customsList.indexOf(item)
              if (idx !== -1) {
                this.customsList.splice(idx, 1)
              }
            })
            this.multipleSelection = []
            this.checkHideTab()
          })
          .catch(() => {})
      },

      // 如果自主填报客户清空，则隐藏「已存在的自主填报客户」tab
      checkHideTab() {
        if (!this.customsList.length) {
          this.activeTab = this.uploadedData.length > 0 ? 'uploaded' : '' // 没有数据则切换到下一个可用tab
        }
      },

      // 处理表格多选
      handleSelectionChange(rows) {
        this.multipleSelection = rows
      },

      // 处理已选对象分页变化
      handleSelectedPageChange(page) {
        this.selectedObjectsQuery.pageNum = page
      },

      // 处理已选对象每页数量变化
      handleSelectedSizeChange(size) {
        this.selectedObjectsQuery.pageSize = size
        this.selectedObjectsQuery.pageNum = 1
      }
    }
  }
</script>
