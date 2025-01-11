import axios from 'axios'
import { Loading, Message } from 'element-ui'
import { saveAs } from 'file-saver'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { blobValidate } from "@/utils/ruoyi";

const baseURL = process.env.VUE_APP_BASE_API
let downloadLoadingInstance;

export default {
  name(name, isDelete = true) {
    var url = baseURL + "/common/download?fileName=" + encodeURIComponent(name) + "&delete=" + isDelete
    axios({
      method: 'get',
      url: url,
      responseType: 'blob',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then((res) => {
      const isBlob = blobValidate(res.data);
      if (isBlob) {
        const blob = new Blob([res.data])
        this.saveAs(blob, decodeURIComponent(res.headers['download-filename']))
      } else {
        this.printErrMsg(res.data);
      }
    })
  },
  resource(resource) {
    var url = baseURL + "/common/download/resource?resource=" + encodeURIComponent(resource);
    axios({
      method: 'get',
      url: url,
      responseType: 'blob',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then((res) => {
      const isBlob = blobValidate(res.data);
      if (isBlob) {
        const blob = new Blob([res.data])
        this.saveAs(blob, decodeURIComponent(res.headers['download-filename']))
      } else {
        this.printErrMsg(res.data);
      }
    })
  },
  zip(url, name) {
    var url = baseURL + url
    downloadLoadingInstance = Loading.service({ text: "正在下载数据，请稍候", spinner: "el-icon-loading", background: "rgba(0, 0, 0, 0.7)", })
    axios({
      method: 'get',
      url: url,
      responseType: 'blob',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then((res) => {
      const isBlob = blobValidate(res.data);
      if (isBlob) {
        const blob = new Blob([res.data], { type: 'application/zip' })
        this.saveAs(blob, name)
      } else {
        this.printErrMsg(res.data);
      }
      downloadLoadingInstance.close();
    }).catch((r) => {
      console.error(r)
      Message.error('下载文件出现错误，请联系管理员！')
      downloadLoadingInstance.close();
    })
  },
  download(url, params, filename, options = {}) {
    var downloadUrl = baseURL + url;
    downloadLoadingInstance = Loading.service({
      text: "正在导出数据，请耐心等待...",
      spinner: "el-icon-loading",
      background: "rgba(0, 0, 0, 0.7)"
    });

    return new Promise((resolve, reject) => {
      axios({
        method: 'get',
        url: downloadUrl,
        params: params,
        responseType: 'blob',
        headers: { 'Authorization': 'Bearer ' + getToken() },
        timeout: options.timeout || 60000, // 默认1分钟超时
        onDownloadProgress: options.onDownloadProgress
      }).then((res) => {
        const isBlob = blobValidate(res.data);
        if (isBlob) {
          const blob = new Blob([res.data]);
          this.saveAs(blob, filename);
          resolve(res.data);
        } else {
          this.printErrMsg(res.data);
          reject(new Error('导出失败'));
        }
        downloadLoadingInstance.close();
      }).catch((error) => {
        console.error('导出错误', error);
        Message.error(error.code === 'ECONNABORTED'
          ? '导出超时，请稍后重试或减少导出数据量'
          : '导出失败，请稍后重试');
        downloadLoadingInstance.close();
        reject(error);
      });
    });
  },
  saveAs(text, name, opts) {
    saveAs(text, name, opts);
  },
  async printErrMsg(data) {
    const resText = await data.text();
    const rspObj = JSON.parse(resText);
    const errMsg = errorCode[rspObj.code] || rspObj.msg || errorCode['default']
    Message.error(errMsg);
  }
}

