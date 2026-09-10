import React, { useState, useEffect } from 'react';
import {
  IoAlertCircleOutline, IoCheckmarkCircleOutline, IoCloseOutline,
  IoSwapVerticalOutline,
  IoBedOutline, IoPeopleOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { roomTypeApi } from '../../services/roomTypeApi';
import bookingApi from '../../services/bookingApi';
import { useToast } from '../../context/ToastContext';
import { BookingResponse, RoomTypeResponse } from '../../types';

interface ExtendedRoomType extends RoomTypeResponse {
  isDowngrade?: boolean;
}

interface UpgradeRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
  booking?: BookingResponse | any;
  onSuccess?: () => void;
}

const fmt = (n?: number | null) => n != null ? Number(n).toLocaleString('vi-VN') + 'đ' : '—';

const UpgradeRoomModal: React.FC<UpgradeRoomModalProps> = ({ isOpen, onClose, bookingId, booking, onSuccess }) => {
  const { success: toastSuccess } = useToast();
  const [roomTypes, setRoomTypes] = useState<ExtendedRoomType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRoomType, setSelectedRoomType] = useState<ExtendedRoomType | null>(null);
  const [reason, setReason] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchRoomTypes();
      setSelectedRoomType(null);
      setReason('');
      setError('');
    }
  }, [isOpen, bookingId]);

  const fetchRoomTypes = async () => {
    setLoading(true);
    try {
      const allTypes = await roomTypeApi.getAllRoomTypes();
      const filtered = (allTypes || []).filter(rt =>
        rt.id !== booking?.roomTypeId && String(rt.id) !== String(booking?.roomTypeId) && rt.active !== false
      );
      setRoomTypes(filtered);
    } catch {
      setError('Không thể tải danh sách loại phòng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedRoomType) {
      setError('Vui lòng chọn loại phòng muốn nâng/hạ sang');
      return;
    }

    const isDowngrade = selectedRoomType.isDowngrade;
    if (isDowngrade && !reason.trim()) {
      setError('Vui lòng nhập lý do khi chuyển xuống hạng phòng thấp hơn!');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const res = await bookingApi.upgradeRoom(bookingId, {
        newRoomTypeId: selectedRoomType.id,
        reason: reason.trim() || undefined
      });
      toastSuccess(`Chuyển hạng phòng thành công sang ${selectedRoomType.name}${res?.roomNumber ? ` (Phòng mới: ${res.roomNumber})` : ''}!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể chuyển hạng phòng. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nâng / Hạ Hạng Phòng" maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-surface-container-low rounded-lg p-3.5 border border-border-grey text-xs flex flex-wrap gap-4 justify-between items-center">
          <div>
            <span className="text-on-surface-variant">Phòng hiện tại:</span>{' '}
            <strong className="text-on-surface font-title-sm">Phòng {booking?.roomNumber || 'Chưa gán'}</strong>
          </div>
          <div>
            <span className="text-on-surface-variant">Hạng hiện tại:</span>{' '}
            <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">{booking?.roomTypeName}</span>
          </div>
          <div>
            <span className="text-on-surface-variant">Thời gian còn lại:</span>{' '}
            <strong className="text-on-surface">Đến {booking?.checkOutDate}</strong>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2.5">
            <p className="text-xs font-semibold text-on-surface">
              Chọn hạng phòng muốn nâng / hạ sang:
            </p>
            <span className="text-[11px] text-on-surface-variant">
              (Hệ thống tự động tìm và gán phòng trống khả dụng)
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-on-surface-variant text-sm">Đang tải danh sách hạng phòng...</div>
          ) : roomTypes.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-sm bg-surface-container-lowest border border-border-grey rounded-lg">
              Không có hạng phòng nào khác đang khả dụng trong hệ thống.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {roomTypes.map(rt => {
                const isSelected = selectedRoomType?.id === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => {
                      setSelectedRoomType(rt);
                      if (error) setError('');
                    }}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-border-grey hover:border-primary/40 bg-surface-container-lowest'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                        <IoBedOutline className="text-primary text-base" />
                        <span>{rt.name}</span>
                      </div>
                      {isSelected && (
                        <IoCheckmarkCircleOutline size={18} className="text-primary shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1.5">
                      <span className="font-bold text-primary">{fmt(rt.basePrice)}<span className="text-[10px] font-normal text-on-surface-variant">/đêm</span></span>
                      {rt.maxCapacity && (
                        <span className="flex items-center gap-1 text-[11px] bg-surface-container-low px-1.5 py-0.5 rounded">
                          <IoPeopleOutline size={13} /> {rt.maxCapacity} người
                        </span>
                      )}
                    </div>

                    {rt.amenitiesDescription && (
                      <div className="text-[11px] text-on-surface-variant/80 mt-1 line-clamp-1 italic">
                        {rt.amenitiesDescription}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedRoomType && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <IoSwapVerticalOutline size={16} className="text-primary" />
              <span>Chuyển từ {booking?.roomTypeName} (Phòng {booking?.roomNumber}) → Hạng {selectedRoomType.name}</span>
            </div>
            <p className="text-blue-800 text-[11px] leading-relaxed">
              • Hệ thống sẽ tự động tìm 1 phòng trống khả dụng thuộc hạng <strong>{selectedRoomType.name}</strong>, tự động chuyển phòng cũ sang <strong>Cần dọn</strong> và phòng mới sang <strong>Đang ở</strong>.
              <br />
              • Chênh lệch tiền phòng cho các đêm còn lại sẽ được tự động tính và cập nhật vào hóa đơn.
            </p>
          </div>
        )}

        {selectedRoomType && (
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Lý do đổi hạng phòng {selectedRoomType.isDowngrade ? <span className="text-error">* (Bắt buộc khi hạ hạng)</span> : <span className="text-on-surface-variant font-normal">(Tùy chọn)</span>}
            </label>
            <Input
              value={reason}
              onChange={e => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="VD: Khách có nhu cầu không gian rộng hơn, đổi theo yêu cầu..."
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-error bg-red-50 border border-red-200 rounded-lg p-3">
            <IoAlertCircleOutline size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
          <Button variant="ghost" icon={IoCloseOutline} onClick={onClose}>Đóng</Button>
          <Button
            variant="primary"
            icon={IoSwapVerticalOutline}
            onClick={handleUpgrade}
            disabled={!selectedRoomType}
            isLoading={processing}
          >
            Xác nhận Chuyển Hạng Phòng
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UpgradeRoomModal;
