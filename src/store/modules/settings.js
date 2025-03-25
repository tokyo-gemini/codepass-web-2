import defaultSettings from '@/settings'

const { sideTheme, showSettings, topNav, tagsView, fixedHeader, sidebarLogo, dynamicTitle } =
  defaultSettings

// 获取当前保存的主题名称
const savedThemeName = localStorage.getItem('theme')
// 根据主题名称确定对应的颜色
const savedThemeColor =
  savedThemeName === 'theme-dark' ? '#00907F' : savedThemeName === 'theme-light' ? '#3490FB' : null

const storageSetting = JSON.parse(localStorage.getItem('layout-setting')) || ''
const state = {
  title: '',
  // 优先使用保存在 theme 中的主题颜色，其次是 layout-setting 中的设置
  theme:
    savedThemeColor || storageSetting.theme || (sideTheme === 'theme-dark' ? '#00907F' : '#3490FB'),
  sideTheme: savedThemeName || storageSetting.sideTheme || sideTheme,
  showSettings: showSettings,
  topNav: storageSetting.topNav === undefined ? topNav : storageSetting.topNav,
  tagsView: storageSetting.tagsView === undefined ? tagsView : storageSetting.tagsView,
  fixedHeader: storageSetting.fixedHeader === undefined ? fixedHeader : storageSetting.fixedHeader,
  sidebarLogo: storageSetting.sidebarLogo === undefined ? sidebarLogo : storageSetting.sidebarLogo,
  dynamicTitle:
    storageSetting.dynamicTitle === undefined ? dynamicTitle : storageSetting.dynamicTitle
}

const mutations = {
  CHANGE_SETTING: (state, { key, value }) => {
    if (state.hasOwnProperty(key)) {
      state[key] = value
    }
  }
}

// 初始化时就应用Element UI主题色
if (state.theme) {
  applyThemeColor(state.theme)
}

const actions = {
  // 修改布局设置
  changeSetting({ commit }, data) {
    commit('CHANGE_SETTING', data)
    // 当切换主题风格时,同步更新主题色
    if (data.key === 'sideTheme') {
      const themeColor = data.value === 'theme-dark' ? '#00907F' : '#3490FB'
      commit('CHANGE_SETTING', {
        key: 'theme',
        value: themeColor
      })
      // 修改element-ui的主题色
      applyThemeColor(themeColor)
    } else if (data.key === 'theme') {
      // 直接修改主题色时也应用
      applyThemeColor(data.value)
    }
  },
  // 设置网页标题
  setTitle({ commit }, title) {
    state.title = title
  }
}

// 应用主题色到Element UI组件
function applyThemeColor(themeColor) {
  document.documentElement.style.setProperty('--el-color-primary', themeColor)
  // 生成主题相关颜色
  const colors = [
    '--el-color-primary-dark-2',
    '--el-color-primary-light-3',
    '--el-color-primary-light-5',
    '--el-color-primary-light-7',
    '--el-color-primary-light-8',
    '--el-color-primary-light-9'
  ]

  // 计算不同深浅的主题色
  const isDark = themeColor === '#00907F'
  const colorMap = {
    '#00907F': {
      '--el-color-primary-dark-2': '#007a6b',
      '--el-color-primary-light-3': '#33a696',
      '--el-color-primary-light-5': '#66bfb2',
      '--el-color-primary-light-7': '#99d9cf',
      '--el-color-primary-light-8': '#b3e5dd',
      '--el-color-primary-light-9': '#ccf2ec'
    },
    '#3490FB': {
      '--el-color-primary-dark-2': '#2c7ad4',
      '--el-color-primary-light-3': '#5ca6fc',
      '--el-color-primary-light-5': '#85bdfd',
      '--el-color-primary-light-7': '#add4fe',
      '--el-color-primary-light-8': '#c2e0fe',
      '--el-color-primary-light-9': '#d6ebfe'
    }
  }

  // 设置相关颜色
  colors.forEach((key) => {
    document.documentElement.style.setProperty(key, colorMap[themeColor][key])
  })

  // 同时更新页面的主题数据属性
  const themeName = themeColor === '#00907F' ? 'theme-dark' : 'theme-light'
  document.documentElement.setAttribute('data-theme', themeName)
  localStorage.setItem('theme', themeName)

  // 同步更新 layout-setting
  const layoutSetting = JSON.parse(localStorage.getItem('layout-setting')) || {}
  layoutSetting.theme = themeColor
  layoutSetting.sideTheme = themeName
  localStorage.setItem('layout-setting', JSON.stringify(layoutSetting))
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
