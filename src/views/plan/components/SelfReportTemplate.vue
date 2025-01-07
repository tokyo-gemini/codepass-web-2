<template>
    <div class="rounded bg-white shadow w-full p-4">
        <div class="font-bold pb-4">
            <div class="section-title">对象选择</div>
        </div>
        <!-- 添加说明信息 -->
        <div class="bg-gray-50 p-4 mb-4 rounded text-sm text-gray-600">
            <div class="flex items-start gap-2">
                <i class="el-icon-info-circle text-blue-500 mt-0.5"></i>
                <div>
                    <p class="font-medium mb-2">自助填报说明:</p>
                    <ul class="list-disc pl-4 space-y-1">
                        <li>下载模板: 获取标准格式的Excel模板文件</li>
                        <li>填写数据: 请按模板要求填写目标对象信息</li>
                        <li>上传文件: 支持.xlsx/.xls格式,大小不超过2MB</li>
                        <li>上传后系统会自动解析并显示数据</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="flex gap-4 mb-4">
            <el-button type="primary" @click="handleDownloadTemplate">
                <i class="el-icon-download mr-1"></i>下载模版
            </el-button>
            <el-upload class="upload-demo" :action="uploadUrl" :auto-upload="false" :on-change="handleFileChange"
                :before-upload="beforeUpload" :on-remove="handleFileRemove" :on-exceed="handleExceed" :limit="1"
                accept=".xlsx, .xls" :show-file-list="true">
                <el-button type="success">
                    <i class="el-icon-upload mr-1"></i>上传文件
                </el-button>
                <template #tip>
                    <div class="text-xs text-gray-500 mt-1">上传格式: .xlsx, .xls</div>
                </template>
            </el-upload>
        </div>

        <div>
            <!-- 展示数据列表 -->
            <el-table v-if="uploadedData.length > 0" :data="currentPageData" height="410" :header-cell-style="{
                background: '#f5f7fa',
                color: '#606266'
            }">
                <el-table-column prop="orgNo" label="供电单位编码" min-width="120">
                    <template #header>
                        <span>供电单位编码</span>
                        <span class="text-gray-400 text-xs">(选填)</span>
                    </template>
                </el-table-column>
                <el-table-column prop="orgName" label="供电单位名称" min-width="120">
                    <template #header>
                        <span>供电单位名称</span>
                        <span class="text-gray-400 text-xs">(选填)</span>
                    </template>
                </el-table-column>
                <el-table-column prop="tgNo" label="台区编码" min-width="120">
                    <template #header>
                        <span>台区编码</span>
                        <span class="text-red-500 text-xs">(必填)</span>
                    </template>
                </el-table-column>
                <el-table-column prop="tgName" label="台区名称" min-width="120">
                    <template #header>
                        <span>台区名称</span>
                        <span class="text-gray-400 text-xs">(选填)</span>
                    </template>
                </el-table-column>
                <el-table-column prop="consNo" label="用户编号" min-width="120">
                    <template #header>
                        <span>用户编号</span>
                        <span class="text-red-500 text-xs">(必填)</span>
                    </template>
                </el-table-column>
                <el-table-column prop="consName" label="用户名称" min-width="120">
                    <template #header>
                        <span>用户名称</span>
                        <span class="text-red-500 text-xs">(必填)</span>
                    </template>
                </el-table-column>
                <el-table-column prop="elecAddr" label="用电地址" min-width="150">
                    <template #header>
                        <span>用电地址</span>
                        <span class="text-gray-400 text-xs">(选填)</span>
                    </template>
                </el-table-column>
                <el-table-column prop="telNo" label="联系电话" min-width="120">
                    <template #header>
                        <span>联系电话</span>
                        <span class="text-gray-400 text-xs">(选填)</span>
                    </template>
                </el-table-column>

                <!-- 添加新的网格员相关列 -->
                <el-table-column prop="gridNo" label="网格员编号" min-width="120">
                    <template #header>
                        <span>网格员编号</span>
                        <span class="text-red-500 text-xs">(必填)</span>
                    </template>
                </el-table-column>
                <el-table-column prop="gridName" label="网格员名称" min-width="120">
                    <template #header>
                        <span>网格员名称</span>
                        <span class="text-gray-400 text-xs">(选填)</span>
                    </template>
                </el-table-column>
            </el-table>

            <!-- 添加分页组件 -->
            <pagination v-if="uploadedData.length > 0" :total="uploadedData.length" :page.sync="currentPage"
                :limit.sync="pageSize" @pagination="handlePagination" />
        </div>
    </div>
</template>

<script>
import { asyncDownLoadSelfTemplate, asyncUploadSelfInfo } from '@/api/plan'
import Pagination from "@/components/Pagination"

export default {
    name: 'SelfReportTemplate',
    components: {
        Pagination
    },
    props: {
        planType: {
            type: String,
            required: true
        },
        value: {
            type: Array,
            default: () => []
        }
    },

    data() {
        return {
            uploadedData: [], // 保存所有数据
            currentPage: 1,  // 当前页码
            pageSize: 10,    // 每页显示条数
            uploadFile: null,
            uploadUrl: process.env.VUE_APP_BASE_API + '/plan/upload'
        }
    },

    computed: {
        isVisit() {
            return this.planType === '5' || this.planType === '6'
        },

        // 计算当前页数据
        currentPageData() {
            const start = (this.currentPage - 1) * this.pageSize
            const end = start + this.pageSize
            return this.uploadedData.slice(start, end)
        }
    },

    methods: {
        async handleDownloadTemplate() {
            try {
                const res = await asyncDownLoadSelfTemplate()
                const fileName = '自助走访计划任务模板.xlsx'
                const link = document.createElement('a')
                link.href = window.URL.createObjectURL(new Blob([res]))
                link.download = fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(link.href)
            } catch (error) {
                console.error('下载模板失败:', error)
                this.$modal.msgError('下载模板失败')
            }
        },

        beforeUpload(file) {
            const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'application/vnd.ms-excel'
            const isLt2M = file.size / 1024 / 1024 < 2
            if (!isExcel) {
                this.$message.error('只能上传Excel文件!')
                return false
            }
            if (!isLt2M) {
                this.$message.error('文件大小不能超过 2MB!')
                return false
            }
            return true
        },

        async handleFileChange(file) {
            if (file) {
                try {
                    this.uploadFile = file.raw

                    // 创建 FormData 对象用于上传
                    const formData = new FormData()
                    formData.append('file', file.raw)

                    // 调用自助填报上传接口
                    const res = await asyncUploadSelfInfo(formData)

                    if (res.code === 200) {
                        // 重置分页参数
                        this.currentPage = 1
                        this.uploadedData = res.data || []
                        // 通过 v-model 更新到父组件时,传递所有数据
                        this.$emit('input', this.uploadedData)
                        this.$emit('file-change', this.uploadFile)
                        this.$modal.msgSuccess('文件解析成功')
                    } else {
                        this.$modal.msgError(res.msg || '文件解析失败')
                        this.handleFileRemove() // 失败时清空文件
                    }
                } catch (error) {
                    console.error('文件上传失败:', error)
                    this.$modal.msgError('文件上传失败')
                    this.handleFileRemove() // 失败时清空文件
                }
            }
        },

        handleFileRemove() {
            this.uploadFile = null
            this.uploadedData = []
            this.currentPage = 1
            this.$emit('file-change', null)
            this.$emit('input', [])
        },

        handleExceed() {
            this.$message.warning('最多只能上传1个文件')
        },

        // 处理分页变化
        handlePagination(val) {
            this.currentPage = val.page
            this.pageSize = val.limit
        }
    }
}
</script>
