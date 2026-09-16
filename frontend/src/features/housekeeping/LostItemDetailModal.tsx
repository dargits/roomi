import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { lostItemApi } from '../../services/lostItemApi';
import { LostItem, LostItemLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { extractErrorMessage } from '../../services/api';
import {
  IoTimeOutline,
  IoPersonOutline,
  IoCallOutline,
  IoMailOutline,
  IoBedOutline,
  IoLocationOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoWarningOutline,
  IoTrashOutline,
  IoCubeOutline,
  IoHandRightOutline,
  IoCheckmarkDoneOutline,
  IoChatboxEllipsesOutline,
} from 'react-icons/io5';

interface LostItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number | null;
  onOpenReturn?: (item: LostItem) => void;
  onOpenDispose?: (item: LostItem) => void;
  onItemUpdated?: (updated: LostItem) => void;
}

const LostItemDetailModal: React.FC<LostItemDetailModalProps> = ({
  isOpen,
  onClose,
  itemId,
  onOpenReturn,
  onOpenDispose,
  onItemUpdated,
}) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [item, setItem] = useState<LostItem | null>(null);
  const [logs, setLogs] = useState<LostItemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [showContactInput, setShowContactInput] = useState(false);
  const [contactNote, setContactNote] = useState('');

  const isFrontDeskOrAdmin =
    user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST';

  useEffect(() => {
    if (isOpen && itemId) {
      loadData(itemId);
    } else {
      setItem(null);
      setLogs([]);
      setShowContactInput(false);
      setContactNote('');
    }
  }, [isOpen, itemId]);

  const loadData = async (id: number) => {
    try {
      setLoading(true);
      const [itemData, logsData] = await Promise.all([
        lostItemApi.getById(id),
        lostItemApi.getLogs(id),
      ]);
      setItem(itemData);
      setLogs(logsData || []);
    } catch (err: any) {
      toastError(extractErrorMessage(err, 'Không thể tải thông tin món đồ.'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkContacted = async () => {
    if (!item) return;
    try {
      setContacting(true);
      const updated = await lostItemApi.markContacted(item.id, contactNote.trim() || undefined);
      toastSuccess('Đã cập nhật trạng thái: Đã liên hệ với khách hàng!');
      setItem(updated);
      setShowContactInput(false);
      setContactNote('');
      const logsData = await lostItemApi.getLogs(item.id);
      setLogs(logsData || []);
      if (onItemUpdated) onItemUpdated(updated);
    } catch (err: any) {
      toastError(extractErrorMessage(err, 'Không thể cập nhật trạng thái liên hệ.'));
    } finally {
      setContacting(false);
    }
  };

  if (!item && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết món đồ để quên" maxWidth="max-w-2xl">
        <div className="py-12 text-center text-slate-500">Đang tải dữ liệu...</div>
      </Modal>
    );
  }

  if (!item) return null;

  const getStatusBadge = (status: string, isExpired?: boolean) => {
    if (status === 'HOLDING') {
      if (isExpired) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300">
            <IoWarningOutline className="w-3.5 h-3.5" /> Quá hạn lưu giữ
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300">
          <IoCubeOutline className="w-3.5 h-3.5" /> Đang lưu giữ
        </span>
      );
    }
    if (status === 'CONTACTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300">
          <IoChatboxEllipsesOutline className="w-3.5 h-3.5" /> Đã liên hệ khách
        </span>
      );
    }
    if (status === 'RETURNED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
          <IoCheckmarkDoneOutline className="w-3.5 h-3.5" /> Đã trả cho khách
        </span>
      );
    }
    if (status === 'DISPOSED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300">
          <IoTrashOutline className="w-3.5 h-3.5" /> Đã xử lý theo chính sách
        </span>
      );
    }
    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Hồ sơ đồ để quên #${item.id} - Phòng ${item.roomNumber}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Header summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg shrink-0">
              P.{item.roomNumber}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                {item.itemName}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Vị trí: <strong>{item.foundLocation}</strong></span>
                <span>•</span>
                <span>Ngày tìm thấy: <strong>{item.foundDate} {item.foundTime || ''}</strong></span>
              </div>
            </div>
          </div>
          <div>{getStatusBadge(item.status, item.isExpired)}</div>
        </div>

        {/* 2 Cột: Thông tin món đồ & Thông tin khách hàng liên kết */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cột 1: Chi tiết lưu giữ */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <IoCubeOutline className="w-4 h-4 text-emerald-600" />
              Thông tin lưu giữ & Quản lý
            </h4>
            <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Nơi cất giữ:</span>
                <span className="font-medium text-right">{item.storageLocation || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Hạn lưu giữ tối đa:</span>
                <span className={`font-medium ${item.isExpired ? 'text-rose-600 font-bold' : ''}`}>
                  {item.retentionExpiryDate || 'Theo quy định 30 ngày'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Người ghi nhận:</span>
                <span className="font-medium">{item.createdByName || 'Buồng phòng'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Thời điểm tạo:</span>
                <span className="font-medium">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-'}
                </span>
              </div>
            </div>

            {item.imageUrl && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 mb-1">Ảnh chụp hiện trường:</div>
                <img
                  src={item.imageUrl}
                  alt={item.itemName}
                  className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                />
              </div>
            )}
          </div>

          {/* Cột 2: Thông tin chủ nhân có khả năng (Booking vừa checkout) */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <IoPersonOutline className="w-4 h-4 text-blue-600" />
              Khách hàng liên quan (Lần lưu trú gần nhất)
            </h4>

            {item.guestName ? (
              <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{item.guestName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Số điện thoại:</span>
                  {item.guestPhone ? (
                    <a
                      href={`tel:${item.guestPhone}`}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <IoCallOutline className="w-3.5 h-3.5" />
                      {item.guestPhone}
                    </a>
                  ) : (
                    <span>Không có</span>
                  )}
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium">{item.guestEmail || 'Không có'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Lưu trú:</span>
                  <span className="font-medium">
                    {item.checkInDate} → {item.checkOutDate}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Checkout lúc:</span>
                  <span className="font-medium">
                    {item.checkedOutAt ? new Date(item.checkedOutAt).toLocaleString('vi-VN') : 'Đã checkout'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs italic">
                Không tìm thấy lượt checkout gần đây của phòng này (phòng trống trước đó). Lễ tân có thể tra cứu danh sách đặt phòng để đối chiếu.
              </div>
            )}
          </div>
        </div>

        {/* Khối thông tin kết quả (Trả đồ hoặc Xử lý quá hạn) */}
        {item.status === 'RETURNED' && (
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <IoCheckmarkDoneOutline className="w-4 h-4 text-emerald-600" />
              Thông tin bàn giao cho khách
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-900 dark:text-emerald-200">
              <div>
                <span className="text-emerald-700/80 dark:text-emerald-400">Người nhận: </span>
                <strong className="font-bold">{item.receiverName}</strong>
                {item.receiverPhone && ` (${item.receiverPhone})`}
              </div>
              <div>
                <span className="text-emerald-700/80 dark:text-emerald-400">Lễ tân bàn giao: </span>
                <strong>{item.returnedByName || 'Lễ tân'}</strong>
              </div>
              <div>
                <span className="text-emerald-700/80 dark:text-emerald-400">Thời điểm trả: </span>
                <strong>
                  {item.returnedAt ? new Date(item.returnedAt).toLocaleString('vi-VN') : '-'}
                </strong>
              </div>
            </div>
            {item.receiverNote && (
              <div className="text-xs text-emerald-800 dark:text-emerald-300 pt-1">
                <em>Ghi chú bàn giao: {item.receiverNote}</em>
              </div>
            )}
          </div>
        )}

        {item.status === 'DISPOSED' && (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <IoTrashOutline className="w-4 h-4 text-rose-600" />
              Thông tin xử lý quá hạn theo chính sách
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-800 dark:text-slate-200">
              <div>
                <span className="text-slate-500">Hình thức xử lý: </span>
                <strong className="font-bold text-rose-600 dark:text-rose-400">{item.disposalMethod}</strong>
              </div>
              <div>
                <span className="text-slate-500">Người thực hiện: </span>
                <strong>{item.disposedByName || 'Quản lý'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Thời điểm xử lý: </span>
                <strong>
                  {item.disposedAt ? new Date(item.disposedAt).toLocaleString('vi-VN') : '-'}
                </strong>
              </div>
            </div>
            {item.disposalNote && (
              <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                <em>Biên bản / Lý do: {item.disposalNote}</em>
              </div>
            )}
          </div>
        )}

        {/* Form nhập nhanh ghi chú liên hệ khách */}
        {showContactInput && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
              Ghi chú cuộc gọi / tin nhắn liên hệ khách:
            </label>
            <input
              type="text"
              placeholder="VD: Đã gọi điện khách hẹn chiều mai ghé nhận lại..."
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowContactInput(false)}>
                Đóng
              </Button>
              <Button
                size="sm"
                variant="primary"
                isLoading={contacting}
                onClick={handleMarkContacted}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Xác nhận đã liên hệ
              </Button>
            </div>
          </div>
        )}

        {/* Timeline nhật ký kiểm toán vòng đời món đồ */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <IoTimeOutline className="w-4 h-4 text-emerald-600" />
            Nhật ký vòng đời (Audit Trail)
          </h4>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {logs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.action === 'CREATED' && 'Ghi nhận món đồ để quên'}
                      {log.action === 'CONTACTED_GUEST' && 'Đã liên hệ với khách hàng'}
                      {log.action === 'RETURNED_TO_GUEST' && 'Bàn giao trả cho khách'}
                      {log.action === 'DISPOSED' && 'Xử lý quá hạn theo chính sách'}
                      {!['CREATED', 'CONTACTED_GUEST', 'RETURNED_TO_GUEST', 'DISPOSED'].includes(log.action) && log.action}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : ''}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">{log.notes}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Thực hiện bởi: <strong className="text-slate-500 dark:text-slate-300">{log.performedByName}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng
          </Button>

          {isFrontDeskOrAdmin && item.status !== 'RETURNED' && item.status !== 'DISPOSED' && (
            <div className="flex items-center gap-2">
              {item.status === 'HOLDING' && !showContactInput && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowContactInput(true)}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                >
                  <IoChatboxEllipsesOutline className="w-4 h-4 mr-1" />
                  Đã liên hệ khách
                </Button>
              )}

              {onOpenDispose && (item.isExpired || item.status === 'CONTACTED') && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenDispose(item)}
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  <IoTrashOutline className="w-4 h-4 mr-1" />
                  Xử lý quá hạn
                </Button>
              )}

              {onOpenReturn && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => onOpenReturn(item)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <IoCheckmarkDoneOutline className="w-4 h-4 mr-1" />
                  Bàn giao trả cho khách
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LostItemDetailModal;
