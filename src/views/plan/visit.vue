<template>
  <!-- 根据planType动态渲染不同的计划组件 -->
  <component :is="currentPlanComponent" />
</template>

<script>
  import DailyInspectionPlan from './plans/DailyInspectionPlan.vue'
  import SpecialInspectionPlan from './plans/SpecialInspectionPlan.vue'
  import DailyVisitPlan from './plans/DailyVisitPlan.vue'
  import SpecialVisitPlan from './plans/SpecialVisitPlan.vue'
  import SelfDailyVisitPlan from './plans/SelfDailyVisitPlan.vue'
  import SelfSpecialVisitPlan from './plans/SelfSpecialVisitPlan.vue'

  export default {
    name: 'PlanVisit',
    components: {
      DailyInspectionPlan,
      SpecialInspectionPlan,
      DailyVisitPlan,
      SpecialVisitPlan,
      SelfDailyVisitPlan,
      SelfSpecialVisitPlan
    },
    computed: {
      currentPlanComponent() {
        switch (this.$route.params.type) {
          case '1':
            return 'DailyInspectionPlan'
          case '2':
            return 'SpecialInspectionPlan'
          case '3':
            return 'DailyVisitPlan'
          case '4':
            return 'SpecialVisitPlan'
          case '5':
            return 'SelfDailyVisitPlan'
          case '6':
            return 'SelfSpecialVisitPlan'
          default:
            return 'DailyInspectionPlan'
        }
      }
    }
  }
</script>
