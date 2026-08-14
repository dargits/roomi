import React, { useState, useEffect } from 'react';
import { Calendar, User, Phone, MapPin, Search, CheckCircle, Clock, XCircle, ArrowRight, Home } from 'lucide-react';
import bookingApi from '../../services/bookingApi';
import BookingDetailsModal from './BookingDetailsModal';
import AssignRoomModal from './AssignRoomModal';

const BookingList = ({ onEditBooking }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [assigningBooking, setAssigningBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getAllBookings();
      setBookings(data);
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

  const handleAction = async (actionType, id) => {
    if (!window.confirm(`Xác nhận thực hiện thao tác này?`)) return;
    
    try {
      switch(actionType) {
        case 'CHECK_IN': await bookingApi.checkIn(id); break;
        case 'CHECK_OUT': await bookingApi.checkOut(id); break;
        case 'CANCEL': await bookingApi.cancelBooking(id); break;
        case 'NO_SHOW': await bookingApi.noShow(id); break;
      }
      fetchBookings();
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || "Không thể thực hiện thao tác"));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
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
                  <div className="font-title-sm text-on-surface flex items-center gap-2">
                    <User size={16} className="text-on-surface-variant" />
                    {booking.guestName}
                  </div>
                  <div className="text-sm text-on-surface-variant mt-1 flex items-center gap-2">
                    <Phone size={14} /> {booking.guestPhone}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-title-sm text-on-surface">{booking.roomTypeName}</div>
                  <div className="text-sm text-on-surface-variant mt-1 flex items-center gap-1">
                    <Home size={14} /> 
                    {booking.roomNumber ? (
                      <span className="font-medium text-primary">Phòng {booking.roomNumber}</span>
                    ) : (
                      <span className="italic">Chưa xếp phòng</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-body-sm text-on-surface-variant flex items-center gap-2">
                    <ArrowRight size={14} className="text-green-600" /> Nhận: {booking.checkInDate}
                  </div>
                  <div className="font-body-sm text-on-surface-variant flex items-center gap-2 mt-1">
                    <ArrowRight size={14} className="text-red-500 transform rotate-180" /> Trả: {booking.checkOutDate}
                  </div>
                </td>
                <td className="p-4 text-center">
                  {getStatusBadge(booking.status)}
                  <div className="text-xs font-medium text-on-surface mt-2">
                    {formatCurrency(booking.expectedPrice)}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-wrap justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedBookingId(booking.id)} 
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium transition-colors border border-blue-200"
                    >
                      Chi tiết & Hóa đơn
                    </button>
                    {(booking.status === 'NEW' || booking.status === 'CONFIRMED') && !booking.roomId && (
                      <button onClick={() => setAssigningBooking(booking)} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium transition-colors border border-blue-200">
                        Xếp phòng
                      </button>
                    )}
                    {booking.status === 'CONFIRMED' && booking.roomId && (
                      <button onClick={() => handleAction('CHECK_IN', booking.id)} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors border border-green-200">
                        Nhận phòng
                      </button>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <button onClick={() => handleAction('NO_SHOW', booking.id)} className="px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded text-xs font-medium transition-colors border border-orange-200">
                        Không đến
                      </button>
                    )}
                    {booking.status === 'CHECKED_IN' && (
                      <button onClick={() => handleAction('CHECK_OUT', booking.id)} className="px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded text-xs font-medium transition-colors border border-gray-200">
                        Trả phòng
                      </button>
                    )}
                    {(booking.status === 'NEW' || booking.status === 'CONFIRMED') && (
                      <button onClick={() => handleAction('CANCEL', booking.id)} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors border border-red-200">
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

      {selectedBookingId && (
        <BookingDetailsModal 
          isOpen={true} 
          onClose={() => {
            setSelectedBookingId(null);
            fetchBookings(); // Cập nhật lại danh sách nếu có thay đổi
          }} 
          bookingId={selectedBookingId} 
        />
      )}

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
    </div>
  );
};

export default BookingList;
