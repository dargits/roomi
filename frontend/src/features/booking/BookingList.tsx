import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  IoArrowForwardOutline, 
  IoCalendarOutline, 
  IoCallOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, 
  IoHomeOutline, 
  IoPersonOutline, 
  IoSearchOutline, 
  IoAlertCircleOutline, 
  IoLogOutOutline, 
  IoLogInOutline, 
  IoCardOutline, 
  IoCloseOutline, 
  IoDocumentOutline, 
  IoPeopleOutline, 
  IoDocumentTextOutline,
  IoEllipsisVertical,
  IoBedOutline,
  IoRefreshOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline
} from 'react-icons/io5';
import bookingApi from '../../services/bookingApi';
import bookingConfirmationApi from '../../services/bookingConfirmationApi';
import AssignRoomModal from './AssignRoomModal';
import BookingConfirmationModal from './BookingConfirmationModal';
import CheckInModal from './CheckInModal';
import RequestDebtCheckoutModal from './RequestDebtCheckoutModal';
import DebtManagementModal from './DebtManagementModal';
import StayingGuestsModal from './StayingGuestsModal';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';

interface BookingListProps {
  onEditBooking?: (booking: any) => void;
}

const BookingList: React.FC<BookingListProps> = ({ onEditBooking }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const isAccountant = user?.role === 'ACCOUNTANT';

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningBooking, setAssigningBooking] = useState<any>(null);
  const [confirmationBookingId, setConfirmationBookingId] = useState<number | null>(null);

  // Bộ lọc
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | TODAY_CHECKIN | TODAY_CHECKOUT | CHECKED_IN | UNASSIGNED | GROUP
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | NEW | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED | NO_SHOW
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dropdown menu đang mở
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Modals state
  const [isDebtManagementOpen, setIsDebtManagementOpen] = useState(false);
  const [debtModalBooking, setDebtModalBooking] = useState<any>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  const [isStayingGuestsOpen, setIsStayingGuestsOpen] = useState(false);
  const [stayingGuestsBooking, setStayingGuestsBooking] = useState<any>(null);

  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    actionType: string | null;
    booking: any;
  }>({
    isOpen: false,
    actionType: null,
    booking: null
  });

  const [checkInModal, setCheckInModal] = useState<{
    isOpen: boolean;
    booking: any;
  }>({
    isOpen: false,
    booking: null
  });

  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleGlobalClick = () => setActiveDropdownId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    fetchBookings();
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const getBookingPriorityRank = (b: any, today: string): number => {
    if (!b || !b.status) return 9;
    const cin = b.checkInDate ? String(b.checkInDate).slice(0, 10) : '';
    const cout = b.checkOutDate ? String(b.checkOutDate).slice(0, 10) : '';

    // 1. Nhận phòng hôm nay hoặc quá hạn mà chưa nhận phòng
    if ((b.status === 'CONFIRMED' || b.status === 'NEW') && cin && cin <= today) {
      return 1;
    }
    // 2. Trả phòng hôm nay hoặc quá hạn (đang ở)
    if (b.status === 'CHECKED_IN' && cout && cout <= today) {
      return 2;
    }
    // 3. Đơn mới cần xếp phòng / xác nhận
    if (b.status === 'NEW') {
      return 3;
    }
    // 4. Khách đang ở các ngày tiếp theo
    if (b.status === 'CHECKED_IN') {
      return 4;
    }
    // 5. Đơn đã xác nhận tương lai (sắp đến)
    if (b.status === 'CONFIRMED') {
      return 5;
    }
    // 6. Đã trả phòng hoàn tất
    if (b.status === 'CHECKED_OUT') {
      return 6;
    }
    // 7. Khách không đến
    if (b.status === 'NO_SHOW') {
      return 7;
    }
    // 8. Đã hủy
    if (b.status === 'CANCELLED') {
      return 8;
    }
    return 9;
  };

  const compareBookingsByImportance = (a: any, b: any, today: string): number => {
    const r1 = getBookingPriorityRank(a, today);
    const r2 = getBookingPriorityRank(b, today);
    if (r1 !== r2) {
      return r1 - r2;
    }
    // Cùng rank trong nhóm đã hoàn tất (CHECKED_OUT, NO_SHOW, CANCELLED): đơn gần đây đứng trước
    if (r1 >= 6) {
      const d1 = a.checkOutDate || a.checkInDate || '';
      const d2 = b.checkOutDate || b.checkInDate || '';
      if (d1 !== d2) {
        return d2.localeCompare(d1);
      }
      return (b.id || 0) - (a.id || 0);
    }
    // Nhóm đang hoạt động / sắp đến: ngày nhận phòng gần nhất trước
    const cinA = a.checkInDate ? String(a.checkInDate).slice(0, 10) : '';
    const cinB = b.checkInDate ? String(b.checkInDate).slice(0, 10) : '';
    if (cinA !== cinB) {
      return cinA.localeCompare(cinB);
    }
    return (b.id || 0) - (a.id || 0);
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getAllBookings();
      const sorted = (data || []).sort((a: any, b: any) => compareBookingsByImportance(a, b, todayStr));
      setBookings(sorted);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
      toastError?.("Không thể tải danh sách đặt phòng.");
    } finally {
      setLoading(false);
    }
  };

  // Chỉ số thống kê nhanh trên thanh KPI
  const stats = useMemo(() => {
    let todayCheckIn = 0;
    let todayCheckInDone = 0;
    let todayCheckOut = 0;
    let todayCheckOutDone = 0;
    let inHouse = 0;
    let unassigned = 0;
    let unpaid = 0;
    let groupCount = 0;

    for (const b of bookings) {
      const cin = b.checkInDate ? String(b.checkInDate).slice(0, 10) : '';
      const cout = b.checkOutDate ? String(b.checkOutDate).slice(0, 10) : '';

      if (cin === todayStr && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW') {
        todayCheckIn++;
        if (b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT') todayCheckInDone++;
      }
      if (cout === todayStr && (b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT')) {
        todayCheckOut++;
        if (b.status === 'CHECKED_OUT') todayCheckOutDone++;
      }
      if (b.status === 'CHECKED_IN') {
        inHouse++;
      }
      if (!b.roomId && !b.roomNumber && (b.status === 'NEW' || b.status === 'CONFIRMED')) {
        unassigned++;
      }
      if (b.paymentStatus !== 'PAID' && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW') {
        unpaid++;
      }
      if (b.groupBookingId && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW') {
        groupCount++;
      }
    }

    return {
      todayCheckIn,
      todayCheckInDone,
      todayCheckOut,
      todayCheckOutDone,
      inHouse,
      unassigned,
      unpaid,
      groupCount,
      total: bookings.length,
    };
  }, [bookings, todayStr]);

  // Bộ lọc dữ liệu thông minh
  const filteredBookings = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const isNum = /^\d+$/.test(q);

    const list = bookings.filter(b => {
      // 1. Tìm kiếm không phân biệt hoa thường và hỗ trợ cả số (mã, phòng)
      if (q) {
        if (isNum) {
          const matchId = String(b.id || '') === q || String(b.id || '').includes(q);
          const matchRoom = b.roomNumber ? String(b.roomNumber).toLowerCase().includes(q) : false;
          const matchPhone = b.guestPhone ? String(b.guestPhone).includes(q) : false;
          if (!matchId && !matchRoom && !matchPhone) return false;
        } else {
          const matchId = String(b.id || '').toLowerCase().includes(q);
          const matchName = b.guestName ? b.guestName.toLowerCase().includes(q) : false;
          const matchPhone = b.guestPhone ? String(b.guestPhone).includes(q) : false;
          const matchRoomType = b.roomTypeName ? b.roomTypeName.toLowerCase().includes(q) : false;
          const matchRoom = b.roomNumber ? String(b.roomNumber).toLowerCase().includes(q) : false;
          if (!matchId && !matchName && !matchPhone && !matchRoomType && !matchRoom) return false;
        }
      }

      // 2. Tab filter nhanh
      if (activeFilter === 'TODAY_CHECKIN' && b.checkInDate?.slice(0, 10) !== todayStr) return false;
      if (activeFilter === 'TODAY_CHECKOUT' && b.checkOutDate?.slice(0, 10) !== todayStr) return false;
      if (activeFilter === 'CHECKED_IN' && b.status !== 'CHECKED_IN') return false;
      if (activeFilter === 'UNASSIGNED' && (b.roomId || b.roomNumber || (b.status !== 'NEW' && b.status !== 'CONFIRMED'))) return false;
      if (activeFilter === 'GROUP' && !b.groupBookingId) return false;

      // 3. Lọc theo trạng thái
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

      // 4. Lọc theo khoảng ngày nhận phòng
      if (dateFrom) {
        const checkIn = b.checkInDate?.slice(0, 10);
        if (checkIn && checkIn < dateFrom) return false;
      }
      if (dateTo) {
        const checkIn = b.checkInDate?.slice(0, 10);
        if (checkIn && checkIn > dateTo) return false;
      }

      return true;
    });

    return list.sort((a, b) => compareBookingsByImportance(a, b, todayStr));
  }, [bookings, searchText, activeFilter, statusFilter, dateFrom, dateTo, todayStr]);

  // Reset trang về 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeFilter, statusFilter, dateFrom, dateTo, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  const getStatusBadge = (status: string, payLaterCheckout?: boolean) => {
    switch(status) {
      case 'NEW': 
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold text-xs">Mới</span>;
      case 'CONFIRMED': 
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-xs">Đã xác nhận</span>;
      case 'CHECKED_IN': 
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-xs">Đang ở</span>;
      case 'CHECKED_OUT': 
        return payLaterCheckout
          ? <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded font-semibold text-xs">Đã đi (Nợ)</span>
          : <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded font-semibold text-xs">Đã đi</span>;
      case 'CANCELLED': 
        return <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-semibold text-xs">Đã hủy</span>;
      case 'NO_SHOW': 
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold text-xs">Không đến</span>;
      default: 
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-semibold text-xs">{status}</span>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch(status) {
      case 'PAID':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px]">Đã thanh toán</span>;
      case 'PENDING_PAYMENT':
      case 'PENDING':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold text-[11px]">Chờ thanh toán</span>;
      case 'PENDING_DISCOUNT_APPROVAL':
        return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-semibold text-[11px]">Chờ duyệt giảm giá</span>;
      case 'ADJUSTED':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-[11px]">Đã điều chỉnh</span>;
      case 'DEBT':
      case 'PARTIALLY_PAID':
        return <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded font-semibold text-[11px]">Còn nợ</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded font-semibold text-[11px]">Chưa lập HĐ</span>;
    }
  };

  // Xác nhận trực tiếp booking ở trạng thái NEW
  const handleDirectConfirm = async (booking: any) => {
    setProcessing(true);
    try {
      await bookingConfirmationApi.confirmBooking(booking.id);
      toastSuccess(`Đã xác nhận đặt phòng #${booking.id} cho khách ${booking.guestName}!`);
      await fetchBookings();
    } catch (err: any) {
      toastError?.(err.response?.data?.message || 'Không thể xác nhận đặt phòng.');
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (actionType: string, booking: any) => {
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
            toastSuccess(`Đã hủy đặt phòng thành công. Phí phạt: ${formatCurrency(res.cancellationFee)}`);
          } else {
            toastSuccess(`Đã hủy đặt phòng thành công!`);
          }
          break;
        case 'NO_SHOW': 
          await bookingApi.noShow(booking.id);
          toastSuccess(`Đã ghi nhận khách vắng mặt (No-Show)!`);
          break;
      }
      closeActionModal();
      await fetchBookings();
    } catch (error: any) {
      console.error("Action error:", error);
      const serverMsg = error.response?.data?.message || '';
      if (actionType === 'CHECK_OUT' && serverMsg.includes('hóa đơn')) {
        setErrorMsg('Chưa lập hóa đơn hoặc chưa thanh toán đầy đủ. Vui lòng thanh toán hoặc đề nghị duyệt trả phòng còn nợ.');
      } else {
        setErrorMsg(serverMsg || 'Không thể thực hiện thao tác. Vui lòng thử lại.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
  };

  const getActionTitle = () => {
    switch(actionConfirm.actionType) {
      case 'CHECK_OUT': return 'Xác nhận Trả phòng';
      case 'CANCEL': return 'Xác nhận Hủy đặt phòng';
      case 'NO_SHOW': return 'Xác nhận Khách không đến (No-Show)';
      default: return 'Xác nhận thao tác';
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* ─── 1. Thanh Thẻ Chỉ Số Vận Hành Nhanh (Operational KPI Cards) ─── */}
      <div className="p-4 bg-surface-container-lowest border-b border-border-grey">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card: Hôm nay nhận */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'TODAY_CHECKIN' ? 'ALL' : 'TODAY_CHECKIN')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'TODAY_CHECKIN'
                ? 'bg-emerald-50 border-emerald-300 shadow-xs ring-1 ring-emerald-400'
                : 'bg-surface hover:bg-surface-container-low border-border-grey'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-semibold">Hôm nay nhận</span>
              <IoLogInOutline size={18} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-on-surface">{stats.todayCheckIn}</span>
              <span className="text-[11px] text-on-surface-variant">
                ({stats.todayCheckInDone} đã vào)
              </span>
            </div>
          </button>

          {/* Card: Hôm nay trả */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'TODAY_CHECKOUT' ? 'ALL' : 'TODAY_CHECKOUT')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'TODAY_CHECKOUT'
                ? 'bg-blue-50 border-blue-300 shadow-xs ring-1 ring-blue-400'
                : 'bg-surface hover:bg-surface-container-low border-border-grey'
            }`}
          >
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-xs font-semibold">Hôm nay trả</span>
              <IoLogOutOutline size={18} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-on-surface">{stats.todayCheckOut}</span>
              <span className="text-[11px] text-on-surface-variant">
                ({stats.todayCheckOutDone} đã trả)
              </span>
            </div>
          </button>

          {/* Card: Đang lưu trú */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'CHECKED_IN' ? 'ALL' : 'CHECKED_IN')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'CHECKED_IN'
                ? 'bg-indigo-50 border-indigo-300 shadow-xs ring-1 ring-indigo-400'
                : 'bg-surface hover:bg-surface-container-low border-border-grey'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-xs font-semibold">Đang ở (In-house)</span>
              <IoBedOutline size={18} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-on-surface">{stats.inHouse}</span>
              <span className="text-[11px] text-on-surface-variant">phòng</span>
            </div>
          </button>

          {/* Card: Chưa xếp phòng */}
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'UNASSIGNED'
                ? 'bg-amber-50 border-amber-300 shadow-xs ring-1 ring-amber-400'
                : stats.unassigned > 0
                  ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200'
                  : 'bg-surface hover:bg-surface-container-low border-border-grey'
            }`}
          >
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-xs font-semibold">Chờ xếp phòng</span>
              <IoAlertCircleOutline size={18} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold ${stats.unassigned > 0 ? 'text-amber-800' : 'text-on-surface'}`}>
                {stats.unassigned}
              </span>
              <span className="text-[11px] text-on-surface-variant">cần gán</span>
            </div>
          </button>

          {/* Card / Nút: Công nợ & Duyệt nợ */}
          <button
            type="button"
            onClick={() => setIsDebtManagementOpen(true)}
            className="p-3 rounded-xl border border-border-grey bg-surface hover:bg-surface-container-low text-left transition-all cursor-pointer flex flex-col justify-between"
            title="Xem danh sách công nợ và duyệt trả phòng còn nợ"
          >
            <div className="flex items-center justify-between text-purple-700 mb-1">
              <span className="text-xs font-semibold">Công nợ & Duyệt nợ</span>
              <IoCardOutline size={18} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant font-medium">Theo dõi dư nợ</span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                Quản lý
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ─── 2. Thanh Tìm kiếm & Bộ Lọc Nhanh ─── */}
      <div className="p-4 border-b border-border-grey bg-surface-container-lowest space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Ô tìm kiếm thông minh */}
          <div className="relative flex-1">
            <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Tìm theo mã (#1), tên khách, số điện thoại, số phòng..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-border-grey bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <IoCloseOutline size={16} />
              </button>
            )}
          </div>

          {/* Lọc trạng thái & Ngày tháng */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border-grey bg-surface text-xs font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NEW">Mới tạo (NEW)</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="CHECKED_IN">Đang ở (CHECKED_IN)</option>
              <option value="CHECKED_OUT">Đã trả phòng</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="NO_SHOW">Khách không đến</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <span>Từ:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-border-grey bg-surface text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span>Đến:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-border-grey bg-surface text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {(searchText || dateFrom || dateTo || statusFilter !== 'ALL' || activeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  setDateFrom('');
                  setDateTo('');
                  setStatusFilter('ALL');
                  setActiveFilter('ALL');
                }}
                className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors font-semibold cursor-pointer"
                title="Đặt lại tất cả bộ lọc"
              >
                Đặt lại
              </button>
            )}

            <button
              type="button"
              onClick={fetchBookings}
              disabled={loading}
              className="p-2 border border-border-grey rounded-lg bg-surface text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <IoRefreshOutline size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border-grey/50">
          {[
            { key: 'ALL', label: `Tất cả (${stats.total})` },
            { key: 'TODAY_CHECKIN', label: `Hôm nay nhận (${stats.todayCheckIn})` },
            { key: 'TODAY_CHECKOUT', label: `Hôm nay trả (${stats.todayCheckOut})` },
            { key: 'CHECKED_IN', label: `Đang ở (${stats.inHouse})` },
            { key: 'UNASSIGNED', label: `Chờ gán phòng (${stats.unassigned})` },
            { key: 'GROUP', label: `Theo đoàn (${stats.groupCount})` },
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeFilter === f.key
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-surface text-on-surface-variant border-border-grey hover:border-primary/40 hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. Bảng Dữ Liệu Đặt Phòng ─── */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b-2 border-border-grey text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              <th className="p-3.5 pl-5">Mã & Khách Hàng</th>
              <th className="p-3.5">Phòng Đã Gán</th>
              <th className="p-3.5">Thời Gian Lưu Trú</th>
              <th className="p-3.5 text-center">Trạng Thái & TT</th>
              <th className="p-3.5 pr-5 text-center w-64">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-grey">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <LoadingScreen message="Đang tải dữ liệu đặt phòng..." />
                </td>
              </tr>
            ) : paginatedBookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 bg-surface-container-low text-on-surface-variant/40 rounded-full flex items-center justify-center mb-3">
                      <IoSearchOutline size={22} />
                    </div>
                    <p className="text-sm font-semibold text-on-surface">Không tìm thấy đặt phòng phù hợp</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh khoảng thời gian lọc.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedBookings.map((booking) => (
                <tr 
                  key={booking.id}
                  className="hover:bg-surface-container-low/60 transition-colors group"
                >
                  {/* Mã & Khách hàng */}
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/manage/bookings/${booking.id}?tab=info`}
                        className="font-mono font-bold text-primary hover:underline text-sm"
                        title="Xem chi tiết đơn đặt phòng"
                      >
                        #{booking.id}
                      </Link>
                      {booking.groupBookingId ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Đoàn #{booking.groupBookingId}
                        </span>
                      ) : booking.channelName ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          {booking.channelName}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-container text-on-surface-variant">
                          Cá nhân
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-on-surface text-sm mt-1">
                      {booking.guestName || 'Khách lẻ'}
                    </div>
                    {booking.guestPhone && (
                      <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1 font-mono">
                        <IoCallOutline size={12} className="text-on-surface-variant/60" />
                        <span>{booking.guestPhone}</span>
                      </div>
                    )}
                  </td>

                  {/* Phòng & Loại phòng */}
                  <td className="p-3.5">
                    <div className="font-semibold text-on-surface text-sm">
                      {booking.roomTypeName || 'Tiêu chuẩn'}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                      <IoPersonOutline size={12} />
                      <span>Sức chứa: {booking.roomCapacity || 2} người</span>
                    </div>
                    {booking.roomNumber ? (
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        <IoHomeOutline size={12} />
                        <span>Phòng {booking.roomNumber}</span>
                      </div>
                    ) : (
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <IoAlertCircleOutline size={12} />
                        <span>Chưa xếp phòng</span>
                      </div>
                    )}
                  </td>

                  {/* Thời gian lưu trú */}
                  <td className="p-3.5">
                    <div className="text-xs text-on-surface flex items-center gap-1.5">
                      <IoArrowForwardOutline size={12} className="text-emerald-600 shrink-0" />
                      <span>Nhận: <strong>{formatStayDateTime(booking.checkInDate, 'checkin')}</strong></span>
                    </div>
                    <div className="text-xs text-on-surface flex items-center gap-1.5 mt-1">
                      <IoArrowForwardOutline size={12} className="text-red-500 transform rotate-180 shrink-0" />
                      <span>Trả: <strong>{formatStayDateTime(booking.checkOutDate, 'checkout')}</strong></span>
                    </div>
                    <div className="text-[11px] text-on-surface-variant font-medium mt-1 inline-block bg-surface-container px-2 py-0.5 rounded">
                      {calculateNights(booking.checkInDate, booking.checkOutDate)} đêm
                    </div>
                  </td>

                  {/* Trạng thái & Thanh toán */}
                  <td className="p-3.5 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div>{getStatusBadge(booking.status, booking.payLaterCheckout)}</div>
                      {!booking.payLaterCheckout && <div>{getPaymentBadge(booking.paymentStatus)}</div>}
                      {(booking.actualPrice != null || booking.expectedPrice != null) && (
                        <span className="text-xs font-bold text-on-surface font-mono mt-0.5">
                          {formatCurrency(booking.actualPrice || booking.expectedPrice)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cột Thao Tác (Gọn gàng, phân cấp logic, không viết hoa tràn lan) */}
                  <td className="p-3.5 pr-5 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                      {/* 1. Nút hành động chính theo ngữ cảnh */}
                      {/* NEW & chưa xếp phòng -> Xếp phòng */}
                      {!isAccountant && (booking.status === 'NEW' || booking.status === 'CONFIRMED') && !booking.roomNumber && !booking.roomId && (
                        <button 
                          type="button"
                          onClick={() => setAssigningBooking(booking)}
                          className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors border border-indigo-200 cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                          title="Chọn và xếp phòng thực tế cho đơn này"
                        >
                          <IoBedOutline size={13} />
                          <span>Xếp phòng</span>
                        </button>
                      )}

                      {/* NEW & đã có phòng -> Xác nhận */}
                      {!isAccountant && booking.status === 'NEW' && Boolean(booking.roomNumber || booking.roomId) && (
                        <button 
                          type="button"
                          onClick={() => handleDirectConfirm(booking)}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors border border-blue-200 cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                          title="Xác nhận đặt phòng (chuyển sang trạng thái Đã xác nhận)"
                        >
                          <IoCheckmarkCircleOutline size={13} />
                          <span>Xác nhận</span>
                        </button>
                      )}

                      {/* CONFIRMED & đã có phòng -> Nhận phòng */}
                      {!isAccountant && booking.status === 'CONFIRMED' && Boolean(booking.roomNumber || booking.roomId) && (
                        <button 
                          type="button"
                          onClick={() => openActionModal('CHECK_IN', booking)}
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors border border-emerald-200 cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                          title="Thực hiện nhận phòng (Check-in)"
                        >
                          <IoLogInOutline size={14} />
                          <span>Nhận phòng</span>
                        </button>
                      )}

                      {/* CHECKED_IN -> Trả phòng */}
                      {!isAccountant && booking.status === 'CHECKED_IN' && (
                        <button 
                          type="button"
                          onClick={() => openActionModal('CHECK_OUT', booking)} 
                          className="px-2.5 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition-colors border border-gray-200 cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                          title="Thực hiện trả phòng (Check-out)"
                        >
                          <IoLogOutOutline size={13} />
                          <span>Trả phòng</span>
                        </button>
                      )}

                      {/* 2. Nút Chi tiết */}
                      <Link
                        to={`/manage/bookings/${booking.id}?tab=info`}
                        state={{ from: '/manage/bookings/list' }}
                        className="px-2.5 py-1.5 bg-surface text-on-surface hover:bg-surface-container-low rounded-lg text-xs font-semibold transition-colors border border-border-grey flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                        title="Mở hồ sơ chi tiết đặt phòng & Hóa đơn"
                      >
                        <IoDocumentOutline size={13} />
                        <span>Chi tiết</span>
                      </Link>

                      {/* 3. Menu Tác vụ mở rộng (•••) */}
                      <div className="relative inline-block text-left shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === booking.id ? null : booking.id);
                          }}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            activeDropdownId === booking.id 
                              ? 'bg-surface-container-high border-primary text-primary' 
                              : 'border-border-grey text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                          }`}
                          title="Tác vụ khác"
                        >
                          <IoEllipsisVertical size={14} />
                        </button>

                        {activeDropdownId === booking.id && (
                          <div 
                            className="absolute right-0 mt-1 w-52 bg-white border border-border-grey rounded-xl shadow-xl py-1.5 z-50 text-xs font-medium divide-y divide-border-grey/50"
                            onClick={e => e.stopPropagation()}
                          >
                            {/* Phiếu xác nhận (Voucher) & Hóa đơn */}
                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setConfirmationBookingId(booking.id);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-surface-container-low flex items-center gap-2 text-on-surface transition-colors cursor-pointer"
                              >
                                <IoDocumentTextOutline size={14} className="text-primary" />
                                <span>Phiếu xác nhận (Voucher)</span>
                              </button>
                              <Link
                                to={`/manage/bookings/${booking.id}?tab=invoice`}
                                className="w-full text-left px-3 py-2 hover:bg-surface-container-low flex items-center gap-2 text-on-surface transition-colors cursor-pointer"
                              >
                                <IoCardOutline size={14} className="text-emerald-600" />
                                <span>Hóa đơn & Thanh toán</span>
                              </Link>
                            </div>

                            {/* Dành cho khách đang ở (CHECKED_IN) */}
                            {booking.status === 'CHECKED_IN' && !isAccountant && (
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setStayingGuestsBooking(booking);
                                    setIsStayingGuestsOpen(true);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-surface-container-low flex items-center gap-2 text-on-surface transition-colors cursor-pointer"
                                >
                                  <IoPeopleOutline size={14} className="text-blue-600" />
                                  <span>Khách cùng phòng</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDebtModalBooking(booking);
                                    setIsDebtModalOpen(true);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-surface-container-low flex items-center gap-2 text-on-surface transition-colors cursor-pointer"
                                >
                                  <IoCardOutline size={14} className="text-amber-600" />
                                  <span>Đề nghị trả phòng nợ</span>
                                </button>
                              </div>
                            )}

                            {/* Báo không đến (No-Show) cho đơn NEW hoặc CONFIRMED */}
                            {(booking.status === 'NEW' || booking.status === 'CONFIRMED') && !isAccountant && (
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    openActionModal('NO_SHOW', booking);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-orange-50 text-orange-700 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <IoAlertCircleOutline size={14} />
                                  <span>Báo khách không đến</span>
                                </button>
                              </div>
                            )}

                            {/* Hủy đặt phòng cho đơn NEW hoặc CONFIRMED */}
                            {(booking.status === 'NEW' || booking.status === 'CONFIRMED') && !isAccountant && (
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    openActionModal('CANCEL', booking);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <IoCloseCircleOutline size={14} />
                                  <span>Hủy đặt phòng</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 4. Phân trang hoàn chỉnh (Pagination) ─── */}
      {!loading && filteredBookings.length > 0 && (
        <div className="px-4 py-3 border-t border-border-grey bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
          <div>
            Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredBookings.length)}</strong> trong tổng số <strong>{filteredBookings.length.toLocaleString()}</strong> đặt phòng
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-border-grey rounded-md bg-white text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-md border border-border-grey disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low text-on-surface transition-colors cursor-pointer"
                title="Trang trước"
              >
                <IoChevronBackOutline size={14} />
              </button>
              <span className="px-3 py-1 font-semibold text-on-surface">
                Trang {currentPage} / {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-md border border-border-grey disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low text-on-surface transition-colors cursor-pointer"
                title="Trang sau"
              >
                <IoChevronForwardOutline size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}
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
            <div className="space-y-3">
              <p className="text-sm text-on-surface">
                Xác nhận khách trả phòng và chuyển trạng thái sang <strong>Đã đi</strong>?
              </p>
              {errorMsg && (
                <div className="pt-2 border-t border-border-grey/60">
                  <button
                    type="button"
                    onClick={() => {
                      setDebtModalBooking(actionConfirm.booking);
                      setIsDebtModalOpen(true);
                    }}
                    className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <IoCardOutline size={16} className="text-amber-700" />
                    <span>Đề nghị trả phòng còn nợ (Gửi Chủ cơ sở duyệt)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {actionConfirm.actionType === 'NO_SHOW' && (
            <p className="text-sm text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
              Đánh dấu khách <strong>Không đến</strong>. Trạng thái phòng sẽ được cập nhật lại.
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

      {/* Modal Check-in */}
      <CheckInModal
        isOpen={checkInModal.isOpen}
        onClose={() => setCheckInModal({ isOpen: false, booking: null })}
        booking={checkInModal.booking}
        onSuccess={fetchBookings}
      />

      {/* Modal Đề nghị trả phòng còn nợ */}
      <RequestDebtCheckoutModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        booking={debtModalBooking}
        onSuccess={() => {
          closeActionModal();
          fetchBookings();
        }}
      />

      {/* Modal Quản lý công nợ & Duyệt nợ */}
      <DebtManagementModal
        isOpen={isDebtManagementOpen}
        onClose={() => setIsDebtManagementOpen(false)}
        onRefreshData={fetchBookings}
      />

      {/* Modal Khách cùng phòng */}
      <StayingGuestsModal
        isOpen={isStayingGuestsOpen}
        onClose={() => setIsStayingGuestsOpen(false)}
        booking={stayingGuestsBooking}
        onUpdated={fetchBookings}
      />

      {/* Modal Bản xác nhận đặt phòng */}
      {confirmationBookingId && (
        <BookingConfirmationModal
          isOpen={Boolean(confirmationBookingId)}
          onClose={() => setConfirmationBookingId(null)}
          bookingId={confirmationBookingId}
          onBookingConfirmed={fetchBookings}
        />
      )}
    </div>
  );
};

export default BookingList;
