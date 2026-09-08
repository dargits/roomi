import React, { useState, useEffect } from 'react';
import { 
  IoCloseOutline, 
  IoCheckmarkCircleOutline, 
  IoAlertCircleOutline,
  IoBedOutline,
  IoReceiptOutline,
  IoInformationCircleOutline,
  IoWarningOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import groupBookingApi from '../../services/groupBookingApi';
import { useToast, useConfirm } from '../../context/ToastContext';

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const BulkCheckOutModal = ({ isOpen, onClose, group, onSuccess }) => {
  const { toastSuccess, toastError, toastWarning } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [selectedBookingIds, setSelectedBookingIds] = useState(new Set());
  const [resultData, setResultData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSummary = async () => {
    if (!group?.id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await groupBookingApi.getBulkCheckOutSummary(group.id);
      setSummaryData(data);
      // Mặc định chọn các phòng đủ điều kiện checkout
      const initialSelected = new Set();
      data.rooms?.forEach((room) => {
        if (room.canCheckOut) {
          initialSelected.add(room.bookingId);
        }
      });
      setSelectedBookingIds(initialSelected);
    } catch (err) {
      console.error('Lỗi khi tải tóm tắt trả phòng đoàn:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải thông tin trả phòng đoàn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && group?.id) {
      setResultData(null);
      fetchSummary();
    }
  }, [isOpen, group]);

  const handleToggleRoom = (bookingId) => {
    const next = new Set(selectedBookingIds);
    if (next.has(bookingId)) {
      next.delete(bookingId);
    } else {
      next.add(bookingId);
    }
    setSelectedBookingIds(next);
  };

  const handleSelectAllEligible = () => {
    const next = new Set();
    summaryData?.rooms?.forEach((room) => {
      if (room.canCheckOut) {
        next.add(room.bookingId);
      }
    });
    setSelectedBookingIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedBookingIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedBookingIds.size === 0) {
      toastWarning('Vui lòng chọn ít nhất một phòng để trả phòng.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Xác nhận trả phòng đoàn',
      message: `Bạn có chắc chắn muốn trả phòng cho ${selectedBookingIds.size} phòng đã chọn trong đoàn?`,
      confirmText: 'Trả phòng',
      cancelText: 'Hủy',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setProcessing(true);
    setErrorMsg('');
    try {
      const payload = { bookingIds: Array.from(selectedBookingIds) };
      const res = await groupBookingApi.bulkCheckOut(group.id, payload);
      setResultData(res);
      if (res.successfulRooms?.length > 0) {
        toastSuccess(`Đã trả phòng thành công cho ${res.successfulRooms.length} phòng!`);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Lỗi khi trả phòng đoàn:', err);
      setErrorMsg(err.response?.data?.message || 'Lỗi khi thực hiện trả phòng đoàn.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinish = () => {
    onClose();
  };

  if (!isOpen || !group) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trả phòng hàng loạt & Chốt hóa đơn đoàn"
      maxWidth="max-w-5xl"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <IoAlertCircleOutline size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-on-surface-variant text-sm">
            Đang tải dữ liệu quyết toán và kiểm tra dịch vụ các phòng trong đoàn...
          </div>
        ) : resultData ? (
          /* Màn hình hiển thị kết quả sau khi checkout */
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-800 font-bold text-base mb-1">
                <IoCheckmarkCircleOutline size={22} className="text-green-600" />
                <span>Kết quả xử lý trả phòng đoàn</span>
              </div>
              <p className="text-sm text-green-700">
                Đã xử lý xong: <strong>{resultData.successfulRooms?.length || 0}</strong> phòng thành công
                {resultData.failedRooms?.length > 0 && (
                  <span>, <strong>{resultData.failedRooms.length}</strong> phòng chưa thể trả phòng.</span>
                )}
              </p>
              {resultData.groupCompleted && (
                <div className="mt-2 text-sm font-semibold text-primary">
                  🎉 Toàn bộ các phòng trong đoàn đã được trả và hoàn tất hồ sơ đoàn!
                </div>
              )}
            </div>

            {/* Danh sách phòng trả thành công */}
            {resultData.successfulRooms?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-2">
                  Phòng đã trả thành công (Đã chuyển sang Cần dọn):
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {resultData.successfulRooms.map((b) => (
                    <div key={b.id} className="p-2.5 bg-surface-container-low border border-border-grey rounded-lg text-sm">
                      <div className="font-bold text-on-surface">Phòng {b.roomNumber}</div>
                      <div className="text-xs text-on-surface-variant">{b.guestName}</div>
                      <div className="text-xs text-green-600 font-medium mt-1">Đã trả phòng ✓</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danh sách phòng bị chặn */}
            {resultData.failedRooms?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                  Phòng chưa thể trả phòng:
                </h4>
                <div className="space-y-2">
                  {resultData.failedRooms.map((f, idx) => (
                    <div key={idx} className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-red-800">Phòng {f.roomNumber}: </span>
                        <span className="text-red-700">{f.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border-grey">
              <Button variant="primary" onClick={handleFinish}>
                Đã hiểu & Đóng
              </Button>
            </div>
          </div>
        ) : (
          /* Màn hình xem tóm tắt và chọn phòng trả */
          <div className="space-y-4">
            {/* Header info đoàn & phương thức hóa đơn */}
            <div className="p-3 bg-surface-container-low border border-border-grey rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <span className="text-on-surface-variant">Đoàn khách: </span>
                <span className="font-bold text-on-surface">{group.representativeName}</span>
                <span className="text-on-surface-variant mx-2">•</span>
                <span className="text-on-surface-variant">Phương thức hóa đơn: </span>
                <span className="font-semibold text-primary">
                  {summaryData?.invoiceMode === 'COMBINED'
                    ? 'Hóa đơn gộp chung cả đoàn'
                    : summaryData?.invoiceMode === 'SEPARATE'
                    ? 'Hóa đơn tách riêng từng phòng'
                    : 'Chưa lập hóa đơn'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleSelectAllEligible}>
                  Chọn tất cả phòng đủ điều kiện
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDeselectAll}>
                  Bỏ chọn tất cả
                </Button>
              </div>
            </div>

            {/* Bảng danh sách từng phòng */}
            <div className="border border-border-grey rounded-xl overflow-hidden max-h-[45vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">Chọn</th>
                    <th className="p-3">Phòng / Hạng phòng</th>
                    <th className="p-3">Khách ở</th>
                    <th className="p-3 text-right">Tiền phòng</th>
                    <th className="p-3 text-right">Phụ thu dịch vụ</th>
                    <th className="p-3 text-right">Tổng tiền</th>
                    <th className="p-3 text-right">Đã thanh toán</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey/60">
                  {summaryData?.rooms?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-on-surface-variant">
                        Không có phòng nào đang lưu trú (CHECKED_IN) trong đoàn.
                      </td>
                    </tr>
                  ) : (
                    summaryData?.rooms?.map((room) => {
                      const isSelected = selectedBookingIds.has(room.bookingId);
                      return (
                        <tr
                          key={room.bookingId}
                          className={`hover:bg-surface-container-low/60 transition-colors ${
                            !room.canCheckOut ? 'bg-red-50/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!room.canCheckOut}
                              onChange={() => handleToggleRoom(room.bookingId)}
                              className="rounded border-border-grey text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-on-surface">Phòng {room.roomNumber}</div>
                            <div className="text-xs text-on-surface-variant">{room.roomTypeName}</div>
                          </td>
                          <td className="p-3 font-medium text-on-surface">
                            {room.guestName || '—'}
                          </td>
                          <td className="p-3 text-right text-on-surface">
                            {formatCurrency(room.roomAmount)}
                          </td>
                          <td className="p-3 text-right text-on-surface">
                            {formatCurrency(room.serviceAmount)}
                            {room.hasUnsettledServices && (
                              <div className="text-[11px] text-amber-600 font-semibold flex items-center justify-end gap-0.5">
                                <IoWarningOutline size={12} /> Chưa chốt HĐ
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-semibold text-on-surface">
                            {formatCurrency(room.totalAmount)}
                          </td>
                          <td className="p-3 text-right font-medium text-green-700">
                            {formatCurrency(room.paidAmount)}
                          </td>
                          <td className="p-3 text-center">
                            {room.canCheckOut ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Sẵn sàng trả
                              </span>
                            ) : (
                              <span
                                title={room.blockerReason || 'Chưa đủ điều kiện'}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-help"
                              >
                                {room.blockerReason ? room.blockerReason : 'Bị chặn'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Hàng tổng cộng toàn đoàn */}
            {summaryData && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-surface-container rounded-xl text-sm border border-border-grey">
                <div>
                  <div className="text-xs text-on-surface-variant">Tổng tiền phòng:</div>
                  <div className="font-bold text-on-surface">{formatCurrency(summaryData.totalRoomAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant">Tổng phụ thu dịch vụ:</div>
                  <div className="font-bold text-on-surface">{formatCurrency(summaryData.totalServiceAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant">Tổng cộng cả đoàn:</div>
                  <div className="font-bold text-primary">{formatCurrency(summaryData.grandTotal)}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant">Tổng đã thanh toán:</div>
                  <div className="font-bold text-green-700">{formatCurrency(summaryData.totalPaid)}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant">Tổng còn lại:</div>
                  <div className={`font-bold ${summaryData.totalRemaining > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatCurrency(summaryData.totalRemaining)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border-grey">
              <div className="text-xs text-on-surface-variant">
                Đã chọn <strong>{selectedBookingIds.size}</strong> / {summaryData?.rooms?.length || 0} phòng để trả.
                Những phòng không được chọn sẽ tiếp tục lưu trú.
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onClose} disabled={processing} icon={IoCloseOutline}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  icon={IoCheckmarkCircleOutline}
                  onClick={handleSubmit}
                  isLoading={processing}
                  disabled={selectedBookingIds.size === 0 || processing}
                >
                  Xác nhận trả phòng ({selectedBookingIds.size} phòng)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BulkCheckOutModal;
