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

        <!-- 添加操作说明区域 -->
        <div class="bg-gray-50 p-4 mb-4 rounded text-sm text-gray-600">
            <div class="flex items-start gap-2">
                <i class="el-icon-info-circle text-blue-500 mt-0.5"></i>
                <div>
                    <p class="font-medium mb-2">状态关联说明:</p>
                    <ul class="list-disc pl-4 space-y-1">
                        <li>已绑定表单: 显示当前已关联的表单及其状态映射关系</li>
                        <li>编辑关联: 可修改表单控件与状态的对应关系</li>
                        <li>删除关联: 解除表单与当前状态的绑定</li>
                        <li>新增关联: 为新的表单控件建立状态映射</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="bg-white p-4 rounded shadow">
            <!-- 已绑定表单列表 -->
            <div class="flex flex-wrap gap-4">
                <!-- 已绑定的表单卡片 -->
                <el-tooltip content="查看已绑定的表单信息" placement="top">
                    <div v-for="form in bindingForms" :key="form.formId"
                        class="w-40 h-40 shadow rounded flex flex-col justify-between p-4">
                        <div class="flex flex-col gap-2">
                            <el-tooltip class="item" effect="dark" :content="form.formName" placement="top">
                                <div class="font-bold text-gray-800 truncate">{{ form.formName }}</div>
                            </el-tooltip>
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
                </el-tooltip>

                <!-- 添加新表单按钮 -->
                <el-tooltip content="添加新的表单关联" placement="top">
                    <div class="w-40 h-40 shadow rounded flex items-center justify-center flex-col gap-4">
                        <div class="rounded-full border el-icon-circle-plus text-6xl flex items-center justify-center text-gray-300 hover:opacity-90 cursor-pointer"
                            @click="checkAndOpenDialog"></div>
                        <div class="font-bold">点击添加关联表单</div>
                    </div>
                </el-tooltip>
            </div>
        </div>

        <!-- 新增对话框 -->
        <el-dialog :visible.sync="dialogVisible" width="70%">
            <template #title>
                <div class="flex items-center gap-2">
                    <span>关联表单控件</span>
                    <el-tooltip content="选择要关联的表单及其控件，并为每个选项配置对应的状态" placement="right">
                        <i class="el-icon-question text-gray-400 cursor-help"></i>
                    </el-tooltip>
                </div>
            </template>

            <div class="grid grid-cols-1 gap-4">
                <!-- 表单列表 -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="grid grid-cols-3 gap-4">
                        <div v-for="(form, index) in associatedForm" :key="form.formId"
                            class="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
                            :class="{ 'ring-2 ring-blue-500': currentFormIndex === index }" @click="selectForm(index)">
                            <div class="flex flex-col gap-2">
                                <div class="font-medium text-gray-900">{{ form.label }}</div>
                                <div class="flex items-center gap-1 text-sm text-gray-500">
                                    <span>表单编号:</span>
                                    <span>{{ form.formNumber }}</span>
                                    <el-tooltip content="用于系统内部识别的唯一编号" placement="top">
                                        <i class="el-icon-info text-gray-400 cursor-help"></i>
                                    </el-tooltip>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 选项配置区域 -->
                <div v-if="currentFormIndex !== null" class="bg-white p-4 rounded-lg shadow">
                    <div class="space-y-4">
                        <div class="flex items-center gap-4">
                            <label class="text-sm font-medium text-gray-700">请选择一个表单控件</label>
                            <el-tooltip content="选择包含选项的表单控件进行状态映射配置" placement="top">
                                <i class="el-icon-info text-gray-400 cursor-help"></i>
                            </el-tooltip>
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
                                    <div class="flex items-center gap-1">
                                        <span class="font-medium">{{ info.label }}</span>
                                        <el-tooltip content="为该选项值选择对应的状态" placement="top">
                                            <i class="el-icon-info text-gray-400 cursor-help"></i>
                                        </el-tooltip>
                                    </div>
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
                <el-tooltip content="取消当前操作" placement="top">
                    <el-button @click="reset">取 消</el-button>
                </el-tooltip>
                <el-tooltip content="保存表单与状态的关联关系" placement="top">
                    <el-button type="primary" @click="rowCurrentChange">确 定</el-button>
                </el-tooltip>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import {
    asyncGetStateList,
    asyncGetFormAndFormItem,
    AsyncCodesstatusTypebindingform,
    statusTypegetbindinginfo,
    statusTypeunbindingform
} from "@/api/state";
import { getTagType } from "./utils";

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
            isEdit: false, // 新增编辑状态标记
            editForm: null, // 存储编辑的表单信息
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

                // 处理并过滤表单数据
                const availableForms = res.data.map(item => {
                    const content = JSON.parse(item.optionData);
                    // 检查是否有可用的控件（带选项的控件）
                    const hasAvailableWidgets = content.some(
                        widget => widget.options && widget.options.optionItems && widget.options.optionItems.length > 0
                    );
                    return {
                        ...item,
                        content,
                        hasAvailableWidgets
                    };
                });

                // 过滤掉已绑定的表单和没有可用控件的表单
                const unboundForms = availableForms.filter(item =>
                    item.bindingStatus === 0 &&
                    item.hasAvailableWidgets
                );

                if (unboundForms.length === 0) {
                    this.$message.warning("暂无可关联的表单");
                    return;
                }

                this.dialogVisible = true;
                this.associatedForm = [];
                this.optionArray = {};

                unboundForms.forEach((item, index) => {
                    this.associatedForm.push({
                        label: item.formName,
                        formId: item.formId,
                        formNumber: item.formNumber,
                        bindingStatus: item.bindingStatus,
                        widgetList: item.content,
                    });

                    this.optionArray[`it${index}`] = {
                        selectItems: item.content
                            .filter((widget) => widget.options && widget.options.optionItems)
                            .map((widget) => ({
                                label: widget.options.label,
                                value: widget.id,
                            })),
                        value: null,
                    };
                });
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

                // 如果是编辑状态，直接使用编辑表单的数据
                if (this.isEdit && this.editForm) {
                    const item = data.find(d => d.formId === this.editForm.formId);
                    if (item) {
                        const content = JSON.parse(item.optionData);
                        this.associatedForm.push({
                            label: item.formName,
                            formId: item.formId,
                            formNumber: item.formNumber,
                            bindingStatus: item.bindingStatus,
                            widgetList: content,
                        });

                        this.optionArray[`it0`] = {
                            selectItems: content
                                .filter((widget) => widget.options && widget.options.optionItems)
                                .map((widget) => ({
                                    label: widget.options.label,
                                    value: widget.id,
                                })),
                            value: null,
                        };
                    }
                    return;
                }

                // 非编辑状态的原有逻辑
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
                                .filter((widget) => widget.options && widget.options.optionItems) // 只过滤包含选项的控件
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
                        label: `选项${idx + 1}:`,
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

            if (!selectedOptionId) {
                this.$message.warning('请选择一个表单控件');
                return;
            }

            const selectedWidget = selectedForm.widgetList.find(
                (widget) => widget.id === selectedOptionId
            );

            if (!selectedWidget) {
                this.$message.error("请选择一个选项");
                return;
            }

            // 检查是否所有选项都已选择状态
            const unselectedItems = this.baseInfo.filter(info => !info.rowCurrent);
            if (unselectedItems.length > 0) {
                this.$message.warning(`请为所有选项选择状态，还有 ${unselectedItems.length} 个选项未选择`);
                return;
            }

            const dataDtoList = this.baseInfo.map((info) => ({
                optionId: selectedWidget.options.name,
                statusDataId: info.rowCurrent,
                valueId: info.valueId,
                valueLabel: info.valueLabel,
            }));

            const params = {
                dataDtoList,
                formId: this.isEdit ? this.editForm.formId : selectedForm.formId,
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
                // this.$message.error("保存失败");
            }
        },
        reset() {
            this.baseInfo = [];
            this.currentFormIndex = null;
            this.formRender = false;
            this.dialogVisible = false;
            this.isEdit = false;
            this.editForm = null;
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
                this.bindingForms = res.data;
            } catch (error) {
                console.error('获取已绑定表单失败:', error);
                this.$message.error('获取已绑定表单失败');
            }
        },

        // 编辑已绑定表单
        async handleEditBinding(form) {
            try {
                const res = await statusTypegetbindinginfo({
                    statusTypeId: this.currentId,
                    formId: form.formId
                });

                if (res.code === 200 && res.data && res.data.length > 0) {
                    this.isEdit = true;
                    this.editForm = form;
                    this.dialogVisible = true;

                    // 等待表单数据加载完成
                    await this.fetchFormData();

                    // 找到被选中的控件
                    if (form.statusBindingOptions && form.statusBindingOptions.length > 0) {
                        const firstBindingOption = form.statusBindingOptions[0];
                        // 在返回的数据中找到对应的控件
                        const selectedWidget = res.data.find(widget =>
                            widget.options && widget.options.name === firstBindingOption.optionId
                        );

                        if (selectedWidget) {
                            this.selectForm(0);
                            // 设置选中的控件
                            this.optionArray['it0'].value = selectedWidget.id;
                            // 触发选择事件来生成baseInfo
                            this.handleSelectionChange(selectedWidget.id, 0);
                            // 设置状态映射
                            this.baseInfo = this.baseInfo.map(info => {
                                const bindingOption = form.statusBindingOptions.find(
                                    opt => opt.valueId.toString() === info.valueId.toString()
                                );
                                if (bindingOption) {
                                    info.rowCurrent = bindingOption.statusDataId;
                                }
                                return info;
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('获取编辑数据失败:', error);
                this.$message.error('获取编辑数据失败');
            }
        },

        // 删除已绑定表单
        handleDeleteBinding(form) {
            this.$confirm('确认删除该关联表单吗？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(async () => {
                try {
                    await statusTypeunbindingform({
                        statusTypeId: this.currentId,
                        formId: form.formId
                    });
                    this.$message.success('删除成功');
                    this.fetchBindingForms(); // 重新获取绑定表单列表
                } catch (error) {
                    console.error('删除失败:', error);
                    this.$message.error('删除失败');
                }
            }).catch(() => { });
        },
    },
};
</script>