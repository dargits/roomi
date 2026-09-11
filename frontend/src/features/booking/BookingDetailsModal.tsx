import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoAlertCircleOutline, 
  IoCallOutline, 
  IoCalendarOutline,
  IoCartOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseOutline, 
  IoDocumentOutline, 
  IoInformationCircleOutline, 
  IoLocationOutline, 
  IoMoonOutline, 
  IoPersonOutline, 
  IoSwapHorizontalOutline, 
  IoSwapVerticalOutline, 
  IoTimeOutline, 
  IoCashOutline,
  IoCopyOutline,
  IoShareSocialOutline,
  IoOpenOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs/Tabs';
import bookingApi from '../../services/bookingApi';
import { roomApi } from '../../services/roomApi';
import pricingApi from '../../services/pricingApi';
import BookingServicesTab from './BookingServicesTab';
import BookingInvoiceTab from './BookingInvoiceTab';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import DepositTab from './DepositTab';
import ExtendStayModal from './ExtendStayModal';
import RescheduleDateModal from './RescheduleDateModal';
import UpgradeRoomModal from './UpgradeRoomModal';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatName, formatPhone, formatEmail, formatCCCD } from '../../utils/personalDataMasker';

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number | string;
  onBookingUpdated?: () => void;
  initialTab?: string;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ isOpen, onClose, bookingId, onBookingUpdated, initialTab = 'info' }) => {
  const navigate = useNavigate();
  const { success: toastSuccess } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'info'); // info, services, invoice, deposit
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);

  const copyPublicShareLink = () => {
    const url = `${window.location.origin}/booking-detail/${bookingId}/${activeTab}`;
    navigator.clipboard.writeText(url);
    const tabName = activeTab === 'info' ? 'Thông tin chung' :
                    activeTab === 'services' ? 'Dịch vụ phụ thu' :
                    activeTab === 'invoice' ? 'Hóa đơn & Thanh toán' : 'Đặt cọc';
    toastSuccess(`Đã sao chép link gửi bạn bè/khách cho phần "${tabName}"!`);
  };

  const openDedicatedPage = () => {
    onClose();
    navigate(`/manage/bookings/${bookingId}?tab=${activeTab}`);
  };
  // === Đổi phòng ===
  const [showChangeRoom, setShowChangeRoom] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedNewRoom, setSelectedNewRoom] = useState(null);
  const [changingRoom, setChangingRoom] = useState(false);
  const [changeRoomError, setChangeRoomError] = useState('');
  // === NCL-04: Gia hạn & Nâng hạng ===
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // === NCL-04-CN-NEW: Dời lịch đặt phòng chưa nhận phòng ===
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  // === NCL-02-CN-006: Chi tiết giá từng đêm ===
  const [showNightlyBreakdown, setShowNightlyBreakdown] = useState(false);
  const [nightlyBreakdown, setNightlyBreakdown] = useState<any | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBookingDetails();
      setActiveTab('info');
      setShowNightlyBreakdown(false);
      setNightlyBreakdown(null);
    }
  }, [isOpen, bookingId]);

  const handleToggleNightlyBreakdown = async () => {
    if (!showNightlyBreakdown && !nightlyBreakdown && booking?.roomTypeId && booking?.checkInDate && booking?.checkOutDate) {
      setLoadingBreakdown(true);
      try {
        const data = await pricingApi.getPriceBreakdown({
          roomTypeId: booking.roomTypeId,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate
        });
        setNightlyBreakdown(data);
      } catch (err) {
        console.error('Lỗi tải chi tiết giá từng đêm:', err);
      } finally {
        setLoadingBreakdown(false);
      }
    }
    setShowNightlyBreakdown(prev => !prev);
  };

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getBookingById(bookingId);
      setBooking(data);
    } catch (error) {
      console.error("Lỗi lấy chi tiết đặt phòng", error);
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
      // Chỉ cho phép đổi phòng CÙNG LOẠI PHÒNG và đang AVAILABLE (khác phòng hiện tại)
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

  const handleChangeRoom = async () => {
    if (!selectedNewRoom) {
      setChangeRoomError('Vui lòng chọn một phòng trống cùng loại để đổi.');
      return;
    }
    if (selectedNewRoom.id === booking?.roomId) {
      setChangeRoomError('Phòng mới không được trùng với phòng hiện tại.');
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
      case 'NEW': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-medium text-xs">Mới</span>;
      case 'CONFIRMED': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium text-xs">Đã xác nhận</span>;
      case 'CHECKED_IN': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md font-medium text-xs">Đang ở</span>;
      case 'CHECKED_OUT': return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md font-medium text-xs">Đã đi</span>;
      case 'CANCELLED': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md font-medium text-xs">Đã hủy</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md font-medium text-xs">{status}</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết & Hóa đơn Đặt phòng" maxWidth="max-w-4xl">
      {loading ? (
        <div className="p-8 text-center text-on-surface-variant">Đang tải chi tiết...</div>
      ) : !booking ? (
        <div className="p-8 text-center text-error">Không tìm thấy thông tin đặt phòng.</div>
      ) : (
        <div className="flex flex-col h-full max-h-[80vh]">
          {/* Header Thông tin tóm tắt */}
          <div className="bg-surface-container-lowest p-4 rounded-lg border border-border-grey mb-4 shadow-sm flex flex-wrap gap-4 justify-between items-center">
            <div>
              <div className="font-title-lg text-on-surface flex items-center gap-2 mb-1">
                {booking.guestName}
                {getStatusBadge(booking.status)}
              </div>
              <div className="text-sm text-on-surface-variant flex items-center gap-4">
                <span className="flex items-center gap-1"><IoCallOutline size={14}/> {booking.guestPhone}</span>
                <span className="flex items-center gap-1">
                  <IoLocationOutline size={14}/> {booking.roomTypeName} {booking.roomNumber ? `- Phòng ${booking.roomNumber}` : ''}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Thời gian lưu trú</div>
              <div className="font-title-sm text-on-surface bg-surface-container-low px-3 py-1.5 rounded border border-border-grey flex items-center gap-2">
                <span>{formatStayDateTime(booking.checkInDate, 'checkin')}</span>
                <span className="text-on-surface-variant">→</span>
                <span>{formatStayDateTime(booking.checkOutDate, 'checkout')}</span>
                <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                  {calculateNights(booking.checkInDate, booking.checkOutDate)} đêm
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs với hiệu ứng trượt mượt mà */}
          <Tabs
            tabs={[
              { id: 'info', label: 'Thông tin chung', icon: IoInformationCircleOutline },
              { id: 'services', label: 'Dịch vụ phụ thu', icon: IoCartOutline },
              { id: 'invoice', label: 'Hóa đơn & Thanh toán', icon: IoDocumentOutline },
              { id: 'deposit', label: 'Đặt cọc', icon: IoCashOutline }
            ]}
            value={activeTab}
            onChange={(tabId) => setActiveTab(tabId)}
            variant="line"
            className="mb-6"
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
            
            {/* TAB INFO */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey">
                    <h4 className="font-title-md text-on-surface mb-4 flex items-center gap-2 border-b border-border-grey pb-2">
                      <IoPersonOutline size={18} className="text-primary"/> Chi tiết Khách hàng
                    </h4>
                    <div className="space-y-3 font-body-sm text-on-surface-variant">
                      <div className="flex justify-between"><span className="w-1/3">Họ tên:</span><span className="font-medium text-on-surface flex-1">{formatName(booking.guestName, user)}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Số điện thoại:</span><span className="font-medium text-on-surface flex-1">{formatPhone(booking.guestPhone, user)}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Email:</span><span className="font-medium text-on-surface flex-1">{booking.guestEmail ? formatEmail(booking.guestEmail, user) : 'Chưa cập nhật'}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">CCCD/CMND:</span><span className="font-medium text-on-surface flex-1">{formatCCCD(booking.guestIdNumber, user)}</span></div>
                    </div>

                    {/* Danh sách khách ở cùng phòng (NCL-04-CN-011) */}
                    {booking.stayingGuests && booking.stayingGuests.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border-grey">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                            <IoPersonOutline size={14} className="text-primary" />
                            Khách lưu trú tại phòng ({booking.stayingGuests.length})
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {booking.stayingGuests.map((sg, idx) => (
                            <div key={sg.id || idx} className="flex items-center justify-between p-2 rounded bg-surface-container-low text-xs">
                              <div>
                                <span className="font-medium text-on-surface">{formatName(sg.name, user)}</span>
                                {sg.phone && <span className="text-on-surface-variant ml-2">({formatPhone(sg.phone, user)})</span>}
                              </div>
                              <span className="font-mono text-on-surface-variant">{formatCCCD(sg.idNumber, user)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

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
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors cursor-pointer bg-transparent font-medium"
                          >
                            <IoSwapHorizontalOutline size={13}/> Đổi phòng
                          </button>
                        )}
                        {/* NCL-04-CN-NEW: Dời lịch */}
                        {(booking.status === 'NEW' || booking.status === 'CONFIRMED') && (
                          <button
                            type="button"
                            onClick={() => setShowRescheduleModal(true)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-indigo-400/40 text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer bg-transparent font-medium"
                          >
                            <IoCalendarOutline size={13}/> Dời lịch
                          </button>
                        )}
                        {/* NCL-04-CN-007: Gia hạn */}
                        {booking.status === 'CHECKED_IN' && (
                          <button
                            type="button"
                            onClick={() => setShowExtendModal(true)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-teal-400/40 text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer bg-transparent font-medium"
                          >
                            <IoMoonOutline size={13}/> Gia hạn
                          </button>
                        )}
                        {/* NCL-04-CN-008: Nâng hạng */}
                        {booking.status === 'CHECKED_IN' && (
                          <button
                            type="button"
                            onClick={() => setShowUpgradeModal(true)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-purple-400/40 text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer bg-transparent font-medium"
                          >
                            <IoSwapVerticalOutline size={13}/> Nâng hạng
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
                    
                      {/* NCL-02-CN-006: Nút xem chi tiết giá từng đêm */}
                      <div className="pt-2 border-t border-border-grey/60">
                        <button
                          type="button"
                          onClick={handleToggleNightlyBreakdown}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          <IoCalendarOutline size={14} />
                          {showNightlyBreakdown ? 'Ẩn bảng chi tiết giá từng đêm' : 'Xem chi tiết giá từng đêm (Lễ / Cuối tuần / Mùa)'}
                        </button>

                        {loadingBreakdown && (
                          <div className="text-xs text-on-surface-variant mt-2 flex items-center gap-1.5">
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            Đang tải chi tiết giá...
                          </div>
                        )}

                        {showNightlyBreakdown && nightlyBreakdown && nightlyBreakdown.nightlyDetails && (
                          <div className="mt-2.5 border border-border-grey rounded-lg overflow-hidden text-xs">
                            <div className="bg-surface-container-low px-3 py-1.5 font-semibold text-on-surface-variant border-b border-border-grey flex justify-between items-center">
                              <span>Bảng giá theo từng đêm lưu trú</span>
                              <span className="text-[11px] font-normal text-on-surface-variant">Lễ &gt; Cuối tuần &gt; Mùa &gt; Cơ bản</span>
                            </div>
                            <div className="divide-y divide-border-grey max-h-48 overflow-y-auto">
                              {nightlyBreakdown.nightlyDetails.map((night: any, idx: number) => {
                                const d = new Date(night.date);
                                const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                const sourceBadge = 
                                  night.priceSource === 'HOLIDAY' ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Ngày lễ</span>
                                  ) : night.priceSource === 'WEEKEND' ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Cuối tuần</span>
                                  ) : night.priceSource === 'SEASONAL' ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Theo mùa</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">Giá cơ bản</span>
                                  );

                                return (
                                  <div key={idx} className="px-3 py-1.5 flex items-center justify-between hover:bg-surface-container-low/50">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-on-surface">{formattedDate} ({night.dayOfWeek})</span>
                                      {sourceBadge}
                                    </div>
                                    <div className="text-right">
                                      <span className="font-bold text-on-surface">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(night.appliedPrice)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="bg-surface-container-low px-3 py-1.5 border-t border-border-grey flex justify-between items-center font-bold">
                              <span>Tổng tiền phòng:</span>
                              <span className="text-primary">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(nightlyBreakdown.totalRoomPrice || nightlyBreakdown.grandTotal)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey">
                  <h4 className="font-title-md text-on-surface mb-4 border-b border-border-grey pb-2">Ghi chú đặt phòng</h4>
                  <p className="text-body-md text-on-surface-variant italic">
                    {booking.note || "Không có ghi chú nào."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB SERVICES */}
            {activeTab === 'services' && (
              <BookingServicesTab bookingId={bookingId} status={booking.status} />
            )}

            {/* TAB INVOICE */}
            {activeTab === 'invoice' && (
              <BookingInvoiceTab 
                bookingId={bookingId} 
                status={booking.status} 
                booking={booking}
                onPrintInvoice={(inv) => setPrintingInvoice(inv)}
              />
            )}

            {/* TAB DEPOSIT — NCL-11-CN-002 đến NCL-11-CN-006 */}
            {activeTab === 'deposit' && (
              <DepositTab
                bookingId={Number(bookingId)}
                booking={booking}
                onRefresh={fetchBookingDetails}
              />
            )}

          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-4 mt-6 border-t border-border-grey">
            <button
              type="button"
              onClick={openDedicatedPage}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              title="Mở toàn bộ trang chi tiết theo tab hiện tại"
            >
              <IoOpenOutline size={14} /> Mở trang riêng
            </button>

            <Button variant="ghost" onClick={onClose} icon={IoCloseOutline}>Đóng</Button>
          </div>
        </div>
      )}

      {/* === NCL-04-CN-007: Gia hạn thêm đêm === */}
      {showExtendModal && (
        <ExtendStayModal
          isOpen={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          bookingId={Number(bookingId)}
          booking={booking}
          onSuccess={fetchBookingDetails}
        />
      )}

      {/* === NCL-04-CN-008: Nâng hạng phòng === */}
      {showUpgradeModal && (
        <UpgradeRoomModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          bookingId={Number(bookingId)}
          booking={booking}
          onSuccess={fetchBookingDetails}
        />
      )}

      {/* === Modal Đổi Phòng (Chỉ cùng loại phòng) === */}
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
                onClick={handleChangeRoom}
                disabled={!selectedNewRoom || changingRoom}
              >
                {changingRoom ? 'Đang xử lý...' : 'Xác nhận đổi phòng'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
    </Modal>
  );
};

export default BookingDetailsModal;
