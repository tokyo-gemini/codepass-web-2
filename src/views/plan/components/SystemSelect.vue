<template>
    <div>
        <!-- 添加说明信息 -->
        <div class="bg-gray-50 p-4 mb-4 rounded text-sm text-gray-600">
            <div class="flex items-start gap-2">
                <i class="el-icon-info-circle text-blue-500 mt-0.5"></i>
                <div>
                    <p class="font-medium mb-2">系统内选择说明:</p>
                    <ul class="list-disc pl-4 space-y-1">
                        <li>您可以根据供电所、台区等条件筛选目标对象</li>
                        <li>支持按名称搜索快速定位特定对象</li>
                        <li>可以逐个勾选或使用全选功能批量选择</li>
                        <li>已选对象会在下方表格中显示,可随时调整</li>
                    </ul>
                </div>
            </div>
        </div>
        <div>
            <el-form-item label="所属供电所" prop="powerSupply">
                <template #label>
                    <div class="flex items-center gap-1">
                        <span>所属供电所</span>
                        <el-tooltip content="选择计划执行的供电所范围" placement="top">
                            <i class="el-icon-info text-gray-400 cursor-help"></i>
                        </el-tooltip>
                    </div>
                </template>
                <Treeselect v-model="formData.powerSupply" :options="powerSupplyTree" :normalizer="normalizer"
                    placeholder="请选择供电所" multiple clearable :searchable="true" :disableBranchNodes="true" :limit="1"
                    :limitText="treeselectLimitText" class="w-96" appendToBody :z-index="9999"
                    @input="handlePowerSupplyChange" @node:expand="handleNodeExpand" />
            </el-form-item>
        </div>
        <div v-if="isVisit">
            <el-form-item label="所属台区:" prop="towerIdList">
                <treeselect v-model="formData.towerIdList" :options="towerIdListOption" :normalizer="normalizerTower"
                    :flat="true" :max-height="400" placeholder="请选择台区" multiple clearable :searchable="true" :limit="1"
                    appendToBody :z-index="9999" :limitText="treeselectLimitText" class="w-96" ref="treeselect"
                    @input="handleTowerChange" />
            </el-form-item>
        </div>
        <!-- 添加搜索框 -->
        <div class="mb-4 flex items-center">
            <el-form-item label="搜索条件" prop="searchKeyword">
                <el-input v-model="searchKeyword" :placeholder="isVisit ? '请输入客户名称搜索' : '请输入台区名称搜索'"
                    style="width: 400px" clearable @keyup.enter.native="handleSearch" @clear="handleSearch">
                    <el-button slot="append" icon="el-icon-search" @click="handleSearch"></el-button>
                </el-input>
            </el-form-item>
        </div>
        <div class="my-4">
            <el-alert type="info" :closable="false">
                <div class="flex items-center justify-between">
                    <span>
                        已选择
                        {{ formData.isSelectAll === 1 ? total : selectedCount }}
                        项
                    </span>
                    <el-button v-if="total || selectedCount" type="text" @click="handleToggleSelectAll">
                        {{ formData.isSelectAll === 1 ? '取消全选' : '全选' }}
                    </el-button>
                </div>
            </el-alert>
        </div>
        <el-table :data="tableData" @selection-change="handleSelectionChange" ref="multipleTable" empty-text="请选择供电所">
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
</template>
<script>
import { deptTreeSelect } from '@/api/system/user'
import Treeselect from '@riophae/vue-treeselect'
import '@riophae/vue-treeselect/dist/vue-treeselect.css'
import {
    asyncGetAreaList,
    asyncGetCustomerList,
} from '@/api/plan'
export default {
    name: "SystemSelect",

    props: {
        value: {
            type: Array,
            default: () => []
        },
        isVisit: {
            type: Boolean,
            default: false
        },
        planType: {
            type: String,
            required: true
        },
        powerDepts: { // 添加供电所prop
            type: Array,
            default: () => []
        }
    },
    components: {
        Treeselect
    },
    data() {
        return {
            searchKeyword: '',
            selectedCount: 0,
            total: 0,
            tableData: [],
            powerSupplyTree: [],
            towerIdListOption: [],
            formData: {
                powerSupply: this.powerDepts || [], // 初始化时使用props值
                towerIdList: [],
                isSelectAll: 0,
                towerUserList: [] // 新增这个字段
            },
            queryParams: {
                pageNum: 1,
                pageSize: 10
            }
        }
    },
    watch: {
        value: {
            handler(val) {
                // 确保 towerUserList 总是一个数组
                this.formData.towerUserList = Array.isArray(val) ? val : [];
            },
            immediate: true
        },
        powerDepts: {
            handler(val) {
                this.formData.powerSupply = val || [];
            },
            immediate: true
        }
    },
    created() {
        this.getPowerSupplyTree()

    },
    methods: {
        handleNodeExpand(node) {
            this.$nextTick(() => {
                const menu = this.$refs.treeselect.$el.querySelector('.vue-treeselect__menu');
                if (menu) {
                    menu.scrollTop = menu.scrollHeight; // Scrolls to the bottom
                    // Alternatively, scroll to a specific child node if needed
                }
            });
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
        treeselectLimitText(count) {
            const findLabel = (tree, values) => {
                const labels = []
                const findNodeLabel = (tree, value) => {
                    for (const node of tree) {
                        if (node.id === value) {
                            return node.label
                        }
                        if (node.children) {
                            const label = findNodeLabel(node.children, value)
                            if (label) {
                                return label
                            }
                        }
                    }
                    return null
                }
                for (const value of values) {
                    const label = findNodeLabel(this.powerSupplyTree, value)
                    if (label) {
                        labels.push(label)
                    }
                }
                return labels
            }
            const labels = findLabel(this.powerSupplyTree, this.formData.powerSupply)
            // Create a div containing multiple divs for each label
            const contentVNodes = this.$createElement(
                'div',
                {},
                labels.map((label) => {
                    return this.$createElement('div', {}, label)
                })
            )
            return this.$createElement(
                'div',
                {
                    class: 'virtual-dom'
                },
                [
                    this.$createElement(
                        'el-popover',
                        {
                            props: {
                                placement: 'top-start',
                                width: 300,
                                trigger: 'hover'
                            },
                            scopedSlots: {
                                default: () => contentVNodes
                            }
                        },
                        [
                            this.$createElement(
                                'span',
                                {
                                    slot: 'reference'
                                },
                                `和${count}个供电所`
                            )
                        ]
                    )
                ]
            )
        },
        // 转换树形数据结构
        normalizer(node) {
            if (node.children && !node.children.length) {
                delete node.children
            }
            // 判断是否为叶子节点
            node.disableCheck = node.children ? true : false
            return {
                id: node.id,
                label: node.label,
                children: node.children
            }
        },
        normalizerTower(node) {
            return {
                id: node.id,
                label: node.label,
                // 添加一些额外的属性来帮助识别
                title: node.label // 用于tooltip显示完整信息
            }
        },
        // 处理供电所选择变化
        async handlePowerSupplyChange(value) {
            this.$emit('update:powerDepts', value); // 添加事件发射
            if (value && value.length > 0) {
                // 重置分页参数
                this.queryParams.pageNum = 1
                this.searchKeyword = '' // 清空搜索关键字
                if (this.isVisit) {
                    // 获取台区列表数据用于treeselect
                    const areaParams = {
                        pageNum: 1,
                        pageSize: 9999,
                        deptIdList: value.toString()
                    }
                    const areaRes = await asyncGetAreaList(areaParams)
                    if (areaRes.code === 200) {
                        // 处理台区数据
                        const seen = new Set()
                        this.towerIdListOption = (areaRes.rows || [])
                            .filter((item) => {
                                if (!item || !item.towerId || seen.has(item.towerId)) return false
                                seen.add(item.towerId)
                                return true
                            })
                            .map((item) => ({
                                id: item.towerId,
                                label: item.towerName,
                                isDisabled: false,
                                isLeaf: true
                            }))
                    }
                }
                this.getObjectTable()
            } else {
                this.tableData = []
                this.towerIdListOption = []
                this.total = 0
            }
        },
        // 处理台区选择变化
        handleTowerChange(value) {
            if (this.isVisit && this.formData.powerSupply) {
                this.queryParams.pageNum = 1
                this.searchKeyword = '' // 清空搜索关键字
                this.formData.towerIdList = value || [] // 确保value为数组
                // 只查询客户列表
                this.getObjectTable()
            }
        },
        // 添加搜索方法
        handleSearch() {
            this.queryParams.pageNum = 1
            this.getObjectTable()
        },
        // Modify the handleSelectionChange method
        handleSelectionChange(val) {
            if (this.formData.isSelectAll !== 1) {
                // 获取当前页的所有 ID
                const currentPageIds = this.tableData.map((item) => ({
                    towerId: item.towerId,
                    customId: item.customId
                }));

                // 保留不在当前页的选中项
                let remainingSelections = this.formData.towerUserList.filter((item) => {
                    return !currentPageIds.some(pageItem =>
                        (this.isVisit && pageItem.customId === item.customId) ||
                        (!this.isVisit && pageItem.towerId === item.towerId)
                    );
                });

                // 将当前页的新选中项添加到结果中
                const currentPageSelections = val.map((item) => ({
                    userId: item.userId,
                    userName: item.userName,
                    towerId: item.towerId,
                    towerName: item.towerName,
                    areaName: item.areaName,
                    companyName: item.companyName,
                    powerName: item.powerName,
                    deptId: item.deptId,
                    provinceName: item.provinceName,
                    customId: item.customId,
                }));

                // 合并保留的选中项和当前页的新选中项
                this.formData.towerUserList = [...remainingSelections, ...currentPageSelections];

                // 更新选中计数
                this.selectedCount = this.formData.towerUserList.length;

                // 发出更新事件
                this.$emit('input', this.formData.towerUserList);

                // 如果手动取消了某些选择，更新全选状态
                if (this.selectedCount < this.total) {
                    this.formData.isSelectAll = 0;
                }
            }
        },
        // 修改全选/取消全选处理
        handleToggleSelectAll() {
            if (this.formData.isSelectAll === 1) {
                // 当前是全选状态，需要取消全选
                this.$refs.multipleTable.clearSelection()
                this.formData.isSelectAll = 0
                this.selectedCount = 0
                this.formData.towerUserList = []
            } else {
                // 当前不是全选状态，需要全选
                this.formData.isSelectAll = 1
                this.selectedCount = this.total
                // 选中当前页的所有行
                this.tableData.forEach((row) => {
                    this.$refs.multipleTable.toggleRowSelection(row, true)
                })
            }
            this.$emit('update:powerDepts', this.formData.powerSupply);
        },
        // 修改 getObjectTable 方法，添加勾选逻辑
        async getObjectTable(pagination) {
            if (!this.formData.powerSupply || !this.formData.powerSupply.length) {
                this.$modal.msgWarning('请先选择供电所')
                return
            }
            try {
                if (this.isVisit) {
                    // 走访类型，使用客户查询接口
                    const customerParams = {
                        pageNum: pagination?.page || this.queryParams.pageNum,
                        pageSize: pagination?.limit || this.queryParams.pageSize,
                        planId: this.$route.params.id || '', // 编辑时传入planId
                        deptIdList: this.formData.powerSupply.toString(), // 供电所ID
                        towerIdList: Array.isArray(this.formData.towerIdList)
                            ? this.formData.towerIdList.join(',')
                            : '', // 台区ID列表
                        customName: this.searchKeyword // 添加客户名称搜索
                    }
                    const customerRes = await asyncGetCustomerList(customerParams)
                    // 更新客户表格数据
                    if (customerRes.code === 200) {
                        this.tableData = customerRes.rows || []
                        this.total = parseInt(customerRes.total) || 0
                        // 在数据加载完成后进行勾选
                        this.$nextTick(() => {
                            // 清除当前页的选择
                            this.$refs.multipleTable.clearSelection()
                            // 根据不同状态进行勾选
                            if (this.formData.isSelectAll === 1) {
                                // 全选状态，勾选当前页所有行
                                this.tableData.forEach((row) => {
                                    this.$refs.multipleTable.toggleRowSelection(row, true)
                                })
                                // 维护选中计数为总数
                                this.selectedCount = this.total
                            } else {
                                // 部分选中状态，根据 towerUserList 进行勾选
                                this.tableData.forEach((row) => {
                                    const shouldSelect = this.formData.towerUserList.some(
                                        (item) => item.customId == row.customId
                                    )
                                    if (shouldSelect) {
                                        this.$refs.multipleTable.toggleRowSelection(row, true)
                                    }
                                })
                                // 维护选中计数为 towerUserList 的长度
                                this.selectedCount = this.formData.towerUserList.length
                            }
                        })
                    }
                } else {
                    // 巡检类型
                    const params = {
                        pageNum: pagination?.page || this.queryParams.pageNum,
                        pageSize: pagination?.limit || this.queryParams.pageSize,
                        deptIdList: this.formData.powerSupply.toString(),
                        planId: this.$route.params.id || '',
                        towerName: this.searchKeyword
                    }
                    const res = await asyncGetAreaList(params)
                    if (res.code === 200) {
                        this.tableData = res.rows || []
                        this.total = parseInt(res.total) || 0
                        // 在数据加载完成后进行勾选
                        this.$nextTick(() => {
                            // 清除当前页的选择
                            this.$refs.multipleTable.clearSelection()
                            // 根据不同状态进行勾选
                            if (this.formData.isSelectAll === 1) {
                                // 全选状态，勾选当前页所有行
                                this.tableData.forEach((row) => {
                                    this.$refs.multipleTable.toggleRowSelection(row, true)
                                })
                                // 维护选中计数为总数
                                this.selectedCount = this.total
                            } else {
                                // 修改勾选逻辑：根据 towerId 和 userId 共同判断
                                this.tableData.forEach((row) => {
                                    const shouldSelect = this.formData.towerUserList.some(
                                        (item) => item.towerId === row.towerId && item.userId === row.userId
                                    )
                                    if (shouldSelect) {
                                        this.$refs.multipleTable.toggleRowSelection(row, true)
                                    }
                                })
                                // 维护选中计数为 towerUserList 的长度
                                this.selectedCount = this.formData.towerUserList.length
                            }
                        })
                    }
                }
            } catch (error) {
                console.error('获取列表数据失败:', error)
                // this.$modal.msgError('获取列表数据失败');
            }
        },
    }
}

</script>