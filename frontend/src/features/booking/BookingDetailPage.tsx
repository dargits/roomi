import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  IoArrowBackOutline,
  IoAlertCircleOutline, 
  IoCallOutline, 
  IoCartOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseOutline, 
  IoDocumentOutline, 
  IoInformationCircleOutline, 
  IoLocationOutline, 
  IoLogOutOutline,
  IoMoonOutline, 
  IoPersonOutline, 
  IoSwapHorizontalOutline, 
  IoSwapVerticalOutline, 
  IoTimeOutline, 
  IoCashOutline,
  IoCalendarOutline,
  IoPeopleOutline,
  IoMailOutline,
  IoDocumentTextOutline
} from 'react-icons/io5';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import bookingApi from '../../services/bookingApi';
import { roomApi } from '../../services/roomApi';
import BookingServicesTab from './BookingServicesTab';
import BookingInvoiceTab from './BookingInvoiceTab';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import BookingConfirmationModal from './BookingConfirmationModal';
import DepositTab from './DepositTab';
import ExtendStayModal from './ExtendStayModal';
import StayingGuestsModal from './StayingGuestsModal';
import LoadingScreen from '../../components/common/LoadingScreen';
import RescheduleDateModal from './RescheduleDateModal';
import UpgradeRoomModal from './UpgradeRoomModal';
import CheckInModal from './CheckInModal';
import EarlyCheckoutModal from './EarlyCheckoutModal';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Tabs from '../../components/ui/Tabs/Tabs';
import { formatName, formatPhone, formatEmail, formatCCCD } from '../../utils/personalDataMasker';

const VALID_TABS = ['info', 'services', 'invoice', 'deposit'];

const BookingDetailPage: React.FC = () => {
  const { bookingId, tab: pathTab } = useParams<{ bookingId: string; tab?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { success: toastSuccess, error: toastError } = useToast();
  const { user } = useAuth();
  
  const tab = searchParams.get('tab') || pathTab || 'info';

  const fromUrl = location.state?.from || '/manage/bookings/list';
  const backLabel = fromUrl.includes('calendar') ? 'Lịch phòng' :
                    fromUrl.includes('requests') ? 'Yêu cầu từ Web' :
                    fromUrl.includes('guests') ? 'Quản lý khách hàng' : 'Danh sách đặt phòng';

  const handleBack = () => {
    navigate(fromUrl);
  };

  const activeTab = VALID_TABS.includes(tab) ? tab : 'info';

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);

  // === Đổi phòng ===
  const [showChangeRoom, setShowChangeRoom] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedNewRoom, setSelectedNewRoom] = useState<any>(null);
  const [changingRoom, setChangingRoom] = useState(false);
  const [changeRoomError, setChangeRoomError] = useState('');

  // === Gia hạn & Nâng hạng ===
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // === NCL-04-CN-NEW: Dời lịch đặt phòng chưa nhận phòng ===
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // === Quick Actions: Nhận phòng / Trả phòng ===
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutConfirm, setCheckOutConfirm] = useState(false);
  const [checkOutProcessing, setCheckOutProcessing] = useState(false);
  const [checkOutError, setCheckOutError] = useState('');
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);
  const [showStayingGuestsModal, setShowStayingGuestsModal] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getBookingById(bookingId);
      setBooking(data);
    } catch (error) {
      console.error("Lỗi lấy chi tiết đặt phòng", error);
      toastError("Không thể tải thông tin đặt phòng.");
    } finally {
      setLoading(false);
    }
  };

  const openChangeRoom = async () => {
    setShowChangeRoom(true);
    setSelectedNewRoom(null);
    setChangeRoomError('');
    setLoadingRooms(true);
    try {
      const rooms = await roomApi.getAllRooms();
      const targetRoomTypeId = booking?.roomTypeId;
      const filtered = rooms.filter((r) => {
        const rTypeId = r.roomTypeId || (r as any).roomType?.id;
        return r.status === 'AVAILABLE' && 
               r.id !== booking?.roomId && 
               String(rTypeId) === String(targetRoomTypeId);
      });
      setAvailableRooms(filtered);
    } catch {
      setChangeRoomError('Không thể tải danh sách phòng.');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSelectNewRoom = (room) => {
    setSelectedNewRoom(room);
    setChangeRoomError('');
  };

  const handleConfirmChangeRoom = async () => {
    if (!selectedNewRoom) {
      setChangeRoomError('Vui lòng chọn một phòng khả dụng.');
      return;
    }

    const newRoomTypeId = selectedNewRoom.roomTypeId || selectedNewRoom.roomType?.id;
    if (String(newRoomTypeId) !== String(booking?.roomTypeId)) {
      setChangeRoomError(`Chỉ được đổi sang phòng cùng loại (${booking?.roomTypeName}).`);
      return;
    }

    setChangingRoom(true);
    setChangeRoomError('');
    try {
      await bookingApi.changeRoom(bookingId, selectedNewRoom.id);
      setShowChangeRoom(false);
      await fetchBookingDetails();
      toastSuccess(`Đổi sang Phòng ${selectedNewRoom.roomNumber} (${booking?.roomTypeName}) thành công!`);
    } catch (err) {
      setChangeRoomError(err.response?.data?.message || 'Không thể đổi phòng. Vui lòng thử lại.');
    } finally {
      setChangingRoom(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'NEW': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-md font-semibold text-xs">Mới</span>;
      case 'CONFIRMED': return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md font-semibold text-xs">Đã xác nhận</span>;
      case 'CHECKED_IN': return <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-md font-semibold text-xs">Đang ở</span>;
      case 'CHECKED_OUT': return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md font-semibold text-xs">Đã đi</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-md font-semibold text-xs">Đã hủy</span>;
      case 'NO_SHOW': return <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-md font-semibold text-xs">Không đến</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md font-semibold text-xs">{status}</span>;
    }
  };

  const handleQuickCheckOut = async () => {
    setCheckOutProcessing(true);
    setCheckOutError('');
    try {
      await bookingApi.checkOut(bookingId);
      toastSuccess(`Đã trả phòng thành công cho khách ${booking.guestName}!`);
      setCheckOutConfirm(false);
      fetchBookingDetails();
    } catch (err) {
      const serverMsg = err.response?.data?.message || '';
      if (serverMsg.includes('hóa đơn')) {
        setCheckOutError('invoice_required');
      } else {
        setCheckOutError(serverMsg || 'Không thể trả phòng. Vui lòng thử lại.');
      }
    } finally {
      setCheckOutProcessing(false);
    }
  };

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

  if (loading) {
    return <LoadingScreen message={`Đang tải thông tin chi tiết đặt phòng #${bookingId}...`} />;
  }

  if (!booking) {
    return (
      <div className="bg-surface rounded-xl shadow-xs border border-border-grey p-8 text-center space-y-3">
        <IoAlertCircleOutline size={40} className="text-error mx-auto" />
        <h3 className="text-base font-bold text-on-surface">Không tìm thấy thông tin đặt phòng #{bookingId}</h3>
        <Button onClick={handleBack} icon={IoArrowBackOutline} size="sm">
          Quay lại {backLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Unified Compact Header: Breadcrumb + Overview + Actions */}
      <div className="bg-surface-container-lowest px-4 py-3 rounded-xl border border-border-grey shadow-xs">
        {/* Top bar: Back & Meta info */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2.5 border-b border-border-grey/60 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1 font-medium text-on-surface-variant hover:text-primary transition-colors bg-surface-container-low hover:bg-surface-container px-2.5 py-1 rounded-md border border-border-grey/70 cursor-pointer"
              title={`Quay lại ${backLabel}`}
            >
              <IoArrowBackOutline size={13} /> {backLabel}
            </button>
            <span className="text-on-surface-variant/40">/</span>
            <span className="font-semibold text-on-surface">
              Chi tiết đặt phòng #{booking.id}
            </span>
            {booking.createdAt && (
              <span className="text-on-surface-variant/60 font-normal hidden sm:inline">
                • Tạo lúc: {new Date(booking.createdAt).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {booking.priceSource === 'NEGOTIATED' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Thỏa thuận giá ({booking.appliedAgreementName || 'Riêng'})
              </span>
            )}
            {booking.groupBookingId && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Đoàn #{booking.groupBookingId}
              </span>
            )}
            {booking.source && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                Kênh: {booking.source}
              </span>
            )}
          </div>
        </div>

        {/* Main row: Guest name, Room info, Stay time & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Customer + Room Pill */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-on-surface">
                {booking.guestName}
              </span>
              {getStatusBadge(booking.status)}
            </div>

            <div className="h-4 w-px bg-border-grey hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <IoCallOutline size={14} className="text-primary" />
              <span className="font-medium text-on-surface">{booking.guestPhone}</span>
            </div>

            <div className="h-4 w-px bg-border-grey hidden sm:block" />

            <div className="inline-flex items-center gap-1.5 text-xs bg-primary/5 text-primary border border-primary/20 px-2.5 py-1 rounded-md font-medium">
              <IoLocationOutline size={14} />
              <span>{booking.roomTypeName}</span>
              <span className="font-bold">
                {booking.roomNumber ? `• P.${booking.roomNumber}` : '• (Chưa gán)'}
              </span>
            </div>
          </div>

          {/* Right: Stay Duration & Quick Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap ml-auto">
            <div className="text-xs bg-surface-container-low px-2.5 py-1 rounded-md border border-border-grey flex items-center gap-1.5 text-on-surface">
              <span className="font-medium">{formatStayDateTime(booking.checkInDate, 'checkin')}</span>
              <span className="text-on-surface-variant">→</span>
              <span className="font-medium">{formatStayDateTime(booking.checkOutDate, 'checkout')}</span>
              <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                {calculateNights(booking.checkInDate, booking.checkOutDate)} đêm
              </span>
            </div>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(booking.status === 'CONFIRMED' || booking.status === 'NEW') && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={IoDocumentTextOutline}
                  onClick={() => setShowConfirmationModal(true)}
                  className="py-1 px-2.5 text-xs border-blue-400 text-blue-700 hover:bg-blue-50"
                >
                  Bản xác nhận
                </Button>
              )}
              {booking.status === 'CONFIRMED' && booking.roomId && (
                <Button
                  size="sm"
                  variant="success"
                  icon={IoCheckmarkCircleOutline}
                  onClick={() => setCheckInModalOpen(true)}
                  className="py-1 px-2.5 text-xs"
                >
                  Nhận phòng
                </Button>
              )}
              {booking.status === 'CHECKED_IN' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={IoPeopleOutline}
                    onClick={() => setShowStayingGuestsModal(true)}
                    className="py-1 px-2 text-xs border-primary/40 text-primary hover:bg-primary/5"
                  >
                    Khách cùng phòng
                  </Button>
                  {booking.checkOutDate > new Date().toISOString().split('T')[0] && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={IoTimeOutline}
                      onClick={() => setShowEarlyCheckoutModal(true)}
                      className="py-1 px-2 text-xs border-amber-400 text-amber-800 hover:bg-amber-50"
                    >
                      Trả sớm
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    icon={IoLogOutOutline}
                    onClick={() => { setCheckOutConfirm(true); setCheckOutError(''); }}
                    className="py-1 px-2.5 text-xs"
                  >
                    Trả phòng
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Container */}
      <div className="bg-surface rounded-xl border border-border-grey shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <Tabs 
          tabs={[
            { id: 'info', label: 'Thông tin chung', icon: IoInformationCircleOutline },
            { id: 'services', label: 'Dịch vụ phụ thu', icon: IoCartOutline },
            { id: 'invoice', label: 'Hóa đơn & Thanh toán', icon: IoDocumentOutline },
            { id: 'deposit', label: 'Đặt cọc', icon: IoCashOutline }
          ]} 
          paramKey="tab" 
          defaultTab="info" 
          className="mt-0 border-b border-border-grey bg-surface-container-lowest/80 px-2" 
        />

        {/* Tab Content Body */}
        <div className="p-3 sm:p-3.5">
          {/* TAB 1: THÔNG TIN CHUNG (Compact 3-Column Bento Grid - Zero Scroll) */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* CỘT 1: Chi tiết khách hàng & liên hệ */}
              <div className="bg-surface-container-lowest p-3 rounded-lg border border-border-grey flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-on-surface mb-2.5 flex items-center gap-1.5 border-b border-border-grey/70 pb-1.5 text-primary">
                    <IoPersonOutline size={15} /> Khách hàng &amp; Liên hệ
                  </h4>
                  <div className="space-y-1.5 text-xs text-on-surface-variant">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Họ tên:</span>
                      <span className="font-semibold text-on-surface text-right">{formatName(booking.guestName, user)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Số điện thoại:</span>
                      <span className="font-medium text-on-surface text-right">{formatPhone(booking.guestPhone, user)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Email:</span>
                      <span className="font-medium text-on-surface text-right truncate max-w-[170px]" title={booking.guestEmail}>
                        {booking.guestEmail ? formatEmail(booking.guestEmail, user) : 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">CCCD/CMND:</span>
                      <span className="font-medium text-on-surface text-right">{formatCCCD(booking.guestIdNumber, user)}</span>
                    </div>
                  </div>
                </div>

                {/* Email nhắc phòng */}
                <div className="pt-2 mt-2 border-t border-border-grey/60 flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-on-surface-variant/70">Email nhắc:</span>
                  <div className="flex items-center gap-1.5">
                    {booking.reminderSentAt ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200" title={`Đã gửi lúc: ${new Date(booking.reminderSentAt).toLocaleString('vi-VN')}`}>
                        <IoCheckmarkCircleOutline size={12} /> Đã gửi
                      </span>
                    ) : (
                      <span className="text-on-surface-variant italic">Chưa gửi</span>
                    )}
                    {(booking.status === 'NEW' || booking.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        disabled={sendingReminder || !booking.guestEmail}
                        onClick={async () => {
                          if (!booking?.id) return;
                          if (!booking?.guestEmail) {
                            toastError('Khách hàng chưa có địa chỉ email để gửi nhắc nhở');
                            return;
                          }
                          setSendingReminder(true);
                          try {
                            const res = await bookingApi.sendCheckInReminder(booking.id);
                            toastSuccess(res.message || 'Đã gửi email nhắc nhận phòng thành công!');
                            fetchBookingDetails();
                          } catch (err: any) {
                            toastError(err.response?.data?.message || err.message || 'Không thể gửi email nhắc nhận phòng');
                          } finally {
                            setSendingReminder(false);
                          }
                        }}
                        className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        title={booking.guestEmail ? 'Gửi email nhắc nhận phòng ngay' : 'Khách chưa có email'}
                      >
                        <IoMailOutline size={12} /> {sendingReminder ? '...' : (booking.reminderSentAt ? 'Gửi lại' : 'Gửi')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CỘT 2: Chi tiết phòng & Thao tác */}
              <div className="bg-surface-container-lowest p-3 rounded-lg border border-border-grey flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2.5 border-b border-border-grey/70 pb-1.5">
                    <h4 className="font-semibold text-xs text-on-surface flex items-center gap-1.5 text-primary">
                      <IoLocationOutline size={15} /> Phòng &amp; Lưu trú
                    </h4>
                    {/* Thao tác phòng */}
                    <div className="flex items-center gap-1">
                      {(booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN') && (
                        <button
                          type="button"
                          onClick={openChangeRoom}
                          className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors cursor-pointer bg-transparent font-medium"
                          title="Đổi sang phòng khác cùng loại"
                        >
                          <IoSwapHorizontalOutline size={12}/> Đổi
                        </button>
                      )}
                      {(booking.status === 'NEW' || booking.status === 'CONFIRMED') && (
                        <button
                          type="button"
                          onClick={() => setShowRescheduleModal(true)}
                          className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-indigo-400/40 text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer bg-transparent font-medium"
                          title="Dời ngày nhận/trả phòng"
                        >
                          <IoCalendarOutline size={12}/> Dời
                        </button>
                      )}
                      {booking.status === 'CHECKED_IN' && (
                        <button
                          type="button"
                          onClick={() => setShowExtendModal(true)}
                          className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-teal-400/40 text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer bg-transparent font-medium"
                          title="Gia hạn lưu trú thêm đêm"
                        >
                          <IoMoonOutline size={12}/> Gia hạn
                        </button>
                      )}
                      {booking.status === 'CHECKED_IN' && (
                        <button
                          type="button"
                          onClick={() => setShowUpgradeModal(true)}
                          className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-purple-400/40 text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer bg-transparent font-medium"
                          title="Nâng lên hạng phòng cao hơn"
                        >
                          <IoSwapVerticalOutline size={12}/> Nâng hạng
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-on-surface-variant">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Loại phòng:</span>
                      <span className="font-semibold text-on-surface flex items-center gap-1.5">
                        {booking.roomTypeName}
                        {booking.roomCapacity && (
                          <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5 bg-surface-container px-1 py-0.2 rounded font-normal">
                            <IoPersonOutline size={10} /> {booking.roomCapacity} ng
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Phòng:</span>
                      <span className="font-bold text-primary">
                        {booking.roomNumber ? `Phòng ${booking.roomNumber}` : 'Chưa phân phòng'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Nhận phòng:</span>
                      <span className="font-medium text-on-surface">{formatStayDateTime(booking.checkInDate, 'checkin')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Trả phòng:</span>
                      <span className="font-medium text-on-surface">{formatStayDateTime(booking.checkOutDate, 'checkout')}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-border-grey/60 flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant/70">Thời gian ở:</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {calculateNights(booking.checkInDate, booking.checkOutDate)} đêm
                  </span>
                </div>
              </div>

              {/* CỘT 3: Biểu giá & Ghi chú đặt phòng */}
              <div className="bg-surface-container-lowest p-3 rounded-lg border border-border-grey flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-on-surface mb-2.5 flex items-center gap-1.5 border-b border-border-grey/70 pb-1.5 text-primary">
                    <IoCashOutline size={15} /> Giá phòng &amp; Ghi chú
                  </h4>
                  <div className="space-y-1.5 text-xs text-on-surface-variant">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Giá phòng:</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(booking.actualPrice || booking.expectedPrice)}
                        <span className="text-[10px] text-on-surface-variant font-normal"> /đêm</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Chính sách giá:</span>
                      <span className="font-medium text-on-surface">
                        {booking.priceSource === 'NEGOTIATED' ? 'Giá thỏa thuận' : 'Giá tiêu chuẩn'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant/70">Nguồn đặt:</span>
                      <span className="font-medium text-on-surface">
                        {booking.source || booking.channelName || 'Trực tiếp tại quầy'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hộp Ghi chú đặt phòng compact */}
                <div className="mt-2 bg-surface-container-low/70 border border-border-grey/60 rounded-md p-2 flex flex-col justify-center">
                  <div className="text-[10px] uppercase font-bold text-on-surface-variant/70 mb-0.5 tracking-wider">
                    Ghi chú
                  </div>
                  <p className="text-xs text-on-surface italic line-clamp-2" title={booking.note || 'Không có ghi chú'}>
                    {booking.note || "Không có ghi chú đặc biệt."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DỊCH VỤ PHỤ THU */}
          {activeTab === 'services' && (
            <BookingServicesTab bookingId={bookingId} status={booking.status} />
          )}

          {/* TAB 3: HÓA ĐƠN & THANH TOÁN */}
          {activeTab === 'invoice' && (
            <BookingInvoiceTab 
              bookingId={bookingId} 
              status={booking.status} 
              booking={booking}
              onPrintInvoice={(inv) => setPrintingInvoice(inv)}
            />
          )}

          {/* TAB 4: ĐẶT CỌC */}
          {activeTab === 'deposit' && (
            <DepositTab
              bookingId={Number(bookingId)}
              booking={booking}
              onRefresh={fetchBookingDetails}
            />
          )}
        </div>
      </div>

      {/* Modal Gia hạn */}
      {showExtendModal && (
        <ExtendStayModal
          isOpen={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          bookingId={Number(bookingId)}
          booking={booking}
          onSuccess={fetchBookingDetails}
        />
      )}

      {/* Modal Nâng hạng */}
      {showUpgradeModal && (
        <UpgradeRoomModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          bookingId={Number(bookingId)}
          booking={booking}
          onSuccess={fetchBookingDetails}
        />
      )}

      {/* Modal Nhận phòng nhanh từ trang chi tiết */}
      <CheckInModal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        booking={booking}
        onSuccess={() => {
          setCheckInModalOpen(false);
          fetchBookingDetails();
        }}
      />

      {/* Modal Xác nhận Trả phòng nhanh */}
      <Modal
        isOpen={checkOutConfirm}
        onClose={() => { if (!checkOutProcessing) { setCheckOutConfirm(false); setCheckOutError(''); } }}
        title="Xác nhận Trả phòng"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {checkOutError === 'invoice_required' ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <IoAlertCircleOutline size={20} className="text-amber-600" />
                Chưa thể trả phòng
              </div>
              <p className="text-sm text-amber-800">
                Cần lập hóa đơn và thu tiền đầy đủ trước khi trả phòng.
              </p>
              <Button
                variant="primary"
                icon={IoDocumentOutline}
                onClick={() => { setCheckOutConfirm(false); setCheckOutError(''); navigate(`?tab=invoice`); }}
              >
                Mở tab Hóa đơn &amp; Thanh toán
              </Button>
            </div>
          ) : checkOutError ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <IoAlertCircleOutline size={18} className="shrink-0" />
              <span>{checkOutError}</span>
            </div>
          ) : (
            <>
              <div className="bg-surface-container-low p-4 rounded-lg space-y-2 text-sm border border-border-grey">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Khách hàng:</span>
                  <span className="font-semibold text-on-surface">{booking.guestName}</span>
                </div>
                {booking.roomNumber && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Phòng:</span>
                    <span className="font-semibold text-primary">Phòng {booking.roomNumber}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-on-surface">
                Xác nhận khách trả phòng và chuyển trạng thái sang <strong>Đã đi</strong>?
              </p>
            </>
          )}
          {!checkOutError && (
            <div className="flex justify-end gap-3 pt-2 border-t border-border-grey">
              <Button variant="ghost" onClick={() => { setCheckOutConfirm(false); setCheckOutError(''); }} disabled={checkOutProcessing} icon={IoCloseOutline}>Hủy</Button>
              <Button
                variant="primary"
                icon={IoLogOutOutline}
                onClick={handleQuickCheckOut}
                disabled={checkOutProcessing}
              >
                {checkOutProcessing ? 'Đang xử lý...' : 'Xác nhận Trả phòng'}
              </Button>
            </div>
          )}
          {checkOutError && checkOutError !== 'invoice_required' && (
            <div className="flex justify-end pt-2 border-t border-border-grey">
              <Button variant="ghost" onClick={() => { setCheckOutConfirm(false); setCheckOutError(''); }} icon={IoCloseOutline}>Đóng</Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Đổi phòng */}
      {showChangeRoom && (
        <Modal isOpen={showChangeRoom} onClose={() => setShowChangeRoom(false)} title="Đổi Phòng Cùng Loại" maxWidth="max-w-lg">
          <div className="space-y-4">
            <div className="bg-surface-container-low p-3.5 rounded-lg border border-border-grey space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Loại phòng:</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  {booking?.roomTypeName}
                  {booking?.roomCapacity && (
                    <span className="text-[10px] text-on-surface-variant font-normal flex items-center gap-0.5 bg-surface-container px-1.5 py-0.5 rounded ml-1">
                      <IoPersonOutline size={10} /> {booking.roomCapacity} người
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Phòng hiện tại:</span>
                <span className="font-semibold text-on-surface">Phòng {booking?.roomNumber || 'Chưa gán'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Trạng thái:</span>
                <span className="font-medium text-on-surface">{booking?.status === 'CHECKED_IN' ? 'Đang ở (Đổi phòng trực tiếp)' : 'Đã xác nhận (Chờ nhận phòng)'}</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-on-surface">
              Chọn phòng trống cùng loại <span className="text-primary font-bold">({booking?.roomTypeName})</span>:
            </div>

            {loadingRooms ? (
              <div className="text-center py-8 text-on-surface-variant text-sm">Đang tải danh sách phòng...</div>
            ) : availableRooms.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <IoAlertCircleOutline size={17} className="text-amber-600 shrink-0" />
                  Không có phòng trống nào khác thuộc loại {booking?.roomTypeName}.
                </div>
                <p className="text-amber-800">
                  Nếu khách muốn chuyển sang hạng phòng khác, vui lòng sử dụng chức năng <strong>Nâng hạng phòng</strong>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {availableRooms.map(room => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setSelectedNewRoom(room);
                      if (changeRoomError) setChangeRoomError('');
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      selectedNewRoom?.id === room.id
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-border-grey hover:border-primary/50 bg-surface-container-lowest text-on-surface'
                    }`}
                  >
                    <div className="font-bold text-sm flex items-center justify-between">
                      <span>Phòng {room.roomNumber}</span>
                      {selectedNewRoom?.id === room.id && <IoCheckmarkCircleOutline size={16} className="text-primary" />}
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                      Tầng {room.floor || 1} • {room.roomTypeName}
                      {room.maxCapacity && (
                        <>
                          <span>•</span>
                          <IoPersonOutline size={10} /> {room.maxCapacity} người
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedNewRoom && booking?.status === 'CHECKED_IN' && (
              <div className="text-[11px] text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                ℹ️ Sau khi đổi, phòng cũ ({booking.roomNumber}) sẽ chuyển sang trạng thái <strong>Cần dọn</strong> và phòng mới ({selectedNewRoom.roomNumber}) chuyển sang <strong>Đang ở</strong>.
              </div>
            )}

            {changeRoomError && (
              <div className="flex items-center gap-2 text-xs text-error bg-red-50 border border-red-200 rounded-lg p-3">
                <IoAlertCircleOutline size={16} className="shrink-0"/> <span>{changeRoomError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
              <Button variant="ghost" onClick={() => setShowChangeRoom(false)} icon={IoCloseOutline}>Hủy</Button>
              <Button
                variant="primary"
                icon={IoSwapHorizontalOutline}
                onClick={handleConfirmChangeRoom}
                disabled={!selectedNewRoom || changingRoom}
              >
                {changingRoom ? 'Đang xử lý...' : 'Xác nhận đổi phòng'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* In Hóa đơn */}
      {printingInvoice && (
        <InvoicePrintTemplate 
          invoice={printingInvoice} 
          booking={booking} 
          onClose={() => setPrintingInvoice(null)} 
        />
      )}

      {/* NCL-04-CN-NEW: Dời lịch đặt phòng */}
      <RescheduleDateModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        bookingId={Number(bookingId)}
        booking={booking}
        onSuccess={fetchBookingDetails}
      />

      {/* NCL-04-CN-NEW: Trả phòng sớm */}
      <EarlyCheckoutModal
        isOpen={showEarlyCheckoutModal}
        onClose={() => setShowEarlyCheckoutModal(false)}
        bookingId={Number(bookingId)}
        guestName={booking?.guestName}
        onSuccess={fetchBookingDetails}
      />

      {/* Modal Khách cùng phòng */}
      {showStayingGuestsModal && (
        <StayingGuestsModal
          isOpen={showStayingGuestsModal}
          onClose={() => setShowStayingGuestsModal(false)}
          booking={booking}
          onUpdated={() => {
            fetchBookingDetails();
          }}
        />
      )}

      {/* Modal Bản xác nhận đặt phòng */}
      {showConfirmationModal && (
        <BookingConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          bookingId={Number(bookingId)}
          onBookingConfirmed={fetchBookingDetails}
        />
      )}
    </div>
  );
};

export default BookingDetailPage;
