import request from '@/utils/request'

// 获取周覆盖率数据
export function getWeeklyCoverageRate(params) {
  return request({
    url: '/result/kan/ban/get/coverageRate/week',
    method: 'get',
    params
  })
}

// 获取周巡视完成率数据
export function getWeeklyCompletionRate(params) {
  return request({
    url: '/result/kan/ban/get/completionRate/week',
    method: 'get',
    params
  })
}

// 获取历史覆盖率数据
export function getHistoryCoverageRate(params) {
  return request({
    url: '/result/kan/ban/get/coverage/history',
    method: 'get',
    params
  })
}

// 获取历史完成率数据
export function getCompletionRateHistory(params) {
  return request({
    url: '/result/kan/ban/get/completion/history',
    method: 'get',
    params
  })
}

// 获取走访巡视信息表格数据
export function getVisitInspectionInfo(params) {
  return request({
    url: '/result/kan/ban/get/zfXsInfo',
    method: 'get',
    params
  })
}

// 导出走访巡视信息表格数据
export function exportVisitInspectionInfo(params) {
  return request({
    url: '/result/kan/ban/export/zfXsInfo',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 获取状态看板数据
export function getStatusBoardData(params) {
  return request({
    url: '/status/kanban/home/page',
    method: 'get',
    params
  })
}

// 获取异常看板数据
export function getExceptionBoardData(params) {
  return request({
    url: '/ypgt/get/code/count',
    method: 'get',
    params
  })
}

// 获取异常看板表格数据
export function getExceptionTableData(params) {
  return request({
    url: '/ypgt/get/page/info',
    method: 'get',
    params
  })
}
