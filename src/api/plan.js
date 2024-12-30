import request from '@/utils/request';

// 获取计划管理列表
export function asyncGetPlanList(data) {
  return request({
    url: '/plannedManage/page',
    method: 'get',
    params: data,
  });
}
