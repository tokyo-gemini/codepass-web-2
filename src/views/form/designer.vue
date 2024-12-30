<template>
  <div class="app-container flex flex-col">
    <el-page-header @back="handleBack" class="mb-4">
      <template #title>
        <span>返回表单列表</span>
      </template>
      <template #content>
        <div class="flex items-center justify-between w-full">
          <span class="text-large font-600 mr-3">
            {{ pageTitle }}
          </span>
        </div>
      </template>
      <template #extra>
        <el-space>
          <el-button type="primary" @click="handleSave" class="mr-2"
            >保存</el-button
          >
          <el-button v-if="!$route.query.copyData" @click="handleReset"
            >重置</el-button
          >
        </el-space>
      </template>
    </el-page-header>

    <div class="">
      <el-form :model="formInfo" :rules="rules" ref="formInfoRef" inline>
        <el-form-item label="表单名称" prop="formName">
          <el-input v-model="formInfo.formName" placeholder="请输入表单名称" />
        </el-form-item>
        <el-form-item label="表单类型" prop="formType">
          <el-select
            style="width: 200px"
            v-model="formInfo.formType"
            placeholder="请选择表单类型"
            :disabled="!!formId"
          >
            <el-option
              v-for="dict in dict.type.form_type_option"
              :key="dict.value"
              :label="dict.label"
              :value="dict.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    <div class="designer">
      <vm-form-designer 
        ref="designerRef"
        :designer-config="designerConfig"
        @save="handleSave"
      >
        <template #toolButton>
          <el-button type="primary" size="small" @click="handleSave">
            <i class="el-icon-finished"></i>保存
          </el-button>
        </template>
      </vm-form-designer>
    </div>
  </div>
</template>

<script>
import {
  asyncAddFormDesign,
  asyncEditFormDesign,
  asyncGetFormDesignById
} from '@/api/form';

export default {
  name: 'FormDesigner',
  // 声明需要使用的字典
  dicts: ['form_type_option'],
  data() {
    return {
      formId: this.$route.params.id,
      formInfo: {
        formName: '',
        formType: undefined,
        formId: '',
        formVersionId: '',
        formJson: null
      },
      rules: {
        formName: [{ required: true, message: '请输入表单名称', trigger: 'blur' }],
        formType: [{ required: true, message: '请选择表单类型', trigger: 'change' }]
      },
      designerConfig: {
        // VForm Mobile配置
        showLayoutButton: false,
        showSwitchDeviceButton: false, 
        layoutType: 'H5',
        deviceType: 'mobile',
        // 保留部分原有配置
        previewFormButton: true,
        clearDesignerButton: true,
        toolbarMaxWidth: 320
      },
      defaultFormJson: {
        widgetList: [],
        formConfig: {
          modelName: 'formData',
          refName: 'vmForm',
          rulesName: 'rules',
          labelWidth: 80,
          labelPosition: 'left',
          size: '',
          labelAlign: 'label-left-align',
          cssCode: '',
          customClass: [],
          functions: '',
          layoutType: 'H5',
          onFormCreated: '',
          onFormMounted: '',
          onFormDataChange: '',
        }
      }
    }
  },
  mounted() {
    // 使用 nextTick 确保组件已完全挂载
    this.$nextTick(() => {
      this.initPage();
    });
  },
  computed: {
    pageTitle() {
      return this.formId ? `编辑表单-${this.formInfo.formName}` : '新增表单'
    }
  },
  methods: {
    async initPage() {
      // 添加refs检查
      if (!this.$refs.designerRef) {
        console.error('表单设计器组件未初始化');
        return;
      }

      if (this.formId) {
        try {
          const res = await asyncGetFormDesignById({ formId: this.formId });
          if (res.code === 0) {
            this.formInfo = {
              formName: res.data.formName,
              formType: res.data.formType,
              formId: res.data.formId,
              formVersionId: res.data.formVersionId
            };
            // 添加检查
            if (this.$refs.designerRef && typeof this.$refs.designerRef.setFormJson === 'function') {
              this.$refs.designerRef.setFormJson({
                widgetList: JSON.parse(res.data.widgetList),
                formConfig: JSON.parse(res.data.formConfig)
              });
            }
          }
        } catch (error) {
          console.error('获取表单详情失败:', error);
          this.$modal.msgError('获取表单详情失败');
        }
      } else {
        const copyData = this.$route.query.copyData;
        if (copyData) {
          const data = JSON.parse(copyData);
          this.handleCopyData(data);
        } else {
          // 添加检查
          if (this.$refs.designerRef && typeof this.$refs.designerRef.setFormJson === 'function') {
            this.$refs.designerRef.setFormJson(this.defaultFormJson);
          }
        }
      }
    },
    handleCopyData(data) {
      this.formInfo = {
        formName: data.formName,
        formType: data.formType,
        formId: data.formId,
        formVersionId: data.formVersionId
      };
      
      // 添加检查
      if (this.$refs.designerRef && typeof this.$refs.designerRef.setFormJson === 'function') {
        const formJson = {
          widgetList: JSON.parse(data.widgetList),
          formConfig: JSON.parse(data.formConfig)
        };
        this.$refs.designerRef.setFormJson(formJson);
      }
    },
    async handleSave() {
      try {
        const formJson = await this.validateForm();
        if (!formJson) return;

        const saveData = this.prepareSaveData(formJson);
        const saveApi = this.formId ? asyncEditFormDesign : asyncAddFormDesign;
        const msg = this.formId ? '更新成功' : '新增成功';

        await saveApi(saveData);
        this.$modal.msgSuccess(msg);
        this.$tab.closeOpenPage({ path: '/form/index', title: '表单管理' });
      } catch (error) {
        console.error('保存失败:', error);
        this.$modal.msgError('保存失败');
      }
    },
    prepareSaveData(formJson) {
      return {
        formId: this.formInfo.formId,
        formVersionId: this.formInfo.formVersionId,
        formName: this.formInfo.formName,
        formType: this.formInfo.formType,
        formConfig: JSON.stringify(formJson.formConfig),
        widgetList: JSON.stringify(formJson.widgetList),
        createUserId: '',
        createUserName: '',
        formNumber: '',
        formVersion: '',
        optionData: '',
        version: '',
      };
    },
    async validateForm() {
      const valid = await this.$refs.formInfoRef.validate();
      if (!valid) return false;

      // 获取VForm Mobile设计器的表单数据
      const formJson = this.$refs.designerRef.getFormJson();
      if (!formJson.widgetList?.length) {
        this.$modal.msgError('请添加表单组件');
        return false;
      }

      return formJson;
    },
    handleReset() {
      this.$modal
        .confirm('确定要重置表单信息吗？')
        .then(() => {
          this.formInfo = {
            formName: '',
            formType: undefined,
            formId: '',
            formVersionId: '',
            formJson: null,
          };
          this.$refs.formInfoRef?.resetFields();

          this.$modal.msgSuccess('表单信息已重置');
        })
        .catch(() => {});
    },
    handleBack() {
      this.$tab.closeOpenPage({ path: '/form/index', title: '表单管理' });
    },
    handleCancel() {
      this.handleBack();
    }
  }
}
</script>