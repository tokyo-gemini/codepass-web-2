<template>
  <base-plan
    :plan-type="'6'"
    ref="basePlan"
    @plan-data-loaded="handlePlanDataLoaded"
    @reset="handleReset"
    @before-submit="handleBeforeSubmit"
  >
    <template #plan-content>
      <div class="rounded bg-white shadow w-full p-4">
        <self-report-template
          v-model="formData.towerUserList"
          :plan-type="'6'"
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
    // 自主填报专项走访计划
    name: 'SelfSpecialVisitPlan',
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
        // 调用子组件的重置方法（如果存在）
        this.$refs.selfReportTemplate?.handleFileRemove()
      },
      async handleBeforeSubmit(formData) {
        // 校验：必须上传文件
        if (!this.uploadFile && this.$route.params.id === undefined) {
          // 仅在新增时强制要求上传文件
          this.$message.warning('请上传自主填报模板文件')
          return false
        }

        // 从formData中获取dto字段 (由BasePlan准备的基础数据)
        const dtoBlob = formData.get('dto')
        const submitData = JSON.parse(await dtoBlob.text())

        // 添加特定字段 (towerUserList 实际上由后端通过文件解析，前端不需要传)
        // submitData.towerUserList = this.formData.towerUserList; // 不需要传递

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
      }
    }
  }
</script>
