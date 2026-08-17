import React, { useState, useEffect } from 'react';
import { IoAlertCircleOutline, IoCallOutline, IoCartOutline, IoCheckmarkCircleOutline, IoCloseOutline, IoDocumentOutline, IoInformationCircleOutline, IoLocationOutline, IoMoonOutline, IoPersonOutline, IoSwapHorizontalOutline, IoSwapVerticalOutline, IoTimeOutline, IoCashOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import bookingApi from '../../services/bookingApi';
import { roomApi } from '../../services/roomApi';
import BookingServicesTab from './BookingServicesTab';
import BookingInvoiceTab from './BookingInvoiceTab';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import DepositTab from './DepositTab';
import ExtendStayModal from './ExtendStayModal';
import UpgradeRoomModal from './UpgradeRoomModal';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';

const BookingDetailsModal = ({ isOpen, onClose, bookingId }) => {
  const [activeTab, setActiveTab] = useState('info'); // info, services, invoice, deposit
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
  // === NCL-04: Gia hạn & Nâng hạng ===
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBookingDetails();
      setActiveTab('info');
    }
  }, [isOpen, bookingId]);

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
      alert(`Đổi sang Phòng ${selectedNewRoom.roomNumber} (${booking?.roomTypeName}) thành công!`);
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
          <div className="bg-surface-container-lowest p-4 rounded-lg border border-border-grey mb-6 shadow-sm flex flex-wrap gap-6 justify-between items-center">
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-border-grey mb-6 flex-wrap">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 font-title-sm flex items-center gap-2 transition-colors relative ${activeTab === 'info' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <IoInformationCircleOutline size={18} /> Thông tin chung
              {activeTab === 'info' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md"></span>}
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-3 font-title-sm flex items-center gap-2 transition-colors relative ${activeTab === 'services' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <IoCartOutline size={18} /> Dịch vụ phụ thu
              {activeTab === 'services' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md"></span>}
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-4 py-3 font-title-sm flex items-center gap-2 transition-colors relative ${activeTab === 'invoice' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <IoDocumentOutline size={18} /> Hóa đơn & Thanh toán
              {activeTab === 'invoice' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md"></span>}
            </button>
            {/* NCL-11-CN-002 đến NCL-11-CN-006: Tab đặt cọc */}
            <button
              onClick={() => setActiveTab('deposit')}
              className={`px-4 py-3 font-title-sm flex items-center gap-2 transition-colors relative ${activeTab === 'deposit' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <IoCashOutline size={18} /> Đặt cọc
              {activeTab === 'deposit' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md"></span>}
            </button>
          </div>

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
                      <div className="flex justify-between"><span className="w-1/3">Họ tên:</span><span className="font-medium text-on-surface flex-1">{booking.guestName}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Số điện thoại:</span><span className="font-medium text-on-surface flex-1">{booking.guestPhone}</span></div>
                      {booking.guestEmail && <div className="flex justify-between"><span className="w-1/3">Email:</span><span className="font-medium text-on-surface flex-1">{booking.guestEmail}</span></div>}
                      {booking.guestIdNumber && <div className="flex justify-between"><span className="w-1/3">CCCD/CMND:</span><span className="font-medium text-on-surface flex-1">{booking.guestIdNumber}</span></div>}
                    </div>
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
                      <div className="flex justify-between"><span className="w-1/3">Loại phòng:</span><span className="font-medium text-on-surface flex-1">{booking.roomTypeName}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Phòng:</span><span className="font-medium text-on-surface flex-1">{booking.roomNumber ? `Phòng ${booking.roomNumber}` : 'Chưa phân phòng'}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Nhận phòng:</span><span className="font-medium text-on-surface flex-1">{formatStayDateTime(booking.checkInDate, 'checkin')}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Trả phòng:</span><span className="font-medium text-on-surface flex-1">{formatStayDateTime(booking.checkOutDate, 'checkout')}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Thời gian ở:</span><span className="font-semibold text-primary flex-1">{calculateNights(booking.checkInDate, booking.checkOutDate)} đêm</span></div>
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
                bookingId={bookingId}
                booking={booking}
                onRefresh={fetchBookingDetails}
              />
            )}

          </div>

          <div className="flex justify-end pt-4 mt-6 border-t border-border-grey">
            <Button variant="ghost" onClick={onClose} icon={IoCloseOutline}>Đóng</Button>
          </div>
        </div>
      )}

      {/* === NCL-04-CN-007: Gia hạn thêm đêm === */}
      {showExtendModal && (
        <ExtendStayModal
          isOpen={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          bookingId={bookingId}
          booking={booking}
          onSuccess={fetchBookingDetails}
        />
      )}

      {/* === NCL-04-CN-008: Nâng hạng phòng === */}
      {showUpgradeModal && (
        <UpgradeRoomModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          bookingId={bookingId}
          booking={booking}
          onSuccess={fetchBookingDetails}
        />
      )}

      {/* === Modal Đổi Phòng (Chỉ cùng loại phòng) === */}
      {showChangeRoom && (
        <Modal isOpen={showChangeRoom} onClose={() => setShowChangeRoom(false)} title="Đổi Phòng Cùng Loại" maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="bg-surface-container-low p-3.5 rounded-lg border border-border-grey space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Loại phòng:</span>
                <span className="font-bold text-primary">{booking?.roomTypeName}</span>
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
                  Nếu khách muốn chuyển sang hạng phòng khác (Standard, Deluxe, Suite...), vui lòng sử dụng chức năng <strong>Nâng hạng phòng</strong>.
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
                    <div className="text-[11px] text-on-surface-variant mt-0.5">Tầng {room.floor || 1} • {room.roomTypeName}</div>
                  </button>
                ))}
              </div>
            )}

            {selectedNewRoom && booking?.status === 'CHECKED_IN' && (
              <div className="text-[11px] text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                ℹ️ Sau khi đổi, phòng cũ ({booking.roomNumber}) sẽ chuyển sang trạng thái <strong>Cần dọn (DIRTY)</strong> và phòng mới ({selectedNewRoom.roomNumber}) chuyển sang <strong>Đang ở (OCCUPIED)</strong>.
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
    </Modal>
  );
};

export default BookingDetailsModal;
