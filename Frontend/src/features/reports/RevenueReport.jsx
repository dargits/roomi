import React, { useState } from 'react';
import { IoBarChartOutline, IoCalendarOutline, IoCashOutline, IoDownloadOutline, IoGridOutline, IoLayersOutline, IoSearchOutline, IoSparklesOutline, IoTrendingUpOutline } from 'react-icons/io5';
import reportApi from '../../services/reportApi';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const GROUP_BY_OPTIONS = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'month', label: 'Theo tháng' }
];

const fmtCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtCompactCurrency = (amount) => {
  if (!amount || amount === 0) return '0 đ';
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + ' tỷ';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + ' tr';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + ' k';
  return amount + ' đ';
};

const fmtDate = (str) => {
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

/**
 * Biểu đồ Doanh thu trực quan (SVG Interactive Bar Chart)
 */
const RevenueVisualChart = ({ rows, groupBy, maxRevenue, totalRevenue }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!rows || rows.length === 0) return null;

  const chartHeight = 240;
  const paddingBottom = 40;
  const paddingTop = 24;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <IoBarChartOutline size={20} className="text-primary" />
            Biểu đồ Doanh thu ({groupBy === 'month' ? 'Theo Tháng' : 'Theo Ngày'})
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Rê chuột vào từng cột để xem chi tiết doanh thu và số lượng booking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            <IoSparklesOutline size={13} />
            Đỉnh: {fmtCompactCurrency(maxRevenue)}
          </span>
        </div>
      </div>

      {/* Interactive Bar Grid */}
      <div className="relative">
        {/* Background Guide lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-[40px] pt-[24px]">
          <div className="border-b border-border-grey/40 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">
              {fmtCompactCurrency(maxRevenue)}
            </span>
          </div>
          <div className="border-b border-border-grey/30 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">
              {fmtCompactCurrency(maxRevenue / 2)}
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
              const rev = Number(row.revenue || 0);
              const heightPct = maxRevenue > 0 ? (rev / maxRevenue) : 0;
              const barHeightPx = Math.max(heightPct * usableHeight, rev > 0 ? 6 : 2);
              const isHovered = hoveredIdx === idx;
              const dateLabel = fmtDate(row.period || row.date);

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-1 min-w-[56px] max-w-[90px] relative group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-3 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div className="bg-slate-900 text-white text-xs rounded-xl py-2 px-3 shadow-xl whitespace-nowrap text-center border border-slate-700">
                        <p className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1">{dateLabel}</p>
                        <p className="font-bold text-amber-300 text-sm">{fmtCurrency(rev)}</p>
                        <p className="text-[11px] text-slate-300 mt-0.5">{row.bookings || 0} lượt đặt phòng</p>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>
                  )}

                  {/* Revenue value label above bar */}
                  <div className="h-5 flex items-center justify-center mb-1 text-[11px] font-semibold text-primary/90 transition-opacity">
                    {rev > 0 ? fmtCompactCurrency(rev) : ''}
                  </div>

                  {/* The Bar */}
                  <div className="w-full h-[176px] flex items-end justify-center">
                    <div
                      className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 relative ${
                        rev > 0
                          ? isHovered
                            ? 'bg-gradient-to-t from-primary to-blue-400 shadow-md scale-x-105'
                            : 'bg-gradient-to-t from-primary/85 to-primary/60 hover:from-primary hover:to-primary/80'
                          : 'bg-surface-container-high'
                      }`}
                      style={{
                        height: `${barHeightPx}px`
                      }}
                    >
                      {/* Booking count pill inside bar if tall enough */}
                      {barHeightPx > 36 && (
                        <span className="absolute top-1 inset-x-0 text-center text-[10px] font-bold text-white/90">
                          {row.bookings || 0}
                        </span>
                      )}
                    </div>
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

/** Tóm tắt số liệu */
const SummaryCard = ({ label, value, sub, color = 'text-primary' }) => (
  <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 hover:shadow-xs transition-shadow">
    <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-xs mb-1 font-semibold">{label}</p>
    <p className={`font-headline-md leading-tight ${color}`}>{value}</p>
    {sub && <p className="text-xs text-on-surface-variant mt-1.5 font-medium">{sub}</p>}
  </div>
);

const RevenueReport = () => {
  const { user } = useAuth();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay  = today.toISOString().split('T')[0];

  const [from,    setFrom]    = useState(firstDay);
  const [to,      setTo]      = useState(lastDay);
  const [groupBy, setGroupBy] = useState('day');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [searched, setSearched] = useState(false);

  const hasAccess = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role);
  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
        Bạn không có quyền xem trang này.
      </div>
    );
  }

  const handleSearch = async () => {
    if (!from || !to)  { setError('Vui lòng chọn đủ khoảng thời gian.'); return; }
    if (from > to)     { setError('Ngày bắt đầu phải trước ngày kết thúc.'); return; }
    setError(null);
    setLoading(true);
    setSearched(true);
    try {
      const result = await reportApi.getRevenueReport(from, to, groupBy);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải báo cáo. Vui lòng kiểm tra kết nối.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Parse response
  const totalRevenue  = Number(data?.totalRevenue  ?? 0);
  const bookingCount  = Number(data?.bookingCount  ?? 0);
  const rows          = Array.isArray(data?.rows) ? data.rows : [];
  const avgPerBooking = bookingCount > 0 ? totalRevenue / bookingCount : 0;
  const maxRevenue    = rows.length > 0 ? Math.max(...rows.map(r => Number(r.revenue || 0))) : 0;

  // Export CSV
  const exportCSV = () => {
    if (!rows.length) return;
    const headers = ['Kỳ', 'Doanh thu (đ)', 'Số đặt phòng'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [r.period || r.day || r.month, Number(r.revenue || 0), Number(r.bookingCount || 0)].join(','))
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
            <Button onClick={handleSearch} isLoading={loading} icon={IoSearchOutline}>
              Xem báo cáo
            </Button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-primary border border-primary/40 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer bg-transparent font-medium"
              >
                <IoDownloadOutline size={14}/> Xuất CSV
              </button>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-error font-medium">{error}</p>}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant font-medium">Đang tính toán số liệu doanh thu...</p>
        </div>
      )}

      {/* ── Kết quả ── */}
      {!loading && searched && data !== null && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Tổng doanh thu thực tế"
              value={fmtCurrency(totalRevenue)}
              sub="Doanh thu từ các booking đã checkout"
              color="text-primary font-bold"
            />
            <SummaryCard
              label="Tổng lượt checkout"
              value={bookingCount.toLocaleString('vi-VN')}
              sub="Số đơn phòng hoàn tất lưu trú"
              color="text-on-surface font-bold"
            />
            <SummaryCard
              label="Doanh thu TB / lượt"
              value={bookingCount > 0 ? fmtCurrency(avgPerBooking) : '0 đ'}
              sub="Giá trị trung bình mỗi lượt khách"
              color="text-tertiary font-bold"
            />
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
                      <th className="p-4 text-right">Số booking</th>
                      <th className="p-4 text-right">Doanh thu</th>
                      <th className="p-4 w-48">Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const rev = Number(row.revenue || 0);
                      const pct = maxRevenue > 0 ? (rev / maxRevenue) * 100 : 0;
                      return (
                        <tr key={idx} className="border-b border-border-grey hover:bg-surface-container-low/60 transition-colors">
                          <td className="p-4 font-body-md text-on-surface font-medium">
                            {fmtDate(row.period || row.date)}
                          </td>
                          <td className="p-4 text-right font-body-md text-on-surface">
                            {(row.bookings || 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-4 text-right font-title-sm text-primary font-bold">
                            {fmtCurrency(rev)}
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
                      <td className="p-4 text-right font-title-lg text-primary">{fmtCurrency(totalRevenue)}</td>
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
