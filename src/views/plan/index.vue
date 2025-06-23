<template>
  <div class="app-container flex flex-col gap-4">
    <!-- 快速创建模块 -->
    <div class="bg-white rounded p-4 shadow flex flex-col gap-2 h-48">
      <div class="text-lg font-medium flex items-center gap-4">
        <div>快速创建</div>
        <div class="text-gray-500 text-xs">可以点击下方不同计划类型,完成计划的创建</div>
      </div>
      <div class="flex flex-wrap w-full gap-4 h-full">
        <div
          v-for="(item, index) in planTypes"
          :key="index"
          v-if="!item.hidden"
          class="flex-1 p-4 relative cursor-pointer rounded hover:opacity-95"
          @click="createPlan(item.type)"
          style="flex-basis: calc(16.66% - 16px)"
        >
          <div class="absolute z-10 left-4 top-4">
            <div
              class="text-white font-bold box-border"
              :class="{
                'text-2xl': item.name.length <= 4,
                'text-base leading-tight': item.name.length > 4
              }"
            >
              <template v-if="item.name.length > 4">
                <div>自主填报</div>
                <div class="mt-1">{{ item.name.slice(4) }}</div>
              </template>
              <template v-else>
                {{ item.name }}
              </template>
            </div>
            <div class="text-white text-sm mt-2 font-bold">{{ getPlanCount(item.type) }}项</div>
          </div>
          <img
            :src="item.image"
            :alt="item.name"
            class="absolute left-0 top-0 w-full h-28 object-cover z-0 rounded"
            :style="item.filterStyle"
          />
        </div>
      </div>
    </div>

    <!-- 计划列表模块 -->
    <div class="p-4 shadow rounded">
      <div class="mb-4">
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true">
          <el-form-item label="计划名称" prop="planName">
            <el-input
              v-model="queryParams.planName"
              placeholder="请输入计划名称"
              clearable
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item label="状态" prop="planStatus">
            <el-select v-model="queryParams.planStatus" placeholder="请选择状态" clearable>
              <el-option
                v-for="dict in dict.type.plan_status_option"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="类型" prop="planType">
            <el-select v-model="queryParams.planType" placeholder="请选择类型" clearable>
              <el-option
                v-for="dict in dict.type.plan_type_option"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery"
              >搜索</el-button
            >
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleGenerateQrcode">批量生成二维码</el-button>
            <el-button type="warning" @click="handleExport">
              <i class="el-icon-download"></i> 导出
            </el-button>
          </el-form-item>
        </el-form>
      </div>
      <el-table
        v-loading="loading"
        :data="planList"
        @selection-change="handleSelectionChange"
        ref="planTable"
        row-key="planId"
      >
        <el-table-column type="selection" width="55" :reserve-selection="true" />
        <el-table-column label="计划名称" prop="planName" align="center" />
        <el-table-column label="类型" prop="planType" align="center">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.plan_type_option" :value="scope.row.planType" />
          </template>
        </el-table-column>
        <el-table-column label="描述" prop="planDesc" align="center" />
        <el-table-column label="任务数量" prop="forCount" align="center" />
        <el-table-column label="完成数量" prop="completeRate" align="center">
          <template slot-scope="scope"> {{ scope.row.completeRate }} </template>
        </el-table-column>
        <el-table-column label="状态" prop="planStatus" align="center">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.plan_status_option" :value="scope.row.planStatus" />
          </template>
        </el-table-column>
        <el-table-column label="启动" prop="enabled" align="center">
          <template slot-scope="scope">
            <custom-switch
              v-model="scope.row.enabled"
              active-value="1"
              inactive-value="0"
              @change="
                (val, resolve, reject) => handleEnabledChange(scope.row, val, resolve, reject)
              "
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" align="center">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d}') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button type="text" @click="handleUpdate(scope.row)">编辑</el-button>
            <el-button type="text" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getList"
      />
    </div>

    <!-- 添加进度条弹窗 -->
    <el-dialog
      title="生成二维码"
      :visible.sync="progressVisible"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      width="400px"
    >
      <div class="flex flex-col items-center">
        <el-progress type="circle" :percentage="progressPercentage"></el-progress>
        <div class="mt-4 text-gray-600">正在生成二维码文件...</div>
      </div>
    </el-dialog>

    <!-- 添加生成二维码的站所选择弹窗 -->
    <el-dialog
      title="选择站所"
      :visible.sync="qrcodeDialogVisible"
      width="500px"
      center
      append-to-body
    >
      <div class="qrcode-select-container">
        <p class="text-gray-600 mb-4">请选择要生成二维码的站所</p>

        <!-- 使用站所选择组件 -->
        <dept-treeselect
          v-model="selectedDeptId"
          :options="powerSupplyTree"
          placeholder="请选择站所"
        />

        <div class="mt-4 flex justify-end">
          <el-button @click="qrcodeDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="confirmGenerateQrcode"
            :loading="generating"
            :disabled="!selectedDeptId"
            >确定生成</el-button
          >
        </div>
      </div>
    </el-dialog>

    <!-- 特殊走访选择弹窗 -->
    <el-dialog
      title="选择特殊走访类型"
      :visible.sync="visitDialogVisible"
      width="500px"
      center
      custom-class="visit-type-dialog"
    >
      <div class="visit-type-options">
        <div class="visit-type-card" @click="handleVisitTypeSelect(false)">
          <i class="el-icon-location-outline"></i>
          <h3>特殊走访</h3>
          <p>按照标准流程进行特殊走访计划</p>
        </div>
        <div class="visit-type-card" @click="handleVisitTypeSelect(true)">
          <i class="el-icon-document"></i>
          <h3>自主填报特殊走访</h3>
          <p>通过模板填报进行特殊走访计划</p>
        </div>
      </div>
    </el-dialog>

    <!-- 日常走访选择弹窗 -->
    <el-dialog
      title="选择日常走访类型"
      :visible.sync="dailyVisitDialogVisible"
      width="500px"
      center
      custom-class="visit-type-dialog"
    >
      <div class="visit-type-options">
        <div class="visit-type-card" @click="handleDailyVisitTypeSelect(false)">
          <i class="el-icon-postcard"></i>
          <h3>日常走访</h3>
          <p>按照标准流程进行日常走访计划</p>
        </div>
        <div class="visit-type-card" @click="handleDailyVisitTypeSelect(true)">
          <i class="el-icon-upload2"></i>
          <h3>自主填报日常走访</h3>
          <p>通过模板填报进行日常走访计划</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
  import {
    asyncGetPlanList,
    asyncEnabledPlan,
    asyncGetPlanCount,
    asyncDeletePlan,
    asyncGenerateQrcode
  } from '@/api/plan'
  import CustomSwitch from '@/components/CustomSwitch.vue'
  import DeptTreeselect from '@/components/DeptTreeselect' // 替换原来的 VisitTreeselect
  import { deptTreeSelect } from '@/api/system/user'
  import { exportFile } from '@/utils/request'

  export default {
    name: 'PlanManagement',
    components: {
      CustomSwitch,
      DeptTreeselect
    },
    dicts: ['plan_status_option', 'plan_type_option'],
    data() {
      return {
        // 遮罩层
        loading: true,
        // 总条数
        total: 0,
        // 计划表格数据
        planList: [],
        // 查询参数
        queryParams: {
          pageNum: 1,
          pageSize: 10,
          planName: undefined,
          planStatus: undefined,
          planType: undefined
        },
        planTypes: [
          {
            name: '日常巡视',
            type: '1',
            image: require('@/assets/images/box1.jpg')
          },
          {
            name: '特殊巡视',
            type: '2',
            image: require('@/assets/images/box2.jpg')
          },
          {
            name: '日常走访',
            type: '3',
            image: require('@/assets/images/box3.jpg')
          },
          {
            name: '特殊走访',
            type: '4',
            image: require('@/assets/images/box4.jpg')
          },
          {
            name: '自主填报日常走访',
            type: '5',
            image: require('@/assets/images/box3.jpg'),
            filterStyle: 'filter: brightness(0.8) sepia(0.3)',
            hidden: true
          },
          {
            name: '自主填报特殊走访',
            type: '6',
            image: require('@/assets/images/box4.jpg'),
            filterStyle: 'filter: brightness(0.8) sepia(0.3)',
            hidden: true
          }
        ],
        planCounts: [],
        progressVisible: false,
        progressPercentage: 0,
        visitDialogVisible: false,
        dailyVisitDialogVisible: false,
        qrcodeDialogVisible: false,
        selectedDeptId: null,
        powerSupplyTree: [],
        generating: false,
        // 添加选中数据数组
        selectedPlanIds: [], // 选中的planId数组
        allSelectedPlans: new Map() // 用于存储所有页面的选中记录
      }
    },
    created() {
      this.getList()
      this.getPlanTypeCount()
    },
    methods: {
      /** 查询计划列表 */
      getList() {
        this.loading = true
        asyncGetPlanList(this.queryParams)
          .then((response) => {
            if (response.code === 200) {
              this.planList = response.rows
              this.total = response.total

              // 在数据加载完成后,恢复当前页的选中状态
              this.$nextTick(() => {
                const currentPage = this.queryParams.pageNum
                const selectedRows = this.allSelectedPlans.get(currentPage) || []

                // 恢复选中状态
                this.planList.forEach((row) => {
                  if (selectedRows.find((selected) => selected.planId === row.planId)) {
                    this.$refs.planTable.toggleRowSelection(row, true)
                  }
                })
              })
            } else {
              this.$message.error(response.msg || '获取计划列表失败')
            }
            this.loading = false
          })
          .catch(() => {
            this.loading = false
          })
      },
      /** 搜索按钮操作 */
      handleQuery() {
        this.queryParams.pageNum = 1
        this.getList()
      },
      /** 重置按钮操作 */
      resetQuery() {
        this.resetForm('queryForm')
        this.handleQuery()

        // 清空选中记录
        this.selectedPlanIds = []
        this.allSelectedPlans.clear()
        if (this.$refs.planTable) {
          this.$refs.planTable.clearSelection()
        }
      },
      /** 删除按钮操作 */
      handleDelete(row) {
        const planId = row.planId
        this.$modal
          .confirm('是否确认删除该计划？')
          .then(() => {
            return asyncDeletePlan({ planIds: planId })
          })
          .then(() => {
            this.getList()
            this.$modal.msgSuccess('删除成功')
            this.getPlanTypeCount()
          })
          .catch((error) => {
            console.error('删除失败:', error)
          })
      },
      /** 打开新建计划页面 */
      createPlan(type) {
        if (type === '4') {
          this.visitDialogVisible = true
        } else if (type === '3') {
          this.dailyVisitDialogVisible = true
        } else {
          const routeUrl = `/plan/visit/${type}`
          this.$tab.openPage('新建计划', routeUrl)
        }
      },
      // 处理特殊走访类型选择
      handleVisitTypeSelect(isSelf) {
        this.visitDialogVisible = false
        const type = isSelf ? '6' : '4'
        const routeUrl = `/plan/visit/${type}`
        this.$tab.openPage('新建计划', routeUrl)
      },
      // 处理日常走访类型选择
      handleDailyVisitTypeSelect(isSelf) {
        this.dailyVisitDialogVisible = false
        const type = isSelf ? '5' : '3'
        const routeUrl = `/plan/visit/${type}`
        this.$tab.openPage('新建计划', routeUrl)
      },
      /** 打开编辑计划页面 */
      handleUpdate(row) {
        const routeUrl = `/plan/visit/${row.planType}/${row.planId}`
        this.$tab.openPage('编辑计划', routeUrl)
      },
      /** 处理启动状态切换 */
      async handleEnabledChange(row, newValue, resolve, reject) {
        const text = newValue === '1' ? '启动' : '停止'
        try {
          await this.$modal.confirm(`确认要${text}该计划吗？`)
          const res = await asyncEnabledPlan({
            id: row.planId,
            enabled: newValue
          })

          if (res.code === 200) {
            this.$modal.msgSuccess(`${text}成功`)
            this.getList()
            resolve()
          } else {
            this.$modal.msgError(res.msg || `${text}失败`)
            reject(new Error(res.msg || `${text}失败`))
          }
        } catch (error) {
          reject(error)
        }
      },
      // 获取计划类型数量
      async getPlanTypeCount() {
        try {
          const res = await asyncGetPlanCount()
          if (res.code === 200) {
            this.planCounts = res.data || []
          }
        } catch (error) {
          console.error('获取计划类型数量失败:', error)
        }
      },
      // 获取指定类型的计划数量
      getPlanCount(type) {
        const found = this.planCounts.find((item) => item.planType === type)
        return found ? found.planTypeCounts || 0 : 0
      },
      /** 点击批量生成二维码按钮 */
      handleGenerateQrcode() {
        this.getPowerSupplyTree().then(() => {
          this.qrcodeDialogVisible = true
        })
      },
      /** 获取供电所树形数据 */
      async getPowerSupplyTree() {
        try {
          this.selectedDeptId = null
          const res = await deptTreeSelect()
          const processTreeData = (nodes, parent = null) => {
            return nodes.map((node) => {
              const processedNode = { ...node, parent }
              if (node.children) {
                processedNode.children = processTreeData(node.children, processedNode)
              }
              return processedNode
            })
          }
          this.powerSupplyTree = processTreeData(res.data || [])
        } catch (error) {
          console.error('获取供电所树形数据失败:', error)
          this.$modal.msgError('获取供电所树形数据失败')
        }
      },
      /** 确认生成二维码 */
      confirmGenerateQrcode() {
        if (!this.selectedDeptId) {
          this.$modal.msgError('请选择站所')
          return
        }

        this.generating = true
        this.progressVisible = true
        this.progressPercentage = 0

        const timer = setInterval(() => {
          if (this.progressPercentage < 90) {
            this.progressPercentage += 10
          }
        }, 300)

        asyncGenerateQrcode(this.selectedDeptId)
          .then((res) => {
            this.progressPercentage = 100
            setTimeout(() => {
              clearInterval(timer)
              this.progressVisible = false
              this.generating = false

              const blob = new Blob([res], { type: 'application/zip' })
              const link = document.createElement('a')
              link.href = window.URL.createObjectURL(blob)
              link.download = `二维码_${new Date().getTime()}.zip`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              window.URL.revokeObjectURL(link.href)

              this.$notify({
                title: '生成成功',
                message: '二维码文件已成功生成,请检查您选择的下载目录',
                type: 'success',
                duration: 0
              })
            }, 200)
          })
          .catch(() => {
            clearInterval(timer)
            this.progressVisible = false
            this.generating = false
            this.$modal.msgError('二维码生成失败')
          })
      },
      /** 处理表格多选 */
      handleSelectionChange(selection) {
        // 更新当前页面选中的记录
        const currentPage = this.queryParams.pageNum
        this.allSelectedPlans.set(currentPage, selection)

        // 合并所有页面选中的planId
        this.selectedPlanIds = Array.from(this.allSelectedPlans.values())
          .flat()
          .map((item) => item.planId)
      },
      // 处理导出
      handleExport() {
        // 构造导出参数
        const params = {}

        // 添加筛选参数
        if (this.queryParams.planName) {
          params.planName = this.queryParams.planName
        }
        if (this.queryParams.planStatus) {
          params.planStatus = this.queryParams.planStatus
        }
        if (this.queryParams.planType) {
          params.planType = this.queryParams.planType
        }

        // 获取所有页面选中的planId
        if (this.selectedPlanIds.length > 0) {
          params.planIdList = this.selectedPlanIds
        }

        // 调用导出接口
        exportFile('/plannedManage/planManage/export', params, '计划管理列表.xlsx', {
          method: 'get',
          responseType: 'blob'
        })
          .then(() => {
            this.$modal.msgSuccess('导出成功')
          })
          .catch(() => {
            this.$modal.msgError('导出失败')
          })
      }
    }
  }
</script>

<style lang="scss" scoped>
  .visit-type-dialog {
    :deep(.el-dialog__header) {
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #eee;

      .el-dialog__title {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
      }
    }

    :deep(.el-dialog__body) {
      padding: 30px;
    }
  }

  .visit-type-options {
    display: flex;
    gap: 20px;
    justify-content: center;
  }

  .visit-type-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px 20px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #fff;
    text-align: center;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: #409eff;
    }

    i {
      font-size: 32px;
      color: #409eff;
      margin-bottom: 16px;
    }

    h3 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #909399;
      line-height: 1.4;
    }
  }

  .qrcode-select-container {
    p {
      font-size: 14px;
      color: #606266;
    }
  }

  .el-button {
    width: auto;
    height: auto;
    font-size: 14px;
  }
</style>
