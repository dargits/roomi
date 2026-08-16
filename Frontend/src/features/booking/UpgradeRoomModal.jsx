import React, { useState, useEffect } from 'react';
import {
  IoAlertCircleOutline, IoCheckmarkCircleOutline, IoCloseOutline,
  IoArrowUpOutline, IoArrowDownOutline, IoSwapVerticalOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { roomApi } from '../../services/roomApi';
import bookingApi from '../../services/bookingApi';

const fmt = (n) => n != null ? Number(n).toLocaleString('vi-VN') + 'đ' : '—';

/**
 * NCL-04-CN-008: Modal nâng/hạ hạng phòng giữa kỳ lưu trú (QTN-22)
 *
 * - Chỉ khi booking CHECKED_IN
 * - Hiển thị các phòng còn trống TRỌN phần thời gian còn lại + chênh lệch giá
 * - Hạ hạng: bắt buộc nhập lý do
 * - Từ chối nếu phòng chỉ trống một phần
 */
const UpgradeRoomModal = ({ isOpen, onClose, bookingId, booking, onSuccess }) => {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchAvailableRooms();
      setSelectedRoom(null);
      setReason('');
      setError('');
    }
  }, [isOpen, bookingId]);

  const fetchAvailableRooms = async () => {
    setLoadingRooms(true);
    try {
      const allRooms = await roomApi.getAllRooms();
      // Lọc phòng AVAILABLE, khác phòng hiện tại
      const filtered = (allRooms || []).filter(r =>
        r.status === 'AVAILABLE' && r.id !== booking?.roomId
      );
      setRooms(filtered);
    } catch {
      setError('Không thể tải danh sách phòng. Vui lòng thử lại.');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedRoom) return;
    const isDowngrade = selectedRoom.isDowngrade;
    if (isDowngrade && !reason.trim()) {
      setError('Vui lòng nhập lý do khi chuyển xuống hạng thấp hơn');
      return;
    }
    setProcessing(true); setError('');
    try {
      await bookingApi.upgradeRoom(bookingId, {
        newRoomId: selectedRoom.id,
        reason: reason || undefined
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể chuyển phòng. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const isDowngradeSelected = selectedRoom?.isDowngrade;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nâng/Hạ hạng phòng giữa kỳ" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Thông tin phòng hiện tại */}
        <div className="bg-surface-container-low rounded p-3 text-sm flex flex-wrap gap-4">
          <div>
            <span className="text-on-surface-variant">Phòng hiện tại:</span>{' '}
            <strong className="text-on-surface">{booking?.roomNumber || 'Chưa gán'}</strong>
          </div>
          <div>
            <span className="text-on-surface-variant">Loại phòng:</span>{' '}
            <strong className="text-on-surface">{booking?.roomTypeName}</strong>
          </div>
          <div>
            <span className="text-on-surface-variant">Trả phòng:</span>{' '}
            <strong className="text-on-surface">{booking?.checkOutDate}</strong>
          </div>
        </div>

        {/* Danh sách phòng */}
        <div>
          <p className="text-sm font-medium text-on-surface mb-3">
            Chọn phòng muốn chuyển đến{' '}
            <span className="text-xs text-on-surface-variant font-normal">
              (chỉ hiển thị phòng còn trống đến {booking?.checkOutDate})
            </span>
          </p>
          {loadingRooms ? (
            <div className="text-center py-8 text-on-surface-variant text-sm">Đang tải danh sách phòng...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-sm">
              Không có phòng trống nào khả dụng cho khoảng thời gian còn lại.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
              {rooms.map(room => {
                const isSelected = selectedRoom?.id === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoom(room)}
                    className={`p-3 rounded border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border-grey hover:border-primary/50 bg-surface-container-lowest'
                    }`}
                  >
                    <div className="font-semibold text-sm text-on-surface">Phòng {room.roomNumber}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">{room.roomTypeName}</div>
                    <div className="text-xs text-on-surface-variant">Tầng {room.floor || '?'}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* NCL-04-CN-008-TC-02: Cảnh báo phòng chỉ trống một phần sẽ bị backend từ chối */}
        {selectedRoom && (
          <div className="bg-surface-blue-light border border-primary/20 rounded p-3 text-sm space-y-1">
            <p className="text-on-surface font-medium">
              Chuyển từ <strong>{booking?.roomNumber}</strong> → <strong>Phòng {selectedRoom.roomNumber}</strong>
            </p>
            <p className="text-xs text-on-surface-variant">
              Hệ thống sẽ xác minh phòng mới còn trống trọn phần thời gian còn lại và tính chênh lệch giá.
            </p>
          </div>
        )}

        {/* NCL-04-CN-008-TC-03: Hạ hạng → bắt buộc lý do */}
        {isDowngradeSelected && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
              <IoArrowDownOutline size={16} />
              <span>Đây là chuyển xuống hạng thấp hơn. Cần nhập lý do bắt buộc.</span>
            </div>
          </div>
        )}
        {selectedRoom && (
          <Input
            label={isDowngradeSelected ? 'Lý do chuyển phòng (bắt buộc)' : 'Lý do / Ghi chú (tùy chọn)'}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="VD: Khách yêu cầu phòng view biển..."
          />
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
            <IoAlertCircleOutline size={16} /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
          <Button variant="ghost" icon={IoCloseOutline} onClick={onClose}>Đóng</Button>
          <Button
            variant="primary"
            icon={isDowngradeSelected ? IoArrowDownOutline : IoArrowUpOutline}
            onClick={handleUpgrade}
            disabled={!selectedRoom}
            isLoading={processing}
          >
            {isDowngradeSelected ? 'Xác nhận hạ hạng' : 'Xác nhận nâng hạng'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UpgradeRoomModal;
