<template>
  <div class="app-container">
    <el-tabs v-model="queryParams.type" @tab-click="handleTypeChange">
      <!-- 移除永远不会显示的标签页注释 -->
      <el-tab-pane label="走访查询" name="zf"></el-tab-pane>
      <el-tab-pane label="巡视查询" name="xs"></el-tab-pane>
    </el-tabs>

    <!-- 无单查询组件 -->
    <no-form-list v-if="queryParams.type === 'wd'" />
    <!-- 自主填报组件 -->
    <self-report-list v-else-if="queryParams.type === 'zz'" />
    <!-- 原有的走访和巡视查询内容 -->
    <template v-else>
      <el-form
        :model="queryParams"
        ref="queryForm"
        size="small"
        :inline="true"
        v-show="showSearch"
        label-width="100px"
      >
        <!-- 公共筛选项 -->
        <!-- 所属供电所 - 独占一行 -->
        <div class="w-full mb-4">
          <el-form-item label="所属供电所" prop="powerId">
            <treeselect
              v-model="selectedPowerId"
              :options="powerSupplyOptions"
              :normalizer="normalizer"
              :clearable="true"
              :searchable="true"
              :disable-branch-nodes="true"
              :default-expand-level="0"
              :disable-fuzzy-matching="true"
              :multiple="false"
              :flat="false"
              :always-show-clear="true"
              :append-to-body="true"
              :close-on-select="true"
              :show-count="true"
              placeholder="请选择所属供电所"
              class="w-full"
              @input="handlePowerIdChange"
            />
          </el-form-item>
        </div>

        <el-form-item
          :label="queryParams.type === 'zf' ? '走访日期' : '巡检日期'"
          prop="dispatchTime"
        >
          <el-date-picker
            v-model="dispatchTimeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            @change="handleDateChange"
          />
        </el-form-item>

        <!-- 走访特有筛选项 -->
        <template v-if="queryParams.type === 'zf'">
          <!-- 客户标签 - 独占一行 -->
          <div class="w-full mb-4" v-if="false">
            <el-form-item label="客户标签" prop="tagIdList" class="tag-form-item">
              <div class="flex items-start gap-2">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  icon="el-icon-plus"
                  @click="showTagDialog"
                  >添加标签</el-button
                >
                <div class="flex-1 flex flex-wrap gap-2">
                  <!-- 当标签数量小于等于3个时直接显示 -->
                  <template v-if="selectedTags.length <= 3">
                    <el-tag
                      v-for="tag in selectedTags"
                      :key="tag.id"
                      closable
                      size="small"
                      @close="handleRemoveTag(tag)"
                    >
                      {{ tag.label }}
                    </el-tag>
                  </template>
                  <!-- 当标签数量大于3个时使用折叠面板 -->
                  <el-collapse-transition v-else>
                    <div v-show="showAllTags" class="flex flex-wrap gap-2">
                      <el-tag
                        v-for="tag in selectedTags"
                        :key="tag.id"
                        closable
                        size="small"
                        @close="handleRemoveTag(tag)"
                      >
                        {{ tag.label }}
                      </el-tag>
                    </div>
                  </el-collapse-transition>
                  <!-- 展开/收起按钮 -->
                  <el-button
                    v-if="selectedTags.length > 3"
                    type="text"
                    size="small"
                    @click="showAllTags = !showAllTags"
                  >
                    {{ showAllTags ? '收起' : `展开(${selectedTags.length})` }}
                  </el-button>
                </div>
              </div>
            </el-form-item>
          </div>
        </template>

        <!-- 公共筛选项续 -->
        <el-form-item label="计划工单编号/申请编号" prop="formDataId">
          <el-input
            v-model="queryParams.formDataId"
            placeholder="计划工单编号/申请编号"
            clearable
          />
        </el-form-item>

        <el-form-item label="工单类型" prop="formType">
          <el-select
            v-model="queryParams.formType"
            placeholder="请选择工单类型"
            @change="handleFormTypeChange"
            clearable
          >
            <el-option
              v-for="item in formTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="来源表单" prop="formId">
          <el-select
            v-model="queryParams.formId"
            placeholder="请选择来源表单"
            clearable
            @change="handleFormIdChange"
          >
            <el-option
              v-for="item in formOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="结果状态" prop="statusDatald">
          <el-select v-model="queryParams.statusDatald" placeholder="请选择结果状态" clearable>
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="执行状态" prop="formStatus">
          <el-select v-model="queryParams.formStatus" placeholder="请选择执行状态" clearable>
            <el-option
              v-for="item in formStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格顶部操作区 -->
      <div class="mb-4 w-full flex justify-end items-center">
        <el-button type="text" icon="el-icon-setting" @click="showColumnSettings">列设置</el-button>
        <el-button type="warning" plain icon="el-icon-download" @click="handleExport"
          >导出</el-button
        >
      </div>

      <el-table v-loading="loading" :data="visitList" :show-header="hasFormList">
        <!-- 没有来源表单时显示的提示 -->
        <template slot="empty">
          <el-empty :description="emptyText"></el-empty>
        </template>
        <!-- 固定列 -->
        <el-table-column
          label="计划工单编号/申请编号"
          align="center"
          prop="formDataId"
          width="120"
        />
        <el-table-column label="工单类型" align="center" prop="formType" width="120">
          <template slot-scope="scope">
            <el-tooltip :content="getFormTypeText(scope.row.formType)" placement="top">
              <span>{{ getFormTypeText(scope.row.formType) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <!-- 动态列 -->
        <el-table-column
          v-for="col in dynamicColumns.filter((col) => col.visible)"
          :key="col.prop"
          align="center"
          class-name="dynamic-column"
          :width="getColumnWidth(col.prop, col.label)"
        >
          <template slot="header">
            <div class="dynamic-column-header">
              <span>{{ col.label }}</span>
              <el-tooltip :content="`编号:${col.prop}`" placement="top">
                <i class="el-icon-info dynamic-column-icon"></i>
              </el-tooltip>
            </div>
          </template>
          <template slot-scope="scope">
            <!-- 判断是否为图片类型数据 -->
            <div v-if="isImageColumn(scope.row, col.prop)">
              <el-image
                v-if="getImageList(scope.row, col.prop).length > 0"
                :src="getFirstImageUrl(scope.row, col.prop)"
                fit="cover"
                class="table-image"
                @click="openImagePreview(scope.row, col.prop)"
              >
                <div slot="error" class="image-slot">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </el-image>
              <span v-else>-</span>
            </div>
            <!-- 判断是否为七必访字段 - 直接展示选项和勾选状态 -->
            <div v-else-if="isSevenMustVisitField(col.prop)" class="seven-must-visit-cell">
              <div class="seven-must-visit-list-direct">
                <div
                  v-for="(item, index) in getSevenMustVisitLabels(scope.row, col.prop)"
                  :key="index"
                  class="seven-must-visit-item-direct"
                >
                  <i class="el-icon-check seven-must-visit-checkbox"></i>
                  <span class="seven-must-visit-label">{{ item }}</span>
                </div>
              </div>
            </div>
            <!-- 普通文本数据 -->
            <span v-else>{{ getFormWidgetValue(scope.row, col.prop) }}</span>
          </template>
        </el-table-column>

        <!-- 固定列(继续) -->
        <el-table-column label="创建时间" align="center" prop="createTime" width="160">
          <template slot-scope="scope">
            {{ scope.row.createTime ? parseTime(scope.row.createTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="处理时间" align="center" prop="submitTime" width="160">
          <template slot-scope="scope">
            {{ scope.row.submitTime ? parseTime(scope.row.submitTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="结果状态" align="center" prop="statusDataName">
          <template slot-scope="scope">
            {{ scope.row.statusDataName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="是否在现场" align="center" prop="isOnSite" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.isOnSite === '1' ? 'success' : 'info'">
              {{ scope.row.isOnSite === '1' ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="执行状态" align="center" prop="formStatus">
          <template slot-scope="scope">
            <el-tag :type="getFormStatusType(scope.row.formStatus)">
              {{ getFormStatusText(scope.row.formStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="网格员" align="center" prop="userName" />
        <el-table-column
          label="操作"
          align="center"
          class-name="small-padding fixed-width"
          width="100"
          fixed="right"
        >
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-view" @click="handleView(scope.row)"
              >查看</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <!-- 列设置弹窗 -->
      <el-dialog
        title="列设置"
        :visible.sync="columnSettingsVisible"
        width="500px"
        append-to-body
        custom-class="column-settings-dialog"
      >
        <div class="column-settings-content">
          <div class="mb-4 flex justify-between items-center">
            <el-input
              v-model="columnSearchKeyword"
              placeholder="搜索列名"
              prefix-icon="el-icon-search"
              clearable
              class="w-64"
            />
            <div>
              <el-button type="text" @click="selectAllColumns">全选</el-button>
              <el-button type="text" @click="unselectAllColumns">取消全选</el-button>
            </div>
          </div>

          <el-checkbox-group v-model="selectedColumns" class="column-list">
            <el-checkbox
              v-for="column in filteredDynamicColumns"
              :key="column.prop"
              :label="column.prop"
              class="column-item"
            >
              {{ column.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <div slot="footer">
          <el-button @click="columnSettingsVisible = false">取 消</el-button>
          <el-button type="primary" @click="saveColumnSettings">确 定</el-button>
        </div>
      </el-dialog>

      <!-- 导出配置弹窗 -->
      <el-dialog title="导出配置" :visible.sync="exportVisible" width="500px" append-to-body>
        <div class="mb-4 text-gray-600">可导出数据总量：{{ total }}条</div>
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
              <el-option
                v-for="page in totalPages"
                :key="page"
                :label="getPageRangeLabel(page)"
                :value="page"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="exportVisible = false">取 消</el-button>
          <el-button type="primary" @click="handleConfirmExport" :loading="exporting"
            >确 定</el-button
          >
        </div>
      </el-dialog>

      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getList"
      />

      <!-- 修改查看详情弹窗 -->
      <el-dialog
        title="详情查看"
        :visible.sync="detailVisible"
        width="700px"
        append-to-body
        destroy-on-close
      >
        <el-descriptions :column="2" border>
          <el-descriptions-item label="所属台区">{{ detailInfo.towerName }}</el-descriptions-item>
          <el-descriptions-item label="台区容量">{{ detailInfo.towerVolume }}</el-descriptions-item>
          <el-descriptions-item label="台区ID">{{ detailInfo.towerId }}</el-descriptions-item>
          <el-descriptions-item :span="2" label="详细地址">{{
            detailInfo.address
          }}</el-descriptions-item>
        </el-descriptions>

        <!-- 添加图片预览区域 -->
        <div v-if="imageList.length > 0" class="image-preview mt-4">
          <div class="mb-2">走访图片</div>
          <div class="image-list">
            <el-image
              v-for="(img, index) in imageList"
              :key="index"
              :src="getSecureImageUrl(img.url)"
              :preview-src-list="previewList"
              fit="cover"
              class="preview-image"
            >
              <div slot="error" class="image-slot">
                <i class="el-icon-picture-outline"></i>
              </div>
            </el-image>
          </div>
        </div>

        <!-- 使用 vm-form-render 并过滤上传组件 -->
        <vm-form-render
          :form-json="filterUploadWidgets(detailInfo.formJson)"
          :form-config="detailInfo.formConfig"
          view-mode
          :form-data="detailInfo.formData"
          ref="vmFormRef"
        >
        </vm-form-render>
      </el-dialog>

      <!-- 图片预览弹窗 -->
      <el-dialog
        title="图片预览"
        :visible.sync="imagePreviewVisible"
        width="90%"
        :fullscreen="false"
        append-to-body
        :modal-append-to-body="false"
        :close-on-click-modal="false"
        custom-class="image-preview-dialog"
        @close="closeImagePreview"
      >
        <div v-if="currentImageList.length > 0" class="image-preview-container">
          <div class="image-container">
            <el-image
              :src="currentImageList[currentImageIndex].url"
              fit="contain"
              class="preview-main-image"
            >
              <div slot="error" class="image-slot">
                <i class="el-icon-picture-outline"></i>
                <p>图片加载失败</p>
              </div>
            </el-image>
          </div>

          <!-- 图片导航 -->
          <div v-if="currentImageList.length > 1" class="image-navigation">
            <el-button
              type="primary"
              icon="el-icon-arrow-left"
              :disabled="currentImageIndex === 0"
              @click="prevImage"
            >
              上一张
            </el-button>
            <span class="image-counter">
              {{ currentImageIndex + 1 }} / {{ currentImageList.length }}
            </span>
            <el-button
              type="primary"
              icon="el-icon-arrow-right"
              :disabled="currentImageIndex === currentImageList.length - 1"
              @click="nextImage"
            >
              下一张
            </el-button>
          </div>

          <!-- 缩略图列表 -->
          <div v-if="currentImageList.length > 1" class="thumbnail-list">
            <el-image
              v-for="(img, index) in currentImageList"
              :key="index"
              :src="img.url"
              fit="cover"
              class="thumbnail-image"
              :class="{ active: index === currentImageIndex }"
              @click="currentImageIndex = index"
            >
              <div slot="error" class="image-slot">
                <i class="el-icon-picture-outline"></i>
              </div>
            </el-image>
          </div>
        </div>
      </el-dialog>
    </template>
  </div>
</template>

<script>
  import NoFormList from './noForm.vue'
  import SelfReportList from './selfReport.vue'
  import {
    asyncGetVisitList,
    asyncGetWorkOrderType,
    asyncGetSourceForm,
    asyncGetFormControls,
    asyncGetDetail,
    asyncGetAreaList
  } from '@/api/synthesize'
  import { deptTreeSelect } from '@/api/system/user'
  import Treeselect from '@riophae/vue-treeselect'
  import '@riophae/vue-treeselect/dist/vue-treeselect.css'
  import { exportFile } from '@/utils/request'
  export default {
    name: 'SynthesizePage',
    components: {
      Treeselect,
      NoFormList,
      SelfReportList
    },
    data() {
      return {
        // 激活的标签页
        // activeTab: 'visit', // 已有queryParams.type，不需要再定义activeTab
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
        // 添加TreeSelect使用的选中值
        selectedPowerId: null,
        // 客户标签选项
        customerTagOptions: [],
        // 查询参数
        queryParams: {
          type: 'zf', // 默认走访
          formType: '',
          formId: '',
          cityId: '',
          companyId: '',
          powerId: null, // 这里仍然保持为null，但将存储原始ID
          dispatchStartTime: '',
          dispatchEndTime: '',
          tagIdList: [],
          formDataId: '',
          statusDatald: '',
          statusTypeId: '',
          formStatus: '',
          busiTypeId: '',
          oneTypeId: '',
          twoTypeId: '',
          threeTypeId: '',
          pageNum: 1,
          pageSize: 10
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
        detailVisible: false, // 详情弹窗显示状态
        detailInfo: {}, // 详情数据
        formTypeMap: {
          1: '日常巡视',
          2: '特殊巡视',
          3: '日常走访',
          4: '特殊走访',
          5: '工单走访',
          6: '工单巡视',
          7: '默认走访',
          8: '默认巡视'
        },
        imageList: [], // 添加图片列表
        previewList: [], // 添加预览列表
        baseURL: process.env.VUE_APP_BASE_API, // 添加基础URL
        // 图片预览相关
        imagePreviewVisible: false, // 图片预览弹窗显示状态
        currentImageList: [], // 当前预览的图片列表
        currentImageIndex: 0, // 当前预览的图片索引
        // 移除重复的七必访选项映射，只在一个地方维护
        sevenMustVisitKeywords: [
          '返乡人员',
          '低电压',
          '重过载',
          '95598',
          '12398',
          '12345',
          '千伏安',
          '台区用户'
        ],
        // 添加导出相关数据
        exportVisible: false,
        exporting: false,
        exportForm: {
          page: 1,
          pageSize: 1000
        }
      }
    },
    async created() {
      // 1. 获取站所数据
      await this.getPowerSupplyOptions()
      // 2. 获取工单类型并设置默认值
      await this.getWorkOrderType()
      // getList 会在 getFormOptions 成功后自动调用
    },
    computed: {
      // 过滤后的动态列
      filteredDynamicColumns() {
        if (!this.columnSearchKeyword) return this.dynamicColumns
        const keyword = this.columnSearchKeyword.toLowerCase()
        return this.dynamicColumns.filter((column) => column.label.toLowerCase().includes(keyword))
      },
      // 添加计算总页数
      totalPages() {
        return Math.ceil(this.total / this.exportForm.pageSize)
      }
    },
    methods: {
      /** 查询走访列表 */
      getList() {
        this.loading = true
        asyncGetVisitList(this.queryParams)
          .then((response) => {
            // 确保每行数据都有 formWidgetList 字段
            this.visitList = response.rows.map((row) => {
              // 如果 formWidgetList 不是数组，初始化为空数组
              if (!row.formWidgetList || !Array.isArray(row.formWidgetList)) {
                row.formWidgetList = []
              }
              return row
            })

            this.total = response.total
            // 更新空数据提示文本
            this.emptyText =
              this.hasFormList && !this.visitList.length ? '暂无数据' : this.emptyText
            this.loading = false

            console.log('获取列表数据成功，数据条数:', this.visitList.length)
          })
          .catch((error) => {
            console.error('获取列表数据失败:', error)
            this.loading = false
            this.emptyText = '获取数据失败'
          })
      },
      /** 获取站所数据并处理重复ID */
      getPowerSupplyOptions() {
        // 根据当前查询类型设置type值
        deptTreeSelect().then((response) => {
          // 处理数据,为每个节点生成唯一ID
          const processTreeData = (nodes, parentId = '') => {
            return nodes.map((node, index) => {
              // 使用父ID和当前索引生成唯一ID
              const uniqueId = parentId ? `${parentId}-${index}` : `${index}`
              const processed = {
                ...node,
                // 保留原始ID用于提交数据
                originalId: node.id,
                // 使用生成的唯一ID作为treeselect的id
                id: uniqueId,
                label: node.label
              }

              if (node.children && node.children.length) {
                processed.children = processTreeData(node.children, uniqueId)
              }

              return processed
            })
          }

          this.powerSupplyOptions = processTreeData(response.data)
        })
      },
      /** 转换树形数据结构 */
      normalizer(node) {
        if (node.children && !node.children.length) {
          delete node.children
        }
        // 判断是否为叶子节点
        node.disableCheck = node.children ? true : false
        return {
          id: node.id,
          label: node.label,
          children: node.children
        }
      },
      treeselectLimitText(count) {
        const findLabel = (tree, values) => {
          const labels = []
          const findNodeLabel = (tree, value) => {
            for (const node of tree) {
              if (node.id === value) {
                return node.label
              }
              if (node.children) {
                const label = findNodeLabel(node.children, value)
                if (label) {
                  return label
                }
              }
            }
            return null
          }
          for (const value of values) {
            const label = findNodeLabel(this.powerSupplyOptions, value)
            if (label) {
              labels.push(label)
            }
          }
          return labels
        }

        const labels = findLabel(this.powerSupplyOptions, this.queryParams.powerSupply)

        // Create a div containing multiple divs for each label
        const contentVNodes = this.$createElement(
          'div',
          {},
          labels.map((label) => {
            return this.$createElement('div', {}, label)
          })
        )

        return this.$createElement(
          'div',
          {
            class: 'virtual-dom'
          },
          [
            this.$createElement(
              'el-popover',
              {
                props: {
                  placement: 'top-start',
                  width: 300,
                  trigger: 'hover'
                },
                scopedSlots: {
                  default: () => contentVNodes
                }
              },
              [
                this.$createElement(
                  'span',
                  {
                    slot: 'reference'
                  },
                  `和${count}个站所`
                )
              ]
            )
          ]
        )
      },
      /** 搜索按钮操作 */
      handleQuery() {
        this.queryParams.pageNum = 1
        this.getList()
      },
      /** 重置按钮操作 */
      resetQuery() {
        this.dispatchTimeRange = []
        // 保持查询类型不变
        const type = this.queryParams.type
        this.resetForm('queryForm')
        this.queryParams = {
          ...this.queryParams,
          type,
          formType: '',
          formId: '',
          powerId: '',
          dispatchStartTime: '',
          dispatchEndTime: '',
          tagIdList: [],
          formDataId: '',
          statusDatald: '',
          formStatus: '',
          current: 1,
          size: 10
        }

        // 重置TreeSelect选中值
        this.selectedPowerId = null

        if (type === 'zf') {
          this.selectedTags = []
          this.checkedTags = []
          this.showAllTags = false
        }

        this.emptyText = this.hasFormList ? '暂无数据' : '当前工单类型下没有可用的来源表单'
        this.handleQuery()
      },
      /** 查看按钮操作 */
      async handleView(row) {
        try {
          const params = {
            formDataId: row.formDataId,
            formType: row.formType,
            type: this.queryParams.type
          }
          const res = await asyncGetDetail(params)
          if (res.code === 200) {
            const formData = JSON.parse(res.data.jsonData || '{}')
            const widgetList = JSON.parse(res.data.widgetList || '[]')

            this.detailInfo = {
              ...res.data
            }

            // 查找类型为 'm-picture-upload' 的组件ID
            const pictureWidget = widgetList.find((widget) => widget.type === 'm-picture-upload')
            if (pictureWidget) {
              this.imageList = formData[pictureWidget.id] || []
              this.previewList = this.imageList.map((img) => {
                let imageUrl = img.url.startsWith('http') ? img.url : this.baseURL + img.url
                // 确保使用HTTPS协议，避免混合内容问题
                if (imageUrl.startsWith('http://')) {
                  imageUrl = imageUrl.replace('http://', 'https://')
                }
                return imageUrl
              })
            } else {
              this.imageList = []
              this.previewList = []
            }

            this.$nextTick(() => {
              this.$refs.vmFormRef?.disableForm()
            })
            this.detailVisible = true
          } else {
            this.$message.error(res.msg || '获取详情失败')
          }
        } catch (error) {
          console.error('获取详情失败:', error)
          this.$message.error('获取详情失败')
        }
      },
      /** 显示标签选择弹窗 */
      showTagDialog() {
        // 将已选择的标签ID设置到checkedTags中
        this.checkedTags = this.selectedTags.map((tag) => tag.id)
        this.tagDialogVisible = true
      },

      /** 处理标签弹窗确认 */
      handleConfirmTags() {
        // 根据选中的ID过滤出完整的标签对象
        this.selectedTags = this.customerTagOptions.filter((tag) =>
          this.checkedTags.includes(tag.id)
        )
        // 更新查询参数
        this.queryParams.tagIdList = this.checkedTags
        this.tagDialogVisible = false
      },

      /** 处理删除标签 */
      handleRemoveTag(tag) {
        this.selectedTags = this.selectedTags.filter((t) => t.id !== tag.id)
        this.checkedTags = this.checkedTags.filter((id) => id !== tag.id)
        this.queryParams.tagIdList = this.checkedTags
      },

      /** 处理标签弹窗关闭 */
      handleTagDialogClose() {
        this.checkedTags = this.selectedTags.map((tag) => tag.id)
      },
      /** 处理查询类型变化 */
      async handleTypeChange() {
        if (this.queryParams.type === 'wd' || this.queryParams.type === 'zz') {
          return // 无单查询和自主填报不需要加载工单类型
        }

        // 先清空工单类型相关数据
        this.formTypeOptions = []
        this.queryParams.formType = ''
        this.formOptions = []
        this.queryParams.formId = ''

        // 如果切换到巡检，清空客户相关字段
        if (this.queryParams.type === 'xs') {
          this.queryParams.tagIdList = []
          this.selectedTags = []
          this.checkedTags = []
        }

        // 重新获取工单类型选项和默认值
        this.emptyText = '加载中...' // 切换类型时显示加载提示
        await this.getWorkOrderType()
        // 注意：getList 会在 getFormOptions 成功后自动调用
      },

      /** 处理表单类型变化 */
      async handleFormTypeChange(value) {
        this.queryParams.formId = ''
        if (value) {
          await this.getFormOptions()
          // 注意：getFormOptions 会在最后调用 getList，所以这里不需要再调用
        } else {
          // 清空相关选项
          this.formOptions = []
          this.statusOptions = []
          this.formStatusOptions = []
          this.queryParams.formId = ''
          // 由于清空了表单类型，需要清空列表数据
          this.visitList = []
          this.total = 0
        }
      },

      /** 处理来源表单变化 */
      async handleFormIdChange(value) {
        if (value) {
          // 重新获取表单控件配置
          await this.getFormControls()
          // 重新获取列表数据
          await this.getList()
        } else {
          // 清空动态列配置
          this.dynamicColumns = []
          this.selectedColumns = []
          // 清空列表数据
          this.visitList = []
          this.total = 0
        }
      },

      /** 处理日期变化 */
      handleDateChange(val) {
        if (val) {
          ;[this.queryParams.dispatchStartTime, this.queryParams.dispatchEndTime] = val
        } else {
          this.queryParams.dispatchStartTime = ''
          this.queryParams.dispatchEndTime = ''
        }
      },
      /** 获取工单类型选项 */
      async getWorkOrderType() {
        try {
          // 根据当前选中的类型（zf或xs）获取对应的工单类型
          const res = await asyncGetWorkOrderType(this.queryParams.type)
          if (res.data?.length) {
            this.formTypeOptions = res.data.map((item) => ({
              value: item.id,
              label: item.name
            }))
            // 更新工单类型映射
            res.data.forEach((item) => {
              this.formTypeMap[item.id] = item.name
            })
            // 默认选中第一个选项
            if (this.formTypeOptions.length > 0) {
              this.queryParams.formType = this.formTypeOptions[0].value
              // 获取来源表单选项，确保等待其完成
              await this.getFormOptions()
              // 不需要在这里调用 getList，因为 getFormOptions 最后会调用 getList
            }
          } else {
            this.formTypeOptions = []
            this.queryParams.formType = ''
            this.formOptions = []
            this.statusOptions = []
            this.formStatusOptions = []
            this.visitList = []
            this.total = 0
            this.hasFormList = false
            this.emptyText = `当前${
              this.queryParams.type === 'zf' ? '走访' : '巡视'
            }类型下没有可用的工单类型`
          }
        } catch (error) {
          console.error('获取工单类型失败:', error)
          this.formTypeOptions = []
          this.queryParams.formType = ''
          this.hasFormList = false
          this.emptyText = '获取工单类型失败'
        }
      },

      /** 获取来源表单选项 */
      async getFormOptions() {
        if (!this.queryParams.formType) return

        try {
          // 根据工单类型获取来源表单列表
          const res = await asyncGetSourceForm(this.queryParams.formType)
          if (res.data?.formBaseInfoList?.length) {
            // 有可用的来源表单
            this.hasFormList = true
            this.emptyText = '暂无数据'
            this.formOptions = res.data.formBaseInfoList.map((item) => ({
              value: item.id,
              label: item.name
            }))
            // 默认选中第一个选项
            this.queryParams.formId = this.formOptions[0].value

            // 保存结果状态和执行状态选项
            if (res.data.statusDataList) {
              this.statusOptions = res.data.statusDataList.map((item) => ({
                value: item.id,
                label: item.name
              }))
            }
            if (res.data.formStatusList) {
              this.formStatusOptions = res.data.formStatusList.map((item) => ({
                value: item.id,
                label: item.name
              }))
            }

            // 获取表单控件配置
            await this.getFormControls()

            // 确保表单控件配置获取完成后再调用列表
            await this.getList()
          } else {
            // 没有可用的来源表单
            this.hasFormList = false
            this.emptyText = `当前${
              this.queryParams.type === 'zf' ? '走访' : '巡视'
            }类型下没有可用的来源表单`
            this.formOptions = []
            this.queryParams.formId = ''
            this.statusOptions = []
            this.formStatusOptions = []
            this.visitList = []
            this.total = 0
          }
        } catch (error) {
          console.error('获取来源表单失败:', error)
          this.hasFormList = false
          this.emptyText = '获取来源表单失败'
          this.visitList = []
          this.total = 0
        }
      },
      /** 获取表单控件配置 */
      async getFormControls() {
        try {
          if (!this.queryParams.formId) return

          // 显示加载状态
          this.loading = true

          const res = await asyncGetFormControls(this.queryParams.formId)
          if (res.data?.length) {
            // 初始化动态列配置
            this.dynamicColumns = res.data.map((item) => ({
              prop: item.prop,
              label: item.label,
              visible: true // 默认显示所有列
            }))

            // 初始化选中列
            this.selectedColumns = this.dynamicColumns.map((col) => col.prop)

            // 尝试恢复上次的列显示设置
            this.restoreColumnSettings()

            console.log('表单控件配置已更新，formId:', this.queryParams.formId)
          } else {
            // 如果没有获取到控件配置，清空动态列
            this.dynamicColumns = []
            this.selectedColumns = []
            console.warn('未获取到表单控件配置，formId:', this.queryParams.formId)
          }
        } catch (error) {
          console.error('获取表单控件失败:', error)
          this.$message.error('获取表单控件失败')
          // 出错时清空动态列
          this.dynamicColumns = []
          this.selectedColumns = []
        } finally {
          this.loading = false
        }
      },

      /** 显示列设置弹窗 */
      showColumnSettings() {
        this.columnSettingsVisible = true
        // 初始化选中状态
        this.selectedColumns = this.dynamicColumns
          .filter((col) => col.visible)
          .map((col) => col.prop)
      },

      /** 全选列 */
      selectAllColumns() {
        this.selectedColumns = this.dynamicColumns.map((col) => col.prop)
      },

      /** 取消全选列 */
      unselectAllColumns() {
        this.selectedColumns = []
      },

      /** 保存列设置 */
      saveColumnSettings() {
        // 更新列的可见性
        this.dynamicColumns = this.dynamicColumns.map((col) => ({
          ...col,
          visible: this.selectedColumns.includes(col.prop)
        }))

        // 保存设置到本地存储
        this.saveColumnSettingsToStorage()
        this.columnSettingsVisible = false

        // 强制表格重新渲染
        this.$nextTick(() => {
          this.loading = true
          setTimeout(() => {
            this.loading = false
          }, 100)
        })
      },

      /** 保存列设置到本地存储 */
      saveColumnSettingsToStorage() {
        const settings = {
          formId: this.queryParams.formId,
          columns: this.dynamicColumns.map((col) => ({
            prop: col.prop,
            visible: col.visible
          }))
        }
        localStorage.setItem('tableColumnSettings', JSON.stringify(settings))
      },

      /** 从本地存储恢复列设置 */
      restoreColumnSettings() {
        try {
          const settings = JSON.parse(localStorage.getItem('tableColumnSettings'))
          if (settings?.formId === this.queryParams.formId) {
            this.dynamicColumns.forEach((col) => {
              const saved = settings.columns.find((s) => s.prop === col.prop)
              if (saved) {
                col.visible = saved.visible
              }
            })
          }
        } catch (error) {
          console.error('恢复列设置失败:', error)
        }
      },
      /** 获取列宽度 */
      getColumnWidth(prop, label) {
        // 根据字段类型设置宽度
        if (this.isSevenMustVisitField(prop)) {
          return '300' // 七必访字段增加宽度
        } else if (label && label.length > 10) {
          return '200' // 标签文字较长的列增加宽度
        } else {
          return '160' // 默认宽度
        }
      },

      /** 判断是否为图片列 */
      isImageColumn(row, prop) {
        if (!row || !row.formWidgetList || !Array.isArray(row.formWidgetList)) return false

        const widget = row.formWidgetList.find((item) => item.prop === prop)
        if (!widget || !widget.value) return false

        // 尝试解析值，判断是否为图片数组格式
        try {
          const value = typeof widget.value === 'string' ? JSON.parse(widget.value) : widget.value
          return Array.isArray(value) && value.length > 0 && value[0].url
        } catch (error) {
          return false
        }
      },

      /** 获取图片列表 */
      getImageList(row, prop) {
        if (!this.isImageColumn(row, prop)) return []

        const widget = row.formWidgetList.find((item) => item.prop === prop)
        try {
          const value = typeof widget.value === 'string' ? JSON.parse(widget.value) : widget.value
          return Array.isArray(value) ? value : []
        } catch (error) {
          return []
        }
      },

      /** 获取第一张图片的URL - 使用统一处理函数 */
      getFirstImageUrl(row, prop) {
        const imageList = this.getImageList(row, prop)
        if (imageList.length === 0) return ''

        return this.processImageUrl(imageList[0].url)
      },

      /** 统一处理图片URL的函数 */
      processImageUrl(url) {
        if (!url) return ''

        // 如果URL已经是完整的HTTP地址，直接使用，否则拼接baseURL
        let imageUrl = url.startsWith('http') ? url : this.baseURL + url

        // 确保使用HTTPS协议，避免混合内容问题
        if (imageUrl.startsWith('http://')) {
          imageUrl = imageUrl.replace('http://', 'https://')
        }

        return imageUrl
      },

      /** 打开图片预览 - 使用统一处理函数 */
      openImagePreview(row, prop) {
        const imageList = this.getImageList(row, prop)
        if (imageList.length === 0) return

        // 处理图片URL，确保是完整的地址并使用HTTPS
        this.currentImageList = imageList.map((img) => ({
          ...img,
          url: this.processImageUrl(img.url)
        }))

        this.currentImageIndex = 0
        this.imagePreviewVisible = true
      },

      /** 关闭图片预览 */
      closeImagePreview() {
        this.imagePreviewVisible = false
        this.currentImageList = []
        this.currentImageIndex = 0
      },

      /** 上一张图片 */
      prevImage() {
        if (this.currentImageIndex > 0) {
          this.currentImageIndex--
        }
      },

      /** 下一张图片 */
      nextImage() {
        if (this.currentImageIndex < this.currentImageList.length - 1) {
          this.currentImageIndex++
        }
      },

      /** 获取安全的图片URL（HTTPS） */
      getSecureImageUrl(url) {
        return this.processImageUrl(url)
      },

      /** 判断是否为七必访字段 */
      isSevenMustVisitField(prop) {
        if (!prop || !this.visitList.length) return false

        // 遍历所有行找到包含此prop的行
        for (const row of this.visitList) {
          // 确保行数据包含必要的信息
          if (!row.formWidgetList || !Array.isArray(row.formWidgetList)) continue

          // 在formWidgetList中查找匹配的控件
          const widget = row.formWidgetList.find((item) => item.prop === prop)
          if (!widget) continue

          // 1. 通过标签名直接判断
          if (widget.label === '七必访') return true

          // 2. 如果是多选框控件，尝试进一步判断
          if (widget.type === 'm-checkbox') {
            // 尝试从widgetList中获取控件配置
            const widgetConfig = this.getWidgetConfig(row, prop)
            if (widgetConfig) {
              // 判断是否包含典型的七必访选项文本
              const hasSevenMustVisitKeywords = this.hasSevenMustVisitKeywords(widgetConfig)
              if (hasSevenMustVisitKeywords) return true
            }
          }
        }

        return false
      },

      /**
       * 获取七必访字段值对应的文本标签列表 - 重构版本使用通用映射方法
       */
      getSevenMustVisitLabels(row, prop) {
        if (!row || !row.formWidgetList) return []

        // 查找匹配prop的表单控件
        const widget = row.formWidgetList.find((item) => item.prop === prop)
        if (!widget || !widget.value) return []

        // 获取控件选项配置
        const widgetConfig = this.getWidgetConfig(row, prop)
        if (!widgetConfig || !widgetConfig.options || !widgetConfig.options.optionItems) {
          return []
        }

        try {
          // 解析选项值
          let selectedValues = widget.value
          if (typeof selectedValues === 'string') {
            if (selectedValues.startsWith('[') && selectedValues.endsWith(']')) {
              selectedValues = JSON.parse(selectedValues)
            } else {
              selectedValues = selectedValues.split(',').map((v) => Number(v.trim()))
            }
          }

          // 确保是数组
          if (!Array.isArray(selectedValues)) {
            selectedValues = [selectedValues]
          }

          // 创建值到标签的映射
          const optionMap = widgetConfig.options.optionItems.reduce((map, option) => {
            map[option.value] = option.label
            return map
          }, {})

          // 映射每个值到对应的标签，保持原有顺序
          return selectedValues.map((value) => optionMap[value] || `未知选项(${value})`)
        } catch (error) {
          console.error('处理七必访字段值失败:', error, widget.value)
          return []
        }
      },

      /**
       * 从行数据中获取控件配置信息
       */
      getWidgetConfig(row, prop) {
        try {
          // 获取widgetList的字符串并解析
          if (!row.widgetList) return null

          let widgetList
          if (typeof row.widgetList === 'string') {
            widgetList = JSON.parse(row.widgetList)
          } else if (Array.isArray(row.widgetList)) {
            widgetList = row.widgetList
          } else {
            return null
          }

          // 查找匹配prop的控件配置
          return widgetList.find((item) => item.id === prop)
        } catch (error) {
          console.error('获取控件配置失败:', error)
          return null
        }
      },

      /**
       * 判断控件配置是否包含七必访相关关键词
       */
      hasSevenMustVisitKeywords(widgetConfig) {
        if (!widgetConfig || !widgetConfig.options || !widgetConfig.options.optionItems) {
          return false
        }

        // 使用data中定义的关键词列表
        return widgetConfig.options.optionItems.some((option) =>
          this.sevenMustVisitKeywords.some(
            (keyword) => option.label && option.label.includes(keyword)
          )
        )
      },

      /** 获取表单状态类型 */
      getFormStatusType(status) {
        const statusMap = {
          0: 'danger', // 超时未完成
          1: 'info', // 已创建
          2: 'warning', // 进行中
          3: 'success', // 按时完成
          4: 'warning' // 超时完成
        }
        return statusMap[status] || 'info'
      },

      /** 获取表单状态文本 */
      getFormStatusText(status) {
        const statusMap = {
          0: '超时未完成',
          1: '已创建',
          2: '进行中',
          3: '按时完成',
          4: '超时完成'
        }
        return statusMap[status] || '未知状态'
      },
      /** 获取工单类型文本 */
      getFormTypeText(type) {
        return this.formTypeMap[type] || `未知类型(${type})`
      },
      // 添加过滤上传组件的方法
      filterUploadWidgets(formJson) {
        if (!formJson?.widgetList) return formJson

        return {
          ...formJson,
          widgetList: formJson.widgetList.filter((widget) => widget.type !== 'm-picture-upload')
        }
      },

      /** 获取表单控件值 - 优化版本，支持所有类型的选项映射 */
      getFormWidgetValue(row, prop) {
        // 检查行数据是否存在
        if (!row) return '-'

        // 检查formWidgetList是否存在
        if (!row.formWidgetList || !Array.isArray(row.formWidgetList)) return '-'

        // 查找匹配prop的控件
        const widget = row.formWidgetList.find((item) => item.prop === prop)
        if (!widget || widget.value === null || widget.value === undefined) return '-'

        // 获取控件配置信息
        const widgetConfig = this.getWidgetConfig(row, prop)

        // 如果没有找到控件配置或者没有选项配置，直接返回原始值
        if (!widgetConfig || !widgetConfig.options || !widgetConfig.options.optionItems) {
          return widget.value
        }

        // 处理不同类型的控件值映射
        return this.mapWidgetValueToLabel(
          widget.value,
          widgetConfig.options.optionItems,
          widget.type
        )
      },

      /**
       * 将控件值映射为对应的标签文本
       * @param {*} value - 控件的值
       * @param {Array} optionItems - 选项配置数组
       * @param {string} widgetType - 控件类型
       * @returns {string} - 映射后的文本
       */
      mapWidgetValueToLabel(value, optionItems, widgetType) {
        if (!optionItems || !Array.isArray(optionItems)) return value

        // 创建值到标签的映射
        const optionMap = optionItems.reduce((map, option) => {
          map[option.value] = option.label
          return map
        }, {})

        // 根据控件类型处理不同的值格式
        if (widgetType === 'm-checkbox') {
          // 多选框：值可能是数组字符串或数组
          let selectedValues = value

          try {
            if (typeof selectedValues === 'string') {
              if (selectedValues.startsWith('[') && selectedValues.endsWith(']')) {
                selectedValues = JSON.parse(selectedValues)
              } else {
                selectedValues = selectedValues.split(',').map((v) => Number(v.trim()))
              }
            }

            // 确保是数组
            if (!Array.isArray(selectedValues)) {
              selectedValues = [selectedValues]
            }

            // 映射每个值到对应的标签
            const labels = selectedValues.map((val) => optionMap[val] || `未知选项(${val})`)
            return labels.join('、')
          } catch (error) {
            console.error('解析多选框值失败:', error, value)
            return value
          }
        } else if (widgetType === 'm-radio' || widgetType === 'm-select') {
          // 单选框或下拉框：直接映射单个值
          return optionMap[value] || value
        } else {
          // 其他类型控件直接返回原值
          return value
        }
      },

      /** 判断是否为七必访字段 - 优化版本 */
      isSevenMustVisitField(prop) {
        if (!prop || !this.visitList.length) return false

        // 遍历所有行找到包含此prop的行
        for (const row of this.visitList) {
          // 确保行数据包含必要的信息
          if (!row.formWidgetList || !Array.isArray(row.formWidgetList)) continue

          // 在formWidgetList中查找匹配的控件
          const widget = row.formWidgetList.find((item) => item.prop === prop)
          if (!widget) continue

          // 1. 通过标签名直接判断
          if (widget.label === '七必访') return true

          // 2. 如果是多选框控件，尝试进一步判断
          if (widget.type === 'm-checkbox') {
            // 尝试从widgetList中获取控件配置
            const widgetConfig = this.getWidgetConfig(row, prop)
            if (widgetConfig) {
              // 判断是否包含典型的七必访选项文本
              const hasSevenMustVisitKeywords = this.hasSevenMustVisitKeywords(widgetConfig)
              if (hasSevenMustVisitKeywords) return true
            }
          }
        }

        return false
      },

      /**
       * 获取七必访字段的摘要显示
       * 保留此方法以兼容模板中的引用
       */
      getSevenMustVisitSummary(row, prop) {
        const labels = this.getSevenMustVisitLabels(row, prop)
        if (labels.length === 0) return '-'

        if (labels.length <= 2) {
          return labels.join('、')
        } else {
          return `已选择${labels.length}项`
        }
      },

      /** 导出按钮操作 */
      handleExport() {
        if (!this.queryParams.formId) {
          this.$modal.msgError('请先选择来源表单')
          return
        }
        if (this.total === 0) {
          this.$modal.msgError('当前没有数据可供导出')
          return
        }
        this.exportForm.page = 1
        this.exportVisible = true
      },

      /** 确认导出操作 */
      handleConfirmExport() {
        this.$modal.confirm('是否确认导出数据?').then(() => {
          this.exporting = true

          // 构造查询参数，包含所有筛选条件
          const params = {
            type: this.queryParams.type,
            powerId: this.queryParams.powerId,
            dispatchStartTime: this.queryParams.dispatchStartTime,
            dispatchEndTime: this.queryParams.dispatchEndTime,
            formDataId: this.queryParams.formDataId,
            formType: this.queryParams.formType,
            formId: this.queryParams.formId,
            statusDatald: this.queryParams.statusDatald,
            formStatus: this.queryParams.formStatus,
            page: this.exportForm.page,
            pageSize: this.exportForm.pageSize
          }

          // 过滤掉空值参数
          Object.keys(params).forEach((key) => {
            if (params[key] === '' || params[key] === null || params[key] === undefined) {
              delete params[key]
            }
            // 处理数组类型的参数
            if (Array.isArray(params[key]) && params[key].length === 0) {
              delete params[key]
            }
          })

          // 根据查询类型选择不同的导出接口
          const exportUrl =
            this.queryParams.type === 'zf'
              ? '/search/comprehensive/page/export' // 走访导出
              : '/search/comprehensiveXs/page/export' // 巡视导出

          // 修改为 GET 请求，使用对应的导出接口
          exportFile(
            exportUrl,
            params,
            `${this.queryParams.type === 'zf' ? '走访' : '巡视'}数据_第${
              this.exportForm.page
            }页_${new Date().getTime()}.xlsx`,
            {
              method: 'get', // 显式指定使用 GET 方法
              timeout: 300000, // 设置5分钟超时
              params: params, // GET请求参数通过params传递
              responseType: 'blob' // 确保响应类型为blob
            }
          )
            .then(() => {
              this.exporting = false
              this.exportVisible = false
              this.$modal.msgSuccess('导出成功')
            })
            .catch((error) => {
              console.error('导出失败:', error)
              this.exporting = false
              this.$modal.msgError('导出失败')
            })
        })
      },

      /** 处理单次导出数量变化 */
      handlePageSizeChange() {
        this.exportForm.page = 1 // 重置页码选择
      },

      /** 获取页码范围标签 */
      getPageRangeLabel(page) {
        const start = (page - 1) * this.exportForm.pageSize
        const remainingItems = this.total - start
        const itemsInThisPage = Math.min(this.exportForm.pageSize, remainingItems)
        const end = start + itemsInThisPage

        return `第${page}页 (${start + 1}-${end}条)`
      },

      /** 处理供电所选择变化 */
      handlePowerIdChange(value) {
        if (!value) {
          // 当清除选择时
          this.queryParams.powerId = null
          return
        }

        // 查找选中节点的原始ID
        const findOriginalId = (nodes, id) => {
          for (const node of nodes) {
            if (node.id === id) {
              return node.originalId
            }
            if (node.children && node.children.length) {
              const result = findOriginalId(node.children, id)
              if (result) return result
            }
          }
          return null
        }

        // 将唯一ID转换为原始ID
        const originalId = findOriginalId(this.powerSupplyOptions, value)
        if (originalId) {
          this.queryParams.powerId = originalId
          console.log('已将供电所ID转换为原始ID:', originalId)
        } else {
          console.warn('未找到对应的原始ID:', value)
          this.queryParams.powerId = value // 退化处理
        }
      }
    }
  }
</script>

<style scoped>
  /* 添加图片预览相关样式 */
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

  /* 表格中的图片样式 */
  .table-image {
    width: 60px !important;
    height: 60px !important;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.2s;
    object-fit: cover !important; /* 确保图片充满固定容器 */
  }

  /* 图片预览弹窗样式 */
  .image-preview-dialog {
    display: flex;
    flex-direction: column;
  }

  .image-preview-dialog .el-dialog__body {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .image-preview-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(90vh - 150px);
    overflow: hidden;
  }

  /* 修改大图预览容器样式 */
  .image-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    background: #000;
    overflow: hidden;
    max-height: calc(90vh - 300px); /* 限制最大高度 */
  }

  /* 修改预览大图样式，确保完整显示 */
  .preview-main-image {
    max-width: 100%;
    max-height: 100%;
    display: block;
  }

  .preview-main-image img {
    width: auto !important;
    height: auto !important;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain !important; /* 确保图片完整显示 */
  }

  /* 修改缩略图列表样式 */
  .thumbnail-list {
    padding: 10px;
    background: #fff;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    max-height: 120px;
    overflow-y: auto;
  }

  /* 修改缩略图样式，使用固定尺寸且保持比例 */
  .thumbnail-image {
    width: 80px !important;
    height: 80px !important;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s;
    object-fit: cover !important; /* 确保图片充满固定容器 */
  }

  /* 全局样式 */
  .el-image {
    width: 100%;
    height: 100%;
  }

  /* 根据不同场景设置图片展示方式 */
  .el-image.preview-main-image .el-image__inner {
    object-fit: contain !important; /* 预览大图完整显示 */
  }

  .el-image.thumbnail-image .el-image__inner,
  .el-image.table-image .el-image__inner {
    object-fit: cover !important; /* 缩略图和列表图填充固定容器 */
    width: 100% !important;
    height: 100% !important;
  }

  /* 七必访字段样式 - 直接显示版本 */
  .seven-must-visit-cell {
    padding: 5px;
    text-align: left;
    min-width: 280px; /* 设置最小宽度 */
  }

  .seven-must-visit-list-direct {
    max-height: 300px;
    overflow-y: auto;
    padding: 0 5px;
    width: 100%; /* 确保使用完整宽度 */
  }

  .seven-must-visit-item-direct {
    display: flex;
    align-items: flex-start;
    padding: 3px 0;
    font-size: 12px;
    line-height: 1.4;
    margin-bottom: 4px; /* 增加项目间间距 */
    border-bottom: 1px dashed #ebeef5; /* 添加分隔线 */
    padding-bottom: 4px;
  }

  .seven-must-visit-item-direct:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  /* 自定义表格样式 */
  .dynamic-column .cell {
    white-space: normal !important;
    word-break: break-word !important;
  }

  /* 优化表格整体布局 */
  :deep(.el-table) {
    width: 100%;
    table-layout: fixed;
  }

  :deep(.el-table__body) {
    width: 100% !important;
  }

  :deep(.el-table__header) {
    width: 100% !important;
  }

  :deep(.el-table__body td) {
    padding: 8px 0;
  }

  /* 添加导出弹窗相关样式 */
  .text-gray-600 {
    color: #666;
  }
</style>

<style>
  /* 修改所属供电所组件的字体样式 */
  .vue-treeselect__label {
    font-size: 14px !important;
    font-weight: normal !important;
  }

  .vue-treeselect__option--selected .vue-treeselect__label {
    font-weight: normal !important;
  }

  .vue-treeselect__option--highlight .vue-treeselect__label {
    font-weight: normal !important;
  }

  /* 所属供电所独占一行的样式 */
  .w-full {
    width: 100% !important;
  }

  .mb-4 {
    margin-bottom: 1rem !important;
  }

  /* 确保表单项在独占一行时宽度合适 */
  .w-full .el-form-item {
    display: flex;
    width: 100%;
  }

  .w-full .el-form-item__content {
    flex: 1;
  }
</style>
