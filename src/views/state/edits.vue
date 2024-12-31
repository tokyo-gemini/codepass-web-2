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
            123
        </div>
    </div>
</template>

<script>
import { getStateList } from "@/api/state";
import { getTagType } from './index'
export default {
    name: 'StateEdit',
    data() {
        return {
            queryParams: {
                pageNum: 1,
                pageSize: 10,
            },
            currentState: '', // 新增状态名称存储
        }
    },
    created() {
        this.fetchStateData()
    },
    computed: {
        currentId() {
            return this.$route.params.id
        }
    },
    methods: {
        getTagType,
        handleBack() {
            this.$tab.closeOpenPage({ path: '/state/index', title: '状态管理' })
        },
        handleSave() {
        },
        // 根据当前的id筛选状态列表里的数据拿到名称
        fetchStateData() {
            getStateList(this.queryParams)
                .then(response => {
                    const id = this.$route.params.id;
                    this.currentState = response.rows.find(item => item.statusTypeId === id);
                })
                .catch(error => {
                    console.error('获取状态数据失败:', error);
                });
        }
    }
}
</script>