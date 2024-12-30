<template>
  <div class="app-container flex flex-col h-screen gap-4">
    <!-- 快速创建模块 -->
    <div class="bg-white rounded p-4 h-2/6 shadow">
      <div class="text-xl font-medium mb-1">快速创建</div>
      <div class="text-gray-500 text-sm mb-5">可以点击下方不同计划类型,完成计划的创建</div>
      <div class="flex justify-between items-center h-36">
        <div v-for="(item, index) in planTypes" :key="index"
          class="w-1/5 h-36 p-6 relative cursor-pointer rounded hover:opacity-95" @click="createPlan(item.type)">
          <div class="absolute z-10 left-4 top-4 w-full h-full">
            <div class="text-2xl text-white font-bold">{{ item.name }}</div>
            <div class="text-white text-base mt-2 font-bold">0项</div>
          </div>
          <img :src="item.image" :alt="item.name"
            class="absolute left-0 top-0 w-full h-full object-cover z-0 rounded" />
        </div>
      </div>
    </div>

    <!-- 计划列表模块 -->
    <div class="h-4/6 flex-1 p-4 shadow rounded">
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
        </el-form>
      </div>

      <el-table v-loading="loading" :data="planList">
        <el-table-column label="计划名称" prop="planName" align="center" />
        <el-table-column label="类型" prop="planType" align="center">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.plan_type_option" :value="scope.row.planType" />
          </template>
        </el-table-column>
        <el-table-column label="描述" prop="description" align="center" />
        <el-table-column label="循环次数" prop="loopCount" align="center" />
        <el-table-column label="计划完成率" prop="completionRate" align="center" />
        <el-table-column label="状态" prop="status" align="center">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.plan_status_option" :value="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" align="center">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d}') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)">编辑</el-button>
            <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
        @pagination="getList" />
    </div>
  </div>
</template>

<script>
import { asyncGetPlanList } from '@/api/plan'
export default {
  name: "PlanManagement",
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
        }
      ]
    };
  },
  created() {
    this.getList();
  },
  methods: {
    /** 查询计划列表 */
    getList() {
      this.loading = true;
      asyncGetPlanList(this.queryParams).then(response => {
        this.planList = response.data.records;
        this.total = response.data.total;
        this.loading = false;
      }).catch(() => {
        this.loading = false;
      });
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm("queryForm");
      this.handleQuery();
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const planIds = row.planId || this.ids;
      this.$modal.confirm('是否确认删除计划编号为"' + planIds + '"的数据项？').then(() => {
        // return delPlan(planIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("删除成功");
      }).catch(() => { });
    },
    /** 打开新建计划页面 */
    createPlan(type) {
      const routeUrl = `/plan/visit/${type}`;
      this.$tab.openPage("新建计划", routeUrl);
    },
    /** 打开编辑计划页面 */
    handleUpdate(row) {
      const routeUrl = `/plan/visit/${row.planType}/${row.planId}`;
      this.$tab.openPage("编辑计划", routeUrl);
    }
  }
};
</script>