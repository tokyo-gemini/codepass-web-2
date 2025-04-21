<template>
  <base-plan
    :plan-type="'5'"
    ref="basePlan"
    @plan-data-loaded="handlePlanDataLoaded"
    @reset="handleReset"
    @before-submit="handleBeforeSubmit"
  >
    <template #plan-content>
      <div class="rounded bg-white shadow w-full p-4">
        <self-report-template
          v-model="formData.towerUserList"
          :plan-type="'5'"
          :customs-list="formData.customs"
          @file-change="handleFileChange"
        />
      </div>
    </template>
  </base-plan>
</template>

<script>
  import BasePlan from '../components/BasePlan.vue'
  import SelfReportTemplate from '../components/SelfReportTemplate.vue'

  export default {
    // 自主填报日常走访计划
    name: 'SelfDailyVisitPlan',
    components: {
      BasePlan,
      SelfReportTemplate
    },
    data() {
      return {
        formData: {
          towerUserList: [],
          customs: []
        },
        uploadFile: null
      }
    },
    methods: {
      handlePlanDataLoaded(data) {
        // 自主填报计划的数据加载处理
        this.formData.customs = data.customs || []
      },
      handleReset() {
        this.formData = {
          towerUserList: [],
          customs: []
        }
        this.uploadFile = null
        // 调用子组件的重置方法
        this.$refs.selfReportTemplate?.handleFileRemove()
      },
      async handleBeforeSubmit(formData) {
        // 校验：必须上传文件
        if (!this.uploadFile && this.$route.params.id === undefined) {
          this.$message.warning('请上传自主填报模板文件')
          return false
        }

        const dtoBlob = formData.get('dto')
        const submitData = JSON.parse(await dtoBlob.text())

        // 修改这里：将数据放入 customs 字段
        submitData.customs = this.formData.towerUserList || []
        // 添加 isSelectAll 字段，固定为 0
        submitData.isSelectAll = 0

        // 更新formData中的dto
        formData.set(
          'dto',
          new Blob([JSON.stringify(submitData)], {
            type: 'application/json'
          })
        )

        // 清除可能存在的旧文件引用
        if (formData.has('file')) {
          formData.delete('file')
        }

        // 添加文件到formData
        if (this.uploadFile) {
          formData.append('file', this.uploadFile)
        }

        return true
      },
      handleFileChange(file) {
        this.uploadFile = file
        // 同步自动清空已选列表
        this.formData.towerUserList = []
      }
    }
  }
</script>
