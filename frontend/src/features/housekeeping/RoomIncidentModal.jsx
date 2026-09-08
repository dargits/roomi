import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { roomIncidentApi } from '../../services/roomIncidentApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  IoWarningOutline, 
  IoBuildOutline, 
  IoCheckmarkCircleOutline, 
  IoAlertCircleOutline,
  IoAddOutline,
  IoRefreshOutline
} from 'react-icons/io5';

const RoomIncidentModal = ({ isOpen, onClose, initialRoom, onIncidentReported }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [mode, setMode] = useState(initialRoom ? 'report' : 'list'); // 'report' | 'list'
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form báo sự cố
  const [roomId, setRoomId] = useState(initialRoom?.id || '');
  const [roomNumber, setRoomNumber] = useState(initialRoom?.roomNumber || '');
  const [severity, setSeverity] = useState('LIGHT'); // 'LIGHT' | 'HEAVY' | 'OUT_OF_SERVICE'
  const [description, setDescription] = useState('');

  // Resolve state
  const [resolvingItem, setResolvingItem] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (initialRoom) {
      setRoomId(initialRoom.id);
      setRoomNumber(initialRoom.roomNumber);
      setMode('report');
    } else {
      setMode('list');
    }
  }, [initialRoom]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await roomIncidentApi.getIncidents({
        roomId: initialRoom?.id || undefined
      });
      setIncidents(data || []);
    } catch (err) {
      console.error(err);
      toastError('Không thể tải danh sách sự cố.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIncidents();
    }
  }, [isOpen, initialRoom]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!roomId) {
      toastError('Vui lòng chọn phòng bị sự cố.');
      return;
    }
    if (!description.trim()) {
      toastError('Vui lòng nhập mô tả sự cố.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await roomIncidentApi.reportIncident({
        roomId: Number(roomId),
        severity,
        description: description.trim()
      });

      let successMsg = `Đã ghi nhận sự cố cho phòng ${roomNumber || res.roomNumber}!`;
      if (res.affectedBookingsCount > 0) {
        successMsg += ` Cảnh báo: Có ${res.affectedBookingsCount} đặt phòng sắp tới bị ảnh hưởng!`;
      }
      toastSuccess(successMsg);
      setDescription('');
      fetchIncidents();
      setMode('list');
      if (onIncidentReported) onIncidentReported(res);
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi báo sự cố.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNote.trim()) {
      toastError('Vui lòng nhập ghi chú xử lý.');
      return;
    }

    setActionLoading(true);
    try {
      await roomIncidentApi.resolveIncident(resolvingItem.id, resolutionNote.trim());
      toastSuccess(`Đã đánh dấu đã xử lý sự cố phòng ${resolvingItem.roomNumber}!`);
      setResolvingItem(null);
      setResolutionNote('');
      fetchIncidents();
      if (onIncidentReported) onIncidentReported();
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý sự cố.');
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'LIGHT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Nhẹ (Vẫn đón khách)</span>;
      case 'HEAVY':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">Nặng (Khóa bảo trì)</span>;
      case 'OUT_OF_SERVICE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">Không thể phục vụ</span>;
      default:
        return sev;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Sự cố phòng buồng phòng & Bảo trì" maxWidth="max-w-4xl">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-border-grey pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('report')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  mode === 'report'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <IoAddOutline size={16} />
                <span>Báo sự cố mới {roomNumber ? `(Phòng ${roomNumber})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  mode === 'list'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <IoBuildOutline size={16} />
                <span>Danh sách sự cố ({incidents.length})</span>
              </button>
            </div>

            <Button size="sm" variant="ghost" onClick={fetchIncidents} icon={IoRefreshOutline} disabled={loading}>
              Làm mới
            </Button>
          </div>

          {/* MODE: BÁO SỰ CỐ MỚI */}
          {mode === 'report' && (
            <form onSubmit={handleReportSubmit} className="space-y-4 bg-surface-container-low p-4 rounded-lg border border-border-grey">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1.5">
                    Phòng bị sự cố <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly={!!initialRoom}
                    value={roomNumber ? `Phòng ${roomNumber}` : ''}
                    placeholder="Ví dụ: 101"
                    className="w-full px-3 py-2 border border-border-grey rounded-md bg-surface text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1.5">
                    Mức độ nghiêm trọng <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-border-grey rounded-md bg-surface text-sm focus:ring-2 focus:ring-primary"
                  >
                    <option value="LIGHT">🟡 Nhẹ (Vẫn đưa về sẵn sàng, gắn cờ chờ xử lý)</option>
                    <option value="HEAVY">🟠 Nặng (Khóa phòng bảo trì, cảnh báo booking ảnh hưởng)</option>
                    <option value="OUT_OF_SERVICE">🔴 Không thể phục vụ (Khóa bảo trì khẩn cấp)</option>
                  </select>
                </div>
              </div>

              {severity !== 'LIGHT' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-start gap-2">
                  <IoAlertCircleOutline size={18} className="shrink-0 mt-0.5 text-red-600" />
                  <span>
                    <strong>Cảnh báo nghiệp vụ (NCL-06-CN-006):</strong> Khi báo mức độ Nặng hoặc Không thể phục vụ, phòng sẽ tự động chuyển sang trạng thái <strong>Khóa bảo trì (MAINTENANCE)</strong>. Hệ thống sẽ kiểm tra và cảnh báo số lượng đặt phòng sắp tới bị ảnh hưởng để lễ tân chủ động đổi phòng cho khách!
                  </span>
                </div>
              )}

              <div>
                <label className="block font-label-md text-on-surface-variant mb-1.5">
                  Mô tả sự cố chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Máy lạnh chảy nước nhiều, Vỡ bóng đèn phòng tắm, Ổ khóa cửa chính bị kẹt không mở được..."
                  className="w-full px-3 py-2 border border-border-grey rounded-md focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="submit" disabled={actionLoading} icon={IoWarningOutline}>
                  {actionLoading ? 'Đang gửi...' : 'Gửi báo cáo sự cố'}
                </Button>
              </div>
            </form>
          )}

          {/* MODE: DANH SÁCH SỰ CỐ */}
          {mode === 'list' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-grey font-label-md text-on-surface-variant uppercase text-xs">
                    <th className="p-3">Phòng</th>
                    <th className="p-3">Mức độ</th>
                    <th className="p-3">Mô tả sự cố</th>
                    <th className="p-3 text-center">Đặt phòng bị ảnh hưởng</th>
                    <th className="p-3">Người báo & Thời gian</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    {isOwnerOrAdmin && <th className="p-3 text-center w-32">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="p-6 text-center text-on-surface-variant">Đang tải danh sách sự cố...</td></tr>
                  ) : incidents.length === 0 ? (
                    <tr><td colSpan="7" className="p-6 text-center text-on-surface-variant">Không có báo cáo sự cố nào.</td></tr>
                  ) : (
                    incidents.map((inc) => (
                      <tr key={inc.id} className="border-b border-border-grey hover:bg-surface-container-low/50">
                        <td className="p-3 font-semibold text-primary">
                          Phòng {inc.roomNumber}
                        </td>
                        <td className="p-3">
                          {getSeverityBadge(inc.severity)}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-on-surface">{inc.description}</div>
                          {inc.resolutionNote && (
                            <div className="text-xs text-green-700 mt-1 italic">
                              ✓ Xử lý: {inc.resolutionNote} ({inc.resolvedByName})
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {inc.affectedBookingsCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                              {inc.affectedBookingsCount} booking
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant">0</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-on-surface-variant">
                          <div>{inc.reportedByName}</div>
                          <div className="text-outline">{inc.reportedAt?.replace('T', ' ').substring(0, 16)}</div>
                        </td>
                        <td className="p-3 text-center">
                          {inc.status === 'OPEN' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                              Chờ xử lý
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                              Đã xử lý
                            </span>
                          )}
                        </td>
                        {isOwnerOrAdmin && (
                          <td className="p-3 text-center">
                            {inc.status === 'OPEN' ? (
                              <Button
                                size="sm"
                                icon={IoCheckmarkCircleOutline}
                                onClick={() => {
                                  setResolvingItem(inc);
                                  setResolutionNote('');
                                }}
                              >
                                Xử lý
                              </Button>
                            ) : (
                              <span className="text-xs text-on-surface-variant">Đã đóng</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Giải quyết sự cố */}
      {resolvingItem && (
        <Modal isOpen={!!resolvingItem} onClose={() => setResolvingItem(null)} title="Đánh dấu đã xử lý sự cố phòng" maxWidth="max-w-md">
          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <p className="text-sm text-on-surface">
              Xử lý sự cố phòng <strong>{resolvingItem.roomNumber}</strong>: <br />
              <span className="italic text-on-surface-variant">"{resolvingItem.description}"</span>
            </p>
            <div>
              <label className="block font-label-md text-on-surface-variant mb-1.5">
                Ghi chú khắc phục sự cố <span className="text-red-500">*</span>
              </label>
              <textarea
                rows="3"
                required
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Ví dụ: Đã thay bóng đèn mới, thợ điện lạnh đã bảo dưỡng xong..."
                className="w-full px-3 py-2 border border-border-grey rounded-md focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
              <Button variant="ghost" onClick={() => setResolvingItem(null)} disabled={actionLoading}>
                Hủy
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? 'Đang lưu...' : 'Xác nhận đã khắc phục'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default RoomIncidentModal;
