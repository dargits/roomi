import React, { useState, useEffect } from 'react';
import {
  IoAlertCircleOutline, IoCheckmarkCircleOutline, IoCloseOutline,
  IoFlashOutline, IoListOutline, IoPlayOutline, IoRefreshOutline,
  IoShieldCheckmarkOutline, IoTimeOutline, IoInformationCircleOutline,
  IoWarningOutline
} from 'react-icons/io5';
import { concurrencyApi } from '../../services/concurrencyApi';
import { roomApi } from '../../services/roomApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import PageHeader from '../../components/ui/PageHeader';

/**
 * NCL-03-CN-007: Nhật ký va chạm đồng thời (log từ hệ thống thật)
 * NCL-03-CN-008: Trang minh chứng kiểm soát đồng thời (stress test)
 */
const ConcurrencyLogPage = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('logs'); // logs | test

  // === Nhật ký (NCL-03-CN-007) ===
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // === Stress test (NCL-03-CN-008) ===
  const [rooms, setRooms] = useState([]);
  const [testForm, setTestForm] = useState({
    roomId: '',
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    requestCount: 20
  });
  const [running, setRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testLogs, setTestLogs] = useState([]);
  const [testError, setTestError] = useState('');
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchRooms();
  }, []);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await concurrencyApi.getLogs();
      setLogs(data || []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const data = await roomApi.getAllRooms();
      setRooms((data || []).filter(r => r.status !== 'MAINTENANCE'));
    } catch {
      setRooms([]);
    }
  };

  // NCL-03-CN-008: Chạy kịch bản stress test
  const handleRunTest = async () => {
    if (!testForm.roomId) { setTestError('Vui lòng chọn phòng để chạy kịch bản'); return; }
    if (!testForm.dateFrom || !testForm.dateTo) { setTestError('Vui lòng chọn khoảng ngày'); return; }
    setRunning(true); setTestError(''); setTestResult(null); setTestLogs([]);
    try {
      const result = await concurrencyApi.runTest({
        roomId: Number(testForm.roomId),
        dateFrom: testForm.dateFrom,
        dateTo: testForm.dateTo,
        requestCount: Number(testForm.requestCount)
      });
      setTestResult(result);
      setSessionId(result.sessionId);
      // Lấy logs chi tiết
      const logData = await concurrencyApi.getTestResults(result.sessionId);
      setTestLogs(logData || []);
    } catch (err) {
      setTestError(err.response?.data?.message || err.response?.data?.error || 'Không thể chạy kịch bản. Vui lòng thử lại.');
    } finally {
      setRunning(false);
    }
  };

  const roomOptions = [
    { value: '', label: '— Chọn phòng —' },
    ...rooms.map(r => ({ value: r.id, label: `Phòng ${r.roomNumber} (${r.roomTypeName || ''})` }))
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm soát đồng thời"
        subtitle="Nhật ký va chạm và minh chứng kiểm soát đồng thời khi gán phòng"
        icon={IoShieldCheckmarkOutline}
      />

      {/* Tabs chuyển section */}
      <div className="flex border-b border-border-grey">
        <button
          onClick={() => setActiveSection('logs')}
          className={`px-5 py-3 text-sm font-medium flex items-center gap-2 transition-colors relative ${
            activeSection === 'logs' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <IoListOutline size={16} /> Nhật ký va chạm
          {activeSection === 'logs' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('test')}
          className={`px-5 py-3 text-sm font-medium flex items-center gap-2 transition-colors relative ${
            activeSection === 'test' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <IoFlashOutline size={16} /> Minh chứng kiểm soát đồng thời
          {activeSection === 'test' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t" />
          )}
        </button>
      </div>

      {/* === NCL-03-CN-007: Nhật ký va chạm === */}
      {activeSection === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-on-surface-variant">
              Ghi lại mọi lần hệ thống từ chối thao tác do xung đột đặt phòng đồng thời.
            </p>
            <Button variant="ghost" icon={IoRefreshOutline} onClick={fetchLogs} isLoading={logsLoading}>
              Làm mới
            </Button>
          </div>

          <div className="bg-surface-container-lowest rounded border border-border-grey overflow-hidden">
            {logsLoading ? (
              <div className="text-center py-12 text-on-surface-variant">Đang tải...</div>
            ) : logs.length === 0 ? (
              /* NCL-03-CN-007-TC-02 (tương tự): Trang trống hiển thị lời mời */
              <div className="text-center py-16 text-on-surface-variant">
                <IoShieldCheckmarkOutline size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-on-surface">Chưa có va chạm nào được ghi nhận</p>
                <p className="text-sm mt-1">Hệ thống đang hoạt động bình thường, không có xung đột đồng thời.</p>
                <p className="text-xs mt-2">
                  Bạn có thể chuyển sang tab <strong>Minh chứng</strong> để xem thử kịch bản.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-border-grey">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Thời điểm</th>
                    <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Phòng</th>
                    <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Người thao tác</th>
                    <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Loại</th>
                    <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3 text-on-surface-variant text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <IoTimeOutline size={12} />
                          {log.occurredAt ? new Date(log.occurredAt).toLocaleString('vi-VN') : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-on-surface">
                        {log.roomNumber ? `Phòng ${log.roomNumber}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">{log.actorName}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs max-w-xs truncate">{log.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* === NCL-03-CN-008: Minh chứng stress test === */}
      {activeSection === 'test' && (
        <div className="space-y-5">
          <div className="bg-surface-blue-light border border-primary/20 rounded p-4 text-sm flex items-start gap-3">
            <IoInformationCircleOutline size={20} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="text-on-surface">
              <p className="font-medium mb-1">Kịch bản minh chứng (NCL-03-CN-008)</p>
              <p className="text-on-surface-variant text-xs">
                Hệ thống gửi <strong>N yêu cầu gán phòng đồng thời</strong> vào cùng một phòng.
                Nhờ cơ chế khóa, chỉ <strong>1 yêu cầu thành công</strong>, N-1 bị từ chối.
                Dữ liệu test sẽ tự động xóa sau khi chạy xong.
              </p>
            </div>
          </div>

          {/* Form cấu hình */}
          <div className="bg-surface-container-lowest rounded border border-border-grey p-5 space-y-4">
            <h4 className="font-semibold text-on-surface">Cấu hình kịch bản</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Phòng kiểm tra"
                value={testForm.roomId}
                onChange={e => setTestForm(p => ({ ...p, roomId: e.target.value }))}
                options={roomOptions}
              />
              <Input
                label="Số yêu cầu đồng thời (2–50)"
                type="number"
                min="2"
                max="50"
                value={testForm.requestCount}
                onChange={e => setTestForm(p => ({ ...p, requestCount: e.target.value }))}
              />
              <Input
                label="Ngày bắt đầu kiểm tra"
                type="date"
                value={testForm.dateFrom}
                onChange={e => setTestForm(p => ({ ...p, dateFrom: e.target.value }))}
              />
              <Input
                label="Ngày kết thúc kiểm tra"
                type="date"
                value={testForm.dateTo}
                onChange={e => setTestForm(p => ({ ...p, dateTo: e.target.value }))}
              />
            </div>
            {testError && (
              <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
                <IoAlertCircleOutline size={16} /> {testError}
              </div>
            )}
            <Button variant="primary" icon={IoPlayOutline} onClick={handleRunTest} isLoading={running}>
              {running ? 'Đang chạy kịch bản...' : 'Chạy kịch bản'}
            </Button>
          </div>

          {/* Kết quả */}
          {!testResult && !running && (
            /* NCL-03-CN-008-TC-02: Trang trống — hiển thị lời mời */
            <div className="text-center py-12 text-on-surface-variant border border-dashed border-border-grey rounded">
              <IoFlashOutline size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-on-surface">Chưa có kết quả nào</p>
              <p className="text-sm mt-1">Cấu hình và nhấn <strong>Chạy kịch bản</strong> để bắt đầu minh chứng.</p>
            </div>
          )}

          {testResult && (
            <div className="space-y-4">
              {/* Tóm tắt kết quả */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest rounded border border-border-grey p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{testResult.totalRequests}</div>
                  <div className="text-xs text-on-surface-variant mt-1">Tổng yêu cầu</div>
                </div>
                <div className="bg-green-50 rounded border border-green-200 p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{testResult.successCount}</div>
                  <div className="text-xs text-green-600 mt-1">✓ Thành công</div>
                </div>
                <div className="bg-red-50 rounded border border-red-200 p-4 text-center">
                  <div className="text-2xl font-bold text-error">{testResult.rejectedCount}</div>
                  <div className="text-xs text-error mt-1">✗ Bị từ chối</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                <IoCheckmarkCircleOutline size={18} />
                <strong>{testResult.message}</strong>
              </div>

              {/* Chi tiết từng yêu cầu */}
              {testLogs.length > 0 && (
                <div className="bg-surface-container-lowest rounded border border-border-grey overflow-hidden">
                  <div className="px-4 py-3 bg-surface-container-low border-b border-border-grey font-semibold text-sm text-on-surface">
                    Chi tiết từng yêu cầu ({testLogs.length} bản ghi)
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border-grey">
                    {testLogs.map((log, idx) => {
                      const isSuccess = log.detail?.includes('Thành công');
                      return (
                        <div key={log.id || idx} className={`px-4 py-3 text-sm flex items-start gap-3 ${
                          isSuccess ? 'bg-green-50' : 'hover:bg-surface-container-low/50'
                        }`}>
                          <span className={`mt-0.5 flex-shrink-0 text-xs font-bold ${isSuccess ? 'text-green-600' : 'text-error'}`}>
                            {isSuccess ? '✓' : '✗'}
                          </span>
                          <div className="flex-1">
                            <p className={`text-xs ${isSuccess ? 'text-green-700 font-medium' : 'text-on-surface-variant'}`}>
                              {log.detail}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                              <IoTimeOutline size={10} />
                              {log.occurredAt ? new Date(log.occurredAt).toLocaleTimeString('vi-VN', { hour12: false }) : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConcurrencyLogPage;
