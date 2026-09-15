import React, { useState } from 'react';
import {
  IoBarChartOutline,
  IoCashOutline,
  IoDownloadOutline,
  IoGridOutline,
  IoInformationCircleOutline,
  IoSearchOutline,
  IoSparklesOutline,
  IoStatsChartOutline,
  IoTrendingUpOutline,
  IoBedOutline,
  IoFilterOutline
} from 'react-icons/io5';
import reportApi from '../../services/reportApi';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import {
  AdrRevparReportResponse,
  AdrRevparTimelineRow,
  AdrRevparRoomTypeRow,
  AdrRevparRoomRow
} from '../../types';

const GROUP_BY_OPTIONS = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'month', label: 'Theo tháng' }
];

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtCompactCurrency = (amount?: number) => {
  if (!amount || amount === 0) return '0 đ';
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + ' tỷ';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + ' tr';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + ' k';
  return amount + ' đ';
};

const fmtDate = (str?: string) => {
  if (!str) return '';
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split('-');
    return `Tháng ${m}/${y}`;
  }
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return new Date(str).toLocaleDateString('vi-VN');
};

const rateSolidBg = (pct: number) => {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-primary';
  if (pct >= 30) return 'bg-amber-500';
  return 'bg-rose-500';
};

/**
 * Biểu đồ tương tác SVG Dual-Metric (ADR vs RevPAR)
 */
const AdrRevparVisualChart: React.FC<{
  rows: AdrRevparTimelineRow[];
  groupBy: string;
}> = ({ rows, groupBy }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeMetric, setActiveMetric] = useState<'both' | 'adr' | 'revpar'>('both');

  if (!rows || rows.length === 0) return null;

  const maxAdr = Math.max(...rows.map(r => Number(r.adr || 0)), 1);
  const maxRevpar = Math.max(...rows.map(r => Number(r.revpar || 0)), 1);
  const maxVal = Math.max(maxAdr, maxRevpar);

  const chartHeight = 250;
  const paddingBottom = 40;
  const paddingTop = 24;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <IoStatsChartOutline size={20} className="text-primary" />
            Biểu đồ xu hướng Giá bán TB (ADR) & Doanh thu/phòng (RevPAR)
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            So sánh giá bán thực tế trên mỗi đêm (ADR) và mức sinh lời trên quỹ phòng sẵn có (RevPAR) {groupBy === 'month' ? 'theo tháng' : 'theo ngày'}
          </p>
        </div>

        {/* Metric Selector & Legend */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-border-grey text-xs">
            <button
              type="button"
              onClick={() => setActiveMetric('both')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                activeMetric === 'both' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Cả hai
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('adr')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                activeMetric === 'adr' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Chỉ ADR
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('revpar')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                activeMetric === 'revpar' ? 'bg-surface-container-lowest text-emerald-700 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Chỉ RevPAR
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs pl-2 border-l border-border-grey">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-on-surface-variant font-medium">ADR (Giá bán TB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-on-surface-variant font-medium">RevPAR (DT/phòng sẵn)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bar Chart Grid */}
      <div className="relative">
        {/* Background Guide lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-[40px] pt-[24px]">
          <div className="border-b border-border-grey/40 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">
              {fmtCompactCurrency(maxVal)}
            </span>
          </div>
          <div className="border-b border-dashed border-border-grey/30 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">
              {fmtCompactCurrency(maxVal / 2)}
            </span>
          </div>
          <div className="border-b border-border-grey/60 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">
              0 đ
            </span>
          </div>
        </div>

        {/* Bars Container */}
        <div className="overflow-x-auto scrollbar-thin pb-2 pt-2 relative z-10">
          <div
            className="flex items-end gap-3 md:gap-5 min-w-fit px-4"
            style={{ height: `${chartHeight}px` }}
          >
            {rows.map((row, idx) => {
              const adr = Number(row.adr || 0);
              const revpar = Number(row.revpar || 0);
              const adrHeight = maxVal > 0 ? (adr / maxVal) * usableHeight : 0;
              const revparHeight = maxVal > 0 ? (revpar / maxVal) * usableHeight : 0;
              const isHovered = hoveredIdx === idx;
              const dateLabel = fmtDate(row.period);

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-1 min-w-[64px] max-w-[100px] relative group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-3 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div className="bg-slate-900 text-white text-xs rounded-xl py-2.5 px-3.5 shadow-xl whitespace-nowrap text-left border border-slate-700 min-w-[190px]">
                        <p className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 text-center">{dateLabel}</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">ADR (Giá TB):</span>
                            <span className="font-bold text-sky-300">{fmtCurrency(adr)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">RevPAR:</span>
                            <span className="font-bold text-emerald-400">{fmtCurrency(revpar)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">Doanh thu phòng:</span>
                            <span className="font-semibold text-amber-300">{fmtCurrency(row.revenue)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px] text-slate-300">
                            <span>Công suất: {row.occupancyRate.toFixed(1)}%</span>
                            <span>{row.soldNights} / {row.availableNights} đêm</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>
                  )}

                  {/* Dual Bar Group */}
                  <div className="w-full h-[186px] flex items-end justify-center gap-1.5">
                    {/* ADR Bar */}
                    {(activeMetric === 'both' || activeMetric === 'adr') && (
                      <div className="flex flex-col items-center flex-1 max-w-[24px]">
                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            adr > 0
                              ? isHovered
                                ? 'bg-primary shadow-md scale-x-105'
                                : 'bg-primary/80 hover:bg-primary'
                              : 'bg-surface-container-high'
                          }`}
                          style={{ height: `${Math.max(adrHeight, adr > 0 ? 6 : 2)}px` }}
                        />
                      </div>
                    )}

                    {/* RevPAR Bar */}
                    {(activeMetric === 'both' || activeMetric === 'revpar') && (
                      <div className="flex flex-col items-center flex-1 max-w-[24px]">
                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            revpar > 0
                              ? isHovered
                                ? 'bg-emerald-500 shadow-md scale-x-105'
                                : 'bg-emerald-500/80 hover:bg-emerald-500'
                              : 'bg-surface-container-high'
                          }`}
                          style={{ height: `${Math.max(revparHeight, revpar > 0 ? 6 : 2)}px` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* X-axis Label */}
                  <div className="mt-2 text-center w-full">
                    <p className={`text-[11px] truncate ${isHovered ? 'font-bold text-primary' : 'text-on-surface-variant font-medium'}`}>
                      {dateLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Thẻ KPI Tổng quan */
const KPIStatCard: React.FC<{
  title: string;
  value: string;
  sub: string;
  badge?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass?: string;
}> = ({ title, value, sub, badge, icon: Icon, colorClass = 'text-primary' }) => (
  <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 hover:shadow-xs transition-shadow">
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-xs font-semibold">{title}</p>
      <div className="p-2 rounded-xl bg-surface-container-low text-primary">
        <Icon size={18} />
      </div>
    </div>
    <p className={`font-headline-md leading-tight font-bold ${colorClass}`}>{value}</p>
    <div className="flex items-center justify-between gap-2 mt-2">
      <p className="text-xs text-on-surface-variant font-medium">{sub}</p>
      {badge && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant">
          {badge}
        </span>
      )}
    </div>
  </div>
);

const AdrRevparReport: React.FC = () => {
  const { user } = useAuth();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = today.toISOString().split('T')[0];

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData] = useState<AdrRevparReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Filter state for breakdowns
  const [viewTab, setViewTab] = useState<'timeline' | 'roomType' | 'room'>('timeline');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');

  const hasAccess = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role || '');
  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
        Bạn không có quyền xem trang báo cáo này.
      </div>
    );
  }

  // Preset Date Handlers
  const applyPreset = (preset: 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisQuarter') => {
    const now = new Date();
    let f = '';
    let t = now.toISOString().split('T')[0];

    if (preset === 'today') {
      f = t;
    } else if (preset === 'last7') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      f = d.toISOString().split('T')[0];
    } else if (preset === 'thisMonth') {
      f = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (preset === 'lastMonth') {
      f = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      t = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (preset === 'thisQuarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      f = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
    }

    setFrom(f);
    setTo(t);
  };

  const handleSearch = async () => {
    if (!from || !to) {
      setError('Vui lòng chọn đủ khoảng thời gian.');
      return;
    }
    if (from > to) {
      setError('Ngày bắt đầu phải trước ngày kết thúc.');
      return;
    }
    setError(null);
    setLoading(true);
    setSearched(true);
    try {
      const result = await reportApi.getAdrRevparReport(from, to, groupBy);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải báo cáo. Vui lòng kiểm tra kết nối.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!data) return;
    const summary = data.summary;
    const lines: string[] = [];

    lines.push('BÁO CÁO GIÁ BÁN TRUNG BÌNH (ADR) VÀ DOANH THU TRÊN MỖI PHÒNG (RevPAR)');
    lines.push(`Thời gian: ${from} đến ${to}`);
    lines.push(`Tổng doanh thu phòng: ${summary.totalRevenue}`);
    lines.push(`ADR (Giá bán trung bình): ${summary.adr}`);
    lines.push(`RevPAR (Doanh thu trên phòng sẵn có): ${summary.revpar}`);
    lines.push(`Công suất trung bình (%): ${summary.occupancyRate}`);
    lines.push('');

    // 1. Phân bổ theo dòng thời gian
    lines.push('--- PHÂN BỔ THEO THỜI GIAN ---');
    lines.push('Mốc thời gian,Lượt đặt,Đêm phòng bán,Đêm sẵn có,Công suất (%),Doanh thu (đ),ADR (đ),RevPAR (đ)');
    data.timelineRows.forEach(r => {
      lines.push(`${r.period},${r.bookings},${r.soldNights},${r.availableNights},${r.occupancyRate.toFixed(2)},${r.revenue},${r.adr},${r.revpar}`);
    });
    lines.push('');

    // 2. Phân bổ theo Loại phòng
    lines.push('--- HIỆU SUẤT THEO LOẠI PHÒNG ---');
    lines.push('Loại phòng,Số phòng,Giá niêm yết,Lượt đặt,Đêm bán,Đêm sẵn có,Công suất (%),Doanh thu (đ),ADR (đ),RevPAR (đ),Tỷ trọng (%)');
    data.roomTypeRows.forEach(rt => {
      lines.push(`${rt.roomTypeName},${rt.totalRooms},${rt.basePrice},${rt.bookings},${rt.soldNights},${rt.availableNights},${rt.occupancyRate.toFixed(2)},${rt.revenue},${rt.adr},${rt.revpar},${rt.revenueShare.toFixed(2)}`);
    });
    lines.push('');

    // 3. Phân bổ theo Từng phòng
    lines.push('--- CHI TIẾT TỪNG PHÒNG ---');
    lines.push('Số phòng,Tầng,Loại phòng,Lượt đặt,Đêm bán,Đêm sẵn có,Công suất (%),Doanh thu (đ),ADR (đ),RevPAR (đ),Tỷ trọng (%)');
    data.roomRows.forEach(r => {
      lines.push(`${r.roomNumber},${r.floor || ''},${r.roomTypeName},${r.bookings},${r.soldNights},${r.availableNights},${r.occupancyRate.toFixed(2)},${r.revenue},${r.adr},${r.revpar},${r.revenueShare.toFixed(2)}`);
    });

    const csvContent = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-adr-revpar_${from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary;
  const timelineRows = data?.timelineRows || [];
  const roomTypeRows = data?.roomTypeRows || [];
  const roomRows = (data?.roomRows || []).filter(r => {
    const matchesSearch = roomSearch === '' ||
      r.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.roomTypeName.toLowerCase().includes(roomSearch.toLowerCase());
    const matchesType = roomTypeFilter === 'ALL' || String(r.roomTypeId) === roomTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* ── Guidance Banner ── */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <IoInformationCircleOutline size={20} className="text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-primary">Công thức tính theo chuẩn Quản trị Khách sạn:</span>
            <p className="text-on-surface-variant">
              <strong>ADR (Average Daily Rate)</strong> = Doanh thu phòng / Đêm phòng thực bán &nbsp;|&nbsp;
              <strong>RevPAR (Revenue Per Available Room)</strong> = Doanh thu phòng / Tổng đêm phòng sẵn có (hoặc ADR × Tỷ lệ công suất).
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Form ── */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-grey pb-3">
          <h3 className="font-title-lg text-on-surface flex items-center gap-2">
            <IoFilterOutline size={20} className="text-primary" />
            Bộ lọc & Kỳ báo cáo
          </h3>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-on-surface-variant mr-1 font-medium">Chọn nhanh:</span>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-medium transition-colors"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last7')}
              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-medium transition-colors"
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => applyPreset('thisMonth')}
              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-medium transition-colors"
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => applyPreset('lastMonth')}
              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-medium transition-colors"
            >
              Tháng trước
            </button>
            <button
              type="button"
              onClick={() => applyPreset('thisQuarter')}
              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-medium transition-colors"
            >
              Quý này
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <Input label="Từ ngày" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <Input label="Đến ngày" type="date" value={to} onChange={e => setTo(e.target.value)} />
          <Select
            label="Nhóm theo thời gian"
            options={GROUP_BY_OPTIONS}
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <Button onClick={handleSearch} isLoading={loading} icon={IoSearchOutline}>
              Xem báo cáo
            </Button>
            {data && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                icon={IoDownloadOutline}
              >
                Xuất file CSV
              </Button>
            )}
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-error font-medium">{error}</p>}
      </div>

      {/* ── Loading ── */}
      {loading && <LoadingScreen message="Đang tổng hợp dữ liệu ADR & RevPAR..." />}

      {/* ── Kết quả báo cáo ── */}
      {!loading && searched && data !== null && summary && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIStatCard
              title="Giá bán TB (ADR)"
              value={fmtCurrency(summary.adr)}
              sub="Doanh thu bình quân mỗi đêm bán"
              badge={`Đã bán: ${summary.totalSoldNights} đêm`}
              icon={IoCashOutline}
              colorClass="text-primary font-bold"
            />
            <KPIStatCard
              title="DT / Phòng sẵn có (RevPAR)"
              value={fmtCurrency(summary.revpar)}
              sub="Doanh thu trên tổng quỹ phòng"
              badge={`Tổng: ${summary.totalAvailableNights} đêm`}
              icon={IoTrendingUpOutline}
              colorClass="text-emerald-600 font-bold"
            />
            <KPIStatCard
              title="Tổng doanh thu phòng"
              value={fmtCurrency(summary.totalRevenue)}
              sub={`Từ ${summary.bookingCount} lượt checkout`}
              badge={`Quy mô: ${summary.totalRooms} phòng`}
              icon={IoBarChartOutline}
              colorClass="text-on-surface font-bold"
            />
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-xs font-semibold">Công suất lấp đầy TB</p>
                <div className="p-2 rounded-xl bg-surface-container-low text-primary">
                  <IoBedOutline size={18} />
                </div>
              </div>
              <p className="font-headline-md leading-tight font-bold text-primary">
                {summary.occupancyRate.toFixed(1)}%
              </p>
              <div className="mt-2.5 w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${rateSolidBg(summary.occupancyRate)}`}
                  style={{ width: `${Math.min(100, summary.occupancyRate)}%` }}
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">
                {summary.totalSoldNights} / {summary.totalAvailableNights} đêm phòng
              </p>
            </div>
          </div>

          {/* Top Highlights Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                <IoSparklesOutline size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Phòng Doanh Thu Cao Nhất</p>
                <p className="font-title-lg font-bold text-on-surface">
                  Phòng {summary.topRoomNumber}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <IoTrendingUpOutline size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Hạng Phòng RevPAR Xuất Sắc</p>
                <p className="font-title-lg font-bold text-on-surface">
                  {summary.topRoomTypeName}
                </p>
              </div>
            </div>
          </div>

          {/* Dual-Metric Interactive Visual Chart */}
          <AdrRevparVisualChart rows={timelineRows} groupBy={groupBy} />

          {/* ── Multidimensional Breakdowns Table ── */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-xs">
            {/* Breakdown Sub-Tabs Header */}
            <div className="p-4 sm:p-5 border-b border-border-grey flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-border-grey w-fit">
                <button
                  type="button"
                  onClick={() => setViewTab('timeline')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    viewTab === 'timeline'
                      ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <IoStatsChartOutline size={15} />
                  Theo Mốc Thời Gian ({timelineRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('roomType')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    viewTab === 'roomType'
                      ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <IoGridOutline size={15} />
                  Theo Loại Phòng ({roomTypeRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('room')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    viewTab === 'room'
                      ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <IoBedOutline size={15} />
                  Theo Từng Phòng ({roomRows.length})
                </button>
              </div>

              {/* Quick Filter when in By Room view */}
              {viewTab === 'room' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tìm số phòng / loại..."
                    value={roomSearch}
                    onChange={e => setRoomSearch(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-surface-container-lowest border border-border-grey rounded-lg focus:outline-none focus:border-primary w-44"
                  />
                  <select
                    value={roomTypeFilter}
                    onChange={e => setRoomTypeFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-surface-container-lowest border border-border-grey rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">Tất cả loại phòng</option>
                    {roomTypeRows.map(rt => (
                      <option key={rt.roomTypeId} value={String(rt.roomTypeId)}>
                        {rt.roomTypeName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 1. Tab Timeline */}
            {viewTab === 'timeline' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border-grey text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      <th className="p-4">Thời gian</th>
                      <th className="p-4 text-right">Lượt đặt</th>
                      <th className="p-4 text-right">Đêm bán</th>
                      <th className="p-4 text-right">Đêm sẵn có</th>
                      <th className="p-4 w-40">Công suất (%)</th>
                      <th className="p-4 text-right">Doanh thu phòng</th>
                      <th className="p-4 text-right">ADR (Giá TB)</th>
                      <th className="p-4 text-right">RevPAR (DT/phòng sẵn)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-border-grey hover:bg-surface-container-low/60 transition-colors">
                        <td className="p-4 font-body-md text-on-surface font-medium">{fmtDate(row.period)}</td>
                        <td className="p-4 text-right font-body-md text-on-surface">{(row.bookings || 0).toLocaleString('vi-VN')}</td>
                        <td className="p-4 text-right font-body-md text-on-surface">{row.soldNights}</td>
                        <td className="p-4 text-right font-body-md text-on-surface-variant">{row.availableNights}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rateSolidBg(row.occupancyRate)}`}
                                style={{ width: `${Math.min(100, row.occupancyRate)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-on-surface w-12 text-right">
                              {row.occupancyRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-title-sm text-on-surface font-semibold">{fmtCurrency(row.revenue)}</td>
                        <td className="p-4 text-right font-title-sm text-primary font-bold">{fmtCurrency(row.adr)}</td>
                        <td className="p-4 text-right font-title-sm text-emerald-700 font-bold">{fmtCurrency(row.revpar)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-container-low/80 border-t-2 border-border-grey font-bold text-xs">
                      <td className="p-4 font-title-sm text-on-surface">Bình quân / Tổng</td>
                      <td className="p-4 text-right font-title-sm text-on-surface">{summary.bookingCount.toLocaleString('vi-VN')}</td>
                      <td className="p-4 text-right font-title-sm text-on-surface">{summary.totalSoldNights}</td>
                      <td className="p-4 text-right font-title-sm text-on-surface-variant">{summary.totalAvailableNights}</td>
                      <td className="p-4 text-right font-title-sm text-primary">{summary.occupancyRate.toFixed(1)}%</td>
                      <td className="p-4 text-right font-title-sm text-on-surface font-bold">{fmtCurrency(summary.totalRevenue)}</td>
                      <td className="p-4 text-right font-title-sm text-primary font-bold">{fmtCurrency(summary.adr)}</td>
                      <td className="p-4 text-right font-title-sm text-emerald-700 font-bold">{fmtCurrency(summary.revpar)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 2. Tab Room Type */}
            {viewTab === 'roomType' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border-grey text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      <th className="p-4">Loại phòng</th>
                      <th className="p-4 text-right">Số phòng</th>
                      <th className="p-4 text-right">Giá niêm yết</th>
                      <th className="p-4 text-right">Lượt đặt</th>
                      <th className="p-4 text-right">Đêm bán</th>
                      <th className="p-4 w-36">Công suất (%)</th>
                      <th className="p-4 text-right">Doanh thu phòng</th>
                      <th className="p-4 text-right">ADR (Giá TB)</th>
                      <th className="p-4 text-right">RevPAR</th>
                      <th className="p-4 text-right">Tỷ trọng (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypeRows.map((rt, idx) => {
                      const basePrice = Number(rt.basePrice || 0);
                      const adrDiff = basePrice > 0 ? ((rt.adr - basePrice) / basePrice) * 100 : 0;

                      return (
                        <tr key={idx} className="border-b border-border-grey hover:bg-surface-container-low/60 transition-colors">
                          <td className="p-4 font-body-md text-on-surface font-bold">
                            {rt.roomTypeName}
                          </td>
                          <td className="p-4 text-right font-body-md text-on-surface">{rt.totalRooms}</td>
                          <td className="p-4 text-right font-body-md text-on-surface-variant">{fmtCurrency(basePrice)}</td>
                          <td className="p-4 text-right font-body-md text-on-surface">{(rt.bookings || 0).toLocaleString('vi-VN')}</td>
                          <td className="p-4 text-right font-body-md text-on-surface">{rt.soldNights}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${rateSolidBg(rt.occupancyRate)}`}
                                  style={{ width: `${Math.min(100, rt.occupancyRate)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-on-surface w-11 text-right">
                                {rt.occupancyRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-title-sm text-on-surface font-semibold">{fmtCurrency(rt.revenue)}</td>
                          <td className="p-4 text-right font-title-sm text-primary font-bold">
                            <div>{fmtCurrency(rt.adr)}</div>
                            {basePrice > 0 && rt.adr > 0 && (
                              <div className={`text-[10px] font-semibold ${adrDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {adrDiff >= 0 ? `+${adrDiff.toFixed(1)}%` : `${adrDiff.toFixed(1)}%`} vs gốc
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right font-title-sm text-emerald-700 font-bold">{fmtCurrency(rt.revpar)}</td>
                          <td className="p-4 text-right font-title-sm font-semibold text-on-surface">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-surface-container-low">
                              {rt.revenueShare.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Tab Individual Room */}
            {viewTab === 'room' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border-grey text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      <th className="p-4">Số phòng</th>
                      <th className="p-4">Tầng</th>
                      <th className="p-4">Loại phòng</th>
                      <th className="p-4 text-right">Lượt đặt</th>
                      <th className="p-4 text-right">Đêm có khách</th>
                      <th className="p-4 w-36">Công suất (%)</th>
                      <th className="p-4 text-right">Tổng doanh thu</th>
                      <th className="p-4 text-right">ADR</th>
                      <th className="p-4 text-right">RevPAR</th>
                      <th className="p-4 text-right">Tỷ trọng (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-sm text-on-surface-variant">
                          Không tìm thấy phòng phù hợp với điều kiện lọc.
                        </td>
                      </tr>
                    ) : (
                      roomRows.map((r, idx) => (
                        <tr key={idx} className="border-b border-border-grey hover:bg-surface-container-low/60 transition-colors">
                          <td className="p-4 font-title-sm text-primary font-bold">
                            Phòng {r.roomNumber}
                          </td>
                          <td className="p-4 font-body-md text-on-surface-variant">
                            {r.floor ? `Tầng ${r.floor}` : '—'}
                          </td>
                          <td className="p-4 font-body-md text-on-surface font-medium">{r.roomTypeName}</td>
                          <td className="p-4 text-right font-body-md text-on-surface">{(r.bookings || 0).toLocaleString('vi-VN')}</td>
                          <td className="p-4 text-right font-body-md text-on-surface">{r.soldNights} / {r.availableNights}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${rateSolidBg(r.occupancyRate)}`}
                                  style={{ width: `${Math.min(100, r.occupancyRate)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-on-surface w-11 text-right">
                                {r.occupancyRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-title-sm text-on-surface font-bold">{fmtCurrency(r.revenue)}</td>
                          <td className="p-4 text-right font-title-sm text-primary font-semibold">{fmtCurrency(r.adr)}</td>
                          <td className="p-4 text-right font-title-sm text-emerald-700 font-semibold">{fmtCurrency(r.revpar)}</td>
                          <td className="p-4 text-right font-title-sm font-semibold text-on-surface">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-surface-container-low">
                              {r.revenueShare.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Initial Empty State */}
      {!searched && (
        <div className="py-16 text-center border border-dashed border-border-grey rounded-2xl bg-surface-container-lowest">
          <IoStatsChartOutline size={44} className="text-on-surface-variant/25 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant font-medium">
            Chọn khoảng thời gian và nhấn "Xem báo cáo" để phân tích Giá bán trung bình (ADR) và Doanh thu trên mỗi phòng (RevPAR).
          </p>
        </div>
      )}
    </div>
  );
};

export default AdrRevparReport;
