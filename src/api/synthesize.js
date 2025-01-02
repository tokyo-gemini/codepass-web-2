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
