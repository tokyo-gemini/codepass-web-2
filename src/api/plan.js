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
    url: '/plannedManage/page/to/user',
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
// 根据所属供电所和台区查询客户列表
export function asyncGetCustomerList(data) {
  return request({
    url: '/plannedManage/page/to/custom',
    method: 'get',
    params: data,
  });
}

// 新增计划保存
export function asyncAddPlan(data) {
  return request({
    url: '/plannedManage/add',
    method: 'post',
    data,
  });
}

// 编辑计划保存
export function asyncEditPlan(data) {
  return request({
    url: '/plannedManage/update',
    method: 'put',
    data,
  });
}
// 是否启用

export function asyncEnabledPlan(data) {
  return request({
    url: `/plannedManage/update/enabled/${data.id}/${data.enabled}`,
    method: 'get',
  });
}
