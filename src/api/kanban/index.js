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
