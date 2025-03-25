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
