import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoCalendarOutline, 
  IoChevronBackOutline, 
  IoChevronForwardOutline, 
  IoPersonOutline, 
  IoHomeOutline, 
  IoAlertCircleOutline,
  IoRefreshOutline,
  IoTodayOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoCallOutline,
  IoBedOutline
} from 'react-icons/io5';
import bookingApi from '../../services/bookingApi';
import { roomApi } from '../../services/roomApi';
import AssignRoomModal from './AssignRoomModal';
import { formatStayDateTime, formatDate, calculateNights } from '../../utils/formatDate';

const DAYS_OF_WEEK_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const getStatusBadge = (status) => {
  switch(status) {
    case 'NEW': return { 
      label: 'Mới', 
      bg: 'bg-amber-500 text-white border-amber-600 shadow-2xs font-semibold hover:bg-amber-600',
      pill: 'bg-amber-600/30 text-white'
    };
    case 'CONFIRMED': return { 
      label: 'Đã xác nhận', 
      bg: 'bg-blue-600 text-white border-blue-700 shadow-2xs font-semibold hover:bg-blue-700',
      pill: 'bg-blue-700/40 text-white'
    };
    case 'CHECKED_IN': return { 
      label: 'Đang ở', 
      bg: 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold hover:bg-emerald-700 ring-1 ring-emerald-400/50',
      pill: 'bg-emerald-800/40 text-white'
    };
    case 'CHECKED_OUT': return { 
      label: 'Đã đi', 
      bg: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
      pill: 'bg-slate-200 text-slate-700'
    };
    default: return { 
      label: status, 
      bg: 'bg-gray-100 text-gray-800 border-gray-300',
      pill: 'bg-gray-200 text-gray-800'
    };
  }
};

const getRoomStatusColor = (status) => {
  switch(status) {
    case 'AVAILABLE': return 'bg-green-50 text-green-700 border-green-200';
    case 'OCCUPIED': return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    case 'DIRTY': return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'MAINTENANCE': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getRoomStatusLabel = (status) => {
  switch(status) {
    case 'AVAILABLE': return 'Trống';
    case 'OCCUPIED': return 'Đang ở';
    case 'DIRTY': return 'Chưa dọn';
    case 'MAINTENANCE': return 'Bảo trì';
    default: return status;
  }
};

const BookingCalendar = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [unassignedBookings, setUnassignedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Khởi tạo thời gian bắt đầu xem: Lùi 2 ngày trước hôm nay để thấy cả khách đang ở từ hôm qua
  const getInitialStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d;
  };

  const [viewStartDate, setViewStartDate] = useState(getInitialStartDate);
  const [daysCount, setDaysCount] = useState(14); // 7, 14, 21 ngày

  // Modal states
  const [assigningBooking, setAssigningBooking] = useState(null);

  useEffect(() => {
    loadData();
  }, [viewStartDate, daysCount]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fromDateStr = toDateStr(viewStartDate);
      const endDate = new Date(viewStartDate);
      endDate.setDate(endDate.getDate() + (daysCount + 5)); // Lấy dư thêm vài ngày để bao phủ trọn vẹn
      const toDateStrVal = toDateStr(endDate);

      // Gọi song song danh sách phòng và lịch đặt phòng
      const [roomsRes, calendarRes] = await Promise.all([
        roomApi.getAllRooms(),
        bookingApi.getBookingCalendar(fromDateStr, toDateStrVal)
      ]);

      setRooms(roomsRes || []);
      
      const allBookings = calendarRes || [];
      const assigned = allBookings.filter(b => b.roomId);
      const unassigned = allBookings.filter(b => !b.roomId || b.roomNumber === 'Chưa gán');
      
      setCalendarData(assigned);
      setUnassignedBookings(unassigned);
    } catch (error) {
      console.error("Lỗi khi tải lịch phòng:", error);
    } finally {
      setLoading(false);
    }
  };

  const toDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Tạo mảng danh sách các ngày hiển thị trên bảng
  const getTimelineDates = () => {
    const dates = [];
    const curr = new Date(viewStartDate);
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(curr);
      d.setDate(curr.getDate() + i);
      const dateStr = toDateStr(d);
      const isToday = toDateStr(new Date()) === dateStr;
      const dayOfWeek = DAYS_OF_WEEK_VN[d.getDay()];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      dates.push({
        dateObj: d,
        dateStr,
        dayOfMonth: d.getDate(),
        month: d.getMonth() + 1,
        dayOfWeek,
        isToday,
        isWeekend
      });
    }
    return dates;
  };

  const timelineDates = getTimelineDates();

  const handlePrev = () => {
    const next = new Date(viewStartDate);
    next.setDate(next.getDate() - 7);
    setViewStartDate(next);
  };

  const handleNext = () => {
    const next = new Date(viewStartDate);
    next.setDate(next.getDate() + 7);
    setViewStartDate(next);
  };

  const handleGoToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2); // Lùi 2 ngày để ngày hôm nay nằm ở vị trí dễ quan sát
    setViewStartDate(d);
  };

  // Lọc tìm tất cả booking cho 1 phòng cụ thể trong 1 ngày cụ thể
  const getBookingsForRoomAndDate = (roomId, dateStr) => {
    return calendarData.filter(b => {
      if (String(b.roomId) !== String(roomId)) return false;
      // Khách ở trong khoảng checkInDate đến checkOutDate
      // Nếu checkInDate === dateStr: Ngày nhận
      // Nếu checkOutDate === dateStr: Ngày trả (vẫn hiển thị để biết hôm nay ai trả phòng)
      // Nếu ở giữa: Đang ở
      return dateStr >= b.checkInDate && dateStr <= b.checkOutDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Toolbar Điều hướng & Bộ lọc ── */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-border-grey shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Tiêu đề & Chọn thời lượng */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <IoCalendarOutline size={22} className="text-primary" />
            <h3 className="font-title-lg text-on-surface font-semibold">Sơ đồ Lịch Phòng</h3>
          </div>
          
          <div className="flex bg-surface-container-low rounded-lg p-1 border border-border-grey text-xs font-medium">
            <button
              onClick={() => setDaysCount(7)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${daysCount === 7 ? 'bg-primary text-white shadow-xs font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setDaysCount(14)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${daysCount === 14 ? 'bg-primary text-white shadow-xs font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              14 ngày
            </button>
            <button
              onClick={() => setDaysCount(21)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${daysCount === 21 ? 'bg-primary text-white shadow-xs font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              21 ngày
            </button>
          </div>
        </div>

        {/* Nút lùi/tiến & Chọn hôm nay */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={handleGoToday}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <IoTodayOutline size={14} /> Về Hôm nay
          </button>

          <div className="flex items-center gap-1 bg-surface-container-low border border-border-grey rounded-lg p-0.5">
            <button
              onClick={handlePrev}
              title="7 ngày trước"
              className="p-1.5 hover:bg-surface-container rounded-md text-on-surface-variant transition-colors cursor-pointer"
            >
              <IoChevronBackOutline size={18} />
            </button>
            <span className="px-2.5 py-1 text-xs font-bold text-on-surface whitespace-nowrap">
              {formatDate(toDateStr(viewStartDate))} → {formatDate(timelineDates[timelineDates.length - 1]?.dateStr)}
            </span>
            <button
              onClick={handleNext}
              title="7 ngày tiếp theo"
              className="p-1.5 hover:bg-surface-container rounded-md text-on-surface-variant transition-colors cursor-pointer"
            >
              <IoChevronForwardOutline size={18} />
            </button>
          </div>

          <button
            onClick={loadData}
            title="Tải lại dữ liệu"
            className="p-2 border border-border-grey hover:bg-surface-container-low rounded-lg text-on-surface-variant transition-colors cursor-pointer"
          >
            <IoRefreshOutline size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Cảnh báo nếu có đặt phòng chưa xếp phòng ── */}
      {unassignedBookings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-900 text-sm">
            <IoAlertCircleOutline size={22} className="text-amber-600 shrink-0" />
            <div>
              <strong>Có {unassignedBookings.length} đặt phòng chưa xếp phòng</strong> trong khoảng thời gian này.
              <div className="text-xs text-amber-800/80 mt-0.5">
                Vui lòng gán phòng cụ thể để hiển thị trên sơ đồ lịch.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedBookings.map(b => (
              <button
                key={b.bookingId}
                onClick={() => setAssigningBooking(b)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Xếp phòng: {b.guestName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bảng Lịch Phòng Ma Trận (Room Timeline Grid) ── */}
      <div className="bg-surface-container-lowest rounded-xl border border-border-grey shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
            <IoRefreshOutline size={32} className="animate-spin text-primary" />
            <p className="text-sm font-medium">Đang tải sơ đồ phòng & dữ liệu đặt phòng...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[950px]">
              {/* Header Cột ngày */}
              <thead>
                <tr className="bg-surface-container-low border-b-2 border-border-grey text-xs">
                  {/* Cột cố định thông tin phòng */}
                  <th className="p-3 w-48 min-w-48 font-bold text-on-surface sticky left-0 z-20 bg-surface-container-low border-r border-border-grey shadow-xs">
                    Phòng ({rooms.length})
                  </th>
                  
                  {/* Các cột ngày */}
                  {timelineDates.map((d) => (
                    <th
                      key={d.dateStr}
                      className={`p-2 text-center border-r border-border-grey transition-colors ${
                        d.isToday 
                          ? 'bg-blue-100/90 text-blue-950 font-bold border-b-2 border-b-blue-600' 
                          : d.isWeekend 
                          ? 'bg-surface-container-low/70 text-on-surface-variant' 
                          : 'text-on-surface-variant'
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
                        {d.dayOfWeek}
                      </div>
                      <div className={`text-sm mt-0.5 ${d.isToday ? 'inline-block px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold shadow-xs' : 'font-semibold text-on-surface'}`}>
                        {d.dayOfMonth}/{d.month}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Thân bảng: Từng phòng & Các ô ngày */}
              <tbody className="divide-y divide-border-grey">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    {/* Cột thông tin phòng bên trái */}
                    <td className="p-3 font-body-sm sticky left-0 z-10 bg-surface-container-lowest group-hover:bg-surface-container-low border-r border-border-grey shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-title-sm font-bold text-primary flex items-center gap-1.5">
                          <IoHomeOutline size={15} /> Phòng {room.roomNumber}
                        </div>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${getRoomStatusColor(room.status)}`}>
                          {getRoomStatusLabel(room.status)}
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant mt-0.5 flex justify-between items-center">
                        <span>{room.roomTypeName || room.roomType?.name || '—'}</span>
                        {room.floor && <span className="text-[11px] text-on-surface-variant/70">Tầng {room.floor}</span>}
                      </div>
                    </td>

                    {/* Các ô ngày của phòng này */}
                    {timelineDates.map((d) => {
                      const matchedBookings = getBookingsForRoomAndDate(room.id, d.dateStr);

                      return (
                        <td
                          key={d.dateStr}
                          className={`p-1 text-center border-r border-border-grey relative h-16 min-w-[70px] ${
                            d.isToday ? 'bg-blue-50/30' : d.isWeekend ? 'bg-surface-container-low/20' : ''
                          }`}
                        >
                          {matchedBookings.length > 0 ? (
                            <div className="space-y-1 h-full flex flex-col justify-center">
                              {matchedBookings.map((booking) => {
                                const isFirstDay = booking.checkInDate === d.dateStr;
                                const isLastDay = booking.checkOutDate === d.dateStr;
                                const isOneDayStay = booking.checkInDate === booking.checkOutDate;
                                const badgeStyle = getStatusBadge(booking.status);

                                let eventLabel = badgeStyle.label;
                                if (isOneDayStay) {
                                  eventLabel = 'Trong ngày';
                                } else if (isFirstDay) {
                                  eventLabel = 'Nhận (14h)';
                                } else if (isLastDay) {
                                  eventLabel = booking.status === 'CHECKED_IN' ? 'Hạn trả' : 'Trả (12h)';
                                }

                                return (
                                  <div
                                    key={booking.bookingId}
                                    onClick={() => navigate(`/manage/bookings/${booking.bookingId}/info`, { state: { from: '/manage/bookings/calendar' } })}
                                    className={`w-full rounded-md p-1.5 flex flex-col justify-center items-start text-left border cursor-pointer transition-all duration-150 hover:shadow-md hover:scale-[1.02] ${badgeStyle.bg}`}
                                    title={`👤 Khách: ${booking.guestName}\n📅 Nhận: ${formatDate(booking.checkInDate)} (14:00)\n📅 Trả: ${formatDate(booking.checkOutDate)} (12:00)\n🏷️ Trạng thái: ${badgeStyle.label}\n👉 Nhấp để xem Chi tiết & Hóa đơn`}
                                  >
                                    <div className="font-bold text-xs truncate w-full flex items-center gap-1">
                                      <IoPersonOutline size={11} className="shrink-0" />
                                      <span className="truncate">{booking.guestName}</span>
                                    </div>
                                    <div className="text-[10px] flex items-center justify-between w-full mt-0.5">
                                      <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${badgeStyle.pill}`}>
                                        {eventLabel}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-full w-full rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                              <span className="text-border-grey hover:text-primary text-xs font-light select-none">
                                —
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Chú thích màu sắc (Legend) */}
        <div className="p-4 bg-surface-container-low border-t border-border-grey flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-on-surface-variant font-medium">Trạng thái đặt phòng:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block shadow-2xs"></span>
              <span className="font-bold text-emerald-800">Đang ở</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block shadow-2xs"></span>
              <span className="font-semibold text-blue-800">Đã xác nhận</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block shadow-2xs"></span>
              <span className="font-semibold text-amber-800">Mới</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 inline-block"></span>
              <span className="font-medium text-slate-700">Đã đi / Lịch sử</span>
            </div>
          </div>
          <div className="text-on-surface-variant text-[11px] italic">
            💡 Nhấp vào khối phòng của khách để mở ngay trang Chi tiết & Hóa đơn.
          </div>
        </div>
      </div>

      {/* ── Modal Xếp phòng nhanh cho booking chưa gán ── */}
      {assigningBooking && (
        <AssignRoomModal
          isOpen={true}
          onClose={() => setAssigningBooking(null)}
          bookingId={assigningBooking.bookingId}
          roomTypeId={assigningBooking.roomTypeId}
          onAssigned={() => {
            loadData();
            setAssigningBooking(null);
          }}
        />
      )}
    </div>
  );
};

export default BookingCalendar;
