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
        this.formData.towerUserList = []
        this.formData.customs = data.customs || []
      },
      handleReset() {
        this.formData = {
          towerUserList: [],
          customs: []
        }
        this.uploadFile = null
      },
      handleBeforeSubmit(formData) {
        if (this.uploadFile) {
          formData.append('file', this.uploadFile)
        }
      },
      handleFileChange(file) {
        this.uploadFile = file
      }
    }
  }
</script>
