import { deptTreeSelect } from "@/api/system/user"
import { asyncGetAreaList } from '@/api/plan'

export default {
    data() {
        return {
            powerSupplyTree: [], // 供电所树形数据
            towerIdListOption: [], // 台区列表选项
            searchKeyword: '', // 搜索关键字
            selectedCount: 0 // 选中计数
        }
    },

    methods: {
        // 获取供电所树形数据
        async getPowerSupplyTree() {
            try {
                const res = await deptTreeSelect()
                // 处理树形数据,添加禁用属性
                this.powerSupplyTree = this.processTreeData(res.data || [])
            } catch (error) {
                console.error('获取供电所树形数据失败:', error)
                this.$modal.msgError('获取供电所数据失败')
            }
        },

        // 处理树形数据
        processTreeData(treeData) {
            return treeData.map(node => {
                const processedNode = {
                    id: node.id,
                    label: node.label
                }

                if (node.children && node.children.length) {
                    processedNode.children = this.processTreeData(node.children)
                }

                return processedNode
            })
        },

        // 处理供电所选择变化
        async handlePowerSupplyChange(value) {
            if (value && value.length > 0) {
                // 重置相关数据
                this.formData.towerIdList = null
                this.queryParams.pageNum = 1
                this.searchKeyword = ''
                this.selectedCount = 0
                this.formData.towerUserList = []

                if (this.isVisit) {
                    // 获取台区列表数据用于treeselect
                    await this.loadTowerOptions(value.toString())
                }
                // 重新加载表格数据
                this.getObjectTable()
            } else {
                // 清空相关数据
                this.tableData = []
                this.towerIdListOption = []
                this.total = 0
                this.selectedCount = 0
                this.formData.towerUserList = []
            }
        },

        // 加载台区选项
        async loadTowerOptions(deptIds) {
            try {
                const params = {
                    pageNum: 1,
                    pageSize: 9999,
                    deptIdList: deptIds
                }
                const res = await asyncGetAreaList(params)

                if (res.code === 200) {
                    // 处理台区数据,去重并格式化
                    const seen = new Set()
                    this.towerIdListOption = (res.rows || [])
                        .filter(item => {
                            if (!item?.towerId || seen.has(item.towerId)) return false
                            seen.add(item.towerId)
                            return true
                        })
                        .map(item => ({
                            id: item.towerId,
                            label: item.towerName,
                            isDisabled: false,
                            isLeaf: true
                        }))
                }
            } catch (error) {
                console.error('获取台区列表失败:', error)
                this.$modal.msgError('获取台区列表失败')
            }
        },

        // 处理台区选择变化
        handleTowerChange(value) {
            if (this.isVisit && this.formData.powerSupply) {
                // 重置分页和搜索条件
                this.queryParams.pageNum = 1
                this.searchKeyword = ''
                this.selectedCount = 0
                this.formData.towerUserList = []
                this.formData.towerIdList = value || []
                // 重新加载表格数据
                this.getObjectTable()
            }
        },

        // 搜索处理
        handleSearch() {
            this.queryParams.pageNum = 1
            this.getObjectTable()
        },

        // normalizer简化,不处理禁用逻辑
        normalizer(node) {
            return {
                id: node.id,
                label: node.label,
                children: node.children
            }
        },

        // 台区数据格式化
        normalizerTower(node) {
            return {
                id: node.id,
                label: node.label,
                title: node.label, // 用于tooltip显示完整信息
                isDisabled: false
            }
        },

        // treeselect的限制文本显示
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

            // 修改为与原实现一致的VNode创建方式
            return this.$createElement('el-popover', {
                props: {
                    placement: 'top-start',
                    width: 300,
                    trigger: 'hover'
                },
                scopedSlots: {
                    default: () => this.$createElement('div', {},
                        labels.map(label => this.$createElement('div', {}, label))
                    )
                }
            }, [
                this.$createElement('span', {
                    slot: 'reference'
                }, `和${count}个供电所`)
            ])
        }
    }
}
