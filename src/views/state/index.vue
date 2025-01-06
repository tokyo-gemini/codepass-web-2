<template>
  <div class="app-container flex flex-col gap-4">
    <!-- 添加说明面板 -->
    <div class="bg-gray-50 p-4 mb-4 rounded text-sm text-gray-600">
      <div class="flex items-start gap-2">
        <i class="el-icon-info-circle text-blue-500 mt-0.5"></i>
        <div>
          <p class="font-medium mb-2">状态管理说明:</p>
          <ul class="list-disc pl-4 space-y-1">
            <li>可以管理不同类型的状态及其对应选项</li>
            <li>每个状态可以绑定到表单控件的选项上</li>
            <li>支持按名称搜索快速定位特定状态</li>
            <li>可以编辑状态的选项和关联关系</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="bg-white rounded p-4 shadow">
      <div class="text-gray-500 text-xs font-bold my-4">
        新增或管理任意想要的状态,并与每一个表单里的单选组件相关联,最终完成实物ID的状态自动变化处理
      </div>
      <el-table v-loading="loading" :data="stateList">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="状态类" align="center" prop="statusName" width="200" />
        <el-table-column label="状态项" align="center">
          <template slot-scope="scope">
            <div class="flex flex-wrap gap-2">
              <el-tag v-for="item in scope.row.statusDataList" :key="item.statusDataId"
                :type="getTagType(item.statusValue)">
                {{ item.statusDataName }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="handleUpdate(scope.row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import { asyncGetStateList } from "@/api/state";
import { getTagType } from './utils'
export default {
  name: "StateIndex",
  data() {
    return {
      loading: true,
      total: 0,
      stateList: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
      }
    };
  },
  created() {
    this.getList();
  },
  methods: {
    getTagType,
    getList() {
      this.loading = true;
      asyncGetStateList(this.queryParams).then(response => {
        this.stateList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    handleUpdate(row) {
      const routeUrl = `/state/edits/${row.statusTypeId}`;
      this.$tab.openPage("编辑状态", routeUrl);
    },
  }
};
</script>
