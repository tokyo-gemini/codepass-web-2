import request from '@/utils/request';
// 获取状态列表
export const getStateList = (params) => {
  return request({
    url: '/statusType/page',
    method: 'get',
    params,
  });
};
