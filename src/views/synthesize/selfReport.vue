<template>
    <div>
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch">
            <!-- 添加部门筛选 -->
            <el-form-item label="归属部门" prop="deptId">
                <treeselect v-model="queryParams.deptId" :options="deptOptions" :normalizer="normalizer"
                    :show-count="true" :disable-branch-nodes="true" placeholder="请选择归属部门" class="w-60" />
            </el-form-item>
            <!-- 添加执行状态筛选 -->
            <el-form-item label="执行状态" prop="formStatus">
                <el-select v-model="queryParams.formStatus" placeholder="请选择执行状态" clearable>
                    <el-option label="进行中" value="2" />
                    <el-option label="已完成" value="3" />
                </el-select>
            </el-form-item>
            <div class="w-full flex justify-end">
                <el-form-item>
                    <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
                    <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
                    <el-button type="warning" plain icon="el-icon-download" @click="handleExport">导出</el-button>
                </el-form-item>
            </div>
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

        <!-- 修改导出配置弹窗 -->
        <el-dialog title="导出配置" :visible.sync="exportVisible" width="500px" append-to-body>
            <div class="mb-4 text-gray-600">
                可导出数据总量：{{ completedTotal }}条
            </div>
            <el-form :model="exportForm" label-width="120px">
                <el-form-item label="单次导出数量">
                    <el-radio-group v-model="exportForm.pageSize" @change="handlePageSizeChange">
                        <el-radio :label="1000">1000条/次</el-radio>
                        <el-radio :label="3000">3000条/次</el-radio>
                        <el-radio :label="5000">5000条/次</el-radio>
                        <el-radio :label="10000">10000条/次</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="导出页数选择">
                    <el-select v-model="exportForm.page" placeholder="请选择要导出的页数">
                        <el-option v-for="page in totalPages" :key="page" :label="getPageRangeLabel(page)"
                            :value="page" />
                    </el-select>
                </el-form-item>
            </el-form>
            <div slot="footer" class="dialog-footer">
                <el-button @click="exportVisible = false">取 消</el-button>
                <el-button type="primary" @click="handleConfirmExport" :loading="exporting">确 定</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script>
// 修改引入的API
import { asyncGetSelfReportList, asyncGetNoFormDetail } from "@/api/synthesize";
import { exportFile } from "@/utils/request";
import { deptTreeSelect } from "@/api/system/user";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";

export default {
    name: "SelfReportList",
    components: {
        Treeselect
    },
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
                deptId: undefined,
                formStatus: undefined
            },
            detailVisible: false,
            detailInfo: {},
            imageList: [],
            previewList: [],
            baseURL: process.env.VUE_APP_BASE_API,
            formTypeMap: {
                '1': '日常巡视',
                '2': '特殊巡视',
                '3': '日常走访',
                '4': '特殊走访',
                '5': '工单走访',
                '6': '工单巡视',
                '7': '默认走访',
                '8': '默认巡视'
            },
            exportVisible: false,
            exporting: false,
            exportForm: {
                page: 1,
                pageSize: 1000
            },
            deptOptions: [], // 部门选项
            completedTotal: 0 // 添加已完成工单的总数
        };
    },
    computed: {
        totalPages() {
            // 使用已完成工单的总数来计算总页数
            return Math.ceil(this.completedTotal / this.exportForm.pageSize);
        }
    },
    async created() {
        // 获取部门树数据
        await this.getDeptTree();
        this.getList();
    },
    methods: {
        async getList() {
            this.loading = true;
            try {
                const res = await asyncGetSelfReportList({
                    ...this.queryParams
                    // 移除 type: 'zz', 因为新接口不需要这个参数
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
            this.queryParams.deptId = undefined;
            this.queryParams.formStatus = undefined;
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
                    // this.$message.error(res.msg || '获取详情失败');
                }
            } catch (error) {
                console.error('获取详情失败:', error);
                // this.$message.error('获取详情失败');
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
        /** 获取已完成工单的总数 */
        async getCompletedTotal() {
            try {
                const res = await asyncGetSelfReportList({
                    ...this.queryParams,
                    pageNum: 1,
                    pageSize: 1,
                    formStatus: '3' // 添加已完成状态筛选
                });
                this.completedTotal = res.total || 0;
            } catch (error) {
                console.error('获取已完成工单总数失败:', error);
                this.$modal.msgError('获取已完成工单总数失败');
            }
        },
        /** 导出按钮操作 */
        async handleExport() {
            // 先获取已完成工单的总数
            await this.getCompletedTotal();

            if (this.completedTotal === 0) {
                this.$modal.msgError('当前没有已完成的工单可供导出');
                return;
            }
            this.exportForm.page = 1;
            this.exportVisible = true;
        },

        /** 确认导出操作 */
        handleConfirmExport() {
            this.$modal.confirm('是否确认导出当前页数据?').then(() => {
                this.exporting = true;

                // 使用新的exportFile方法
                exportFile(
                    '/search/export/autonomous/page',
                    {
                        page: this.exportForm.page,
                        pageSize: this.exportForm.pageSize,
                        formStatus: '3' // 添加已完成状态筛选
                    },
                    `自主填报数据_第${this.exportForm.page}页_${new Date().getTime()}.xlsx`,
                    {
                        timeout: 300000,  // 设置5分钟超时
                        onDownloadProgress: (progressEvent) => {
                            if (progressEvent.lengthComputable) {
                                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                downloadLoadingInstance.text = `正在导出数据，已完成 ${percentCompleted}%`;
                            }
                        }
                    }
                ).then(() => {
                    this.exporting = false;
                    this.exportVisible = false;
                    this.$modal.msgSuccess('导出成功');
                }).catch(() => {
                    this.exporting = false;
                });
            });
        },
        /** 处理单次导出数量变化 */
        handlePageSizeChange() {
            this.exportForm.page = 1; // 重置页码选择
        },
        /** 获取部门树 */
        async getDeptTree() {
            const response = await deptTreeSelect();
            this.deptOptions = response.data;
        },
        /** 转换部门数据结构 */
        normalizer(node) {
            return {
                id: node.id,
                label: node.label,
                children: node.children
            };
        },
        /** 获取页码范围标签 */
        getPageRangeLabel(page) {
            const start = (page - 1) * this.exportForm.pageSize;
            const remainingItems = this.completedTotal - start;
            const itemsInThisPage = Math.min(this.exportForm.pageSize, remainingItems);
            const end = start + itemsInThisPage;

            return `第${page}页 (${start + 1}-${end}条)`;
        },
    }
};
</script>
