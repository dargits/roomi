import api from './api';

/**
 * API nhật ký va chạm đồng thời — NCL-03-CN-007/008
 */
export const concurrencyApi = {
  // NCL-03-CN-007: Lấy nhật ký va chạm thực tế
  getLogs: async (roomId) => {
    const params = roomId ? { roomId } : {};
    const res = await api.get('/concurrency/logs', { params });
    return res.data;
  },

  // NCL-03-CN-008: Lấy kết quả stress test theo sessionId
  getTestResults: async (sessionId) => {
    const res = await api.get(`/concurrency/test-results/${sessionId}`);
    return res.data;
  },

  // NCL-03-CN-008: Chạy kịch bản stress test
  runTest: async (data) => {
    // data = { roomId, dateFrom, dateTo, requestCount }
    const res = await api.post('/concurrency/run-test', data);
    return res.data;
  },
};

export default concurrencyApi;
