import request from '@/utils/request';
// 获取状态列表
export const asyncGetStateList = (params) => {
  return request({
    url: '/statusType/page',
    method: 'get',
    params,
  });
};

// 获取表单和表单控件
export const asyncGetFormAndFormItem = (params) => {
  return request({
    url: '/formDesignInfo/get/quote',
    method: 'get',
    params,
  });
};
// 绑定表单和表单控件
export const AsyncCodesstatusTypebindingform = (data) => {
  return request({
    url: '/statusType/binding/form',
    method: 'post',
    data,
  });
};

// 查询已绑定的表单
export const statusTypegetbindinginfo = (params) => {
  return request({
    url: '/statusType/get/binding/info',
    method: 'get',
    params,
  });
};

//删除绑定的表单
export const statusTypeunbindingform = (params) => {
  return request({
    url: '/statusType/unbinding',
    method: 'get',
    params,
  });
};
