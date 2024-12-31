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
                        <el-button type="primary" class="mr-2">保存</el-button>
                        <el-button>重置</el-button>
                    </div>
                </div>
            </template>
        </el-page-header>
        <el-divider />

        <el-form ref="form" :model="formData" label-width="120px" inline>
            <div class="flex flex-col gap-4">
                <div class="rounded bg-white shadow w-full p-2">
                    <div class="font-bold py-4 flex items-center">
                        <div> 计划名称：</div>
                        <dict-tag :options="dict.type.plan_type_option" :value="planType" />
                    </div>
                    <div>
                        <el-form-item label="计划名称" prop="planName">
                            <el-input v-model="formData.planName" placeholder="请输入计划名称"></el-input>
                        </el-form-item>
                        <el-form-item label="计划描述" prop="planDesc">
                            <el-input v-model="formData.planDesc" placeholder="请输入计划描述"></el-input>
                        </el-form-item>
                        <el-form-item label="计划表单" prop="formId">
                            <el-select clearable v-model="formData.formId" placeholder="请选择计划表单">
                                <el-option v-for="item in formList" :key="item.id" :label="item.name"
                                    :value="item.id" />
                            </el-select>
                        </el-form-item>
                    </div>
                </div>
                <div class="rounded bg-white shadow w-full p-2">
                    <div class="font-bold py-4">
                        对象选择
                    </div>
                    <div>
                        <el-form-item label="客户标签" prop="tagId">
                            <treeselect v-model="formData.tagId" :options="customerTagTree"
                                :normalizer="normalizerCustomerTag" placeholder="请选择客户标签" multiple clearable
                                :searchable="true" :async="true" :load-options="loadCustomerTagOptions"
                                :disableBranchNodes="true" :limit="1" :limitText="treeselectLimitText" class="w-96" />
                        </el-form-item>

                    </div>
                    <div>
                        <el-form-item label="所属供电所" prop="powerSupply">
                            <Treeselect v-model="formData.powerSupply" :options="powerSupplyTree"
                                :normalizer="normalizer" placeholder="请选择供电所" multiple clearable :searchable="true"
                                :disableBranchNodes="true" :limit="1" :limitText="treeselectLimitText" class="w-96" />
                        </el-form-item>
                    </div>
                    <div v-if="isVisit">
                        <el-form-item label="所属台区:" prop="towerIdList" v-if="isVisit">
                            <treeselect v-model="formData.towerIdList" :options="towerIdListOption"
                                :normalizer="normalizerTower" placeholder="请选择台区" multiple clearable :searchable="true"
                                :limit="1" :limitText="treeselectLimitText" class="w-96" />
                        </el-form-item>
                    </div>
                    <el-table :data="tableData" @selection-change="handleSelectionChange" ref="multipleTable"
                        :pagination="true">
                        <el-table-column v-for="column in tableColumns" :key="column.prop" :prop="column.prop"
                            :label="column.label" :type="column.type" :width="column.width"></el-table-column>
                    </el-table>
                    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
                        v-model:limit="queryParams.pageSize" @pagination="getObjectTable" />
                </div>
                <div class="rounded bg-white shadow w-full p-2">
                    <div class="font-bold py-4">
                        时间选择
                    </div>
                    <div>
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
                            <el-select v-model="formData.cycledTimeType" placeholder="请选择循环时间">
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
                            <el-input v-model="formData.cycledTime" type="number" placeholder="请输入天数"></el-input>
                        </el-form-item>
                    </div>
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
                            <el-date-picker v-model="formData.taskTime" type="datetimerange" range-separator="至"
                                start-placeholder="开始日期" end-placeholder="结束日期" :picker-options="{
                                    shortcuts: [
                                        {
                                            text: '最近一周',
                                            onClick(picker) {
                                                const end = new Date();
                                                const start = new Date();
                                                start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
                                                picker.$emit('pick', [start, end]);
                                            },
                                        },
                                        {
                                            text: '最近一个月',
                                            onClick(picker) {
                                                const end = new Date();
                                                const start = new Date();
                                                start.setMonth(start.getMonth() - 1);
                                                picker.$emit('pick', [start, end]);
                                            },
                                        },
                                        {
                                            text: '最近三个月',
                                            onClick(picker) {
                                                const end = new Date();
                                                const start = new Date();
                                                start.setMonth(start.getMonth() - 3);
                                                picker.$emit('pick', [start, end]);
                                            },
                                        },
                                    ],
                                }"></el-date-picker>
                        </el-form-item>
                    </div>
                    <div>
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
                            <el-date-picker v-model="formData.closedTime" type="datetime"
                                placeholder="选择日期时间"></el-date-picker>
                        </el-form-item>
                    </div>
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
                                    class="flex items-center gap-2">
                                    <el-input v-model="formData.alarmTimeList[index]" type="number"
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
import {
    asyncGetPlanOptions,
    asyncGetAreaList,
    asyncGetPlanDetail,
    asyncGetCustomerTags
} from '@/api/plan'
import { deptTreeSelect } from "@/api/system/user";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";

export default {
    name: 'PlanVisit',
    components: { Treeselect },
    dicts: ['plan_type_option'],
    data() {
        return {
            formData: {
                planType: null, //计划类型
                planName: null, //计划名称
                planDesc: null, //计划描述
                formId: null, //计划表单
                cycled: "0", //是否循环启用
                cycledTime: null, //循环时间，开启循环后该值不为空
                cycledTimeType: null, //循环时间类型
                startTime: null, //任务开始时间
                endTime: null, //任务结束时间
                closed: "0", //是否到期自动关闭 0:否 1：是
                closedTime: null, //任务自动关闭时间
                earlyWarning: "0", //是否超期预警 0：否 1：是
                alarmTimeList: [""], //告警时间
                towerUserList: [], //台区用户入参信息集合
                isSelectAll: 0, //是否全选标识 0：否 1：是
                powerSupply: null // 供电所选择
            },
            // 查询参数
            queryParams: {
                pageNum: 1,
                pageSize: 10,
            },
            total: 0, // 总数
            formList: [], //根据类型查询的表单列表
            customerTagTree: [],
            filter: {
                cityName: '',
                countyName: '',
                powerSupplyName: '',
                keyword: ''
            },
            towerIdListOption: [], // 台区列表
            tableData: [], // 表格数据
            powerSupplyTree: [] // 供电所树形数据
        }
    },
    computed: {
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
        tableColumns() {
            if (this.planType === '1' || this.planType === '2') {
                return [
                    { type: 'selection', width: '55' },
                    { prop: 'name', label: '台区名称' },
                    { prop: 'powerUnit', label: '所属供电单位' },
                    { prop: 'countyUnit', label: '所属单位区县' },
                    { prop: 'cityManager', label: '所属城市网格经理' }
                ];
            } else if (this.planType === '3' || this.planType === '4') {
                return [
                    { prop: 'customerName', label: '客户名称' },
                    { prop: 'customerTag', label: '客户标签' },
                    { prop: 'name', label: '所属台区' },
                    { prop: 'powerUnit', label: '所属供电单位' },
                    { prop: 'countyUnit', label: '所属单位区县' },
                    { prop: 'cityManager', label: '所属城市网格经理' },
                    { prop: 'visitCount', label: '走访次数' }
                ];
            }
            return [];
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
            // this.loadCustomerTagOptions({
            //     searchQuery: '', callback: (err, options) => {
            //         if (!err) {
            //             this.customerTagTree = options;
            //         }
            //     }
            // });
        },
        // 加载客户标签根据搜索关键字
        async loadCustomerTagOptions({ searchQuery, callback }) {
            try {
                // 调用 API 获取客户标签数据，传入搜索关键字
                const res = await asyncGetCustomerTags({ keyword: searchQuery });
                const options = res.data.map(item => ({
                    id: item.tagId,
                    label: item.tagName,
                }));
                // 将数据传递给回调函数
                callback(null, options);
            } catch (error) {
                console.error('加载客户标签失败:', error);
                callback(error);
            }
        },
        treeselectLimitText(count) {
            const findLabel = (tree, values) => {
                const labels = [];
                const findNodeLabel = (tree, value) => {
                    for (const node of tree) {
                        if (node.id === value) {
                            return node.label;
                        }
                        if (node.children) {
                            const label = findNodeLabel(node.children, value);
                            if (label) {
                                return label;
                            }
                        }
                    }
                    return null;
                };
                for (const value of values) {
                    const label = findNodeLabel(this.powerSupplyTree, value);
                    if (label) {
                        labels.push(label);
                    }
                }
                return labels;
            };

            const labels = findLabel(this.powerSupplyTree, this.formData.powerSupply);

            // Create a div containing multiple divs for each label
            const contentVNodes = this.$createElement('div', {}, labels.map(label => {
                return this.$createElement('div', {}, label);
            }));

            return this.$createElement('div', {
                class: 'virtual-dom'
            }, [
                this.$createElement('el-popover', {
                    props: {
                        placement: 'top-start',
                        width: 300,
                        trigger: 'hover'
                    },
                    scopedSlots: {
                        default: () => contentVNodes
                    }
                }, [
                    this.$createElement('span', {
                        slot: 'reference'
                    }, `和${count}个供电所`)
                ])
            ]);
        },
        // 如果是编辑页面，获取计划详情
        async getPlanDetail() {
            // 判断是否为编辑页面
            if (!this.$route.params.id) return
            try {
                const { id } = this.$route.params
                const res = await asyncGetPlanDetail(id)
                this.formData = res.data || {}
            } catch (error) {
                console.error('获取计划详情失败:', error)
            }
        },
        // 对象列表勾选事件
        handleSelectionChange(val) {
            this.formData.towerIdList = val.map(item => item.towerId)
        },
        // 增加告警时间
        addAlarmTime() {
            this.formData.alarmTimeList.push('');
            this.$nextTick(() => {
                const container = document.querySelector('.app-container');
                if (container) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });
        },
        // 删除告警时间
        removeAlarmTime(index) {
            this.formData.alarmTimeList.splice(index, 1)
        },
        // 循环启用改变事件
        cycledChange(value) {
            if (value === '0') {
                this.formData.cycledTimeType = '';
                this.formData.cycledTime = '';
            }
        },
        // 回到计划管理页面
        handleBack() {
            this.$tab.closeOpenPage({ path: '/plan/index', title: '计划管理' });
        },
        // 根据类型获取表单列表
        async getFormListByType() {
            try {
                const res = await asyncGetPlanOptions(this.planType)
                this.formList = res.data || [] // 设置 formList 数据
            } catch (error) {
                console.error('获取表单列表失败:', error)
            }
        },
        // 获取供电所树形数据
        async getPowerSupplyTree() {
            try {
                const res = await deptTreeSelect()
                this.powerSupplyTree = res.data || []
            } catch (error) {
                console.error('获取供电所树形数据失败:', error)
            }
        },
        // 转换树形数据结构
        normalizer(node) {
            if (node.children && !node.children.length) {
                delete node.children;
            }
            // 判断是否为叶子节点
            node.disableCheck = node.children ? true : false;
            return {
                id: node.id,
                label: node.label,
                children: node.children
            };
        },
        normalizerCustomerTag(node) {
            return {
                id: node.tagId,
                label: node.tagName,
            };
        },
        normalizerTower(node) {
            return {
                id: node.id,
                label: node.label,
            };
        },
        // 获取台区列表
        async getTowerList() {
            try {
                const res = await asyncGetAreaList(this.filter);
                // 将台区数据转换为 Treeselect 所需的格式
                this.towerIdListOption = res.data.map(item => ({
                    id: item.towerId,
                    label: item.towerName,
                })) || [];
            } catch (error) {
                console.error('获取台区列表失败:', error);
            }
        },
        // 获取客户标签可选项
        async getCustomerTagOptions() {
            try {
                const res = await asyncGetCustomerTags()
                this.customerTagTree = res.data || []
            } catch (error) {
                console.error('获取客户标签失败:', error)
            }
        },
        // 获取对象列表
        getObjectTable() {

        },
    }
}
</script>
