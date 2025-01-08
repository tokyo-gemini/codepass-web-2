<template>
  <div class="app-container flex flex-col w-full">
    <el-page-header @back="handleBack">
      <template #title>
        <div class="w-full h-full flex items-center">返回表单列表</div>
      </template>
      <template #content>
        <div class="flex gap-4">
          <div class="flex items-center space-x-4 justify-between w-full designer">
            <span class="text-lg font-semibold mr-3">
              {{ pageTitle }}
            </span>
            <div class="flex gap-4">
              <el-form :model="formInfo" :rules="rules" ref="formInfoRef" inline>
                <div class="flex w-full">
                  <div class="w-auto">
                    <el-form-item label="表单名称" prop="formName">
                      <el-input style="width: 200px" v-model="formInfo.formName" placeholder="请输入表单名称" />
                    </el-form-item>
                  </div>
                  <div class="w-auto">
                    <el-form-item label="表单类型" prop="formType">
                      <el-select style="width: 200px" v-model="formInfo.formType" placeholder="请选择表单类型"
                        :disabled="!!formId">
                        <el-option v-for="dict in dict.type.form_type_option" :key="dict.value" :label="dict.label"
                          :value="dict.value" />
                      </el-select>
                    </el-form-item>
                  </div>
                  <div class="w-full flex-1">
                    <el-button type="primary" @click="handleSave" class="mr-2">保存</el-button>
                    <el-button v-if="!$route.query.copyData" @click="handleReset">重置</el-button>
                  </div>
                </div>
              </el-form>
            </div>
          </div>
        </div>
      </template>
    </el-page-header>
    <el-divider></el-divider>

    <div class="designer">
      <vm-form-designer ref="designerRef" :designer-config="designerConfig" @save="handleSave">
      </vm-form-designer>
    </div>
  </div>
</template>

<script>
import {
  asyncAddFormDesign,
  asyncEditFormDesign,
  asyncGetFormDesignById,
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
        formJson: null,
      },
      rules: {
        formName: [
          { required: true, message: '请输入表单名称', trigger: 'blur' },
        ],
        formType: [
          { required: true, message: '请选择表单类型', trigger: 'change' },
        ],
      },
      designerConfig: {
        // 扩展设计器配置
        languageMenu: false,
        externalLink: false,
        formTemplates: false,
        eventCollapse: false,
        generateSFCButton: false,
        importJsonButton: true,
        exportJsonButton: true,
        exportCodeButton: false,
        previewFormButton: true,
        clearDesignerButton: true,
        // 移动端配置
        showLayoutButton: false,
        showSwitchDeviceButton: false,
        layoutType: 'H5',
        deviceType: 'mobile',
        toolbarMaxWidth: 300
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
        },
      },
    };
  },
  mounted() {
    // 使用 nextTick 确保组件已完全挂载
    this.$nextTick(() => {
      this.initPage();
    });
  },
  computed: {
    pageTitle() {
      return this.formId ? `编辑表单-${this.formInfo.formName}` : '新增表单';
    },
  },
  methods: {
    async initPage() {
      if (!this.$refs.designerRef) {
        console.error('表单设计器组件未初始化');
        return;
      }

      const copyData = this.$route.query.copyData;
      if (copyData) {
        try {
          // 解析复制的数据
          const data = JSON.parse(copyData);
          console.log('复制的表单数据:', data); // 调试用

          // 设置基本信息
          this.formInfo = {
            formName: data.formName,
            formType: data.formType,
            formId: data.formId,
            formVersionId: data.formVersionId
          };

          // 设置表单设计数据
          if (this.$refs.designerRef?.setFormJson) {
            const formJson = {
              widgetList: JSON.parse(data.widgetList),
              formConfig: {
                ...JSON.parse(data.formConfig),
                layoutType: 'H5'  // 确保使用H5布局
              }
            };
            this.$refs.designerRef.setFormJson(formJson);
          }
        } catch (error) {
          console.error('解析复制数据失败:', error);
          this.$modal.msgError('解析复制数据失败');
        }
      } else if (this.formId) {
        try {
          const res = await asyncGetFormDesignById(this.formId);
          if (res.code === 200) {
            this.formInfo = {
              formName: res.data.formName,
              formType: res.data.formType,
              formId: res.data.formId,
              formVersionId: res.data.formVersionId,
            };

            const formConfig = JSON.parse(res.data.formConfig);
            const widgetList = JSON.parse(res.data.widgetList);

            if (this.$refs.designerRef?.setFormJson) {
              this.$refs.designerRef.setFormJson({
                widgetList,
                formConfig: {
                  ...formConfig,
                  layoutType: 'H5'
                }
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
          if (
            this.$refs.designerRef &&
            typeof this.$refs.designerRef.setFormJson === 'function'
          ) {
            this.$refs.designerRef.setFormJson(this.defaultFormJson);
          }
        }
      }

      if (!this.formId && !this.$route.query.copyData) {
        this.$refs.designerRef?.setFormJson({
          ...this.defaultFormJson,
          formConfig: {
            ...this.defaultFormJson.formConfig,
            layoutType: 'H5',
          },
        });
      }
    },
    handleCopyData(data) {
      this.formInfo = {
        formName: data.formName,
        formType: data.formType,
        formId: data.formId,
        formVersionId: '', // 新表单不需要版本ID
      };

      if (this.$refs.designerRef) {
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
        // this.$modal.msgError('保存失败');
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
        .catch(() => { });
    },
    handleBack() {
      this.$tab.closeOpenPage({ path: '/form/index', title: '表单管理' });
    },
    handleCancel() {
      this.handleBack();
    },
  },
};
</script>