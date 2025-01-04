<template>
    <div>
        <el-page-header @back="handleBack">
            <template #title>
                <div class="w-full h-full flex items-center">返回计划列表</div>
            </template>
            <template #content>
                <div class="flex items-center space-x-4 justify-between w-full">
                    <span class="text-lg font-semibold mr-3">{{ title }}</span>
                    <div>
                        <el-button type="primary" class="mr-2" @click="handleSubmit">保存</el-button>
                        <el-button @click="handleReset">重置</el-button>
                    </div>
                </div>
            </template>
        </el-page-header>
        <el-divider />
    </div>
</template>

<script>
export default {
    name: 'PageHeader',
    props: {
        title: {
            type: String,
            required: true
        }
    },
    methods: {
        handleBack() {
            this.$emit('back')
        },
        handleSubmit() {
            this.$emit('submit')
        },
        handleReset() {
            this.$emit('reset')
        }
    }
}
</script>
