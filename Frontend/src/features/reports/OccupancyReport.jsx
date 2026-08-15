import React, { useState } from 'react';
import { IoBarChartOutline, IoCalendarOutline, IoDownloadOutline, IoGridOutline, IoPricetagOutline, IoSearchOutline, IoSparklesOutline } from 'react-icons/io5';
import reportApi from '../../services/reportApi';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const fmtDate = (str) => {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return new Date(str).toLocaleDateString('vi-VN');
};

const parseRate = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
};

const rateColor = (pct) => {
  if (pct >= 80) return 'from-emerald-500 to-teal-400';
  if (pct >= 50) return 'from-primary to-blue-400';
  if (pct >= 30) return 'from-amber-500 to-yellow-400';
  return 'from-rose-500 to-red-400';
};

const rateSolidBg = (pct) => {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-primary';
  if (pct >= 30) return 'bg-amber-500';
  return 'bg-rose-500';
};

/**
 * Biểu đồ Công suất phòng trực quan (SVG Interactive Occupancy Chart)
 */
const OccupancyVisualChart = ({ rows, overallRate }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!rows || rows.length === 0) return null;

  const chartHeight = 220;
  const paddingBottom = 40;
  const paddingTop = 20;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <IoBarChartOutline size={20} className="text-primary" />
            Biểu đồ Công suất Phòng theo Ngày (%)
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Rê chuột vào cột để xem số phòng có khách và tỷ lệ lấp đầy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> &gt;80%
            <span className="w-2.5 h-2.5 rounded-full bg-primary ml-2" /> 50-80%
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" /> &lt;50%
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Background Guide lines (0%, 50%, 100%) */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-[40px] pt-[20px]">
          <div className="border-b border-border-grey/40 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">100%</span>
          </div>
          <div className="border-b border-dashed border-border-grey/50 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">50%</span>
          </div>
          <div className="border-b border-border-grey/60 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">0%</span>
          </div>
        </div>

        {/* Bars Container */}
        <div className="overflow-x-auto scrollbar-thin pb-2 pt-2 relative z-10">
          <div
            className="flex items-end gap-3 md:gap-4 min-w-fit px-4"
            style={{ height: `${chartHeight}px` }}
          >
            {rows.map((row, idx) => {
              const rate = parseRate(row.occupancyRate);
              const barHeightPx = Math.max((rate / 100) * usableHeight, rate > 0 ? 6 : 2);
              const isHovered = hoveredIdx === idx;
              const dateLabel = fmtDate(row.date);

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-1 min-w-[50px] max-w-[80px] relative group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-3 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div className="bg-slate-900 text-white text-xs rounded-xl py-2 px-3 shadow-xl whitespace-nowrap text-center border border-slate-700">
                        <p className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1">{dateLabel}</p>
                        <p className="font-bold text-emerald-400 text-sm">{rate.toFixed(1)}%</p>
                        <p className="text-[11px] text-slate-300 mt-0.5">{row.occupiedRooms || 0} / {row.availableRooms || 0} phòng có khách</p>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>
                  )}

                  {/* Rate label above bar */}
                  <div className="h-5 flex items-center justify-center mb-1 text-[11px] font-semibold text-on-surface transition-opacity">
                    {rate > 0 ? `${rate.toFixed(0)}%` : ''}
                  </div>

                  {/* The Bar */}
                  <div className="w-full h-[160px] flex items-end justify-center">
                    <div
                      className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 relative ${
                        rate > 0
                          ? `bg-gradient-to-t ${rateColor(rate)} shadow-xs ${isHovered ? 'scale-x-110 shadow-md' : ''}`
                          : 'bg-surface-container-high'
                      }`}
                      style={{
                        height: `${barHeightPx}px`
                      }}
                    />
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

const SummaryCard = ({ label, value, sub, color = 'text-on-surface' }) => (
  <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 hover:shadow-xs transition-shadow">
    <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-xs mb-1 font-semibold">{label}</p>
    <p className={`font-headline-md leading-tight ${color}`}>{value ?? '—'}</p>
    {sub && <p className="text-xs text-on-surface-variant mt-1.5 font-medium">{sub}</p>}
  </div>
);

const OccupancyReport = () => {
  const { user } = useAuth();

  const today    = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay  = today.toISOString().split('T')[0];

  const [from,     setFrom]     = useState(firstDay);
  const [to,       setTo]       = useState(lastDay);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [searched, setSearched] = useState(false);

  const hasAccess = ['OWNER', 'ADMIN'].includes(user?.role);
  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
        Chỉ Chủ cơ sở mới có quyền xem trang này.
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
      const result = await reportApi.getOccupancyReport(from, to);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải báo cáo. Vui lòng kiểm tra kết nối.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const overallRate  = parseRate(data?.occupancyRate);
  const totalRooms   = data?.totalRooms   ?? null;
  const totalNights  = data?.totalRoomNights ?? null;
  const rows         = Array.isArray(data?.rows) ? data.rows : [];

  // Export CSV
  const exportCSV = () => {
    if (!rows.length) return;
    const headers = ['Ngày', 'Tổng phòng', 'Phòng đã sử dụng', 'Công suất (%)'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [r.date || r.period, r.totalRooms || totalRooms, r.occupiedRooms, (parseRate(r.occupancyRate)).toFixed(2)].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-cong-suat_${from}_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ── Filter ── */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs">
        <h3 className="font-title-lg text-on-surface mb-4 flex items-center gap-2">
          <IoBarChartOutline size={20} className="text-primary" />
          Bộ lọc báo cáo công suất phòng
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Input label="Từ ngày" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <Input label="Đến ngày" type="date" value={to} onChange={e => setTo(e.target.value)} />
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
          <p className="text-sm text-on-surface-variant font-medium">Đang tổng hợp số liệu công suất phòng...</p>
        </div>
      )}

      {/* ── Kết quả ── */}
      {!loading && searched && data !== null && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 hover:shadow-xs transition-shadow">
              <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-xs mb-1 font-semibold">Công suất trung bình</p>
              {overallRate != null ? (
                <>
                  <p className="font-headline-md text-primary leading-tight font-bold">{overallRate.toFixed(1)}%</p>
                  <div className="mt-3 w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${rateSolidBg(overallRate)}`}
                      style={{ width: `${Math.min(100, overallRate)}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="font-headline-md text-on-surface">—</p>
              )}
            </div>
            <SummaryCard label="Tổng số phòng cơ sở"   value={totalRooms} sub="Quy mô phòng hiện tại" />
            <SummaryCard label="Tổng đêm phòng có khách" value={totalNights?.toLocaleString('vi-VN')} sub="Số lượt đêm phát sinh lưu trú" />
          </div>

          {/* Visual Occupancy Chart */}
          <OccupancyVisualChart rows={rows} overallRate={overallRate} />

          {/* Table */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border-grey flex items-center justify-between">
              <h3 className="font-title-lg text-on-surface flex items-center gap-2">
                <IoGridOutline size={18} className="text-primary" />
                Chi tiết công suất theo ngày
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant">
                {rows.length} ngày
              </span>
            </div>

            {rows.length === 0 ? (
              <div className="py-14 text-center">
                <IoPricetagOutline size={40} className="text-on-surface-variant/25 mx-auto mb-3" />
                <p className="text-sm text-on-surface-variant font-medium">Không có dữ liệu chi tiết trong khoảng ngày này.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border-grey text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      <th className="p-4">Ngày</th>
                      <th className="p-4 text-right">Tổng phòng</th>
                      <th className="p-4 text-right">Phòng có khách</th>
                      <th className="p-4 w-56">Công suất (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const rate = parseRate(row.occupancyRate);
                      return (
                        <tr key={idx} className="border-b border-border-grey hover:bg-surface-container-low/60 transition-colors">
                          <td className="p-4 font-body-md text-on-surface font-medium">{fmtDate(row.date)}</td>
                          <td className="p-4 text-right font-body-md text-on-surface">
                            {row.availableRooms ?? '—'}
                          </td>
                          <td className="p-4 text-right font-body-md text-on-surface font-semibold text-primary">
                            {row.occupiedRooms ?? '—'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${rateSolidBg(rate)}`}
                                  style={{ width: `${Math.min(100, rate)}%` }}
                                />
                              </div>
                              <span className="font-title-sm text-on-surface w-14 text-right tabular-nums font-bold">
                                {rate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!searched && (
        <div className="py-16 text-center border border-dashed border-border-grey rounded-2xl bg-surface-container-lowest">
          <IoPricetagOutline size={44} className="text-on-surface-variant/25 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant font-medium">Chọn khoảng thời gian và nhấn "Xem báo cáo" để theo dõi công suất phòng.</p>
        </div>
      )}
    </div>
  );
};

export default OccupancyReport;
