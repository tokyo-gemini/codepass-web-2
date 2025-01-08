<template>
    <div class="app-container">
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch">
            <el-form-item label="表单类型" prop="formType">
                <el-select v-model="queryParams.formType" placeholder="请选择表单类型" clearable @change="handleQuery">
                    <el-option label="自主填报日常走访" :value="5" />
                    <el-option label="自主填报特殊走访" :value="6" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
                <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
        </el-form>

        <el-table v-loading="loading" :data="visitList">
            <!-- 没有数据时显示的提示 -->
            <template slot="empty">
                <el-empty description="暂无数据"></el-empty>
            </template>

            <!-- 固定列 -->
            <el-table-column label="计划工单编号/申请编号" align="center" prop="formDataId" width="120" />
            <el-table-column label="工单类型" align="center" prop="formType" width="120">
                <template slot-scope="scope">
                    <el-tooltip :content="getFormTypeText(scope.row.formType)" placement="top">
                        <span>{{ getFormTypeText(scope.row.formType) }}</span>
                    </el-tooltip>
                </template>
            </el-table-column>

            <!-- 固定列(继续) -->
            <el-table-column label="创建时间" align="center" prop="createTime" width="160">
                <template slot-scope="scope">
                    {{ scope.row.createTime ? parseTime(scope.row.createTime) : '-' }}
                </template>
            </el-table-column>
            <el-table-column label="处理时间" align="center" prop="updateTime" width="160">
                <template slot-scope="scope">
                    {{ scope.row.updateTime ? parseTime(scope.row.updateTime) : '-' }}
                </template>
            </el-table-column>
            <el-table-column label="结果状态" align="center" prop="statusValue">
                <template slot-scope="scope">
                    {{ scope.row.statusValue || '-' }}
                </template>
            </el-table-column>
            <el-table-column label="执行状态" align="center" prop="formStatus">
                <template slot-scope="scope">
                    <el-tag :type="getFormStatusType(scope.row.formStatus)">
                        {{ getFormStatusText(scope.row.formStatus) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="上报人" align="center" prop="userName" />
            <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="100" fixed="right">
                <template slot-scope="scope">
                    <el-button size="mini" type="text" icon="el-icon-view" @click="handleView(scope.row)">查看</el-button>
                </template>
            </el-table-column>
        </el-table>

        <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum"
            :limit.sync="queryParams.pageSize" @pagination="getList" />

        <!-- 查看详情弹窗 -->
        <el-dialog title="详情查看" :visible.sync="detailVisible" width="700px" append-to-body destroy-on-close>
            <el-descriptions :column="2" border>
                <el-descriptions-item label="台区编码">{{ detailInfo.tgNo || '-' }}</el-descriptions-item>
                <el-descriptions-item label="台区名称">{{ detailInfo.tgName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="用户编号">{{ detailInfo.consNo || '-' }}</el-descriptions-item>
                <el-descriptions-item label="用户名称">{{ detailInfo.consName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="用电地址">{{ detailInfo.elecAddr || '-' }}</el-descriptions-item>
                <el-descriptions-item label="账务联系电话">{{ detailInfo.telNo || '-' }}</el-descriptions-item>
                <el-descriptions-item label="网格员编号">{{ detailInfo.gridNo || '-' }}</el-descriptions-item>
                <el-descriptions-item label="网格员名称">{{ detailInfo.gridName || '-' }}</el-descriptions-item>
            </el-descriptions>

            <!-- 添加图片预览区域 -->
            <div v-if="imageList.length > 0" class="image-preview mt-4">
                <div class="mb-2">走访图片</div>
                <div class="image-list">
                    <el-image v-for="(img, index) in imageList" :key="index" :src="baseURL + img.url"
                        :preview-src-list="previewList" fit="cover" class="preview-image">
                        <div slot="error" class="image-slot">
                            <i class="el-icon-picture-outline"></i>
                        </div>
                    </el-image>
                </div>
            </div>

            <!-- 使用 vm-form-render 并过滤上传组件 -->
            <vm-form-render :form-json="filterUploadWidgets(detailInfo.formJson)" :form-config="detailInfo.formConfig"
                view-mode :form-data="detailInfo.formData" ref="vmFormRef">
            </vm-form-render>
        </el-dialog>
    </div>
</template>

<script>
import { asyncGetNoFormList, asyncGetNoFormDetail } from "@/api/synthesize";

export default {
    name: "SelfReportList",
    data() {
        return {
            loading: false,
            showSearch: true,
            visitList: [],
            total: 0,
            queryParams: {
                pageNum: 1,
                pageSize: 10,
                formType: 5, // 默认选中自主填报日常走访
            },
            detailVisible: false,
            detailInfo: {},
            imageList: [],
            previewList: [],
            baseURL: process.env.VUE_APP_BASE_API,
            formTypeMap: {
                '5': '自主填报日常走访',
                '6': '自主填报特殊走访'
            }
        };
    },
    created() {
        this.getList();
    },
    methods: {
        async getList() {
            this.loading = true;
            try {
                const res = await asyncGetNoFormList({
                    ...this.queryParams,
                    type: 'zz' // 自主填报类型
                });
                this.visitList = res.rows || [];
                this.total = res.total || 0;
            } catch (error) {
                console.error('获取自主填报列表失败:', error);
                this.$modal.msgError('获取列表失败');
            } finally {
                this.loading = false;
            }
        },
        // 查询按钮操作
        handleQuery() {
            this.queryParams.pageNum = 1;
            this.getList();
        },
        // 重置按钮操作
        resetQuery() {
            this.resetForm("queryForm");
            this.handleQuery();
        },
        /** 查看按钮操作 */
        async handleView(row) {
            try {
                const params = {
                    formDataId: row.formDataId,
                };

                const res = await asyncGetNoFormDetail(params);
                if (res.code === 200) {
                    const formData = JSON.parse(res.data.jsonData || '{}');
                    const widgetList = JSON.parse(res.data.widgetList || '[]');

                    this.detailInfo = {
                        ...res.data.custom,
                        formJson: {
                            widgetList,
                            formConfig: JSON.parse(res.data.formConfig)
                        },
                        formData,
                        optionData: JSON.parse(res.data.optionData),
                    };

                    // 查找类型为 'm-picture-upload' 的组件ID
                    const pictureWidget = widgetList.find(widget => widget.type === 'm-picture-upload');
                    if (pictureWidget) {
                        this.imageList = formData[pictureWidget.id] || [];
                        this.previewList = this.imageList.map(img => this.baseURL + img.url);
                    } else {
                        this.imageList = [];
                        this.previewList = [];
                    }

                    this.$nextTick(() => {
                        this.$refs.vmFormRef?.disableForm();
                    });
                    this.detailVisible = true;
                } else {
                    this.$message.error(res.msg || '获取详情失败');
                }
            } catch (error) {
                console.error('获取详情失败:', error);
                this.$message.error('获取详情失败');
            }
        },
        getFormStatusType(status) {
            const statusMap = {
                '0': 'danger',    // 超时未完成
                '1': 'info',      // 已创建
                '2': 'warning',   // 进行中
                '3': 'success',   // 按时完成
                '4': 'warning'    // 超时完成
            };
            return statusMap[status] || 'info';
        },
        getFormStatusText(status) {
            const statusMap = {
                '0': '超时未完成',
                '1': '已创建',
                '2': '进行中',
                '3': '按时完成',
                '4': '超时完成'
            };
            return statusMap[status] || '未知状态';
        },
        getFormTypeText(type) {
            return this.formTypeMap[type] || `未知类型(${type})`;
        },
        filterUploadWidgets(formJson) {
            if (!formJson?.widgetList) return formJson;

            return {
                ...formJson,
                widgetList: formJson.widgetList.filter(widget =>
                    widget.type !== 'm-picture-upload'
                )
            }
        },
    }
};
</script>

<style scoped>
.mt-4 {
    margin-top: 1rem;
}

.mb-2 {
    margin-bottom: 0.5rem;
}

.image-preview {
    .image-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .preview-image {
        width: 120px;
        height: 120px;
        border-radius: 4px;
        cursor: pointer;
    }

    .image-slot {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        background: #f5f7fa;
        color: #909399;
        font-size: 30px;
    }
}
</style>
