import { asyncGetAreaList, asyncGetCustomerList } from '@/api/plan'

export default {
    data() {
        return {
            tableData: [], // 表格数据
            total: 0, // 总条数
            queryParams: {
                pageNum: 1,
                pageSize: 10
            }
        }
    },

    methods: {
        // 获取表格数据
        async getObjectTable(pagination) {
            if (!this.formData.powerSupply || !this.formData.powerSupply.length) {
                this.$modal.msgWarning('请先选择供电所')
                return
            }

            try {
                if (this.isVisit) {
                    // 走访类型,使用客户查询接口
                    const customerParams = {
                        pageNum: pagination?.page || this.queryParams.pageNum,
                        pageSize: pagination?.limit || this.queryParams.pageSize,
                        planId: this.$route.params.id || '', // 编辑时传入planId
                        deptIdList: this.formData.powerSupply.toString(), // 供电所ID
                        towerIdList: Array.isArray(this.formData.towerIdList) ? this.formData.towerIdList.join(',') : '', // 台区ID列表
                        customName: this.searchKeyword // 客户名称搜索
                    }

                    const customerRes = await asyncGetCustomerList(customerParams)
                    if (customerRes.code === 200) {
                        this.handleTableResponse(customerRes)
                    }
                } else {
                    // 巡检类型
                    const params = {
                        pageNum: pagination?.page || this.queryParams.pageNum,
                        pageSize: pagination?.limit || this.queryParams.pageSize,
                        deptIdList: this.formData.powerSupply.toString(),
                        planId: this.$route.params.id || '',
                        towerName: this.searchKeyword // 台区名称搜索
                    }

                    const res = await asyncGetAreaList(params)
                    if (res.code === 200) {
                        this.handleTableResponse(res)
                    }
                }
            } catch (error) {
                console.error('获取列表数据失败:', error)
                this.$modal.msgError('获取列表数据失败')
            }
        },

        // 处理表格响应数据
        handleTableResponse(response) {
            this.tableData = response.rows || []
            this.total = parseInt(response.total) || 0

            // 在数据加载完成后进行勾选
            this.$nextTick(() => {
                // 清除当前页的选择
                this.$refs.multipleTable.clearSelection()

                if (this.formData.isSelectAll === 1) {
                    // 全选状态,勾选当前页所有行
                    this.tableData.forEach(row => {
                        this.$refs.multipleTable.toggleRowSelection(row, true)
                    })
                    // 维护选中计数为总数
                    this.selectedCount = this.total
                } else {
                    // 部分选中状态,根据towerUserList进行勾选
                    this.tableData.forEach(row => {
                        const shouldSelect = this.formData.towerUserList.some(item =>
                            this.isVisit
                                ? item.customId === row.customId
                                : item.towerId === row.towerId
                        )
                        if (shouldSelect) {
                            this.$refs.multipleTable.toggleRowSelection(row, true)
                        }
                    })
                    // 维护选中计数为towerUserList的长度
                    this.selectedCount = this.formData.towerUserList.length
                }
            })
        },

        // 处理表格选择变化
        handleSelectionChange(val) {
            if (this.formData.isSelectAll !== 1) {
                // 更新选中计数
                this.selectedCount = this.formData.towerUserList.length

                // 处理当前页的选中状态
                const currentPageSelections = val.map(item => ({
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
                    customName: item.customName
                }))

                // 获取当前页面所有的标识ID
                const currentPageIds = this.tableData.map(item => ({
                    towerId: item.towerId,
                    userId: item.userId,
                    customId: item.customId
                }))

                // 从towerUserList中移除当前页面的所有记录
                this.formData.towerUserList = this.formData.towerUserList.filter(item => {
                    return !currentPageIds.some(pageItem =>
                        this.isVisit
                            ? pageItem.customId === item.customId
                            : pageItem.towerId === item.towerId && pageItem.userId === item.userId
                    )
                })

                // 将当前页的选中项添加到towerUserList
                this.formData.towerUserList.push(...currentPageSelections)

                // 更新选中计数
                this.selectedCount = this.formData.towerUserList.length

                // 如果手动取消了某些选择,更新全选状态
                if (this.selectedCount < this.total) {
                    this.formData.isSelectAll = 0
                }
            }
        },

        // 处理全选/取消全选
        handleToggleSelectAll() {
            if (this.formData.isSelectAll === 1) {
                // 当前是全选状态,需要取消全选
                this.$refs.multipleTable.clearSelection()
                this.formData.isSelectAll = 0
                this.selectedCount = 0
                this.formData.towerUserList = []
            } else {
                // 当前不是全选状态,需要全选
                this.formData.isSelectAll = 1
                this.selectedCount = this.total
                // 选中当前页的所有行
                this.tableData.forEach(row => {
                    this.$refs.multipleTable.toggleRowSelection(row, true)
                })
            }
        }
    }
}
