import React, { useState, useEffect } from 'react';
import {
  IoAlertCircleOutline, IoCheckmarkCircleOutline, IoCloseOutline,
  IoCalendarOutline, IoMoonOutline, IoCashOutline, IoWarningOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import bookingApi from '../../services/bookingApi';

const fmt = (n) => n != null ? Number(n).toLocaleString('vi-VN') + 'đ' : '—';

/**
 * NCL-04-CN-007: Modal gia hạn thêm đêm giữa kỳ lưu trú (QTN-22)
 *
 * - Chỉ áp dụng khi booking CHECKED_IN
 * - Hiển thị khả dụng và giá từng đêm (theo mùa)
 * - Cảnh báo nếu vượt ranh giới mùa
 * - Từ chối kèm gợi ý nếu phòng bị vướng
 */
const ExtendStayModal = ({ isOpen, onClose, bookingId, booking, onSuccess }) => {
  const [nights, setNights] = useState('1');
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNights('1');
      setAvailability(null);
      setError('');
      setNote('');
    }
  }, [isOpen]);

  const handleCheck = async () => {
    const n = parseInt(nights);
    if (!n || n < 1) { setError('Nhập ít nhất 1 đêm'); return; }
    setChecking(true); setError(''); setAvailability(null);
    try {
      const data = await bookingApi.getExtendAvailability(bookingId, n);
      setAvailability(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kiểm tra khả dụng. Vui lòng thử lại.');
    } finally {
      setChecking(false);
    }
  };

  const handleExtend = async () => {
    if (!availability?.available) return;
    setExtending(true); setError('');
    try {
      await bookingApi.extendStay(bookingId, {
        additionalNights: parseInt(nights),
        note: note || undefined
      });
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
    <Modal isOpen={isOpen} onClose={onClose} title="Gia hạn thêm đêm" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Thông tin booking hiện tại */}
        <div className="bg-surface-container-low rounded p-3 text-sm flex flex-wrap gap-4">
          <div>
            <span className="text-on-surface-variant">Phòng:</span>{' '}
            <strong className="text-on-surface">{booking?.roomNumber || 'Chưa gán'}</strong>
          </div>
          <div>
            <span className="text-on-surface-variant">Trả phòng hiện tại:</span>{' '}
            <strong className="text-on-surface">{booking?.checkOutDate}</strong>
          </div>
        </div>

        {/* Input số đêm */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label="Số đêm muốn gia hạn thêm"
              type="number"
              min="1"
              max="30"
              value={nights}
              onChange={e => { setNights(e.target.value); setAvailability(null); setError(''); }}
              placeholder="1"
            />
          </div>
          <Button variant="secondary" onClick={handleCheck} isLoading={checking} className="mb-0.5">
            Kiểm tra
          </Button>
        </div>

        {/* Kết quả kiểm tra */}
        {availability && (
          <div className="space-y-3">
            {availability.available ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                  <IoCheckmarkCircleOutline size={16} />
                  Phòng còn trống. Ngày trả phòng mới: <strong>{availability.newCheckOutDate}</strong>
                </div>

                {/* NCL-04-CN-007-TC-04: Cảnh báo thay đổi mùa giá */}
                {hasSeasonChange && (
                  <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
                    <IoWarningOutline size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Lưu ý: Đêm gia hạn trải qua nhiều mức giá khác nhau.</p>
                      <p className="text-xs mt-1">Mỗi đêm được tính theo giá mùa tương ứng.</p>
                    </div>
                  </div>
                )}

                {/* Bảng giá từng đêm */}
                {availability.nightPrices?.length > 0 && (
                  <div className="bg-surface-container-lowest border border-border-grey rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-container-low">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-on-surface-variant flex items-center gap-1">
                            <IoCalendarOutline size={13} /> Ngày
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-on-surface-variant">Giá / đêm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-grey">
                        {availability.nightPrices.map((np, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-on-surface">{np.date}</td>
                            <td className="px-3 py-2 text-right font-medium text-on-surface">{fmt(np.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-border-grey bg-surface-container-low">
                        <tr>
                          <td className="px-3 py-2 font-bold text-on-surface flex items-center gap-1">
                            <IoCashOutline size={13} /> Tổng thêm
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-primary">{fmt(availability.totalAdditionalCost)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Ghi chú */}
                <Input
                  label="Ghi chú (tùy chọn)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Lý do gia hạn..."
                />
              </div>
            ) : (
              // NCL-04-CN-007-TC-02: Phòng bị vướng
              <div className="flex items-start gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
                <IoAlertCircleOutline size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Không thể gia hạn.</p>
                  {availability.conflictDate && (
                    <p className="text-xs mt-1">
                      Phòng đã có khách khác đặt từ ngày <strong>{availability.conflictDate}</strong>.
                      Vui lòng tạo đặt phòng mới nếu khách muốn ở thêm ở phòng khác.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* NCL-04-CN-007-TC-03: Cảnh báo đã trả phòng */}
        {booking?.status === 'CHECKED_OUT' && (
          <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
            <IoAlertCircleOutline size={16} />
            Kỳ lưu trú đã kết thúc. Vui lòng tạo đặt phòng mới.
          </div>
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
            icon={IoMoonOutline}
            onClick={handleExtend}
            disabled={!availability?.available}
            isLoading={extending}
          >
            Xác nhận gia hạn
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExtendStayModal;
