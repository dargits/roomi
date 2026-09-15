import React, { useState, useEffect, useMemo } from 'react';
import { 
  IoBedOutline, 
  IoPeopleOutline, 
  IoCalendarOutline, 
  IoTimeOutline, 
  IoCashOutline, 
  IoWarningOutline, 
  IoCheckmarkCircleOutline, 
  IoCartOutline, 
  IoLogOutOutline, 
  IoSearchOutline, 
  IoRefreshOutline, 
  IoLayersOutline, 
  IoChatbubbleEllipsesOutline,
  IoAlertCircleOutline,
  IoEyeOutline,
  IoCloseOutline
} from 'react-icons/io5';
import inHouseGuestApi from '../../services/inHouseGuestApi';
import { InHouseGuestResponse, InHouseFilterOptions, InHouseSummary, InHouseFilterParams } from '../../types/booking';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import Button from '../../components/ui/Button';
import BookingDetailsModal from './BookingDetailsModal';
import StayingGuestsModal from './StayingGuestsModal';

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const InHouseGuestList: React.FC = () => {
  const { error: toastError } = useToast();
  const [guests, setGuests] = useState<InHouseGuestResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);

  // Thống kê tổng quan & Options từ API
  const [summary, setSummary] = useState<InHouseSummary>({
    totalRooms: 0,
    totalOccupants: 0,
    checkoutTodayCount: 0,
    debtCount: 0,
    totalDebtAmount: 0
  });
  const [filterOptions, setFilterOptions] = useState<InHouseFilterOptions>({
    floors: [],
    roomTypes: []
  });

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('ALL');
  const [checkOutTodayOnly, setCheckOutTodayOnly] = useState<boolean>(false);
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'DEBT_ONLY' | 'PAID_ONLY'>('ALL');

  // Modal hồ sơ đặt phòng
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'info' | 'services' | 'invoice'>('info');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Modal khách cùng phòng & khai báo lưu trú
  const [stayingGuestsBooking, setStayingGuestsBooking] = useState<any>(null);
  const [isStayingGuestsOpen, setIsStayingGuestsOpen] = useState<boolean>(false);

  // 1. Tải Filter Options và KPI Summary từ API
  const loadSummaryAndOptions = async () => {
    try {
      const [sum, opts] = await Promise.all([
        inHouseGuestApi.getSummary(),
        inHouseGuestApi.getFilterOptions()
      ]);
      if (sum) setSummary(sum);
      if (opts) setFilterOptions(opts);
    } catch (err) {
      console.error('Lỗi tải summary hoặc filter options:', err);
    }
  };

  // 2. Call API lọc danh sách khách lưu trú
  const fetchGuestsWithParams = async (paramsOverride?: InHouseFilterParams, isBackground = false) => {
    if (!isBackground) setIsFiltering(true);
    else setRefreshing(true);

    try {
      const p: InHouseFilterParams = paramsOverride !== undefined ? paramsOverride : {
        floor: selectedFloor !== 'ALL' ? selectedFloor : undefined,
        roomTypeId: selectedRoomType !== 'ALL' ? selectedRoomType : undefined,
        checkingOutToday: checkOutTodayOnly || undefined,
        hasDebt: debtFilter === 'DEBT_ONLY' ? true : (debtFilter === 'PAID_ONLY' ? false : undefined),
        search: searchTerm.trim() || undefined
      };

      const data = await inHouseGuestApi.getInHouseGuests(p);
      setGuests(data || []);
    } catch (err: any) {
      console.error('Lỗi lọc danh sách khách lưu trú qua API:', err);
      toastError(err.response?.data?.message || 'Không thể tải danh sách khách lưu trú.');
    } finally {
      setIsFiltering(false);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tải ban đầu
  useEffect(() => {
    loadSummaryAndOptions();
  }, []);

  // Lắng nghe thay đổi bộ lọc và gọi API (debounced 250ms cho ô tìm kiếm)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGuestsWithParams();
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedFloor, selectedRoomType, checkOutTodayOnly, debtFilter, searchTerm]);

  const handleOpenBooking = (bookingId: number, tab: 'info' | 'services' | 'invoice') => {
    setSelectedBookingId(bookingId);
    setModalInitialTab(tab);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedBookingId(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadSummaryAndOptions(),
      fetchGuestsWithParams(undefined, true)
    ]);
  };

  const handleBookingUpdated = () => {
    handleRefresh();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFloor('ALL');
    setSelectedRoomType('ALL');
    setCheckOutTodayOnly(false);
    setDebtFilter('ALL');
  };

  const hasActiveFilters = searchTerm !== '' || selectedFloor !== 'ALL' || selectedRoomType !== 'ALL' || checkOutTodayOnly || debtFilter !== 'ALL';

  if (loading) {
    return <LoadingScreen message="Đang tải danh sách khách đang lưu trú..." />;
  }

  return (
    <div className="space-y-4 p-4 sm:p-5 bg-surface min-h-[600px] flex flex-col antialiased">
      {/* 1. Header & Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Phòng đang ở */}
        <div className="bg-surface-container-lowest border border-border-grey rounded-lg p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Phòng đang ở</p>
            <p className="text-2xl font-bold text-primary mt-1">{summary.totalRooms}</p>
            <span className="text-[11px] text-on-surface-variant">Phòng có khách lưu trú</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary shrink-0">
            <IoBedOutline size={22} />
          </div>
        </div>

        {/* Card 2: Khách đang lưu trú */}
        <div className="bg-surface-container-lowest border border-border-grey rounded-lg p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Khách lưu trú</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.totalOccupants}</p>
            <span className="text-[11px] text-on-surface-variant">Người thực tế trong phòng</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <IoPeopleOutline size={22} />
          </div>
        </div>

        {/* Card 3: Trả phòng hôm nay */}
        <div className={`bg-surface-container-lowest border rounded-lg p-3.5 shadow-xs flex items-center justify-between transition-colors ${summary.checkoutTodayCount > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-border-grey'}`}>
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Trả phòng hôm nay</p>
            <p className={`text-2xl font-bold mt-1 ${summary.checkoutTodayCount > 0 ? 'text-amber-700' : 'text-on-surface'}`}>
              {summary.checkoutTodayCount}
            </p>
            <span className="text-[11px] text-on-surface-variant">Dự kiến hoàn tất thủ tục</span>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${summary.checkoutTodayCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-surface-container-low text-on-surface-variant'}`}>
            <IoTimeOutline size={22} />
          </div>
        </div>

        {/* Card 4: Còn nợ */}
        <div className={`bg-surface-container-lowest border rounded-lg p-3.5 shadow-xs flex items-center justify-between transition-colors ${summary.debtCount > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-border-grey'}`}>
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Phòng còn nợ</p>
            <p className={`text-2xl font-bold mt-1 ${summary.debtCount > 0 ? 'text-error' : 'text-on-surface'}`}>
              {summary.debtCount}
            </p>
            <span className="text-[11px] font-semibold text-error">
              {summary.totalDebtAmount > 0 ? fmtCurrency(summary.totalDebtAmount) : 'Không có dư nợ'}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${summary.debtCount > 0 ? 'bg-rose-100 text-error' : 'bg-surface-container-low text-on-surface-variant'}`}>
            <IoCashOutline size={22} />
          </div>
        </div>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-lg p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo số phòng, tên khách, SĐT, ghi chú..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-border-grey rounded-md bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
              >
                <IoCloseOutline size={16} />
              </button>
            )}
          </div>

          {/* Actions on right */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2 py-1 cursor-pointer"
              >
                <IoCloseOutline size={14} /> Xóa bộ lọc
              </button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              isLoading={refreshing}
              icon={IoRefreshOutline}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Filter Pills / Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-border-grey/60 text-xs">
          {/* Lọc theo Tầng */}
          <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-md border border-border-grey">
            <IoLayersOutline size={14} className="text-primary" />
            <span className="font-medium text-on-surface-variant">Tầng:</span>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-transparent font-semibold text-on-surface focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Tất cả tầng</option>
              {filterOptions.floors.map((floor) => (
                <option key={floor} value={floor}>
                  Tầng {floor}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Loại phòng */}
          <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-md border border-border-grey">
            <IoBedOutline size={14} className="text-primary" />
            <span className="font-medium text-on-surface-variant">Loại phòng:</span>
            <select
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              className="bg-transparent font-semibold text-on-surface focus:outline-none cursor-pointer pr-1 max-w-[160px] truncate"
            >
              <option value="ALL">Tất cả loại phòng</option>
              {filterOptions.roomTypes.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc: Trả phòng hôm nay */}
          <button
            type="button"
            onClick={() => setCheckOutTodayOnly(!checkOutTodayOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold border transition-all cursor-pointer ${
              checkOutTodayOnly
                ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                : 'bg-surface-container-low border-border-grey text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <IoTimeOutline size={14} className={checkOutTodayOnly ? 'text-amber-800' : ''} />
            <span>Trả phòng hôm nay</span>
            {summary.checkoutTodayCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${checkOutTodayOnly ? 'bg-amber-200 text-amber-950' : 'bg-amber-100 text-amber-800'}`}>
                {summary.checkoutTodayCount}
              </span>
            )}
          </button>

          {/* Lọc: Tình trạng nợ */}
          <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded-md border border-border-grey">
            <button
              type="button"
              onClick={() => setDebtFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                debtFilter === 'ALL' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setDebtFilter('DEBT_ONLY')}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                debtFilter === 'DEBT_ONLY' ? 'bg-rose-50 shadow-xs text-error border border-rose-200' : 'text-on-surface-variant hover:text-error'
              }`}
            >
              <IoWarningOutline size={12} /> Còn nợ
              {summary.debtCount > 0 && (
                <span className="px-1 py-0.1 bg-rose-200 text-rose-900 rounded-full text-[10px] font-bold">
                  {summary.debtCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDebtFilter('PAID_ONLY')}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                debtFilter === 'PAID_ONLY' ? 'bg-emerald-50 shadow-xs text-emerald-700 border border-emerald-200' : 'text-on-surface-variant hover:text-emerald-700'
              }`}
            >
              <IoCheckmarkCircleOutline size={12} /> Đã xong
            </button>
          </div>
        </div>
      </div>

      {/* 3. Security & Policy Information Banner */}
      <div className="bg-surface-container-low border border-border-grey rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <IoAlertCircleOutline size={16} className="text-primary shrink-0" />
          <span>
            <strong>Màn hình chỉ đọc:</strong> Danh sách chỉ hiển thị các đặt phòng đang có khách ở. Số giấy tờ tùy thân được ẩn nhằm bảo mật dữ liệu. Mọi thay đổi nghiệp vụ (ghi dịch vụ, thanh toán, trả phòng) được thực hiện trong hồ sơ đặt phòng.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isFiltering && (
            <span className="text-primary animate-pulse text-[11px] font-medium flex items-center gap-1">
              <IoRefreshOutline className="animate-spin" size={13} /> Đang lọc...
            </span>
          )}
          <span className="shrink-0 font-semibold text-on-surface bg-white px-2.5 py-1 rounded border border-border-grey">
            Hiển thị: <strong>{guests.length}</strong> / {summary.totalRooms} phòng
          </span>
        </div>
      </div>

      {/* 4. Main Read-only Table */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-lg overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-grey text-on-surface-variant font-bold uppercase tracking-wider">
                <th className="py-3 px-3.5">Phòng & Tầng</th>
                <th className="py-3 px-3">Loại phòng</th>
                <th className="py-3 px-3">Khách đứng tên</th>
                <th className="py-3 px-3 text-center">Số người</th>
                <th className="py-3 px-3">Nhận - Trả dự kiến</th>
                <th className="py-3 px-3 text-right">Tiền phát sinh</th>
                <th className="py-3 px-3 text-center">Thanh toán</th>
                <th className="py-3 px-3">Yêu cầu đặc biệt</th>
                <th className="py-3 px-3.5 text-right w-[160px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-grey/70">
              {guests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant space-y-2">
                    <IoBedOutline size={36} className="mx-auto text-outline/60" />
                    <p className="text-sm font-medium">Không tìm thấy phòng lưu trú nào phù hợp với bộ lọc.</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-primary text-xs font-semibold hover:underline cursor-pointer"
                      >
                        Bỏ lọc để xem toàn bộ danh sách
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                guests.map((g) => {
                  return (
                    <tr
                      key={g.bookingId}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenBooking(g.bookingId, 'info')}
                    >
                      {/* Phòng & Tầng */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 font-bold text-sm bg-primary/10 text-primary border border-primary/20 rounded">
                            {g.roomNumber}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            {g.floor ? `Tầng ${g.floor}` : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Loại phòng */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-on-surface block max-w-[140px] truncate" title={g.roomTypeName}>
                          {g.roomTypeName}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono">#{g.bookingId}</span>
                      </td>

                      {/* Khách đứng tên & SĐT */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="font-bold text-on-surface block max-w-[160px] truncate" title={g.primaryGuestName}>
                          {g.primaryGuestName}
                        </p>
                        {g.guestPhone ? (
                          <span className="text-[11px] text-on-surface-variant font-mono flex items-center gap-1">
                            {g.guestPhone}
                          </span>
                        ) : (
                          <span className="text-[10px] text-outline">Chưa có SĐT</span>
                        )}
                      </td>

                      {/* Số người */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStayingGuestsBooking({
                              id: g.bookingId,
                              roomNumber: g.roomNumber,
                              roomTypeName: g.roomTypeName,
                              roomTypeId: g.roomTypeId,
                              standardCapacity: g.standardCapacity,
                              maxCapacity: g.maxCapacity,
                              status: 'CHECKED_IN'
                            });
                            setIsStayingGuestsOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 transition-colors font-semibold text-xs cursor-pointer group"
                          title="Bấm để xem danh sách khách cùng phòng & khai báo lưu trú"
                        >
                          <IoPeopleOutline size={14} className="text-primary group-hover:scale-110 transition-transform" />
                          <span>{g.occupantCount} / {g.maxCapacity || g.standardCapacity || 2} người</span>
                        </button>
                      </td>

                      {/* Thời gian nhận - trả */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-[11px] space-y-0.5">
                          <div className="text-on-surface-variant">
                            Nhận: <span className="font-medium text-on-surface">{fmtDate(g.checkInDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-on-surface-variant">Trả:</span>
                            <span className={`font-semibold ${g.checkingOutToday ? 'text-amber-700' : 'text-on-surface'}`}>
                              {fmtDate(g.expectedCheckOutDate)}
                            </span>
                            {g.checkingOutToday && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                Hôm nay
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tiền phát sinh */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <p className="font-bold text-on-surface text-sm">{fmtCurrency(g.incurredAmount)}</p>
                        <span className="text-[10px] text-on-surface-variant">
                          Phòng: {fmtCurrency(g.roomAmount)}
                          {g.serviceAmount > 0 && ` + DV: ${fmtCurrency(g.serviceAmount)}`}
                        </span>
                      </td>

                      {/* Thanh toán & Công nợ */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {g.hasDebt ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 bg-rose-50 text-error border border-rose-200 rounded font-bold text-[11px] flex items-center gap-1">
                              <IoWarningOutline size={12} /> Còn nợ {fmtCurrency(g.remainingAmount)}
                            </span>
                            {g.paidAmount > 0 && (
                              <span className="text-[10px] text-on-surface-variant mt-0.5">
                                Đã thu: {fmtCurrency(g.paidAmount)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] inline-flex items-center gap-1">
                            <IoCheckmarkCircleOutline size={13} /> Đã thanh toán
                          </span>
                        )}
                      </td>

                      {/* Yêu cầu đặc biệt */}
                      <td className="py-3 px-3 max-w-[200px]">
                        {g.specialRequests ? (
                          <div
                            className="flex items-start gap-1 text-[11px] text-amber-900 bg-amber-50/80 p-1.5 rounded border border-amber-200/80 line-clamp-2"
                            title={g.specialRequests}
                          >
                            <IoChatbubbleEllipsesOutline size={14} className="text-amber-700 shrink-0 mt-0.5" />
                            <span className="truncate">{g.specialRequests}</span>
                          </div>
                        ) : (
                          <span className="text-outline text-[11px] italic">—</span>
                        )}
                      </td>

                      {/* Cột Thao tác */}
                      <td
                        className="py-3 px-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()} // Không kích hoạt row click khi bấm nút
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Khách cùng phòng & khai báo lưu trú */}
                          <button
                            type="button"
                            onClick={() => {
                              setStayingGuestsBooking({
                                id: g.bookingId,
                                roomNumber: g.roomNumber,
                                roomTypeName: g.roomTypeName,
                                roomTypeId: g.roomTypeId,
                                standardCapacity: g.standardCapacity,
                                maxCapacity: g.maxCapacity,
                                status: 'CHECKED_IN'
                              });
                              setIsStayingGuestsOpen(true);
                            }}
                            className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors cursor-pointer border border-blue-200 hover:border-blue-500"
                            title="Khách cùng phòng & Khai báo lưu trú"
                          >
                            <IoPeopleOutline size={16} />
                          </button>

                          {/* Ghi dịch vụ */}
                          <button
                            type="button"
                            onClick={() => handleOpenBooking(g.bookingId, 'services')}
                            className="p-1.5 text-primary hover:bg-blue-100 rounded transition-colors cursor-pointer border border-primary/20 hover:border-primary"
                            title="Ghi dịch vụ phụ thu"
                          >
                            <IoCartOutline size={16} />
                          </button>

                          {/* Trả phòng */}
                          <button
                            type="button"
                            onClick={() => handleOpenBooking(g.bookingId, 'invoice')}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded transition-colors cursor-pointer border border-emerald-300 hover:border-emerald-600"
                            title="Làm thủ tục trả phòng"
                          >
                            <IoLogOutOutline size={16} />
                          </button>

                          {/* Xem hồ sơ */}
                          <button
                            type="button"
                            onClick={() => handleOpenBooking(g.bookingId, 'info')}
                            className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors cursor-pointer border border-border-grey"
                            title="Xem hồ sơ đặt phòng"
                          >
                            <IoEyeOutline size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal Hồ Sơ Đặt Phòng - Mở trực tiếp theo tab yêu cầu */}
      {isModalOpen && selectedBookingId !== null && (
        <BookingDetailsModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          bookingId={selectedBookingId}
          initialTab={modalInitialTab}
          onBookingUpdated={handleBookingUpdated}
        />
      )}

      {/* 6. Modal Danh Sách Khách Cùng Phòng & Khai Báo Lưu Trú */}
      {isStayingGuestsOpen && stayingGuestsBooking && (
        <StayingGuestsModal
          isOpen={isStayingGuestsOpen}
          onClose={() => {
            setIsStayingGuestsOpen(false);
            setStayingGuestsBooking(null);
          }}
          booking={stayingGuestsBooking}
          onUpdated={handleRefresh}
        />
      )}
    </div>
  );
};

export default InHouseGuestList;
