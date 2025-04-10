<template>
  <el-drawer
    size="280px"
    :visible="visible"
    :with-header="false"
    :append-to-body="true"
    :show-close="false"
  >
    <div class="drawer-container">
      <div>
        <div class="setting-drawer-content">
          <div class="setting-drawer-title">
            <h3 class="drawer-title">主题风格设置</h3>
          </div>
          <div class="setting-drawer-block-checbox">
            <div
              class="setting-drawer-block-checbox-item"
              @click="handleTheme('theme-dark')"
              :class="{ 'is-active': sideTheme === 'theme-dark' }"
            >
              <div class="theme-button theme-button-dark">国网绿</div>
              <div v-if="sideTheme === 'theme-dark'" class="active-indicator"></div>
            </div>
            <div
              class="setting-drawer-block-checbox-item"
              @click="handleTheme('theme-light')"
              :class="{ 'is-active': sideTheme === 'theme-light' }"
            >
              <div class="theme-button theme-button-light">国网蓝</div>
              <div v-if="sideTheme === 'theme-light'" class="active-indicator"></div>
            </div>
          </div>

          <div class="drawer-item" v-if="false">
            <span>主题颜色</span>
            <theme-picker
              style="float: right; height: 26px; margin: -3px 8px 0 0"
              @change="themeChange"
            />
          </div>
        </div>

        <div v-if="false">
          <el-divider />

          <h3 class="drawer-title">系统布局配置</h3>

          <div class="drawer-item">
            <span>开启 TopNav</span>
            <el-switch v-model="topNav" class="drawer-switch" />
          </div>

          <div class="drawer-item">
            <span>开启 Tags-Views</span>
            <el-switch v-model="tagsView" class="drawer-switch" />
          </div>

          <div class="drawer-item">
            <span>固定 Header</span>
            <el-switch v-model="fixedHeader" class="drawer-switch" />
          </div>

          <div class="drawer-item">
            <span>显示 Logo</span>
            <el-switch v-model="sidebarLogo" class="drawer-switch" />
          </div>

          <div class="drawer-item">
            <span>动态标题</span>
            <el-switch v-model="dynamicTitle" class="drawer-switch" />
          </div>

          <el-divider />
        </div>

        <el-button
          size="small"
          type="primary"
          plain
          icon="el-icon-document-add"
          @click="saveSetting"
          >保存配置</el-button
        >
        <el-button size="small" plain icon="el-icon-refresh" @click="resetSetting"
          >重置配置</el-button
        >
      </div>
    </div>
  </el-drawer>
</template>

<script>
  import ThemePicker from '@/components/ThemePicker'

  export default {
    components: { ThemePicker },
    data() {
      return {
        theme: this.$store.state.settings.theme,
        sideTheme: this.$store.state.settings.sideTheme
      }
    },
    computed: {
      visible: {
        get() {
          return this.$store.state.settings.showSettings
        }
      },
      fixedHeader: {
        get() {
          return this.$store.state.settings.fixedHeader
        },
        set(val) {
          this.$store.dispatch('settings/changeSetting', {
            key: 'fixedHeader',
            value: val
          })
        }
      },
      topNav: {
        get() {
          return this.$store.state.settings.topNav
        },
        set(val) {
          this.$store.dispatch('settings/changeSetting', {
            key: 'topNav',
            value: val
          })
          if (!val) {
            this.$store.dispatch('app/toggleSideBarHide', false)
            this.$store.commit('SET_SIDEBAR_ROUTERS', this.$store.state.permission.defaultRoutes)
          }
        }
      },
      tagsView: {
        get() {
          return this.$store.state.settings.tagsView
        },
        set(val) {
          this.$store.dispatch('settings/changeSetting', {
            key: 'tagsView',
            value: val
          })
        }
      },
      sidebarLogo: {
        get() {
          return this.$store.state.settings.sidebarLogo
        },
        set(val) {
          this.$store.dispatch('settings/changeSetting', {
            key: 'sidebarLogo',
            value: val
          })
        }
      },
      dynamicTitle: {
        get() {
          return this.$store.state.settings.dynamicTitle
        },
        set(val) {
          this.$store.dispatch('settings/changeSetting', {
            key: 'dynamicTitle',
            value: val
          })
        }
      }
    },
    methods: {
      themeChange(val) {
        this.$store.dispatch('settings/changeSetting', {
          key: 'theme',
          value: val
        })
        this.theme = val
      },
      handleTheme(val) {
        this.$store.dispatch('settings/changeSetting', {
          key: 'sideTheme',
          value: val
        })
        this.sideTheme = val
      },
      saveSetting() {
        this.$modal.loading('正在保存到本地，请稍候...')
        this.$cache.local.set(
          'layout-setting',
          `{
            "topNav":${this.topNav},
            "tagsView":${this.tagsView},
            "fixedHeader":${this.fixedHeader},
            "sidebarLogo":${this.sidebarLogo},
            "dynamicTitle":${this.dynamicTitle},
            "sideTheme":"${this.sideTheme}",
            "theme":"${this.theme}"
          }`
        )
        setTimeout(this.$modal.closeLoading(), 1000)
      },
      resetSetting() {
        this.$modal.loading('正在清除设置缓存并刷新，请稍候...')
        this.$cache.local.remove('layout-setting')
        setTimeout('window.location.reload()', 1000)
      }
    }
  }
</script>

<style lang="scss" scoped>
  .setting-drawer-content {
    .setting-drawer-title {
      margin-bottom: 12px;
      color: rgba(0, 0, 0, 0.85);
      font-size: 14px;
      line-height: 22px;
      font-weight: bold;
    }

    .setting-drawer-block-checbox {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      margin-top: 10px;
      margin-bottom: 20px;

      .setting-drawer-block-checbox-item {
        position: relative;
        margin-right: 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
        border: 2px solid transparent;

        &.is-active {
          border: 2px solid #1890ff;
          box-shadow: 0 0 5px rgba(24, 144, 255, 0.5);
        }

        .theme-button {
          width: 100px;
          height: 48px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 14px;
          font-weight: 500;
          color: #fff;
          border-radius: 2px;
        }

        .theme-button-dark {
          background-color: #00907f;
        }

        .theme-button-light {
          background-color: #3490fb;
        }

        .active-indicator {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 6px solid #1890ff;
          transform: translateX(-50%) rotate(180deg);
        }
      }
    }
  }

  .drawer-container {
    padding: 20px;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;

    .drawer-title {
      margin-bottom: 12px;
      color: rgba(0, 0, 0, 0.85);
      font-size: 14px;
      line-height: 22px;
    }

    .drawer-item {
      color: rgba(0, 0, 0, 0.65);
      font-size: 14px;
      padding: 12px 0;
    }

    .drawer-switch {
      float: right;
    }
  }
</style>
