import axios from 'axios';

const api = axios.create({
  baseURL: '/api/workers',
  timeout: 30000
});

// 获取安全须知
export function getSafetyRules() {
  return api.get('/safety-rules');
}

// OCR识别身份证
export function ocrIdCard(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  return api.post('/ocr-id-card', formData);
}

// 上传人脸照片
export function uploadFace(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  return api.post('/upload-face', formData);
}

// 提交人员登记
export function submitRegister(data) {
  return api.post('/register', data);
}

// 获取人员列表
export function getWorkerList(params) {
  return api.get('/list', { params });
}

// 获取人员详情
export function getWorkerDetail(id) {
  return api.get(`/detail/${id}`);
}

// 获取统计数据
export function getStats() {
  return api.get('/stats');
}

// 验证管理员密码
export function verifyPassword(password) {
  return axios.post('/api/admin/verify', { password });
}

// 导出链接
export function getExportUrl() {
  return '/api/workers/export';
}