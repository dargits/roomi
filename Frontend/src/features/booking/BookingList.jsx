import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  IoLogInOutline,
  IoCardOutline,
  IoCloseOutline,
  IoDocumentOutline,
  IoPeopleOutline
} from 'react-icons/io5';
import bookingApi from '../../services/bookingApi';
import AssignRoomModal from './AssignRoomModal';
import CheckInModal from './CheckInModal';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import Pagination from '../../components/ui/Pagination';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';
import { formatPhone } from '../../utils/personalDataMasker';

const ITEMS_PER_PAGE = 10;

const BookingList = ({ onEditBooking }) => {
  const { user } = useAuth();
  const { success: toastSuccess } = useToast();
  const isAccountant = user?.role === 'ACCOUNTANT';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningBooking, setAssigningBooking] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | TODAY_CHECKIN | TODAY_CHECKOUT | CHECKED_IN
  const [currentPage, setCurrentPage] = useState(1);

  // State cho Modal xác nhận thao tác
  const [actionConfirm, setActionConfirm] = useState({
    isOpen: false,
    actionType: null,
    booking: null
  });
  const [checkInModal, setCheckInModal] = useState({
    isOpen: false,
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
      // Sắp xếp người mới (đặt gần nhất / ID cao nhất) lên trên đầu
      const sorted = (data || []).sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          const diff = new Date(b.createdAt) - new Date(a.createdAt);
          if (diff !== 0) return diff;
        }
        return (b.id || 0) - (a.id || 0);
      });
      setBookings(sorted);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredBookings = bookings.filter(b => {
    // Search filter
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const matchName = b.guestName?.toLowerCase().includes(q);
      const matchPhone = b.guestPhone?.toLowerCase().includes(q);
      const matchRoom = b.roomNumber?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchRoom) return false;
    }
    // Quick filter
    if (activeFilter === 'TODAY_CHECKIN') return b.checkInDate?.slice(0, 10) === todayStr;
    if (activeFilter === 'TODAY_CHECKOUT') return b.checkOutDate?.slice(0, 10) === todayStr;
    if (activeFilter === 'CHECKED_IN') return b.status === 'CHECKED_IN';
    if (activeFilter === 'GROUP') return Boolean(b.groupBookingId);
    return true;
  });

  // Reset về trang 1 khi tìm kiếm hoặc đổi filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const filterCounts = {
    TODAY_CHECKIN: bookings.filter(b => b.checkInDate?.slice(0, 10) === todayStr && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW').length,
    TODAY_CHECKOUT: bookings.filter(b => b.checkOutDate?.slice(0, 10) === todayStr && b.status === 'CHECKED_IN').length,
    CHECKED_IN: bookings.filter(b => b.status === 'CHECKED_IN').length,
    GROUP: bookings.filter(b => Boolean(b.groupBookingId) && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW').length,
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
    if (actionType === 'CHECK_IN') {
      setCheckInModal({ isOpen: true, booking });
      return;
    }
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
        case 'CHECK_OUT': 
          await bookingApi.checkOut(booking.id);
          toastSuccess(`Đã Check-out thành công cho khách ${booking.guestName}!`);
          break;
        case 'CANCEL': 
          res = await bookingApi.cancelBooking(booking.id); 
          if (res?.cancellationFee > 0) {
            toastSuccess(`Đã hủy đặt phòng thành công. Phí hủy áp dụng: ${formatCurrency(res.cancellationFee)}`);
          } else {
            toastSuccess(`Đã hủy đặt phòng thành công!`);
          }
          break;
        case 'NO_SHOW': 
          await bookingApi.noShow(booking.id);
          toastSuccess(`Đã đánh dấu khách vắng mặt (No-Show)!`);
          break;
      }
      closeActionModal();
      await fetchBookings();
    } catch (error) {
      console.error("Action error:", error);
      const serverMsg = error.response?.data?.message || '';
      if (actionType === 'CHECK_OUT' && serverMsg.includes('hóa đơn')) {
        setErrorMsg('Chưa lập hóa đơn hoặc chưa thanh toán đầy đủ. Vui lòng mở trang chi tiết đặt phòng ⇒ tab Hóa đơn & Thanh toán để lập hóa đơn và thu tiền trước khi trả phòng.');
      } else {
        setErrorMsg(serverMsg || 'Không thể thực hiện thao tác. Vui lòng thử lại.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const getActionTitle = () => {
    switch(actionConfirm.actionType) {
      case 'CHECK_OUT': return 'Xác nhận Trả phòng';
      case 'CANCEL': return 'Xác nhận Hủy đặt phòng';
      case 'NO_SHOW': return 'Xác nhận Khách không đến';
      default: return 'Xác nhận thao tác';
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-[580px] justify-between">
        <div className="flex-1">
        {/* Thanh search + filter nhanh */}
        <div className="p-4 border-b border-border-grey bg-surface-container-lowest flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Tìm theo tên khách, SĐT, số phòng..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-grey bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'TODAY_CHECKIN', label: `Hôm nay nhận${filterCounts.TODAY_CHECKIN ? ` (${filterCounts.TODAY_CHECKIN})` : ''}` },
              { key: 'TODAY_CHECKOUT', label: `Hôm nay trả${filterCounts.TODAY_CHECKOUT ? ` (${filterCounts.TODAY_CHECKOUT})` : ''}` },
              { key: 'CHECKED_IN', label: `Đang ở${filterCounts.CHECKED_IN ? ` (${filterCounts.CHECKED_IN})` : ''}` },
              { key: 'GROUP', label: `Theo đoàn${filterCounts.GROUP ? ` (${filterCounts.GROUP})` : ''}` },
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  activeFilter === f.key
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface text-on-surface-variant border-border-grey hover:border-primary/50 hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
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
            <tr>
              <td colSpan="5" className="p-8 text-center">
                <LoadingScreen message="Đang tải dữ liệu đặt phòng..." />
              </td>
            </tr>
          ) : filteredBookings.length === 0 ? (
            <tr><td colSpan="5" className="p-8 text-center text-on-surface-variant">
              {searchText || activeFilter !== 'ALL' ? 'Không tìm thấy đặt phòng nào phù hợp bộ lọc.' : 'Chưa có đặt phòng nào.'}
            </td></tr>
          ) : (
            paginatedBookings.map(booking => (
              <tr key={booking.id} className="border-b border-border-grey hover:bg-surface-container-low transition-colors group">
                <td className="p-4">
                  <Link 
                    to={`/manage/bookings/${booking.id}?tab=info`}
                    state={{ from: '/manage/bookings/list' }}
                    className="font-title-sm text-on-surface hover:text-primary transition-colors flex items-center gap-2 font-semibold group-hover:text-primary"
                    title="Bấm để mở trang chi tiết đặt phòng"
                  >
                    <IoPersonOutline size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                    {booking.guestName}
                  </Link>
                  <div className="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                    <IoCallOutline size={14} /> {formatPhone(booking.guestPhone, user)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {booking.groupBookingId ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <IoPeopleOutline size={12} />
                        Đoàn #{booking.groupBookingId}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Cá nhân
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-on-surface">
                    {booking.roomTypeName || 'Tiêu chuẩn'}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                    <IoPersonOutline size={12} /> {booking.guestCount || 1} người
                  </div>
                  {booking.roomNumber ? (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                      <IoHomeOutline size={12} />
                      Phòng {booking.roomNumber}
                    </div>
                  ) : (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 italic">
                      <IoHomeOutline size={12} />
                      Chưa xếp phòng
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-body-sm text-on-surface flex items-center gap-2">
                    <IoArrowForwardOutline size={14} className="text-green-600 shrink-0" /> 
                    <span>Nhận: <strong className="font-medium text-on-surface">{formatStayDateTime(booking.checkInDate, 'checkin')}</strong></span>
                  </div>
                  <div className="font-body-sm text-on-surface flex items-center gap-2 mt-1">
                    <IoArrowForwardOutline size={14} className="text-red-500 transform rotate-180 shrink-0" /> 
                    <span>Trả: <strong className="font-medium text-on-surface">{formatStayDateTime(booking.checkOutDate, 'checkout')}</strong></span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant font-medium mt-1 inline-block bg-surface-container px-2 py-0.5 rounded">
                    {calculateNights(booking.checkInDate, booking.checkOutDate)} đêm
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {getStatusBadge(booking.status)}
                    {booking.totalAmount != null && (
                      <span className="text-xs font-semibold text-on-surface mt-1">
                        {formatCurrency(booking.totalAmount)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <Link
                      to={`/manage/bookings/${booking.id}?tab=info`}
                      state={{ from: '/manage/bookings/list' }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition-colors border border-blue-200 flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Mở trang chi tiết đặt phòng & Hóa đơn"
                    >
                      <IoDocumentOutline size={14} /> Chi tiết & Hóa đơn
                    </Link>
                    
                    {/* Nút Xếp phòng: Chỉ hiển thị khi CHƯA xếp phòng và đơn ở trạng thái Mới hoặc Đã xác nhận (Ẩn khi Không đến, Đã hủy, Đang ở, Đã đi) */}
                    {!isAccountant && !booking.roomNumber && !booking.roomId && (booking.status === 'NEW' || booking.status === 'CONFIRMED') && (
                      <button 
                        type="button"
                        onClick={() => setAssigningBooking(booking)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-semibold transition-colors border border-indigo-200 cursor-pointer shadow-xs"
                      >
                        Xếp phòng
                      </button>
                    )}

                    {/* Nút Nhận phòng: Bắt buộc ĐÃ XẾP PHÒNG mới được nhận phòng, ẩn khi chưa xếp phòng */}
                    {!isAccountant && (booking.status === 'NEW' || booking.status === 'CONFIRMED') && Boolean(booking.roomNumber || booking.roomId) && (
                      <button 
                        type="button"
                        onClick={() => openActionModal('CHECK_IN', booking)}
                        className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-semibold transition-colors border border-green-200 cursor-pointer shadow-xs flex items-center gap-1"
                      >
                        <IoLogInOutline size={14} /> Nhận phòng
                      </button>
                    )}

                    {!isAccountant && (booking.status === 'NEW' || booking.status === 'CONFIRMED') && (
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
      </div>
    </div>

      {filteredBookings.length > ITEMS_PER_PAGE && (
        <div className="mt-auto">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>

      {/* Modal Xếp phòng */}
      {assigningBooking && (
        <AssignRoomModal
          isOpen={true}
          onClose={() => setAssigningBooking(null)}
          booking={assigningBooking}
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
                  {formatStayDateTime(actionConfirm.booking.checkInDate, 'checkin')} → {formatStayDateTime(actionConfirm.booking.checkOutDate, 'checkout')} ({calculateNights(actionConfirm.booking.checkInDate, actionConfirm.booking.checkOutDate)} đêm)
                </span>
              </div>
            </div>
          )}

          {actionConfirm.actionType === 'CHECK_OUT' && (
            <p className="text-sm text-on-surface">
              Xác nhận khách trả phòng và chuyển trạng thái sang <strong>Đã đi</strong>?
            </p>
          )}

          {actionConfirm.actionType === 'NO_SHOW' && (
            <p className="text-sm text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
              Đánh dấu khách <strong>Không đến</strong>. Trạng thái phòng sẽ được cập nhật.
            </p>
          )}

          {actionConfirm.actionType === 'CANCEL' && (
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              ⚠️ Lưu ý: Việc hủy đặt phòng có thể áp dụng phí phạt theo chính sách của khách sạn. Bạn có chắc chắn muốn hủy?
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <Button
              variant="ghost"
              onClick={closeActionModal}
              disabled={processing}
              icon={IoCloseOutline}
            >
              Đóng
            </Button>
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

      {/* Modal Check-in mới */}
      <CheckInModal
        isOpen={checkInModal.isOpen}
        onClose={() => setCheckInModal({ isOpen: false, booking: null })}
        booking={checkInModal.booking}
        onSuccess={() => {
          fetchBookings();
        }}
      />
    </>
  );
};

export default BookingList;
