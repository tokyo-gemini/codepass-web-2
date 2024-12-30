<template>
    <div class="app-container flex flex-col w-full">
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
                        <el-button type="primary" @click="submitForm" class="mr-2">保存</el-button>
                        <el-button v-if="!isEdit" @click="handleReset">重置</el-button>
                    </div>
                </div>
            </template>
        </el-page-header>

        <el-divider></el-divider>


    </div>
</template>

<script>
import {
    asyncGetFormDesignPage,
    getSysDept,
    getTaiwanOption,
    getPlannedManage,
    plannedManageAdd,
    plannedManageUpdate,
    getTemplate,
    getSelect
} from '@/api/plan'

export default {
    name: 'PlanVisit',
    data() {
        return {
            loading: false,
            form: {
                planName: '',
                planDesc: '',
                planType: undefined,
                formId: undefined,
                cycled: '0',
                cycledTime: null,
                cycledTimeType: null,
                startTime: null,
                endTime: null,
                closed: '0',
                closedTime: null,
                earlyWarning: '0',
                alarmTimeList: [''],
                areaIdList: [],
                companyIdList: [],
                powerIdList: [],
                towerIdList: [],
                tagIdList: [],
                isSelectAll: 0
            },
            rules: {
                planName: [
                    { required: true, message: '请输入计划名称', trigger: 'blur' }
                ],
                forCount: [
                    { required: true, message: '请输入循环次数', trigger: 'blur' }
                ],
                formId: [
                    { required: true, message: '请选择关联表单', trigger: 'change' }
                ]
            },
            formList: [],
            areaIdList: [],
            // 对象选择相关
            templateShow: false,
            selectedTags: [],
            isTagsCollapsed: true,
            areaOptions: [],
            companyOptions: [],
            powerOptions: [],
            towerOptions: [],
            tableData: [],
            selectedRows: [],
            tableLoading: false,

            // 分页
            currentPage: 1,
            pageSize: 10,
            total: 0,

            // 标签选择
            tagDialogVisible: false,

            // 文件上传
            uploadList: []
        }
    },
    computed: {
        isEdit() {
            return !!this.$route.query.id
        },
        pageTitle() {
            const typeMap = {
                '1': '日常巡视',
                '2': '特殊巡视',
                '3': '日常走访',
                '4': '特殊走访'
            }
            if (this.isEdit) {
                return `编辑${typeMap[this.form.planType] || '计划'}-${this.form.planName || ''}`
            }
            return `新建${typeMap[this.$route.query.type] || '计划'}`
        }
    },
    created() {
        const { id, type } = this.$route.query
        if (id) {
            this.getDetail(id)
        } else if (type) {
            this.form.planType = type
        }
        this.getFormList()
        this.loadAreaOptions()
    },
    methods: {
        // 获取表单列表
        async getFormList() {
            try {
                const res = await asyncGetFormDesignPage({
                    current: 1,
                    size: 999
                })
                this.formList = res.data.records || []
            } catch (error) {
                console.error('获取表单列表失败:', error)
            }
        },
        // 获取计划详情
        async getDetail(id) {
            try {
                const res = await getPlannedManage(id)
                if (res.code === 0) {
                    this.form = res.data
                }
            } catch (error) {
                console.error('获取计划详情失败:', error)
                this.$modal.msgError('获取计划详情失败')
            }
        },
        // 提交表单
        async submitForm() {
            try {
                await this.$refs.form.validate()
                const api = this.isEdit ? plannedManageUpdate : plannedManageAdd
                const res = await api(this.form)
                if (res.code === 0) {
                    this.$modal.msgSuccess('保存成功')
                    this.handleBack()
                }
            } catch (error) {
                console.error('保存失败:', error)
            }
        },
        handleBack() {
            this.$tab.closeOpenPage({ path: '/plan/index', title: '计划管理' });
        },
        handleReset() {
            this.$modal.confirm('确定要重置表单信息吗？')
                .then(() => {
                    this.form = {
                        planName: '',
                        planType: this.planType,
                        // 其他字段重置
                    };
                    this.$refs.form?.resetFields();
                    this.$modal.msgSuccess('表单信息已重置');
                })
                .catch(() => { });
        },
        cancel() {
            this.handleBack();
        },
        // 加载城市选项
        async loadAreaOptions() {
            try {
                const res = await getSysDept({ level: 2, parentIds: [1] })
                this.areaOptions = res.data
            } catch (error) {
                console.error('获取城市列表失败:', error)
            }
        },

        // 城市选择改变
        async changeArea(val) {
            // 清空下级选择
            this.form.companyIdList = []
            this.form.powerIdList = []
            this.form.towerIdList = []

            try {
                const res = await getSysDept({ level: 3, parentIds: val })
                this.companyOptions = res.data
            } catch (error) {
                console.error('获取区县列表失败:', error)
            }
        },

        // 标签相关方法
        addTags() {
            this.tagDialogVisible = true
        },
        handleClose(tag) {
            this.selectedTags = this.selectedTags.filter(t => t.tagId !== tag.tagId)
        },
        toggleTagsCollapse() {
            this.isTagsCollapsed = !this.isTagsCollapsed
        },

        // 表格选择相关方法
        handleSelectionChange(val) {
            this.selectedRows = val
        },
        handleSelect(selection, row) {
            // 表格行选择逻辑
        },
        clearSelection() {
            this.$refs.multipleTable.clearSelection()
        },
        toggleSelectAll() {
            // 全选/取消全选逻辑
        }
    }
}
</script>

<style scoped>
.app-container {
    padding: 20px;
}

.section-title {
    font-weight: bold;
    margin: 20px 0 10px;
    padding-left: 10px;
    border-left: 4px solid #409EFF;
}
</style>
