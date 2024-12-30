import request from '@/utils/request';
// 获取表单设计列表
export function asyncGetFormDesignPage(data) {
  return request({
    url: '/formDesignInfo/page',
    method: 'get',
    params: data,
  });
}
// 新增表单设计
export function asyncAddFormDesign(data) {
  return request({
    url: '/formDesignInfo/add',
    method: 'post',
    data,
  });
}
// 复制表单设计
export function asyncCopyFormDesign(data) {
  return request({
    url: `/formDesignInfo/copy/form/${data.formId}`,
    method: 'get',
    params: data,
  });
}
// 编辑表单设计
export function asyncEditFormDesign(data) {
  return request({
    url: '/formDesignInfo/update',
    method: 'put',
    data,
  });
}
// 查询表单详情
export function asyncGetFormDesignById(formId) {
  return request({
    url: `/formDesignInfo/get/${formId}`,
    method: 'get',
  });
}

// 删除表单
export function asyncDeleteFormDesign(params) {
  return request({
    url: '/formDesignInfo/del',
    method: 'delete',
    params,
  });
}
