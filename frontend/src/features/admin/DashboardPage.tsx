import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import reportApi from '../../services/reportApi';
import { roomApi } from '../../services/roomApi';
import { 
  IoAlertCircleOutline, 
  IoBarChartOutline, 
  IoBrushOutline, 
  IoCalendarOutline, 
  IoCheckmarkCircleOutline, 
  IoHappyOutline, 
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
  IoChevronForwardOutline,
  IoSpeedometerOutline,
  IoBusinessOutline,
  IoCheckmarkOutline,
  IoTimeOutline,
  IoAddCircleOutline,
  IoFilterOutline
} from 'react-icons/io5';
import { formatStayDateTime } from '../../utils/formatDate';
import usePasswordResetNotification from '../../hooks/usePasswordResetNotification';
import PasswordResetManagementModal from './PasswordResetManagementModal';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import { 
  DashboardStatsResponse, 
  OccupancyReportRow, 
  RevenueReportRow, 
  ChannelReportResponse 
} from '../../types';

// Lodgify Pill Badge Styles
const getStatusBadge = (status?: string) => {
  switch(status) {
    case 'NEW': 
      return <span className="px-2.5 py-0.5 bg-[#FEF9C3] text-[#854D0E] rounded-full font-bold text-xs border border-[#FEF08A]">Mới</span>;
    case 'CONFIRMED': 
      return <span className="px-2.5 py-0.5 bg-[#E0F2FE] text-[#0369A1] rounded-full font-bold text-xs border border-[#BAE6FD]">Đã xác nhận</span>;
    case 'CHECKED_IN': 
      return <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] rounded-full font-bold text-xs border border-[#BFDBFE]">Đang ở</span>;
    case 'CHECKED_OUT': 
      return <span className="px-2.5 py-0.5 bg-[#F4F6F0] text-[#606D56] rounded-full font-semibold text-xs border border-border-grey">Đã trả phòng</span>;
    case 'CANCELLED': 
      return <span className="px-2.5 py-0.5 bg-[#FEF2F2] text-[#DC2626] rounded-full font-semibold text-xs border border-[#FECACA]">Đã hủy</span>;
    case 'NO_SHOW': 
      return <span className="px-2.5 py-0.5 bg-[#FFFBEB] text-[#D97706] rounded-full font-semibold text-xs border border-[#FDE68A]">Không đến</span>;
    default: 
      return <span className="px-2.5 py-0.5 bg-[#F4F6F0] text-[#606D56] rounded-full font-semibold text-xs border border-border-grey">{status}</span>;
  }
};

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

/** Lodgify Hero Stat Card (Lime Gradient & Dark Text) with Animated Counter */
const HeroStatCard: React.FC<{
  title: string;
  rawValue: number;
  collectedAmount?: number;
  debtAmount?: number;
  collectionPercent?: number;
  actionText?: string;
  onAction?: () => void;
}> = ({ title, rawValue, collectedAmount = 0, debtAmount = 0, collectionPercent = 0, actionText, onAction }) => (
  <div 
    onClick={onAction}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8FAA0] via-[#DDF672] to-[#D2F346] border border-[#C5EB34] p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 cursor-pointer group h-full"
  >
    <div>
      {/* Top Header: Title & Pill Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16220E]/80 animate-pulse shrink-0" />
          <p className="text-xs font-bold uppercase text-[#16220E]/80 truncate">{title}</p>
        </div>
        <div className="inline-flex items-center gap-1 bg-[#16220E] text-[#D4F63D] px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xs shrink-0 whitespace-nowrap">
          <IoArrowUpOutline size={12} className="shrink-0" />
          <span>
            {rawValue > 0 ? (
              <AnimatedCounter value={collectionPercent} suffix="% Đã thu" />
            ) : (
              '0% Đã thu'
            )}
          </span>
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#16220E] tracking-tight leading-none truncate" title={fmtCurrency(rawValue)}>
          <AnimatedCounter value={rawValue} formatter={fmtCurrency} />
        </h3>
      </div>
    </div>

    {/* Bottom Footer: Collected & Debt + Action Button */}
    <div className="mt-4 pt-3 border-t border-[#16220E]/15 flex items-center justify-between gap-2 text-xs text-[#16220E]/90">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16220E] shrink-0" />
          <span className="truncate text-[#16220E]/90">
            Đã thu: <strong className="font-bold text-[#16220E]"><AnimatedCounter value={collectedAmount} formatter={fmtCurrency} /></strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16220E]/40 shrink-0" />
          <span className="truncate text-[#16220E]/90">
            Công nợ: <strong className="font-bold text-[#16220E]"><AnimatedCounter value={debtAmount} formatter={fmtCurrency} /></strong>
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16220E] hover:underline cursor-pointer group text-right shrink-0"
          title="Mở Báo cáo doanh thu & Chi tiết tài chính"
        >
          <span className="leading-tight">
            Chi tiết tài<br />chính
          </span>
          <IoArrowForwardOutline size={14} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      )}
    </div>
  </div>
);

/** Lodgify Standard Clean Card with Animated Counter */
const LodgifyStatCard: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  rawValue?: number;
  valueSuffix?: string;
  customValue?: React.ReactNode;
  subLabel?: string;
  badgeText?: string;
  badgeType?: 'positive' | 'neutral' | 'warning';
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
  iconBg = 'bg-[#EBF1E5]',
  iconColor = 'text-[#485732]',
  progressPercent,
  progressBarColor = 'bg-[#D4F63D]',
  onClick
}) => (
  <div
    onClick={onClick}
    className={`bg-white border border-border-grey rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:-translate-y-0.5 h-full ${
      onClick ? 'cursor-pointer hover:shadow-md hover:border-[#BEDF2E]' : 'hover:shadow-xs'
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon size={20} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#606D56]">{label}</p>
      </div>

      {badgeText && (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            badgeType === 'positive'
              ? 'bg-[#EAF5CD] text-[#3F4F24]'
              : badgeType === 'warning'
              ? 'bg-[#FEF3C7] text-[#92400E]'
              : 'bg-[#F1F5F9] text-[#475569]'
          }`}
        >
          {badgeText}
        </span>
      )}
    </div>

    <div className="mt-4">
      <div className="text-2xl font-bold text-[#1A2411] tracking-tight">
        {rawValue !== undefined ? (
          <AnimatedCounter value={rawValue} suffix={valueSuffix} />
        ) : (
          customValue
        )}
      </div>
      {subLabel && <p className="text-xs text-[#63725B] mt-1 font-medium">{subLabel}</p>}
    </div>

    {progressPercent != null && (
      <div className="mt-3">
        <div className="h-1.5 w-full bg-[#EBF0E3] rounded-full overflow-hidden">
          <div
            className={`h-full ${progressBarColor} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>
    )}
  </div>
);

/** Biểu đồ Cột Kép Lodgify Lấy Dữ Liệu Thật (Weekly Occupancy & Demand Chart) */
const WeeklyOccupancyChart: React.FC<{
  occupancyRows: OccupancyReportRow[];
  revenueRows: RevenueReportRow[];
  totalRooms: number;
  activeRange: 'week' | 'month';
  onRangeChange: (range: 'week' | 'month') => void;
  isLoading?: boolean;
  className?: string;
}> = ({
  occupancyRows,
  revenueRows,
  totalRooms,
  activeRange,
  onRangeChange,
  isLoading,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const fullDayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  // Hàm format ngày địa phương chuẩn YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Chuẩn hóa dữ liệu theo 7 ngày gần nhất hoặc các ngày trong tháng
  const chartItems = React.useMemo(() => {
    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (activeRange === 'week') {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = formatLocalDate(d);
        const dayOfWeek = d.getDay();
        const dayLabel = dayNames[dayOfWeek];
        const fullDayLabel = fullDayNames[dayOfWeek];
        const shortDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;

        const occ = occupancyRows.find(r => r.date === dateStr);
        const rev = revenueRows.find(r => r.date === dateStr || r.period === dateStr);

        const occupiedRooms = occ?.occupiedRooms ?? 0;
        const availableRooms = occ?.availableRooms ?? Math.max(0, totalRooms - occupiedRooms);
        const occupancyRate = occ?.occupancyRate ?? (totalRooms > 0 && occupiedRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0);
        const newBookings = rev?.bookings ?? 0;
        const revenue = rev?.revenue ?? 0;

        result.push({
          dateStr,
          dayLabel,
          fullDayLabel,
          shortDate,
          isToday,
          occupiedRooms,
          availableRooms,
          occupancyRate,
          newBookings,
          revenue
        });
      }
      return result;
    } else {
      // Month mode: Lấy tối đa 14 ngày gần nhất để cột cân đối, không bị chật
      const sliced = occupancyRows.length > 14 ? occupancyRows.slice(-14) : occupancyRows;
      if (sliced.length === 0) return [];

      return sliced.map(occ => {
        const d = new Date(occ.date);
        const dayOfWeek = isNaN(d.getDay()) ? 0 : d.getDay();
        const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
        const fullDayLabel = `${dayNames[dayOfWeek]}, ${d.getDate()}/${d.getMonth() + 1}`;
        const shortDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const isToday = occ.date === todayStr;
        const rev = revenueRows.find(r => r.date === occ.date || r.period === occ.date);

        const occupiedRooms = occ.occupiedRooms ?? 0;
        const availableRooms = occ.availableRooms ?? Math.max(0, totalRooms - occupiedRooms);
        const occupancyRate = occ.occupancyRate ?? (totalRooms > 0 && occupiedRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0);
        const newBookings = rev?.bookings ?? 0;
        const revenue = rev?.revenue ?? 0;

        return {
          dateStr: occ.date,
          dayLabel,
          fullDayLabel,
          shortDate,
          isToday,
          occupiedRooms,
          availableRooms,
          occupancyRate,
          newBookings,
          revenue
        };
      });
    }
  }, [occupancyRows, revenueRows, totalRooms, activeRange]);

  // Thống kê nhanh tổng quan biểu đồ
  const summary = React.useMemo(() => {
    const totalNewBookings = chartItems.reduce((acc, it) => acc + it.newBookings, 0);
    const avgOccupancyRate = chartItems.length > 0
      ? Math.round(chartItems.reduce((acc, it) => acc + it.occupancyRate, 0) / chartItems.length)
      : 0;

    let peakDay = chartItems[0];
    for (const it of chartItems) {
      if (!peakDay || it.occupiedRooms > peakDay.occupiedRooms) {
        peakDay = it;
      }
    }

    const totalRevenue = chartItems.reduce((acc, it) => acc + it.revenue, 0);

    return { totalNewBookings, avgOccupancyRate, peakDay, totalRevenue };
  }, [chartItems]);

  return (
    <div className={`bg-white border border-border-grey rounded-2xl p-5 md:p-6 shadow-2xs flex flex-col justify-between h-full ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-grey shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#EBF0E3] text-[#626F47]">
              <IoBarChartOutline size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1A2411] leading-tight">Công suất & Lượng khách</h3>
              <p className="text-xs text-[#606D56] mt-0.5">
                Số phòng lưu trú thực tế & lượng đơn đặt phòng mới phát sinh
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex p-1 bg-[#F2F6ED] rounded-xl border border-border-grey text-xs">
            <button
              onClick={() => onRangeChange('week')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeRange === 'week' ? 'bg-[#D4F63D] text-[#1A2411] shadow-2xs' : 'text-[#606D56] hover:text-[#1A2411]'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => onRangeChange('month')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeRange === 'month' ? 'bg-[#D4F63D] text-[#1A2411] shadow-2xs' : 'text-[#606D56] hover:text-[#1A2411]'
              }`}
            >
              Tháng này
            </button>
          </div>
        </div>
      </div>

      {/* Mini KPI Summary Strip */}
      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#F9FAF6] rounded-xl border border-[#E8EEE0] my-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D4F63D] border border-[#B5D625] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-[#606D56] block truncate">Tổng đặt mới</span>
            <span className="font-extrabold text-[#1A2411] text-xs sm:text-sm">
              {summary.totalNewBookings} <span className="text-[11px] font-normal text-[#606D56]">đơn</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 border-x border-[#E2E8D7] px-2 sm:px-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#626F47] shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-[#606D56] block truncate">Công suất TB</span>
            <span className="font-extrabold text-[#1A2411] text-xs sm:text-sm">
              {summary.avgOccupancyRate}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 pl-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-[#606D56] block truncate">Đông nhất</span>
            <span className="font-extrabold text-[#1A2411] text-xs sm:text-sm truncate block" title={summary.peakDay && summary.peakDay.occupiedRooms > 0 ? `${summary.peakDay.dayLabel} (${summary.peakDay.occupiedRooms} phòng)` : 'Chưa có'}>
              {summary.peakDay && summary.peakDay.occupiedRooms > 0
                ? `${summary.peakDay.dayLabel} (${summary.peakDay.occupiedRooms} ph)`
                : '0 phòng'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas with Y-Axis & Gridlines */}
      <div className="flex-1 flex flex-col justify-between min-h-[230px] relative pt-2">
        {chartItems.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#606D56] py-12">
            <IoBarChartOutline size={32} className="text-[#86967B]/40 mb-2" />
            <span>Chưa có dữ liệu công suất trong khoảng thời gian này</span>
          </div>
        ) : (
          <div className="flex items-stretch flex-1 gap-1.5 sm:gap-2 relative">
            {/* Trục Y mốc giá trị bên trái */}
            <div className="w-9 sm:w-11 flex flex-col justify-between items-end pb-8 pr-1.5 text-[10px] font-mono text-[#86967B] shrink-0 select-none">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            {/* Vùng vẽ biểu đồ */}
            <div className="flex-1 relative flex flex-col justify-between">
              {/* Background Grid Lines aligned with the bars area */}
              <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
                <div className="border-b border-dashed border-[#E2E8D5] w-full" />
                <div className="border-b border-dashed border-[#E2E8D5] w-full" />
                <div className="border-b border-dashed border-[#E2E8D5] w-full" />
                <div className="border-b border-dashed border-[#E2E8D5] w-full" />
                <div className="border-b border-[#D8DFCE] w-full" />
              </div>

              {/* Các cột dữ liệu theo ngày */}
              <div className="relative z-10 flex items-stretch justify-between gap-1 sm:gap-2 flex-1">
                {chartItems.map((item, idx) => {
                  // Tỷ lệ % cho cột phòng có khách: chuẩn theo tỷ lệ công suất 0-100%
                  const hOccupied = Math.min(100, Math.max(0, item.occupancyRate));

                  // Tỷ lệ % cho cột đặt phòng mới: scale theo trần tối thiểu 5 để không bị vọt lố
                  const maxBookingsCeil = Math.max(5, ...chartItems.map(i => i.newBookings));
                  const hBookings = Math.min(100, Math.round((item.newBookings / maxBookingsCeil) * 100));

                  const isHovered = hoveredIdx === idx;

                  // Tooltip position alignment to avoid edge overflows
                  const tooltipPosClass = idx === 0
                    ? 'left-0'
                    : idx === chartItems.length - 1
                      ? 'right-0'
                      : 'left-1/2 -translate-x-1/2';

                  return (
                    <div
                      key={idx}
                      className={`flex-1 flex flex-col items-center justify-end rounded-xl p-1 transition-all relative ${
                        isHovered ? 'bg-[#F2F6ED]/90 shadow-2xs' : 'hover:bg-[#F8FAF4]'
                      }`}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Unified Hover Tooltip Card */}
                      {isHovered && (
                        <div
                          className={`absolute bottom-full mb-3 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${tooltipPosClass}`}
                        >
                          <div className="bg-[#1A2411] text-white text-xs rounded-xl p-3 shadow-xl whitespace-nowrap border border-[#303D20] min-w-[190px]">
                            <div className="flex items-center justify-between border-b border-[#303D20] pb-1.5 mb-2">
                              <span className="font-bold text-[#E4F2CC] text-xs">
                                {item.fullDayLabel}
                              </span>
                              {item.isToday && (
                                <span className="text-[10px] bg-[#D4F63D] text-[#1A2411] px-1.5 py-0.2 rounded font-bold">
                                  Hôm nay
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[#A4B495] flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#626F47] shrink-0" />
                                  Phòng có khách:
                                </span>
                                <span className="font-bold text-white">
                                  {item.occupiedRooms} / {totalRooms} ({item.occupancyRate}%)
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[#A4B495] flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#D4F63D] shrink-0" />
                                  Đặt phòng mới:
                                </span>
                                <span className="font-bold text-[#D4F63D]">
                                  {item.newBookings} đơn
                                </span>
                              </div>
                              {item.revenue > 0 && (
                                <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#303D20]/60">
                                  <span className="text-[#A4B495]">Doanh thu:</span>
                                  <span className="font-bold text-[#F3FCE3]">
                                    {fmtCurrency(item.revenue)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Tooltip arrow */}
                          <div className="w-2.5 h-2.5 bg-[#1A2411] rotate-45 mx-auto -mt-1 border-r border-b border-[#303D20]" />
                        </div>
                      )}

                      {/* Bars Pair Container */}
                      <div className="w-full max-w-[44px] flex items-end justify-center gap-1 sm:gap-1.5 flex-1 min-h-0 pb-0.5">
                        {/* Cột 1: Lime Accent (Lượt đặt mới) */}
                        <div className="w-1/2 flex flex-col items-center justify-end h-full">
                          {item.newBookings > 0 && (
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#5B6E14] mb-0.5 leading-none transition-transform">
                              +{item.newBookings}
                            </span>
                          )}
                          <div
                            className="w-full bg-[#D4F63D] hover:bg-[#C2E232] rounded-t-md transition-all duration-300 relative min-h-[2px]"
                            style={{
                              height: item.newBookings > 0 ? `${Math.max(8, hBookings)}%` : '0%'
                            }}
                          />
                        </div>

                        {/* Cột 2: Deep Olive (Phòng đang có khách) */}
                        <div className="w-1/2 flex flex-col items-center justify-end h-full">
                          {item.occupiedRooms > 0 && (
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#38421F] mb-0.5 leading-none transition-transform">
                              {item.occupiedRooms}
                            </span>
                          )}
                          <div
                            className="w-full bg-[#626F47] hover:bg-[#525E3B] rounded-t-md transition-all duration-300 relative min-h-[2px]"
                            style={{
                              height: item.occupiedRooms > 0 ? `${Math.max(8, hOccupied)}%` : '0%'
                            }}
                          />
                        </div>
                      </div>

                      {/* Day & Date Labels */}
                      <div className="h-8 flex flex-col items-center justify-center shrink-0 pt-1">
                        <span className={`text-[11px] font-bold leading-tight ${
                          item.isToday
                            ? 'text-emerald-700 bg-emerald-100/70 px-1 rounded'
                            : isHovered
                              ? 'text-[#1A2411]'
                              : 'text-[#606D56]'
                        }`}>
                          {item.dayLabel}
                        </span>
                        <span className="text-[9px] text-[#86967B] font-medium leading-none mt-0.5">
                          {item.shortDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-border-grey flex items-center justify-center gap-6 text-xs text-[#606D56] font-medium shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#D4F63D] border border-[#BBDC28]" />
          <span>Lượt đặt mới (Đơn)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#626F47]" />
          <span>Phòng có khách (Công suất %)</span>
        </div>
      </div>
    </div>
  );
};

/** Biểu đồ Tròn Phân Bổ Nguồn Đặt Lấy Dữ Liệu Thật (Channel Breakdown Donut) */
const BookingSourceDonut: React.FC<{
  channelReport: ChannelReportResponse | null;
  overallOccupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  isLoading?: boolean;
  className?: string;
}> = ({
  channelReport,
  overallOccupancyRate,
  totalRooms,
  occupiedRooms,
  isLoading,
  className = ''
}) => {
  const totalBookings = channelReport?.summary?.totalBookings ?? 0;
  const rows = channelReport?.rows || [];

  // Bảng màu Lodgify đặc trưng cho các kênh
  const channelColors = ['#D4F63D', '#626F47', '#A4B465', '#F5ECD5', '#BEDF2E', '#93C5FD'];

  // Tính tỷ lệ phần trăm theo bookingShare hoặc tính từ totalBookings
  const channelSlices = React.useMemo(() => {
    if (!rows || rows.length === 0 || totalBookings === 0) {
      return [];
    }
    return rows.map((r, i) => {
      const share = r.bookingShare > 0 ? r.bookingShare : Math.round((r.totalBookings / totalBookings) * 100);
      return {
        label: r.channelName || r.channelKey,
        percent: share,
        count: `${r.totalBookings} đơn`,
        color: channelColors[i % channelColors.length]
      };
    });
  }, [rows, totalBookings]);

  // Tính toán stroke offset cho SVG donut ring
  const circumference = 2 * Math.PI * 38; // ~238.76

  return (
    <div className={`bg-white border border-border-grey rounded-2xl p-5 md:p-6 shadow-2xs flex flex-col justify-between overflow-hidden h-full ${className}`}>
      <div className="flex items-center justify-between pb-4 border-b border-border-grey shrink-0">
        <div className="flex items-center gap-2">
          <IoPieChartOutline size={18} className="text-[#626F47]" />
          <h3 className="font-bold text-base text-[#1A2411]">Phân bổ Nguồn Đặt</h3>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F2F6ED] text-[#4F5E37] border border-border-grey">
          {totalBookings} Đơn
        </span>
      </div>

      {/* Donut Graphic */}
      <div className="my-auto py-3 flex flex-col sm:flex-row lg:flex-col 2xl:flex-row items-center justify-around gap-4 min-w-0 flex-1">
        {/* SVG Donut */}
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Base Ring */}
            <circle cx="50" cy="50" r="38" fill="transparent" stroke="#EBF0E3" strokeWidth="14" />
            
            {channelSlices.length > 0 && (() => {
              let cumulativePercent = 0;
              return channelSlices.map((slice, i) => {
                const strokeDash = (slice.percent / 100) * circumference;
                const strokeGap = circumference - strokeDash;
                const strokeOffset = -((cumulativePercent / 100) * circumference);
                cumulativePercent += slice.percent;

                return (
                  <circle
                    key={i}
                    cx="50" cy="50" r="38"
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="14"
                    strokeDasharray={`${strokeDash} ${strokeGap}`}
                    strokeDashoffset={strokeOffset}
                    className="transition-all duration-500"
                  />
                );
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl sm:text-2xl font-black text-[#1A2411] leading-none">{overallOccupancyRate}%</span>
            <span className="text-[10px] uppercase font-bold text-[#606D56] mt-0.5">Lấp đầy</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="space-y-2 text-xs w-full min-w-0">
          {channelSlices.length === 0 ? (
            <div className="text-center py-4 text-[#606D56]">
              <p className="font-medium text-xs">Chưa có lượt đặt phòng nào theo kênh trong kỳ này</p>
              <p className="text-[11px] text-[#86967B] mt-1">Đang có {occupiedRooms}/{totalRooms} phòng có khách</p>
            </div>
          ) : (
            channelSlices.map((src, i) => (
              <div key={i} className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: src.color }} />
                  <span className="text-[#606D56] truncate font-medium" title={`${src.label}: ${src.count}`}>
                    {src.label}
                  </span>
                </div>
                <span className="font-bold text-[#1A2411] shrink-0 tabular-nums">{src.percent}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-border-grey flex items-center justify-between text-xs text-[#606D56] shrink-0">
        <span>Hiện tại: {occupiedRooms} / {totalRooms} phòng có khách</span>
        <span className="font-bold text-[#4F5E37]">{overallOccupancyRate}% công suất</span>
      </div>
    </div>
  );
};

/** Hotel Quick Operations Bar */
const QuickActionBar: React.FC<{ userRole?: string }> = ({ userRole }) => {
  const navigate = useNavigate();
  const canBooking = userRole ? ['OWNER', 'ADMIN', 'RECEPTIONIST'].includes(userRole) : false;
  const canChannels = userRole ? ['OWNER', 'ADMIN'].includes(userRole) : false;
  const canHousekeeping = userRole ? ['OWNER', 'ADMIN', 'RECEPTIONIST'].includes(userRole) : false;
  const canPriceSuggestions = userRole ? ['OWNER', 'ADMIN'].includes(userRole) : false;
  const canReports = userRole ? ['OWNER', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(userRole) : false;

  return (
    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-[#606D56] uppercase tracking-wider">
          <IoFlashOutline size={16} className="text-primary" />
          <span>Tác Vụ Nhanh</span>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {canBooking && (
            <button
              onClick={() => navigate('/manage/bookings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F6ED] hover:bg-[#E5EFE0] text-xs font-bold text-[#1A2411] transition-all cursor-pointer border border-border-grey hover:border-[#CCD8C2]"
            >
              <IoAddCircleOutline size={15} className="text-primary" />
              <span>Tạo Đặt Phòng</span>
            </button>
          )}
          {canChannels && (
            <button
              onClick={() => navigate('/manage/channels')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F6ED] hover:bg-[#E5EFE0] text-xs font-bold text-[#1A2411] transition-all cursor-pointer border border-border-grey hover:border-[#CCD8C2]"
            >
              <IoCalendarOutline size={15} className="text-primary" />
              <span>Kiểm Tra Kênh OTA</span>
            </button>
          )}
          {canHousekeeping && (
            <button
              onClick={() => navigate('/manage/housekeeping')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F6ED] hover:bg-[#E5EFE0] text-xs font-bold text-[#1A2411] transition-all cursor-pointer border border-border-grey hover:border-[#CCD8C2]"
            >
              <IoBrushOutline size={15} className="text-[#B45309]" />
              <span>Xử Lý Buồng Phòng</span>
            </button>
          )}
          {canPriceSuggestions && (
            <button
              onClick={() => navigate('/manage/price-suggestions')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F6ED] hover:bg-[#E5EFE0] text-xs font-bold text-[#1A2411] transition-all cursor-pointer border border-border-grey hover:border-[#CCD8C2]"
            >
              <IoTrendingUpOutline size={15} className="text-primary" />
              <span>Gợi Ý Điều Chỉnh Giá</span>
            </button>
          )}
          {canReports && (
            <button
              onClick={() => navigate('/manage/reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D4F63D] hover:bg-[#C2E232] text-xs font-bold text-[#1A2411] transition-all cursor-pointer shadow-2xs"
            >
              <IoBarChartOutline size={15} />
              <span>Báo Cáo Toàn Diện</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Hotel Room Inventory Spectrum Bar */
const RoomStatusSpectrum: React.FC<{
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  dirtyRooms: number;
  inspectingRooms?: number;
  maintenanceRooms: number;
}> = ({
  totalRooms,
  availableRooms,
  occupiedRooms,
  dirtyRooms,
  inspectingRooms = 0,
  maintenanceRooms
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
          <h3 className="font-bold text-sm sm:text-base text-[#1A2411]">
            Phổ Trạng Thái Buồng Phòng Khách Sạn
          </h3>
        </div>
        <div className="text-xs font-bold text-[#606D56]">
          Tổng quy mô:{' '}
          <strong className="text-[#1A2411] font-extrabold text-sm">
            <AnimatedCounter value={totalRooms} suffix=" phòng" />
          </strong>
        </div>
      </div>

      {/* Multi-segment spectrum bar */}
      <div className="mt-4">
        <div className="h-4 w-full bg-[#EBF0E3] rounded-full overflow-hidden flex gap-0.5 p-0.5 shadow-inner">
          {occupiedRooms > 0 && (
            <div
              style={{ flex: occupiedRooms }}
              title={`Đang có khách: ${occupiedRooms} phòng (${pctOccupied}%)`}
              className="h-full bg-[#626F47] rounded-l-full transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
          {availableRooms > 0 && (
            <div
              style={{ flex: availableRooms }}
              title={`Sẵn sàng: ${availableRooms} phòng (${pctAvailable}%)`}
              className="h-full bg-[#D4F63D] transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
          {housekeepingRooms > 0 && (
            <div
              style={{ flex: housekeepingRooms }}
              title={`Chờ buồng phòng: ${housekeepingRooms} phòng (${pctDirty}%)${inspectingRooms > 0 ? ` (${dirtyRooms} cần dọn, ${inspectingRooms} chờ duyệt)` : ''}`}
              className="h-full bg-[#F59E0B] transition-all duration-700 hover:brightness-110 cursor-pointer"
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

      {/* Segment Legend */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border-grey text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#626F47] shrink-0" />
          <div className="truncate">
            <span className="text-[#606D56] block text-[11px]">Đang ở:</span>
            <strong className="text-[#1A2411]">
              <AnimatedCounter value={occupiedRooms} /> ({pctOccupied}%)
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#D4F63D] shrink-0 border border-[#C2E232]" />
          <div className="truncate">
            <span className="text-[#606D56] block text-[11px]">Sẵn sàng đón:</span>
            <strong className="text-[#1A2411]">
              <AnimatedCounter value={availableRooms} /> ({pctAvailable}%)
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#F59E0B] shrink-0" />
          <div className="truncate">
            <span className="text-[#606D56] block text-[11px]">Cần dọn dẹp:</span>
            <strong className="text-[#1A2411]">
              <AnimatedCounter value={housekeepingRooms} /> ({pctDirty}%)
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#94A3B8] shrink-0" />
          <div className="truncate">
            <span className="text-[#606D56] block text-[11px]">Đang bảo trì:</span>
            <strong className="text-[#1A2411]">
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
      <div className="w-10 h-10 rounded-xl bg-[#EAF5CD] text-[#3F4F24] flex items-center justify-center shrink-0">
        <IoBusinessOutline size={20} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase text-[#606D56] block truncate">
            Giá Phòng Trung Bình
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EAF5CD] text-[#3F4F24] border border-[#D5EBA3]">ADR</span>
        </div>
        <div className="text-base sm:text-lg font-extrabold text-[#1A2411] truncate mt-0.5">
          <AnimatedCounter value={adr} formatter={fmtCurrency} />
        </div>
        <p className="text-[11px] text-[#606D56] truncate mt-0.5">
          {soldNights > 0 ? `${soldNights} đêm phòng đã bán` : 'Chưa có đêm bán'}
        </p>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#E6F0FA] text-[#1E40AF] flex items-center justify-center shrink-0">
        <IoTrendingUpOutline size={20} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase text-[#606D56] block truncate">
            Doanh Thu Trên Phòng
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#E6F0FA] text-[#1E40AF] border border-[#BFDBFE]">RevPAR</span>
        </div>
        <div className="text-base sm:text-lg font-extrabold text-[#1A2411] truncate mt-0.5">
          <AnimatedCounter value={revPar} formatter={fmtCurrency} />
        </div>
        <p className="text-[11px] text-[#606D56] truncate mt-0.5">
          {occupancyRate > 0 ? `${occupancyRate}% công suất hiện tại` : 'Công suất 0%'}
        </p>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] text-[#854D0E] flex items-center justify-center shrink-0">
        <IoWalletOutline size={20} />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase text-[#606D56] block truncate">
          Tỷ Lệ Thu Tiền
        </span>
        <div className="text-base sm:text-lg font-extrabold text-[#1A2411] truncate mt-0.5">
          <AnimatedCounter value={collectionRate} suffix="%" />
        </div>
        <p className="text-[11px] text-[#606D56] truncate mt-0.5">
          {collectionRate >= 90 ? 'Thu hồi tốt' : (collectionRate === 0 ? 'Chưa phát sinh' : 'Cần đối soát')}
        </p>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#F2F6ED] text-[#4F5E37] flex items-center justify-center shrink-0">
        <IoCalendarOutline size={20} />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase text-[#606D56] block truncate">
          Đặt Mới Hôm Nay
        </span>
        <div className="text-base sm:text-lg font-extrabold text-[#1A2411] truncate mt-0.5">
          <AnimatedCounter value={todayBookings} suffix=" đơn" />
        </div>
        <p className="text-[11px] text-[#606D56] truncate mt-0.5">
          {todayBookings > 0 ? 'Có phát sinh trong ngày' : 'Chưa có đặt mới'}
        </p>
      </div>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pendingCount: pendingResetCount } = usePasswordResetNotification();
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardStatsResponse | null>(null);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [dirtyRoomsCount, setDirtyRoomsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dữ liệu báo cáo thật cho biểu đồ cột và donut
  const [chartRange, setChartRange] = useState<'week' | 'month'>('week');
  const [occupancyRows, setOccupancyRows] = useState<OccupancyReportRow[]>([]);
  const [revenueRows, setRevenueRows] = useState<RevenueReportRow[]>([]);
  const [channelReport, setChannelReport] = useState<ChannelReportResponse | null>(null);

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const canSeeToday = isOwnerOrAdmin || user?.role === 'RECEPTIONIST';

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const past7Days = new Date(now);
      past7Days.setDate(now.getDate() - 6);
      const from7Str = past7Days.toISOString().split('T')[0];
      const toStr = now.toISOString().split('T')[0];

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // Gọi đồng thời tất cả các endpoint thật
      const [
        dashData, 
        todayData, 
        dirtyRoomsData,
        occData,
        revData,
        chanData
      ] = await Promise.all([
        isOwnerOrAdmin ? reportApi.getDashboard().catch(() => null) : Promise.resolve(null),
        canSeeToday ? reportApi.getTodayCheckInOut().catch(() => []) : Promise.resolve([]),
        user?.role === 'HOUSEKEEPER' ? roomApi.getAllRooms('DIRTY').catch(() => []) : Promise.resolve(null),
        isOwnerOrAdmin ? reportApi.getOccupancyReport(from7Str, toStr).catch(() => null) : Promise.resolve(null),
        isOwnerOrAdmin ? reportApi.getRevenueReport(from7Str, toStr, 'day').catch(() => null) : Promise.resolve(null),
        isOwnerOrAdmin ? reportApi.getChannelReport(monthStartStr, toStr).catch(() => null) : Promise.resolve(null)
      ]);
      
      // Gán dữ liệu tổng quan thật từ backend
      if (dashData) {
        setDashboard(dashData);
      } else {
        // Nếu API dashboard không trả về dữ liệu (vd: token hết hạn hoặc chưa có số liệu)
        setDashboard({
          totalRooms: 0,
          availableRooms: 0,
          occupiedRooms: 0,
          dirtyRooms: 0,
          inspectingRooms: 0,
          maintenanceRooms: 0,
          todayCheckIns: 0,
          todayCheckOuts: 0,
          todayBookings: 0,
          monthRevenue: 0,
          monthCollectedRevenue: 0,
          monthDebtRevenue: 0
        });
      }

      // Gán số phòng buồng phòng thật
      if (user?.role === 'HOUSEKEEPER') {
        setDirtyRoomsCount(Array.isArray(dirtyRoomsData) ? dirtyRoomsData.length : 0);
      } else if (dashData) {
        const totalHk = (dashData.dirtyRooms || 0) + (dashData.inspectingRooms || 0);
        setDirtyRoomsCount(totalHk);
      }

      // Gán danh sách sự kiện hôm nay thật từ backend
      if (Array.isArray(todayData)) {
        setTodayEvents(todayData);
      } else if (todayData?.checkIns || todayData?.checkOuts) {
        const checkins = (todayData.checkIns || []).map((b: any) => ({ ...b, type: 'checkin' }));
        const checkouts = (todayData.checkOuts || []).map((b: any) => ({ ...b, type: 'checkout' }));
        setTodayEvents([...checkouts, ...checkins]);
      } else {
        setTodayEvents([]);
      }

      // Gán dữ liệu biểu đồ cột thật
      if (occData?.rows) {
        setOccupancyRows(occData.rows);
      } else {
        setOccupancyRows([]);
      }

      if (revData?.rows) {
        setRevenueRows(revData.rows);
      } else {
        setRevenueRows([]);
      }

      // Gán dữ liệu phân bổ kênh thật
      if (chanData) {
        setChannelReport(chanData);
      } else {
        setChannelReport(null);
      }

    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Không thể tải dữ liệu bảng điều khiển. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [user]);

  // Xử lý đổi range cho biểu đồ cột giữa 7 ngày qua và tháng này
  const handleChartRangeChange = async (range: 'week' | 'month') => {
    setChartRange(range);
    const now = new Date();
    const toStr = now.toISOString().split('T')[0];
    let fromStr = '';

    if (range === 'week') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      fromStr = past7.toISOString().split('T')[0];
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      fromStr = monthStart.toISOString().split('T')[0];
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

  // Tính tỷ lệ lấp đầy thật từ số liệu phòng
  const realOccupancyRate = React.useMemo(() => {
    if (!dashboard || !dashboard.totalRooms) return 0;
    return Math.round((dashboard.occupiedRooms / dashboard.totalRooms) * 100);
  }, [dashboard]);

  // Tính ADR (Average Daily Rate): lấy từ backend hoặc tính chuẩn từ số đêm thực bán trong tháng
  const adr = useMemo(() => {
    if (dashboard?.adr != null && dashboard.adr > 0) return dashboard.adr;
    if (!dashboard || !dashboard.monthRevenue) return 0;
    const soldNights = (dashboard.monthSoldNights && dashboard.monthSoldNights > 0) 
      ? dashboard.monthSoldNights 
      : 1;
    return Math.round(dashboard.monthRevenue / soldNights);
  }, [dashboard]);

  // Tính RevPAR (Revenue Per Available Room) chuẩn ngành: ADR × Tỷ lệ công suất (Occupancy Rate) hiện tại
  const revPar = useMemo(() => {
    if (dashboard?.revPar != null && dashboard.revPar > 0) return dashboard.revPar;
    if (!dashboard || !dashboard.totalRooms || adr === 0) return 0;
    const occupancyRate = (dashboard.occupiedRooms || 0) / dashboard.totalRooms;
    return Math.round(adr * occupancyRate);
  }, [dashboard, adr]);

  // Tính tỷ lệ thu hồi doanh thu thật
  const realCollectionPercent = useMemo(() => {
    if (!dashboard || !dashboard.monthRevenue || dashboard.monthRevenue === 0) {
      return 0;
    }
    return Math.min(100, Math.round(((dashboard.monthCollectedRevenue || 0) / dashboard.monthRevenue) * 100));
  }, [dashboard]);

  // Bộ lọc sự kiện hôm nay (Check-in / Check-out)
  const [todayFilter, setTodayFilter] = useState<'ALL' | 'CHECKIN' | 'CHECKOUT'>('ALL');
  const [todaySearch, setTodaySearch] = useState<string>('');

  const checkInsCount = useMemo(() => todayEvents.filter(e => e.type === 'checkin').length, [todayEvents]);
  const checkOutsCount = useMemo(() => todayEvents.filter(e => e.type === 'checkout').length, [todayEvents]);

  const filteredTodayEvents = useMemo(() => {
    return todayEvents.filter(ev => {
      if (todayFilter === 'CHECKIN' && ev.type !== 'checkin') return false;
      if (todayFilter === 'CHECKOUT' && ev.type !== 'checkout') return false;
      if (!todaySearch.trim()) return true;
      const query = todaySearch.toLowerCase();
      const guest = (ev.guestName || '').toLowerCase();
      const phone = (ev.guestPhone || '').toLowerCase();
      const room = (ev.roomNumber || '').toString().toLowerCase();
      return guest.includes(query) || phone.includes(query) || room.includes(query);
    });
  }, [todayEvents, todayFilter, todaySearch]);

  // Shimmer Skeleton Loading
  const DashboardSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="h-36 rounded-2xl bg-[#EAF0DE] md:col-span-1" />
        <div className="h-36 rounded-2xl bg-white border border-border-grey" />
        <div className="h-36 rounded-2xl bg-white border border-border-grey" />
        <div className="h-36 rounded-2xl bg-white border border-border-grey" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="h-72 rounded-2xl bg-white border border-border-grey lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-white border border-border-grey" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Lodgify Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#1A2411] tracking-tight">
              Tổng quan Khách sạn
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D4F63D] text-[#1A2411] border border-[#C2E232]">
              Trực tiếp
            </span>
          </div>
          <p className="text-xs text-[#606D56] flex items-center gap-1.5 mt-1 font-medium">
            <IoCalendarOutline size={14} className="text-[#626F47]" />
            <span>Hôm nay: {today}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-grey bg-white hover:bg-[#F2F6EC] text-xs font-bold text-[#1A2411] transition-colors shadow-2xs cursor-pointer"
          >
            <IoRefreshOutline size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới dữ liệu</span>
          </button>

          {user?.role && ['OWNER', 'ACCOUNTANT', 'ADMIN', 'RECEPTIONIST'].includes(user.role) && (
            <Link
              to="/manage/reports"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4F63D] hover:bg-[#C2E232] text-xs font-bold text-[#1A2411] shadow-xs transition-all cursor-pointer"
            >
              <IoDownloadOutline size={15} />
              <span>Báo cáo doanh thu</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Thông báo yêu cầu cấp lại mật khẩu (NCL-01-CN-005) ── */}
      {isOwnerOrAdmin && pendingResetCount > 0 && (
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
            onClick={() => setShowPasswordResetModal(true)}
            className="px-4 py-2 bg-[#854D0E] hover:bg-[#713F12] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <IoKeyOutline size={15} />
            <span>Xử lý ngay ({pendingResetCount})</span>
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-error text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && <DashboardSkeleton />}

      {/* ── Lodgify Stats Cards Grid — OWNER / ADMIN ── */}
      {!loading && isOwnerOrAdmin && dashboard && (
        <div className="space-y-6 sm:space-y-7">
          {/* Quick Action Navigation Bar */}
          <QuickActionBar userRole={user?.role} />

          {/* Top Row: Hero Stat Card + 3 Secondary Metric Cards (Real Data + Animated Counter) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {/* Card 1: Hero Card (Lime Gradient) */}
            <div className="md:col-span-2 lg:col-span-1 flex flex-col">
              <HeroStatCard
                title="Doanh thu Tháng"
                rawValue={dashboard.monthRevenue || 0}
                collectedAmount={dashboard.monthCollectedRevenue || 0}
                debtAmount={dashboard.monthDebtRevenue || 0}
                collectionPercent={realCollectionPercent}
                actionText="Chi tiết tài chính"
                onAction={() => navigate('/manage/reports?tab=revenue')}
              />
            </div>

            {/* Card 2: Phòng trống */}
            <LodgifyStatCard
              icon={IoBedOutline}
              label="Phòng Trống Khả Dụng"
              customValue={
                <span className="flex items-baseline gap-1">
                  <AnimatedCounter value={dashboard.availableRooms || 0} />
                  <span className="text-sm font-normal text-[#606D56]">/ {dashboard.totalRooms || 0}</span>
                </span>
              }
              subLabel={`${dashboard.totalRooms ? Math.round(((dashboard.availableRooms || 0) / dashboard.totalRooms) * 100) : 0}% phòng sẵn sàng đón khách`}
              badgeText="Khả dụng"
              badgeType="positive"
              iconBg="bg-[#EAF5CD]"
              iconColor="text-[#3F4F24]"
              progressPercent={dashboard.totalRooms ? ((dashboard.availableRooms || 0) / dashboard.totalRooms) * 100 : 0}
              progressBarColor="bg-[#A4B465]"
              onClick={() => navigate('/manage/rooms')}
            />

            {/* Card 3: Đang có khách */}
            <LodgifyStatCard
              icon={IoPeopleOutline}
              label="Khách Đang Lưu Trú"
              rawValue={dashboard.occupiedRooms || 0}
              valueSuffix=" phòng"
              subLabel={`+${dashboard.todayCheckIns || 0} lượt nhận hôm nay`}
              badgeText={`${realOccupancyRate}% Công suất`}
              badgeType="positive"
              iconBg="bg-[#E6F0FA]"
              iconColor="text-[#1E40AF]"
              progressPercent={realOccupancyRate}
              progressBarColor="bg-[#626F47]"
              onClick={() => navigate('/manage/in-house-guests')}
            />

            {/* Card 4: Chờ dọn dẹp */}
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
              iconBg="bg-[#FEF3C7]"
              iconColor="text-[#B45309]"
              progressPercent={dashboard.totalRooms ? (dirtyRoomsCount / dashboard.totalRooms) * 100 : 0}
              progressBarColor="bg-[#F59E0B]"
              onClick={() => navigate('/manage/housekeeping')}
            />
          </div>

          {/* Hotel KPI Ticker: Giá phòng TB, Doanh thu/phòng, Tỷ lệ thu tiền, Đặt mới */}
          <HotelKpiTicker 
            adr={adr}
            revPar={revPar}
            collectionRate={realCollectionPercent}
            todayBookings={dashboard.todayBookings || 0}
            soldNights={dashboard.monthSoldNights || (dashboard.monthRevenue > 0 ? 1 : 0)}
            occupancyRate={realOccupancyRate}
          />

          {/* Room Status Spectrum Bar */}
          <RoomStatusSpectrum 
            totalRooms={dashboard.totalRooms || 0}
            availableRooms={dashboard.availableRooms || 0}
            occupiedRooms={dashboard.occupiedRooms || 0}
            dirtyRooms={dashboard.dirtyRooms || 0}
            inspectingRooms={dashboard.inspectingRooms || 0}
            maintenanceRooms={dashboard.maintenanceRooms || 0}
          />

          {/* Middle Row: Analytics Thật (Biểu đồ cột 2 tầng + Biểu đồ phân bổ Donut) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
            <div className="lg:col-span-2 flex flex-col">
              <WeeklyOccupancyChart 
                occupancyRows={occupancyRows}
                revenueRows={revenueRows}
                totalRooms={dashboard.totalRooms || 0}
                activeRange={chartRange}
                onRangeChange={handleChartRangeChange}
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
        </div>
      )}

      {/* ── Receptionist Chào mừng ── */}
      {!loading && user?.role === 'RECEPTIONIST' && !dashboard && (
        <div className="p-6 bg-white border border-border-grey rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xl font-bold text-[#1A2411]">Chào {user.name}!</p>
            <p className="text-xs text-[#606D56] mt-1">Xem danh sách nhận/trả phòng hôm nay bên dưới để hỗ trợ khách hàng nhanh chóng.</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAF5CD] text-[#3F4F24] border border-[#D5EBA3]">
            Ca Lễ Tân
          </span>
        </div>
      )}

      {/* ── Bảng Lịch Nhận Phòng & Trả Phòng Hôm Nay (Lodgify Table Style - Real Data) ── */}
      {!loading && canSeeToday && (
        <div className="bg-white border border-border-grey rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-5 md:p-6 border-b border-border-grey flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F2F6ED] text-[#4F5E37] flex items-center justify-center shrink-0">
                <IoFlashOutline size={18} />
              </div>
              <div>
                <h2 className="font-bold text-base text-[#1A2411]">Lịch Nhận phòng & Trả phòng Hôm nay</h2>
                <p className="text-xs text-[#606D56]">Danh sách khách check-in và check-out theo thời gian thực</p>
              </div>
            </div>

            {/* Quick Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Tabs */}
              <div className="flex items-center bg-[#F2F6ED] p-1 rounded-xl border border-border-grey text-xs">
                <button
                  onClick={() => setTodayFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    todayFilter === 'ALL'
                      ? 'bg-white text-[#1A2411] shadow-2xs'
                      : 'text-[#606D56] hover:text-[#1A2411]'
                  }`}
                >
                  Tất cả ({todayEvents.length})
                </button>
                <button
                  onClick={() => setTodayFilter('CHECKIN')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    todayFilter === 'CHECKIN'
                      ? 'bg-white text-[#3F4F24] shadow-2xs'
                      : 'text-[#606D56] hover:text-[#1A2411]'
                  }`}
                >
                  <span>Nhận</span> ({checkInsCount})
                </button>
                <button
                  onClick={() => setTodayFilter('CHECKOUT')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    todayFilter === 'CHECKOUT'
                      ? 'bg-white text-[#1D4ED8] shadow-2xs'
                      : 'text-[#606D56] hover:text-[#1A2411]'
                  }`}
                >
                  <span>Trả</span> ({checkOutsCount})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={todaySearch}
                  onChange={(e) => setTodaySearch(e.target.value)}
                  placeholder="Tìm khách, phòng..."
                  className="py-1.5 pl-8 pr-3 text-xs bg-white border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4F63D] focus:border-[#626F47] w-36 sm:w-44"
                />
                <IoSearchOutline size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86967B]" />
              </div>
            </div>
          </div>

          {filteredTodayEvents.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F6ED] text-[#86967B] flex items-center justify-center mx-auto mb-3">
                <IoCalendarOutline size={28} />
              </div>
              <p className="text-sm font-semibold text-[#1A2411]">
                {todayEvents.length === 0 
                  ? 'Không có lịch nhận/trả phòng nào hôm nay'
                  : 'Không tìm thấy lượt khách nào phù hợp với bộ lọc'}
              </p>
              <p className="text-xs text-[#606D56] mt-1">
                {todayEvents.length === 0 
                  ? 'Lịch nhận phòng mới từ khách sẽ được cập nhật tự động tại đây.'
                  : 'Thử điều chỉnh bộ lọc "Tất cả" hoặc xóa từ khóa tìm kiếm.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F7F9F5] border-b border-border-grey text-[11px] font-bold text-[#606D56] uppercase tracking-wider">
                    <th className="py-3.5 px-5">Khách hàng</th>
                    <th className="py-3.5 px-4">Số phòng</th>
                    <th className="py-3.5 px-4">Hạng phòng</th>
                    <th className="py-3.5 px-4 text-center">Sự kiện</th>
                    <th className="py-3.5 px-4">Thời gian</th>
                    <th className="py-3.5 px-5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey text-xs">
                  {filteredTodayEvents.map((ev, idx) => (
                    <tr 
                      key={`${ev.bookingId}-${ev.type}` || idx} 
                      className="hover:bg-[#F7F9F4] transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EBF1E5] text-[#4F5E37] font-bold text-xs flex items-center justify-center shrink-0">
                            {ev.guestName?.[0]?.toUpperCase() || 'K'}
                          </div>
                          <div>
                            <p className="font-bold text-[#1A2411] group-hover:text-primary transition-colors">{ev.guestName}</p>
                            <p className="text-[11px] text-[#606D56] mt-0.5">{ev.guestPhone || 'Chưa có SĐT'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1A2411]">
                        {ev.roomNumber ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F2F6ED] text-[#4F5E37] border border-[#E2E8D8] text-xs">
                            P. {ev.roomNumber}
                          </span>
                        ) : (
                          <span className="italic text-[#7A8872] text-xs">Chưa xếp phòng</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-[#606D56] font-medium">{ev.roomTypeName || '—'}</td>
                      <td className="py-4 px-4 text-center">
                        {ev.type === 'checkin' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF5CD] text-[#3F4F24] border border-[#D5EBA3]">
                            <IoLogInOutline size={12} /> Nhận phòng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF3FC] text-[#1D4ED8] border border-[#BFDBFE]">
                            <IoLogOutOutline size={12} /> Trả phòng
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-[#606D56] font-semibold">
                        {ev.type === 'checkin' ? formatStayDateTime(ev.checkInDate, 'checkin') : formatStayDateTime(ev.checkOutDate, 'checkout')}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {getStatusBadge(ev.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Giao diện Kế toán / Buồng phòng ── */}
      {!loading && !isOwnerOrAdmin && user?.role !== 'RECEPTIONIST' && (
        <div className="bg-white border border-border-grey rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xs">
          <div className="w-16 h-16 bg-[#EBF1E5] text-[#4F5E37] rounded-full flex items-center justify-center mb-4">
            <IoHappyOutline size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#1A2411]">Chào mừng, {user?.name}!</h2>
          <p className="text-xs text-[#606D56] mt-1.5 max-w-md">Dưới đây là các chức năng quản lý nhanh dành riêng cho vai trò của bạn.</p>

          {user?.role === 'ACCOUNTANT' && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              <Link 
                to="/manage/bookings" 
                className="flex items-center gap-4 p-5 rounded-2xl border border-border-grey bg-white hover:border-[#D4F63D] hover:bg-[#F7F9F4] transition-all hover:shadow-xs text-left"
              >
                <div className="bg-[#E6F0FA] text-[#1E40AF] p-3 rounded-xl"><IoCalendarOutline size={26} /></div>
                <div>
                  <p className="font-bold text-sm text-[#1A2411]">Quản lý Đặt phòng</p>
                  <p className="text-xs text-[#606D56] mt-0.5">Xem hóa đơn, điều chỉnh phụ thu & đối soát thanh toán</p>
                </div>
              </Link>
              <Link 
                to="/manage/reports" 
                className="flex items-center gap-4 p-5 rounded-2xl border border-border-grey bg-white hover:border-[#D4F63D] hover:bg-[#F7F9F4] transition-all hover:shadow-xs text-left"
              >
                <div className="bg-[#EAF5CD] text-[#3F4F24] p-3 rounded-xl"><IoBarChartOutline size={26} /></div>
                <div>
                  <p className="font-bold text-sm text-[#1A2411]">Báo cáo Tài chính</p>
                  <p className="text-xs text-[#606D56] mt-0.5">Biểu đồ công suất & xuất báo cáo doanh thu chi tiết</p>
                </div>
              </Link>
            </div>
          )}

          {user?.role === 'HOUSEKEEPER' && (
            <div className="mt-8 grid grid-cols-1 gap-4 w-full max-w-lg">
              {dirtyRoomsCount > 0 ? (
                <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 flex items-start gap-3 text-left">
                  <IoAlertCircleOutline className="text-[#B45309] mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="font-bold text-sm text-[#92400E]">Cần dọn dẹp {dirtyRoomsCount} phòng</p>
                    <p className="text-xs text-[#B45309] mt-0.5">Hiện có {dirtyRoomsCount} phòng bẩn cần được dọn dẹp ngay để sẵn sàng đón khách mới.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#EAF5CD] border border-[#D5EBA3] rounded-2xl p-4 flex items-start gap-3 text-left">
                  <IoCheckmarkCircleOutline className="text-[#3F4F24] mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="font-bold text-sm text-[#3F4F24]">Tất cả phòng đã sạch sẽ!</p>
                    <p className="text-xs text-[#4F5E37] mt-0.5">Không còn phòng bẩn nào chờ dọn tại thời điểm hiện tại.</p>
                  </div>
                </div>
              )}

              <Link 
                to="/manage/housekeeping" 
                className="flex items-center gap-4 p-5 rounded-2xl border border-border-grey bg-white hover:border-[#D4F63D] hover:bg-[#F7F9F4] transition-all hover:shadow-xs text-left"
              >
                <div className="bg-[#FEF3C7] text-[#B45309] p-3 rounded-xl"><IoBrushOutline size={26} /></div>
                <div>
                  <p className="font-bold text-sm text-[#1A2411]">Quản lý Buồng phòng</p>
                  <p className="text-xs text-[#606D56] mt-0.5">Cập nhật nhanh trạng thái sạch/bẩn và kiểm tra vật dụng</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Modal Cấp lại Mật khẩu tạm trực tiếp từ Dashboard */}
      <PasswordResetManagementModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
      />
    </div>
  );
};

export default DashboardPage;
