<template>
  <div class="app-container">
    <el-form
      :model="queryParams"
      ref="queryRef"
      :inline="true"
      v-show="formName"
    >
      <el-form-item label="表单名称/编号" prop="formName">
        <el-input
          v-model="queryParams.formName"
          placeholder="请输入表单名称/编号"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="表单类型" prop="formType">
        <el-select
          v-model="queryParams.formType"
          placeholder="表单类型"
          clearable
          style="width: 200px"
        >
          <el-option
            v-for="dict in dict.type.form_type_option"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery"
          >搜索</el-button
        >
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['system:notice:add']"
          >新增</el-button
        >
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['system:notice:edit']"
          >修改</el-button
        >
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['system:notice:remove']"
          >删除</el-button
        >
      </el-col>
      <right-toolbar
        v-model:showSearch="showSearch"
        @queryTable="getList"
      ></right-toolbar>
    </el-row>

    <el-table
      v-loading="loading"
      :data="formList"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column
        label="表单名称"
        align="center"
        prop="formName"
        :show-overflow-tooltip="true"
      />
      <el-table-column
        label="表单编号"
        align="center"
        prop="formNumber"
        width="150"
      />
      <el-table-column
        label="表单类型"
        align="center"
        prop="formType"
        width="120"
      >
        <template #default="scope">
          <dict-tag :options="dict.type.form_type_option" :value="scope.row.formType" />
        </template>
      </el-table-column>
      <el-table-column
        label="被引用数"
        align="center"
        prop="quoteCount"
        width="100"
      />
      <el-table-column
        label="创建人"
        align="center"
        prop="createUserName"
        width="100"
      />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        width="160"
      >
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        align="center"
        class-name="small-padding fixed-width"
      >
        <template #default="scope">
          <el-button
            link
            type="primary"
            icon="Delete"
            @click="handleDelete(scope.row)"
            >删除</el-button
          >
          <el-button
            link
            type="primary"
            icon="Edit"
            @click="handleUpdate(scope.row)"
            >编辑</el-button
          >
          <el-button
            link
            type="primary"
            icon="DocumentCopy"
            @click="handleCopy(scope.row)"
            >复制</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 添加或修改公告对话框 -->
    <el-dialog :title="title" v-model="open" width="780px" append-to-body>
      <el-form ref="noticeRef" :model="form" :rules="rules" label-width="80px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="公告标题" prop="noticeTitle">
              <el-input
                v-model="form.noticeTitle"
                placeholder="请输入公告标题"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公告类型" prop="noticeType">
              <el-select v-model="form.noticeType" placeholder="请选择">
                <el-option
                  v-for="dict in dict.type.sys_notice_type"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio
                  v-for="dict in dict.type.sys_notice_status"
                  :key="dict.value"
                  :value="dict.value"
                  >{{ dict.label }}</el-radio
                >
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="内容">
              <editor v-model="form.noticeContent" :min-height="192" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { updateNotice } from '@/api/system/notice';
import { asyncGetFormDesignPage, asyncCopyFormDesign } from '@/api/form';

export default {
  name: 'FormManage',
  // 声明需要使用的字典
  dicts: ['form_type_option', 'sys_notice_type', 'sys_notice_status'],
  data() {
    return {
      // 增加必要的数据属性
      formList: [],
      open: false,
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
        pageSize: 10,
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
    cancel() {
      this.open = false;
      this.reset();
    },
    reset() {
      this.form = {
        noticeId: undefined,
        noticeTitle: undefined,
        noticeType: undefined,
        noticeContent: undefined,
        status: '0'
      };
      this.$refs['noticeRef'].resetFields();
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
      this.ids = selection.map(item => item.noticeId);
      this.single = selection.length != 1;
      this.multiple = !selection.length;
    },
    handleAdd() {
      this.$tab.openPage("新增表单", '/form/designer');
    },
    submitForm() {
      this.$refs['noticeRef'].validate(valid => {
        if (valid) {
          if (this.form.noticeId != undefined) {
            updateNotice(this.form).then(response => {
              this.$modal.msgSuccess('修改成功');
              this.open = false;
              this.getList();
            });
          } else {
            addNotice(this.form).then(response => {
              this.$modal.msgSuccess('新增成功');
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    handleDelete(row) {
      const formIds = row.formId || this.ids;
      this.$modal.confirm('是否确认删除表单编号为"' + formIds + '"的数据项？')
        .then(function () {
          return delForm(formIds); // 注意：需要实现delForm API
        })
        .then(() => {
          this.getList();
          this.$modal.msgSuccess('删除成功');
          this.$refs.formTable?.clearSelection();
        })
        .catch(() => {});
    },
    async handleCopy(row) {
      try {
        const res = await asyncCopyFormDesign({ formId: row.formId });
        if (res.code === 0) {
          this.$modal.msgSuccess('复制成功,请编辑复制的表单！');
          this.$tab.openPage(`复制表单-${res.data.formName}`, '/form/designer', {
            query: {
              copyData: JSON.stringify({
                formId: res.data.formId,
                formVersionId: res.data.formVersionId,
                formName: res.data.formName,
                formType: res.data.formType,
                widgetList: res.data.widgetList,
                formConfig: res.data.formConfig
              })
            }
          });
        }
      } catch (error) {
        console.error('复制失败:', error);
        this.$modal.msgError('复制失败');
      }
    },
    handleUpdate(row) {
      const formId = row.formId || this.ids[0];
      this.$tab.openPage(`编辑表单-${row.formName}`, `/form/designer/${formId}`);
    }
  }
};
</script>
