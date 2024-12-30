module.exports = {
  important: true, // 提高css优先级
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false, // 禁用preflight以避免与element-ui冲突
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
