<template>
  <div class="app-container h-screen">
    <el-tabs v-model="queryParams.type" class="mb-4" @tab-click="handleTypeChange">
      <el-tab-pane label="走访查询" name="zf"></el-tab-pane>
      <el-tab-pane label="巡视查询" name="xs"></el-tab-pane>
    </el-tabs>

    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="100px">
      <!-- 公共筛选项 -->
      <el-form-item label="所属供电所" prop="powerId">
        <treeselect v-model="queryParams.powerId" :options="powerSupplyOptions" :normalizer="normalizer"
          placeholder="请选择供电所" class="w-48" :disableBranchNodes="true" :limit="1" :limitText="treeselectLimitText"
          @input="handlePowerSupplyChange" />
      </el-form-item>

      <el-form-item label="所属台区" prop="towerId">
        <treeselect v-model="queryParams.towerId" :options="towerOptions" :normalizer="normalizer" placeholder="请选择台区"
          class="w-48" />
      </el-form-item>

      <el-form-item :label="queryParams.type === 'zf' ? '走访日期' : '巡检日期'" prop="dispatchTime">
        <el-date-picker v-model="dispatchTimeRange" type="daterange" range-separator="至" start-placeholder="开始日期"
          end-placeholder="结束日期" value-format="yyyy-MM-dd" @change="handleDateChange" />
      </el-form-item>

      <!-- 走访特有筛选项 -->
      <template v-if="queryParams.type === 'zf'">
        <!-- 客户标签 - 独占一行 -->
        <div class="w-full mb-4">
          <el-form-item label="客户标签" prop="tagIdList" class="tag-form-item">
            <div class="flex items-start gap-2">
              <el-button size="small" type="primary" plain icon="el-icon-plus" @click="showTagDialog">添加标签</el-button>
              <div class="flex-1 flex flex-wrap gap-2">
                <!-- 当标签数量小于等于3个时直接显示 -->
                <template v-if="selectedTags.length <= 3">
                  <el-tag v-for="tag in selectedTags" :key="tag.id" closable size="small" @close="handleRemoveTag(tag)">
                    {{ tag.label }}
                  </el-tag>
                </template>
                <!-- 当标签数量大于3个时使用折叠面板 -->
                <el-collapse-transition v-else>
                  <div v-show="showAllTags" class="flex flex-wrap gap-2">
                    <el-tag v-for="tag in selectedTags" :key="tag.id" closable size="small"
                      @close="handleRemoveTag(tag)">
                      {{ tag.label }}
                    </el-tag>
                  </div>
                </el-collapse-transition>
                <!-- 展开/收起按钮 -->
                <el-button v-if="selectedTags.length > 3" type="text" size="small" @click="showAllTags = !showAllTags">
                  {{ showAllTags ? '收起' : `展开(${selectedTags.length})` }}
                </el-button>
              </div>
            </div>
          </el-form-item>
        </div>

        <el-form-item label="客户名称" prop="customName">
          <el-input v-model="queryParams.customName" placeholder="请输入客户名称" clearable />
        </el-form-item>
      </template>

      <!-- 公共筛选项续 -->
      <el-form-item label="工单编号" prop="formDataId">
        <el-input v-model="queryParams.formDataId" placeholder="计划工单编号/申请编号" clearable />
      </el-form-item>

      <el-form-item label="工单类型" prop="formType">
        <el-select v-model="queryParams.formType" placeholder="请选择工单类型" @change="handleFormTypeChange" clearable>
          <el-option v-for="item in formTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="来源表单" prop="formId">
        <el-select v-model="queryParams.formId" placeholder="请选择来源表单" clearable>
          <el-option v-for="item in formOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="结果状态" prop="resultStatus">
        <el-select v-model="queryParams.resultStatus" placeholder="请选择结果状态" clearable>
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="执行状态" prop="formStatus">
        <el-select v-model="queryParams.formStatus" placeholder="请选择执行状态" clearable>
          <el-option v-for="item in formStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 表格顶部操作区 -->
    <div class="mb-4 flex justify-between items-center">
      <el-button type="text" icon="el-icon-setting" @click="showColumnSettings">列设置</el-button>
    </div>

    <el-table v-loading="loading" :data="visitList" :show-header="hasFormList">
      <!-- 没有来源表单时显示的提示 -->
      <template slot="empty">
        <el-empty :description="emptyText"></el-empty>
      </template>
      <el-table-column label="工单编号" align="center" prop="orderId" />
      <el-table-column label="工单类型" align="center" prop="orderType">
        <template slot-scope="scope">
          <!-- <dict-tag :options="dict.type.order_type" :value="scope.row.orderType" /> -->
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="处理时间" align="center" prop="handleTime" width="180">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.handleTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="结果状态" align="center" prop="resultStatus">
        <template slot-scope="scope">
          <!-- <dict-tag :options="dict.type.result_status" :value="scope.row.resultStatus" /> -->
        </template>
      </el-table-column>
      <el-table-column label="执行状态" align="center" prop="execStatus">
        <template slot-scope="scope">
          <!-- <dict-tag :options="dict.type.exec_status" :value="scope.row.execStatus" /> -->
        </template>
      </el-table-column>
      <el-table-column label="上报人" align="center" prop="reporter" />
      <template v-for="column in dynamicColumns">
        <el-table-column v-if="column.visible" :key="column.prop" :prop="column.prop" :label="column.label"
          align="center" />
      </template>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button size="mini" type="text" icon="el-icon-view" @click="handleView(scope.row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 列设置弹窗 -->
    <el-dialog title="列设置" :visible.sync="columnSettingsVisible" width="500px" append-to-body
      custom-class="column-settings-dialog">
      <div class="column-settings-content">
        <div class="mb-4 flex justify-between items-center">
          <el-input v-model="columnSearchKeyword" placeholder="搜索列名" prefix-icon="el-icon-search" clearable
            class="w-64" />
          <div>
            <el-button type="text" @click="selectAllColumns">全选</el-button>
            <el-button type="text" @click="unselectAllColumns">取消全选</el-button>
          </div>
        </div>

        <el-checkbox-group v-model="selectedColumns" class="column-list">
          <el-checkbox v-for="column in filteredDynamicColumns" :key="column.prop" :label="column.prop"
            class="column-item">
            {{ column.label }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <div slot="footer">
        <el-button @click="columnSettingsVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveColumnSettings">确 定</el-button>
      </div>
    </el-dialog>

    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
      @pagination="getList" />
  </div>
</template>

<script>
import { asyncGetVisitList, asyncGetWorkOrderType, asyncGetSourceForm, asyncGetFormControls } from "@/api/synthesize";
import { deptTreeSelect } from "@/api/system/user";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";

export default {
  name: "SynthesizePage",
  components: { Treeselect },
  data() {
    return {
      // 激活的标签页
      activeTab: 'visit',
      // 遮罩层
      loading: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 走访列表数据
      visitList: [],
      // 站所选项
      powerSupplyOptions: [],
      // 台区选项 - 修改为树形结构数据
      towerOptions: [],
      // 客户标签选项
      customerTagOptions: [],
      // 查询参数
      queryParams: {
        type: 'zf', // 默认走访
        formType: '',
        formId: '',
        cityId: '',
        companyId: '',
        powerId: '',
        towerId: '',
        dispatchStartTime: '',
        dispatchEndTime: '',
        tagIdList: [],
        formDataId: '',
        statusDataId: '',
        statusTypeId: '',
        formStatus: '',
        busiTypeId: '',
        oneTypeId: '',
        twoTypeId: '',
        threeTypeId: '',
        customName: '',
        current: 1,
        size: 10
      },
      dispatchTimeRange: [], // 用于日期范围选择
      formTypeOptions: [], // 表单类型选项
      formOptions: [], // 来源表单选项
      statusOptions: [], // 结果状态选项
      formStatusOptions: [], // 执行状态选项
      tagDialogVisible: false, // 标签选择弹窗显示状态
      showAllTags: false, // 是否显示所有标签
      selectedTags: [], // 已选择的标签数组
      checkedTags: [], // 弹窗中选中的标签ID数组
      hasFormList: true, // 是否有可用的来源表单
      emptyText: '暂无数据', // 空数据提示文本
      columnSettingsVisible: false, // 列设置弹窗显示状态
      columnSearchKeyword: '', // 列搜索关键字
      dynamicColumns: [], // 动态列配置
      selectedColumns: [], // 已选中的列
    };
  },
  async created() {
    // 1. 获取站所数据
    await this.getPowerSupplyOptions();
    // 2. 获取工单类型并设置默认值
    await this.getWorkOrderType();
    // getList 会在 getFormOptions 成功后自动调用
  },
  computed: {
    // 过滤后的动态列
    filteredDynamicColumns() {
      if (!this.columnSearchKeyword) return this.dynamicColumns;
      const keyword = this.columnSearchKeyword.toLowerCase();
      return this.dynamicColumns.filter(column =>
        column.label.toLowerCase().includes(keyword)
      );
    }
  },
  methods: {
    /** 查询走访列表 */
    getList() {
      this.loading = true;
      asyncGetVisitList(this.queryParams).then(response => {
        this.visitList = response.rows;
        this.total = response.total;
        // 更新空数据提示文本
        this.emptyText = this.hasFormList && !this.visitList.length ? '暂无数据' : this.emptyText;
        this.loading = false;
      }).catch(() => {
        this.loading = false;
        this.emptyText = '获取数据失败';
      });
    },
    /** 获取站所数据 */
    getPowerSupplyOptions() {
      deptTreeSelect().then(response => {
        this.powerSupplyOptions = response.data;
      });
    },
    /** 监听站所选择变化并获取对应台区数据 */
    async handlePowerSupplyChange(value) {
      if (value && value.length > 0) {
        try {
          // 这里需要根据实际 API 调整
          const res = await getAreaList({
            deptIdList: Array.isArray(value) ? value.join(',') : value
          });
          // 转换为 treeselect 需要的数据结构
          this.towerOptions = this.formatTowerOptions(res.data || []);
        } catch (error) {
          console.error('获取台区数据失败:', error);
          this.towerOptions = [];
        }
      } else {
        this.towerOptions = [];
        this.queryParams.tower = undefined;
      }
    },

    /** 格式化台区数据为树形结构 */
    formatTowerOptions(data) {
      return data.map(item => ({
        id: item.towerId,
        label: item.towerName,
      }));
    },
    /** 转换树形数据结构 */
    normalizer(node) {
      if (node.children && !node.children.length) {
        delete node.children;
      }
      // 判断是否为叶子节点
      node.disableCheck = node.children ? true : false;
      return {
        id: node.id,
        label: node.label,
        children: node.children
      };
    },
    treeselectLimitText(count) {
      const findLabel = (tree, values) => {
        const labels = [];
        const findNodeLabel = (tree, value) => {
          for (const node of tree) {
            if (node.id === value) {
              return node.label;
            }
            if (node.children) {
              const label = findNodeLabel(node.children, value);
              if (label) {
                return label;
              }
            }
          }
          return null;
        };
        for (const value of values) {
          const label = findNodeLabel(this.powerSupplyOptions, value);
          if (label) {
            labels.push(label);
          }
        }
        return labels;
      };

      const labels = findLabel(this.powerSupplyOptions, this.queryParams.powerSupply);

      // Create a div containing multiple divs for each label
      const contentVNodes = this.$createElement('div', {}, labels.map(label => {
        return this.$createElement('div', {}, label);
      }));

      return this.$createElement('div', {
        class: 'virtual-dom'
      }, [
        this.$createElement('el-popover', {
          props: {
            placement: 'top-start',
            width: 300,
            trigger: 'hover'
          },
          scopedSlots: {
            default: () => contentVNodes
          }
        }, [
          this.$createElement('span', {
            slot: 'reference'
          }, `和${count}个站所`)
        ])
      ]);
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.dispatchTimeRange = [];
      // 保持查询类型不变
      const type = this.queryParams.type;
      this.resetForm("queryForm");
      this.queryParams = {
        ...this.queryParams,
        type,
        formType: '',
        formId: '',
        powerId: '',
        towerId: '',
        dispatchStartTime: '',
        dispatchEndTime: '',
        tagIdList: [],
        formDataId: '',
        statusDataId: '',
        formStatus: '',
        customName: '',
        current: 1,
        size: 10
      };

      if (type === 'zf') {
        this.selectedTags = [];
        this.checkedTags = [];
        this.showAllTags = false;
      }

      this.emptyText = this.hasFormList ? '暂无数据' : '当前工单类型下没有可用的来源表单';
      this.handleQuery();
    },
    /** 查看按钮操作 */
    handleView(row) {
      // getVisitDetail(row.orderId).then(response => {
      //   // 处理查看详情的逻辑
      // });
    },
    /** 显示标签选择弹窗 */
    showTagDialog() {
      // 将已选择的标签ID设置到checkedTags中
      this.checkedTags = this.selectedTags.map(tag => tag.id);
      this.tagDialogVisible = true;
    },

    /** 处理标签弹窗确认 */
    handleConfirmTags() {
      // 根据选中的ID过滤出完整的标签对象
      this.selectedTags = this.customerTagOptions.filter(tag =>
        this.checkedTags.includes(tag.id)
      );
      // 更新查询参数
      this.queryParams.tagIdList = this.checkedTags;
      this.tagDialogVisible = false;
    },

    /** 处理删除标签 */
    handleRemoveTag(tag) {
      this.selectedTags = this.selectedTags.filter(t => t.id !== tag.id);
      this.checkedTags = this.checkedTags.filter(id => id !== tag.id);
      this.queryParams.tagIdList = this.checkedTags;
    },

    /** 处理标签弹窗关闭 */
    handleTagDialogClose() {
      this.checkedTags = this.selectedTags.map(tag => tag.id);
    },
    /** 处理查询类型变化 */
    async handleTypeChange() {
      // 先清空工单类型相关数据
      this.formTypeOptions = [];
      this.queryParams.formType = '';
      this.formOptions = [];
      this.queryParams.formId = '';

      // 如果切换到巡检，清空客户相关字段
      if (this.queryParams.type === 'xs') {
        this.queryParams.customName = '';
        this.queryParams.tagIdList = [];
        this.selectedTags = [];
        this.checkedTags = [];
      }

      // 重新获取工单类型选项和默认值
      this.emptyText = '加载中...'; // 切换类型时显示加载提示
      await this.getWorkOrderType();
      // getList 会在 getFormOptions 成功后自动调用
    },

    /** 处理表单类型变化 */
    async handleFormTypeChange(value) {
      this.queryParams.formId = '';
      if (value) {
        await this.getFormOptions();
      } else {
        // 清空相关选项
        this.formOptions = [];
        this.statusOptions = [];
        this.formStatusOptions = [];
        this.queryParams.formId = '';
      }
    },

    /** 处理日期变化 */
    handleDateChange(val) {
      if (val) {
        [this.queryParams.dispatchStartTime, this.queryParams.dispatchEndTime] = val;
      } else {
        this.queryParams.dispatchStartTime = '';
        this.queryParams.dispatchEndTime = '';
      }
    },
    /** 获取工单类型选项 */
    async getWorkOrderType() {
      try {
        // 传入当前选中的类型作为参数
        const res = await asyncGetWorkOrderType(this.queryParams.type);
        if (res.data?.length) {
          this.formTypeOptions = res.data.map(item => ({
            value: item.id,
            label: item.name
          }));
          // 默认选中第一个选项
          if (this.formTypeOptions.length > 0) {
            this.queryParams.formType = this.formTypeOptions[0].value;
            // 获取来源表单选项
            await this.getFormOptions();
            // 获取表单控件配置
            if (this.queryParams.formId) {
              await this.getFormControls();
            }
          }
        } else {
          this.formTypeOptions = [];
          this.queryParams.formType = '';
          // 清空相关数据
          this.formOptions = [];
          this.statusOptions = [];
          this.formStatusOptions = [];
          this.visitList = [];
          this.total = 0;
          this.hasFormList = false;
          this.emptyText = '暂无可用的工单类型';
        }
      } catch (error) {
        console.error('获取工单类型失败:', error);
        this.formTypeOptions = [];
        this.queryParams.formType = '';
        this.hasFormList = false;
        this.emptyText = '获取工单类型失败';
      }
    },

    /** 获取来源表单选项 */
    async getFormOptions() {
      if (!this.queryParams.formType) return;

      try {
        const res = await asyncGetSourceForm(this.queryParams.formType);
        if (res.data.formBaseInfoList?.length) {
          // 有可用的来源表单
          this.hasFormList = true;
          this.emptyText = '暂无数据'; // 重置为默认提示文本
          this.formOptions = res.data.formBaseInfoList.map(item => ({
            value: item.id,
            label: item.name
          }));
          // 默认选中第一个选项
          this.queryParams.formId = this.formOptions[0].value;

          // 保存结果状态和执行状态选项
          if (res.data.statusDataList) {
            this.statusOptions = res.data.statusDataList.map(item => ({
              value: item.id,
              label: item.name
            }));
          }
          if (res.data.formStatusList) {
            this.formStatusOptions = res.data.formStatusList.map(item => ({
              value: item.id,
              label: item.name
            }));
          }

          // 所有数据准备就绪后，再调用查询列表
          await this.getList();
        } else {
          // 没有可用的来源表单
          this.hasFormList = false;
          this.emptyText = '当前工单类型下没有可用的来源表单';
          this.formOptions = [];
          this.queryParams.formId = '';
          this.statusOptions = [];
          this.formStatusOptions = [];
          this.visitList = []; // 清空表格数据
          this.total = 0;
        }
      } catch (error) {
        console.error('获取来源表单失败:', error);
        this.hasFormList = false;
        this.emptyText = '获取来源表单失败';
        this.visitList = [];
        this.total = 0;
      }
    },

    /** 获取表单控件配置 */
    async getFormControls() {
      try {
        const res = await asyncGetFormControls(this.queryParams.formId);
        if (res.data?.length) {
          // 初始化动态列配置
          this.dynamicColumns = res.data.map(item => ({
            prop: item.prop,
            label: item.label,
            visible: false // 默认不显示
          }));
          // 恢复上次的列显示设置
          this.restoreColumnSettings();
        }
      } catch (error) {
        console.error('获取表单控件失败:', error);
      }
    },

    /** 显示列设置弹窗 */
    showColumnSettings() {
      this.columnSettingsVisible = true;
      // 初始化选中状态
      this.selectedColumns = this.dynamicColumns
        .filter(col => col.visible)
        .map(col => col.prop);
    },

    /** 全选列 */
    selectAllColumns() {
      this.selectedColumns = this.dynamicColumns.map(col => col.prop);
    },

    /** 取消全选列 */
    unselectAllColumns() {
      this.selectedColumns = [];
    },

    /** 保存列设置 */
    saveColumnSettings() {
      // 更新列的可见性
      this.dynamicColumns.forEach(col => {
        col.visible = this.selectedColumns.includes(col.prop);
      });
      // 保存设置到本地存储
      this.saveColumnSettingsToStorage();
      this.columnSettingsVisible = false;
    },

    /** 保存列设置到本地存储 */
    saveColumnSettingsToStorage() {
      const settings = {
        formId: this.queryParams.formId,
        columns: this.dynamicColumns.map(col => ({
          prop: col.prop,
          visible: col.visible
        }))
      };
      localStorage.setItem('tableColumnSettings', JSON.stringify(settings));
    },

    /** 从本地存储恢复列设置 */
    restoreColumnSettings() {
      try {
        const settings = JSON.parse(localStorage.getItem('tableColumnSettings'));
        if (settings?.formId === this.queryParams.formId) {
          this.dynamicColumns.forEach(col => {
            const saved = settings.columns.find(s => s.prop === col.prop);
            if (saved) {
              col.visible = saved.visible;
            }
          });
        }
      } catch (error) {
        console.error('恢复列设置失败:', error);
      }
    },
  }
};
</script>

<style lang="scss" scoped>
// ...existing styles...

.column-settings-dialog {
  .column-settings-content {
    max-height: 400px;
    overflow-y: auto;
  }

  .column-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .column-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f7fa;
    }
  }
}
</style>