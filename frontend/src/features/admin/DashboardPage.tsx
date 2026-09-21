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
      return <span className="px-2.5 py-0.5 bg-[#EAF5CD] text-[#3F4F24] rounded-full font-bold text-xs border border-[#D5EBA3]">Đang ở</span>;
    case 'CHECKED_OUT': 
      return <span className="px-2.5 py-0.5 bg-[#F1F5F9] text-[#475569] rounded-full font-medium text-xs border border-[#E2E8F0]">Đã đi</span>;
    case 'CANCELLED': 
      return <span className="px-2.5 py-0.5 bg-[#FEE2E2] text-[#B91C1C] rounded-full font-medium text-xs border border-[#FECACA]">Đã hủy</span>;
    case 'NO_SHOW': 
      return <span className="px-2.5 py-0.5 bg-[#FFEDD5] text-[#C2410C] rounded-full font-medium text-xs border border-[#FED7AA]">Không đến</span>;
    default: 
      return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium text-xs">{status}</span>;
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
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8FAA0] via-[#DDF672] to-[#D2F346] border border-[#C5EB34] p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16220E]/80 animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#16220E]/80">{title}</p>
        </div>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-[#16220E] mt-2.5 tracking-tight leading-none">
          <AnimatedCounter value={rawValue} formatter={fmtCurrency} />
        </h3>
      </div>
      <div className="inline-flex items-center gap-1.5 bg-[#16220E] text-[#D4F63D] px-3 py-1 rounded-full text-xs font-bold shadow-xs shrink-0">
        <IoArrowUpOutline size={13} />
        <span>
          <AnimatedCounter value={collectionPercent} suffix="% Đã thu" />
        </span>
      </div>
    </div>

    <div className="mt-6 pt-4 border-t border-[#16220E]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#16220E]/90">
      <div className="flex items-center gap-4 flex-wrap font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16220E]" />
          <span>
            Đã thu: <strong><AnimatedCounter value={collectedAmount} formatter={fmtCurrency} /></strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16220E]/40" />
          <span>
            Công nợ: <strong><AnimatedCounter value={debtAmount} formatter={fmtCurrency} /></strong>
          </span>
        </div>
      </div>
      {actionText && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#16220E] hover:underline cursor-pointer"
        >
          <span>{actionText}</span>
          <IoArrowForwardOutline size={12} />
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
    className={`bg-white border border-border-grey rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:-translate-y-0.5 ${
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
}> = ({
  occupancyRows,
  revenueRows,
  totalRooms,
  activeRange,
  onRangeChange,
  isLoading
}) => {
  // Chuẩn hóa dữ liệu theo 7 ngày gần nhất hoặc các ngày trong tháng
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Tạo danh sách ngày thực tế
  const chartItems = React.useMemo(() => {
    if (activeRange === 'week') {
      const result = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = dayNames[d.getDay()];

        const occ = occupancyRows.find(r => r.date === dateStr);
        const rev = revenueRows.find(r => r.date === dateStr || r.period === dateStr);

        result.push({
          dateStr,
          dayLabel,
          occupiedRooms: occ?.occupiedRooms ?? 0,
          availableRooms: occ?.availableRooms ?? Math.max(0, totalRooms - (occ?.occupiedRooms ?? 0)),
          occupancyRate: occ?.occupancyRate ?? (totalRooms > 0 && occ?.occupiedRooms ? Math.round((occ.occupiedRooms / totalRooms) * 100) : 0),
          newBookings: rev?.bookings ?? 0,
          revenue: rev?.revenue ?? 0
        });
      }
      return result;
    } else {
      // Month mode: lấy theo các ngày có trong occupancyRows hoặc tối đa 14 ngày gần nhất
      const sliced = occupancyRows.slice(-14);
      if (sliced.length === 0) {
        return [];
      }
      return sliced.map(occ => {
        const d = new Date(occ.date);
        const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
        const rev = revenueRows.find(r => r.date === occ.date || r.period === occ.date);
        return {
          dateStr: occ.date,
          dayLabel,
          occupiedRooms: occ.occupiedRooms ?? 0,
          availableRooms: occ.availableRooms ?? Math.max(0, totalRooms - (occ.occupiedRooms ?? 0)),
          occupancyRate: occ.occupancyRate ?? 0,
          newBookings: rev?.bookings ?? 0,
          revenue: rev?.revenue ?? 0
        };
      });
    }
  }, [occupancyRows, revenueRows, totalRooms, activeRange]);

  // Tìm giá trị max thực tế để chuẩn hóa scale cột
  const maxRooms = Math.max(totalRooms, ...chartItems.map(item => item.occupiedRooms), 1);
  const maxBookings = Math.max(...chartItems.map(item => item.newBookings), 1);

  return (
    <div className="bg-white border border-border-grey rounded-2xl p-5 md:p-6 shadow-2xs flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-grey">
        <div>
          <div className="flex items-center gap-2">
            <IoBarChartOutline size={18} className="text-[#626F47]" />
            <h3 className="font-bold text-base text-[#1A2411]">Công suất & Lượng khách</h3>
          </div>
          <p className="text-xs text-[#606D56] mt-0.5">
            Dữ liệu thực tế: số phòng có khách và đơn đặt mới theo từng ngày
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Dual Bar Chart Canvas */}
      <div className="mt-6 flex items-end justify-between gap-2 sm:gap-4 h-48 px-2">
        {chartItems.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#606D56]">
            <IoBarChartOutline size={32} className="text-[#86967B]/40 mb-2" />
            <span>Chưa có dữ liệu công suất trong khoảng thời gian này</span>
          </div>
        ) : (
          chartItems.map((item, idx) => {
            // Tỷ lệ phần trăm cột: Cột 1 (Đặt mới), Cột 2 (Đang ở)
            const hBookings = maxBookings > 0 ? Math.round((item.newBookings / maxBookings) * 100) : 0;
            const hOccupied = maxRooms > 0 ? Math.round((item.occupiedRooms / maxRooms) * 100) : 0;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full max-w-[42px] flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                  {/* Bar 1: Lime Accent (Đặt mới) */}
                  <div
                    className="w-1/2 bg-[#D4F63D] hover:bg-[#C2E232] rounded-t-md transition-all duration-300 relative group/bar min-h-[4px]"
                    style={{ height: `${Math.max(4, hBookings)}%` }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-[#1A2411] text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-20 shadow-md">
                      {item.newBookings} đơn mới
                    </div>
                  </div>

                  {/* Bar 2: Deep Olive (Đang ở) */}
                  <div
                    className="w-1/2 bg-[#626F47] hover:bg-[#525E3B] rounded-t-md transition-all duration-300 relative group/bar min-h-[4px]"
                    style={{ height: `${Math.max(4, hOccupied)}%` }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-[#1A2411] text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-20 shadow-md">
                      {item.occupiedRooms} phòng đang ở ({item.occupancyRate}%)
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-[#606D56] group-hover:text-[#1A2411] transition-colors">
                  {item.dayLabel}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-3 border-t border-border-grey flex items-center justify-center gap-6 text-xs text-[#606D56] font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-[#D4F63D]" />
          <span>Lượt đặt phòng mới</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-[#626F47]" />
          <span>Số phòng đang có khách</span>
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
}> = ({
  channelReport,
  overallOccupancyRate,
  totalRooms,
  occupiedRooms,
  isLoading
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
    <div className="bg-white border border-border-grey rounded-2xl p-5 md:p-6 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-border-grey">
        <div className="flex items-center gap-2">
          <IoPieChartOutline size={18} className="text-[#626F47]" />
          <h3 className="font-bold text-base text-[#1A2411]">Phân bổ Nguồn Đặt</h3>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F2F6ED] text-[#4F5E37] border border-border-grey">
          {totalBookings} Đơn
        </span>
      </div>

      {/* Donut Graphic */}
      <div className="my-4 flex flex-col sm:flex-row items-center justify-around gap-4">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-[#1A2411] leading-none">{overallOccupancyRate}%</span>
            <span className="text-[10px] uppercase font-bold text-[#606D56] mt-0.5">Lấp đầy</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="space-y-2 text-xs w-full max-w-[210px]">
          {channelSlices.length === 0 ? (
            <div className="text-center py-4 text-[#606D56]">
              <p className="font-medium text-xs">Chưa có lượt đặt phòng nào theo kênh trong kỳ này</p>
              <p className="text-[11px] text-[#86967B] mt-1">Đang có {occupiedRooms}/{totalRooms} phòng có khách</p>
            </div>
          ) : (
            channelSlices.map((src, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: src.color }} />
                  <span className="text-[#606D56] truncate font-medium">{src.label}</span>
                </div>
                <span className="font-bold text-[#1A2411] shrink-0">{src.percent}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-border-grey flex items-center justify-between text-xs text-[#606D56]">
        <span>Hiện tại: {occupiedRooms} / {totalRooms} phòng có khách</span>
        <span className="font-bold text-[#4F5E37]">{overallOccupancyRate}% công suất</span>
      </div>
    </div>
  );
};

/** Hotel Quick Operations Bar */
const QuickActionBar: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#606D56] uppercase tracking-wider">
          <IoFlashOutline size={16} className="text-primary" />
          <span>Tác Vụ Nhanh (Quick Actions)</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/manage/bookings')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F6ED] hover:bg-[#E5EFE0] text-xs font-bold text-[#1A2411] transition-all cursor-pointer border border-border-grey hover:border-[#CCD8C2]"
          >
            <IoAddCircleOutline size={15} className="text-primary" />
            <span>Tạo Đặt Phòng</span>
          </button>
          <button
            onClick={() => navigate('/manage/channels')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F6ED] hover:bg-[#E5EFE0] text-xs font-bold text-[#1A2411] transition-all cursor-pointer border border-border-grey hover:border-[#CCD8C2]"
          >
            <IoCalendarOutline size={15} className="text-primary" />
            <span>Kiểm Tra Kênh OTA</span>
          </button>
          <button
            onClick={() => navigate('/manage/housekeeping')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F6ED] hover:bg-[#E5EFE0] text-xs font-bold text-[#1A2411] transition-all cursor-pointer border border-border-grey hover:border-[#CCD8C2]"
          >
            <IoBrushOutline size={15} className="text-[#B45309]" />
            <span>Xử Lý Buồng Phòng</span>
          </button>
          <button
            onClick={() => navigate('/manage/reports')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D4F63D] hover:bg-[#C2E232] text-xs font-bold text-[#1A2411] transition-all cursor-pointer shadow-2xs"
          >
            <IoBarChartOutline size={15} />
            <span>Báo Cáo Toàn Diện</span>
          </button>
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
  maintenanceRooms: number;
}> = ({
  totalRooms,
  availableRooms,
  occupiedRooms,
  dirtyRooms,
  maintenanceRooms
}) => {
  const safeTotal = totalRooms > 0 ? totalRooms : 1;
  const pctAvailable = Math.round((availableRooms / safeTotal) * 100);
  const pctOccupied = Math.round((occupiedRooms / safeTotal) * 100);
  const pctDirty = Math.round((dirtyRooms / safeTotal) * 100);
  const pctMaint = Math.max(0, 100 - pctAvailable - pctOccupied - pctDirty);

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
          {pctOccupied > 0 && (
            <div
              style={{ width: `${pctOccupied}%` }}
              title={`Đang có khách: ${occupiedRooms} phòng (${pctOccupied}%)`}
              className="h-full bg-[#626F47] rounded-l-full transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
          {pctAvailable > 0 && (
            <div
              style={{ width: `${pctAvailable}%` }}
              title={`Sẵn sàng: ${availableRooms} phòng (${pctAvailable}%)`}
              className="h-full bg-[#D4F63D] transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
          {pctDirty > 0 && (
            <div
              style={{ width: `${pctDirty}%` }}
              title={`Cần dọn: ${dirtyRooms} phòng (${pctDirty}%)`}
              className="h-full bg-[#F59E0B] transition-all duration-700 hover:brightness-110 cursor-pointer"
            />
          )}
          {pctMaint > 0 && (
            <div
              style={{ width: `${pctMaint}%` }}
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
              <AnimatedCounter value={dirtyRooms} /> ({pctDirty}%)
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

/** Hotel KPI Ticker: ADR, RevPAR, Collection Efficiency, Today Bookings */
const HotelKpiTicker: React.FC<{
  adr: number;
  revPar: number;
  collectionRate: number;
  todayBookings: number;
}> = ({ adr, revPar, collectionRate, todayBookings }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#EAF5CD] text-[#3F4F24] flex items-center justify-center shrink-0">
        <IoBusinessOutline size={20} />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#606D56] block truncate">
          ADR (Giá TB/Phòng)
        </span>
        <div className="text-base sm:text-lg font-extrabold text-[#1A2411] truncate">
          <AnimatedCounter value={adr} formatter={fmtCurrency} />
        </div>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#E6F0FA] text-[#1E40AF] flex items-center justify-center shrink-0">
        <IoTrendingUpOutline size={20} />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#606D56] block truncate">
          RevPAR (Doanh Thu/Phòng)
        </span>
        <div className="text-base sm:text-lg font-extrabold text-[#1A2411] truncate">
          <AnimatedCounter value={revPar} formatter={fmtCurrency} />
        </div>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] text-[#854D0E] flex items-center justify-center shrink-0">
        <IoWalletOutline size={20} />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#606D56] block truncate">
          Tỷ Lệ Thu Tiền
        </span>
        <div className="text-base sm:text-lg font-extrabold text-[#1A2411] truncate">
          <AnimatedCounter value={collectionRate} suffix="%" />
        </div>
      </div>
    </div>

    <div className="bg-white border border-border-grey rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#F2F6ED] text-[#4F5E37] flex items-center justify-center shrink-0">
        <IoCalendarOutline size={20} />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#606D56] block truncate">
          Đặt Mới Hôm Nay
        </span>
        <div className="text-base sm:text-lg font-extrabold text-[#1A2411] truncate">
          <AnimatedCounter value={todayBookings} suffix=" đơn" />
        </div>
      </div>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
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
        user?.role === 'HOUSEKEEPER' ? roomApi.getAllRooms('DIRTY').catch(() => []) : Promise.resolve([]),
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
          maintenanceRooms: 0,
          todayCheckIns: 0,
          todayCheckOuts: 0,
          todayBookings: 0,
          monthRevenue: 0,
          monthCollectedRevenue: 0,
          monthDebtRevenue: 0
        });
      }

      // Gán số phòng bẩn thật
      if (dirtyRoomsData && Array.isArray(dirtyRoomsData)) {
        setDirtyRoomsCount(dirtyRoomsData.length);
      } else if (dashData?.dirtyRooms != null) {
        setDirtyRoomsCount(dashData.dirtyRooms);
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

  // Tính ADR (Average Daily Rate): Doanh thu / (Số phòng có khách * 30 ngày)
  const adr = useMemo(() => {
    if (!dashboard || !dashboard.monthRevenue) return 0;
    const occupiedNights = Math.max(1, (dashboard.occupiedRooms || 1) * 30);
    return Math.round(dashboard.monthRevenue / occupiedNights);
  }, [dashboard]);

  // Tính RevPAR (Revenue Per Available Room): Doanh thu / (Tổng số phòng * 30 ngày)
  const revPar = useMemo(() => {
    if (!dashboard || !dashboard.monthRevenue || !dashboard.totalRooms) return 0;
    const totalRoomNights = Math.max(1, dashboard.totalRooms * 30);
    return Math.round(dashboard.monthRevenue / totalRoomNights);
  }, [dashboard]);

  // Tính tỷ lệ thu hồi doanh thu thật
  const realCollectionPercent = useMemo(() => {
    if (!dashboard || !dashboard.monthRevenue || dashboard.monthRevenue === 0) {
      return 100;
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
              Live
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

          <Link
            to="/manage/reports"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4F63D] hover:bg-[#C2E232] text-xs font-bold text-[#1A2411] shadow-xs transition-all cursor-pointer"
          >
            <IoDownloadOutline size={15} />
            <span>Báo cáo doanh thu</span>
          </Link>
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
        <>
          {/* Quick Action Navigation Bar */}
          <QuickActionBar />

          {/* Top Row: Hero Stat Card + 3 Secondary Metric Cards (Real Data + Animated Counter) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
            {/* Card 1: Hero Card (Lime Gradient) */}
            <div className="md:col-span-2 lg:col-span-1">
              <HeroStatCard
                title="Doanh thu Tháng"
                rawValue={dashboard.monthRevenue || 0}
                collectedAmount={dashboard.monthCollectedRevenue || 0}
                debtAmount={dashboard.monthDebtRevenue || 0}
                collectionPercent={realCollectionPercent}
                actionText="Chi tiết tài chính"
                onAction={() => {}}
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
            />

            {/* Card 4: Chờ dọn dẹp */}
            <LodgifyStatCard
              icon={IoBrushOutline}
              label="Chờ Buồng Phòng"
              rawValue={dirtyRoomsCount}
              valueSuffix=" phòng"
              subLabel={dirtyRoomsCount > 0 ? 'Cần dọn để sẵn sàng đón khách' : 'Tất cả phòng sạch sẽ'}
              badgeText={dirtyRoomsCount > 0 ? 'Cần dọn' : 'Đã sạch'}
              badgeType={dirtyRoomsCount > 0 ? 'warning' : 'positive'}
              iconBg="bg-[#FEF3C7]"
              iconColor="text-[#B45309]"
              progressPercent={dashboard.totalRooms ? (dirtyRoomsCount / dashboard.totalRooms) * 100 : 0}
              progressBarColor="bg-[#F59E0B]"
            />
          </div>

          {/* Hotel KPI Ticker: ADR, RevPAR, Collection %, Today Bookings */}
          <HotelKpiTicker 
            adr={adr}
            revPar={revPar}
            collectionRate={realCollectionPercent}
            todayBookings={dashboard.todayBookings || 0}
          />

          {/* Room Status Spectrum Bar */}
          <RoomStatusSpectrum 
            totalRooms={dashboard.totalRooms || 0}
            availableRooms={dashboard.availableRooms || 0}
            occupiedRooms={dashboard.occupiedRooms || 0}
            dirtyRooms={dirtyRoomsCount}
            maintenanceRooms={dashboard.maintenanceRooms || 0}
          />

          {/* Middle Row: Analytics Thật (Biểu đồ cột 2 tầng + Biểu đồ phân bổ Donut) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <WeeklyOccupancyChart 
                occupancyRows={occupancyRows}
                revenueRows={revenueRows}
                totalRooms={dashboard.totalRooms || 0}
                activeRange={chartRange}
                onRangeChange={handleChartRangeChange}
              />
            </div>
            <div>
              <BookingSourceDonut 
                channelReport={channelReport}
                overallOccupancyRate={realOccupancyRate}
                totalRooms={dashboard.totalRooms || 0}
                occupiedRooms={dashboard.occupiedRooms || 0}
              />
            </div>
          </div>
        </>
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
