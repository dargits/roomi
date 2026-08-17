import React, { useState, useEffect } from 'react';
import {
  IoAlertCircleOutline, IoCheckmarkCircleOutline, IoCloseOutline,
  IoCalendarOutline, IoMoonOutline, IoCashOutline, IoWarningOutline,
  IoRefreshOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import bookingApi from '../../services/bookingApi';
import { useToast } from '../../context/ToastContext';

const fmt = (n) => n != null ? Number(n).toLocaleString('vi-VN') + 'đ' : '—';

/**
 * NCL-04-CN-007: Modal gia hạn thêm đêm giữa kỳ lưu trú (QTN-22)
 *
 * - Chỉ áp dụng khi booking CHECKED_IN
 * - Tự động gọi API kiểm tra khả dụng và xung đột lịch phòng trong DB
 * - Hiển thị giá từng đêm (theo mùa/cơ bản) và tổng tiền phát sinh
 * - Cảnh báo và ngăn chặn nếu phòng bị vướng lịch booking khác
 */
const ExtendStayModal = ({ isOpen, onClose, bookingId, booking, onSuccess }) => {
  const { success: toastSuccess } = useToast();
  const [nights, setNights] = useState('1');
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setNights('1');
      setAvailability(null);
      setError('');
      setNote('');
    }
  }, [isOpen]);

  const checkNights = async (numNights) => {
    const n = parseInt(numNights);
    if (!n || n < 1) { 
      setError('Vui lòng nhập ít nhất 1 đêm gia hạn.'); 
      setAvailability(null);
      return; 
    }
    setChecking(true); 
    setError(''); 
    setAvailability(null);
    try {
      const data = await bookingApi.getExtendAvailability(bookingId, n);
      setAvailability(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kiểm tra khả dụng gia hạn. Vui lòng thử lại.');
    } finally {
      setChecking(false);
    }
  };

  const handleNightsChange = (val) => {
    setNights(val);
    if (val && parseInt(val) >= 1) {
      checkNights(val);
    } else {
      setAvailability(null);
    }
  };

  const handleExtend = async () => {
    if (!availability?.available) return;
    const n = parseInt(nights);
    if (!n || n < 1) return;

    setExtending(true); 
    setError('');
    try {
      await bookingApi.extendStay(bookingId, {
        additionalNights: n,
        note: note.trim() || undefined
      });
      toastSuccess(`Gia hạn thành công thêm ${n} đêm! Ngày trả phòng mới: ${availability.newCheckOutDate}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gia hạn. Vui lòng thử lại.');
    } finally {
      setExtending(false);
    }
  };

  const hasSeasonChange = availability?.nightPrices &&
    new Set(availability.nightPrices.map(n => n.price)).size > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gia hạn Thời gian Lưu trú" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Thông tin phòng hiện tại */}
        <div className="bg-surface-container-low rounded-lg p-3.5 border border-border-grey text-xs flex flex-wrap gap-4 justify-between items-center">
          <div>
            <span className="text-on-surface-variant">Phòng:</span>{' '}
            <strong className="text-on-surface font-title-sm">Phòng {booking?.roomNumber || 'Chưa gán'}</strong>
            <span className="text-on-surface-variant ml-1">({booking?.roomTypeName})</span>
          </div>
          <div>
            <span className="text-on-surface-variant">Trả phòng hiện tại:</span>{' '}
            <strong className="text-on-surface font-semibold">{booking?.checkOutDate}</strong>
          </div>
        </div>

        {/* Input số đêm */}
        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Số đêm muốn gia hạn thêm:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="30"
              value={nights}
              onChange={e => handleNightsChange(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-surface-container-lowest border border-border-grey rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
              placeholder="1"
            />
            <Button
              variant="secondary"
              icon={IoRefreshOutline}
              onClick={() => checkNights(nights)}
              isLoading={checking}
              className="shrink-0 text-xs"
            >
              Kiểm tra lịch
            </Button>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-1">
            Hệ thống tự động kiểm tra xem phòng có bị trùng với đặt phòng khác trong database hay không.
          </p>
        </div>

        {/* Kết quả kiểm tra */}
        {checking ? (
          <div className="text-center py-6 text-on-surface-variant text-sm flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
            <span>Đang kiểm tra lịch trống phòng trong Database...</span>
          </div>
        ) : availability ? (
          <div className="space-y-3">
            {availability.available ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
                  <IoCheckmarkCircleOutline size={18} className="text-green-600 shrink-0" />
                  <div>
                    <span className="font-bold">Phòng hoàn toàn trống và khả dụng!</span>
                    <div className="mt-0.5 text-green-700">Ngày trả phòng mới: <strong>{availability.newCheckOutDate}</strong> (+{nights} đêm)</div>
                  </div>
                </div>

                {/* Cảnh báo thay đổi mùa giá */}
                {hasSeasonChange && (
                  <div className="flex items-start gap-2 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <IoWarningOutline size={16} className="mt-0.5 flex-shrink-0 text-orange-600" />
                    <div>
                      <p className="font-bold">Lưu ý: Thời gian gia hạn trải qua nhiều mức giá mùa khác nhau.</p>
                      <p className="mt-0.5 text-orange-700">Mỗi đêm được áp dụng mức giá tương ứng theo bảng giá mùa.</p>
                    </div>
                  </div>
                )}

                {/* Bảng giá từng đêm */}
                {availability.nightPrices?.length > 0 && (
                  <div className="bg-surface-container-lowest border border-border-grey rounded-lg overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-surface-container-low border-b border-border-grey">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-on-surface-variant flex items-center gap-1">
                            <IoCalendarOutline size={13} /> Đêm ngày
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-on-surface-variant">Giá phòng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-grey">
                        {availability.nightPrices.map((np, i) => (
                          <tr key={i} className="hover:bg-surface-container-low/50">
                            <td className="px-3 py-2 text-on-surface font-mono">{np.date}</td>
                            <td className="px-3 py-2 text-right font-semibold text-on-surface">{fmt(np.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-border-grey bg-surface-container-low font-bold">
                        <tr>
                          <td className="px-3 py-2 text-on-surface flex items-center gap-1">
                            <IoCashOutline size={14} className="text-primary" /> Tiền phòng phát sinh:
                          </td>
                          <td className="px-3 py-2 text-right text-primary font-title-sm">{fmt(availability.totalAdditionalCost)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Ghi chú gia hạn */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Ghi chú gia hạn (Tùy chọn)
                  </label>
                  <Input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="VD: Khách gia hạn thêm do công tác kéo dài..."
                  />
                </div>
              </div>
            ) : (
              // Bị trùng lịch / Conflict
              <div className="flex items-start gap-2.5 text-xs text-error bg-red-50 border border-red-200 rounded-lg p-3.5">
                <IoAlertCircleOutline size={18} className="mt-0.5 flex-shrink-0 text-error" />
                <div>
                  <p className="font-bold">Không thể gia hạn phòng này!</p>
                  <p className="mt-1 text-red-700 leading-relaxed">
                    Phòng {booking?.roomNumber} đã có khách khác đặt từ ngày <strong>{availability.conflictDate || 'sắp tới'}</strong>.
                    <br />
                    Nếu khách có nhu cầu lưu trú tiếp, vui lòng tạo đơn đặt phòng mới ở một phòng trống khác.
                  </p>
                </div>
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
            icon={IoMoonOutline}
            onClick={handleExtend}
            disabled={!availability?.available || checking}
            isLoading={extending}
          >
            Xác nhận Gia hạn ({nights} đêm)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExtendStayModal;
