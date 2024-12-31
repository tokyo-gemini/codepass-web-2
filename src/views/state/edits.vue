<template>
    <div class="app-container flex flex-col w-full">
        <el-page-header @back="handleBack">
            <template #title>
                <div class="w-full h-full flex items-center">返回状态列表</div>
            </template>
            <template #content>
                <div class="flex items-center space-x-4 justify-between w-full">
                    <span class="text-lg font-semibold mr-3">
                        {{ pageTitle }}
                    </span>
                    <div>
                        <el-button type="primary" @click="handleSave" class="mr-2">保存</el-button>
                        <el-button @click="handleReset">重置</el-button>
                    </div>
                </div>
            </template>
        </el-page-header>
        <el-divider></el-divider>

        <div class="bg-white p-4 rounded shadow">
            <!-- 这里放表单内容 -->
        </div>
    </div>
</template>

<script>
export default {
    name: 'StateEdit',
    data() {
        return {
            stateId: this.$route.params.id,
        }
    },
    computed: {
        pageTitle() {
            return this.stateId ? '编辑状态' : '新增状态'
        }
    },
    methods: {
        handleBack() {
            this.$tab.closeOpenPage({ path: '/state/index', title: '状态管理' })
        },
        handleSave() {
            // TODO: 实现保存逻辑
        },
        handleReset() {
            this.$modal.confirm('确定要重置表单信息吗？').then(() => {
                // TODO: 实现重置逻辑
                this.$modal.msgSuccess('表单信息已重置')
            }).catch(() => { })
        }
    }
}
</script>