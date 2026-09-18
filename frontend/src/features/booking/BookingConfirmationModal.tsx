import React, { useState, useEffect, useRef } from 'react';
import {
  IoDocumentTextOutline,
  IoMailOutline,
  IoChatbubbleEllipsesOutline,
  IoPrintOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoCopyOutline,
  IoRefreshOutline,
  IoCallOutline,
  IoLocationOutline,
  IoCalendarOutline,
  IoBedOutline,
  IoShieldCheckmarkOutline,
  IoSendOutline,
  IoOpenOutline,
  IoWarningOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { bookingConfirmationApi } from '../../services/bookingConfirmationApi';
import {
  BookingConfirmationData,
  BookingConfirmationLog,
  ConfirmationChannel
} from '../../types/bookingConfirmation';

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number | string;
  onBookingConfirmed?: () => void;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  onBookingConfirmed
}) => {
  const { toastSuccess, toastError, toastWarning } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<BookingConfirmationData | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'email' | 'messaging' | 'history'>('preview');

  // Email form state & anti-spam controls
  const [customEmail, setCustomEmail] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [showReconfirmModal, setShowReconfirmModal] = useState<boolean>(false);
  const [reconfirmReason, setReconfirmReason] = useState<string>('Khách báo chưa nhận được email / hòm thư spam');
  const [customReasonText, setCustomReasonText] = useState<string>('');

  // Messaging state
  const [customPhone, setCustomPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loggingMessaging, setLoggingMessaging] = useState<boolean>(false);

  // Confirm state
  const [confirmingBooking, setConfirmingBooking] = useState<boolean>(false);

  const printableRef = useRef<HTMLDivElement>(null);

  const fetchConfirmationData = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await bookingConfirmationApi.getConfirmationData(bookingId);
      setData(res);
      setCustomEmail(res.guestEmail || '');
      setCustomPhone(res.guestPhone || '');
      if (res.emailCooldownSecondsRemaining && res.emailCooldownSecondsRemaining > 0) {
        setCooldownRemaining(res.emailCooldownSecondsRemaining);
      }
    } catch (err: any) {
      console.error('Lỗi tải bản xác nhận đặt phòng:', err);
      toastError(err.response?.data?.message || 'Không thể tải thông tin bản xác nhận đặt phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchConfirmationData();
      setActiveTab('preview');
      setCopied(false);
      setShowReconfirmModal(false);
    }
  }, [isOpen, bookingId]);

  // Bộ đếm đếm ngược Cooldown 60s
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleConfirmBooking = async () => {
    if (!bookingId) return;
    setConfirmingBooking(true);
    try {
      await bookingConfirmationApi.confirmBooking(bookingId);
      toastSuccess('Đặt phòng đã được xác nhận thành công!');
      if (onBookingConfirmed) onBookingConfirmed();
      await fetchConfirmationData();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Không thể xác nhận đặt phòng');
    } finally {
      setConfirmingBooking(false);
    }
  };

  // Nút gửi email kích hoạt kiểm tra
  const onSendEmailClick = () => {
    if (!bookingId || !data) return;
    const emailToSend = customEmail.trim() || data.guestEmail;
    if (!emailToSend) {
      toastWarning('Vui lòng nhập địa chỉ email người nhận');
      return;
    }

    // Nếu đã từng có email gửi trước đó -> mở popup xác nhận và hỏi lý do gửi lại
    const hasSentBefore = (data.emailSendCountToday && data.emailSendCountToday > 0) || Boolean(data.lastEmailSentAt);
    if (hasSentBefore) {
      setReconfirmReason('Khách báo chưa nhận được email / hòm thư spam');
      setCustomReasonText('');
      setShowReconfirmModal(true);
    } else {
      executeSendEmail('Gửi email xác nhận đặt phòng lần đầu cho khách');
    }
  };

  // Thực thi gửi email và lưu vết lý do
  const executeSendEmail = async (noteText?: string) => {
    if (!bookingId || !data) return;
    const emailToSend = customEmail.trim() || data.guestEmail;
    if (!emailToSend) return;

    setSendingEmail(true);
    try {
      await bookingConfirmationApi.sendConfirmation(bookingId, {
        channel: 'EMAIL',
        customEmail: emailToSend,
        note: noteText || `Gửi email bản xác nhận tới ${emailToSend}`
      });
      toastSuccess(`Đã gửi bản xác nhận đặt phòng tới ${emailToSend}`);
      setShowReconfirmModal(false);
      setCooldownRemaining(60); // Khóa nút & kích hoạt đếm ngược 60s
      await fetchConfirmationData();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Lỗi khi gửi email xác nhận đặt phòng');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!data?.formattedMessage) return;
    try {
      await navigator.clipboard.writeText(data.formattedMessage);
      setCopied(true);
      toastSuccess('Đã sao chép nội dung tin nhắn xác nhận vào bộ nhớ tạm!');
      setTimeout(() => setCopied(false), 3000);

      // Ghi nhật ký kênh MESSAGING_APP vào backend
      setLoggingMessaging(true);
      try {
        await bookingConfirmationApi.sendConfirmation(bookingId, {
          channel: 'MESSAGING_APP',
          customPhone: customPhone.trim() || data.guestPhone,
          note: 'Lễ tân đã sao chép nội dung gửi qua kênh tin nhắn (Zalo/SMS)'
        });
        await fetchConfirmationData();
      } catch (logErr) {
        console.warn('Lỗi ghi log tin nhắn:', logErr);
      } finally {
        setLoggingMessaging(false);
      }
    } catch (err) {
      toastError('Không thể sao chép văn bản vào bộ nhớ tạm');
    }
  };

  const handlePrint = async () => {
    if (!bookingId) return;
    try {
      await bookingConfirmationApi.sendConfirmation(bookingId, {
        channel: 'PRINT_EXPORT',
        note: 'Đã in / xuất bản xác nhận đặt phòng'
      });
      fetchConfirmationData();
    } catch (err) {
      console.warn('Lỗi lưu log in:', err);
    }
    window.print();
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '0 đ';
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <IoDocumentTextOutline size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-gray-900">Bản xác nhận đặt phòng</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                #{bookingId}
              </span>
              {data?.status === 'CONFIRMED' && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <IoCheckmarkCircleOutline size={12} /> Đã xác nhận
                </span>
              )}
              {data?.status === 'NEW' && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Mới tạo (Chưa xác nhận)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-normal">
              Cung cấp chứng từ minh bạch về ngày, phòng, chi tiết giá và tiền đặt cọc cho khách hàng
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 text-sm font-medium gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <IoDocumentTextOutline size={16} /> Xem trước bản xác nhận
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <IoMailOutline size={16} /> Gửi qua Email
            {data?.hasGuestEmail && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('messaging')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'messaging'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <IoChatbubbleEllipsesOutline size={16} /> Tin nhắn Zalo / SMS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <IoTimeOutline size={16} /> Lịch sử gửi ({data?.confirmationLogs?.length || 0})
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <IoRefreshOutline size={32} className="animate-spin mx-auto text-blue-600" />
            <p className="text-sm">Đang khởi tạo bản xác nhận đặt phòng...</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Cảnh báo nếu trạng thái booking là NEW */}
            {data.status === 'NEW' && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-amber-900 text-xs">
                <div className="flex items-center gap-2">
                  <IoWarningOutline size={20} className="text-amber-600 flex-shrink-0" />
                  <span>
                    Đặt phòng này đang ở trạng thái <strong>Mới tạo</strong>. Bạn nên xác nhận đặt phòng trước khi gửi bản xác nhận cho khách.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleConfirmBooking}
                  disabled={confirmingBooking}
                >
                  {confirmingBooking ? 'Đang xác nhận...' : 'Xác nhận đặt phòng ngay'}
                </Button>
              </div>
            )}

            {/* Cảnh báo thiếu thông tin liên hệ */}
            {data.contactWarning && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2.5 text-blue-800 text-xs">
                <IoAlertCircleOutline size={18} className="text-blue-600 flex-shrink-0" />
                <span>{data.contactWarning}</span>
              </div>
            )}

            {/* TAB 1: XEM TRƯỚC BẢN XÁC NHẬN */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div
                  ref={printableRef}
                  className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs space-y-5 text-gray-800"
                >
                  {/* Header Cơ sở */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-blue-900 uppercase tracking-wide">
                        {data.propertyName || 'STAYAWAY HOTEL'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <IoLocationOutline size={14} className="text-blue-600" /> {data.hotelAddress}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <IoCallOutline size={14} className="text-blue-600" /> Hotline: <strong>{data.hotelPhone}</strong> • Email: {data.hotelEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 bg-blue-50 text-blue-800 font-bold text-xs rounded border border-blue-200 uppercase tracking-wider">
                        BẢN XÁC NHẬN ĐẶT PHÒNG
                      </div>
                      <div className="text-sm font-black text-blue-900 mt-1">Mã: #{data.bookingId}</div>
                    </div>
                  </div>

                  {/* Thông tin Khách & Phòng */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-lg border border-gray-100 text-xs">
                    <div className="space-y-1.5">
                      <div className="text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
                        Thông tin khách hàng
                      </div>
                      <div className="text-sm font-bold text-gray-900">{data.guestName}</div>
                      <div className="text-gray-600">
                        Số điện thoại: <strong>{data.guestPhone || 'Chưa cập nhật'}</strong>
                      </div>
                      <div className="text-gray-600">
                        Email: <strong>{data.guestEmail || 'Chưa cập nhật'}</strong>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
                        Thông tin kỳ lưu trú
                      </div>
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <IoBedOutline size={15} className="text-blue-600" />
                        <span>{data.roomTypeName}</span>
                        {data.roomNumber ? (
                          <span className="text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
                            Phòng {data.roomNumber}
                          </span>
                        ) : (
                          <span className="text-gray-500 italic">(Sắp xếp khi nhận phòng)</span>
                        )}
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Nhận phòng (Check-in):</span>
                        <strong className="text-emerald-700">
                          {formatDateVN(data.checkInDate)} (từ {data.standardCheckInTime?.slice(0, 5) || '14:00'})
                        </strong>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Trả phòng (Check-out):</span>
                        <strong>
                          {formatDateVN(data.checkOutDate)} (trước {data.standardCheckOutTime?.slice(0, 5) || '12:00'})
                        </strong>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Tổng số đêm:</span>
                        <span className="font-bold text-blue-700">{data.totalNights} đêm</span>
                      </div>
                    </div>
                  </div>

                  {/* Bảng chi tiết giá từng đêm */}
                  <div className="space-y-2">
                    <div className="font-bold text-xs text-gray-900 uppercase tracking-wider">
                      Chi tiết giá phòng từng đêm
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="py-2 px-3">Ngày</th>
                            <th className="py-2 px-3">Thứ</th>
                            <th className="py-2 px-3">Loại giá / Ghi chú</th>
                            <th className="py-2 px-3 text-right">Đơn giá</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.nightlyDetails && data.nightlyDetails.length > 0 ? (
                            data.nightlyDetails.map((detail, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="py-2 px-3 font-medium">{formatDateVN(detail.date)}</td>
                                <td className="py-2 px-3 text-gray-500">{detail.dayOfWeek}</td>
                                <td className="py-2 px-3">
                                  <span className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px]">
                                    {detail.sourceName}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                  {formatCurrency(detail.appliedPrice)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-2 px-3">
                                Giá trọn gói ({data.totalNights} đêm)
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                {formatCurrency(data.grandTotalPrice)}
                              </td>
                            </tr>
                          )}

                          {data.extraPersonCharge > 0 && (
                            <tr className="bg-amber-50/40 text-amber-900">
                              <td colSpan={3} className="py-2 px-3 font-medium">
                                Phụ thu thêm người vượt tiêu chuẩn:
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-amber-700">
                                +{formatCurrency(data.extraPersonCharge)}
                              </td>
                            </tr>
                          )}

                          <tr className="bg-blue-50/60 font-bold border-t-2 border-blue-200">
                            <td colSpan={3} className="py-2.5 px-3 text-blue-900 uppercase">
                              Tổng tiền phòng dự kiến:
                            </td>
                            <td className="py-2.5 px-3 text-right text-sm text-blue-900 font-extrabold">
                              {formatCurrency(data.grandTotalPrice)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Khoản tiền cọc quy định */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                        Số tiền đặt cọc quy định
                      </div>
                      <div className="text-base font-extrabold text-blue-900 mt-0.5">
                        {formatCurrency(data.requiredDepositAmount)}
                        {data.depositPercent > 0 && (
                          <span className="text-xs font-normal text-blue-600 ml-1.5">
                            ({data.depositPercent}% tổng tiền phòng)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {data.collectedDepositAmount > 0 ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <IoCheckmarkCircleOutline size={13} /> Đã thu: {formatCurrency(data.collectedDepositAmount)}
                          </span>
                        ) : (
                          'Khách hàng hoàn tất cọc theo thỏa thuận khi nhận xác nhận.'
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg">
                      <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <IoShieldCheckmarkOutline size={14} /> Chính sách hủy đặt phòng
                      </div>
                      <p className="text-xs text-amber-950 mt-1 font-medium leading-relaxed">
                        {data.cancellationPolicySummary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick actions bar */}
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500">
                    Lễ tân có thể chọn gửi ngay qua Email hoặc sao chép nội dung gửi qua Zalo/SMS.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={IoPrintOutline}
                      onClick={handlePrint}
                    >
                      In / Xuất PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={IoChatbubbleEllipsesOutline}
                      onClick={() => setActiveTab('messaging')}
                    >
                      Kênh Zalo / SMS
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={IoMailOutline}
                      onClick={() => setActiveTab('email')}
                    >
                      Gửi qua Email
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GỬI QUA EMAIL */}
            {activeTab === 'email' && (
              <div className="space-y-4">
                {!data.emailConfigured && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <IoWarningOutline size={16} /> Cơ sở chưa cấu hình thư điện tử (Resend API)
                    </div>
                    <p>
                      Hệ thống chưa tìm thấy API Key thư điện tử. Tuy nhiên, tính năng kết xuất văn bản gửi qua tin nhắn (Zalo/SMS) hoặc In ấn hoàn toàn sẵn sàng và không bị ảnh hưởng.
                    </p>
                  </div>
                )}

                {/* Banner Trạng thái gửi gần nhất & Quota hôm nay */}
                {data.lastEmailSentAt ? (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-semibold text-blue-900">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        Đã gửi lần gần nhất: {new Date(data.lastEmailSentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(data.lastEmailSentAt).toLocaleDateString('vi-VN')})
                      </div>
                      <div className="text-blue-800 text-[11px] flex flex-wrap gap-x-3">
                        <span>Đến: <strong>{data.lastEmailRecipient}</strong></span>
                        {data.lastEmailSenderName && <span>Bởi: <strong>{data.lastEmailSenderName}</strong></span>}
                        <span>Trạng thái: <strong className={data.lastEmailStatus === 'SUCCESS' ? 'text-emerald-700' : 'text-rose-600'}>{data.lastEmailStatus === 'SUCCESS' ? 'Thành công' : 'Thất bại'}</strong></span>
                      </div>
                    </div>
                    <div className="shrink-0 self-start sm:self-auto">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        (data.emailSendCountToday || 0) >= (data.maxEmailSendQuota || 5)
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        Hôm nay: {data.emailSendCountToday || 0}/{data.maxEmailSendQuota || 5} lượt
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      Đặt phòng này chưa từng gửi email xác nhận lần nào.
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">Hạn mức: 0/{data.maxEmailSendQuota || 5} lượt/ngày</span>
                  </div>
                )}

                {/* Cảnh báo Quota vượt ngưỡng 5 lần */}
                {(data.emailSendCountToday || 0) >= (data.maxEmailSendQuota || 5) && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2.5">
                    <IoAlertCircleOutline size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-800">Đã đạt giới hạn tối đa 5 lần gửi email xác nhận trong ngày cho đặt phòng này.</span>
                      <p className="mt-1 text-[11px] text-rose-700 leading-relaxed">
                        Để tránh hòm thư của khách hàng đánh dấu spam, hệ thống tạm khóa gửi email tự động cho mã #{data.bookingId} hôm nay. Vui lòng chuyển sang tab <strong>TIN NHẮN ZALO / SMS</strong> hoặc <strong>XEM TRƯỚC BẢN XÁC NHẬN</strong> để tải file/in trực tiếp.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <IoMailOutline size={18} className="text-blue-600" /> Cấu hình gửi thư điện tử cho khách
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Địa chỉ Email người nhận:
                      </label>
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="Nhập địa chỉ email khách hàng (ví dụ: khach@gmail.com)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {!data.hasGuestEmail && (
                        <p className="text-amber-600 text-[11px] mt-1">
                          * Khách hàng chưa có email lưu trong hồ sơ. Email bạn nhập ở đây sẽ dùng để gửi bản xác nhận.
                        </p>
                      )}
                    </div>

                    <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1 text-gray-600">
                      <div>• Tiêu đề thư: <strong>[Xác nhận đặt phòng] Bản xác nhận đặt phòng #{data.bookingId} tại {data.propertyName}</strong></div>
                      <div>• Khách nhận: <strong>{data.guestName}</strong></div>
                      <div>• Nội dung thư gồm: Thông tin cơ sở, Hạng phòng, Phòng gán, Giờ check-in ({data.standardCheckInTime?.slice(0, 5)}), Bảng giá từng đêm, Tiền cọc ({formatCurrency(data.requiredDepositAmount)}) và Chính sách hủy.</div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        size="md"
                        variant="primary"
                        icon={cooldownRemaining > 0 ? IoTimeOutline : IoSendOutline}
                        disabled={
                          sendingEmail ||
                          !customEmail.trim() ||
                          (data.emailSendCountToday || 0) >= (data.maxEmailSendQuota || 5) ||
                          cooldownRemaining > 0
                        }
                        onClick={onSendEmailClick}
                      >
                        {sendingEmail
                          ? 'Đang gửi email...'
                          : (data.emailSendCountToday || 0) >= (data.maxEmailSendQuota || 5)
                          ? 'Đã hết lượt gửi hôm nay'
                          : cooldownRemaining > 0
                          ? `Gửi lại sau (${cooldownRemaining}s)`
                          : 'Gửi email xác nhận ngay'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: KÊNH TIN NHẮN ZALO / SMS */}
            {activeTab === 'messaging' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <IoChatbubbleEllipsesOutline size={18} className="text-blue-600" /> Soạn sẵn nội dung tin nhắn (Zalo / SMS / Messenger)
                    </h4>
                    <span className="text-xs text-gray-500">
                      Sao chép để gửi trực tiếp cho khách
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Số điện thoại người nhận:
                      </label>
                      <input
                        type="text"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="Số điện thoại khách (ví dụ: 0912345678)"
                        className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="relative">
                      <textarea
                        readOnly
                        rows={14}
                        value={data.formattedMessage}
                        className="w-full font-mono text-xs p-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none select-all leading-relaxed text-gray-800"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <div className="text-xs text-gray-500">
                        {loggingMessaging && <span className="text-blue-600 animate-pulse">Đang lưu nhật ký...</span>}
                      </div>
                      <div className="flex gap-2">
                        {customPhone && (
                          <a
                            href={`https://zalo.me/${customPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-semibold rounded border border-blue-400 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5"
                          >
                            <IoOpenOutline size={14} /> Mở Zalo chat
                          </a>
                        )}
                        <Button
                          size="md"
                          variant={copied ? 'success' : 'primary'}
                          icon={copied ? IoCheckmarkCircleOutline : IoCopyOutline}
                          onClick={handleCopyMessage}
                        >
                          {copied ? 'Đã sao chép vào bộ nhớ!' : 'Sao chép nội dung tin nhắn'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LỊCH SỬ GỬI */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <IoTimeOutline size={18} className="text-blue-600" /> Nhật ký các lần gửi bản xác nhận
                    </h4>
                    <span className="text-xs text-gray-500">
                      Ghi nhận kênh, thời điểm, người gửi và hỗ trợ gửi lại
                    </span>
                  </div>

                  {data.confirmationLogs && data.confirmationLogs.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">Thời gian</th>
                            <th className="py-2.5 px-3">Kênh gửi</th>
                            <th className="py-2.5 px-3">Người nhận</th>
                            <th className="py-2.5 px-3">Người thực hiện</th>
                            <th className="py-2.5 px-3">Trạng thái</th>
                            <th className="py-2.5 px-3">Ghi chú</th>
                            <th className="py-2.5 px-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.confirmationLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-medium text-gray-800">
                                {new Date(log.sentAt).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                                  log.channel === 'EMAIL'
                                    ? 'bg-purple-100 text-purple-800'
                                    : log.channel === 'MESSAGING_APP'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.channelDisplayName}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-gray-700">{log.recipient || '---'}</td>
                              <td className="py-2 px-3 text-gray-600">{log.sentByName}</td>
                              <td className="py-2 px-3">
                                {log.status === 'SUCCESS' ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <IoCheckmarkCircleOutline size={13} /> Thành công
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-semibold flex items-center gap-1">
                                    <IoAlertCircleOutline size={13} /> Thất bại
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-gray-500 max-w-xs truncate" title={log.note}>
                                {log.note || '---'}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (log.channel === 'EMAIL') setActiveTab('email');
                                    else if (log.channel === 'MESSAGING_APP') setActiveTab('messaging');
                                    else handlePrint();
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                                >
                                  Gửi lại
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      Chưa có nhật ký gửi bản xác nhận nào cho đặt phòng này.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>

      {/* Hộp thoại xác nhận gửi lại email (Chống spam) */}
      {showReconfirmModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
            <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <IoMailOutline size={18} />
                </div>
                <h4 className="font-bold text-sm text-gray-900">Xác nhận gửi lại Email cho khách</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowReconfirmModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <IoAlertCircleOutline size={15} /> Lưu ý trước khi gửi lại
                </div>
                <p>
                  Email xác nhận đã từng được gửi tới <strong>{data?.lastEmailRecipient || customEmail}</strong>
                  {data?.lastEmailSentAt && (
                    <> vào lúc <strong>{new Date(data.lastEmailSentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(data.lastEmailSentAt).toLocaleDateString('vi-VN')}</strong></>
                  )}.
                </p>
                <p className="text-[11px] text-amber-800">
                  Hôm nay đặt phòng này đã gửi <strong>{data?.emailSendCountToday || 0}/{data?.maxEmailSendQuota || 5}</strong> lượt. Bạn có chắc chắn muốn gửi thêm một bản nữa cho khách không?
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-800 mb-2">
                  Lý do gửi lại (ghi nhận vào nhật ký):
                </label>
                <div className="space-y-2">
                  {[
                    'Khách báo chưa nhận được email / hòm thư spam',
                    'Khách đổi sang địa chỉ email mới',
                    'Gửi lại bản cập nhật thông tin phòng / giá',
                    'Lý do khác'
                  ].map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        reconfirmReason === reason
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reconfirmReason"
                        value={reason}
                        checked={reconfirmReason === reason}
                        onChange={(e) => setReconfirmReason(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                {reconfirmReason === 'Lý do khác' && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="Nhập lý do gửi lại cụ thể..."
                      value={customReasonText}
                      onChange={(e) => setCustomReasonText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReconfirmModal(false)}
                disabled={sendingEmail}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={IoSendOutline}
                isLoading={sendingEmail}
                disabled={reconfirmReason === 'Lý do khác' && !customReasonText.trim()}
                onClick={() => {
                  const finalNote = reconfirmReason === 'Lý do khác' ? customReasonText.trim() : reconfirmReason;
                  executeSendEmail(finalNote);
                }}
              >
                Xác nhận gửi lại
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BookingConfirmationModal;
