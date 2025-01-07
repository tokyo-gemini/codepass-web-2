<template>
    <div class="app-container">
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

            <!-- 动态列 -->
            <el-table-column v-for="col in dynamicColumns.filter(col => col.visible)" :key="col.prop" align="center"
                class-name="dynamic-column">
                <template slot="header">
                    <div class="dynamic-column-header">
                        <span>{{ col.label }}</span>
                    </div>
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

        <pagination v-show="total > 0" :total="total" :page.sync="page" :limit.sync="size" @pagination="getList" />

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
            <vm-form-render :form-json="detailInfo.formJson" :formConfig="detailInfo.formConfig" view-mode
                :form-data="detailInfo.formData" ref="vmFormRef">
            </vm-form-render>
            <!-- 动态表单数据展示 -->
            <!-- <div class="mt-4" v-if="detailInfo.jsonData">
                <div class="font-bold mb-2">表单数据</div>
                <el-descriptions :column="2" border>
                    <el-descriptions-item v-for="item in detailInfo.jsonData" :key="item.prop" :label="item.label">
                        {{ item.value || '-' }}
                    </el-descriptions-item>
                </el-descriptions>
            </div> -->
        </el-dialog>
    </div>
</template>

<script>
import { asyncGetNoFormList, asyncGetNoFormDetail } from "@/api/synthesize"; // 需要新增这个API

export default {
    name: "NoFormList",
    data() {
        return {
            loading: false,
            visitList: [],
            total: 0,
            page: 1,
            size: 10,
            dynamicColumns: [], // 与主页面相同的动态列配置
            formTypeMap: {
                '1': '日常巡视',
                '2': '特殊巡视',
                '3': '日常走访',
                '4': '特殊走访',
                '5': '工单走访',
                '6': '工单巡视',
                '7': '默认走访',
                '8': '默认巡视',
            },
            detailVisible: false, // 详情弹窗显示状态
            detailInfo: {}, // 详情数据
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
                    pageNum: this.page,
                    pageSize: this.size
                });
                this.visitList = res.rows || [];
                this.total = res.total || 0;
            } catch (error) {
                console.error('获取无单列表失败:', error);
                this.$modal.msgError('获取列表失败');
            } finally {
                this.loading = false;
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
        /** 查看按钮操作 */
        async handleView(row) {
            try {
                const params = {
                    formDataId: row.formDataId,
                };

                const res = await asyncGetNoFormDetail(params);
                if (res.code === 200) {
                    this.detailInfo = {
                        ...res.data.custom,
                        formJson: { widgetList: JSON.parse(res.data.widgetList), formConfig: JSON.parse(res.data.formConfig) },
                        formData: JSON.parse(res.data.jsonData),
                        optionData: JSON.parse(res.data.optionData),
                    };
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
    }
};
</script>

<style scoped>
.mt-4 {
    margin-top: 1rem;
}

.font-bold {
    font-weight: bold;
}

.mb-2 {
    margin-bottom: 0.5rem;
}
</style>