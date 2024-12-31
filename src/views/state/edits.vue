<template>
    <div class="app-container flex flex-col w-full">
        <el-page-header @back="handleBack">
            <template #title>
                <div class="w-full h-full flex items-center">返回状态列表</div>
            </template>
            <template #content>
                <div class="flex items-center space-x-4 justify-between w-full">
                    <span class="text-lg font-semibold mr-3">
                        {{ currentState.statusName }}
                    </span>
                    <div class="flex flex-wrap gap-2">
                        <el-tag v-for="item in currentState.statusDataList" :key="item.statusDataId"
                            :type="getTagType(item.statusValue)">
                            {{ item.statusDataName }}
                        </el-tag>
                    </div>
                </div>
            </template>
        </el-page-header>
        <el-divider></el-divider>

        <div class="bg-white p-4 rounded shadow">
            <!-- 已绑定表单列表 -->
            <div class="grid grid-cols-4 gap-4">
                <!-- 已绑定的表单卡片 -->
                <div v-for="form in bindingForms" :key="form.formId"
                    class="w-40 h-40 shadow rounded flex flex-col justify-between p-4">
                    <div class="flex flex-col gap-2">
                        <div class="font-bold text-gray-800">{{ form.formName }}</div>
                        <div class="text-sm text-gray-500">
                            已关联 {{ form.statusBindingOptions.length }} 个选项
                        </div>
                    </div>
                    <div class="flex justify-between mt-4">
                        <el-button type="primary" size="small" @click="handleEditBinding(form)">
                            编辑
                        </el-button>
                        <el-button type="danger" size="small" @click="handleDeleteBinding(form)">
                            删除
                        </el-button>
                    </div>
                </div>

                <!-- 添加新表单按钮 -->
                <div class="w-40 h-40 shadow rounded flex items-center justify-center flex-col gap-4">
                    <div class="rounded-full border el-icon-circle-plus text-6xl flex items-center justify-center text-gray-300 hover:opacity-90 cursor-pointer"
                        @click="checkAndOpenDialog"></div>
                    <div class="font-bold">点击添加关联表单</div>
                </div>
            </div>
        </div>

        <!-- 新增对话框 -->
        <el-dialog title="关联表单控件" :visible.sync="dialogVisible" width="70%">
            <div class="grid grid-cols-1 gap-4">
                <!-- 表单列表 -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="grid grid-cols-3 gap-4">
                        <div v-for="(form, index) in associatedForm" :key="form.formId"
                            class="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
                            :class="{ 'ring-2 ring-blue-500': currentFormIndex === index }" @click="selectForm(index)">
                            <div class="flex flex-col gap-2">
                                <div class="font-medium text-gray-900">{{ form.label }}</div>
                                <div class="text-sm text-gray-500">表单编号: {{ form.formNumber }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 选项配置区域 -->
                <div v-if="currentFormIndex !== null" class="bg-white p-4 rounded-lg shadow">
                    <div class="space-y-4">
                        <!-- 控件选择 -->
                        <div class="flex items-center gap-4">
                            <label class="text-sm font-medium text-gray-700">请选择一个表单控件</label>
                            <el-select v-model="optionArray[`it${currentFormIndex}`].value" clearable placeholder="选择控件"
                                class="w-64" @change="val => handleSelectionChange(val, currentFormIndex)">
                                <el-option v-for="option in optionArray[`it${currentFormIndex}`].selectItems"
                                    :key="option.value" :label="option.label" :value="option.value" />
                            </el-select>
                        </div>

                        <!-- 状态映射配置 -->
                        <div v-if="formRender" class="space-y-4">
                            <div v-for="info in baseInfo" :key="info.valueId" class="p-4 bg-gray-50 rounded-lg">
                                <div class="flex items-center gap-4">
                                    <span class="font-medium">{{ info.label }}</span>
                                    <span class="text-gray-600">{{ info.value }}</span>
                                    <el-radio-group v-model="info.rowCurrent">
                                        <el-radio v-for="it in info.row" :key="it.statusDataId"
                                            :label="it.statusDataId">
                                            {{ it.statusDataName }}
                                        </el-radio>
                                    </el-radio-group>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div slot="footer" class="flex justify-end gap-4">
                <el-button @click="reset">取 消</el-button>
                <el-button type="primary" @click="rowCurrentChange">确 定</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import {
    asyncGetStateList,
    asyncGetFormAndFormItem,
    AsyncCodesstatusTypebindingform,
    statusTypegetbindinginfo
} from "@/api/state";
import { getTagType } from "./index";

export default {
    name: "StateEdit",
    data() {
        return {
            queryParams: {
                pageNum: 1,
                pageSize: 10,
            },
            currentState: {}, // 使用 null 代替空字符串
            dialogVisible: false,
            activeTab: "",
            associatedForm: [],
            optionArray: {},
            baseInfo: [],
            formRender: false,
            currentFormIndex: null, // 替代原来的 tabIndex
            bindingForms: [], // 已绑定的表单列表
        };
    },
    computed: {
        currentId() {
            return this.$route.params.id;
        },
    },
    created() {
        this.fetchStateData();
        this.fetchFormData();
        this.fetchBindingForms(); // 添加获取已绑定表单的调用
    },
    methods: {
        getTagType,
        handleBack() {
            this.$tab.closeOpenPage({ path: "/state/index", title: "状态管理" });
        },
        async fetchStateData() {
            try {
                const response = await asyncGetStateList(this.queryParams);
                const id = this.currentId;
                this.currentState = response.rows.find(
                    (item) => item.statusTypeId === id
                );
            } catch (error) {
                console.error("获取状态数据失败:", error);
            }
        },
        async checkAndOpenDialog() {
            try {
                const statusTypeId = this.currentId;
                const res = await asyncGetFormAndFormItem({ statusTypeId });
                if (!res.data || res.data.length === 0) {
                    this.$message.warning("暂无可关联的表单");
                    return;
                }
                this.dialogVisible = true;
                this.fetchFormData();
            } catch (error) {
                console.error("获取表单数据失败:", error);
                this.$message.error("获取表单数据失败");
            }
        },
        async fetchFormData() {
            try {
                const statusTypeId = this.currentId;
                const res = await asyncGetFormAndFormItem({ statusTypeId });
                const { data } = res;
                this.associatedForm = [];
                this.optionArray = {};

                if (!data || data.length === 0) {
                    this.dialogVisible = false;
                    return;
                }

                data.forEach((item, index) => {
                    if (item.bindingStatus === 0) {
                        const content = JSON.parse(item.optionData);
                        this.associatedForm.push({
                            label: item.formName,
                            formId: item.formId,
                            formNumber: item.formNumber,
                            bindingStatus: item.bindingStatus,
                            widgetList: content,
                        });

                        this.optionArray[`it${index}`] = {
                            selectItems: content
                                .filter((widget) => widget.type === "m-radio")
                                .map((widget) => ({
                                    label: widget.options.label,
                                    value: widget.id,
                                })),
                            value: null,
                        };
                    }
                });
            } catch (error) {
                console.error("获取表单数据失败:", error);
                this.$message.error("获取表单数据失败");
            }
        },
        handleSelectionChange(selectedValue, index) {
            this.formRender = true;
            this.baseInfo = [];

            const selectedWidget = this.associatedForm[index].widgetList.find(
                (widget) => widget.id === selectedValue
            );

            if (selectedWidget) {
                selectedWidget.options.optionItems.forEach((item, idx) => {
                    this.baseInfo.push({
                        label: `选中${idx + 1}`,
                        value: item.label,
                        row: this.currentState.statusDataList,
                        rowCurrent: null,
                        valueId: item.value,
                        valueLabel: item.label,
                    });
                });
            }
        },
        async rowCurrentChange() {
            if (this.currentFormIndex === null) {
                this.$message.warning('请先选择一个表单');
                return;
            }

            const selectedForm = this.associatedForm[this.currentFormIndex];
            const selectedOptionId = this.optionArray[`it${this.currentFormIndex}`].value;

            const selectedWidget = selectedForm.widgetList.find(
                (widget) => widget.id === selectedOptionId
            );

            if (!selectedWidget) {
                this.$message.error("请选择一个选项");
                return;
            }

            const params = {
                dataDtoList: this.baseInfo
                    .filter((info) => info.rowCurrent)
                    .map((info) => ({
                        optionId: selectedWidget.options.name,
                        statusDataId: info.rowCurrent,
                        valueId: info.valueId,
                        valueLabel: info.valueLabel,
                    })),
                formId: selectedForm.formId,
                optionLabel: selectedWidget.options.label,
                statusTypeId: this.currentId,
            };

            try {
                const response = await AsyncCodesstatusTypebindingform(params);
                this.$message.success(response.msg);
                this.dialogVisible = false;
                this.reset();
                this.fetchStateData();
                this.fetchBindingForms()
            } catch (error) {
                console.error("保存失败:", error);
                this.$message.error("保存失败");
            }
        },
        reset() {
            this.baseInfo = [];
            this.currentFormIndex = null;
            this.formRender = false;
            this.dialogVisible = false;
        },
        selectForm(index) {
            this.currentFormIndex = index;
            this.formRender = false;
            this.baseInfo = [];
            if (this.optionArray[`it${index}`]) {
                this.optionArray[`it${index}`].value = null;
            }
        },
        // 获取已绑定表单数据
        async fetchBindingForms() {
            try {
                const res = await statusTypegetbindinginfo({ statusTypeId: this.currentId });
                if (res.code === 0 && res.data) {
                    this.bindingForms = res.data;
                }
            } catch (error) {
                console.error('获取已绑定表单失败:', error);
                this.$message.error('获取已绑定表单失败');
            }
        },

        // 编辑已绑定表单
        handleEditBinding(form) {
            // TODO: 实现编辑逻辑
            console.log('编辑表单:', form);
        },

        // 删除已绑定表单
        handleDeleteBinding(form) {
            this.$confirm('确认删除该关联表单吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                // TODO: 实现删除逻辑
                console.log('删除表单:', form);
            }).catch(() => { });
        },
    },
};
</script>