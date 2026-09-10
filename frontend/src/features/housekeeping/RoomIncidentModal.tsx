import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { roomIncidentApi } from '../../services/roomIncidentApi';
import { roomApi } from '../../services/roomApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  IoWarningOutline, 
  IoWarning,
  IoBuildOutline, 
  IoCheckmarkCircleOutline, 
  IoAlertCircleOutline, 
  IoAddOutline, 
  IoRefreshOutline,
  IoSearchOutline,
  IoCloseOutline,
  IoBedOutline
} from 'react-icons/io5';

interface RoomIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoom?: any;
  onIncidentReported?: (incident?: any) => void;
}

const RoomIncidentModal: React.FC<RoomIncidentModalProps> = ({ isOpen, onClose, initialRoom, onIncidentReported }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [mode, setMode] = useState<'report' | 'list'>(initialRoom ? 'report' : 'list');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomSearch, setRoomSearch] = useState<string>('');

  // Form báo sự cố
  const [roomId, setRoomId] = useState<number | string>(initialRoom?.id || '');
  const [roomNumber, setRoomNumber] = useState(initialRoom?.roomNumber || '');
  const [severity, setSeverity] = useState<'LIGHT' | 'HEAVY' | 'OUT_OF_SERVICE'>('LIGHT');
  const [description, setDescription] = useState('');

  // Lọc phòng theo từ khóa tìm kiếm
  const filteredRooms = rooms.filter((r) => {
    if (!roomSearch.trim()) return true;
    const q = roomSearch.trim().toLowerCase();
    return (
      (r.roomNumber && String(r.roomNumber).toLowerCase().includes(q)) ||
      (r.roomTypeName && r.roomTypeName.toLowerCase().includes(q)) ||
      (r.floor && String(r.floor).toLowerCase().includes(q))
    );
  });

  // Resolve state
  const [resolvingItem, setResolvingItem] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  // Tải danh sách phòng để người dùng chọn thay vì nhập tay
  useEffect(() => {
    if (isOpen) {
      roomApi.getAllRooms()
        .then((data) => setRooms(data || []))
        .catch((err) => console.error("Không thể tải danh sách phòng:", err));
    }
  }, [isOpen]);

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
        roomId: initialRoom?.id ? Number(initialRoom.id) : undefined
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

  const handleReportSubmit = async (e: React.FormEvent) => {
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
      if (res.affectedBookingsCount && res.affectedBookingsCount > 0) {
        successMsg += ` Cảnh báo: Có ${res.affectedBookingsCount} đặt phòng sắp tới bị ảnh hưởng!`;
      }
      toastSuccess(successMsg);
      setDescription('');
      fetchIncidents();
      setMode('list');
      if (onIncidentReported) onIncidentReported(res);
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi báo sự cố.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem) return;
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
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý sự cố.');
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'LIGHT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <IoWarningOutline size={13} className="text-amber-600" />
            Nhẹ (Vẫn đón khách)
          </span>
        );
      case 'HEAVY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <IoWarningOutline size={13} className="text-orange-600" />
            Nặng (Khóa bảo trì)
          </span>
        );
      case 'OUT_OF_SERVICE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <IoWarningOutline size={13} className="text-red-600" />
            Không thể phục vụ
          </span>
        );
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
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
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
            <form onSubmit={handleReportSubmit} className="space-y-4">
              {/* Bước 1: Chọn phòng để báo cáo (tương tự modal xếp phòng) */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-border-grey space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-on-surface font-semibold text-xs flex items-center gap-1.5">
                    <IoBedOutline size={16} className="text-primary" />
                    <span>Bước 1: Chọn phòng bị sự cố</span>
                    <span className="text-red-500">*</span>
                  </label>
                  {roomId && (
                    <span className="text-[11px] text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-bold">
                      Đang chọn: Phòng {roomNumber}
                    </span>
                  )}
                </div>

                {/* Ô tìm kiếm phòng */}
                {rooms.length > 0 && (
                  <div className="relative">
                    <IoSearchOutline 
                      size={16} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 pointer-events-none" 
                    />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo số phòng, tầng, loại phòng..."
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 rounded-lg border border-border-grey bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                    {roomSearch && (
                      <button
                        type="button"
                        onClick={() => setRoomSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container-low transition-colors cursor-pointer"
                        title="Xóa tìm kiếm"
                      >
                        <IoCloseOutline size={15} />
                      </button>
                    )}
                  </div>
                )}

                {/* Grid danh sách phòng để chọn */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[190px] overflow-y-auto pr-1">
                  {filteredRooms.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-xs text-on-surface-variant">
                      Không tìm thấy phòng nào phù hợp với "{roomSearch}"
                    </div>
                  ) : (
                    filteredRooms.map((r) => {
                      const isSelected = String(roomId) === String(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setRoomId(r.id);
                            setRoomNumber(r.roomNumber);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs'
                              : 'border-border-grey bg-surface hover:bg-surface-container-low hover:border-primary/40'
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <div className={`font-bold text-xs ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                              Phòng {r.roomNumber}
                            </div>
                            <div className="text-[10px] text-on-surface-variant truncate">
                              {r.roomTypeName || 'Tiêu chuẩn'}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bước 2: Chọn mức độ nghiêm trọng & nhập mô tả */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-border-grey space-y-3">
                <label className="font-label-md text-on-surface font-semibold text-xs flex items-center gap-1.5">
                  <IoWarningOutline size={16} className="text-amber-600" />
                  <span>Bước 2: Mức độ nghiêm trọng & Mô tả chi tiết</span>
                  <span className="text-red-500">*</span>
                </label>

                {/* Card Options chọn mức độ có icon tam giác màu sắc tương ứng */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Mức nhẹ */}
                  <button
                    type="button"
                    onClick={() => setSeverity('LIGHT')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      severity === 'LIGHT'
                        ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-300/40 shadow-xs'
                        : 'border-border-grey bg-surface hover:border-amber-300/60'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <IoWarning size={17} className="text-amber-500" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-amber-900">Mức Nhẹ</div>
                      <div className="text-[10.5px] text-amber-800/80 leading-tight mt-0.5">
                        Vẫn đưa về sẵn sàng, gắn cờ chờ xử lý
                      </div>
                    </div>
                  </button>

                  {/* Mức nặng */}
                  <button
                    type="button"
                    onClick={() => setSeverity('HEAVY')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      severity === 'HEAVY'
                        ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-300/40 shadow-xs'
                        : 'border-border-grey bg-surface hover:border-orange-300/60'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                      <IoWarning size={17} className="text-orange-500" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-orange-900">Mức Nặng</div>
                      <div className="text-[10.5px] text-orange-800/80 leading-tight mt-0.5">
                        Khóa phòng bảo trì, cảnh báo booking ảnh hưởng
                      </div>
                    </div>
                  </button>

                  {/* Mức Không thể phục vụ */}
                  <button
                    type="button"
                    onClick={() => setSeverity('OUT_OF_SERVICE')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      severity === 'OUT_OF_SERVICE'
                        ? 'border-red-500 bg-red-50/70 ring-2 ring-red-300/40 shadow-xs'
                        : 'border-border-grey bg-surface hover:border-red-300/60'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                      <IoWarning size={17} className="text-red-600" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-red-900">Không thể phục vụ</div>
                      <div className="text-[10.5px] text-red-800/80 leading-tight mt-0.5">
                        Khóa bảo trì khẩn cấp, cần xử lý ngay
                      </div>
                    </div>
                  </button>
                </div>

                {severity !== 'LIGHT' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                    <IoAlertCircleOutline size={18} className="shrink-0 mt-0.5 text-red-600" />
                    <span>
                      <strong>Cảnh báo nghiệp vụ (NCL-06-CN-006):</strong> Khi báo mức độ Nặng hoặc Không thể phục vụ, phòng sẽ tự động chuyển sang trạng thái <strong>Khóa bảo trì (MAINTENANCE)</strong>. Hệ thống sẽ kiểm tra và cảnh báo số lượng đặt phòng sắp tới bị ảnh hưởng để lễ tân chủ động đổi phòng cho khách!
                    </span>
                  </div>
                )}

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1.5 text-xs font-semibold">
                    Mô tả sự cố chi tiết <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ví dụ: Máy lạnh chảy nước nhiều, Vỡ bóng đèn phòng tắm, Ổ khóa cửa chính bị kẹt không mở được..."
                    className="w-full px-3 py-2 border border-border-grey rounded-xl focus:ring-2 focus:ring-primary text-xs bg-surface"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button type="submit" disabled={actionLoading || !roomId} icon={IoWarningOutline}>
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
                    <tr><td colSpan={7} className="p-6 text-center text-on-surface-variant">Đang tải danh sách sự cố...</td></tr>
                  ) : incidents.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-on-surface-variant">Không có báo cáo sự cố nào.</td></tr>
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
                rows={3}
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
