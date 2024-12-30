const { defineConfig } = require('unocss')

module.exports = defineConfig({
  // 在这里添加你的UnoCSS配置
  rules: [
    ['m-1', { margin: '0.25rem' }],
  ],
  shortcuts: {
    'btn': 'px-4 py-1 rounded inline-block bg-blue-600 text-white cursor-pointer',
  },
  theme: {
    colors: {
      primary: '#007bff',
    },
  },
})
