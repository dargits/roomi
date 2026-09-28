import React, { useState, useEffect, useRef } from 'react';
import {
  IoBarChartOutline,
  IoCashOutline,
  IoDownloadOutline,
  IoGridOutline,
  IoSearchOutline,
  IoSparklesOutline,
  IoTrendingUpOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoCalendarOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';
import reportApi from '../../services/reportApi';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import { RevenueReportResponse, RevenueReportRow } from '../../types';

const GROUP_BY_OPTIONS = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'month', label: 'Theo tháng' }
];

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtCompactCurrency = (amount?: number) => {
  if (!amount || amount <= 0) return '0 đ';
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return (val >= 10 ? val.toFixed(1) : val.toFixed(2)).replace(/\.0$/, '') + ' tỷ';
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return (val >= 10 ? val.toFixed(1) : val.toFixed(1)).replace(/\.0$/, '') + ' tr';
  }
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + ' k';
  return amount.toLocaleString('vi-VN') + ' đ';
};

const fmtShortDate = (str?: string, groupBy: string = 'day') => {
  if (!str) return '';
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split('-');
    return `T${m}/${y.slice(2)}`;
  }
  const parts = str.split('-');
  if (parts.length === 3) {
    return groupBy === 'day' ? `${parts[2]}/${parts[1]}` : `${parts[1]}/${parts[0].slice(2)}`;
  }
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtDayOfWeek = (str?: string) => {
  if (!str || /^\d{4}-\d{2}$/.test(str)) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[d.getDay()] || '';
  }
  return '';
};

const fmtFullDate = (str?: string) => {
  if (!str) return '';
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split('-');
    return `Tháng ${m}/${y}`;
  }
  const parts = str.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayOfWeek = dayNames[d.getDay()] || '';
    return `${dayOfWeek}, ${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return new Date(str).toLocaleDateString('vi-VN');
};

const fmtDate = fmtFullDate;

/**
 * Biểu đồ Doanh thu trực quan (Interactive Bar Chart với Trục Y độc lập & Thanh chi tiết thông minh)
 */
const RevenueVisualChart: React.FC<{
  rows: RevenueReportRow[];
  groupBy: string;
  maxRevenue: number;
  totalRevenue: number;
}> = ({ rows, groupBy, maxRevenue, totalRevenue }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!rows || rows.length === 0) return null;

  const validRows = rows.map(r => {
    const rev = Number(r.revenue || 0);
    const penalty = Number(r.penaltyRevenue || 0);
    const totalRowRev = rev + penalty;
    const sRev = Number(r.serviceRevenue || 0);
    const rRev = r.roomRevenue !== undefined ? Number(r.roomRevenue) : Math.max(0, rev - sRev);
    return {
      ...r,
      totalRowRev,
      rRev,
      sRev,
      penalty,
      bookings: Number(r.bookings || 0)
    };
  });

  const count = validRows.length;
  const avgRevenue = count > 0 ? totalRevenue / count : 0;
  const peakRow = validRows.reduce((max, r) => r.totalRowRev > (max?.totalRowRev || 0) ? r : max, validRows[0]);
  const activeRow = hoveredIdx !== null ? validRows[hoveredIdx] : null;

  // Thang đo trục Y: tối thiểu 100k
  const effectiveMax = Math.max(maxRevenue, 100_000);
  const ySteps = [1.0, 0.75, 0.5, 0.25, 0];
  const chartPlotHeight = 210;

  // Vị trí đường trung bình (%)
  const avgPct = Math.min(100, Math.max(0, (avgRevenue / effectiveMax) * 100));

  const handleScroll = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-grey/70 pb-4">
        <div>
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <IoBarChartOutline size={20} className="text-primary" />
            Biểu đồ Doanh thu ({groupBy === 'month' ? 'Theo Tháng' : 'Theo Ngày'})
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Phân tích biến động doanh thu phòng, phụ thu dịch vụ và phí phạt
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {peakRow && peakRow.totalRowRev > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
              <IoSparklesOutline size={13} className="text-violet-600" />
              Đỉnh: {fmtCompactCurrency(peakRow.totalRowRev)} ({fmtShortDate(peakRow.period || peakRow.date, groupBy)})
            </span>
          )}
          {avgRevenue > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <IoTrendingUpOutline size={13} className="text-amber-600" />
              TB: {fmtCompactCurrency(avgRevenue)}/{groupBy === 'month' ? 'tháng' : 'ngày'}
            </span>
          )}

          {/* Nút cuộn nhanh khi danh sách ngày dài */}
          {count > 10 && (
            <div className="flex items-center gap-1 pl-1">
              <button
                type="button"
                onClick={() => handleScroll(-260)}
                className="w-7 h-7 rounded-lg border border-border-grey hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                title="Cuộn sang trái"
              >
                <IoChevronBackOutline size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleScroll(260)}
                className="w-7 h-7 rounded-lg border border-border-grey hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                title="Cuộn sang phải"
              >
                <IoChevronForwardOutline size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Info Banner (Thanh thông tin tương tác thời gian thực) */}
      <div className="transition-all duration-200 min-h-[52px]">
        {activeRow ? (
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3 sm:px-4 sm:py-2.5 rounded-xl shadow-md border border-indigo-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-sky-200 font-semibold bg-sky-900/60 px-2.5 py-1 rounded-lg border border-sky-700/50">
                <IoCalendarOutline size={13} />
                {fmtFullDate(activeRow.period || activeRow.date)}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-slate-300">Tổng thu:</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400">
                  {fmtCurrency(activeRow.totalRowRev)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 text-xs flex-wrap border-t md:border-t-0 border-indigo-900/80 pt-1.5 md:pt-0">
              <span className="text-slate-300">
                Phòng: <strong className="text-white">{fmtCurrency(activeRow.rRev)}</strong>
              </span>
              {activeRow.sRev > 0 && (
                <span className="text-emerald-300">
                  Dịch vụ: <strong>{fmtCurrency(activeRow.sRev)}</strong>
                </span>
              )}
              {activeRow.penalty > 0 && (
                <span className="text-amber-300">
                  Phạt/hủy: <strong>{fmtCurrency(activeRow.penalty)}</strong>
                </span>
              )}
              <span className="text-sky-300 font-medium bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800/50">
                {activeRow.bookings} lượt đặt
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-low/70 border border-border-grey/70 p-3 sm:px-4 sm:py-2.5 rounded-xl text-xs text-on-surface-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <IoInformationCircleOutline size={16} className="text-primary shrink-0" />
              <span>Rê chuột vào từng cột để xem chi tiết doanh thu phòng, phụ thu dịch vụ và lượt booking tương ứng.</span>
            </div>
            <div className="font-medium text-on-surface shrink-0">
              Tổng cộng kỳ: <strong className="text-primary">{fmtCurrency(totalRevenue)}</strong> ({count} mốc)
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Chart Canvas: Trục Y cố định bên trái + Khu vực cột cuộn ngang */}
      <div className="flex items-stretch border border-border-grey/70 rounded-xl bg-surface-container-lowest overflow-hidden pt-4 pb-2 px-1 sm:px-3">
        {/* Cột trục Y độc lập (luôn hiển thị rõ, không bị cột đè) */}
        <div
          className="w-14 sm:w-16 shrink-0 flex flex-col justify-between text-right pr-2.5 select-none border-r border-border-grey/60 relative"
          style={{ height: `${chartPlotHeight}px`, marginBottom: '44px' }}
        >
          {ySteps.map((step, idx) => (
            <span
              key={idx}
              className="text-[10px] sm:text-[11px] font-mono font-medium text-on-surface-variant/75 -mt-2.5 tracking-tight"
            >
              {fmtCompactCurrency(effectiveMax * step)}
            </span>
          ))}
        </div>

        {/* Khu vực cuộn ngang các cột */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border-grey relative pl-3 sm:pl-5 select-none"
        >
          {/* Các đường lưới ngang nét đứt */}
          <div
            className="absolute inset-x-0 top-0 flex flex-col justify-between pointer-events-none"
            style={{ height: `${chartPlotHeight}px` }}
          >
            {ySteps.map((_, idx) => (
              <div
                key={idx}
                className={`w-full ${
                  idx === ySteps.length - 1
                    ? 'border-b border-border-grey/80'
                    : 'border-b border-dashed border-border-grey/40'
                }`}
              />
            ))}
          </div>

          {/* Đường trung bình nét đứt (Average Line) */}
          {avgRevenue > 0 && (
            <div
              className="absolute inset-x-0 border-b-2 border-dashed border-amber-400/80 pointer-events-none z-10 flex items-center justify-end pr-3"
              style={{ bottom: `calc(44px + ${avgPct}%)` }}
            >
              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 shadow-2xs -mt-5">
                TB: {fmtCompactCurrency(avgRevenue)}
              </span>
            </div>
          )}

          {/* Danh sách các cột biểu đồ */}
          <div className="flex items-end gap-2 sm:gap-3.5 min-w-fit pr-6 relative z-20">
            {validRows.map((r, idx) => {
              const heightPct = effectiveMax > 0 ? r.totalRowRev / effectiveMax : 0;
              const barHeightPx = Math.max(heightPct * chartPlotHeight, r.totalRowRev > 0 ? 6 : 2);
              const isHovered = hoveredIdx === idx;
              const isPeak = peakRow && peakRow.totalRowRev > 0 && r.totalRowRev === peakRow.totalRowRev;
              const shortDate = fmtShortDate(r.period || r.date, groupBy);
              const dayOfWeek = fmtDayOfWeek(r.period || r.date);
              const isWeekend = dayOfWeek === 'T7' || dayOfWeek === 'CN';

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center w-11 sm:w-13 shrink-0 cursor-pointer group transition-transform"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Nhãn doanh thu trên đầu cột */}
                  <div className="h-6 flex items-center justify-center text-center w-full">
                    <span
                      className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap px-1 rounded transition-all ${
                        isHovered
                          ? 'text-primary font-bold bg-primary/10 scale-105'
                          : isPeak
                            ? 'text-violet-700 font-bold'
                            : 'text-on-surface-variant/90'
                      }`}
                    >
                      {r.totalRowRev > 0 ? fmtCompactCurrency(r.totalRowRev) : '0'}
                    </span>
                  </div>

                  {/* Thân cột biểu đồ (đã loại bỏ số 5, 4 gây hiểu lầm) */}
                  <div
                    className="w-full flex items-end justify-center"
                    style={{ height: `${chartPlotHeight}px` }}
                  >
                    <div
                      className={`w-full max-w-[28px] sm:max-w-[34px] rounded-t-md transition-all duration-200 relative ${
                        r.totalRowRev > 0
                          ? isHovered
                            ? 'bg-gradient-to-t from-primary to-sky-400 shadow-md ring-2 ring-primary/40 -translate-y-1'
                            : isPeak
                              ? 'bg-gradient-to-t from-violet-600 to-indigo-400 hover:from-violet-500 hover:to-indigo-300'
                              : 'bg-gradient-to-t from-primary/90 to-primary/65 hover:from-primary hover:to-primary/80'
                          : 'bg-surface-container-high h-[3px]'
                      }`}
                      style={{ height: `${barHeightPx}px` }}
                    >
                      {/* Huy hiệu Đỉnh cho ngày cao nhất */}
                      {isPeak && r.totalRowRev > 0 && (
                        <span className="absolute -top-3.5 inset-x-0 text-center text-[8px] font-bold text-violet-700 uppercase tracking-tighter">
                          ★
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trục hoành: Nhãn ngày tháng gọn gàng, không bao giờ bị cắt chữ */}
                  <div className="mt-2 text-center w-full" style={{ height: '36px' }}>
                    <p
                      className={`text-[11px] font-semibold leading-tight tracking-tight ${
                        isHovered
                          ? 'text-primary font-bold'
                          : isWeekend
                            ? 'text-amber-800'
                            : 'text-on-surface'
                      }`}
                    >
                      {shortDate}
                    </p>
                    {groupBy === 'day' && dayOfWeek && (
                      <p
                        className={`text-[9px] font-medium leading-tight mt-0.5 ${
                          isWeekend ? 'text-amber-600 font-bold' : 'text-on-surface-variant/70'
                        }`}
                      >
                        {dayOfWeek}
                      </p>
                    )}
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

/** Tóm tắt số liệu */
const SummaryCard: React.FC<{ label: string; value?: string | number; sub?: string; color?: string }> = ({
  label,
  value,
  sub,
  color = 'text-primary'
}) => (
  <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 hover:shadow-xs transition-shadow">
    <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-xs mb-1 font-semibold">{label}</p>
    <p className={`font-headline-md leading-tight ${color}`}>{value}</p>
    {sub && <p className="text-xs text-on-surface-variant mt-1.5 font-medium">{sub}</p>}
  </div>
);

const RevenueReport: React.FC = () => {
  const { user } = useAuth();

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay  = formatLocalDate(today);

  const [from,    setFrom]    = useState(firstDay);
  const [to,      setTo]      = useState(lastDay);
  const [groupBy, setGroupBy] = useState('day');
  const [data,    setData]    = useState<RevenueReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const hasAccess = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role || '');

  const handleSearch = async (overrideFrom?: string, overrideTo?: string, overrideGroup?: string) => {
    const qFrom = overrideFrom ?? from;
    const qTo = overrideTo ?? to;
    const qGroup = overrideGroup ?? groupBy;
    if (!qFrom || !qTo)  { setError('Vui lòng chọn đủ khoảng thời gian.'); return; }
    if (qFrom > qTo)     { setError('Ngày bắt đầu phải trước ngày kết thúc.'); return; }
    setError(null);
    setLoading(true);
    setSearched(true);
    try {
      const result = await reportApi.getRevenueReport(qFrom, qTo, qGroup);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải báo cáo. Vui lòng kiểm tra kết nối.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      handleSearch(firstDay, lastDay, 'day');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
        Bạn không có quyền xem trang này.
      </div>
    );
  }

  // Parse response
  const totalRevenue     = Number(data?.totalRevenue     ?? 0);
  const serviceRevenue   = Number(data?.serviceRevenue   ?? 0);
  const roomRevenue      = Number(data?.roomRevenue      ?? (totalRevenue - serviceRevenue));
  const penaltyRevenue   = Number(data?.penaltyRevenue   ?? 0);
  const grandTotal       = Number(data?.grandTotal       ?? (totalRevenue + penaltyRevenue));
  const collectedRevenue = Number(data?.collectedRevenue ?? 0);
  const debtRevenue      = Number(data?.debtRevenue      ?? 0);
  const bookingCount     = Number(data?.bookingCount     ?? 0);
  const rows             = Array.isArray(data?.rows) ? data.rows : [];
  const maxRevenue       = rows.length > 0 ? Math.max(...rows.map(r => Number(r.revenue || 0) + Number(r.penaltyRevenue || 0))) : 0;

  // Export CSV
  const exportCSV = () => {
    if (!rows.length) return;
    const headers = ['Kỳ', 'Lượt đặt', 'Doanh thu phòng (đ)', 'Dịch vụ phụ thu (đ)', 'Phí hủy & Cọc phạt (đ)', 'Tổng cộng (đ)'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => {
        const totalRowRev = Number(r.revenue || 0);
        const sRev = Number(r.serviceRevenue || 0);
        const rRev = r.roomRevenue !== undefined ? Number(r.roomRevenue) : Math.max(0, totalRowRev - sRev);
        const penalty = Number(r.penaltyRevenue || 0);
        return [r.period || r.date, Number(r.bookings || 0), rRev, sRev, penalty, totalRowRev + penalty].join(',');
      }),
      ['Tổng cộng', bookingCount, roomRevenue, serviceRevenue, penaltyRevenue, grandTotal].join(',')
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-doanh-thu_${from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ── Filter ── */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs">
        <h3 className="font-title-lg text-on-surface mb-4 flex items-center gap-2">
          <IoCashOutline size={20} className="text-primary" />
          Bộ lọc báo cáo doanh thu
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <Input label="Từ ngày" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <Input label="Đến ngày" type="date" value={to} onChange={e => setTo(e.target.value)} />
          <Select
            label="Nhóm theo"
            options={GROUP_BY_OPTIONS}
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleSearch()} isLoading={loading} icon={IoSearchOutline}>
              Xem báo cáo
            </Button>
            {rows.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={exportCSV}
                icon={IoDownloadOutline}
              >
                Xuất CSV
              </Button>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-error font-medium">{error}</p>}
      </div>

      {/* ── Loading ── */}
      {loading && <LoadingScreen message="Đang tính toán số liệu doanh thu..." />}

      {/* ── Kết quả ── */}
      {!loading && searched && data !== null && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard
              label="Tổng thực thu toàn bộ"
              value={fmtCurrency(grandTotal)}
              sub="Bao gồm phòng + dịch vụ + phạt cọc"
              color="text-primary font-bold"
            />
            <SummaryCard
              label="Doanh thu tiền phòng"
              value={fmtCurrency(roomRevenue)}
              sub="Từ tiền thuê các phòng đã checkout"
              color="text-on-surface font-bold"
            />
            <SummaryCard
              label="Dịch vụ phụ thu"
              value={fmtCurrency(serviceRevenue)}
              sub="Minibar, nước uống, giặt ủi..."
              color="text-emerald-700 font-bold"
            />
            <SummaryCard
              label="Phí hủy & Phạt cọc"
              value={fmtCurrency(penaltyRevenue)}
              sub="Thu từ no-show và hủy phòng"
              color="text-amber-700 font-bold"
            />
            <SummaryCard
              label="Tổng lượt checkout"
              value={bookingCount.toLocaleString('vi-VN')}
              sub="Số đơn phòng hoàn tất lưu trú"
              color="text-tertiary font-bold"
            />
          </div>

          {/* Revenue Breakdown & Cash Flow Reconciliation Table (P1-03) */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs">
            <h4 className="font-title-md text-on-surface mb-3 flex items-center gap-2">
              <IoCashOutline size={18} className="text-primary" />
              Bảng Tổng hợp Cấu trúc Doanh thu & Dòng tiền
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-border-grey rounded-xl overflow-hidden text-sm">
                <div className="bg-surface-container-low px-4 py-2.5 font-semibold text-on-surface text-xs uppercase tracking-wider border-b border-border-grey">
                  Cơ cấu Doanh thu Ghi nhận
                </div>
                <div className="divide-y divide-border-grey">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-on-surface-variant">Doanh thu phòng:</span>
                    <span className="font-medium text-on-surface">{fmtCurrency(roomRevenue)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-on-surface-variant">Doanh thu dịch vụ phụ thu:</span>
                    <span className="font-medium text-emerald-700">{fmtCurrency(serviceRevenue)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 bg-surface-container-low/40 font-semibold">
                    <span className="text-on-surface">Tổng doanh thu lưu trú:</span>
                    <span className="text-on-surface">{fmtCurrency(totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-amber-700">
                    <span className="font-medium">+ Phí hủy / Tiền cọc phạt:</span>
                    <span className="font-semibold">{fmtCurrency(penaltyRevenue)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-primary/5 text-primary font-bold text-base border-t-2 border-primary/20">
                    <span>TỔNG CỘNG THỰC THU:</span>
                    <span>{fmtCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-border-grey rounded-xl overflow-hidden text-sm">
                <div className="bg-surface-container-low px-4 py-2.5 font-semibold text-on-surface text-xs uppercase tracking-wider border-b border-border-grey">
                  Thực tế Dòng tiền Đã thu / Nợ
                </div>
                <div className="divide-y divide-border-grey">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-on-surface-variant">Đã thanh toán (Thực thu):</span>
                    <span className="font-semibold text-emerald-700">{fmtCurrency(collectedRevenue)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-on-surface-variant">Còn nợ / Công nợ chưa thu:</span>
                    <span className="font-semibold text-error">{fmtCurrency(debtRevenue)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 bg-surface-container-low/40">
                    <span className="text-on-surface-variant">Tỷ lệ thu hồi công nợ:</span>
                    <span className="font-bold text-on-surface">
                      {grandTotal > 0 ? ((collectedRevenue / grandTotal) * 100).toFixed(1) + '%' : '100%'}
                    </span>
                  </div>
                  <div className="p-3 text-xs text-on-surface-variant leading-relaxed bg-surface-container-lowest">
                    💡 <em>Lưu ý:</em> Dữ liệu bao gồm các khoản doanh thu lưu trú phòng, chi phí minibar/giặt ủi, và các khoản phí phạt cọc/hủy phòng đã được tính vào hệ thống tài chính.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Interactive Bar Chart */}
          <RevenueVisualChart
            rows={rows}
            groupBy={groupBy}
            maxRevenue={maxRevenue}
            totalRevenue={totalRevenue}
          />

          {/* Detail table */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border-grey flex items-center justify-between">
              <h3 className="font-title-lg text-on-surface flex items-center gap-2">
                <IoGridOutline size={18} className="text-primary" />
                Chi tiết dữ liệu ({groupBy === 'month' ? 'Theo Tháng' : 'Theo Ngày'})
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant">
                {rows.length} mốc thời gian
              </span>
            </div>

            {rows.length === 0 ? (
              <div className="py-14 text-center">
                <IoTrendingUpOutline size={40} className="text-on-surface-variant/25 mx-auto mb-3" />
                <p className="text-sm text-on-surface-variant font-medium">
                  Không có booking nào đã checkout trong khoảng thời gian này.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border-grey text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      <th className="p-4">Thời gian</th>
                      <th className="p-4 text-right">Lượt đặt</th>
                      <th className="p-4 text-right">Tiền phòng</th>
                      <th className="p-4 text-right">Dịch vụ phụ thu</th>
                      <th className="p-4 text-right">Phí hủy & Cọc phạt</th>
                      <th className="p-4 text-right">Tổng cộng</th>
                      <th className="p-4 w-36">Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const totalRowRev = Number(row.revenue || 0);
                      const sRev = Number(row.serviceRevenue || 0);
                      const rRev = row.roomRevenue !== undefined ? Number(row.roomRevenue) : Math.max(0, totalRowRev - sRev);
                      const penalty = Number(row.penaltyRevenue || 0);
                      const rowTotal = totalRowRev + penalty;
                      const pct = maxRevenue > 0 ? (rowTotal / maxRevenue) * 100 : 0;
                      return (
                        <tr key={idx} className="border-b border-border-grey hover:bg-surface-container-low/60 transition-colors">
                          <td className="p-4 font-body-md text-on-surface font-medium">
                            {fmtDate(row.period || row.date)}
                          </td>
                          <td className="p-4 text-right font-body-md text-on-surface">
                            {(row.bookings || 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-4 text-right font-title-sm text-on-surface font-medium">
                            {fmtCurrency(rRev)}
                          </td>
                          <td className="p-4 text-right font-title-sm text-emerald-700 font-medium">
                            {sRev > 0 ? fmtCurrency(sRev) : <span className="text-on-surface-variant/50">—</span>}
                          </td>
                          <td className="p-4 text-right font-title-sm font-semibold">
                            {penalty > 0 ? (
                              <span className="text-amber-700">{fmtCurrency(penalty)}</span>
                            ) : (
                              <span className="text-on-surface-variant/50">—</span>
                            )}
                          </td>
                          <td className="p-4 text-right font-title-sm text-primary font-bold">
                            {fmtCurrency(rowTotal)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-on-surface-variant w-10 text-right">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-container-low/80 border-t-2 border-border-grey font-bold">
                      <td className="p-4 font-title-sm text-on-surface">Tổng cộng</td>
                      <td className="p-4 text-right font-title-sm text-on-surface">{bookingCount.toLocaleString('vi-VN')}</td>
                      <td className="p-4 text-right font-title-sm text-on-surface">{fmtCurrency(roomRevenue)}</td>
                      <td className="p-4 text-right font-title-sm text-emerald-700">{serviceRevenue > 0 ? fmtCurrency(serviceRevenue) : '—'}</td>
                      <td className="p-4 text-right font-title-sm text-amber-700">
                        {penaltyRevenue > 0 ? fmtCurrency(penaltyRevenue) : '—'}
                      </td>
                      <td className="p-4 text-right font-title-lg text-primary">{fmtCurrency(grandTotal)}</td>
                      <td className="p-4" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!searched && (
        <div className="py-16 text-center border border-dashed border-border-grey rounded-2xl bg-surface-container-lowest">
          <IoTrendingUpOutline size={44} className="text-on-surface-variant/25 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant font-medium">Chọn khoảng thời gian và nhấn "Xem báo cáo" để phân tích doanh thu.</p>
        </div>
      )}
    </div>
  );
};

export default RevenueReport;
