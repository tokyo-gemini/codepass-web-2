<template>
  <div class="app-container flex flex-col gap-4">
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
        <el-table-column label="创建时间" align="center" prop="createTime" width="180">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d}') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
        @pagination="getList" />
    </div>
  </div>
</template>

<script>
import { getStateList } from "@/api/state";

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
    getList() {
      this.loading = true;
      getStateList(this.queryParams).then(response => {
        this.stateList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    getTagType(value) {
      const types = ['', 'success', 'warning', 'danger', 'info'];
      return types[value] || '';
    },
    handleUpdate(row) {
      const routeUrl = `/state/edits/${row.statusTypeId}`;
      this.$tab.openPage("编辑状态", routeUrl);
    },
  }
};
</script>
