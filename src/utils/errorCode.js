export const errorCode = {
  200: '操作成功',
  401: '认证失败，无法访问系统资源',
  403: '当前操作没有权限',
  404: '访问资源不存在',
  500: '系统错误',
  601: '操作警告',
  default: '系统未知错误,请反馈给管理员'
}

// SQL语法错误的特征关键词
export const sqlErrorKeywords = ['SQLSyntaxErrorException', 'bad SQL grammar', 'syntax to use near']

// 判断是否为SQL语法错误
export function isSQLError(message) {
  if (!message || typeof message !== 'string') {
    return false
  }
  return sqlErrorKeywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()))
}

// 格式化错误信息
export function formatError(error) {
  if (!error) return errorCode.default

  try {
    // 获取错误信息 - 增加错误信息获取的容错性
    const errorMessage =
      error.response?.data?.msg || // 后端返回的错误信息
      error.response?.data?.message || // 某些后端框架使用message
      error.response?.data || // 直接返回的错误信息
      error.message || // Error对象的message
      error.toString() // 其他情况转字符串

    // 检查是否为数据库错误
    if (isSQLError(errorMessage)) {
      console.error('数据库错误:', errorMessage) // 记录原始错误，便于排查
      return '系统查询异常,请联系管理员'
    }

    // 检查是否为空消息
    if (!errorMessage.trim()) {
      return errorCode.default
    }

    return errorMessage
  } catch (e) {
    console.error('错误处理异常:', e)
    return errorCode.default
  }
}
