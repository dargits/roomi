import React, { useState, useEffect } from 'react';
import { 
  IoArrowForwardOutline, 
  IoCalendarOutline, 
  IoCallOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, 
  IoHomeOutline, 
  IoLocationOutline, 
  IoPersonOutline, 
  IoSearchOutline, 
  IoTimeOutline,
  IoAlertCircleOutline,
  IoLogOutOutline,
  IoLogInOutline
} from 'react-icons/io5';
import bookingApi from '../../services/bookingApi';
import BookingDetailsModal from './BookingDetailsModal';
import AssignRoomModal from './AssignRoomModal';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const BookingList = ({ onEditBooking }) => {
  const { user } = useAuth();
  const isAccountant = user?.role === 'ACCOUNTANT';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [assigningBooking, setAssigningBooking] = useState(null);

  // State cho Modal xác nhận thao tác
  const [actionConfirm, setActionConfirm] = useState({
    isOpen: false,
    actionType: null,
    booking: null
  });
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getAllBookings();
      setBookings(data || []);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'NEW': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-medium text-xs">Mới</span>;
      case 'CONFIRMED': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium text-xs">Đã xác nhận</span>;
      case 'CHECKED_IN': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md font-medium text-xs">Đang ở</span>;
      case 'CHECKED_OUT': return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md font-medium text-xs">Đã đi</span>;
      case 'CANCELLED': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md font-medium text-xs">Đã hủy</span>;
      case 'NO_SHOW': return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md font-medium text-xs">Không đến</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md font-medium text-xs">{status}</span>;
    }
  };

  const openActionModal = (actionType, booking) => {
    setErrorMsg('');
    setActionConfirm({
      isOpen: true,
      actionType,
      booking
    });
  };

  const closeActionModal = () => {
    if (processing) return;
    setActionConfirm({
      isOpen: false,
      actionType: null,
      booking: null
    });
    setErrorMsg('');
  };

  const handleExecuteAction = async () => {
    const { actionType, booking } = actionConfirm;
    if (!booking) return;

    setProcessing(true);
    setErrorMsg('');
    try {
      let res;
      switch(actionType) {
        case 'CHECK_IN': 
          await bookingApi.checkIn(booking.id); 
          break;
        case 'CHECK_OUT': 
          await bookingApi.checkOut(booking.id); 
          break;
        case 'CANCEL': 
          res = await bookingApi.cancelBooking(booking.id); 
          if (res?.cancellationFee > 0) {
            alert(`Đã hủy đặt phòng thành công. Phí hủy áp dụng: ${formatCurrency(res.cancellationFee)}`);
          }
          break;
        case 'NO_SHOW': 
          await bookingApi.noShow(booking.id); 
          break;
      }
      closeActionModal();
      await fetchBookings();
    } catch (error) {
      console.error("Action error:", error);
      setErrorMsg(error.response?.data?.message || "Không thể thực hiện thao tác. Vui lòng thử lại.");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const getActionTitle = () => {
    switch(actionConfirm.actionType) {
      case 'CHECK_IN': return 'Xác nhận Nhận phòng (Check-in)';
      case 'CHECK_OUT': return 'Xác nhận Trả phòng (Check-out)';
      case 'CANCEL': return 'Xác nhận Hủy đặt phòng';
      case 'NO_SHOW': return 'Xác nhận Khách không đến (No-Show)';
      default: return 'Xác nhận thao tác';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-low border-b-2 border-border-grey font-label-md text-on-surface-variant uppercase tracking-wider">
            <th className="p-4 font-semibold">Khách Hàng</th>
            <th className="p-4 font-semibold">Phòng</th>
            <th className="p-4 font-semibold">Thời gian</th>
            <th className="p-4 font-semibold text-center">Trạng thái</th>
            <th className="p-4 font-semibold text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="5" className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu...</td></tr>
          ) : bookings.length === 0 ? (
            <tr><td colSpan="5" className="p-8 text-center text-on-surface-variant">Chưa có đặt phòng nào.</td></tr>
          ) : (
            bookings.map(booking => (
              <tr key={booking.id} className="border-b border-border-grey hover:bg-surface-container-low transition-colors group">
                <td className="p-4">
                  <div className="font-title-sm text-on-surface flex items-center gap-2 font-medium">
                    <IoPersonOutline size={16} className="text-on-surface-variant" />
                    {booking.guestName}
                  </div>
                  <div className="text-sm text-on-surface-variant mt-1 flex items-center gap-2">
                    <IoCallOutline size={14} /> {booking.guestPhone}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-title-sm text-on-surface font-medium">{booking.roomTypeName}</div>
                  <div className="text-sm text-on-surface-variant mt-1 flex items-center gap-1">
                    <IoHomeOutline size={14} /> 
                    {booking.roomNumber ? (
                      <span className="font-semibold text-primary">Phòng {booking.roomNumber}</span>
                    ) : (
                      <span className="italic text-amber-600">Chưa xếp phòng</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-body-sm text-on-surface-variant flex items-center gap-2">
                    <IoArrowForwardOutline size={14} className="text-green-600" /> Nhận: {booking.checkInDate}
                  </div>
                  <div className="font-body-sm text-on-surface-variant flex items-center gap-2 mt-1">
                    <IoArrowForwardOutline size={14} className="text-red-500 transform rotate-180" /> Trả: {booking.checkOutDate}
                  </div>
                </td>
                <td className="p-4 text-center">
                  {getStatusBadge(booking.status)}
                  <div className="text-xs font-medium text-on-surface mt-2">
                    {formatCurrency(booking.expectedPrice)}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-wrap justify-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setSelectedBookingId(booking.id)} 
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition-colors border border-blue-200 cursor-pointer shadow-xs"
                    >
                      Chi tiết & Hóa đơn
                    </button>
                    {!isAccountant && (booking.status === 'NEW' || booking.status === 'CONFIRMED') && !booking.roomId && (
                      <button 
                        type="button"
                        onClick={() => setAssigningBooking(booking)} 
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-semibold transition-colors border border-indigo-200 cursor-pointer shadow-xs"
                      >
                        Xếp phòng
                      </button>
                    )}
                    {!isAccountant && booking.status === 'CONFIRMED' && booking.roomId && (
                      <button 
                        type="button"
                        onClick={() => openActionModal('CHECK_IN', booking)} 
                        className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-semibold transition-colors border border-green-200 cursor-pointer shadow-xs"
                      >
                        Nhận phòng
                      </button>
                    )}
                    {!isAccountant && booking.status === 'CONFIRMED' && (
                      <button 
                        type="button"
                        onClick={() => openActionModal('NO_SHOW', booking)} 
                        className="px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded text-xs font-semibold transition-colors border border-orange-200 cursor-pointer shadow-xs"
                      >
                        Không đến
                      </button>
                    )}
                    {!isAccountant && booking.status === 'CHECKED_IN' && (
                      <button 
                        type="button"
                        onClick={() => openActionModal('CHECK_OUT', booking)} 
                        className="px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded text-xs font-semibold transition-colors border border-gray-200 cursor-pointer shadow-xs"
                      >
                        Trả phòng
                      </button>
                    )}
                    {!isAccountant && (booking.status === 'NEW' || booking.status === 'CONFIRMED') && (
                      <button 
                        type="button"
                        onClick={() => openActionModal('CANCEL', booking)} 
                        className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-semibold transition-colors border border-red-200 cursor-pointer shadow-xs"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal Chi tiết & Hóa đơn */}
      {selectedBookingId && (
        <BookingDetailsModal 
          isOpen={true} 
          onClose={() => {
            setSelectedBookingId(null);
            fetchBookings();
          }} 
          bookingId={selectedBookingId} 
        />
      )}

      {/* Modal Xếp phòng */}
      {assigningBooking && (
        <AssignRoomModal
          isOpen={true}
          onClose={() => setAssigningBooking(null)}
          bookingId={assigningBooking.id}
          roomTypeId={assigningBooking.roomTypeId}
          onAssigned={() => {
            fetchBookings();
            setAssigningBooking(null);
          }}
        />
      )}

      {/* Modal Xác nhận thao tác */}
      <Modal
        isOpen={actionConfirm.isOpen}
        onClose={closeActionModal}
        title={getActionTitle()}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <IoAlertCircleOutline size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {actionConfirm.booking && (
            <div className="bg-surface-container-low p-4 rounded-lg space-y-2 text-sm border border-border-grey">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Khách hàng:</span>
                <span className="font-semibold text-on-surface">{actionConfirm.booking.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Loại phòng:</span>
                <span className="font-semibold text-on-surface">{actionConfirm.booking.roomTypeName}</span>
              </div>
              {actionConfirm.booking.roomNumber && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Phòng số:</span>
                  <span className="font-semibold text-primary">Phòng {actionConfirm.booking.roomNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Thời gian:</span>
                <span className="font-semibold text-on-surface">
                  {actionConfirm.booking.checkInDate} → {actionConfirm.booking.checkOutDate}
                </span>
              </div>
            </div>
          )}

          {actionConfirm.actionType === 'CHECK_IN' && (
            <p className="text-sm text-on-surface">
              Xác nhận chuyển trạng thái sang <strong>Đang ở (CHECKED_IN)</strong> cho khách?
            </p>
          )}

          {actionConfirm.actionType === 'CHECK_OUT' && (
            <p className="text-sm text-on-surface">
              Xác nhận khách trả phòng và chuyển trạng thái sang <strong>Đã đi (CHECKED_OUT)</strong>?
            </p>
          )}

          {actionConfirm.actionType === 'NO_SHOW' && (
            <p className="text-sm text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
              Đánh dấu khách <strong>Không đến (NO_SHOW)</strong>. Trạng thái phòng sẽ được cập nhật.
            </p>
          )}

          {actionConfirm.actionType === 'CANCEL' && (
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              ⚠️ Lưu ý: Việc hủy đặt phòng có thể áp dụng phí phạt theo chính sách của khách sạn. Bạn có chắc chắn muốn hủy?
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <button
              type="button"
              onClick={closeActionModal}
              disabled={processing}
              className="px-4 py-2 text-sm rounded-lg border border-border-grey text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
            >
              Đóng
            </button>
            <Button
              type="button"
              variant={actionConfirm.actionType === 'CANCEL' ? 'danger' : 'primary'}
              onClick={handleExecuteAction}
              disabled={processing}
            >
              {processing ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingList;
