import React, { useState, useEffect } from 'react';
import {
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoCalendarOutline,
  IoCashOutline,
  IoWarningOutline,
  IoRefreshOutline,
  IoSwapHorizontalOutline,
  IoBedOutline,
  IoInformationCircleOutline,
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import bookingApi from '../../services/bookingApi';
import { useToast } from '../../context/ToastContext';
import { BookingResponse } from '../../types';

interface NightPriceDetail {
  date: string;
  price: number;
}

interface ReschedulePreviewResponse {
  available: boolean;
  oldTotalRoomAmount?: number;
  newTotalRoomAmount?: number;
  priceDiff?: number;
  oldDeposit?: number;
  newDeposit?: number;
  depositDiff?: number;
  nightPrices?: NightPriceDetail[];
  conflictNights?: string[];
  suggestedRooms?: Array<{ id: number; roomNumber: string; roomTypeName: string }>;
}

interface RescheduleDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
  booking?: BookingResponse | any;
  onSuccess?: () => void;
}

const fmt = (n?: number | null) => (n != null ? Number(n).toLocaleString('vi-VN') + 'đ' : '—');
const fmtDiff = (n?: number | null) => {
  if (n == null) return '—';
  const abs = Math.abs(Number(n)).toLocaleString('vi-VN');
  if (Number(n) > 0) return `+${abs}đ`;
  if (Number(n) < 0) return `-${abs}đ`;
  return '0đ';
};
const today = () => new Date().toISOString().split('T')[0];

const RescheduleDateModal: React.FC<RescheduleDateModalProps> = ({ isOpen, onClose, bookingId, booking, onSuccess }) => {
  const { success: toastSuccess } = useToast();

  const [newCheckIn, setNewCheckIn] = useState<string>('');
  const [newCheckOut, setNewCheckOut] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [preview, setPreview] = useState<ReschedulePreviewResponse | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setNewCheckIn(booking?.checkInDate || '');
      setNewCheckOut(booking?.checkOutDate || '');
      setReason('');
      setPreview(null);
      setError('');
    }
  }, [isOpen, booking]);

  const handleCheck = async () => {
    if (!newCheckIn || !newCheckOut) {
      setError('Vui lòng chọn đủ ngày nhận phòng và ngày trả phòng mới.');
      return;
    }
    if (newCheckIn < today()) {
      setError('Ngày nhận phòng mới không được sớm hơn ngày hôm nay.');
      return;
    }
    if (newCheckOut <= newCheckIn) {
      setError('Ngày trả phòng mới phải sau ngày nhận phòng mới.');
      return;
    }
    setChecking(true);
    setError('');
    setPreview(null);
    try {
      const data = await bookingApi.previewReschedule(bookingId, newCheckIn, newCheckOut);
      setPreview(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể kiểm tra lịch. Vui lòng thử lại.');
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview?.available) return;
    setConfirming(true);
    setError('');
    try {
      await bookingApi.confirmReschedule(bookingId, {
        newCheckInDate: newCheckIn,
        newCheckOutDate: newCheckOut,
        reason: reason.trim() || undefined,
      });
      toastSuccess(`Dời lịch thành công! Ngày mới: ${newCheckIn} → ${newCheckOut}`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể dời lịch. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  const priceDiffNum = preview ? Number(preview.priceDiff) : 0;
  const depositDiffNum = preview ? Number(preview.depositDiff) : 0;
  const hasSeasonChange =
    preview?.nightPrices && new Set(preview.nightPrices.map((n) => n.price)).size > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dời lịch Đặt phòng" maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-surface-container-low rounded-lg p-3.5 border border-border-grey text-xs flex flex-wrap gap-4 justify-between items-center">
          <div>
            <span className="text-on-surface-variant">Khách:</span>{' '}
            <strong className="text-on-surface">{booking?.guestName}</strong>
          </div>
          <div>
            <span className="text-on-surface-variant">Loại phòng:</span>{' '}
            <strong className="text-on-surface">{booking?.roomTypeName}</strong>
            {booking?.roomNumber && (
              <span className="ml-1 text-on-surface-variant">— Phòng {booking.roomNumber}</span>
            )}
            {!booking?.roomNumber && (
              <span className="ml-1 text-amber-600 font-medium">(Chưa gán phòng)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded border border-border-grey">
            <IoCalendarOutline size={13} className="text-on-surface-variant" />
            <span className="font-mono text-on-surface font-semibold">
              {booking?.checkInDate}
            </span>
            <span className="text-on-surface-variant">→</span>
            <span className="font-mono text-on-surface font-semibold">
              {booking?.checkOutDate}
            </span>
            <span className="text-xs text-primary font-bold">(hiện tại)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Ngày nhận phòng mới <span className="text-error">*</span>
            </label>
            <input
              type="date"
              min={today()}
              value={newCheckIn}
              onChange={(e) => {
                setNewCheckIn(e.target.value);
                setPreview(null);
                setError('');
              }}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-border-grey rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Ngày trả phòng mới <span className="text-error">*</span>
            </label>
            <input
              type="date"
              min={newCheckIn || today()}
              value={newCheckOut}
              onChange={(e) => {
                setNewCheckOut(e.target.value);
                setPreview(null);
                setError('');
              }}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-border-grey rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </div>
        </div>

        <div>
          <Button
            variant="secondary"
            icon={IoRefreshOutline}
            onClick={handleCheck}
            isLoading={checking}
            className="w-full text-xs font-semibold justify-center"
          >
            Kiểm tra khả dụng phòng & Bảng tính giá
          </Button>
        </div>

        {checking ? (
          <div className="text-center py-6 text-on-surface-variant text-sm flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 border-2 border-primary border-t-transparent border-l-transparent animate-square-spin" />
            <span className="font-semibold text-xs uppercase tracking-wider text-on-surface">Đang kiểm tra lịch trống và tính toán giá...</span>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {preview.available ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
                  <IoCheckmarkCircleOutline size={18} className="text-green-600 shrink-0" />
                  <div>
                    <span className="font-bold">Lịch đặt phòng khả dụng!</span>
                    <div className="mt-0.5 text-green-700">
                      Phòng hoàn toàn trống trong khoảng thời gian {newCheckIn} → {newCheckOut}.
                    </div>
                  </div>
                </div>

                {hasSeasonChange && (
                  <div className="flex items-start gap-2 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <IoWarningOutline size={16} className="mt-0.5 flex-shrink-0 text-orange-600" />
                    <div>
                      <p className="font-bold">Lưu ý về giá mùa:</p>
                      <p className="mt-0.5 text-orange-700">Khoảng thời gian mới có sự thay đổi theo chính sách giá mùa/cuối tuần.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-surface-container-low p-3 rounded-lg border border-border-grey space-y-1">
                    <span className="text-on-surface-variant font-medium">Tiền phòng cũ → mới:</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-on-surface-variant line-through">{fmt(preview.oldTotalRoomAmount)}</span>
                      <span className="font-bold text-sm text-primary">{fmt(preview.newTotalRoomAmount)}</span>
                    </div>
                    <div className={`font-semibold ${priceDiffNum > 0 ? 'text-amber-700' : priceDiffNum < 0 ? 'text-green-700' : 'text-on-surface-variant'}`}>
                      Chênh lệch: {fmtDiff(priceDiffNum)}
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-3 rounded-lg border border-border-grey space-y-1">
                    <span className="text-on-surface-variant font-medium">Tiền cọc quy định:</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-on-surface-variant line-through">{fmt(preview.oldDeposit)}</span>
                      <span className="font-bold text-sm text-primary">{fmt(preview.newDeposit)}</span>
                    </div>
                    <div className={`font-semibold ${depositDiffNum > 0 ? 'text-amber-700' : depositDiffNum < 0 ? 'text-green-700' : 'text-on-surface-variant'}`}>
                      Chênh lệch cọc: {fmtDiff(depositDiffNum)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Lý do dời lịch (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="VD: Khách đổi lịch bay, có việc bận đột xuất..."
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-border-grey rounded-lg text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-error bg-red-50 border border-red-200 rounded-lg p-3.5">
                  <IoAlertCircleOutline size={18} className="mt-0.5 flex-shrink-0 text-error" />
                  <div>
                    <p className="font-bold">Phòng đã bị vướng lịch trong khoảng thời gian mới!</p>
                    {preview.conflictNights && preview.conflictNights.length > 0 && (
                      <p className="mt-1 text-red-700 leading-relaxed">
                        Các đêm bị trùng lịch: <strong>{preview.conflictNights.join(', ')}</strong>.
                      </p>
                    )}
                  </div>
                </div>

                {preview.suggestedRooms && preview.suggestedRooms.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-2">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <IoBedOutline size={16} className="text-primary" />
                      <span>Gợi ý các phòng cùng loại còn trống trong khoảng ngày này:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {preview.suggestedRooms.map(r => (
                        <span key={r.id} className="px-2.5 py-1 bg-white border border-blue-200 text-blue-900 font-bold rounded">
                          Phòng {r.roomNumber} ({r.roomTypeName})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {error && (
          <div className="flex items-center gap-2 text-xs text-error bg-red-50 border border-red-200 rounded-lg p-3">
            <IoAlertCircleOutline size={16} className="shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
          <Button variant="ghost" icon={IoCloseOutline} onClick={onClose}>Đóng</Button>
          <Button
            variant="primary"
            icon={IoCalendarOutline}
            onClick={handleConfirm}
            disabled={!preview?.available || checking}
            isLoading={confirming}
          >
            Xác nhận Dời lịch
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RescheduleDateModal;
