<template>
    <div>
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
                    <div>
                        <div class="text-xs text-gray-500 mt-1">上传格式: .xlsx, .xls</div>
                        <div v-if="uploadProgress > 0" class="mt-2 w-full">
                            <el-progress :percentage="uploadProgress" :format="progressFormat" />
                        </div>
                    </div>
                </template>
            </el-upload>
        </div>

        <div v-if="uploadedData.length" class="mb-4">
            <el-alert type="info" :closable="false">
                <div class="flex items-center justify-between">
                    <span>已选择 {{ selectedItems.length }} 项</span>
                    <el-button v-if="uploadedData.length" type="text" @click="resetSelection">
                        清空选择
                    </el-button>
                </div>
            </el-alert>
        </div>

        <el-table v-if="uploadedData.length > 0" :data="uploadedData" @selection-change="handleSelectionChange"
            ref="uploadTable" height="410" :header-cell-style="{
                background: '#f5f7fa',
                color: '#606266'
            }">
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
    </div>
</template>

<script>
import { asyncDownLoadTemplate } from '@/api/plan' // 添加导入

export default {
    name: 'UploadTemplate',
    props: {
        planType: {
            type: String,
            required: true
        },
        value: {
            type: Array,
            default: () => []
        },
        powerDepts: { // 添加供电所参数
            type: Array,
            default: () => []
        }
    },

    data() {
        return {
            uploadedData: [],
            selectedItems: [], // 新增选中项数组
            uploadFile: null, // 新增:保存上传的文件
            fileList: [], // 新增文件列表
            uploadUrl: process.env.VUE_APP_BASE_API + '/plan/upload',
            uploadProgress: 0 // 新增上传进度
        }
    },

    computed: {
        isVisit() {
            return this.planType === '3' || this.planType === '4'
        }
    },

    methods: {
        async handleDownloadTemplate() {
            try {
                // 只需要传递 type 参数
                const params = {
                    type: this.isVisit ? 'zf' : 'xs'
                }

                // 调用下载API
                const res = await asyncDownLoadTemplate(params)

                // 下载文件
                const fileName = this.isVisit ? '走访类计划任务派单模板.xlsx' : '巡视类计划任务派单模板.xlsx'
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

        progressFormat(percentage) {
            return percentage === 100 ? '解析中...' : `${percentage}%`;
        },

        handleFileChange(file) {
            if (file) {
                // 保存文件对象供后续使用
                this.uploadFile = file.raw
                // 模拟上传进度
                this.uploadProgress = 0
                const interval = setInterval(() => {
                    if (this.uploadProgress < 90) {
                        this.uploadProgress += 10
                    }
                }, 200)

                // 触发事件通知父组件
                this.$emit('file-change', this.uploadFile)

                // 上传完成后
                setTimeout(() => {
                    clearInterval(interval)
                    this.uploadProgress = 100
                }, 2000)
            }
        },

        handleFileRemove() {
            this.uploadFile = null
            this.uploadProgress = 0
            this.$emit('file-change', null)
        },

        handleUploadError(err) {
            console.error('文件上传失败:', err)
            this.$message.error('文件上传失败，请重试')
        },

        handleExceed(files) {
            this.$message.warning('最多只能上传1个文件')
        },

        handleSelectionChange(val) {
            this.selectedItems = val.map(item => ({
                userId: item.userId,
                userName: item.userName,
                towerId: item.towerId,
                towerName: item.towerName,
                areaName: item.areaName,
                companyName: item.companyName,
                powerName: item.powerName,
                deptId: item.deptId,
                provinceName: item.provinceName
            }))
            // 触发v-model更新
            this.$emit('input', this.selectedItems)
        },

        resetSelection() {
            this.selectedItems = []
            this.$refs.uploadTable?.clearSelection()
            this.$emit('input', [])
        }
    }
}
</script>