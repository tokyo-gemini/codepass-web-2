<template>
  <div class="dept-treeselect">
    <div
      class="select-trigger"
      :class="{ 'is-active': visible }"
      @click="toggleDropdown"
      ref="selectTrigger"
    >
      <div class="selected-label" v-if="selectedNode">
        {{ selectedNode.label }}
      </div>
      <div class="placeholder" v-else>{{ placeholder }}</div>
      <i class="el-icon-arrow-down" :class="{ 'is-reverse': visible }"></i>
    </div>

    <div v-show="visible" class="select-dropdown" ref="dropdown">
      <div class="search-wrapper">
        <el-input
          v-model="filterText"
          size="small"
          prefix-icon="el-icon-search"
          placeholder="请输入关键字搜索"
          clearable
        />
      </div>
      <el-tree
        ref="tree"
        :data="options"
        :props="defaultProps"
        :filter-node-method="filterNode"
        :highlight-current="true"
        node-key="id"
        default-expand-level="2"
        @node-click="handleNodeClick"
      >
        <span class="custom-tree-node" slot-scope="{ node, data }">
          <span :class="{ 'selectable-node': !data.children }">{{ node.label }}</span>
        </span>
      </el-tree>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'DeptTreeselect',
    props: {
      value: [String, Number],
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
        visible: false,
        filterText: '',
        selectedNode: null,
        defaultProps: {
          children: 'children',
          label: 'label'
        }
      }
    },
    watch: {
      value: {
        handler(val) {
          if (val) {
            this.findAndSetSelectedNode(this.options, val)
          } else {
            this.selectedNode = null
          }
        },
        immediate: true
      },
      filterText(val) {
        this.$refs.tree?.filter(val)
      }
    },
    mounted() {
      document.addEventListener('click', this.handleClickOutside)
    },
    beforeDestroy() {
      document.removeEventListener('click', this.handleClickOutside)
    },
    methods: {
      toggleDropdown() {
        this.visible = !this.visible
        if (this.visible) {
          this.$nextTick(this.updateDropdownPosition)
        }
      },
      updateDropdownPosition() {
        const trigger = this.$refs.selectTrigger
        const dropdown = this.$refs.dropdown
        if (!trigger || !dropdown) return

        const rect = trigger.getBoundingClientRect()
        const dropdownHeight = Math.min(dropdown.scrollHeight, 400)

        dropdown.style.width = rect.width + 'px'
        dropdown.style.left = rect.left + 'px'

        // 判断下方空间是否足够
        const bottomSpace = window.innerHeight - rect.bottom
        if (bottomSpace < dropdownHeight && rect.top > dropdownHeight) {
          dropdown.style.top = rect.top - dropdownHeight + 'px'
        } else {
          dropdown.style.top = rect.bottom + 2 + 'px'
        }
      },
      handleClickOutside(e) {
        if (this.visible && !this.$el.contains(e.target)) {
          this.visible = false
        }
      },
      filterNode(value, data) {
        if (!value) return true
        return data.label.toLowerCase().indexOf(value.toLowerCase()) !== -1
      },
      isLeafNode(data) {
        return !data.children || !data.children.length
      },
      handleNodeClick(data) {
        // 只允许选择叶子节点
        if (!this.isLeafNode(data)) {
          return
        }
        this.selectedNode = {
          id: data.id,
          label: data.label
        }
        this.$emit('input', data.id)
        this.$emit('change', data)
        this.visible = false
      },
      findAndSetSelectedNode(nodes, id) {
        for (const node of nodes) {
          if (node.id === id) {
            this.selectedNode = {
              id: node.id,
              label: node.label
            }
            return true
          }
          if (node.children) {
            if (this.findAndSetSelectedNode(node.children, id)) {
              return true
            }
          }
        }
        return false
      }
    }
  }
</script>

<style lang="scss" scoped>
  .dept-treeselect {
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

    .selected-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .placeholder {
      color: #909399;
    }

    .el-icon-arrow-down {
      font-size: 14px;
      transition: transform 0.3s;
      &.is-reverse {
        transform: rotate(180deg);
      }
    }

    .select-dropdown {
      position: fixed;
      z-index: 2000;
      background: #fff;
      max-height: 400px;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

      .search-wrapper {
        padding: 8px;
        border-bottom: 1px solid #ebeef5;
      }

      .el-tree {
        padding: 4px 0;
        max-height: 350px;
        overflow-y: auto;
      }
    }

    .custom-tree-node {
      .selectable-node {
        color: #409eff;
        font-weight: 500;
        cursor: pointer;
      }

      :not(.selectable-node) {
        color: #606266;
        cursor: default;
      }
    }
  }
</style>
