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
import { getTagType } from './index'
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
