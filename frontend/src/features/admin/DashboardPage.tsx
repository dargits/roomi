import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import reportApi from '../../services/reportApi';
import { roomApi } from '../../services/roomApi';
import cashierShiftApi from '../../services/cashierShiftApi';
import dailyLedgerApi, { DailyLedgerResponse } from '../../services/dailyLedgerApi';
import { debtApprovalApi } from '../../services/debtApprovalApi';
import userApi from '../../services/userApi';
import dataApi, { BackupHistoryItem } from '../../services/dataApi';
import auditLogApi from '../../services/auditLogApi';
import { 
  IoAlertCircleOutline, 
  IoBarChartOutline, 
  IoBrushOutline, 
  IoCalendarOutline, 
  IoCheckmarkCircleOutline, 
  IoLogInOutline, 
  IoLogOutOutline, 
  IoPeopleOutline, 
  IoRefreshOutline, 
  IoTrendingUpOutline, 
  IoKeyOutline,
  IoBedOutline,
  IoArrowUpOutline,
  IoArrowForwardOutline,
  IoPieChartOutline,
  IoDownloadOutline,
  IoFlashOutline,
  IoSearchOutline,
  IoWalletOutline,
  IoCashOutline,
  IoDocumentTextOutline,
  IoSpeedometerOutline,
  IoBusinessOutline,
  IoCheckmarkOutline,
  IoAddCircleOutline,
  IoShieldCheckmarkOutline,
  IoServerOutline,
  IoCloudDoneOutline,
  IoHardwareChipOutline,
  IoWarningOutline,
  IoFolderOpenOutline,
  IoSettingsOutline
} from 'react-icons/io5';
import { formatStayDateTime } from '../../utils/formatDate';
import usePasswordResetNotification from '../../hooks/usePasswordResetNotification';
import PasswordResetManagementModal from './PasswordResetManagementModal';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import { 
  DashboardStatsResponse, 
  OccupancyReportRow, 
  RevenueReportRow, 
  ChannelReportResponse,
  RoomResponse,
  AuditLog,
  UserSessionResponse,
  UserResponse,
  CashierShiftResponse
} from '../../types';

// ==========================================
// UTILITY FUNCTIONS & BADGES
// ==========================================

const getStatusBadge = (status?: string) => {
  switch(status) {
    case 'NEW': 
      return <span className="px-2.5 py-0.5 bg-[#FEF9C3] text-[#854D0E] rounded-full font-bold text-xs border border-[#FEF08A]">Mới</span>;
    case 'CONFIRMED': 
      return <span className="px-2.5 py-0.5 bg-[#EBF3FF] text-[#0070F4] rounded-full font-bold text-xs border border-[#BFDBFE]">Đã xác nhận</span>;
    case 'CHECKED_IN': 
      return <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] rounded-full font-bold text-xs border border-[#BFDBFE]">Đang ở</span>;
    case 'CHECKED_OUT': 
      return <span className="px-2.5 py-0.5 bg-[#F4F6F9] text-slate-500 rounded-full font-semibold text-xs border border-border-grey">Đã trả phòng</span>;
    case 'CANCELLED': 
      return <span className="px-2.5 py-0.5 bg-[#FEF2F2] text-[#DC2626] rounded-full font-semibold text-xs border border-[#FECACA]">Đã hủy</span>;
    case 'NO_SHOW': 
      return <span className="px-2.5 py-0.5 bg-[#FFFBEB] text-[#D97706] rounded-full font-semibold text-xs border border-[#FDE68A]">Không đến</span>;
    default: 
      return <span className="px-2.5 py-0.5 bg-[#F4F6F9] text-slate-500 rounded-full font-semibold text-xs border border-border-grey">{status}</span>;
  }
};

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const formatLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ==========================================
// COMMON STAT CARDS & VISUALIZATIONS
// ==========================================

/** KiotViet Hero Stat Card (Signature Blue Gradient) */
const HeroStatCard: React.FC<{
  title: string;
  rawValue: number;
  collectedAmount?: number;
  debtAmount?: number;
  collectionPercent?: number;
  actionText?: string;
  onAction?: () => void;
  subText?: string;
}> = ({ title, rawValue, collectedAmount = 0, debtAmount = 0, collectionPercent = 0, actionText, onAction, subText }) => (
  <div 
    onClick={onAction}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0070F4] via-[#0060E0] to-[#004EC2] border border-[#0062DC] p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 cursor-pointer group h-full text-white"
  >
    <div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00B63E] ring-2 ring-white/30 animate-pulse shrink-0" />
          <p className="text-xs font-bold uppercase text-white/90 truncate">{title}</p>
        </div>
        {collectionPercent > 0 && (
          <div className="inline-flex items-center gap-1 bg-white/20 text-white backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs shrink-0 whitespace-nowrap border border-white/20">
            <IoArrowUpOutline size={12} className="shrink-0" />
            <span><AnimatedCounter value={collectionPercent} suffix="% Đã thu" /></span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none truncate" title={fmtCurrency(rawValue)}>
          <AnimatedCounter value={rawValue} formatter={fmtCurrency} />
        </h3>
        {subText && <p className="text-xs text-white/80 mt-1 font-medium">{subText}</p>}
      </div>
    </div>

    <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-2 text-xs text-white/90">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
          <span className="truncate text-white/90">
            Đã thu: <strong className="font-bold text-white"><AnimatedCounter value={collectedAmount} formatter={fmtCurrency} /></strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
          <span className="truncate text-white/90">
            Công nợ: <strong className="font-bold text-white"><AnimatedCounter value={debtAmount} formatter={fmtCurrency} /></strong>
          </span>
        </div>
      </div>
      {actionText && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onAction) onAction();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-blue-100 cursor-pointer group text-right shrink-0"
        >
          <span>{actionText}</span>
          <IoArrowForwardOutline size={14} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      )}
    </div>
  </div>
);

/** Lodgify Standard Clean Card */
const LodgifyStatCard: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  rawValue?: number;
  valueSuffix?: string;
  customValue?: React.ReactNode;
  subLabel?: string;
  badgeText?: string;
  badgeType?: 'positive' | 'neutral' | 'warning' | 'danger';
  iconBg?: string;
  iconColor?: string;
  progressPercent?: number;
  progressBarColor?: string;
  onClick?: () => void;
}> = ({
  icon: Icon,
  label,
  rawValue,
  valueSuffix = '',
  customValue,
  subLabel,
  badgeText,
  badgeType = 'positive',
  iconBg = 'bg-[#EBF3FF]',
  iconColor = 'text-[#0070F4]',
  progressPercent,
  progressBarColor = 'bg-[#0070F4]',
  onClick
}) => (
  <div
    onClick={onClick}
    className={`bg-white border border-border-grey rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:-translate-y-0.5 h-full ${
      onClick ? 'cursor-pointer hover:shadow-md hover:border-[#0070F4]' : 'hover:shadow-xs'
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon size={20} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      </div>

      {badgeText && (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            badgeType === 'positive'
              ? 'bg-[#E6F8ED] text-[#00B63E]'
              : badgeType === 'warning'
              ? 'bg-[#FEF3C7] text-[#92400E]'
              : badgeType === 'danger'
              ? 'bg-[#FEE2E2] text-[#DC2626]'
              : 'bg-[#F1F5F9] text-[#475569]'
          }`}
        >
          {badgeText}
        </span>
      )}
    </div>

    <div className="mt-4">
      <div className="text-2xl font-bold text-[#002146] tracking-tight">
        {rawValue !== undefined ? (
          <AnimatedCounter value={rawValue} suffix={valueSuffix} />
        ) : (
          customValue
        )}
      </div>
      {subLabel && <p className="text-xs text-slate-500 mt-1 font-medium">{subLabel}</p>}
    </div>

    {progressPercent != null && (
      <div className="mt-3">
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressBarColor} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>
    )}
  </div>
);

/** Hotel Room Inventory Spectrum Bar */
const RoomStatusSpectrum: React.FC<{
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  dirtyRooms: number;
  inspectingRooms?: number;
  maintenanceRooms: number;
  title?: string;
}> = ({
  totalRooms,
  availableRooms,
  occupiedRooms,
  dirtyRooms,
  inspectingRooms = 0,
  maintenanceRooms,
  title = "Phổ Trạng Thái Buồng Phòng Khách Sạn"
}) => {
  const safeTotal = totalRooms > 0 ? totalRooms : 1;
  const housekeepingRooms = dirtyRooms + inspectingRooms;
  const pctAvailable = Math.round((availableRooms / safeTotal) * 100);
  const pctOccupied = Math.round((occupiedRooms / safeTotal) * 100);
  const pctDirty = Math.round((housekeepingRooms / safeTotal) * 100);
  const pctMaint = Math.round((maintenanceRooms / safeTotal) * 100);

  return (
    <div className="bg-white border border-border-grey rounded-2xl p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-grey">
        <div className="flex items-center gap-2">
          <IoSpeedometerOutline size={18} className="text-primary" />
          <h3 className="font-bold text-sm sm:text-base text-[#002146]">{title}</h3>
        </div>
        <div className="text-xs font-bold text-slate-500">
          Tổng quy mô:{' '}
          <strong className="text-[#002146] font-extrabold text-sm">
            <AnimatedCounter value={totalRooms} suffix=" phòng" />
          </strong>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5 shadow-inner">
          {occupiedRooms > 0 && (
            <div
              style={{ flex: occupiedRooms }}
              title={`Đang có khách: ${occupiedRooms} phòng (${pctOccupied}%)`}
              className="h-full bg-[#0070F4] rounded-l-full transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
          {availableRooms > 0 && (
            <div
              style={{ flex: availableRooms }}
              title={`Sẵn sàng: ${availableRooms} phòng (${pctAvailable}%)`}
              className="h-full bg-[#00B63E] transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
          {housekeepingRooms > 0 && (
            <div
              style={{ flex: housekeepingRooms }}
              title={`Chờ buồng phòng: ${housekeepingRooms} phòng (${pctDirty}%)${inspectingRooms > 0 ? ` (${dirtyRooms} cần dọn, ${inspectingRooms} chờ duyệt)` : ''}`}
              className="h-full bg-[#FF8800] transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
          {maintenanceRooms > 0 && (
            <div
              style={{ flex: maintenanceRooms }}
              title={`Bảo trì: ${maintenanceRooms} phòng (${pctMaint}%)`}
              className="h-full bg-[#94A3B8] rounded-r-full transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border-grey text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#0070F4] shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[11px]">Đang ở:</span>
            <strong className="text-[#002146]">
              <AnimatedCounter value={occupiedRooms} /> ({pctOccupied}%)
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#00B63E] shrink-0 border border-[#009E35]" />
          <div className="truncate">
            <span className="text-slate-500 block text-[11px]">Sẵn sàng đón:</span>
            <strong className="text-[#002146]">
              <AnimatedCounter value={availableRooms} /> ({pctAvailable}%)
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF8800] shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[11px]">Cần dọn dẹp:</span>
            <strong className="text-[#002146]">
              <AnimatedCounter value={housekeepingRooms} /> ({pctDirty}%)
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#94A3B8] shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[11px]">Đang bảo trì:</span>
            <strong className="text-[#002146]">
              <AnimatedCounter value={maintenanceRooms} /> ({pctMaint}%)
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Hotel KPI Ticker: Giá phòng TB, Doanh thu/phòng, Tỷ lệ thu tiền, Đặt mới hôm nay */
const HotelKpiTicker: React.FC<{
  adr: number;
  revPar: number;
  collectionRate: number;
  todayBookings: number;
  soldNights?: number;
  occupancyRate?: number;
}> = ({ adr, revPar, collectionRate, todayBookings, soldNights = 0, occupancyRate = 0 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#EBF3FF] text-[#0070F4] flex items-center justify-center shrink-0">
        <IoBusinessOutline size={20} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase text-slate-500 block truncate">
            Giá Phòng Trung Bình
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EBF3FF] text-[#0070F4] border border-[#BFDBFE]">ADR</span>
        </div>
        <div className="text-base sm:text-lg font-extrabold text-[#002146] truncate mt-0.5">
          <AnimatedCounter value={adr} formatter={fmtCurrency} />
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {soldNights > 0 ? `${soldNights} đêm phòng đã bán` : 'Chưa có đêm bán'}
        </p>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
        <IoTrendingUpOutline size={20} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase text-slate-500 block truncate">
            Doanh Thu Trên Phòng
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">RevPAR</span>
        </div>
        <div className="text-base sm:text-lg font-extrabold text-[#002146] truncate mt-0.5">
          <AnimatedCounter value={revPar} formatter={fmtCurrency} />
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {occupancyRate > 0 ? `${occupancyRate}% công suất hiện tại` : 'Công suất 0%'}
        </p>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] text-[#854D0E] flex items-center justify-center shrink-0">
        <IoWalletOutline size={20} />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase text-slate-500 block truncate">
          Tỷ Lệ Thu Tiền
        </span>
        <div className="text-base sm:text-lg font-extrabold text-[#002146] truncate mt-0.5">
          <AnimatedCounter value={collectionRate} suffix="%" />
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {collectionRate >= 90 ? 'Thu hồi tốt' : (collectionRate === 0 ? 'Chưa phát sinh' : 'Cần đối soát')}
        </p>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#FFF4E5] text-[#FF8800] flex items-center justify-center shrink-0">
        <IoCalendarOutline size={20} />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase text-slate-500 block truncate">
          Đặt Mới Hôm Nay
        </span>
        <div className="text-base sm:text-lg font-extrabold text-[#002146] truncate mt-0.5">
          <AnimatedCounter value={todayBookings} suffix=" đơn" />
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {todayBookings > 0 ? 'Có phát sinh trong ngày' : 'Chưa có đặt mới'}
        </p>
      </div>
    </div>
  </div>
);

/** Biểu đồ Cột Kép Lodgify Lấy Dữ Liệu Thật (Weekly Occupancy & Demand Chart) */
const WeeklyOccupancyChart: React.FC<{
  occupancyRows: OccupancyReportRow[];
  revenueRows: RevenueReportRow[];
  totalRooms: number;
  currentOccupiedRooms?: number;
  todayBookingsCount?: number;
  activeRange: 'week' | 'month';
  onRangeChange: (range: 'week' | 'month') => void;
  className?: string;
}> = ({
  occupancyRows,
  revenueRows,
  totalRooms,
  currentOccupiedRooms = 0,
  todayBookingsCount = 0,
  activeRange,
  onRangeChange,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const fullDayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  const chartItems = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();

    if (activeRange === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d);
      }
    } else {
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysCount = today.getDate();
      const step = Math.max(1, Math.floor(daysCount / 10));
      for (let day = 1; day <= daysCount; day += step) {
        dates.push(new Date(year, month, day));
      }
      const lastDate = dates[dates.length - 1];
      if (lastDate && formatLocalDate(lastDate) !== formatLocalDate(today)) {
        dates.push(today);
      }
    }

    const occMap = new Map<string, OccupancyReportRow>();
    occupancyRows.forEach(r => occMap.set(r.date, r));

    const revMap = new Map<string, RevenueReportRow>();
    revenueRows.forEach(r => revMap.set(r.period || r.date || '', r));

    return dates.map(d => {
      const dateStr = formatLocalDate(d);
      const isToday = dateStr === formatLocalDate(today);
      const occ = occMap.get(dateStr);
      const rev = revMap.get(dateStr);

      let occupied = occ?.occupiedRooms ?? 0;
      let rate = occ?.occupancyRate ?? 0;
      let newBookings = rev?.bookings ?? 0;
      const revenue = rev?.roomRevenue ?? (rev?.revenue ?? 0);

      if (isToday) {
        if (currentOccupiedRooms > 0) occupied = currentOccupiedRooms;
        if (totalRooms > 0) rate = Math.round((occupied / totalRooms) * 100);
        if (todayBookingsCount > 0) newBookings = Math.max(newBookings, todayBookingsCount);
      }

      return {
        dateStr,
        dayLabel: activeRange === 'week' ? dayNames[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`,
        fullDayLabel: `${fullDayNames[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`,
        isToday,
        occupiedRooms: occupied,
        occupancyRate: rate,
        newBookings,
        revenue
      };
    });
  }, [activeRange, occupancyRows, revenueRows, totalRooms, currentOccupiedRooms, todayBookingsCount]);

  const summary = useMemo(() => {
    let totalNewBookings = 0;
    let sumRate = 0;
    let peakDay: typeof chartItems[0] | null = null;

    chartItems.forEach(item => {
      totalNewBookings += item.newBookings;
      sumRate += item.occupancyRate;
      if (!peakDay || item.occupiedRooms > peakDay.occupiedRooms) {
        peakDay = item;
      }
    });

    const avgOccupancyRate = chartItems.length > 0 ? Math.round(sumRate / chartItems.length) : 0;
    return { totalNewBookings, avgOccupancyRate, peakDay };
  }, [chartItems]);

  return (
    <div className={`bg-white border border-border-grey rounded-2xl p-5 shadow-2xs flex flex-col justify-between ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-grey">
        <div>
          <div className="flex items-center gap-2">
            <IoBarChartOutline size={20} className="text-primary" />
            <h3 className="font-bold text-base text-[#002146]">
              Xu Hướng Công Suất & Lượt Đặt Phòng
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tương quan giữa phòng có khách và nhu cầu đặt phòng mới
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#F4F6F9] p-1 rounded-xl border border-border-grey text-xs">
            <button
              onClick={() => onRangeChange('week')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeRange === 'week' ? 'bg-[#0070F4] text-white shadow-2xs' : 'text-slate-600 hover:text-[#002146]'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => onRangeChange('month')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeRange === 'month' ? 'bg-[#0070F4] text-white shadow-2xs' : 'text-slate-600 hover:text-[#002146]'
              }`}
            >
              Tháng này
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#F4F6F9] rounded-xl border border-border-grey my-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF8800] border border-[#E67A00] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 block truncate">Tổng đặt mới</span>
            <span className="font-extrabold text-[#002146] text-xs sm:text-sm">
              {summary.totalNewBookings} <span className="text-[11px] font-normal text-slate-500">đơn</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 border-x border-border-grey px-2 sm:px-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0070F4] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 block truncate">Công suất TB</span>
            <span className="font-extrabold text-[#002146] text-xs sm:text-sm">
              {summary.avgOccupancyRate}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 pl-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 block truncate">Đông nhất</span>
            <span className="font-extrabold text-[#002146] text-xs sm:text-sm truncate block">
              {summary.peakDay && summary.peakDay.occupiedRooms > 0
                ? `${summary.peakDay.dayLabel} (${summary.peakDay.occupiedRooms} ph)`
                : '0 phòng'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between min-h-[220px] relative pt-2">
        <div className="flex items-stretch flex-1 gap-1.5 sm:gap-2 relative">
          <div className="w-9 sm:w-11 flex flex-col justify-between items-end pb-8 pr-1.5 text-[10px] font-mono text-slate-400 shrink-0 select-none">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div className="flex-1 relative flex flex-col justify-between">
            <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-slate-300 w-full" />
            </div>

            <div className="relative z-10 flex items-stretch justify-between gap-1 sm:gap-2 flex-1">
              {chartItems.map((item, idx) => {
                const hOccupied = Math.min(100, Math.max(0, item.occupancyRate));
                const maxBookingsCeil = Math.max(5, ...chartItems.map(i => i.newBookings));
                const hBookings = Math.min(100, Math.round((item.newBookings / maxBookingsCeil) * 100));
                const isHovered = hoveredIdx === idx;

                const tooltipPosClass = idx === 0
                  ? 'left-0'
                  : idx === chartItems.length - 1
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2';

                return (
                  <div
                    key={idx}
                    className={`flex-1 flex flex-col items-center justify-end rounded-xl p-1 transition-all relative ${
                      isHovered ? 'bg-blue-50/70 shadow-2xs' : 'hover:bg-slate-50'
                    }`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {isHovered && (
                      <div className={`absolute bottom-full mb-3 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${tooltipPosClass}`}>
                        <div className="bg-[#002146] text-white text-xs rounded-xl p-3 shadow-xl whitespace-nowrap border border-blue-900 min-w-[190px]">
                          <div className="flex items-center justify-between border-b border-blue-900 pb-1.5 mb-2">
                            <span className="font-bold text-blue-200 text-xs">{item.fullDayLabel}</span>
                            {item.isToday && (
                              <span className="text-[10px] bg-[#0070F4] text-white px-1.5 py-0.2 rounded font-bold">
                                Hôm nay
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-300 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#0070F4] shrink-0" />
                                Phòng có khách:
                              </span>
                              <span className="font-bold text-white">
                                {item.occupiedRooms} / {totalRooms} ({item.occupancyRate}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-300 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#FF8800] shrink-0" />
                                Đặt phòng mới:
                              </span>
                              <span className="font-bold text-[#FF8800]">{item.newBookings} đơn</span>
                            </div>
                            {item.revenue > 0 && (
                              <div className="flex items-center justify-between gap-3 pt-1 border-t border-blue-900/60">
                                <span className="text-slate-300">Doanh thu:</span>
                                <span className="font-bold text-emerald-400">{fmtCurrency(item.revenue)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="w-2.5 h-2.5 bg-[#002146] rotate-45 mx-auto -mt-1 border-r border-b border-blue-900" />
                      </div>
                    )}

                    <div className="w-full max-w-[44px] flex items-end justify-center gap-1 sm:gap-1.5 flex-1 min-h-0 pb-0.5">
                      <div className="w-1/2 flex flex-col items-center justify-end h-full">
                        {item.newBookings > 0 && (
                          <span className="text-[9px] sm:text-[10px] font-extrabold text-[#FF8800] mb-0.5 leading-none">
                            +{item.newBookings}
                          </span>
                        )}
                        <div
                          className="w-full bg-[#FF8800] hover:bg-[#E67A00] rounded-t-md transition-all duration-300 relative min-h-[2px]"
                          style={{ height: item.newBookings > 0 ? `${Math.max(8, hBookings)}%` : '0%' }}
                        />
                      </div>

                      <div className="w-1/2 flex flex-col items-center justify-end h-full">
                        {item.occupiedRooms > 0 && (
                          <span className="text-[9px] sm:text-[10px] font-extrabold text-[#0070F4] mb-0.5 leading-none">
                            {item.occupiedRooms}
                          </span>
                        )}
                        <div
                          className="w-full bg-[#0070F4] hover:bg-[#0060DC] rounded-t-md transition-all duration-300 relative min-h-[2px]"
                          style={{ height: item.occupiedRooms > 0 ? `${Math.max(8, hOccupied)}%` : '0%' }}
                        />
                      </div>
                    </div>

                    <div className="w-full text-center pt-2 pb-0.5 border-t border-slate-200 mt-1">
                      <span className={`text-[10px] font-bold block truncate ${item.isToday ? 'text-[#0070F4]' : 'text-slate-500'}`}>
                        {item.dayLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Donut Phân Bổ Nguồn Khách (Booking Source Donut) */
const BookingSourceDonut: React.FC<{
  channelReport: ChannelReportResponse | null;
  overallOccupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  className?: string;
}> = ({ channelReport, overallOccupancyRate, totalRooms, occupiedRooms, className = '' }) => {
  const channelSlices = useMemo(() => {
    if (!channelReport || !channelReport.rows || channelReport.rows.length === 0) {
      return [];
    }
    const colorPalette = ['#0070F4', '#FF8800', '#00B63E', '#8B5CF6', '#EC4899', '#64748B'];
    const totalBookings = channelReport.summary?.totalBookings || 1;

    return channelReport.rows.map((ch, idx) => ({
      label: ch.channelName || 'Trực tiếp',
      count: ch.totalBookings || 0,
      percent: Math.round(((ch.totalBookings || 0) / totalBookings) * 100),
      revenue: ch.revenue || 0,
      color: colorPalette[idx % colorPalette.length]
    })).filter(s => s.count > 0);
  }, [channelReport]);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={`bg-white border border-border-grey rounded-2xl p-5 shadow-2xs flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-border-grey">
        <div className="flex items-center gap-2">
          <IoPieChartOutline size={20} className="text-primary" />
          <h3 className="font-bold text-base text-[#002146]">Cơ Cấu Kênh Đặt Phòng</h3>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-[#F4F6F9] px-2 py-0.5 rounded-full border border-border-grey">
          Tháng này
        </span>
      </div>

      <div className="my-4 flex flex-col sm:flex-row items-center justify-around gap-4 flex-1">
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="18" />
            {(() => {
              let accumulatedPercent = 0;
              return channelSlices.map((slice, i) => {
                const strokeDash = (slice.percent / 100) * circumference;
                const strokeGap = circumference - strokeDash;
                const strokeOffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += slice.percent;

                return (
                  <circle
                    key={i}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="18"
                    strokeDasharray={`${strokeDash} ${strokeGap}`}
                    strokeDashoffset={strokeOffset}
                    className="transition-all duration-500"
                  />
                );
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl sm:text-2xl font-black text-[#002146] leading-none">{overallOccupancyRate}%</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Lấp đầy</span>
          </div>
        </div>

        <div className="space-y-2 text-xs w-full min-w-0">
          {channelSlices.length === 0 ? (
            <div className="text-center py-4 text-slate-500">
              <p className="font-medium text-xs">Chưa có lượt đặt phòng nào theo kênh trong kỳ này</p>
              <p className="text-[11px] text-slate-400 mt-1">Đang có {occupiedRooms}/{totalRooms} phòng có khách</p>
            </div>
          ) : (
            channelSlices.map((src, i) => (
              <div key={i} className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: src.color }} />
                  <span className="text-slate-600 truncate font-medium">{src.label}</span>
                </div>
                <span className="font-bold text-[#002146] shrink-0 tabular-nums">{src.percent}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-border-grey flex items-center justify-between text-xs text-slate-500 shrink-0">
        <span>Hiện tại: {occupiedRooms} / {totalRooms} phòng có khách</span>
        <span className="font-bold text-[#0070F4]">{overallOccupancyRate}% công suất</span>
      </div>
    </div>
  );
};

// ==========================================
// VIEW 1: CHỦ CƠ SỞ (VT-01: OWNER)
// ==========================================
const OwnerDashboardView: React.FC<{
  dashboard: DashboardStatsResponse | null;
  adr: number;
  revPar: number;
  realCollectionPercent: number;
  realOccupancyRate: number;
  dirtyRoomsCount: number;
  occupancyRows: OccupancyReportRow[];
  revenueRows: RevenueReportRow[];
  channelReport: ChannelReportResponse | null;
  chartRange: 'week' | 'month';
  onRangeChange: (range: 'week' | 'month') => void;
  pendingDebtCount: number;
  pendingResetCount: number;
  onOpenResetModal: () => void;
}> = ({
  dashboard,
  adr,
  revPar,
  realCollectionPercent,
  realOccupancyRate,
  dirtyRoomsCount,
  occupancyRows,
  revenueRows,
  channelReport,
  chartRange,
  onRangeChange,
  pendingDebtCount,
  pendingResetCount,
  onOpenResetModal
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Thanh cảnh báo phê duyệt ngoại lệ (Pending Approvals) */}
      {(pendingDebtCount > 0 || pendingResetCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingDebtCount > 0 && (
            <div className="p-4 bg-gradient-to-r from-[#FEF2F2] to-[#FFF1F2] border border-[#FECACA] rounded-2xl shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#DC2626] text-white rounded-xl shadow-xs shrink-0">
                  <IoAlertCircleOutline size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#991B1B]">
                    Có {pendingDebtCount} yêu cầu trả phòng còn nợ chờ duyệt!
                  </h4>
                  <p className="text-xs text-[#B91C1C] mt-0.5">
                    Lễ tân đã gửi yêu cầu bảo lãnh công nợ cho khách trả phòng.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/manage/debt-approvals')}
                className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span>Phê duyệt ngay</span>
                <IoArrowForwardOutline size={14} />
              </button>
            </div>
          )}

          {pendingResetCount > 0 && (
            <div className="p-4 bg-gradient-to-r from-[#FEF9C3] to-[#FEF08A] border border-[#FDE047] rounded-2xl shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#854D0E] text-[#FEF08A] rounded-xl shadow-xs shrink-0">
                  <IoKeyOutline size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#713F12]">
                    Có {pendingResetCount} yêu cầu cấp lại mật khẩu từ nhân viên!
                  </h4>
                  <p className="text-xs text-[#854D0E] mt-0.5">
                    Xác minh danh tính và cấp mật khẩu tạm hiệu lực 24 giờ.
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenResetModal}
                className="px-3.5 py-1.5 bg-[#854D0E] hover:bg-[#713F12] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span>Cấp mật khẩu</span>
                <IoArrowForwardOutline size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lối tắt điều hành Chủ cơ sở */}
      <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <IoFlashOutline size={16} className="text-primary" />
            <span>Tác Vụ Điều Hành & Phê Duyệt</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/manage/reports')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0070F4] hover:bg-[#0060DC] text-xs font-bold text-white transition-all cursor-pointer shadow-2xs"
            >
              <IoBarChartOutline size={15} />
              <span>Báo Cáo Toàn Diện</span>
            </button>
            <button
              onClick={() => navigate('/manage/debt-approvals')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoWalletOutline size={15} className="text-primary" />
              <span>Duyệt Công Nợ</span>
            </button>
            <button
              onClick={() => navigate('/manage/cashier-shifts')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoCashOutline size={15} className="text-[#00B63E]" />
              <span>Chốt Ca & Sổ Quỹ</span>
            </button>
            <button
              onClick={() => navigate('/manage/housekeeping-productivity')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoBrushOutline size={15} className="text-[#EA580C]" />
              <span>Năng Suất Buồng Phòng</span>
            </button>
            <button
              onClick={() => navigate('/manage/channels')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoCalendarOutline size={15} className="text-primary" />
              <span>Kênh Bán Phòng (OTA)</span>
            </button>
            <button
              onClick={() => navigate('/manage/deposit-policies')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoSettingsOutline size={15} className="text-slate-600" />
              <span>Chính Sách & Giá</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Thẻ KPI Kinh Doanh */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          <div className="md:col-span-2 lg:col-span-1 flex flex-col">
            <HeroStatCard
              title="Doanh thu Tháng"
              rawValue={dashboard.monthRevenue || 0}
              collectedAmount={dashboard.monthCollectedRevenue || 0}
              debtAmount={dashboard.monthDebtRevenue || 0}
              collectionPercent={realCollectionPercent}
              actionText="Chi tiết"
              onAction={() => navigate('/manage/reports?tab=revenue')}
            />
          </div>

          <LodgifyStatCard
            icon={IoBedOutline}
            label="Phòng Trống Khả Dụng"
            customValue={
              <span className="flex items-baseline gap-1">
                <AnimatedCounter value={dashboard.availableRooms || 0} />
                <span className="text-sm font-normal text-slate-500">/ {dashboard.totalRooms || 0}</span>
              </span>
            }
            subLabel={`${dashboard.totalRooms ? Math.round(((dashboard.availableRooms || 0) / dashboard.totalRooms) * 100) : 0}% phòng sẵn sàng đón khách`}
            badgeText="Khả dụng"
            badgeType="positive"
            iconBg="bg-[#E6F8ED]"
            iconColor="text-[#00B63E]"
            progressPercent={dashboard.totalRooms ? ((dashboard.availableRooms || 0) / dashboard.totalRooms) * 100 : 0}
            progressBarColor="bg-[#00B63E]"
            onClick={() => navigate('/manage/rooms')}
          />

          <LodgifyStatCard
            icon={IoPeopleOutline}
            label="Khách Đang Lưu Trú"
            rawValue={dashboard.occupiedRooms || 0}
            valueSuffix=" phòng"
            subLabel={`+${dashboard.todayCheckIns || 0} lượt nhận hôm nay`}
            badgeText={`${realOccupancyRate}% Công suất`}
            badgeType="positive"
            iconBg="bg-[#EBF3FF]"
            iconColor="text-[#0070F4]"
            progressPercent={realOccupancyRate}
            progressBarColor="bg-[#0070F4]"
            onClick={() => navigate('/manage/in-house-guests')}
          />

          <LodgifyStatCard
            icon={IoBrushOutline}
            label="Chờ Buồng Phòng"
            rawValue={dirtyRoomsCount}
            valueSuffix=" phòng"
            subLabel={
              dirtyRoomsCount > 0
                ? (dashboard.inspectingRooms && dashboard.inspectingRooms > 0
                    ? `${dashboard.dirtyRooms || 0} cần dọn, ${dashboard.inspectingRooms} chờ duyệt`
                    : `${dirtyRoomsCount} phòng cần dọn dẹp`)
                : 'Tất cả phòng sạch sẽ'
            }
            badgeText={
              dirtyRoomsCount > 0
                ? (dashboard.dirtyRooms && dashboard.dirtyRooms > 0 ? 'Cần dọn' : 'Chờ duyệt')
                : 'Đã sạch'
            }
            badgeType={dirtyRoomsCount > 0 ? 'warning' : 'positive'}
            iconBg="bg-[#FFF4E5]"
            iconColor="text-[#FF8800]"
            progressPercent={dashboard.totalRooms ? (dirtyRoomsCount / dashboard.totalRooms) * 100 : 0}
            progressBarColor="bg-[#FF8800]"
            onClick={() => navigate('/manage/housekeeping')}
          />
        </div>
      )}

      {/* Hotel KPI Ticker: ADR, RevPAR, Collection, Today Bookings */}
      <HotelKpiTicker 
        adr={adr}
        revPar={revPar}
        collectionRate={realCollectionPercent}
        todayBookings={dashboard?.todayBookings || 0}
        soldNights={dashboard?.monthSoldNights || (dashboard?.monthRevenue ? 1 : 0)}
        occupancyRate={realOccupancyRate}
      />

      {/* Room Status Spectrum Bar */}
      {dashboard && (
        <RoomStatusSpectrum 
          totalRooms={dashboard.totalRooms || 0}
          availableRooms={dashboard.availableRooms || 0}
          occupiedRooms={dashboard.occupiedRooms || 0}
          dirtyRooms={dashboard.dirtyRooms || 0}
          inspectingRooms={dashboard.inspectingRooms || 0}
          maintenanceRooms={dashboard.maintenanceRooms || 0}
        />
      )}

      {/* Biểu đồ phân tích kinh doanh: Cột kép & Nguồn kênh Donut */}
      {dashboard && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          <div className="lg:col-span-2 flex flex-col">
            <WeeklyOccupancyChart 
              occupancyRows={occupancyRows}
              revenueRows={revenueRows}
              totalRooms={dashboard.totalRooms || 0}
              currentOccupiedRooms={dashboard.occupiedRooms || 0}
              todayBookingsCount={dashboard.todayBookings || 0}
              activeRange={chartRange}
              onRangeChange={onRangeChange}
              className="h-full flex-1"
            />
          </div>
          <div className="flex flex-col">
            <BookingSourceDonut 
              channelReport={channelReport}
              overallOccupancyRate={realOccupancyRate}
              totalRooms={dashboard.totalRooms || 0}
              occupiedRooms={dashboard.occupiedRooms || 0}
              className="h-full flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// VIEW 2: LỄ TÂN (VT-02: RECEPTIONIST)
// ==========================================
const ReceptionistDashboardView: React.FC<{
  dashboard: DashboardStatsResponse | null;
  todayEvents: any[];
  currentShift: CashierShiftResponse | null;
}> = ({ dashboard, todayEvents, currentShift }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'CHECKIN' | 'CHECKOUT'>('ALL');
  const [search, setSearch] = useState('');

  const checkInsCount = useMemo(() => todayEvents.filter(e => e.type === 'checkin').length, [todayEvents]);
  const checkOutsCount = useMemo(() => todayEvents.filter(e => e.type === 'checkout').length, [todayEvents]);

  const filteredEvents = useMemo(() => {
    return todayEvents.filter(ev => {
      if (filter === 'CHECKIN' && ev.type !== 'checkin') return false;
      if (filter === 'CHECKOUT' && ev.type !== 'checkout') return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const guest = (ev.guestName || '').toLowerCase();
      const phone = (ev.guestPhone || '').toLowerCase();
      const room = (ev.roomNumber || '').toString().toLowerCase();
      return guest.includes(q) || phone.includes(q) || room.includes(q);
    });
  }, [todayEvents, filter, search]);

  return (
    <div className="space-y-6">
      {/* Dải thông tin Ca trực Thu ngân của Lễ tân */}
      <div className="p-4 bg-white border border-border-grey rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${currentShift?.status === 'OPEN' ? 'bg-[#E6F8ED] text-[#00B63E]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
            <IoCashOutline size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-[#002146]">
                {currentShift?.status === 'OPEN' ? 'Ca trực thu ngân đang hoạt động' : 'Chưa mở ca trực thu ngân'}
              </h4>
              <span className={`px-2 py-0.2 rounded-full text-[11px] font-bold ${
                currentShift?.status === 'OPEN' ? 'bg-[#E6F8ED] text-[#00B63E]' : 'bg-[#FEF3C7] text-[#B45309]'
              }`}>
                {currentShift?.status === 'OPEN' ? 'Đang mở' : 'Chờ mở ca'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentShift?.status === 'OPEN'
                ? `Thu ngân: ${currentShift.openedByName || 'Bạn'} • Tiền đầu ca: ${fmtCurrency(currentShift.openingCash)}`
                : 'Vui lòng mở ca trực để bắt đầu thu tiền mặt và tạo hóa đơn cho khách.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/manage/cashier-shifts')}
          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary shrink-0 flex items-center gap-1.5"
        >
          <span>{currentShift?.status === 'OPEN' ? 'Quản lý / Chốt ca' : 'Mở ca ngay'}</span>
          <IoArrowForwardOutline size={14} />
        </button>
      </div>

      {/* Lối tắt tác nghiệp Lễ tân */}
      <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <IoFlashOutline size={16} className="text-primary" />
            <span>Tác Vụ Đón Tiếp Tuyến Đầu</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/manage/bookings')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0070F4] hover:bg-[#0060DC] text-xs font-bold text-white transition-all cursor-pointer shadow-2xs"
            >
              <IoAddCircleOutline size={15} />
              <span>Tạo Đặt Phòng Mới</span>
            </button>
            <button
              onClick={() => navigate('/manage/rooms')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoBedOutline size={15} className="text-primary" />
              <span>Sơ Đồ Phòng Trực Quan</span>
            </button>
            <button
              onClick={() => navigate('/manage/in-house-guests')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoPeopleOutline size={15} className="text-[#0070F4]" />
              <span>Khách Đang Lưu Trú</span>
            </button>
            <button
              onClick={() => navigate('/manage/stay-declarations')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoDocumentTextOutline size={15} className="text-[#00B63E]" />
              <span>Khai Báo Lưu Trú</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hàng KPI Vận hành Đón tiếp */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <LodgifyStatCard
            icon={IoBedOutline}
            label="Phòng Sẵn Sàng Đón Khách"
            rawValue={dashboard.availableRooms || 0}
            valueSuffix=" phòng"
            subLabel={`Trên tổng số ${dashboard.totalRooms || 0} phòng`}
            badgeText="Sẵn sàng"
            badgeType="positive"
            iconBg="bg-[#E6F8ED]"
            iconColor="text-[#00B63E]"
            onClick={() => navigate('/manage/rooms')}
          />

          <LodgifyStatCard
            icon={IoPeopleOutline}
            label="Khách Đang Lưu Trú"
            rawValue={dashboard.occupiedRooms || 0}
            valueSuffix=" phòng"
            subLabel="Khách đang ở tại cơ sở"
            badgeText="In-house"
            badgeType="positive"
            iconBg="bg-[#EBF3FF]"
            iconColor="text-[#0070F4]"
            onClick={() => navigate('/manage/in-house-guests')}
          />

          <LodgifyStatCard
            icon={IoLogInOutline}
            label="Lịch Check-in Hôm Nay"
            rawValue={checkInsCount || dashboard.todayCheckIns || 0}
            valueSuffix=" lượt"
            subLabel="Khách nhận phòng trong ngày"
            badgeText="Check-in"
            badgeType="neutral"
            iconBg="bg-[#F0FDF4]"
            iconColor="text-[#16A34A]"
          />

          <LodgifyStatCard
            icon={IoLogOutOutline}
            label="Lịch Check-out Hôm Nay"
            rawValue={checkOutsCount || dashboard.todayCheckOuts || 0}
            valueSuffix=" lượt"
            subLabel="Khách trả phòng trong ngày"
            badgeText="Check-out"
            badgeType="warning"
            iconBg="bg-[#FFF7ED]"
            iconColor="text-[#EA580C]"
          />
        </div>
      )}

      {/* Phổ Trạng Thái Buồng Phòng (Giúp Lễ tân nắm phòng sạch để xếp phòng sớm) */}
      {dashboard && (
        <RoomStatusSpectrum 
          totalRooms={dashboard.totalRooms || 0}
          availableRooms={dashboard.availableRooms || 0}
          occupiedRooms={dashboard.occupiedRooms || 0}
          dirtyRooms={dashboard.dirtyRooms || 0}
          inspectingRooms={dashboard.inspectingRooms || 0}
          maintenanceRooms={dashboard.maintenanceRooms || 0}
          title="Tình Trạng Phòng Thực Tế Đón Khách"
        />
      )}

      {/* Bảng Danh Sách Lịch Nhận & Trả Phòng Hôm Nay */}
      <div className="bg-white border border-border-grey rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-border-grey flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] text-[#0070F4] flex items-center justify-center shrink-0">
              <IoFlashOutline size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#002146]">Lịch Nhận phòng & Trả phòng Hôm nay</h2>
              <p className="text-xs text-slate-500">Danh sách khách check-in và check-out theo thời gian thực</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-[#F4F6F9] p-1 rounded-xl border border-border-grey text-xs">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filter === 'ALL' ? 'bg-white text-[#002146] shadow-2xs' : 'text-slate-600 hover:text-[#002146]'
                }`}
              >
                Tất cả ({todayEvents.length})
              </button>
              <button
                onClick={() => setFilter('CHECKIN')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filter === 'CHECKIN' ? 'bg-white text-[#16A34A] shadow-2xs' : 'text-slate-600 hover:text-[#002146]'
                }`}
              >
                <span>Nhận</span> ({checkInsCount})
              </button>
              <button
                onClick={() => setFilter('CHECKOUT')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filter === 'CHECKOUT' ? 'bg-white text-[#0070F4] shadow-2xs' : 'text-slate-600 hover:text-[#002146]'
                }`}
              >
                <span>Trả</span> ({checkOutsCount})
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm khách, phòng..."
                className="py-1.5 pl-8 pr-3 text-xs bg-white border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-primary w-36 sm:w-44"
              />
              <IoSearchOutline size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <IoCalendarOutline size={28} />
            </div>
            <p className="text-sm font-semibold text-[#002146]">
              {todayEvents.length === 0 ? 'Không có lịch nhận/trả phòng nào hôm nay' : 'Không tìm thấy khách nào phù hợp'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Lịch đón tiếp khách sẽ tự động cập nhật khi có phát sinh mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-border-grey text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Khách hàng</th>
                  <th className="py-3.5 px-4">Số phòng</th>
                  <th className="py-3.5 px-4">Hạng phòng</th>
                  <th className="py-3.5 px-4 text-center">Sự kiện</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-5 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-xs">
                {filteredEvents.map((ev, idx) => (
                  <tr key={`${ev.bookingId}-${ev.type}` || idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EBF3FF] text-[#0070F4] font-bold text-xs flex items-center justify-center shrink-0">
                          {ev.guestName?.[0]?.toUpperCase() || 'K'}
                        </div>
                        <div>
                          <p className="font-bold text-[#002146] group-hover:text-primary transition-colors">{ev.guestName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{ev.guestPhone || 'Chưa có SĐT'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-[#002146]">
                      {ev.roomNumber ? (
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-[#EBF3FF] text-[#0070F4] border border-[#BFDBFE] text-xs font-bold">
                          P. {ev.roomNumber}
                        </span>
                      ) : (
                        <span className="italic text-slate-400 text-xs">Chưa xếp phòng</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">{ev.roomTypeName || '—'}</td>
                    <td className="py-4 px-4 text-center">
                      {ev.type === 'checkin' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F8ED] text-[#00B63E] border border-[#A7F3D0]">
                          <IoLogInOutline size={12} /> Nhận phòng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF3FF] text-[#0070F4] border border-[#BFDBFE]">
                          <IoLogOutOutline size={12} /> Trả phòng
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-semibold">
                      {ev.type === 'checkin' ? formatStayDateTime(ev.checkInDate, 'checkin') : formatStayDateTime(ev.checkOutDate, 'checkout')}
                    </td>
                    <td className="py-4 px-5 text-center">
                      {getStatusBadge(ev.status)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => navigate('/manage/bookings')}
                        className="px-2.5 py-1 text-xs font-bold text-[#0070F4] hover:bg-[#EBF3FF] rounded-lg transition-colors cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// VIEW 3: BUỒNG PHÒNG (VT-03: HOUSEKEEPER)
// ==========================================
const HousekeeperDashboardView: React.FC<{
  rooms: RoomResponse[];
  onRefresh: () => void;
}> = ({ rooms }) => {
  const navigate = useNavigate();

  const dirtyRooms = useMemo(() => rooms.filter(r => r.status === 'DIRTY'), [rooms]);
  const inspectingRooms = useMemo(() => rooms.filter(r => r.status === 'INSPECTING'), [rooms]);
  const cleanRooms = useMemo(() => rooms.filter(r => r.status === 'AVAILABLE'), [rooms]);
  const maintenanceRooms = useMemo(() => rooms.filter(r => r.status === 'MAINTENANCE'), [rooms]);

  const cleanPercent = useMemo(() => {
    if (rooms.length === 0) return 100;
    return Math.round((cleanRooms.length / rooms.length) * 100);
  }, [rooms, cleanRooms]);

  return (
    <div className="space-y-6">
      {/* Thẻ Cảnh Báo Phòng Bẩn Cần Dọn Ngay */}
      {dirtyRooms.length > 0 ? (
        <div className="p-4 bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border border-[#FCD34D] rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D97706] text-white rounded-xl shadow-xs shrink-0 animate-bounce">
              <IoBrushOutline size={22} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#92400E]">
                Cần dọn dẹp ngay {dirtyRooms.length} phòng bẩn!
              </h4>
              <p className="text-xs text-[#B45309] mt-0.5">
                Các phòng sau khi khách trả cần được vệ sinh, thay ga gối để sẵn sàng đón lượt khách tiếp theo.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/manage/housekeeping')}
            className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <span>Bắt đầu dọn phòng</span>
            <IoArrowForwardOutline size={14} />
          </button>
        </div>
      ) : (
        <div className="p-4 bg-[#E6F8ED] border border-[#A7F3D0] rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-[#00B63E] text-white rounded-xl shadow-xs shrink-0">
            <IoCheckmarkCircleOutline size={22} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#009E35]">Tất cả các phòng đã sạch sẽ!</h4>
            <p className="text-xs text-[#059669] mt-0.5">Hiện tại không còn phòng bẩn nào chờ dọn dẹp.</p>
          </div>
        </div>
      )}

      {/* Lối tắt tác vụ Buồng phòng */}
      <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <IoFlashOutline size={16} className="text-[#EA580C]" />
            <span>Tác Vụ Nghiệp Vụ Buồng Phòng</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/manage/housekeeping')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0070F4] hover:bg-[#0060DC] text-xs font-bold text-white transition-all cursor-pointer shadow-2xs"
            >
              <IoBrushOutline size={15} />
              <span>Danh Sách Dọn Phòng</span>
            </button>
            <button
              onClick={() => navigate('/manage/lost-and-found')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoFolderOpenOutline size={15} className="text-[#0070F4]" />
              <span>Quản Lý Đồ Thất Lạc</span>
            </button>
            <button
              onClick={() => navigate('/manage/room-incidents')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoWarningOutline size={15} className="text-[#DC2626]" />
              <span>Báo Cáo Sự Cố Phòng</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Thẻ Trạng Thái Buồng Phòng */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <LodgifyStatCard
          icon={IoBrushOutline}
          label="Phòng Cần Dọn Ngay"
          rawValue={dirtyRooms.length}
          valueSuffix=" phòng"
          subLabel="Cần vệ sinh thay ga gối"
          badgeText={dirtyRooms.length > 0 ? "Cần dọn" : "Sạch"}
          badgeType={dirtyRooms.length > 0 ? "warning" : "positive"}
          iconBg="bg-[#FFF4E5]"
          iconColor="text-[#FF8800]"
          onClick={() => navigate('/manage/housekeeping')}
        />

        <LodgifyStatCard
          icon={IoCheckmarkCircleOutline}
          label="Chờ Nghiệm Thu"
          rawValue={inspectingRooms.length}
          valueSuffix=" phòng"
          subLabel="Đã dọn xong, chờ duyệt"
          badgeText="Chờ duyệt"
          badgeType="neutral"
          iconBg="bg-[#EFF6FF]"
          iconColor="text-[#2563EB]"
          onClick={() => navigate('/manage/housekeeping')}
        />

        <LodgifyStatCard
          icon={IoBedOutline}
          label="Phòng Đã Sạch Sẽ"
          rawValue={cleanRooms.length}
          valueSuffix=" phòng"
          subLabel={`Đạt ${cleanPercent}% tổng số phòng`}
          badgeText="Sẵn sàng"
          badgeType="positive"
          iconBg="bg-[#E6F8ED]"
          iconColor="text-[#00B63E]"
          onClick={() => navigate('/manage/housekeeping')}
        />

        <LodgifyStatCard
          icon={IoWarningOutline}
          label="Phòng Đang Bảo Trì"
          rawValue={maintenanceRooms.length}
          valueSuffix=" phòng"
          subLabel="Đang sửa chữa thiết bị"
          badgeText="Bảo trì"
          badgeType="danger"
          iconBg="bg-[#FEF2F2]"
          iconColor="text-[#DC2626]"
          onClick={() => navigate('/manage/room-incidents')}
        />
      </div>

      {/* Thanh Tiến Độ Vệ Sinh Trong Ngày */}
      <div className="bg-white border border-border-grey rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-border-grey">
          <div className="flex items-center gap-2">
            <IoCheckmarkOutline size={18} className="text-[#00B63E]" />
            <h3 className="font-bold text-sm text-[#002146]">Tiến Độ Vệ Sinh Cơ Sở</h3>
          </div>
          <span className="text-xs font-bold text-[#00B63E]">
            {cleanRooms.length} / {rooms.length} phòng sạch ({cleanPercent}%)
          </span>
        </div>
        <div className="mt-4">
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00B63E] to-[#10B981] rounded-full transition-all duration-700"
              style={{ width: `${cleanPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Danh Sách Các Phòng Cần Dọn Ưu Tiên */}
      <div className="bg-white border border-border-grey rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-border-grey flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[#002146]">Danh Sách Phòng Ưu Tiên Dọn Dẹp</h3>
            <p className="text-xs text-slate-500 mt-0.5">Danh sách các phòng đang ở trạng thái bẩn hoặc chờ nghiệm thu</p>
          </div>
          <button
            onClick={() => navigate('/manage/housekeeping')}
            className="text-xs font-bold text-[#0070F4] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Mở bảng phân công</span>
            <IoArrowForwardOutline size={14} />
          </button>
        </div>

        {dirtyRooms.length === 0 && inspectingRooms.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <IoCheckmarkCircleOutline size={36} className="text-[#00B63E] mx-auto mb-2" />
            <p className="font-bold text-sm text-[#002146]">Hiện tại tất cả các phòng đều sạch sẽ!</p>
            <p className="text-xs mt-1">Khi có khách trả phòng, hệ thống sẽ tự động cập nhật vào danh sách này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-border-grey text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Số phòng</th>
                  <th className="py-3 px-4">Hạng phòng</th>
                  <th className="py-3 px-4">Tầng</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4">Nhân viên phụ trách</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-xs">
                {[...dirtyRooms, ...inspectingRooms].map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#002146]">
                      <span className="px-2.5 py-1 rounded-lg bg-[#EBF3FF] text-[#0070F4] border border-[#BFDBFE]">
                        P. {room.roomNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{room.roomTypeName}</td>
                    <td className="py-3.5 px-4 text-slate-500">{room.floor || 'Tầng 1'}</td>
                    <td className="py-3.5 px-4 text-center">
                      {room.status === 'DIRTY' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                          Cần dọn dẹp
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                          Chờ duyệt sạch
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {room.assignedHousekeeperName || <span className="text-slate-400 italic">Chưa phân công</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate('/manage/housekeeping')}
                        className="px-3 py-1 bg-[#0070F4] hover:bg-[#0060DC] text-white rounded-lg font-bold text-xs cursor-pointer transition-colors"
                      >
                        Xử lý
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// VIEW 4: KẾ TOÁN (VT-04: ACCOUNTANT)
// ==========================================
const AccountantDashboardView: React.FC<{
  dashboard: DashboardStatsResponse | null;
  dailyLedger: DailyLedgerResponse | null;
  recentShifts: CashierShiftResponse[];
}> = ({ dashboard, dailyLedger, recentShifts }) => {
  const navigate = useNavigate();

  const realCollectionPercent = useMemo(() => {
    if (!dashboard || !dashboard.monthRevenue || dashboard.monthRevenue === 0) return 0;
    return Math.min(100, Math.round(((dashboard.monthCollectedRevenue || 0) / dashboard.monthRevenue) * 100));
  }, [dashboard]);

  // Đếm ca có chênh lệch tiền mặt
  const discrepancyShiftsCount = useMemo(() => {
    return recentShifts.filter(s => s.discrepancy && Math.abs(s.discrepancy) > 0).length;
  }, [recentShifts]);

  return (
    <div className="space-y-6">
      {/* Cảnh báo ca thu ngân có chênh lệch tiền mặt */}
      {discrepancyShiftsCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-[#FEF2F2] to-[#FFF1F2] border border-[#FECACA] rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#DC2626] text-white rounded-xl shadow-xs shrink-0 animate-pulse">
              <IoAlertCircleOutline size={22} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#991B1B]">
                Phát hiện {discrepancyShiftsCount} ca thu ngân có chênh lệch tiền mặt!
              </h4>
              <p className="text-xs text-[#B91C1C] mt-0.5">
                Kế toán cần đối soát lại phiếu chốt ca và số tiền thực nộp vào két quỹ.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/manage/cashier-shifts')}
            className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <span>Đối soát ca ngay</span>
            <IoArrowForwardOutline size={14} />
          </button>
        </div>
      )}

      {/* Lối tắt tác vụ Kế toán */}
      <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <IoFlashOutline size={16} className="text-primary" />
            <span>Tác Vụ Tài Chính & Kiểm Soát Dòng Tiền</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/manage/cashier-shifts')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0070F4] hover:bg-[#0060DC] text-xs font-bold text-white transition-all cursor-pointer shadow-2xs"
            >
              <IoCashOutline size={15} />
              <span>Đối Soát Ca Thu Ngân</span>
            </button>
            <button
              onClick={() => navigate('/manage/daily-ledger')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoDocumentTextOutline size={15} className="text-[#00B63E]" />
              <span>Sổ Quỹ Ngày</span>
            </button>
            <button
              onClick={() => navigate('/manage/corporate-clients')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoPeopleOutline size={15} className="text-primary" />
              <span>Khách Công Ty & Công Nợ</span>
            </button>
            <button
              onClick={() => navigate('/manage/reports')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoBarChartOutline size={15} className="text-primary" />
              <span>Báo Cáo Doanh Thu</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Thẻ Chỉ Số Tài Chính & Dòng Tiền (KHÔNG có công suất phòng) */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <HeroStatCard
            title="Thực Thu Tháng Này"
            rawValue={dashboard.monthCollectedRevenue || 0}
            collectedAmount={dashboard.monthCollectedRevenue || 0}
            debtAmount={dashboard.monthDebtRevenue || 0}
            collectionPercent={realCollectionPercent}
            actionText="Báo cáo"
            onAction={() => navigate('/manage/reports?tab=revenue')}
            subText={`Tổng doanh thu phát sinh: ${fmtCurrency(dashboard.monthRevenue)}`}
          />

          <LodgifyStatCard
            icon={IoWalletOutline}
            label="Tổng Công Nợ Chờ Thu"
            rawValue={dashboard.monthDebtRevenue || 0}
            customValue={<AnimatedCounter value={dashboard.monthDebtRevenue || 0} formatter={fmtCurrency} />}
            subLabel="Tiền phòng và phụ thu chưa quyết toán"
            badgeText={dashboard.monthDebtRevenue && dashboard.monthDebtRevenue > 0 ? "Cần thu" : "Đã thu đủ"}
            badgeType={dashboard.monthDebtRevenue && dashboard.monthDebtRevenue > 0 ? "warning" : "positive"}
            iconBg="bg-[#FEF3C7]"
            iconColor="text-[#D97706]"
            onClick={() => navigate('/manage/corporate-clients')}
          />

          <LodgifyStatCard
            icon={IoCashOutline}
            label="Đối Soát Ca Thu Ngân"
            rawValue={recentShifts.length}
            valueSuffix=" ca gần nhất"
            subLabel={discrepancyShiftsCount > 0 ? `Có ${discrepancyShiftsCount} ca bị lệch tiền mặt` : "Tất cả các ca khớp tiền"}
            badgeText={discrepancyShiftsCount > 0 ? `${discrepancyShiftsCount} lệch` : "Chuẩn xác"}
            badgeType={discrepancyShiftsCount > 0 ? "danger" : "positive"}
            iconBg="bg-[#EBF3FF]"
            iconColor="text-[#0070F4]"
            onClick={() => navigate('/manage/cashier-shifts')}
          />

          <LodgifyStatCard
            icon={IoDocumentTextOutline}
            label="Trạng Thái Sổ Quỹ Ngày"
            customValue={<span className="text-xl font-bold">{dailyLedger?.status === 'CLOSED' ? 'ĐÃ KHÓA SỔ' : 'ĐANG MỞ SỔ'}</span>}
            subLabel={`Thực thu tiền mặt: ${fmtCurrency(dailyLedger?.totalActualCash || 0)}`}
            badgeText={dailyLedger?.status === 'CLOSED' ? "Đã chốt" : "Đang mở"}
            badgeType={dailyLedger?.status === 'CLOSED' ? "positive" : "neutral"}
            iconBg="bg-[#F0FDF4]"
            iconColor="text-[#16A34A]"
            onClick={() => navigate('/manage/daily-ledger')}
          />
        </div>
      )}

      {/* Tóm tắt Dòng Tiền Sổ Quỹ Hôm Nay (Tiền mặt vs Chuyển khoản vs Thẻ) */}
      {dailyLedger && (
        <div className="bg-white border border-border-grey rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-grey">
            <div className="flex items-center gap-2">
              <IoCashOutline size={20} className="text-primary" />
              <h3 className="font-bold text-base text-[#002146]">Cơ Cấu Thu Dòng Tiền Hôm Nay</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Tổng tiền thu trong ngày:{' '}
              <strong className="text-[#002146] font-extrabold text-sm">
                {fmtCurrency((dailyLedger.totalInvoiceCash || 0) + (dailyLedger.totalInvoiceTransfer || 0) + (dailyLedger.totalInvoiceCard || 0))}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
              <span className="text-xs font-bold uppercase text-[#166534] block">Tiền Mặt (Cash)</span>
              <p className="text-lg font-black text-[#15803D] mt-1">{fmtCurrency(dailyLedger.totalInvoiceCash || 0)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Tiền mặt thu tại quầy lễ tân</p>
            </div>

            <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
              <span className="text-xs font-bold uppercase text-[#1E40AF] block">Chuyển Khoản (Bank)</span>
              <p className="text-lg font-black text-[#1D4ED8] mt-1">{fmtCurrency(dailyLedger.totalInvoiceTransfer || 0)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Chuyển khoản QR / Ngân hàng</p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF5FF] border border-[#E9D5FF]">
              <span className="text-xs font-bold uppercase text-[#6B21A8] block">Thẻ Tín Dụng (POS)</span>
              <p className="text-lg font-black text-[#7E22CE] mt-1">{fmtCurrency(dailyLedger.totalInvoiceCard || 0)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Thanh toán qua máy POS quẹt thẻ</p>
            </div>
          </div>
        </div>
      )}

      {/* Danh Sách Các Ca Thu Ngân Gần Nhất */}
      <div className="bg-white border border-border-grey rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-border-grey flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[#002146]">Danh Sách Ca Thu Ngân Cần Đối Soát</h3>
            <p className="text-xs text-slate-500 mt-0.5">Các ca trực thu ngân gần nhất kèm số tiền chênh lệch thực tế</p>
          </div>
          <button
            onClick={() => navigate('/manage/cashier-shifts')}
            className="text-xs font-bold text-[#0070F4] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Xem tất cả ca</span>
            <IoArrowForwardOutline size={14} />
          </button>
        </div>

        {recentShifts.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <IoCashOutline size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-sm text-[#002146]">Chưa có dữ liệu ca trực thu ngân nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-border-grey text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Mã ca</th>
                  <th className="py-3 px-4">Thu ngân</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Tiền đầu ca</th>
                  <th className="py-3 px-4 text-right">Tiền thực thu</th>
                  <th className="py-3 px-4 text-right">Chênh lệch</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-xs">
                {recentShifts.slice(0, 5).map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#002146]">Ca #{shift.id}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{shift.openedByName}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {shift.openedAt ? new Date(shift.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">{fmtCurrency(shift.openingCash)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#002146]">{fmtCurrency(shift.actualCash)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {shift.discrepancy && Math.abs(shift.discrepancy) > 0 ? (
                        <span className="font-bold text-red-600 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-[11px]">
                          {shift.discrepancy > 0 ? `+${fmtCurrency(shift.discrepancy)}` : fmtCurrency(shift.discrepancy)}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50 text-[11px]">Khớp 100%</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        shift.status === 'OPEN' ? 'bg-[#E6F8ED] text-[#00B63E]' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {shift.status === 'OPEN' ? 'Đang mở' : 'Đã chốt'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// VIEW 5: QUẢN TRỊ VIÊN (VT-05: ADMIN)
// ==========================================
const AdminDashboardView: React.FC<{
  users: UserResponse[];
  activeSessions: UserSessionResponse[];
  pendingResetCount: number;
  recentBackups: BackupHistoryItem[];
  recentLogs: AuditLog[];
  onOpenResetModal: () => void;
}> = ({
  users,
  activeSessions,
  pendingResetCount,
  recentBackups,
  recentLogs,
  onOpenResetModal
}) => {
  const navigate = useNavigate();

  const activeUsersCount = useMemo(() => users.filter(u => u.active).length, [users]);
  const lockedUsersCount = useMemo(() => users.filter(u => !u.active).length, [users]);

  const latestBackup = recentBackups[0];

  return (
    <div className="space-y-6">
      {/* Cảnh báo cấp lại mật khẩu cho nhân sự (NCL-01-CN-005) */}
      {pendingResetCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-[#FEF9C3] via-[#FEF08A] to-[#FEF9C3] border border-[#FDE047] rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-[#854D0E] text-[#FEF08A] rounded-xl shadow-xs shrink-0 mt-0.5 animate-pulse">
              <IoKeyOutline size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-[#713F12]">
                  Có {pendingResetCount} yêu cầu cấp lại mật khẩu từ nhân viên đang chờ duyệt!
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-red-100 text-red-700 rounded-full border border-red-300 animate-pulse">
                  {pendingResetCount} mới
                </span>
              </div>
              <p className="text-xs text-[#854D0E]/90 leading-relaxed">
                Quản trị viên cần xác minh danh tính và cấp mật khẩu tạm hiệu lực 24 giờ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenResetModal}
            className="px-4 py-2 bg-[#854D0E] hover:bg-[#713F12] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <IoKeyOutline size={15} />
            <span>Xử lý ngay ({pendingResetCount})</span>
          </button>
        </div>
      )}

      {/* Lối tắt quản trị hệ thống */}
      <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <IoShieldCheckmarkOutline size={16} className="text-[#0070F4]" />
            <span>Tác Vụ An Ninh & Hạ Tầng Hệ Thống</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/manage/staff')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0070F4] hover:bg-[#0060DC] text-xs font-bold text-white transition-all cursor-pointer shadow-2xs"
            >
              <IoPeopleOutline size={15} />
              <span>Quản Lý Nhân Sự & Quyền</span>
            </button>
            <button
              onClick={() => navigate('/manage/sessions')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoKeyOutline size={15} className="text-primary" />
              <span>Theo Dõi Phiên Đăng Nhập</span>
            </button>
            <button
              onClick={() => navigate('/manage/backup')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoServerOutline size={15} className="text-[#00B63E]" />
              <span>Sao Lưu & Phục Hồi CSDL</span>
            </button>
            <button
              onClick={() => navigate('/manage/audit-logs')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoDocumentTextOutline size={15} className="text-slate-600" />
              <span>Nhật Ký Hoạt Động</span>
            </button>
            <button
              onClick={() => navigate('/manage/settings')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-all cursor-pointer border border-border-grey hover:border-primary"
            >
              <IoSettingsOutline size={15} className="text-slate-600" />
              <span>Thông Tin Cơ Sở</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Thẻ KPI An Toàn & Sức Khỏe Hệ Thống (KHÔNG hiển thị doanh thu hay hóa đơn) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <LodgifyStatCard
          icon={IoPeopleOutline}
          label="Tài Khoản Nhân Sự"
          rawValue={users.length}
          valueSuffix=" tài khoản"
          subLabel={`${activeUsersCount} đang hoạt động • ${lockedUsersCount} bị khóa`}
          badgeText="Nhân sự"
          badgeType="positive"
          iconBg="bg-[#EBF3FF]"
          iconColor="text-[#0070F4]"
          onClick={() => navigate('/manage/staff')}
        />

        <LodgifyStatCard
          icon={IoHardwareChipOutline}
          label="Phiên Đăng Nhập Hoạt Động"
          rawValue={activeSessions.length}
          valueSuffix=" phiên"
          subLabel="Đang kết nối vào hệ thống"
          badgeText="Active"
          badgeType="positive"
          iconBg="bg-[#E6F8ED]"
          iconColor="text-[#00B63E]"
          onClick={() => navigate('/manage/sessions')}
        />

        <LodgifyStatCard
          icon={IoKeyOutline}
          label="Yêu Cầu Đổi Mật Khẩu"
          rawValue={pendingResetCount}
          valueSuffix=" yêu cầu"
          subLabel={pendingResetCount > 0 ? "Cần quản trị viên duyệt mật khẩu tạm" : "Không có yêu cầu chờ"}
          badgeText={pendingResetCount > 0 ? "Cần duyệt" : "An toàn"}
          badgeType={pendingResetCount > 0 ? "danger" : "positive"}
          iconBg="bg-[#FEF3C7]"
          iconColor="text-[#D97706]"
          onClick={onOpenResetModal}
        />

        <LodgifyStatCard
          icon={IoCloudDoneOutline}
          label="Sao Lưu CSDL Gần Nhất"
          customValue={
            <span className="text-sm font-bold truncate block">
              {latestBackup ? latestBackup.createdAt?.slice(0, 10) : 'Chưa sao lưu'}
            </span>
          }
          subLabel={latestBackup ? `${latestBackup.formattedSize || 'N/A'} • ${latestBackup.status}` : 'Khuyến nghị sao lưu định kỳ'}
          badgeText={latestBackup?.status === 'SUCCESS' ? "Đã sao lưu" : "Cần kiểm tra"}
          badgeType={latestBackup?.status === 'SUCCESS' ? "positive" : "warning"}
          iconBg="bg-[#F0FDF4]"
          iconColor="text-[#16A34A]"
          onClick={() => navigate('/manage/backup')}
        />
      </div>

      {/* Bảng Giám Sát Nhật Ký Hoạt Động Gần Nhất (Audit Logs) */}
      <div className="bg-white border border-border-grey rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-border-grey flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] text-[#0070F4] flex items-center justify-center shrink-0">
              <IoDocumentTextOutline size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#002146]">Nhật Ký Hoạt Động Hệ Thống Gần Nhất</h3>
              <p className="text-xs text-slate-500 mt-0.5">Giám sát các thao tác cập nhật cấu hình và phân quyền theo thời gian thực</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/manage/audit-logs')}
            className="text-xs font-bold text-[#0070F4] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Xem toàn bộ nhật ký</span>
            <IoArrowForwardOutline size={14} />
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <IoDocumentTextOutline size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-sm text-[#002146]">Chưa có ghi nhận hoạt động nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-border-grey text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Thời gian</th>
                  <th className="py-3 px-4">Tài khoản</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Đối tượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grey text-xs">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500">
                      {log.createdAt || log.timestamp || log.actionTime ? new Date(log.createdAt || log.timestamp || log.actionTime || '').toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#002146]">{log.actorName || log.userName || log.actor || 'Hệ thống'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-slate-700">
                        {log.actorRole || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{log.action || log.description || log.message}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {log.entityName ? `${log.entityName} #${log.entityId || ''}` : (log.entity || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: DASHBOARD PAGE
// ==========================================
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { pendingCount: pendingResetCount } = usePasswordResetNotification();
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OWNER data
  const [dashboard, setDashboard] = useState<DashboardStatsResponse | null>(null);
  const [occupancyRows, setOccupancyRows] = useState<OccupancyReportRow[]>([]);
  const [revenueRows, setRevenueRows] = useState<RevenueReportRow[]>([]);
  const [channelReport, setChannelReport] = useState<ChannelReportResponse | null>(null);
  const [chartRange, setChartRange] = useState<'week' | 'month'>('week');
  const [pendingDebtCount, setPendingDebtCount] = useState(0);

  // RECEPTIONIST data
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<CashierShiftResponse | null>(null);

  // HOUSEKEEPER data
  const [rooms, setRooms] = useState<RoomResponse[]>([]);

  // ACCOUNTANT data
  const [dailyLedger, setDailyLedger] = useState<DailyLedgerResponse | null>(null);
  const [recentShifts, setRecentShifts] = useState<CashierShiftResponse[]>([]);

  // ADMIN data
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [activeSessions, setActiveSessions] = useState<UserSessionResponse[]>([]);
  const [recentBackups, setRecentBackups] = useState<BackupHistoryItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const past7Days = new Date(now);
      past7Days.setDate(now.getDate() - 6);
      const from7Str = formatLocalDate(past7Days);
      const toStr = formatLocalDate(now);
      const monthStartStr = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));

      const role = user?.role;

      if (role === 'OWNER') {
        const [dashData, occData, revData, chanData, debtsData] = await Promise.all([
          reportApi.getDashboard().catch(() => null),
          reportApi.getOccupancyReport(from7Str, toStr).catch(() => null),
          reportApi.getRevenueReport(from7Str, toStr, 'day').catch(() => null),
          reportApi.getChannelReport(monthStartStr, toStr).catch(() => null),
          debtApprovalApi.getPendingRequests().catch(() => [])
        ]);
        if (dashData) setDashboard(dashData);
        if (occData?.rows) setOccupancyRows(occData.rows);
        if (revData?.rows) setRevenueRows(revData.rows);
        if (chanData) setChannelReport(chanData);
        if (Array.isArray(debtsData)) setPendingDebtCount(debtsData.length);

      } else if (role === 'RECEPTIONIST') {
        const [dashData, todayData, shiftData] = await Promise.all([
          reportApi.getDashboard().catch(() => null),
          reportApi.getTodayCheckInOut().catch(() => []),
          cashierShiftApi.getCurrent().catch(() => null)
        ]);
        if (dashData) setDashboard(dashData);
        if (Array.isArray(todayData)) {
          setTodayEvents(todayData);
        } else if (todayData?.checkIns || todayData?.checkOuts) {
          const checkins = (todayData.checkIns || []).map((b: any) => ({ ...b, type: 'checkin' }));
          const checkouts = (todayData.checkOuts || []).map((b: any) => ({ ...b, type: 'checkout' }));
          setTodayEvents([...checkouts, ...checkins]);
        }
        if (shiftData) setCurrentShift(shiftData);

      } else if (role === 'HOUSEKEEPER') {
        const allRooms = await roomApi.getAllRooms().catch(() => []);
        if (Array.isArray(allRooms)) setRooms(allRooms);

      } else if (role === 'ACCOUNTANT') {
        const [dashData, ledgerData, shiftsData] = await Promise.all([
          reportApi.getDashboard().catch(() => null),
          dailyLedgerApi.preview().catch(() => null),
          cashierShiftApi.getHistory().catch(() => [])
        ]);
        if (dashData) setDashboard(dashData);
        if (ledgerData) setDailyLedger(ledgerData);
        if (Array.isArray(shiftsData)) setRecentShifts(shiftsData);

      } else if (role === 'ADMIN') {
        const [allUsers, sessions, backups, logs] = await Promise.all([
          userApi.getAllUsers().catch(() => []),
          userApi.getActiveSessions().catch(() => []),
          dataApi.getFullBackupHistory().catch(() => []),
          auditLogApi.getLogs({ page: 0, size: 8 }).catch(() => [])
        ]);
        if (Array.isArray(allUsers)) setUsers(allUsers);
        if (Array.isArray(sessions)) setActiveSessions(sessions);
        if (Array.isArray(backups)) setRecentBackups(backups);
        if (logs && 'content' in logs && Array.isArray(logs.content)) {
          setRecentLogs(logs.content);
        } else if (Array.isArray(logs)) {
          setRecentLogs(logs);
        }
      }

    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Không thể tải toàn bộ dữ liệu tổng quan. Vui lòng bấm Làm mới.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleChartRangeChange = async (range: 'week' | 'month') => {
    setChartRange(range);
    const now = new Date();
    const toStr = formatLocalDate(now);
    let fromStr = '';
    if (range === 'week') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      fromStr = formatLocalDate(past7);
    } else {
      fromStr = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
    }

    try {
      const [occData, revData] = await Promise.all([
        reportApi.getOccupancyReport(fromStr, toStr).catch(() => null),
        reportApi.getRevenueReport(fromStr, toStr, 'day').catch(() => null)
      ]);
      if (occData?.rows) setOccupancyRows(occData.rows);
      if (revData?.rows) setRevenueRows(revData.rows);
    } catch (e) {
      console.error('Failed to change chart range', e);
    }
  };

  const realOccupancyRate = useMemo(() => {
    if (!dashboard || !dashboard.totalRooms) return 0;
    return Math.round((dashboard.occupiedRooms / dashboard.totalRooms) * 100);
  }, [dashboard]);

  const adr = useMemo(() => {
    if (dashboard?.adr != null && dashboard.adr > 0) return dashboard.adr;
    if (!dashboard || !dashboard.monthRevenue) return 0;
    const soldNights = (dashboard.monthSoldNights && dashboard.monthSoldNights > 0) 
      ? dashboard.monthSoldNights 
      : 1;
    return Math.round(dashboard.monthRevenue / soldNights);
  }, [dashboard]);

  const revPar = useMemo(() => {
    if (dashboard?.revPar != null && dashboard.revPar > 0) return dashboard.revPar;
    if (!dashboard || !dashboard.totalRooms || adr === 0) return 0;
    const occupancyRate = (dashboard.occupiedRooms || 0) / dashboard.totalRooms;
    return Math.round(adr * occupancyRate);
  }, [dashboard, adr]);

  const realCollectionPercent = useMemo(() => {
    if (!dashboard || !dashboard.monthRevenue || dashboard.monthRevenue === 0) return 0;
    return Math.min(100, Math.round(((dashboard.monthCollectedRevenue || 0) / dashboard.monthRevenue) * 100));
  }, [dashboard]);

  const dirtyRoomsCount = useMemo(() => {
    if (!dashboard) return 0;
    return (dashboard.dirtyRooms || 0) + (dashboard.inspectingRooms || 0);
  }, [dashboard]);

  // Role Header Information
  const roleTitle = useMemo(() => {
    switch (user?.role) {
      case 'OWNER': return 'Tổng Quan Quản Trị & Điều Hành Cơ Sở';
      case 'RECEPTIONIST': return 'Bàn Lễ Tân & Vận Hành Đón Tiếp';
      case 'HOUSEKEEPER': return 'Tổng Quan Tác Vụ Buồng Phòng & Vệ Sinh';
      case 'ACCOUNTANT': return 'Tổng Quan Tài Chính & Kiểm Soát Dòng Tiền';
      case 'ADMIN': return 'Trung Tâm Giám Sát & An Toàn Hệ Thống';
      default: return 'Tổng Quan Khách Sạn';
    }
  }, [user?.role]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002146] tracking-tight">
              {roleTitle}
            </h1>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
            <IoCalendarOutline size={14} className="text-primary" />
            <span>Hôm nay: {todayStr}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-grey bg-white hover:bg-slate-50 text-xs font-bold text-[#002146] transition-colors shadow-2xs cursor-pointer"
          >
            <IoRefreshOutline size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          {user?.role && ['OWNER', 'ACCOUNTANT'].includes(user.role) && (
            <Link
              to="/manage/reports"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0070F4] hover:bg-[#0060DC] text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              <IoDownloadOutline size={15} />
              <span>Báo cáo doanh thu</span>
            </Link>
          )}
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-36 rounded-2xl bg-slate-200" />
            <div className="h-36 rounded-2xl bg-white border border-border-grey" />
            <div className="h-36 rounded-2xl bg-white border border-border-grey" />
            <div className="h-36 rounded-2xl bg-white border border-border-grey" />
          </div>
          <div className="h-72 rounded-2xl bg-white border border-border-grey" />
        </div>
      )}

      {/* RENDER VIEW THEO TỪNG VAI TRÒ CHUYÊN BIỆT */}
      {!loading && (
        <>
          {user?.role === 'OWNER' && (
            <OwnerDashboardView 
              dashboard={dashboard}
              adr={adr}
              revPar={revPar}
              realCollectionPercent={realCollectionPercent}
              realOccupancyRate={realOccupancyRate}
              dirtyRoomsCount={dirtyRoomsCount}
              occupancyRows={occupancyRows}
              revenueRows={revenueRows}
              channelReport={channelReport}
              chartRange={chartRange}
              onRangeChange={handleChartRangeChange}
              pendingDebtCount={pendingDebtCount}
              pendingResetCount={pendingResetCount}
              onOpenResetModal={() => setShowPasswordResetModal(true)}
            />
          )}

          {user?.role === 'RECEPTIONIST' && (
            <ReceptionistDashboardView 
              dashboard={dashboard}
              todayEvents={todayEvents}
              currentShift={currentShift}
            />
          )}

          {user?.role === 'HOUSEKEEPER' && (
            <HousekeeperDashboardView 
              rooms={rooms}
              onRefresh={fetchData}
            />
          )}

          {user?.role === 'ACCOUNTANT' && (
            <AccountantDashboardView 
              dashboard={dashboard}
              dailyLedger={dailyLedger}
              recentShifts={recentShifts}
            />
          )}

          {user?.role === 'ADMIN' && (
            <AdminDashboardView 
              users={users}
              activeSessions={activeSessions}
              pendingResetCount={pendingResetCount}
              recentBackups={recentBackups}
              recentLogs={recentLogs}
              onOpenResetModal={() => setShowPasswordResetModal(true)}
            />
          )}
        </>
      )}

      {/* Modal cấp lại mật khẩu tạm trực tiếp từ Dashboard */}
      <PasswordResetManagementModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
      />
    </div>
  );
};

export default DashboardPage;
