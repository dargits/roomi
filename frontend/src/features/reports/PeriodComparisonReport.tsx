import React, { useState, useEffect, useMemo } from 'react';
import {
  IoCalendarOutline,
  IoDownloadOutline,
  IoTrendingUpOutline,
  IoTrendingDownOutline,
  IoStatsChartOutline,
  IoSparklesOutline,
  IoBedOutline,
  IoSearchOutline,
  IoInformationCircleOutline,
  IoCheckmarkCircleOutline,
  IoSwapHorizontalOutline,
  IoFlashOutline
} from 'react-icons/io5';
import reportApi from '../../services/reportApi';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import {
  PeriodComparisonReportResponse,
  PeriodComparisonType,
  CompareTargetType,
  ComparisonTimelinePoint,
  RoomTypeComparisonDto
} from '../../types';

const PERIOD_PRESETS = [
  { id: 'this_month', label: 'Tháng này', type: 'month' as PeriodComparisonType },
  { id: 'last_month', label: 'Tháng trước', type: 'month' as PeriodComparisonType },
  { id: 'this_quarter', label: 'Quý này', type: 'quarter' as PeriodComparisonType },
  { id: 'this_year', label: 'Năm nay', type: 'year' as PeriodComparisonType },
  { id: 'custom', label: 'Tùy chọn ngày', type: 'custom' as PeriodComparisonType }
];

const TARGET_OPTIONS = [
  { value: 'both', label: 'So sánh cả 2 kỳ (Liền trước & Cùng kỳ năm ngoái)' },
  { value: 'previous_period', label: 'Chỉ kỳ liền trước (PoP / MoM)' },
  { value: 'same_period_last_year', label: 'Chỉ cùng kỳ năm trước (YoY)' }
];

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtCompactCurrency = (amount?: number) => {
  if (!amount || amount === 0) return '0 đ';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} tr`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)} k`;
  return `${amount} đ`;
};

const fmtDate = (str?: string) => {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
};

const formatLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper tính ngày mặc định
const getDefaultDates = (preset: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (preset === 'this_month') {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      from: formatLocalDate(firstDay),
      to: formatLocalDate(lastDay),
      periodType: 'month' as PeriodComparisonType
    };
  }
  if (preset === 'last_month') {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return {
      from: formatLocalDate(firstDay),
      to: formatLocalDate(lastDay),
      periodType: 'month' as PeriodComparisonType
    };
  }
  if (preset === 'this_quarter') {
    const qStartMonth = Math.floor(month / 3) * 3;
    const firstDay = new Date(year, qStartMonth, 1);
    const lastDay = new Date(year, qStartMonth + 3, 0);
    return {
      from: formatLocalDate(firstDay),
      to: formatLocalDate(lastDay),
      periodType: 'quarter' as PeriodComparisonType
    };
  }
  if (preset === 'this_year') {
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      periodType: 'year' as PeriodComparisonType
    };
  }
  // Mặc định 30 ngày gần nhất
  const past30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  return {
    from: formatLocalDate(past30),
    to: formatLocalDate(now),
    periodType: 'custom' as PeriodComparisonType
  };
};

/**
 * Component hiển thị Badge tăng trưởng (+ / -)
 */
const DeltaBadge: React.FC<{
  rate: number;
  diff?: number | string;
  isPts?: boolean;
  prefix?: string;
  className?: string;
}> = ({ rate, diff, isPts = false, prefix = '', className = '' }) => {
  const isPositive = rate > 0 || (typeof diff === 'number' && diff > 0);
  const isNeutral = rate === 0 && (!diff || diff === 0);

  if (isNeutral) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant ${className}`}>
        <span>0.0{isPts ? '%pts' : '%'}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
      } ${className}`}
    >
      {isPositive ? <IoTrendingUpOutline size={13} className="stroke-[2.5]" /> : <IoTrendingDownOutline size={13} className="stroke-[2.5]" />}
      <span>
        {prefix}
        {isPositive ? '+' : ''}
        {rate.toFixed(1)}
        {isPts ? '%pts' : '%'}
      </span>
      {diff !== undefined && diff !== null && (
        <span className="opacity-80 text-[10px]">
          ({typeof diff === 'number' ? (diff > 0 ? `+${fmtCompactCurrency(diff)}` : fmtCompactCurrency(diff)) : diff})
        </span>
      )}
    </span>
  );
};

/**
 * Biểu đồ so sánh tiến trình đa đường (Multi-line Timeline Chart)
 */
const MultiPeriodTimelineChart: React.FC<{
  timeline: ComparisonTimelinePoint[];
  currentLabel: string;
  previousLabel: string;
  yoyLabel: string;
  compareTarget: CompareTargetType;
}> = ({ timeline, currentLabel, previousLabel, yoyLabel, compareTarget }) => {
  const [metricMode, setMetricMode] = useState<'revenue' | 'occupancy'>('revenue');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!timeline || timeline.length === 0) return null;

  const showPrev = compareTarget === 'both' || compareTarget === 'previous_period';
  const showYoy = compareTarget === 'both' || compareTarget === 'same_period_last_year';

  const chartHeight = 260;
  const paddingBottom = 40;
  const paddingTop = 20;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  // Tính giá trị lớn nhất theo metric đang chọn
  let maxVal = 1;
  if (metricMode === 'revenue') {
    timeline.forEach(p => {
      if (p.currentRevenue > maxVal) maxVal = p.currentRevenue;
      if (showPrev && p.previousRevenue > maxVal) maxVal = p.previousRevenue;
      if (showYoy && p.samePeriodLastYearRevenue > maxVal) maxVal = p.samePeriodLastYearRevenue;
    });
  } else {
    maxVal = 100; // Công suất tối đa 100%
  }

  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <IoStatsChartOutline size={20} className="text-primary" />
            Biểu đồ đối chiếu tiến trình theo ngày trong kỳ
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            So sánh đường biến động giữa Kỳ hiện tại vs Kỳ liền trước vs Cùng kỳ năm trước qua từng ngày (Day 1..N)
          </p>
        </div>

        {/* Metric Selector & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-border-grey text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('revenue')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                metricMode === 'revenue' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Doanh thu (đ)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('occupancy')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                metricMode === 'occupancy' ? 'bg-surface-container-lowest text-emerald-700 shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Công suất (%)
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs pl-2 border-l border-border-grey">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1.5 rounded-full bg-primary" />
              <span className="text-on-surface font-semibold">{currentLabel}</span>
            </div>
            {showPrev && (
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-on-surface-variant font-medium">{previousLabel}</span>
              </div>
            )}
            {showYoy && (
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-on-surface-variant font-medium">{yoyLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Bar Comparison Matrix */}
      <div className="relative">
        {/* Background Guide lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-[40px] pt-[20px]">
          <div className="border-b border-border-grey/40 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">
              {metricMode === 'revenue' ? fmtCompactCurrency(maxVal) : '100%'}
            </span>
          </div>
          <div className="border-b border-border-grey/30 w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">
              {metricMode === 'revenue' ? fmtCompactCurrency(maxVal * 0.5) : '50%'}
            </span>
          </div>
          <div className="border-b border-border-grey w-full flex items-center justify-end pr-1">
            <span className="text-[10px] text-on-surface-variant/60 font-mono -mt-3.5 bg-surface-container-lowest px-1">
              {metricMode === 'revenue' ? '0 đ' : '0%'}
            </span>
          </div>
        </div>

        {/* Timeline Columns */}
        <div
          className="relative z-10 flex items-end justify-between gap-1 sm:gap-2 overflow-x-auto pb-[40px] pt-[20px] min-h-[260px]"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {timeline.map((point, idx) => {
            const curVal = metricMode === 'revenue' ? point.currentRevenue : point.currentOccupancyRate;
            const prevVal = metricMode === 'revenue' ? point.previousRevenue : point.previousOccupancyRate;
            const yoyVal = metricMode === 'revenue' ? point.samePeriodLastYearRevenue : point.samePeriodLastYearOccupancyRate;

            const curH = Math.max(3, (curVal / maxVal) * usableHeight);
            const prevH = Math.max(3, (prevVal / maxVal) * usableHeight);
            const yoyH = Math.max(3, (yoyVal / maxVal) * usableHeight);

            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={point.dayIndex}
                onMouseEnter={() => setHoveredIdx(idx)}
                className="flex-1 min-w-[28px] max-w-[56px] flex flex-col items-center h-full justify-end cursor-pointer group relative"
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-[calc(100%+8px)] z-30 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl pointer-events-none min-w-[210px] border border-gray-700 animate-in fade-in zoom-in-95 duration-150">
                    <div className="font-bold text-white border-b border-gray-700 pb-1.5 mb-2 flex items-center justify-between">
                      <span>Ngày {point.dayIndex} ({fmtDate(point.currentDate)})</span>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-blue-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          {currentLabel}:
                        </span>
                        <span className="font-bold">{metricMode === 'revenue' ? fmtCurrency(curVal) : `${curVal.toFixed(1)}%`}</span>
                      </div>
                      {showPrev && (
                        <div className="flex items-center justify-between text-amber-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            {previousLabel}:
                          </span>
                          <span className="font-semibold">{metricMode === 'revenue' ? fmtCurrency(prevVal) : `${prevVal.toFixed(1)}%`}</span>
                        </div>
                      )}
                      {showYoy && (
                        <div className="flex items-center justify-between text-indigo-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                            {yoyLabel}:
                          </span>
                          <span className="font-semibold">{metricMode === 'revenue' ? fmtCurrency(yoyVal) : `${yoyVal.toFixed(1)}%`}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Grouped Bars */}
                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 px-0.5">
                  {/* Cột Cùng kỳ năm trước (YoY) */}
                  {showYoy && (
                    <div
                      style={{ height: `${yoyH}px` }}
                      className={`w-full max-w-[10px] rounded-t-sm transition-all duration-300 ${
                        isHovered ? 'bg-indigo-400' : 'bg-indigo-300/80 group-hover:bg-indigo-400'
                      }`}
                      title={`${yoyLabel}: ${metricMode === 'revenue' ? fmtCurrency(yoyVal) : `${yoyVal}%`}`}
                    />
                  )}

                  {/* Cột Kỳ liền trước (PoP) */}
                  {showPrev && (
                    <div
                      style={{ height: `${prevH}px` }}
                      className={`w-full max-w-[10px] rounded-t-sm transition-all duration-300 ${
                        isHovered ? 'bg-amber-500' : 'bg-amber-300/80 group-hover:bg-amber-400'
                      }`}
                      title={`${previousLabel}: ${metricMode === 'revenue' ? fmtCurrency(prevVal) : `${prevVal}%`}`}
                    />
                  )}

                  {/* Cột Kỳ hiện tại */}
                  <div
                    style={{ height: `${curH}px` }}
                    className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${
                      isHovered ? 'bg-primary ring-2 ring-primary/40' : 'bg-primary/90 group-hover:bg-primary shadow-xs'
                    }`}
                    title={`${currentLabel}: ${metricMode === 'revenue' ? fmtCurrency(curVal) : `${curVal}%`}`}
                  />
                </div>

                {/* X-axis Label */}
                <span className="absolute bottom-1 text-[10px] font-medium text-on-surface-variant text-center whitespace-nowrap">
                  N{point.dayIndex}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PeriodComparisonReport: React.FC = () => {
  const [activePreset, setActivePreset] = useState<string>('this_month');
  const [periodType, setPeriodType] = useState<PeriodComparisonType>('month');
  const [compareTarget, setCompareTarget] = useState<CompareTargetType>('both');

  const defaultDates = useMemo(() => getDefaultDates('this_month'), []);
  const [fromDate, setFromDate] = useState<string>(defaultDates.from);
  const [toDate, setToDate] = useState<string>(defaultDates.to);

  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [reportData, setReportData] = useState<PeriodComparisonReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search filter cho bảng loại phòng
  const [roomTypeSearch, setRoomTypeSearch] = useState<string>('');

  const fetchReport = async (from: string, to: string, pType: PeriodComparisonType, target: CompareTargetType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportApi.getPeriodComparison(from, to, pType, target);
      setReportData(data);
    } catch (err: any) {
      console.error('Lỗi khi tải báo cáo so sánh chỉ số:', err);
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu báo cáo so sánh chỉ số.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(fromDate, toDate, periodType, compareTarget);
  }, []);

  const handleApplyPreset = (presetId: string) => {
    setActivePreset(presetId);
    if (presetId !== 'custom') {
      const dates = getDefaultDates(presetId);
      setFromDate(dates.from);
      setToDate(dates.to);
      setPeriodType(dates.periodType);
      fetchReport(dates.from, dates.to, dates.periodType, compareTarget);
    } else {
      setPeriodType('custom');
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport(fromDate, toDate, periodType, compareTarget);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await reportApi.exportPeriodComparison(fromDate, toDate, periodType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `so_sanh_chi_so_${fromDate}_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Lỗi khi xuất CSV:', err);
      alert('Không thể xuất file CSV: ' + (err?.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  const filteredRoomTypes = useMemo(() => {
    if (!reportData || !reportData.roomTypes) return [];
    if (!roomTypeSearch.trim()) return reportData.roomTypes;
    const q = roomTypeSearch.toLowerCase().trim();
    return reportData.roomTypes.filter(rt => rt.roomTypeName.toLowerCase().includes(q));
  }, [reportData, roomTypeSearch]);

  const showPrevious = compareTarget === 'both' || compareTarget === 'previous_period';
  const showYoy = compareTarget === 'both' || compareTarget === 'same_period_last_year';

  return (
    <div className="space-y-6">
      {/* 1. Bộ lọc thời gian & Preset Toolbar */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-grey pb-4">
            {/* Presets Button Group */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1 mr-1">
                <IoFlashOutline size={14} className="text-amber-500" />
                Kỳ so sánh:
              </span>
              {PERIOD_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activePreset === preset.id
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-border-grey'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Nút Xuất CSV */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting || loading}
              className="flex items-center gap-1.5 font-semibold text-xs border-border-grey text-on-surface hover:bg-surface-container-low ml-auto"
            >
              <IoDownloadOutline size={16} />
              {exporting ? 'Đang xuất tệp...' : 'Xuất CSV / Excel'}
            </Button>
          </div>

          {/* Detailed Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <Input
              label="Từ ngày (Kỳ hiện tại)"
              type="date"
              value={fromDate}
              onChange={(e: any) => {
                setFromDate(e.target.value);
                setActivePreset('custom');
                setPeriodType('custom');
              }}
              required
            />
            <Input
              label="Đến ngày (Kỳ hiện tại)"
              type="date"
              value={toDate}
              onChange={(e: any) => {
                setToDate(e.target.value);
                setActivePreset('custom');
                setPeriodType('custom');
              }}
              required
            />
            <Select
              label="Phạm vi đối chiếu"
              value={compareTarget}
              onChange={(val: any) => setCompareTarget(val as CompareTargetType)}
              options={TARGET_OPTIONS}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={loading} className="w-full font-semibold text-sm">
                <IoCalendarOutline size={16} className="mr-1.5" />
                {loading ? 'Đang phân tích...' : 'Xem báo cáo'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {loading && <LoadingScreen message="Đang đối chiếu chỉ số đa kỳ..." />}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
          <IoInformationCircleOutline size={20} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {!loading && reportData && (
        <>
          {/* 2. Banner Thông tin các kỳ đang đối chiếu */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <IoSwapHorizontalOutline size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span>{reportData.currentPeriod.label}</span>
                  <span className="text-xs font-normal text-on-surface-variant">({fmtDate(reportData.currentPeriod.from)} – {fmtDate(reportData.currentPeriod.to)})</span>
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant mt-0.5">
                  {showPrevious && (
                    <span>
                      <strong className="text-amber-700">Kỳ trước (PoP):</strong> {reportData.previousPeriod.label} ({fmtDate(reportData.previousPeriod.from)} – {fmtDate(reportData.previousPeriod.to)})
                    </span>
                  )}
                  {showYoy && (
                    <span>
                      <strong className="text-indigo-700">Cùng kỳ năm trước (YoY):</strong> {reportData.samePeriodLastYear.label} ({fmtDate(reportData.samePeriodLastYear.from)} – {fmtDate(reportData.samePeriodLastYear.to)})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-on-surface-variant font-medium bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-border-grey">
              Độ dài kỳ: <strong>{reportData.currentPeriod.days} ngày</strong>
            </div>
          </div>

          {/* 3. Top Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng doanh thu */}
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium mb-1">
                  <span>Tổng Doanh thu gộp</span>
                  <span className="text-[11px] text-primary font-bold">Kỳ này</span>
                </div>
                <div className="text-2xl font-extrabold text-on-surface font-mono">
                  {fmtCurrency(reportData.currentMetrics.totalRevenue)}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-grey/60 space-y-1.5">
                {showPrevious && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">vs Kỳ trước:</span>
                    <DeltaBadge
                      rate={reportData.popComparison.totalRevenueGrowthRate}
                      diff={reportData.popComparison.totalRevenueDiff}
                    />
                  </div>
                )}
                {showYoy && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">vs Cùng kỳ năm ngoái:</span>
                    <DeltaBadge
                      rate={reportData.yoyComparison.totalRevenueGrowthRate}
                      diff={reportData.yoyComparison.totalRevenueDiff}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Công suất phòng */}
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium mb-1">
                  <span>Công suất phòng (Occupancy)</span>
                  <span className="text-[11px] text-emerald-700 font-bold">Kỳ này</span>
                </div>
                <div className="text-2xl font-extrabold text-on-surface font-mono">
                  {reportData.currentMetrics.occupancyRate.toFixed(1)}%
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  Đã bán: <strong>{reportData.currentMetrics.soldRoomNights}</strong> / {reportData.currentMetrics.availableRoomNights} đêm
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-grey/60 space-y-1.5">
                {showPrevious && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">vs Kỳ trước:</span>
                    <DeltaBadge
                      rate={reportData.popComparison.occupancyRateDiff}
                      isPts={true}
                    />
                  </div>
                )}
                {showYoy && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">vs Cùng kỳ năm ngoái:</span>
                    <DeltaBadge
                      rate={reportData.yoyComparison.occupancyRateDiff}
                      isPts={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Giá bán trung bình (ADR) */}
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium mb-1">
                  <span>Giá bán bình quân (ADR)</span>
                  <span className="text-[11px] text-indigo-700 font-bold">Kỳ này</span>
                </div>
                <div className="text-2xl font-extrabold text-on-surface font-mono">
                  {fmtCurrency(reportData.currentMetrics.adr)}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  Doanh thu thuần / Đêm phòng bán
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-grey/60 space-y-1.5">
                {showPrevious && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">vs Kỳ trước:</span>
                    <DeltaBadge
                      rate={reportData.popComparison.adrGrowthRate}
                      diff={reportData.popComparison.adrDiff}
                    />
                  </div>
                )}
                {showYoy && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">vs Cùng kỳ năm ngoái:</span>
                    <DeltaBadge
                      rate={reportData.yoyComparison.adrGrowthRate}
                      diff={reportData.yoyComparison.adrDiff}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Card 4: Doanh thu / Phòng sẵn có (RevPAR) */}
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-on-surface-variant text-xs font-medium mb-1">
                  <span>Doanh thu / phòng sẵn (RevPAR)</span>
                  <span className="text-[11px] text-amber-700 font-bold">Kỳ này</span>
                </div>
                <div className="text-2xl font-extrabold text-on-surface font-mono">
                  {fmtCurrency(reportData.currentMetrics.revpar)}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  {reportData.currentMetrics.totalBookings} lượt đặt phòng
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-grey/60 space-y-1.5">
                {showPrevious && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">vs Kỳ trước:</span>
                    <DeltaBadge
                      rate={reportData.popComparison.revparGrowthRate}
                      diff={reportData.popComparison.revparDiff}
                    />
                  </div>
                )}
                {showYoy && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">vs Cùng kỳ năm ngoái:</span>
                    <DeltaBadge
                      rate={reportData.yoyComparison.revparGrowthRate}
                      diff={reportData.yoyComparison.revparDiff}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Hộp Nhận định Kinh doanh Tự động (Executive Insights Box) */}
          {reportData.executiveInsights && reportData.executiveInsights.length > 0 && (
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs">
              <h3 className="font-headline-sm text-on-surface flex items-center gap-2 mb-3">
                <IoSparklesOutline size={20} className="text-amber-500" />
                Đánh giá & Nhận định kinh doanh tự động
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reportData.executiveInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3.5 bg-surface-container-low rounded-xl border border-border-grey/60 text-xs text-on-surface leading-relaxed"
                  >
                    <IoCheckmarkCircleOutline size={17} className="shrink-0 text-emerald-600 mt-0.5" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Biểu đồ tiến trình đa đường */}
          <MultiPeriodTimelineChart
            timeline={reportData.timeline}
            currentLabel={reportData.currentPeriod.label}
            previousLabel={reportData.previousPeriod.label}
            yoyLabel={reportData.samePeriodLastYear.label}
            compareTarget={compareTarget}
          />

          {/* 6. Bảng Đối chiếu Chỉ số Cốt lõi Tổng hợp */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border-grey flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
                  <IoStatsChartOutline size={20} className="text-primary" />
                  Bảng đối chiếu chỉ số hiệu suất tổng hợp
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Đối chiếu chi tiết từng chỉ số giữa Kỳ hiện tại, Kỳ liền trước (PoP) và Cùng kỳ năm trước (YoY)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-border-grey">
                    <th className="py-3 px-4">Chỉ số đo lường</th>
                    <th className="py-3 px-4 text-right bg-primary/5 text-primary">Kỳ hiện tại ({reportData.currentPeriod.label})</th>
                    {showPrevious && (
                      <>
                        <th className="py-3 px-4 text-right">{reportData.previousPeriod.label}</th>
                        <th className="py-3 px-4 text-center">Chênh lệch PoP</th>
                        <th className="py-3 px-4 text-center">Tăng trưởng PoP (%)</th>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <th className="py-3 px-4 text-right">{reportData.samePeriodLastYear.label}</th>
                        <th className="py-3 px-4 text-center">Chênh lệch YoY</th>
                        <th className="py-3 px-4 text-center">Tăng trưởng YoY (%)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {/* Row 1: Tổng doanh thu */}
                  <tr className="hover:bg-surface-container-low/50 font-bold">
                    <td className="py-3.5 px-4 text-on-surface">Tổng doanh thu gộp</td>
                    <td className="py-3.5 px-4 text-right text-primary font-mono text-sm bg-primary/5">
                      {fmtCurrency(reportData.currentMetrics.totalRevenue)}
                    </td>
                    {showPrevious && (
                      <>
                        <td className="py-3.5 px-4 text-right text-on-surface font-mono">
                          {fmtCurrency(reportData.previousMetrics.totalRevenue)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {reportData.popComparison.totalRevenueDiff >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.popComparison.totalRevenueDiff)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <DeltaBadge rate={reportData.popComparison.totalRevenueGrowthRate} />
                        </td>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <td className="py-3.5 px-4 text-right text-on-surface font-mono">
                          {fmtCurrency(reportData.samePeriodLastYearMetrics.totalRevenue)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {reportData.yoyComparison.totalRevenueDiff >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.yoyComparison.totalRevenueDiff)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <DeltaBadge rate={reportData.yoyComparison.totalRevenueGrowthRate} />
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Row 2: Doanh thu phòng */}
                  <tr className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 text-on-surface font-medium pl-6">• Doanh thu thuần phòng</td>
                    <td className="py-3 px-4 text-right font-mono bg-primary/5">
                      {fmtCurrency(reportData.currentMetrics.roomRevenue)}
                    </td>
                    {showPrevious && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{fmtCurrency(reportData.previousMetrics.roomRevenue)}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.popComparison.roomRevenueDiff >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.popComparison.roomRevenueDiff)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.popComparison.roomRevenueGrowthRate} />
                        </td>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{fmtCurrency(reportData.samePeriodLastYearMetrics.roomRevenue)}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.yoyComparison.roomRevenueDiff >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.yoyComparison.roomRevenueDiff)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.yoyComparison.roomRevenueGrowthRate} />
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Row 3: Phạt cọc & hủy */}
                  <tr className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 text-on-surface font-medium pl-6">• Thu phí phạt hủy / giữ cọc</td>
                    <td className="py-3 px-4 text-right font-mono bg-primary/5">
                      {fmtCurrency(reportData.currentMetrics.penaltyRevenue)}
                    </td>
                    {showPrevious && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{fmtCurrency(reportData.previousMetrics.penaltyRevenue)}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.currentMetrics.penaltyRevenue - reportData.previousMetrics.penaltyRevenue >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.currentMetrics.penaltyRevenue - reportData.previousMetrics.penaltyRevenue)}
                        </td>
                        <td className="py-3 px-4 text-center text-on-surface-variant">—</td>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{fmtCurrency(reportData.samePeriodLastYearMetrics.penaltyRevenue)}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.currentMetrics.penaltyRevenue - reportData.samePeriodLastYearMetrics.penaltyRevenue >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.currentMetrics.penaltyRevenue - reportData.samePeriodLastYearMetrics.penaltyRevenue)}
                        </td>
                        <td className="py-3 px-4 text-center text-on-surface-variant">—</td>
                      </>
                    )}
                  </tr>

                  {/* Row 4: Công suất phòng */}
                  <tr className="hover:bg-surface-container-low/50 font-semibold bg-emerald-50/20">
                    <td className="py-3.5 px-4 text-on-surface">Công suất phòng (Occupancy Rate)</td>
                    <td className="py-3.5 px-4 text-right text-emerald-700 font-mono text-sm bg-primary/5">
                      {reportData.currentMetrics.occupancyRate.toFixed(1)}%
                    </td>
                    {showPrevious && (
                      <>
                        <td className="py-3.5 px-4 text-right font-mono">{reportData.previousMetrics.occupancyRate.toFixed(1)}%</td>
                        <td className="py-3.5 px-4 text-center">
                          <DeltaBadge rate={reportData.popComparison.occupancyRateDiff} isPts={true} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <DeltaBadge rate={reportData.popComparison.occupancyGrowthRate} />
                        </td>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <td className="py-3.5 px-4 text-right font-mono">{reportData.samePeriodLastYearMetrics.occupancyRate.toFixed(1)}%</td>
                        <td className="py-3.5 px-4 text-center">
                          <DeltaBadge rate={reportData.yoyComparison.occupancyRateDiff} isPts={true} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <DeltaBadge rate={reportData.yoyComparison.occupancyGrowthRate} />
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Row 5: Giá bán TB (ADR) */}
                  <tr className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 text-on-surface font-medium">Giá bán bình quân ngày (ADR)</td>
                    <td className="py-3 px-4 text-right font-mono bg-primary/5">
                      {fmtCurrency(reportData.currentMetrics.adr)}
                    </td>
                    {showPrevious && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{fmtCurrency(reportData.previousMetrics.adr)}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.popComparison.adrDiff >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.popComparison.adrDiff)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.popComparison.adrGrowthRate} />
                        </td>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{fmtCurrency(reportData.samePeriodLastYearMetrics.adr)}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.yoyComparison.adrDiff >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.yoyComparison.adrDiff)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.yoyComparison.adrGrowthRate} />
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Row 6: RevPAR */}
                  <tr className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 text-on-surface font-medium">Doanh thu / Phòng sẵn có (RevPAR)</td>
                    <td className="py-3 px-4 text-right font-mono bg-primary/5">
                      {fmtCurrency(reportData.currentMetrics.revpar)}
                    </td>
                    {showPrevious && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{fmtCurrency(reportData.previousMetrics.revpar)}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.popComparison.revparDiff >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.popComparison.revparDiff)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.popComparison.revparGrowthRate} />
                        </td>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{fmtCurrency(reportData.samePeriodLastYearMetrics.revpar)}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.yoyComparison.revparDiff >= 0 ? '+' : ''}
                          {fmtCurrency(reportData.yoyComparison.revparDiff)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.yoyComparison.revparGrowthRate} />
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Row 7: Đêm phòng bán */}
                  <tr className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 text-on-surface font-medium">Số đêm phòng bán được (Sold Nights)</td>
                    <td className="py-3 px-4 text-right font-mono bg-primary/5">
                      {reportData.currentMetrics.soldRoomNights} đêm
                    </td>
                    {showPrevious && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{reportData.previousMetrics.soldRoomNights} đêm</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.popComparison.soldNightsDiff >= 0 ? '+' : ''}
                          {reportData.popComparison.soldNightsDiff}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.popComparison.soldNightsGrowthRate} />
                        </td>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{reportData.samePeriodLastYearMetrics.soldRoomNights} đêm</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.yoyComparison.soldNightsDiff >= 0 ? '+' : ''}
                          {reportData.yoyComparison.soldNightsDiff}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.yoyComparison.soldNightsGrowthRate} />
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Row 8: Lượt đặt phòng */}
                  <tr className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 text-on-surface font-medium">Tổng lượt đặt phòng (Bookings)</td>
                    <td className="py-3 px-4 text-right font-mono bg-primary/5">
                      {reportData.currentMetrics.totalBookings} lượt
                    </td>
                    {showPrevious && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{reportData.previousMetrics.totalBookings} lượt</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.popComparison.bookingsDiff >= 0 ? '+' : ''}
                          {reportData.popComparison.bookingsDiff}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.popComparison.bookingsGrowthRate} />
                        </td>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <td className="py-3 px-4 text-right font-mono">{reportData.samePeriodLastYearMetrics.totalBookings} lượt</td>
                        <td className="py-3 px-4 text-center font-mono">
                          {reportData.yoyComparison.bookingsDiff >= 0 ? '+' : ''}
                          {reportData.yoyComparison.bookingsDiff}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DeltaBadge rate={reportData.yoyComparison.bookingsGrowthRate} />
                        </td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 7. Phân rã Đối chiếu theo Loại phòng */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-border-grey flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
                  <IoBedOutline size={20} className="text-primary" />
                  Đối chiếu chi tiết theo từng hạng phòng (Room Types)
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Đánh giá tốc độ tăng trưởng doanh thu và công suất phòng của từng hạng phòng
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative min-w-[220px]">
                <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={roomTypeSearch}
                  onChange={e => setRoomTypeSearch(e.target.value)}
                  placeholder="Tìm tên hạng phòng..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-container-low border border-border-grey rounded-xl text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-border-grey">
                    <th className="py-3 px-4">Hạng phòng</th>
                    <th className="py-3 px-3 text-center">Số phòng</th>
                    <th className="py-3 px-4 text-right bg-primary/5 text-primary">DT Kỳ này</th>
                    {showPrevious && (
                      <>
                        <th className="py-3 px-4 text-right">DT Kỳ trước</th>
                        <th className="py-3 px-3 text-center">Tăng trưởng DT PoP</th>
                        <th className="py-3 px-3 text-center">CS Kỳ này</th>
                        <th className="py-3 px-3 text-center">CS Kỳ trước</th>
                        <th className="py-3 px-3 text-center">Lệch CS PoP</th>
                        <th className="py-3 px-4 text-right">ADR Kỳ này</th>
                        <th className="py-3 px-4 text-right">ADR Kỳ trước</th>
                      </>
                    )}
                    {showYoy && (
                      <>
                        <th className="py-3 px-4 text-right">DT Cùng kỳ năm trước</th>
                        <th className="py-3 px-3 text-center">Tăng trưởng YoY</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {filteredRoomTypes.length === 0 ? (
                    <tr>
                      <td colSpan={showPrevious && showYoy ? 12 : 8} className="text-center py-8 text-on-surface-variant">
                        Không có dữ liệu hạng phòng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredRoomTypes.map(rt => (
                      <tr key={rt.roomTypeId} className="hover:bg-surface-container-low/50">
                        <td className="py-3.5 px-4 font-semibold text-on-surface">
                          {rt.roomTypeName}
                        </td>
                        <td className="py-3.5 px-3 text-center text-on-surface-variant font-mono">
                          {rt.totalRooms}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-primary font-mono bg-primary/5">
                          {fmtCurrency(rt.currentRevenue)}
                        </td>
                        {showPrevious && (
                          <>
                            <td className="py-3.5 px-4 text-right font-mono text-on-surface">
                              {fmtCurrency(rt.previousRevenue)}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <DeltaBadge rate={rt.popRevenueGrowth} />
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-emerald-700 font-mono">
                              {rt.currentOccupancyRate.toFixed(1)}%
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono text-on-surface-variant">
                              {rt.previousOccupancyRate.toFixed(1)}%
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <DeltaBadge rate={rt.popOccupancyDiff} isPts={true} />
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-on-surface">
                              {fmtCurrency(rt.currentAdr)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant">
                              {fmtCurrency(rt.previousAdr)}
                            </td>
                          </>
                        )}
                        {showYoy && (
                          <>
                            <td className="py-3.5 px-4 text-right font-mono text-on-surface">
                              {fmtCurrency(rt.yoyRevenue)}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <DeltaBadge rate={rt.yoyRevenueGrowth} />
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodComparisonReport;
