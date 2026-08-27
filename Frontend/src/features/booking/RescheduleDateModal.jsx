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

const fmt = (n) => (n != null ? Number(n).toLocaleString('vi-VN') + 'đ' : '—');
const fmtDiff = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(Number(n)).toLocaleString('vi-VN');
  if (Number(n) > 0) return `+${abs}đ`;
  if (Number(n) < 0) return `-${abs}đ`;
  return '0đ';
};
const today = () => new Date().toISOString().split('T')[0];

/**
 * NCL-04-CN-NEW: Modal dời lịch đặt phòng chưa nhận phòng (NEW/CONFIRMED)
 *
 * Luồng:
 *  1. Lễ tân nhập ngày nhận phòng mới + ngày trả phòng mới
 *  2. Nhấn "Kiểm tra lịch" → gọi previewReschedule (KHÔNG lưu DB)
 *  3. Hệ thống hiển thị:
 *     - Phòng còn trống → bảng so sánh tiền + cọc → nhập lý do (optional) → Xác nhận
 *     - Phòng bị trùng → liệt kê đêm xung đột + phòng gợi ý (không tự chọn)
 */
const RescheduleDateModal = ({ isOpen, onClose, bookingId, booking, onSuccess }) => {
  const { success: toastSuccess } = useToast();

  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  // Reset state khi mở modal
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
    } catch (err) {
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
    } catch (err) {
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

        {/* Thông tin hiện tại */}
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

        {/* Input ngày mới */}
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
              className="w-full px-3 py-2.5 bg-surface-container-lowest border border-border-grey rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
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
              className="w-full px-3 py-2.5 bg-surface-container-lowest border border-border-grey rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            icon={IoRefreshOutline}
            onClick={handleCheck}
            isLoading={checking}
            disabled={!newCheckIn || !newCheckOut}
          >
            Kiểm tra lịch phòng
          </Button>
        </div>

        {/* Loading */}
        {checking && (
          <div className="text-center py-5 text-on-surface-variant text-sm flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            <span>Đang kiểm tra lịch phòng trong cơ sở dữ liệu...</span>
          </div>
        )}

        {/* Kết quả preview */}
        {!checking && preview && (
          <div className="space-y-4">
            {/* --- AVAILABLE --- */}
            {preview.available ? (
              <>
                {/* Badge khả dụng */}
                <div className="flex items-center gap-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
                  <IoCheckmarkCircleOutline size={18} className="text-green-600 shrink-0" />
                  <div>
                    <span className="font-bold">
                      {booking?.roomNumber
                        ? `Phòng ${booking.roomNumber} hoàn toàn trống trong khoảng ngày mới!`
                        : 'Khoảng ngày hợp lệ. Booking chưa gán phòng sẽ sử dụng lịch mới.'}
                    </span>
                    <div className="mt-0.5 text-green-700">
                      Ngày mới:{' '}
                      <strong>
                        {newCheckIn} → {newCheckOut}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Cảnh báo nhiều mức giá mùa */}
                {hasSeasonChange && (
                  <div className="flex items-start gap-2 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <IoWarningOutline size={16} className="mt-0.5 flex-shrink-0 text-orange-600" />
                    <div>
                      <p className="font-bold">Lưu ý: Khoảng ngày mới trải qua nhiều mức giá mùa.</p>
                      <p className="mt-0.5 text-orange-700">
                        Mỗi đêm được áp dụng mức giá tương ứng theo bảng giá mùa.
                      </p>
                    </div>
                  </div>
                )}

                {/* Bảng so sánh tiền phòng */}
                <div className="bg-surface-container-lowest border border-border-grey rounded-lg overflow-hidden text-xs">
                  <div className="bg-surface-container-low border-b border-border-grey px-3 py-2 font-semibold text-on-surface flex items-center gap-1.5">
                    <IoCashOutline size={14} className="text-primary" />
                    So sánh tiền phòng
                  </div>
                  <table className="w-full">
                    <thead className="border-b border-border-grey">
                      <tr className="text-on-surface-variant">
                        <th className="text-left px-3 py-2 font-semibold">Tiền phòng cũ</th>
                        <th className="text-left px-3 py-2 font-semibold">Tiền phòng mới</th>
                        <th className="text-left px-3 py-2 font-semibold">Chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-on-surface">
                          {fmt(preview.oldPrice)}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-primary">
                          {fmt(preview.newPrice)}
                        </td>
                        <td
                          className={`px-3 py-2.5 font-bold ${
                            priceDiffNum > 0
                              ? 'text-red-600'
                              : priceDiffNum < 0
                              ? 'text-green-600'
                              : 'text-on-surface'
                          }`}
                        >
                          {fmtDiff(preview.priceDiff)}
                          {priceDiffNum > 0 && (
                            <span className="ml-1 text-red-500 font-normal">(tăng)</span>
                          )}
                          {priceDiffNum < 0 && (
                            <span className="ml-1 text-green-600 font-normal">(giảm)</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bảng giá từng đêm */}
                {preview.nightPrices?.length > 0 && (
                  <div className="bg-surface-container-lowest border border-border-grey rounded-lg overflow-hidden text-xs max-h-44 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-surface-container-low border-b border-border-grey sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-on-surface-variant flex items-center gap-1">
                            <IoCalendarOutline size={13} /> Đêm ngày (mới)
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-on-surface-variant">
                            Giá phòng
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-grey">
                        {preview.nightPrices.map((np, i) => (
                          <tr key={i} className="hover:bg-surface-container-low/50">
                            <td className="px-3 py-2 text-on-surface font-mono">{np.date}</td>
                            <td className="px-3 py-2 text-right font-semibold text-on-surface">
                              {fmt(np.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Thông tin cọc */}
                <div className="bg-surface-container-lowest border border-border-grey rounded-lg overflow-hidden text-xs">
                  <div className="bg-surface-container-low border-b border-border-grey px-3 py-2 font-semibold text-on-surface flex items-center gap-1.5">
                    <IoInformationCircleOutline size={14} className="text-primary" />
                    Thông tin đặt cọc
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-border-grey">
                      <tr>
                        <td className="px-3 py-2 text-on-surface-variant">Cọc đã thu hiệu lực</td>
                        <td className="px-3 py-2 text-right font-semibold text-on-surface">
                          {fmt(preview.collectedDeposit)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-on-surface-variant">Mức cọc yêu cầu mới</td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">
                          {fmt(preview.newRequiredDeposit)}
                        </td>
                      </tr>
                      <tr className="font-bold">
                        <td className="px-3 py-2 text-on-surface">
                          {depositDiffNum > 0 ? '⚠ Cọc còn thiếu' : depositDiffNum < 0 ? '✓ Cọc dư ra' : 'Cọc đủ'}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${
                            depositDiffNum > 0
                              ? 'text-red-600'
                              : depositDiffNum < 0
                              ? 'text-green-600'
                              : 'text-on-surface'
                          }`}
                        >
                          {fmtDiff(preview.depositDiff)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {depositDiffNum !== 0 && (
                    <div className="px-3 py-2 text-[11px] text-on-surface-variant border-t border-border-grey">
                      {depositDiffNum > 0
                        ? 'Phần thiếu sẽ được xử lý ở bước Thu cọc — hệ thống không tự động thu thêm.'
                        : 'Phần dư sẽ được xử lý ở bước Hoàn cọc — hệ thống không tự động hoàn bớt.'}
                    </div>
                  )}
                </div>

                {/* Lý do dời lịch (tùy chọn) */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Lý do dời lịch{' '}
                    <span className="font-normal text-on-surface-variant">(Tùy chọn)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="VD: Khách đổi lịch công tác, xin dời thêm 2 ngày..."
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-border-grey rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
              </>
            ) : (
              /* --- CONFLICT --- */
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-error bg-red-50 border border-red-200 rounded-lg p-3.5">
                  <IoAlertCircleOutline size={18} className="mt-0.5 flex-shrink-0 text-error" />
                  <div>
                    <p className="font-bold">
                      Phòng {booking?.roomNumber} bị vướng lịch trong khoảng ngày mới!
                    </p>
                    {preview.conflictDates?.length > 0 && (
                      <p className="mt-1 text-red-700">
                        <span className="font-semibold">Các đêm bị trùng: </span>
                        {preview.conflictDates.join(', ')}
                      </p>
                    )}
                    {preview.conflictBookingId && (
                      <p className="mt-0.5 text-red-700">
                        Xung đột với Đặt phòng #{preview.conflictBookingId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phòng gợi ý */}
                {preview.alternativeRooms?.length > 0 && (
                  <div className="bg-surface-container-lowest border border-border-grey rounded-lg overflow-hidden text-xs">
                    <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 font-semibold text-amber-800 flex items-center gap-1.5">
                      <IoBedOutline size={14} />
                      Phòng cùng loại còn trống trọn khoảng ngày mới
                    </div>
                    <table className="w-full">
                      <thead className="border-b border-border-grey">
                        <tr className="text-on-surface-variant">
                          <th className="text-left px-3 py-2 font-semibold">Phòng</th>
                          <th className="text-left px-3 py-2 font-semibold">Loại phòng</th>
                          <th className="text-left px-3 py-2 font-semibold">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-grey">
                        {preview.alternativeRooms.map((r) => (
                          <tr key={r.roomId} className="hover:bg-surface-container-low/40">
                            <td className="px-3 py-2 font-semibold text-on-surface">
                              Phòng {r.roomNumber}
                            </td>
                            <td className="px-3 py-2 text-on-surface-variant">{r.roomTypeName}</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[11px] font-medium">
                                Trống
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 text-[11px] text-on-surface-variant border-t border-border-grey bg-surface-container-low">
                      <IoSwapHorizontalOutline
                        size={11}
                        className="inline mr-1 text-on-surface-variant"
                      />
                      Vui lòng dùng tính năng <strong>Đổi phòng</strong> để chuyển sang một trong các
                      phòng trên, rồi thực hiện Dời lịch lại.
                    </div>
                  </div>
                )}

                {preview.alternativeRooms?.length === 0 && (
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant bg-surface-container-low border border-border-grey rounded-lg p-3">
                    <IoInformationCircleOutline size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Không có phòng cùng loại nào còn trống trọn khoảng ngày mới. Vui lòng chọn
                      khoảng ngày khác.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-error bg-red-50 border border-red-200 rounded-lg p-3">
            <IoAlertCircleOutline size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
          <Button variant="ghost" icon={IoCloseOutline} onClick={onClose}>
            Đóng
          </Button>
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
