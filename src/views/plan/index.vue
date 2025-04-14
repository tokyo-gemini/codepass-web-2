<template>
  <div class="app-container flex flex-col gap-4">
    <!-- 快速创建模块 -->
    <div class="bg-white rounded p-4 shadow flex flex-col gap-2 h-48">
      <div class="text-lg font-medium flex items-center gap-4">
        <div>快速创建</div>
        <div class="text-gray-500 text-xs">可以点击下方不同计划类型,完成计划的创建</div>
      </div>
      <div class="flex flex-wrap w-full gap-4 h-full">
        <div v-for="(item, index) in planTypes" :key="index" v-if="!item.hidden"
          class="flex-1 p-4 relative cursor-pointer rounded hover:opacity-95" @click="createPlan(item.type)"
          style="flex-basis: calc(16.66% - 16px)">
          <div class="absolute z-10 left-4 top-4">
            <div class="text-white font-bold box-border" :class="{
              'text-2xl': item.name.length <= 4,
              'text-base leading-tight': item.name.length > 4
            }">
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
          <img :src="item.image" :alt="item.name" class="absolute left-0 top-0 w-full h-28 object-cover z-0 rounded"
            :style="item.filterStyle" />
        </div>
      </div>
    </div>

    <!-- 计划列表模块 -->
    <div class="p-4 shadow rounded">
      <div class="mb-4">
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true">
          <el-form-item label="计划名称" prop="planName">
            <el-input v-model="queryParams.planName" placeholder="请输入计划名称" clearable
              @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
              <el-option v-for="dict in dict.type.plan_status_option" :key="dict.value" :label="dict.label"
                :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型" prop="planType">
            <el-select v-model="queryParams.planType" placeholder="请选择类型" clearable>
              <el-option v-for="dict in dict.type.plan_type_option" :key="dict.value" :label="dict.label"
                :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleGenerateQrcode">批量生成二维码</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" :data="planList">
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
            <custom-switch v-model="scope.row.enabled" active-value="1" inactive-value="0" @change="
              (val, resolve, reject) => handleEnabledChange(scope.row, val, resolve, reject)
            " />
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

      <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
        @pagination="getList" />
    </div>

    <!-- 添加进度条弹窗 -->
    <el-dialog title="生成二维码" :visible.sync="progressVisible" :close-on-click-modal="false"
      :close-on-press-escape="false" :show-close="false" width="400px">
      <div class="flex flex-col items-center">
        <el-progress type="circle" :percentage="progressPercentage"></el-progress>
        <div class="mt-4 text-gray-600">正在生成二维码文件...</div>
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
  plannedManageQrcodeGenerate // 添加导入
} from '@/api/plan'
import CustomSwitch from '@/components/CustomSwitch.vue'

export default {
  name: 'PlanManagement',
  components: {
    CustomSwitch
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
        status: undefined,
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
          hidden: true // 添加 hidden 属性
        },
        {
          name: '自主填报特殊走访',
          type: '6',
          image: require('@/assets/images/box4.jpg'),
          filterStyle: 'filter: brightness(0.8) sepia(0.3)',
          hidden: true // 添加 hidden 属性
        }
      ],
      planCounts: [], // 添加计划数量数据
      progressVisible: false,
      progressPercentage: 0
    }
  },
  created() {
    this.getList()
    this.getPlanTypeCount() // 添加获取计划类型数量的调用
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
          } else {
            this.$message.error(response.msg || '获取计划列表失败')
          }
          this.loading = false
        })
        .catch(() => {
          this.loading = false
          // this.$message.error('获取计划列表失败');
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
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const planId = row.planId
      this.$modal
        .confirm('是否确认删除该计划？')
        .then(() => {
          // 修改删除接口调用
          return asyncDeletePlan({ planIds: planId })
        })
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
          // 同时刷新统计数量
          this.getPlanTypeCount()
        })
        .catch((error) => {
          console.error('删除失败:', error)
          // this.$modal.msgError(error.msg || '删除失败')
        })
    },
    /** 打开新建计划页面 */
    createPlan(type) {
      // 特殊走访和特殊巡视跳转到special页面
      const routeUrl = (type === '2' || type === '4')
        ? `/plan/special/${type}`
        : `/plan/visit/${type}`
      this.$tab.openPage('新建计划', routeUrl)
    },
    /** 打开编辑计划页面 */
    handleUpdate(row) {
      // 特殊走访和特殊巡视跳转到special页面
      const routeUrl = (row.planType === '2' || row.planType === '4')
        ? `/plan/special/${row.planType}/${row.planId}`
        : `/plan/visit/${row.planType}/${row.planId}`
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
          this.getList() // 刷新列表
          resolve() // 成功时 resolve
        } else {
          this.$modal.msgError(res.msg || `${text}失败`)
          reject(new Error(res.msg || `${text}失败`)) // 失败时 reject
        }
      } catch (error) {
        // 取消确认或接口报错时 reject
        reject(error)
      }
    },
    // 获取计划类型数量
    async getPlanTypeCount() {
      try {
        const res = await asyncGetPlanCount()
        // 修改判断条件为 200
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
    /** 批量生成二维码 */
    handleGenerateQrcode() {
      this.$modal.confirm('是否确认生成二维码文件？').then(() => {
        this.progressVisible = true
        this.progressPercentage = 0

        // 模拟进度增加
        const timer = setInterval(() => {
          if (this.progressPercentage < 90) {
            this.progressPercentage += 10
          }
        }, 300)

        plannedManageQrcodeGenerate()
          .then((res) => {
            // 完成时直接显示100%
            this.progressPercentage = 100
            setTimeout(() => {
              clearInterval(timer)
              this.progressVisible = false

              // 创建 Blob 对象
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
            this.$modal.msgError('二维码生成失败')
          })
      })
    }
  }
}
</script>
