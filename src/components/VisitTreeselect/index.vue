<template>
  <div class="visit-treeselect">
    <!-- 选择框触发区域 -->
    <div
      class="select-trigger"
      :class="{ 'is-active': isOpen }"
      @click="toggleDropdown"
      ref="selectTrigger"
    >
      <div class="selected-tags" v-if="selectedNodes.length">
        <span class="selected-value">{{ selectedNodes[0].label }}</span>
      </div>
      <span v-else class="placeholder">{{ placeholder }}</span>
      <i class="el-icon-arrow-down" :class="{ 'is-reverse': isOpen }"></i>
    </div>

    <!-- 下拉面板 -->
    <div v-show="isOpen" class="dropdown-panel" ref="dropdown">
      <!-- 搜索框 -->
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder="请输入关键字搜索"
          prefix-icon="el-icon-search"
          clearable
        />
      </div>

      <!-- 选中计数 -->
      <div class="selection-info">
        已选择: {{ selectedNodes.length }} 项
        <el-button v-if="selectedNodes.length" type="text" @click="clearSelection">
          清空
        </el-button>
      </div>

      <!-- 树形选择 -->
      <el-tree
        ref="tree"
        :data="treeData"
        :show-checkbox="false"
        node-key="id"
        :props="defaultProps"
        :filter-node-method="filterNode"
        :highlight-current="true"
        :expand-on-click-node="false"
        :default-expand-keys="expandedKeys"
        @node-click="handleNodeClick"
      >
        <template #default="{ node, data }">
          <span
            class="custom-node"
            :class="{
              'is-selectable': isSelectableNode(data),
              'is-selected': selectedIds.includes(data.id)
            }"
          >
            {{ node.label }}
            <span v-if="!isSelectableNode(data) && data.selectableCount > 0" class="node-count">
              ({{ data.selectableCount }})
            </span>
          </span>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'VisitTreeselect',
    props: {
      value: {
        type: Array,
        default: () => []
      },
      options: {
        type: Array,
        default: () => []
      },
      placeholder: {
        type: String,
        default: '请选择'
      }
    },
    data() {
      return {
        isOpen: false,
        searchKeyword: '',
        selectedNodes: [],
        defaultProps: {
          children: 'children',
          label: 'label'
        },
        treeData: [],
        expandedKeys: [] // 添加展开节点的数组
      }
    },
    computed: {
      displayNodes() {
        return this.selectedNodes.slice(0, 3)
      },
      selectedIds() {
        return this.selectedNodes.map((node) => node.id)
      }
    },
    watch: {
      options: {
        handler(val) {
          this.initTreeData(val)
        },
        immediate: true
      },
      value: {
        handler() {
          this.initSelection()
        },
        immediate: true
      },
      searchKeyword(val) {
        this.$refs.tree?.filter(val)
      }
    },
    created() {
      document.addEventListener('click', this.handleClickOutside)
    },
    beforeDestroy() {
      document.removeEventListener('click', this.handleClickOutside)
    },
    methods: {
      initTreeData(data) {
        // 深度遍历设置节点层级并计算可选节点数量
        const processNode = (nodes, level = 1) => {
          return nodes.map((node) => {
            node.level = level
            node.selectableCount = 0

            if (node.children?.length) {
              node.children = processNode(node.children, level + 1)

              // 计算子节点中的可选节点数量
              if (level === 5 && node.children.length === 0) {
                // 如果是第5层且是叶子节点（人员节点），直接判断本节点
                node.selectableCount = 1
              } else {
                // 汇总所有子节点的可选节点数量
                node.selectableCount = node.children.reduce(
                  (sum, child) => sum + (child.selectableCount || 0),
                  0
                )
              }

              // 如果有可选节点，添加到默认展开列表
              if (node.selectableCount > 0) {
                this.expandedKeys.push(node.id)
              }
            } else if (level === 5) {
              // 叶子节点且在第5层（人员节点）
              node.selectableCount = 1
            }

            return node
          })
        }

        this.expandedKeys = [] // 重置展开键
        let processedData = JSON.parse(JSON.stringify(data))
        this.treeData = processNode(processedData)
      },
      initSelection() {
        if (!this.value?.length) {
          this.selectedNodes = []
          return
        }

        // 从树中查找选中的节点
        const findNodes = (ids) => {
          const nodes = []
          const traverse = (treeData) => {
            treeData.forEach((node) => {
              // 将 id 转换为字符串进行比较，确保能够匹配数字和字符串类型的 ID
              const nodeId = String(node.id)
              if (ids.some((id) => String(id) === nodeId)) {
                nodes.push({
                  id: node.id,
                  label: node.label
                })
                console.log('找到匹配的节点:', node.id, node.label)
              }
              if (node.children?.length) {
                traverse(node.children)
              }
            })
          }
          traverse(this.treeData)

          // 如果没有找到匹配的节点，但有 ID 值，记录日志
          if (nodes.length === 0 && ids.length > 0) {
            console.warn('未找到匹配的节点，传入的 ID:', ids)
            console.log('当前树形数据:', this.treeData)
          }

          return nodes
        }

        this.selectedNodes = findNodes(this.value)
      },
      isSelectableNode() {
        // 对于供电所选择，所有节点都可选
        return true
      },
      isLeafNode(node) {
        return !node.children || !node.children.length
      },
      toggleDropdown() {
        this.isOpen = !this.isOpen
        if (this.isOpen) {
          this.$nextTick(this.updateDropdownPosition)
        }
      },
      updateDropdownPosition() {
        const trigger = this.$refs.selectTrigger
        const dropdown = this.$refs.dropdown
        if (!trigger || !dropdown) return

        const triggerRect = trigger.getBoundingClientRect()
        const dropdownHeight = dropdown.offsetHeight

        dropdown.style.width = `${triggerRect.width}px`
        dropdown.style.left = `${triggerRect.left}px`

        // 判断下方空间是否足够
        const bottomSpace = window.innerHeight - triggerRect.bottom
        if (bottomSpace < dropdownHeight && triggerRect.top > dropdownHeight) {
          // 向上展开
          dropdown.style.top = `${triggerRect.top - dropdownHeight}px`
        } else {
          // 向下展开
          dropdown.style.top = `${triggerRect.bottom + 5}px`
        }
      },
      handleClickOutside(e) {
        if (
          this.isOpen &&
          this.$refs.selectTrigger &&
          !this.$refs.selectTrigger.contains(e.target) &&
          this.$refs.dropdown &&
          !this.$refs.dropdown.contains(e.target)
        ) {
          this.isOpen = false
        }
      },
      filterNode(value, data) {
        if (!value) return true
        return data.label.toLowerCase().includes(value.toLowerCase())
      },
      handleNodeClick(data) {
        if (this.isSelectableNode(data)) {
          // 如果当前节点已选中，则取消选中
          if (this.selectedNodes.some((node) => node.id === data.id)) {
            this.selectedNodes = []
            // 发出全部数据
            this.$emit('input', [])
            this.$emit('change', [])
          } else {
            // 否则选中当前节点，并包含完整信息
            const selectedNode = {
              id: data.id,
              label: data.label
            }
            this.selectedNodes = [selectedNode]

            // 发出包含id和label的数据
            this.$emit('input', [data.id])
            this.$emit('change', [selectedNode]) // 注意这里传递的是包含完整信息的数组
          }

          this.isOpen = false // 选中后关闭下拉框
        }
      },
      removeNode(node) {
        const index = this.selectedNodes.findIndex((n) => n.id === node.id)
        if (index > -1) {
          this.selectedNodes.splice(index, 1)
          this.$refs.tree?.setCheckedKeys(this.selectedNodes.map((n) => n.id))
          this.$emit(
            'input',
            this.selectedNodes.map((n) => n.id)
          )
          this.$emit('change', this.selectedNodes)
        }
      },
      clearSelection() {
        this.selectedNodes = []
        this.$refs.tree?.setCheckedKeys([])
        this.$emit('input', [])
        this.$emit('change', [])
      }
    }
  }
</script>

<style lang="scss" scoped>
  .visit-treeselect {
    position: relative;
    width: 100%;

    .select-trigger {
      min-height: 32px;
      padding: 0 8px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background-color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;

      &:hover {
        border-color: #c0c4cc;
      }

      &.is-active {
        border-color: #409eff;
      }

      .selected-tags {
        flex: 1;
        display: flex;
        align-items: center;

        .selected-value {
          font-size: 14px;
          color: #606266;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .placeholder {
        color: #909399;
      }

      .el-icon-arrow-down {
        transition: transform 0.3s;
        &.is-reverse {
          transform: rotate(180deg);
        }
      }
    }

    .dropdown-panel {
      position: fixed;
      min-width: 200px;
      max-height: 400px;
      background: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      z-index: 2000;

      .search-box {
        padding: 8px;
        border-bottom: 1px solid #ebeef5;
      }

      .selection-info {
        padding: 8px;
        font-size: 12px;
        color: #606266;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #ebeef5;
      }

      .el-tree {
        padding: 5px 0;
        max-height: 300px;
        overflow-y: auto;
      }

      .custom-node {
        color: #606266;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;

        &:hover {
          background-color: #f5f7fa;
        }

        &.is-selectable {
          font-weight: 500;

          &:hover {
            background-color: #ecf5ff;
          }
        }

        &.is-selected {
          color: #409eff;
          background-color: #ecf5ff;
        }

        .node-count {
          margin-left: 4px;
          font-size: 12px;
          color: #409eff;
          font-weight: normal;
        }
      }
    }
  }
</style>
