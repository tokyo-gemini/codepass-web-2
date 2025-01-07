<template>
    <div class="rounded bg-white shadow w-full p-4">
        <div class="font-bold pb-4 flex items-center">
            <dict-tag :options="dict.type.plan_type_option" :value="planType" />
        </div>

        <div>
            <el-form-item label="计划名称" prop="planName">
                <template #label>
                    <div class="flex items-center gap-1">
                        <span>计划名称</span>
                        <el-tooltip content="用于标识和区分不同的计划" placement="top">
                            <i class="el-icon-info text-gray-400 cursor-help"></i>
                        </el-tooltip>
                    </div>
                </template>
                <el-input v-model="formModel.planName" clearable placeholder="请输入计划名称" @input="handleInput"></el-input>
            </el-form-item>

            <el-form-item label="计划描述" prop="planDesc">
                <template #label>
                    <div class="flex items-center gap-1">
                        <span>计划描述</span>
                        <el-tooltip content="对该计划的详细说明和补充信息" placement="top">
                            <i class="el-icon-info text-gray-400 cursor-help"></i>
                        </el-tooltip>
                    </div>
                </template>
                <el-input v-model="formModel.planDesc" clearable placeholder="请输入计划描述" @input="handleInput"></el-input>
            </el-form-item>

            <el-form-item label="计划表单" prop="formId">
                <template #label>
                    <div class="flex items-center gap-1">
                        <span>计划表单</span>
                        <el-tooltip content="选择执行该计划时需要填写的表单模板" placement="top">
                            <i class="el-icon-info text-gray-400 cursor-help"></i>
                        </el-tooltip>
                    </div>
                </template>
                <el-select v-model="formModel.formId" clearable placeholder="请选择计划表单" @change="handleInput">
                    <el-option v-for="item in formList" :key="item.id" :label="item.name" :value="item.id" />
                </el-select>
            </el-form-item>
        </div>
    </div>
</template>

<script>
import { asyncGetPlanOptions } from '@/api/plan'

export default {
    name: 'PlanBasicInfo',

    dicts: ['plan_type_option'],

    props: {
        planType: {
            type: String,
            required: true
        },
        value: {
            type: Object,
            default: () => ({
                planName: '',
                planDesc: '',
                formId: null
            })
        }
    },

    data() {
        return {
            formList: [], // 表单列表
            formModel: {
                planName: '',
                planDesc: '',
                formId: null
            }
        }
    },

    watch: {
        value: {
            handler(val) {
                this.formModel = { ...val }
            },
            immediate: true,
            deep: true
        }
    },

    created() {
        this.getFormListByType()
    },

    methods: {
        // 根据类型获取表单列表
        async getFormListByType() {
            try {
                // 自主填报使用对应普通走访的表单
                let type = this.planType
                if (type === '5') { // 自主日常走访使用日常走访的表单
                    type = '3'
                } else if (type === '6') { // 自主特殊走访使用特殊走访的表单 
                    type = '4'
                }

                const res = await asyncGetPlanOptions(type)
                this.formList = res.data || []
            } catch (error) {
                console.error('获取表单列表失败:', error)
            }
        },

        // 处理输入变化
        handleInput() {
            this.$emit('input', { ...this.formModel })
        }
    }
}
</script>
