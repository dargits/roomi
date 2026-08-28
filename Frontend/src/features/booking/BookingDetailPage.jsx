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
  IoCalendarOutline
} from 'react-icons/io5';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import bookingApi from '../../services/bookingApi';
import { roomApi } from '../../services/roomApi';
import BookingServicesTab from './BookingServicesTab';
import BookingInvoiceTab from './BookingInvoiceTab';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import DepositTab from './DepositTab';
import ExtendStayModal from './ExtendStayModal';
import LoadingScreen from '../../components/common/LoadingScreen';
import RescheduleDateModal from './RescheduleDateModal';
import UpgradeRoomModal from './UpgradeRoomModal';
import CheckInModal from './CheckInModal';
import EarlyCheckoutModal from './EarlyCheckoutModal';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Tabs from '../../components/ui/Tabs/Tabs';

const VALID_TABS = ['info', 'services', 'invoice', 'deposit'];

const BookingDetailPage = () => {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { success: toastSuccess, error: toastError } = useToast();
  const { user } = useAuth();
  
  const tab = searchParams.get('tab') || 'info';

  const formatCCCD = (cccd) => {
    if (!cccd) return 'Chưa cập nhật';
    if (['OWNER', 'RECEPTIONIST'].includes(user?.role)) {
      return cccd;
    }
    if (cccd.length > 4) {
      return '*'.repeat(cccd.length - 4) + cccd.slice(-4);
    }
    return cccd;
  };

  const fromUrl = location.state?.from || '/manage/bookings/list';
  const backLabel = fromUrl.includes('calendar') ? 'Lịch phòng' :
                    fromUrl.includes('requests') ? 'Yêu cầu từ Web' : 'Danh sách đặt phòng';

  const handleBack = () => {
    navigate(fromUrl);
  };

  const activeTab = VALID_TABS.includes(tab) ? tab : 'info';

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printingInvoice, setPrintingInvoice] = useState(null);

  // === Đổi phòng ===
  const [showChangeRoom, setShowChangeRoom] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedNewRoom, setSelectedNewRoom] = useState(null);
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
      const filtered = rooms.filter(r => {
        const rTypeId = r.roomTypeId || r.roomType?.id;
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

  if (loading) {
    return <LoadingScreen message={`Đang tải thông tin chi tiết đặt phòng #${bookingId}...`} />;
  }

  if (!booking) {
    return (
      <div className="bg-surface rounded-lg shadow-sm border border-border-grey p-12 text-center space-y-4">
        <IoAlertCircleOutline size={48} className="text-error mx-auto" />
        <h3 className="text-lg font-bold text-on-surface">Không tìm thấy thông tin đặt phòng #{bookingId}</h3>
        <Button onClick={handleBack} icon={IoArrowBackOutline}>
          Quay lại {backLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-surface-container-lowest p-4 rounded-lg border border-border-grey shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors bg-surface-container-low px-3 py-1.5 rounded-md border border-border-grey cursor-pointer"
            title={`Quay lại ${backLabel}`}
          >
            <IoArrowBackOutline size={16} /> Quay lại {backLabel}
          </button>
          <span className="text-on-surface-variant/40">/</span>
          <span className="text-sm font-semibold text-on-surface">
            Chi tiết #{booking.id} ({booking.guestName})
          </span>
        </div>
      </div>

      {/* Header Tóm tắt Đặt phòng */}
      <div className="bg-surface-container-lowest p-6 rounded-lg border border-border-grey shadow-sm flex flex-wrap gap-6 justify-between items-center">
        <div>
          <div className="font-headline-sm text-on-surface flex items-center gap-3 mb-2">
            <span>{booking.guestName}</span>
            {getStatusBadge(booking.status)}
            <span className="text-xs font-normal text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
              Mã: #{booking.id}
            </span>
          </div>
          <div className="text-sm text-on-surface-variant flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1.5">
              <IoCallOutline size={16} className="text-primary" /> {booking.guestPhone}
            </span>
            <span className="flex items-center gap-1.5">
              <IoLocationOutline size={16} className="text-primary" /> 
              <strong>{booking.roomTypeName}</strong> {booking.roomNumber ? `— Phòng ${booking.roomNumber}` : '— (Chưa gán)'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Thời gian lưu trú</div>
          <div className="font-title-sm text-on-surface bg-surface-container-low px-4 py-2 rounded-lg border border-border-grey flex items-center gap-2.5">
            <span>{formatStayDateTime(booking.checkInDate, 'checkin')}</span>
            <span className="text-on-surface-variant">→</span>
            <span>{formatStayDateTime(booking.checkOutDate, 'checkout')}</span>
            <span className="text-xs text-primary font-bold bg-primary/10 px-2.5 py-1 rounded">
              {calculateNights(booking.checkInDate, booking.checkOutDate)} đêm
            </span>
          </div>
          {/* Quick Action Buttons */}
          <div className="flex gap-2 flex-wrap justify-end">
            {booking.status === 'CONFIRMED' && booking.roomId && (
              <Button
                size="sm"
                variant="success"
                icon={IoCheckmarkCircleOutline}
                onClick={() => setCheckInModalOpen(true)}
              >
                Nhận phòng
              </Button>
            )}
            {booking.status === 'CHECKED_IN' && (
              <>
                {booking.checkOutDate > new Date().toISOString().split('T')[0] && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={IoTimeOutline}
                    onClick={() => setShowEarlyCheckoutModal(true)}
                    className="border-amber-400 text-amber-800 hover:bg-amber-50"
                  >
                    Trả phòng sớm
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  icon={IoLogOutOutline}
                  onClick={() => { setCheckOutConfirm(true); setCheckOutError(''); }}
                >
                  Trả phòng
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Container */}
      <div className="bg-surface rounded-lg border border-border-grey shadow-sm overflow-hidden">
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
          className="mt-0 border-b border-border-grey bg-surface-container-lowest" 
        />

        {/* Tab Content Body */}
        <div className="p-6">
          {/* TAB 1: THÔNG TIN CHUNG */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chi tiết khách hàng */}
                <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey">
                  <h4 className="font-title-md text-on-surface mb-4 flex items-center gap-2 border-b border-border-grey pb-2">
                    <IoPersonOutline size={18} className="text-primary"/> Chi tiết Khách hàng
                  </h4>
                  <div className="space-y-3 font-body-sm text-on-surface-variant">
                    <div className="flex justify-between"><span className="w-1/3">Họ tên:</span><span className="font-medium text-on-surface flex-1">{booking.guestName}</span></div>
                    <div className="flex justify-between"><span className="w-1/3">Số điện thoại:</span><span className="font-medium text-on-surface flex-1">{booking.guestPhone}</span></div>
                    <div className="flex justify-between"><span className="w-1/3">Email:</span><span className="font-medium text-on-surface flex-1">{booking.guestEmail || 'Chưa cập nhật'}</span></div>
                    <div className="flex justify-between"><span className="w-1/3">CCCD/CMND:</span><span className="font-medium text-on-surface flex-1">{formatCCCD(booking.guestIdNumber)}</span></div>
                  </div>
                </div>

                {/* Chi tiết phòng & Thao tác */}
                <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey">
                  <div className="flex justify-between items-center mb-4 border-b border-border-grey pb-2">
                    <h4 className="font-title-md text-on-surface flex items-center gap-2">
                      <IoLocationOutline size={18} className="text-primary"/> Chi tiết Phòng
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {(booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN') && (
                        <button
                          type="button"
                          onClick={openChangeRoom}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors cursor-pointer bg-transparent font-medium"
                        >
                          <IoSwapHorizontalOutline size={14}/> Đổi phòng
                        </button>
                      )}
                      {/* NCL-04-CN-NEW: Dời lịch */}
                      {(booking.status === 'NEW' || booking.status === 'CONFIRMED') && (
                        <button
                          type="button"
                          onClick={() => setShowRescheduleModal(true)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-indigo-400/40 text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer bg-transparent font-medium"
                        >
                          <IoCalendarOutline size={14}/> Dời lịch
                        </button>
                      )}
                      {booking.status === 'CHECKED_IN' && (
                        <button
                          type="button"
                          onClick={() => setShowExtendModal(true)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-teal-400/40 text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer bg-transparent font-medium"
                        >
                          <IoMoonOutline size={14}/> Gia hạn
                        </button>
                      )}
                      {booking.status === 'CHECKED_IN' && (
                        <button
                          type="button"
                          onClick={() => setShowUpgradeModal(true)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-purple-400/40 text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer bg-transparent font-medium"
                        >
                          <IoSwapVerticalOutline size={14}/> Nâng hạng
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 font-body-sm text-on-surface-variant">
                    <div className="flex justify-between">
                      <span className="w-1/3">Loại phòng:</span>
                      <span className="font-medium text-on-surface flex-1 flex items-center gap-2">
                        {booking.roomTypeName}
                        {booking.roomCapacity && (
                          <span className="text-[11px] text-on-surface-variant flex items-center gap-1 font-normal bg-surface-container px-1.5 py-0.5 rounded">
                            <IoPersonOutline size={12} /> {booking.roomCapacity} người
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="w-1/3">Phòng:</span><span className="font-medium text-on-surface flex-1">{booking.roomNumber ? `Phòng ${booking.roomNumber}` : 'Chưa phân phòng'}</span></div>
                    <div className="flex justify-between"><span className="w-1/3">Nhận phòng:</span><span className="font-medium text-on-surface flex-1">{formatStayDateTime(booking.checkInDate, 'checkin')}</span></div>
                    <div className="flex justify-between"><span className="w-1/3">Trả phòng:</span><span className="font-medium text-on-surface flex-1">{formatStayDateTime(booking.checkOutDate, 'checkout')}</span></div>
                    <div className="flex justify-between"><span className="w-1/3">Thời gian ở:</span><span className="font-semibold text-primary flex-1">{calculateNights(booking.checkInDate, booking.checkOutDate)} đêm</span></div>
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey">
                <h4 className="font-title-md text-on-surface mb-3 border-b border-border-grey pb-2">Ghi chú đặt phòng</h4>
                <p className="text-body-md text-on-surface-variant italic">
                  {booking.note || "Không có ghi chú nào."}
                </p>
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
              bookingId={bookingId}
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
          bookingId={bookingId}
          booking={booking}
          onSuccess={fetchBookingDetails}
        />
      )}

      {/* Modal Nâng hạng */}
      {showUpgradeModal && (
        <UpgradeRoomModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          bookingId={bookingId}
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
        bookingId={bookingId}
        booking={booking}
        onSuccess={fetchBookingDetails}
      />

      {/* NCL-04-CN-NEW: Trả phòng sớm */}
      <EarlyCheckoutModal
        isOpen={showEarlyCheckoutModal}
        onClose={() => setShowEarlyCheckoutModal(false)}
        bookingId={bookingId}
        guestName={booking?.guestName}
        onSuccess={fetchBookingDetails}
      />
    </div>
  );
};

export default BookingDetailPage;
