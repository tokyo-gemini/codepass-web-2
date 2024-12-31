import request from '@/utils/request';

// 获取计划管理列表
export function asyncGetPlanList(data) {
  return request({
    url: '/plannedManage/page',
    method: 'get',
    params: data,
  });
}
// 获取计划表单的可选项
export function asyncGetPlanOptions(type) {
  return request({
    url: `/plannedManage/get/form/info/by/plan/type/${type}`,
    method: 'get',
  });
}
// 获取台区列表
export function asyncGetAreaList(data) {
  return request({
    url: '/plannedManage/page/to/custom',
    method: 'get',
    params: data,
  });
}
// 根据id查询计划详情
export function asyncGetPlanDetail(id) {
  return request({
    url: `/plannedManage/get/${id}`,
    method: 'get',
  });
}
// 获取客户标签可选项
export function asyncGetCustomerTags(params) {
  return request({
    url: '/sys/tag/get/page',
    method: 'get',
    params,
  });
}
