import request from '../utils/request'

// 获取计划管理列表
export function asyncGetPlanList(data) {
  return request({
    url: '/plannedManage/page',
    method: 'get',
    params: data
  })
}
// 获取计划表单的可选项
export function asyncGetPlanOptions(type) {
  return request({
    url: `/plannedManage/get/form/info/by/plan/type/${type}`,
    method: 'get'
  })
}
// 获取台区列表
export function asyncGetAreaList(data) {
  return request({
    url: '/plannedManage/page/to/tower',
    method: 'get',
    params: data
  })
}
// 根据id查询计划详情
export function asyncGetPlanDetail(id) {
  return request({
    url: `/plannedManage/get/${id}`,
    method: 'get'
  })
}
// 获取客户标签可选项
export function asyncGetCustomerTags(params) {
  return request({
    url: '/sys/tag/get/page',
    method: 'get',
    params
  })
}
// 根据所属供电所和台区查询客户列表
export function asyncGetCustomerList(data) {
  return request({
    url: '/plannedManage/page/to/system/custom',
    method: 'get',
    params: data
  })
}

// 新增计划保存
export function asyncAddPlan(data) {
  return request({
    url: '/plannedManage/add',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data
  })
}

// 编辑计划保存
export function asyncEditPlan(data) {
  return request({
    url: '/plannedManage/update',
    method: 'put',
    headers: { 'Content-Type': 'multipart/form-data' },
    data
  })
}
// 是否启用

export function asyncEnabledPlan(data) {
  return request({
    url: `/plannedManage/update/enabled/${data.id}/${data.enabled}`,
    method: 'get'
  })
}

// 下载模版
export function asyncDownLoadTemplate(data) {
  return request({
    url: '/resource/download/template',
    method: 'get',
    responseType: 'blob',
    params: data
  })
}
// 下载自主填报模版
export function asyncDownLoadSelfTemplate(data) {
  return request({
    url: '/selfPlanned/downloadTemplate',
    method: 'post',
    responseType: 'blob',
    params: data
  })
}
// 上传自主填报信息
export function asyncUploadSelfInfo(data) {
  return request({
    url: '/selfPlanned/upload/file',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data
  })
}
// 查询分类计划总数
export function asyncGetPlanCount() {
  return request({
    url: '/plannedManage/get/type',
    method: 'get'
  })
}
// 删除计划
export function asyncDeletePlan(data) {
  return request({
    url: '/plannedManage/del',
    method: 'delete',
    params: data // 使用 params 而不是直接传值
  })
}
// 自主填报新增
export function asyncAddSelfPlan(data) {
  return request({
    url: '/selfPlanned/add',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data
  })
}
// 自主填报编辑
export function asyncEditSelfPlan(data) {
  return request({
    url: '/selfPlanned/update',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data
  })
}
// 自主填报详情
export function asyncGetSelfPlanDetail(id) {
  return request({
    url: `/selfPlanned/get/${id}`,
    method: 'get'
  })
}

// 修改批量生成二维码接口
export function asyncGenerateQrcode() {
  return request({
    url: '/plannedManage/qrcode/generate',
    method: 'post',
    responseType: 'blob' // 添加responseType
  })
}
