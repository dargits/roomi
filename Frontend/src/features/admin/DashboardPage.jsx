import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import reportApi from '../../services/reportApi';
import { roomApi } from '../../services/roomApi';
import { IoAlertCircleOutline, IoBarChartOutline, IoBrushOutline, IoCalendarOutline, IoCheckmarkCircleOutline, IoConstructOutline, IoHappyOutline, IoLogInOutline, IoLogOutOutline, IoPeopleOutline, IoRefreshOutline, IoTrendingUpOutline } from 'react-icons/io5';

const fmtCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

/** Thẻ stat đơn giản */
const StatCard = ({ icon: Icon, label, value, color, subLabel, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-surface-container-lowest border border-border-grey rounded-xl p-5 flex items-center gap-4 transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md' : 'hover:shadow-sm'}`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div className="min-w-0">
      <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-xs">{label}</p>
      <p className="font-headline-md text-on-surface leading-tight mt-0.5">{value ?? '—'}</p>
      {subLabel && <p className="font-body-md text-on-surface-variant text-xs mt-0.5">{subLabel}</p>}
    </div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [todayEvents, setTodayEvents] = useState([]);
  const [dirtyRoomsCount, setDirtyRoomsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const canSeeToday  = isOwnerOrAdmin || user?.role === 'RECEPTIONIST';

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = [];
      if (isOwnerOrAdmin) {
        promises.push(reportApi.getDashboard());
      } else {
        promises.push(Promise.resolve(null));
      }
      if (canSeeToday) {
        promises.push(reportApi.getTodayCheckInOut());
      } else {
        promises.push(Promise.resolve([]));
      }
      if (user?.role === 'HOUSEKEEPER') {
        promises.push(roomApi.getAllRooms('DIRTY'));
      } else {
        promises.push(Promise.resolve([]));
      }
      
      const [dashData, todayData, dirtyRoomsData] = await Promise.all(promises);
      setDashboard(dashData);
      
      if (dirtyRoomsData && Array.isArray(dirtyRoomsData)) {
        setDirtyRoomsCount(dirtyRoomsData.length);
      }
      // Backend trả mảng phẳng. Xử lý cả hai dạng (an toàn)
      if (Array.isArray(todayData)) {
        setTodayEvents(todayData);
      } else if (todayData?.checkIns || todayData?.checkOuts) {
        // Fallback: format cũ
        const checkins = (todayData.checkIns || []).map(b => ({ ...b, type: 'checkin' }));
        const checkouts = (todayData.checkOuts || []).map(b => ({ ...b, type: 'checkout' }));
        setTodayEvents([...checkouts, ...checkins]);
      } else {
        setTodayEvents([]);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  // ---- Skeleton ----
  const Skeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-surface-container-low rounded-xl animate-pulse border border-border-grey" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-md text-on-surface">Tổng quan</h1>
          <p className="text-sm text-on-surface-variant mt-0.5 flex items-center gap-1.5">
            <IoCalendarOutline size={13} />
            {today}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-grey bg-surface-container-lowest hover:bg-surface-container-low text-sm text-on-surface-variant transition-colors w-fit"
        >
          <IoRefreshOutline size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-error text-sm">{error}</div>
      )}

      {/* ── Loading ── */}
      {loading && <Skeleton />}

      {/* ── Stats phòng — OWNER/ADMIN ── */}
      {!loading && isOwnerOrAdmin && dashboard && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={IoLogOutOutline}   label="Tổng số phòng"  value={dashboard.totalRooms}       color="bg-primary" />
            <StatCard icon={IoCheckmarkCircleOutline} label="Phòng trống"   value={dashboard.availableRooms}   color="bg-green-500"
              subLabel={dashboard.totalRooms ? `${Math.round((dashboard.availableRooms / dashboard.totalRooms) * 100)}%` : ''} />
            <StatCard icon={IoPeopleOutline}      label="Đang có khách"  value={dashboard.occupiedRooms}    color="bg-blue-500" />
            <StatCard icon={IoBrushOutline}      label="Chờ dọn dẹp"   value={dashboard.dirtyRooms}       color="bg-orange-500" />
          </div>

          {/* Stats booking & doanh thu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={IoLogInOutline}       label="Check-in hôm nay"   value={dashboard.todayCheckIns}  color="bg-green-600" />
            <StatCard icon={IoLogOutOutline}      label="Check-out hôm nay"  value={dashboard.todayCheckOuts} color="bg-blue-600" />
            <StatCard icon={IoTrendingUpOutline}  label="Doanh thu tháng"
              value={dashboard.monthRevenue != null ? fmtCurrency(dashboard.monthRevenue) : '—'}
              color="bg-tertiary" />
          </div>
        </>
      )}

      {/* ── RECEPTIONIST chào ── */}
      {!loading && user?.role === 'RECEPTIONIST' && !dashboard && (
        <div className="p-5 bg-surface-container-lowest border border-border-grey rounded-xl">
          <p className="font-title-md text-on-surface">Chào {user.name}!</p>
          <p className="text-sm text-on-surface-variant mt-1">Xem danh sách check-in/out hôm nay bên dưới.</p>
        </div>
      )}

      {/* ── Bảng Check-in / Check-out hôm nay ── */}
      {!loading && canSeeToday && (
        <div className="bg-surface-container-lowest border border-border-grey rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border-grey flex items-center gap-3">
            <IoBarChartOutline size={20} className="text-primary" />
            <h2 className="font-title-lg text-on-surface">Check-in / Check-out Hôm nay</h2>
            {todayEvents.length > 0 && (
              <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                {todayEvents.length}
              </span>
            )}
          </div>

          {todayEvents.length === 0 ? (
            <div className="py-16 text-center">
              <IoCalendarOutline size={36} className="text-on-surface-variant/25 mx-auto mb-3" />
              <p className="text-sm text-on-surface-variant">Không có lịch check-in/out nào hôm nay.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-grey text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    <th className="p-4">Khách hàng</th>
                    <th className="p-4">Phòng</th>
                    <th className="p-4">Loại phòng</th>
                    <th className="p-4 text-center">Sự kiện</th>
                    <th className="p-4">Ngày</th>
                    <th className="p-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {todayEvents.map((ev, idx) => (
                    <tr key={`${ev.bookingId}-${ev.type}` || idx} className="border-b border-border-grey hover:bg-surface-container-low/60 transition-colors">
                      <td className="p-4">
                        <p className="font-title-sm text-on-surface">{ev.guestName}</p>
                        <p className="text-xs text-on-surface-variant">{ev.guestPhone}</p>
                      </td>
                      <td className="p-4 font-body-md text-on-surface">
                        {ev.roomNumber
                          ? <span className="font-medium text-primary">P. {ev.roomNumber}</span>
                          : <span className="italic text-on-surface-variant text-xs">Chưa xếp</span>}
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant">{ev.roomTypeName || '—'}</td>
                      <td className="p-4 text-center">
                        {ev.type === 'checkin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            <IoLogInOutline size={10} /> Nhận phòng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            <IoLogOutOutline size={10} /> Trả phòng
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant">
                        {ev.type === 'checkin' ? ev.checkInDate : ev.checkOutDate}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs text-on-surface-variant">{ev.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Khác (Kế toán, Buồng phòng...) ── */}
      {!loading && !isOwnerOrAdmin && user?.role !== 'RECEPTIONIST' && (
        <div className="bg-surface-container-lowest border border-border-grey rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <IoHappyOutline size={32} />
          </div>
          <h2 className="font-headline-sm text-on-surface">Chào mừng, {user?.name}!</h2>
          <p className="text-on-surface-variant font-body-md mt-2">Dưới đây là các chức năng dành cho bạn.</p>

          {user?.role === 'ACCOUNTANT' && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
               <Link to="/bookings" className="flex items-center gap-4 p-5 rounded-xl border border-border-grey bg-white hover:border-primary transition-colors hover:shadow-sm text-left">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-lg"><IoCalendarOutline size={28} /></div>
                  <div>
                    <p className="font-title-md text-on-surface">Quản lý Đặt phòng</p>
                    <p className="text-sm text-on-surface-variant mt-1">Xem chi tiết, lập và điều chỉnh hóa đơn, thanh toán</p>
                  </div>
               </Link>
               <Link to="/reports" className="flex items-center gap-4 p-5 rounded-xl border border-border-grey bg-white hover:border-primary transition-colors hover:shadow-sm text-left">
                  <div className="bg-green-50 text-green-600 p-3 rounded-lg"><IoBarChartOutline size={28} /></div>
                  <div>
                    <p className="font-title-md text-on-surface">Báo cáo Tài chính</p>
                    <p className="text-sm text-on-surface-variant mt-1">Xem biểu đồ, xuất báo cáo doanh thu & công suất</p>
                  </div>
               </Link>
            </div>
          )}

          {user?.role === 'HOUSEKEEPER' && (
            <div className="mt-8 grid grid-cols-1 gap-4 w-full max-w-lg">
               {dirtyRoomsCount > 0 ? (
                 <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 text-left">
                    <IoAlertCircleOutline className="text-orange-500 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-title-md text-orange-800">Cần dọn dẹp {dirtyRoomsCount} phòng</p>
                      <p className="text-sm text-orange-700 mt-1">Hiện tại đang có {dirtyRoomsCount} phòng bẩn cần được dọn dẹp để sẵn sàng đón khách.</p>
                    </div>
                 </div>
               ) : (
                 <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 text-left">
                    <IoCheckmarkCircleOutline className="text-green-500 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-title-md text-green-800">Tuyệt vời!</p>
                      <p className="text-sm text-green-700 mt-1">Tất cả các phòng hiện đã được dọn dẹp sạch sẽ.</p>
                    </div>
                 </div>
               )}

               <Link to="/housekeeping" className="flex items-center gap-4 p-5 rounded-xl border border-border-grey bg-white hover:border-primary transition-colors hover:shadow-sm text-left">
                  <div className="bg-orange-50 text-orange-600 p-3 rounded-lg"><IoBrushOutline size={28} /></div>
                  <div>
                    <p className="font-title-md text-on-surface">Buồng phòng</p>
                    <p className="text-sm text-on-surface-variant mt-1">Đi tới danh sách phòng để cập nhật trạng thái</p>
                  </div>
               </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
