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
        <!-- 3个及以下显示所有标签 -->
        <div v-if="selectedNodes.length <= 3" class="selected-tags-simple">
          <el-tag
            v-for="node in selectedNodes"
            :key="node.id"
            size="small"
            closable
            @close.stop="handleRemoveTag(node)"
            class="tag-item"
          >
            {{ node.label }}
          </el-tag>
        </div>
        <!-- 超过3个时显示简洁模式 -->
        <div v-else-if="!showDetail" class="selected-summary">
          <div class="tags-preview">
            <el-tag
              v-for="node in displayTags"
              :key="node.id"
              size="small"
              closable
              @close.stop="handleRemoveTag(node)"
              class="tag-item"
            >
              {{ node.label }}
            </el-tag>
            <span class="more-tag">+{{ selectedNodes.length - displayTags.length }}</span>
          </div>
          <el-button type="text" size="mini" @click.stop="showDetail = true"> 详情 </el-button>
        </div>
        <!-- 详细模式：显示所有标签 -->
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
              class="tag-item"
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
        // 同时支持数组和单值(数字或字符串)
        type: [Array, Number, String],
        default: () => []
      },
      options: {
        type: Array,
        default: () => []
      },
      multiple: {
        type: Boolean,
        default: true // 保持默认值为true，这样可以显示复选框
      },
      singleSelect: {
        type: Boolean,
        default: false // 添加新属性控制是否强制单选
      },
      placeholder: {
        type: String,
        default: '请选择'
      },
      checkStrictly: {
        type: Boolean,
        default: true // 修改默认值为true，使父子节点选择不关联
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
        // 只显示前3个标签
        return this.selectedNodes.slice(0, 3)
      }
    },
    watch: {
      value: {
        handler(val) {
          console.log('🔍 [TreeSelect] value watch 触发, val:', val)
          this.initSelection()

          // 确保树组件的选中状态同步
          this.$nextTick(() => {
            if (this.$refs.tree) {
              const keys = this.selectedNodes.map((node) => node.id)
              console.log('🔍 设置树选中状态, keys:', keys)
              this.$refs.tree.setCheckedKeys(keys)
            }
          })
        },
        immediate: true
      },
      options: {
        handler(val) {
          console.log('🔍 [TreeSelect] options watch 触发')
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

          // 当选项数据更新后，重新初始化选择状态
          this.$nextTick(() => {
            this.initSelection()
          })
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
        console.log('🔍 [TreeSelect] initSelection 被调用')
        console.log('🔍 当前 value:', this.value)
        console.log('🔍 当前 treeData:', this.treeData)

        // 处理单值和数组两种情况
        if (this.value !== null && this.value !== undefined && this.value !== '') {
          // 将单个值转换为数组处理
          const valueArray = Array.isArray(this.value) ? this.value : [this.value]
          console.log('🔍 valueArray:', valueArray)

          this.selectedNodes = valueArray
            .map((id) => this.findNodeById(this.treeData, id))
            .filter(Boolean)

          console.log('🔍 找到的selectedNodes:', this.selectedNodes)

          // 如果启用了单选模式，并且有多个选中项，则只保留第一个
          if (this.singleSelect && this.selectedNodes.length > 1) {
            this.selectedNodes = this.selectedNodes.slice(0, 1)
          }
        } else {
          this.selectedNodes = []
        }

        console.log('🔍 最终selectedNodes:', this.selectedNodes)
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
      handleCheck(data, { checkedNodes, checkedKeys }) {
        // 实现单选逻辑
        if (this.singleSelect && checkedNodes.length > 0) {
          // 如果启用单选模式，只保留当前选中的节点
          const currentNode = data
          // 如果当前节点不可选，不进行任何操作
          if (!this.isNodeSelectable(currentNode)) {
            // 恢复到之前的选择状态
            if (this.selectedNodes.length > 0) {
              this.$refs.tree.setCheckedKeys([this.selectedNodes[0].id])
            } else {
              this.$refs.tree.setCheckedKeys([])
            }
            return
          }

          // 清空之前的选择
          this.$refs.tree.setCheckedKeys([])
          // 只选择当前节点
          this.$refs.tree.setCheckedKeys([currentNode.id])

          // 更新选中节点数组
          this.selectedNodes = [
            {
              id: currentNode.id,
              label: currentNode.label
            }
          ]

          // 发出事件时，确保返回单个值（非数组）
          this.$emit('input', currentNode.id)
          this.$emit('change', this.selectedNodes)
        } else {
          // 多选模式维持原有逻辑，但确保输出是数组
          this.selectedNodes = checkedNodes
            .filter((node) => this.isNodeSelectable(node))
            .map((node) => ({
              id: node.id,
              label: node.label
            }))

          // 发出事件 - 如果是多选模式则返回数组
          this.$emit(
            'input',
            this.selectedNodes.map((node) => node.id)
          )
          this.$emit('change', this.selectedNodes)
        }
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
        // 简化为只判断三级节点
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

        // 根据单选/多选模式决定清空后的输出类型
        if (this.singleSelect) {
          this.$emit('input', null)
        } else {
          this.$emit('input', [])
        }
        this.$emit('change', [])
      }
    }
  }
</script>

<style lang="scss" scoped>
  .custom-tree-select {
    position: relative;
    width: 100%;
    min-width: 200px;

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
      display: flex;
      align-items: center;
    }

    .selected-tags-simple {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 4px 0;
    }

    .selected-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #606266;
      width: 100%;
    }

    .tags-preview {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      overflow: hidden;
    }

    .more-tag {
      color: #909399;
      font-size: 12px;
      margin-left: 4px;
    }

    .tag-item {
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
      min-width: 600px; // 修改下拉框的最小宽度，保持与选择器宽度一致
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
