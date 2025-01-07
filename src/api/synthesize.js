import request from '@/utils/request';
// 获取走访综合查询列表
export const asyncGetVisitList = (params) => {
  return request({
    url: '/search/get/page',
    method: 'get',
    params,
  });
};
// 工单类型
export const asyncGetWorkOrderType = (type) => {
  return request({
    url: `/search/get/form/type/select/${type}`,
    method: 'get',
  });
};
// 来源表单

export const asyncGetSourceForm = (type) => {
  return request({
    url: `/search/get/select/info/${type}`,
    method: 'get',
  });
};

// 查询表单控件列表
export const asyncGetFormControls = (id) => {
  return request({
    url: `/search/get/form/widget/${id}`,
    method: 'get',
  });
};
// 查看详情
export const asyncGetDetail = (params) => {
  return request({
    url: '/search/get/form/info',
    method: 'get',
    params,
  });
};

// 无单填报走访信息查询
export const asyncGetNoFormList = (params) => {
  return request({
    url: '/search/get/self/page',
    method: 'get',
    params,
  });
};
// 查看无单填报走访信息详情
export const asyncGetNoFormDetail = (params) => {
  return request({
    url: '/search/get/self/info',
    method: 'get',
    params,
  });
};