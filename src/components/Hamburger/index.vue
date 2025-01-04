<template>
  <div style="padding: 0 15px;" @click="toggleClick">
    <i :class="!isActive ? 'el-icon-s-unfold' : 'el-icon-s-fold'" class="hamburger" />
  </div>
</template>

<script>
export default {
  name: 'Hamburger',
  props: {
    isActive: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    toggleClick() {
      this.$emit('toggleClick')
    }
  }
}
</script>

<style scoped>
.hamburger {
  display: inline-block;
  vertical-align: middle;
  font-size: 20px;
  color: #fff;
}

.hamburger.is-active {
  transform: rotate(180deg);
}
</style>
