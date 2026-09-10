import React, { useState, useEffect } from 'react';
import { 
  IoCheckmarkCircleOutline, 
  IoAlertCircleOutline,
  IoBedOutline,
  IoInformationCircleOutline,
  IoWarningOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import groupBookingApi from '../../services/groupBookingApi';
import { useToast, useConfirm } from '../../context/ToastContext';
import { GroupBookingResponse } from '../../types';

interface BulkCheckOutRoom {
  bookingId: number;
  roomNumber: string;
  roomTypeName?: string;
  canCheckOut: boolean;
  blockReason?: string;
  roomAmount?: number;
  serviceAmount?: number;
  depositAmount?: number;
  remainingAmount?: number;
}

interface BulkCheckOutSummary {
  rooms: BulkCheckOutRoom[];
  totalRooms: number;
  eligibleRoomsCount: number;
  totalRemainingBalance: number;
}

interface BulkCheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupBookingResponse | any;
  onSuccess?: () => void;
}

const formatCurrency = (amount?: number) => {
  if (amount === undefined || amount === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const BulkCheckOutModal: React.FC<BulkCheckOutModalProps> = ({ isOpen, onClose, group, onSuccess }) => {
  const { toastSuccess, toastWarning } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<BulkCheckOutSummary | null>(null);
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<number>>(new Set());
  const [resultData, setResultData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchSummary = async () => {
    if (!group?.id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await groupBookingApi.getBulkCheckOutSummary(group.id);
      setSummaryData(data);
      const initialSelected = new Set<number>();
      data.rooms?.forEach((room: BulkCheckOutRoom) => {
        if (room.canCheckOut) {
          initialSelected.add(room.bookingId);
        }
      });
      setSelectedBookingIds(initialSelected);
    } catch (err: any) {
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

  const handleToggleRoom = (bookingId: number) => {
    const next = new Set(selectedBookingIds);
    if (next.has(bookingId)) {
      next.delete(bookingId);
    } else {
      next.add(bookingId);
    }
    setSelectedBookingIds(next);
  };

  const handleSelectAllEligible = () => {
    const next = new Set<number>();
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
    } catch (err: any) {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Trả phòng đoàn" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <IoAlertCircleOutline size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resultData ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-800 font-bold text-base mb-1">
                <IoCheckmarkCircleOutline size={22} className="text-green-600" />
                <span>Hoàn tất Trả phòng đoàn</span>
              </div>
              <p className="text-sm text-green-700">
                Đã trả phòng thành công cho: <strong>{resultData.successfulRooms?.length || 0}</strong> phòng.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-border-grey">
              <Button variant="primary" onClick={handleFinish}>
                Đóng
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="inline-block w-8 h-8 border-3 border-primary border-t-transparent border-l-transparent animate-square-spin mb-2" />
            <p className="text-xs uppercase font-bold tracking-wider text-on-surface">Đang kiểm tra tình trạng hóa đơn đoàn...</p>
          </div>
        ) : summaryData ? (
          <div className="space-y-4">
            {/* Header thông tin đoàn */}
            <div className="p-3.5 bg-surface-container-low rounded-lg border border-border-grey flex flex-wrap justify-between items-center gap-3 text-xs">
              <div>
                <span className="text-on-surface-variant">Đoàn:</span>{' '}
                <strong className="text-on-surface">{group.groupCode || `#${group.id}`}</strong>
                <span className="mx-2 text-border-grey">|</span>
                <span className="text-on-surface-variant">Trưởng đoàn:</span>{' '}
                <strong className="text-on-surface">{group.representativeName}</strong>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-on-surface-variant">Tổng dư nợ cần thanh toán:</span>
                <strong className={`text-sm ${summaryData.totalRemainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(summaryData.totalRemainingBalance)}
                </strong>
              </div>
            </div>

            {/* Cảnh báo nợ nếu có */}
            {summaryData.totalRemainingBalance > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <IoWarningOutline size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Lưu ý về công nợ đoàn:</span>
                  <div className="mt-0.5">
                    Đoàn còn số dư chưa thanh toán. Các phòng có hóa đơn chưa thanh toán hoặc chưa ghi nợ có thể bị chặn trả phòng.
                  </div>
                </div>
              </div>
            )}

            {/* Thanh chọn nhanh */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleSelectAllEligible} className="text-primary hover:underline font-medium cursor-pointer">
                  Chọn tất cả phòng đủ điều kiện
                </button>
                <span className="text-on-surface-variant/40">•</span>
                <button type="button" onClick={handleDeselectAll} className="text-on-surface-variant hover:underline cursor-pointer">
                  Bỏ chọn tất cả
                </button>
              </div>
              <div className="text-on-surface-variant font-medium">
                Đã chọn: {selectedBookingIds.size} / {summaryData.rooms?.length || 0} phòng
              </div>
            </div>

            {/* Bảng danh sách phòng */}
            <div className="overflow-x-auto border border-border-grey rounded-lg max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-surface-container-low border-b border-border-grey font-semibold text-on-surface-variant uppercase">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Chọn</th>
                    <th className="p-2.5">Phòng</th>
                    <th className="p-2.5">Hạng phòng</th>
                    <th className="p-2.5 text-right">Tiền phòng</th>
                    <th className="p-2.5 text-right">Dịch vụ</th>
                    <th className="p-2.5 text-right">Còn lại</th>
                    <th className="p-2.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {summaryData.rooms?.map((room) => {
                    const isSelected = selectedBookingIds.has(room.bookingId);
                    return (
                      <tr 
                        key={room.bookingId} 
                        className={`hover:bg-surface-container-low/50 ${!room.canCheckOut ? 'opacity-60 bg-gray-50' : ''}`}
                      >
                        <td className="p-2.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            disabled={!room.canCheckOut} 
                            onChange={() => handleToggleRoom(room.bookingId)} 
                            className="w-4 h-4 text-primary rounded border-border-grey"
                          />
                        </td>
                        <td className="p-2.5 font-bold text-on-surface flex items-center gap-1">
                          <IoBedOutline size={14} className="text-primary" />
                          <span>Phòng {room.roomNumber}</span>
                        </td>
                        <td className="p-2.5 text-on-surface-variant">{room.roomTypeName}</td>
                        <td className="p-2.5 text-right font-medium">{formatCurrency(room.roomAmount)}</td>
                        <td className="p-2.5 text-right font-medium">{formatCurrency(room.serviceAmount)}</td>
                        <td className="p-2.5 text-right font-bold text-on-surface">
                          {formatCurrency(room.remainingAmount)}
                        </td>
                        <td className="p-2.5 text-center">
                          {room.canCheckOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800">
                              Đủ điều kiện
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800" title={room.blockReason}>
                              {room.blockReason || 'Chưa đủ điều kiện'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
              <Button variant="ghost" onClick={onClose} disabled={processing}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSubmit} isLoading={processing} disabled={selectedBookingIds.size === 0}>
                Xác nhận Trả phòng ({selectedBookingIds.size} phòng)
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default BulkCheckOutModal;
