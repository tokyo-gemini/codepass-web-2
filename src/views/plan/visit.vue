<template>
    <div class="app-container" style="height: calc(100vh - 84px); overflow-y: auto;">
        <el-page-header @back="handleBack">
            <template #title>
                <div class="w-full h-full flex items-center">返回计划列表</div>
            </template>
            <template #content>
                <div class="flex items-center space-x-4 justify-between w-full">
                    <span class="text-lg font-semibold mr-3">
                        {{ pageTitle }}
                    </span>
                    <div>
                        <el-button type="primary" class="mr-2" @click="handleSubmit">保存</el-button>
                        <el-button @click="handleReset">重置</el-button>
                    </div>
                </div>
            </template>
        </el-page-header>
        <el-divider />

        <el-form ref="form" :model="formData" label-width="120px" inline>
            <div class="flex flex-col gap-4">
                <div class="rounded bg-white shadow w-full p-4">
                    <div class="font-bold pb-4 flex items-center">
                        <div class="section-title">
                            计划名称
                        </div>
                        <dict-tag :options="dict.type.plan_type_option" :value="planType" />
                    </div>
                    <div>
                        <el-form-item label="计划名称" prop="planName">
                            <el-input v-model="formData.planName" clearable placeholder="请输入计划名称"></el-input>
                        </el-form-item>
                        <el-form-item label="计划描述" prop="planDesc">
                            <el-input v-model="formData.planDesc" clearable placeholder="请输入计划描述"></el-input>
                        </el-form-item>
                        <el-form-item label="计划表单" prop="formId">
                            <el-select clearable v-model="formData.formId" placeholder="请选择计划表单">
                                <el-option v-for="item in formList" :key="item.id" :label="item.name"
                                    :value="item.id" />
                            </el-select>
                        </el-form-item>
                    </div>
                </div>
                <div class="rounded bg-white shadow w-full p-4">
                    <div class="font-bold pb-4">
                        <div class="section-title">
                            对象选择
                        </div>
                    </div>
                    <div>
                        <el-form-item label="所属供电所" prop="powerSupply">
                            <Treeselect v-model="formData.powerSupply" :options="powerSupplyTree"
                                :normalizer="normalizer" placeholder="请选择供电所" multiple clearable :searchable="true"
                                :disable-branch-nodes="true" :limit="1" :limit-text="treeselectLimitText" class="w-96"
                                @input="handlePowerSupplyChange" />
                        </el-form-item>
                    </div>
                    <div v-if="isVisit">
                        <el-form-item label="所属台区:" prop="towerIdList">
                            <treeselect v-model="formData.towerIdList" :options="towerIdListOption"
                                :normalizer="normalizerTower" :flat="true" :max-height="400" placeholder="请选择台区"
                                multiple clearable :searchable="true" :limit="1" :limitText="treeselectLimitText"
                                class="w-96" @input="handleTowerChange" />
                        </el-form-item>
                    </div>

                    <!-- 添加搜索框 -->
                    <div class="mb-4 flex items-center">
                        <el-form-item label="客户名称:" prop="searchKeyword">
                            <el-input v-model="searchKeyword" :placeholder="isVisit ? '请输入客户名称搜索' : '请输入台区名称搜索'"
                                style="width: 400px" clearable @keyup.enter.native="handleSearch" @clear="handleSearch">
                                <el-button slot="append" icon="el-icon-search" @click="handleSearch"></el-button>
                            </el-input>
                        </el-form-item>
                    </div>

                    <div class="my-4">
                        <el-alert type="info" :closable="false">
                            <div class="flex items-center justify-between">
                                <span>已选择 {{ formData.isSelectAll === 1 ? total : selectedCount }} 项</span>
                                <el-button type="text" @click="handleToggleSelectAll">
                                    {{ formData.isSelectAll === 1 ? '取消全选' : '全选' }}
                                </el-button>
                            </div>
                        </el-alert>
                    </div>
                    <el-table :data="tableData" @selection-change="handleSelectionChange" ref="multipleTable"
                        height="400" :header-cell-style="{
                            background: '#f5f7fa',
                            color: '#606266'
                        }" class="mt-4">
                        <el-table-column type="selection" width="55"></el-table-column>
                        <template v-if="isVisit">
                            <el-table-column prop="customName" label="客户名称"></el-table-column>
                            <el-table-column prop="towerName" label="所属台区"></el-table-column>
                            <el-table-column prop="powerName" label="所属供电单位"></el-table-column>
                            <el-table-column prop="companyName" label="所属单位区县"></el-table-column>
                            <el-table-column prop="areaName" label="所属供电公司"></el-table-column>
                            <el-table-column prop="provinceName" label="所属省公司"></el-table-column>
                        </template>
                        <template v-else>
                            <el-table-column prop="towerName" label="台区名称"></el-table-column>
                            <el-table-column prop="powerName" label="所属供电单位"></el-table-column>
                            <el-table-column prop="companyName" label="所属单位区县"></el-table-column>
                            <el-table-column prop="userName" label="所属城市网格经理"></el-table-column>
                        </template>
                    </el-table>
                    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum"
                        :limit.sync="queryParams.pageSize" @pagination="getObjectTable" />
                </div>
                <div class="rounded bg-white shadow w-full p-4">
                    <div class="font-bold pb-4">
                        <div class="section-title">
                            时间选择
                        </div>
                    </div>
                    <!-- 只在类型1和3显示循环启用 -->
                    <div v-if="needFullTimeOptions">
                        <el-form-item label="循环启用" prop="cycled">
                            <div class="flex gap-4 items-center">
                                <el-radio-group v-model="formData.cycled" @change="cycledChange">
                                    <el-radio label="1" size="small">是</el-radio>
                                    <el-radio label="0" size="small">否</el-radio>
                                </el-radio-group>
                                <span v-if="formData.cycled === '0'" class="text-xs text-gray-500">循环一次</span>
                            </div>
                        </el-form-item>
                        <el-form-item v-if="formData.cycled === '1'" label="循环时间" prop="cycledTimeType">
                            <el-select v-model="formData.cycledTimeType" clearable placeholder="请选择循环时间">
                                <el-option label="每周" value="weekly"></el-option>
                                <el-option label="每两周" value="biweekly"></el-option>
                                <el-option label="每月" value="monthly"></el-option>
                                <el-option label="每两月" value="bimonthly"></el-option>
                                <el-option label="每三月" value="quarterly"></el-option>
                                <el-option label="每六月" value="semiannually"></el-option>
                                <el-option label="每一年" value="annually"></el-option>
                                <el-option label="自定义" value="custom"></el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item v-if="formData.cycled === '1' && formData.cycledTimeType === 'custom'"
                            label="自定义循环时间" prop="cycledTime">
                            <el-input v-model="formData.cycledTime" clearable type="number"
                                placeholder="请输入天数"></el-input>
                        </el-form-item>
                    </div>
                    <!-- 任务时间段所有类型都显示 -->
                    <div>
                        <el-form-item prop="taskTime">
                            <template #label>
                                <div class="flex flex-col">
                                    <div>
                                        第一次任务
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        任务时间段
                                    </div>
                                </div>
                            </template>
                            <el-date-picker v-model="formData.taskTime" clearable type="datetimerange"
                                range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"
                                :picker-options="pickerOptions"></el-date-picker>
                        </el-form-item>
                    </div>
                    <!-- 只在类型1和3显示到期计划 -->
                    <div v-if="needFullTimeOptions">
                        <el-form-item prop="closed">
                            <template #label>
                                <div class="flex flex-col">
                                    <div>
                                        到期计划
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        自动关闭
                                    </div>
                                </div>
                            </template>
                            <el-radio-group v-model="formData.closed">
                                <el-radio label="1">是</el-radio>
                                <el-radio label="0">否</el-radio>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item v-if="formData.closed === '1'" prop="closedTime" label="自动关闭时间">
                            <el-date-picker v-model="formData.closedTime" clearable type="datetime"
                                placeholder="选择日期时间"></el-date-picker>
                        </el-form-item>
                    </div>
                    <!-- 预警启用所有类型都显示 -->
                    <div>
                        <el-form-item prop="deptId">
                            <template #label>
                                <div class="flex flex-col">
                                    <div>预警启用</div>
                                    <div class="text-xs text-gray-500">
                                        即将超期
                                    </div>
                                </div>
                            </template>
                            <el-radio-group v-model="formData.earlyWarning">
                                <el-radio label="1">是</el-radio>
                                <el-radio label="0">否</el-radio>
                            </el-radio-group>
                        </el-form-item>
                    </div>
                    <div v-if="formData.earlyWarning === '1'">
                        <el-form-item label="告警时间" prop="alarmTimeList">
                            <div class="flex flex-col gap-4">
                                <div v-for="(alarmTime, index) in formData.alarmTimeList" :key="index"
                                    class="flex items-center gap-4">
                                    <el-input v-model="formData.alarmTimeList[index]" clearable type="number"
                                        placeholder="请输入告警时间（小时）"></el-input>
                                    <el-button type="primary" icon="el-icon-plus"
                                        @click="addAlarmTime(index)"></el-button>
                                    <el-button type="danger" icon="el-icon-minus" @click="removeAlarmTime(index)"
                                        v-if="formData.alarmTimeList.length > 1"></el-button>
                                </div>
                            </div>
                        </el-form-item>
                    </div>
                </div>
            </div>
        </el-form>
    </div>
</template>

<script>
import formMixin from './mixins/formMixin'
import tableMixin from './mixins/tableMixin'
import timeMixin from './mixins/timeMixin'
import selectionMixin from './mixins/selectionMixin'
import { deptTreeSelect } from "@/api/system/user";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";

export default {
    name: 'PlanVisit',
    mixins: [formMixin, tableMixin, timeMixin, selectionMixin],
    components: { Treeselect },
    dicts: ['plan_type_option'],

    computed: {
        currentPageSelections() {
            return this.tableData.filter(row => {
                return this.formData.towerUserList.some(item =>
                    item.customId === row.customId ||
                    (item.towerId === row.towerId && item.userId === row.userId)
                );
            });
        },
        // 走访
        isVisit() {
            return this.planType === '3' || this.planType === '4'
        },
        pageTitle() {
            return this.$route.params.id ? '编辑计划' : '新增计划'
        },
        // 当前计划类型
        planType() {
            return this.$route.params.type
        },
        // 是否需要显示完整时间选项（循环启用和到期计划）
        needFullTimeOptions() {
            return this.planType === '1' || this.planType === '3'
        },
        // 添加验证规则计算属性
        formRules() {
            const rules = { ...this.rules }
            // 走访类型时增加台区验证
            if (this.isVisit) {
                rules.towerIdList = [{ required: true, message: '请选择所属台区', trigger: 'change' }]
            }
            return rules
        }
    },

    created() {
        this.loadInitData()
    },

    methods: {
        // 初始化数据
        async loadInitData() {
            this.getFormListByType()
            this.getPowerSupplyTree()
            this.getPlanDetail()
        },

        handleBack() {
            this.$tab.closeOpenPage({ path: '/plan/index', title: '计划管理' });
        }
    }
}
</script>

<style>
.section-title {
    position: relative;
    padding-left: 12px;
    display: inline-block;
}

.section-title::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 16px;
    background-color: #409eff;
    border-radius: 2px;
}

/* 添加表格样式 */
.el-table {
    /* 设置边框和圆角 */
    border: 1px solid #ebeef5;
    border-radius: 4px;
}

/* 修改表格头部样式 */
.el-table th {
    background-color: #f5f7fa !important;
    color: #606266;
    font-weight: 500;
    padding: 12px 0;
}

/* 去除表格外边框 */
.el-table--border,
.el-table--group {
    border: none;
}

/* 修改表格内部滚动条样式 */
.el-table .el-table__body-wrapper::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.el-table .el-table__body-wrapper::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;
}

.el-table .el-table__body-wrapper::-webkit-scrollbar-track {
    background: #f5f5f5;
}
</style>