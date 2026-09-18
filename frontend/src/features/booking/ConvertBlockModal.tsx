import React, { useState, useEffect } from 'react';
import {
  IoCloseOutline,
  IoCalendarOutline,
  IoHomeOutline,
  IoPersonOutline,
  IoCallOutline,
  IoMailOutline,
  IoCardOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoGlobeOutline,
  IoCashOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { channelApi } from '../../services/channelApi';
import { roomApi } from '../../services/roomApi';
import { useToast } from '../../context/ToastContext';
import { RoomResponse } from '../../types';
import { formatDate, calculateNights } from '../../utils/formatDate';

interface ConvertBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: {
    id: number;
    channelId?: number;
    channelName?: string;
    channelCode?: string;
    roomTypeId?: number;
    roomTypeName?: string;
    roomId?: number;
    roomNumber?: string;
    startDate: string;
    endDate: string;
    summary?: string;
    note?: string;
    isExcess?: boolean;
  } | null;
  onSuccess: (booking?: any) => void;
}

const ConvertBlockModal: React.FC<ConvertBlockModalProps> = ({
  isOpen,
  onClose,
  block,
  onSuccess,
}) => {
  const { toastSuccess, toastError } = useToast();

  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [guestIdNumber, setGuestIdNumber] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [expectedPrice, setExpectedPrice] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('OTA_PAYMENT');
  const [note, setNote] = useState<string>('');

  const [availableRooms, setAvailableRooms] = useState<RoomResponse[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && block) {
      // Tự điền tên khách nếu tệp lịch kênh có tên khách hợp lệ
      const cleanSummary = block.summary && !block.summary.includes('Reserved') && !block.summary.includes('Block')
        ? block.summary.replace(/\[.*?\]\s*/, '')
        : '';
      setGuestName(cleanSummary);
      setGuestPhone('');
      setGuestEmail('');
      setGuestIdNumber('');
      setSelectedRoomId(block.roomId ? String(block.roomId) : '');
      setExpectedPrice('');
      setDepositAmount('');
      setPaymentMethod('OTA_PAYMENT');
      setNote(block.note || (block.summary ? `Nguồn lịch: ${block.summary}` : ''));

      // Tải danh sách phòng trống của loại phòng này trong khoảng ngày chặn
      if (block.roomTypeId && block.startDate && block.endDate) {
        loadAvailableRooms(block.roomTypeId, block.startDate, block.endDate, block.roomId);
      }
    }
  }, [isOpen, block]);

  const loadAvailableRooms = async (
    roomTypeId: number,
    startDate: string,
    endDate: string,
    currentRoomId?: number
  ) => {
    setLoadingRooms(true);
    try {
      const rooms = await roomApi.getAvailableRooms(roomTypeId, startDate, endDate);
      let list = Array.isArray(rooms) ? rooms : [];
      // Nếu phòng hiện tại chưa có trong danh sách khả dụng nhưng đang được gán cho chính lượt chặn này
      if (currentRoomId && !list.some(r => r.id === currentRoomId) && block?.roomNumber) {
        list = [
          {
            id: currentRoomId,
            roomNumber: block.roomNumber,
            roomTypeId: roomTypeId,
            roomTypeName: block.roomTypeName,
            status: 'AVAILABLE'
          } as RoomResponse,
          ...list
        ];
      }
      setAvailableRooms(list);
    } catch (err) {
      console.warn('Không thể tải danh sách phòng khả dụng:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  if (!isOpen || !block) return null;

  const nights = calculateNights(block.startDate, block.endDate) || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toastError('Vui lòng nhập họ và tên khách hàng');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim() || undefined,
        guestEmail: guestEmail.trim() || undefined,
        guestIdNumber: guestIdNumber.trim() || undefined,
        roomId: selectedRoomId ? Number(selectedRoomId) : undefined,
        expectedPrice: expectedPrice ? Number(expectedPrice) : undefined,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
        paymentMethod: paymentMethod || undefined,
        note: note.trim() || undefined,
      };

      const result = await channelApi.convertBlockToBooking(block.id, payload);
      toastSuccess(`Đã chuyển lượt chặn thành đặt phòng cho khách "${guestName}" thành công!`);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Có lỗi xảy ra khi chuyển đổi lượt chặn';
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-purple-900 font-bold">
          <IoGlobeOutline className="text-purple-600 shrink-0" size={22} />
          <span>Chuyển lượt chặn từ kênh thành Đặt phòng chính thức</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner thông tin lượt chặn từ OTA */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-purple-950 flex items-center gap-1.5 text-sm">
              <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-bold text-xs uppercase shadow-xs">
                {block.channelName || block.channelCode || 'Kênh OTA'}
              </span>
              Lượt chặn đồng bộ tự động
            </span>
            {block.isExcess && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-[11px] flex items-center gap-1">
                <IoAlertCircleOutline size={13} />
                Cảnh báo vượt phân bổ
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700 pt-1 border-t border-purple-100">
            <div>
              <span className="text-slate-500 block">Loại phòng:</span>
              <strong className="text-slate-900">{block.roomTypeName || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Phòng được giữ:</span>
              <strong className="text-purple-900">
                {block.roomNumber ? `Phòng ${block.roomNumber}` : 'Chưa xếp phòng'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Thời gian ({nights} đêm):</span>
              <strong className="text-slate-900">
                {formatDate(block.startDate)} → {formatDate(block.endDate)}
              </strong>
            </div>
          </div>
        </div>

        {/* Thông tin khách hàng */}
        <div className="border border-border-grey rounded-xl p-3.5 space-y-3 bg-surface-container-lowest">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <IoPersonOutline className="text-primary" /> Thông tin khách hàng
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Họ và tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn A"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Số điện thoại
              </label>
              <div className="relative">
                <IoCallOutline className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="tel"
                  placeholder="0912345678"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <IoMailOutline className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="email"
                  placeholder="khach@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                CCCD / Số hộ chiếu
              </label>
              <div className="relative">
                <IoCardOutline className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Số CCCD hoặc CMND"
                  value={guestIdNumber}
                  onChange={(e) => setGuestIdNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Xếp phòng & Tiền phòng */}
        <div className="border border-border-grey rounded-xl p-3.5 space-y-3 bg-surface-container-lowest">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <IoHomeOutline className="text-primary" /> Xếp phòng & Thanh toán
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phòng phân bổ
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">-- Chưa xếp phòng (để sau) --</option>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Phòng {r.roomNumber} ({r.roomTypeName || block.roomTypeName})
                    {block.roomId && Number(block.roomId) === Number(r.id) ? ' [Đang giữ]' : ''}
                  </option>
                ))}
              </select>
              {loadingRooms && (
                <span className="text-[11px] text-slate-400 mt-0.5 block">Đang tìm phòng trống...</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Giá dự kiến từ kênh (VND)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="VD: 1500000"
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tiền đặt cọc / trả trước (VND)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="VD: 500000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phương thức thanh toán
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="OTA_PAYMENT">Kênh thu hộ (Airbnb/Booking Pay)</option>
                <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                <option value="CREDIT_CARD">Thẻ tín dụng / POS</option>
                <option value="CASH">Tiền mặt khi nhận phòng</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Ghi chú đặt phòng
            </label>
            <textarea
              rows={2}
              placeholder="Mã đặt chỗ OTA, giờ đến dự kiến, yêu cầu đặc biệt..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-grey rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex justify-end items-center gap-2 pt-2 border-t border-border-grey">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            className="bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-1.5 shadow-xs"
            disabled={submitting}
          >
            <IoCheckmarkCircleOutline size={18} />
            {submitting ? 'Đang chuyển đổi...' : 'Xác nhận chuyển thành Đặt phòng'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ConvertBlockModal;
