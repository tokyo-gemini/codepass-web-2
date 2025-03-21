<template>
  <div class="custom-tree-select">
    <!-- 选择框区域 -->
    <div
      class="select-trigger"
      :class="{ 'is-active': isOpen }"
      @click="toggleDropdown"
      ref="selectTrigger"
    >
      <div class="selected-content" v-if="selectedNodes.length">
        <!-- 简洁模式：只显示数量 -->
        <div v-if="!showDetail" class="selected-summary">
          已选择 {{ selectedNodes.length }} 项
          <el-button type="text" size="mini" @click.stop="showDetail = true"> 详情 </el-button>
        </div>
        <!-- 详细模式：显示标签 -->
        <div v-else class="selected-tags">
          <div class="tags-header">
            <span>已选择 {{ selectedNodes.length }} 项</span>
            <el-button type="text" size="mini" @click.stop="showDetail = false"> 收起 </el-button>
          </div>
          <div class="tags-content">
            <el-tag
              v-for="node in selectedNodes"
              :key="node.id"
              size="small"
              closable
              @close.stop="handleRemoveTag(node)"
            >
              {{ node.label }}
            </el-tag>
          </div>
        </div>
      </div>
      <span v-else class="placeholder">{{ placeholder }}</span>
      <i class="el-icon-arrow-down select-arrow" :class="{ 'is-reverse': isOpen }"></i>
    </div>

    <!-- 下拉面板 -->
    <div v-show="isOpen" class="select-dropdown" ref="dropdown">
      <div class="dropdown-header">
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            size="small"
            placeholder="搜索关键字"
            prefix-icon="el-icon-search"
            clearable
          ></el-input>
        </div>
        <div class="selection-summary">
          已选择: {{ selectedNodes.length }} 项
          <el-button v-if="selectedNodes.length" type="text" size="mini" @click="clearSelection">
            清空
          </el-button>
        </div>
      </div>

      <el-tree
        ref="tree"
        :data="treeData"
        :props="{ children: 'children', label: 'label' }"
        :show-checkbox="multiple"
        :check-strictly="checkStrictly"
        :default-checked-keys="selectedKeys"
        node-key="id"
        @check="handleCheck"
        :filter-node-method="filterNode"
        highlight-current
      >
        <template #default="{ node, data }">
          <span class="custom-tree-node" :class="{ 'is-disabled': !isNodeSelectable(data) }">
            {{ node.label }}
          </span>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'CustomTreeSelect',
    props: {
      value: {
        type: Array,
        default: () => []
      },
      options: {
        type: Array,
        default: () => []
      },
      multiple: {
        type: Boolean,
        default: true
      },
      placeholder: {
        type: String,
        default: '请选择'
      },
      checkStrictly: {
        type: Boolean,
        default: false
      },
      // 用户部门ID，用于判断可选节点
      userDeptId: {
        type: [String, Number],
        default: ''
      },
      // 用户部门ID长度，用于判断用户类型
      userDeptIdLength: {
        type: Number,
        default: 0
      }
    },
    data() {
      return {
        isOpen: false,
        selectedNodes: [],
        treeData: [],
        searchQuery: '',
        showDetail: false // 新增：控制是否显示详细标签
      }
    },
    computed: {
      selectedKeys() {
        return this.selectedNodes.map((node) => node.id)
      },
      displayTags() {
        return this.selectedNodes.slice(0, 3)
      }
    },
    watch: {
      value: {
        handler(val) {
          this.initSelection()
        },
        immediate: true
      },
      options: {
        handler(val) {
          // 创建一个新的深拷贝方法，避免循环引用
          const deepClone = (obj) => {
            if (obj === null || typeof obj !== 'object') return obj
            const copy = Array.isArray(obj) ? [] : {}
            for (let key in obj) {
              // 跳过 parent 属性，避免循环引用
              if (key === 'parent') continue
              copy[key] = deepClone(obj[key])
            }
            return copy
          }

          this.treeData = deepClone(val)

          // 重新建立 parent 引用
          const addParentRef = (nodes, parent = null) => {
            return nodes.map((node) => {
              node.parent = parent
              if (node.children && node.children.length) {
                node.children = addParentRef(node.children, node)
              }
              return node
            })
          }

          this.treeData = addParentRef(this.treeData)
        },
        immediate: true
      },
      searchQuery(val) {
        this.$refs.tree?.filter(val)
      }
    },
    created() {
      this.initSelection()
      // 添加点击外部关闭事件
      document.addEventListener('click', this.handleClickOutside)
    },
    beforeDestroy() {
      document.removeEventListener('click', this.handleClickOutside)
    },
    methods: {
      toggleDropdown() {
        this.isOpen = !this.isOpen
        if (this.isOpen) {
          // 添加下拉框定位逻辑
          this.$nextTick(() => {
            const trigger = this.$refs.selectTrigger
            const dropdown = this.$refs.dropdown
            if (trigger && dropdown) {
              const rect = trigger.getBoundingClientRect()
              dropdown.style.width = rect.width + 'px'
              dropdown.style.left = rect.left + 'px'

              // 判断下方空间是否足够
              const bottomSpace = window.innerHeight - rect.bottom
              if (bottomSpace < 300 && rect.top > 300) {
                // 如果下方空间不足且上方空间足够，向上展开
                dropdown.style.top = rect.top - dropdown.offsetHeight - 4 + 'px'
              } else {
                // 向下展开
                dropdown.style.top = rect.bottom + 4 + 'px'
              }
            }
          })
        }
      },
      handleClickOutside(e) {
        const trigger = this.$refs.selectTrigger
        const dropdown = this.$refs.dropdown
        if (
          this.isOpen &&
          trigger &&
          dropdown &&
          !trigger.contains(e.target) &&
          !dropdown.contains(e.target)
        ) {
          this.isOpen = false
        }
      },
      initSelection() {
        if (this.value && this.value.length) {
          this.selectedNodes = this.value
            .map((id) => this.findNodeById(this.treeData, id))
            .filter(Boolean)
        } else {
          this.selectedNodes = []
        }
      },
      findNodeById(nodes, id) {
        for (const node of nodes) {
          if (node.id === id) return node
          if (node.children) {
            const found = this.findNodeById(node.children, id)
            if (found) return found
          }
        }
        return null
      },
      handleCheck(data, { checkedNodes }) {
        // 过滤掉不可选的节点，并且只返回必要的数据
        this.selectedNodes = checkedNodes
          .filter((node) => this.isNodeSelectable(node))
          .map((node) => ({
            id: node.id,
            label: node.label
          }))

        this.$emit(
          'input',
          this.selectedNodes.map((node) => node.id)
        )
        this.$emit('change', this.selectedNodes)
      },
      handleRemoveTag(node) {
        const index = this.selectedNodes.findIndex((n) => n.id === node.id)
        if (index > -1) {
          this.selectedNodes.splice(index, 1)
          this.$refs.tree.setCheckedKeys(this.selectedNodes.map((n) => n.id))
          this.$emit(
            'input',
            this.selectedNodes.map((n) => n.id)
          )
          this.$emit('change', this.selectedNodes)
        }
      },
      filterNode(value, data) {
        if (!value) return true
        return data.label.toLowerCase().includes(value.toLowerCase())
      },
      isNodeSelectable(node) {
        // 7位数用户不能选择任何节点
        if (this.userDeptIdLength === 7) {
          return false
        }

        // 5位数用户只能选择其直接子节点(7位数节点)
        if (this.userDeptIdLength === 5) {
          const nodeId = node.id?.toString() || ''
          const userDeptId = this.userDeptId?.toString() || ''
          return nodeId.startsWith(userDeptId) && nodeId.length === 7
        }

        // 其他用户使用原有的三级节点判断逻辑
        let level = 1
        let parent = node.parent
        while (parent) {
          level++
          parent = parent.parent
        }
        return level === 3
      },
      clearSelection() {
        this.selectedNodes = []
        this.$refs.tree.setCheckedKeys([])
        this.$emit('input', [])
        this.$emit('change', [])
      }
    }
  }
</script>

<style lang="scss" scoped>
  .custom-tree-select {
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
    }

    .selected-content {
      flex: 1;
      min-height: 32px;
      margin-right: 8px;
    }

    .selected-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #606266;
    }

    .selected-tags {
      .tags-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        color: #606266;
      }

      .tags-content {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        max-height: 80px;
        overflow-y: auto;
        padding: 4px 0;

        &::-webkit-scrollbar {
          width: 6px;
        }

        &::-webkit-scrollbar-thumb {
          background: #c0c4cc;
          border-radius: 3px;
        }
      }
    }

    .placeholder {
      color: #909399;
    }

    .select-arrow {
      transition: transform 0.3s;
      &.is-reverse {
        transform: rotate(180deg);
      }
    }

    .select-dropdown {
      position: fixed; // 修改为 fixed 定位
      min-width: 300px; // 添加最小宽度
      max-height: 300px;
      margin-top: 4px;
      background: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      z-index: 9999; // 提高 z-index
      overflow: auto; // 添加滚动条

      .dropdown-header {
        padding: 8px;
        border-bottom: 1px solid #e4e7ed;

        .selection-summary {
          margin-top: 8px;
          font-size: 12px;
          color: #606266;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      }

      .search-box {
        padding: 8px;
        border-bottom: 1px solid #e4e7ed;
      }

      .el-tree {
        padding: 8px;
      }
    }

    .custom-tree-node {
      &.is-disabled {
        color: #c0c4cc;
        cursor: not-allowed;
      }
    }
  }
</style>
