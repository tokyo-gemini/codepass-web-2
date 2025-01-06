<template>
  <div class="app-container">
    <div class="bg-white w-full h-full rounded p-4 shadow">

      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="formName">
        <el-form-item label="表单名称/编号" prop="formName">
          <el-input v-model="queryParams.formName" placeholder="请输入表单名称/编号" clearable style="width: 200px"
            @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="表单类型" prop="formType">
          <el-select v-model="queryParams.formType" placeholder="表单类型" clearable style="width: 200px">
            <el-option v-for="dict in dict.type.form_type_option" :key="dict.value" :label="dict.label"
              :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button type="primary" plain icon="Plus" @click="handleAdd"
            v-hasPermi="['system:notice:add']">新增</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate"
            v-hasPermi="['system:notice:edit']">修改</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete"
            v-hasPermi="['system:notice:remove']">删除</el-button>
        </el-col>
        <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>
      <div class="text-xs text-gray-500 my-4 font-bold">
        可以管理或创建不用的表单类型,后续可以给计划管理或自动派单使用

      </div>
      <el-table v-loading="loading" :data="formList" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="表单名称" align="center" prop="formName" :show-overflow-tooltip="true" />
        <el-table-column label="表单编号" align="center" prop="formNumber" width="150" />
        <el-table-column label="表单类型" align="center" prop="formType" width="120">
          <template #default="scope">
            <dict-tag :options="dict.type.form_type_option" :value="scope.row.formType" />
          </template>
        </el-table-column>
        <el-table-column label="被引用数" align="center" prop="quoteCount" width="100" />
        <el-table-column label="创建人" align="center" prop="createUserName" width="100" />
        <el-table-column label="创建时间" align="center" prop="createTime" width="160">
          <template #default="scope">
            <span>{{ parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template #default="scope">
            <el-button type="text" @click="handleDelete(scope.row)">删除</el-button>
            <el-button type="text" @click="handleUpdate(scope.row)">编辑</el-button>
            <el-button type="text" @click="handleCopy(scope.row)">复制</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" :page="queryParams.pageNum" :limit="queryParams.pageSize"
        @pagination="handlePagination" />
    </div>

  </div>

</template>

<script>
import { asyncGetFormDesignPage, asyncCopyFormDesign, asyncDeleteFormDesign } from '@/api/form';

export default {
  name: 'FormManage',
  // 声明需要使用的字典
  dicts: ['form_type_option'],
  data() {
    return {
      // 增加必要的数据属性
      formList: [],
      loading: true,
      formName: true,
      showSearch: true,
      ids: [],
      single: true,
      multiple: true,
      total: 0,
      title: '',
      form: {},
      queryParams: {
        pageNum: 1,
        pageSize: 10, // 修改默认分页大小为10
        formName: undefined,
        formType: undefined
      },
      rules: {
        formName: [
          { required: true, message: '表单名称不能为空', trigger: 'blur' }
        ],
        formType: [
          { required: true, message: '表单类型不能为空', trigger: 'change' }
        ]
      },
      copyForm: {
        formType: undefined,
        formId: ''
      }
    }
  },
  created() {
    this.getList();
  },
  methods: {
    getList() {
      this.loading = true;
      asyncGetFormDesignPage(this.queryParams).then(response => {
        this.formList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    resetQuery() {
      this.$refs['queryRef'].resetFields();
      this.handleQuery();
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.formId);
      this.single = selection.length != 1;
      this.multiple = !selection.length;
    },
    handleAdd() {
      this.$tab.openPage("新增表单", '/form/designer');
    },
    handleDelete(row) {
      const formIds = row.formId || this.ids.toString();
      const formNames = row.formName || this.formList.filter(item => this.ids.includes(item.formId))
        .map(item => item.formName)
        .join('、');

      this.$modal.confirm('是否确认删除表单"' + formNames + '"？')
        .then(function () {
          return asyncDeleteFormDesign({ formIds });
        })
        .then(() => {
          this.getList();
          this.$modal.msgSuccess('删除成功');
        })
        .catch(() => { });
    },
    async handleCopy(row) {
      // 判断是否为默认表单(formType为7或8)
      if (row.formType == 7 || row.formType == 8) {
        this.copyForm.formId = row.formId;
        this.copyForm.formType = undefined;
        this.$modal.msgWarning("复制默认表单需要重新选择表单类型！");
      } else {
        // 非默认表单直接复制
        this.$modal.confirm('确定要复制当前表单?').then(async () => {
          try {
            const res = await asyncCopyFormDesign({ formId: row.formId });
            if (res.code === 200) {
              this.$modal.msgSuccess('复制成功,请编辑复制的表单！');
              // 添加 isCopy 参数
              this.$tab.openPage(
                `复制表单-${res.data.formName}`,
                `/form/designer/${res.data.formId}?isCopy=true`
              );
            }
          } catch (error) {
            console.error('复制失败:', error);
            this.$modal.msgError('复制失败');
          }
        });
      }
    },

    // 确认复制默认表单
    async handleCopyConfirm() {
      if (!this.copyForm.formType) {
        this.$modal.msgWarning("请选择表单类型！");
        return;
      }

      try {
        // 为默认表单指定新的类型进行复制
        const res = await asyncCopyFormDesign({
          formId: this.copyForm.formId,
          formType: this.copyForm.formType
        });

        if (res.code === 200) {
          this.$modal.msgSuccess('复制成功,请编辑复制的表单！');
          // 跳转到设计器页面
          this.$tab.openPage(`复制表单-${res.data.formName}`, `/form/designer/${res.data.formId}`);
        }
      } catch (error) {
        console.error('复制失败:', error);
        this.$modal.msgError('复制失败');
      }
    },
    handleUpdate(row) {
      const formId = row.formId || this.ids[0];
      this.$tab.openPage(`编辑表单-${row.formName}`, `/form/designer/${formId}`);
    },
    // 添加分页方法
    handlePagination(val) {
      this.queryParams.pageNum = val.page;
      this.queryParams.pageSize = val.limit;
      this.getList();
    },
  }
};
</script>
