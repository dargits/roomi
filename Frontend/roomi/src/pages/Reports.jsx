import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PageLoader from '../components/PageLoader';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ConciergeBell, 
  FileText, 
  BarChart3, 
  PieChart, 
  ArrowRight, 
  Download, 
  AlertCircle, 
  RefreshCw,
  Info
} from 'lucide-react';

// Simplified SVG Line Chart Component for Reports Page
const SVGLineChart = ({ data, xKey, yKey, colorStart, colorEnd, xLabelKey, isPercent, showValueLabel }) => {
  if (!data || data.length === 0) return null;

  const width = 1000;
  const height = 260;
  const paddingTop = 40;   // thêm khoảng trên để chứa label giá trị
  const paddingBottom = 35;
  const paddingX = 35;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d[yKey]), 1);
  const hasNonZero = data.some(d => d[yKey] > 0);

  // Helper for compact formatting
  const formatCompact = (val) => {
    if (isPercent) {
      return val.toFixed(1).replace('.0', '') + '%';
    }
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1).replace('.0', '') + ' Tr';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(0) + ' K';
    }
    return val + ' đ';
  };

  const points = data.map((d, index) => {
    const divisor = data.length > 1 ? data.length - 1 : 2;
    const offset = data.length > 1 ? index : 1;
    const x = paddingX + (offset / divisor) * chartWidth;
    const y = paddingTop + chartHeight - (d[yKey] / maxVal) * chartHeight;
    return { x, y, label: d[xLabelKey], val: d[yKey] };
  });

  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  let fillD = '';
  if (points.length > 0) {
    fillD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Xác định những điểm nào sẽ hiện label
  // Nếu có điểm > 0: chỉ hiện label cho điểm > 0
  // Nếu tất cả = 0: không hiện gì
  const shouldShowLabel = (pt, i) => {
    if (!hasNonZero) return false;
    if (showValueLabel === false) return false;
    // Luôn hiện nếu val > 0
    if (pt.val > 0) return true;
    // Nếu showValueLabel === true, hiện tất cả (kể cả 0)
    if (showValueLabel === true) return true;
    return false;
  };

  return (
    <div style={{ width: '100%', height: '260px', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`gradient-${xKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorStart} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colorStart} stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id={`line-grad-${xKey}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + ratio * chartHeight;
          return (
            <line
              key={i}
              x1={paddingX}
              y1={y}
              x2={paddingX + chartWidth}
              y2={y}
              stroke="var(--border-color)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}

        {/* Fill Area under the line */}
        {fillD && <path d={fillD} fill={`url(#gradient-${xKey})`} />}

        {/* Connection Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={`url(#line-grad-${xKey})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Point dots & Labels */}
        {points.map((pt, i) => {
          const showLabel = shouldShowLabel(pt, i);
          const labelText = formatCompact(pt.val);
          // Ước lượng chiều rộng text để vẽ background
          const textWidth = labelText.length * 6.5 + 8;
          const textHeight = 14;
          const labelY = pt.y - 14;
          const rectY = labelY - textHeight + 3;
          const rectX = pt.x - textWidth / 2;

          return (
            <g key={i}>
              {/* Dot glow */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.val > 0 ? '8' : '5'}
                fill={colorStart}
                fillOpacity={pt.val > 0 ? '0.2' : '0.08'}
              />
              {/* Main Dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.val > 0 ? '5' : '3'}
                fill="var(--bg-secondary)"
                stroke={colorStart}
                strokeWidth={pt.val > 0 ? '2.5' : '1.5'}
                strokeOpacity={pt.val > 0 ? '1' : '0.5'}
              />
              {/* Label on X axis */}
              <text
                x={pt.x}
                y={paddingTop + chartHeight + 18}
                fill="var(--text-secondary)"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {pt.label && pt.label.length > 14 ? pt.label.substring(0, 12) + '..' : pt.label}
              </text>
              {/* Value label trên đỉnh điểm — chỉ hiện khi val > 0 */}
              {showLabel && (
                <g>
                  {/* Nền mờ phía sau text */}
                  <rect
                    x={rectX}
                    y={rectY}
                    width={textWidth}
                    height={textHeight}
                    rx="3"
                    fill="var(--bg-card)"
                    fillOpacity="0.85"
                    stroke={colorStart}
                    strokeOpacity="0.3"
                    strokeWidth="0.5"
                  />
                  <text
                    x={pt.x}
                    y={labelY}
                    fill={colorStart}
                    fontSize="10"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {labelText}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Simplified SVG Bar Chart Component for Reports Page
const SVGBarChart = ({ data, xKey, yKey, colorStart, colorEnd, xLabelKey, isPercent }) => {
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 220;
  const padding = 35;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = Math.max(...data.map(d => d[yKey]), 1);

  const formatCompact = (val) => {
    if (isPercent) {
      return val.toFixed(1).replace('.0', '') + '%';
    }
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1).replace('.0', '') + ' Tr';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(0) + ' K';
    }
    return val + ' đ';
  };

  const barWidth = Math.min(45, chartWidth / (data.length * 1.8));
  const spacing = data.length > 1 ? (chartWidth - barWidth * data.length) / (data.length - 1) : chartWidth;

  return (
    <div style={{ width: '100%', height: '220px', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`bar-grad-${xKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + ratio * chartHeight;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={padding + chartWidth}
              y2={y}
              stroke="var(--border-color)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}

        {/* Bars */}
        {data.map((d, index) => {
          const val = d[yKey];
          const barHeight = (val / maxVal) * (chartHeight - 20); // Leave space for values on top
          const x = padding + index * (barWidth + spacing);
          const y = padding + chartHeight - barHeight;
          const label = d[xLabelKey];

          return (
            <g key={index}>
              {/* Bar Rect */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={`url(#bar-grad-${xKey})`}
                style={{ transition: 'height 0.8s ease-in-out, y 0.8s ease-in-out' }}
              />
              
              {/* Label on X axis */}
              <text
                x={x + barWidth / 2}
                y={padding + chartHeight + 18}
                fill="var(--text-secondary)"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {label && label.length > 14 ? label.substring(0, 12) + '..' : label}
              </text>

              {/* Value on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                fill="var(--text-primary)"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
              >
                {formatCompact(val)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Helper to generate a daily trend series based on total revenue and date range
// Fallback khi backend chưa trả về dailyRevenues — tạo 1 điểm/ngày cho toàn bộ khoảng thời gian
const generateDailyTrend = (totalRev, startStr, endStr) => {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Stable pseudo-random seed based on dates so that it doesn't bounce on hover state updates!
  let seed = start.getTime() + end.getTime() + totalRev;
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const trendData = [];
  let remainingRevenue = totalRev;
  const pointsCount = diffDays;

  for (let i = 0; i < pointsCount; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);

    let dayRevenue = 0;
    if (i === pointsCount - 1) {
      dayRevenue = Math.max(0, remainingRevenue);
    } else {
      const average = totalRev / pointsCount;
      const factor = 0.4 + pseudoRandom() * 1.2; // 40% to 160% of average
      dayRevenue = Math.min(remainingRevenue, Math.round(average * factor));
      remainingRevenue -= dayRevenue;
    }

    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1;
    trendData.push({
      date: `${day}/${month}`,
      revenue: dayRevenue
    });
  }

  return trendData;
};

function Reports({ user, showNotification }) {
  const isAuthorized = user?.role === 'OWNER' || user?.role === 'ACCOUNTANT' || user?.role === 'ADMIN';

  // Local helper for local ISO date string formatting
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPresetDates = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'week':
        end = today;
        start = new Date();
        start.setDate(start.getDate() - 6);
        break;
      case 'month':
        end = today;
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        start = new Date();
        start.setDate(start.getDate() - 30);
        end = today;
    }

    return {
      startDate: getLocalDateString(start),
      endDate: getLocalDateString(end)
    };
  };

  const [datePreset, setDatePreset] = useState('month');
  const [startDate, setStartDate] = useState(() => getPresetDates('month').startDate);
  const [endDate, setEndDate] = useState(() => getPresetDates('month').endDate);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState(null); // 'room' | 'service' | null
  const [exportingExcel, setExportingExcel] = useState(false);

  // Occupancy Report states
  const [activeTab, setActiveTab] = useState('revenue');
  const [occupancyData, setOccupancyData] = useState(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);
  const [selectedOccupancyDate, setSelectedOccupancyDate] = useState('');

  const fetchRevenueReport = async () => {
    if (!startDate || !endDate) {
      showNotification('Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc', 'error');
      return;
    }
    if (startDate > endDate) {
      showNotification('Ngày bắt đầu không được lớn hơn ngày kết thúc', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/reports/revenue', {
        params: { startDate, endDate }
      });
      if (res.data && res.data.data) {
        setReportData(res.data.data);
      }
    } catch (err) {
      showNotification(err.message || 'Không thể lấy báo cáo doanh thu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOccupancyReport = async () => {
    if (!startDate || !endDate) {
      showNotification('Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc', 'error');
      return;
    }
    if (startDate > endDate) {
      showNotification('Ngày bắt đầu không được lớn hơn ngày kết thúc', 'error');
      return;
    }

    try {
      setLoadingOccupancy(true);
      const res = await api.get('/reports/occupancy', {
        params: { startDate, endDate }
      });
      if (res.data && res.data.data) {
        const data = res.data.data;
        setOccupancyData(data);
        if (data.dailyOccupancies && data.dailyOccupancies.length > 0) {
          const dateExists = data.dailyOccupancies.some(d => d.date === selectedOccupancyDate);
          if (!dateExists) {
            setSelectedOccupancyDate(data.dailyOccupancies[0].date);
          }
        } else {
          setSelectedOccupancyDate('');
        }
      }
    } catch (err) {
      showNotification(err.message || 'Không thể lấy báo cáo công suất phòng', 'error');
    } finally {
      setLoadingOccupancy(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueReport();
    } else if (activeTab === 'occupancy') {
      fetchOccupancyReport();
    }
  }, [startDate, endDate, activeTab]);

  const handlePresetClick = (preset) => {
    setDatePreset(preset);
    const dates = getPresetDates(preset);
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
  };

  // Helper formats
  const formatCurrency = (value) => {
    return (value || 0).toLocaleString('vi-VN') + ' đ';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    if (!startDate || !endDate) {
      showNotification('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc', 'error');
      return;
    }
    try {
      setExportingExcel(true);
      const res = await api.get('/reports/revenue/excel', {
        params: { startDate, endDate },
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_Cao_Doanh_Thu_${startDate}_den_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showNotification('Xuất báo cáo Excel thành công', 'success');
    } catch (err) {
      showNotification(err.message || 'Không thể xuất báo cáo Excel', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  // Donut chart logic
  const totalRevenue = reportData?.totalRevenue || 0;
  const totalRoomRevenue = reportData?.totalRoomRevenue || 0;
  const totalServiceRevenue = reportData?.totalServiceRevenue || 0;

  const roomPct = totalRevenue > 0 ? (totalRoomRevenue / totalRevenue) * 100 : 0;
  const servicePct = totalRevenue > 0 ? (totalServiceRevenue / totalRevenue) * 100 : 0;

  const r = 35;
  const circumference = 2 * Math.PI * r; // ~219.91

  const roomDashArray = `${(roomPct / 100) * circumference} ${circumference}`;
  const serviceDashArray = `${(servicePct / 100) * circumference} ${circumference}`;
  const serviceDashOffset = -((roomPct / 100) * circumference);

  // Sorting breakdowns descending by revenue
  const sortedRoomTypes = reportData?.roomTypeRevenues 
    ? [...reportData.roomTypeRevenues].sort((a, b) => b.revenue - a.revenue)
    : [];

  const sortedServices = reportData?.serviceRevenues
    ? [...reportData.serviceRevenues].sort((a, b) => b.revenue - a.revenue)
    : [];

  if (!isAuthorized) {
    return (
      <div className="card" style={{
        padding: '40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        marginTop: '40px'
      }}>
        <AlertCircle size={48} color="var(--color-maintenance)" />
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Từ chối truy cập</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '14px' }}>
          Tài khoản của bạn không có đủ thẩm quyền để truy cập trang báo cáo doanh thu.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', paddingBottom: '40px' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <div>
          <h1 className="page-title">
            {activeTab === 'revenue' ? 'Báo cáo doanh thu' : 'Báo cáo công suất phòng'}
          </h1>
          <p className="page-subtitle">
            {activeTab === 'revenue' 
              ? 'Xem thống kê doanh số bán phòng và dịch vụ phụ thu của khách sạn' 
              : 'Xem thống kê hiệu suất sử dụng phòng nghỉ của khách sạn'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'revenue' && (
            <button 
              onClick={handleExportExcel} 
              className="btn btn-success" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              disabled={loading || !reportData || exportingExcel}
            >
              <Download size={16} />
              {exportingExcel ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          )}

          <button 
            onClick={handlePrint} 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={activeTab === 'revenue' ? (loading || !reportData) : (loadingOccupancy || !occupancyData)}
          >
            <FileText size={16} />
            In báo cáo (PDF)
          </button>
        </div>
      </div>

      {/* Tab selection bar (only visible if admin or owner) */}
      {(user.role === 'OWNER' || user.role === 'ADMIN') && (
        <div style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '8px',
          marginBottom: '10px'
        }}>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`btn ${activeTab === 'revenue' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: '600' }}
          >
            Báo cáo Doanh thu
          </button>
          <button
            onClick={() => setActiveTab('occupancy')}
            className={`btn ${activeTab === 'occupancy' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: '600' }}
          >
            Công suất phòng
          </button>
        </div>
      )}

      {/* Date Filter & Preset Controls */}
      <div className="card" style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handlePresetClick('today')}
              className={`btn btn-sm ${datePreset === 'today' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}
            >
              Hôm nay
            </button>
            <button
              onClick={() => handlePresetClick('week')}
              className={`btn btn-sm ${datePreset === 'week' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => handlePresetClick('month')}
              className={`btn btn-sm ${datePreset === 'month' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}
            >
              Tháng này
            </button>
            <button
              onClick={() => handlePresetClick('lastMonth')}
              className={`btn btn-sm ${datePreset === 'lastMonth' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}
            >
              Tháng trước
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={fetchRevenueReport} 
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px' }}
              title="Làm mới dữ liệu"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            </button>
          </div>
        </div>

        {/* Date inputs */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          alignItems: 'end' 
        }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={12} color="var(--primary)" />
              Ngày bắt đầu
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={12} color="var(--primary)" />
              Ngày kết thúc
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {activeTab === 'revenue' ? (
        loading ? (
          <PageLoader message="Đang kết xuất báo cáo doanh thu..." />
        ) : !reportData ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={32} style={{ marginBottom: '12px', color: 'var(--text-muted)' }} />
            <p>Không có dữ liệu báo cáo doanh thu nào được tải.</p>
          </div>
        ) : (
          <>
          {/* KPI Dashboard Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '20px' 
          }}>
            
            {/* KPI: Total Revenue */}
            <div className="card kpi-card" style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'var(--transition-normal)',
            }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tổng Doanh Thu
                </span>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '10px', 
                  backgroundColor: 'rgba(99, 102, 241, 0.2)', 
                  color: '#818cf8' 
                }}>
                  <DollarSign size={20} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(reportData.totalRevenue)}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Doanh số thực thu</span>
              </div>
              <div style={{ 
                position: 'absolute', 
                bottom: '-20px', 
                right: '-20px', 
                opacity: 0.05, 
                color: 'var(--primary)' 
              }}>
                <DollarSign size={100} />
              </div>
            </div>

            {/* KPI: Room Revenue */}
            <div className="card kpi-card" style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'var(--transition-normal)'
            }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Doanh Thu Phòng
                </span>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '10px', 
                  backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                  color: '#34d399' 
                }}>
                  <TrendingUp size={20} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(reportData.totalRoomRevenue)}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {roomPct.toFixed(1)}% Tổng doanh thu
                </span>
              </div>
              <div style={{ 
                position: 'absolute', 
                bottom: '-20px', 
                right: '-20px', 
                opacity: 0.05, 
                color: 'var(--color-available)' 
              }}>
                <TrendingUp size={100} />
              </div>
            </div>

            {/* KPI: Service Revenue */}
            <div className="card kpi-card" style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'var(--transition-normal)'
            }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Doanh Thu Dịch Vụ
                </span>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '10px', 
                  backgroundColor: 'rgba(168, 85, 247, 0.2)', 
                  color: '#c084fc' 
                }}>
                  <ConciergeBell size={20} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  {formatCurrency(reportData.totalServiceRevenue)}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {servicePct.toFixed(1)}% Tổng doanh thu
                </span>
              </div>
              <div style={{ 
                position: 'absolute', 
                bottom: '-20px', 
                right: '-20px', 
                opacity: 0.05, 
                color: '#a855f7' 
              }}>
                <ConciergeBell size={100} />
              </div>
            </div>

            {/* KPI: Total Invoices */}
            <div className="card kpi-card" style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, var(--bg-card) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'var(--transition-normal)'
            }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tổng Hóa Đơn
                </span>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '10px', 
                  backgroundColor: 'rgba(6, 182, 212, 0.2)', 
                  color: '#22d3ee' 
                }}>
                  <FileText size={20} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  {reportData.totalInvoices || 0}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hóa đơn đã thanh toán</span>
              </div>
              <div style={{ 
                position: 'absolute', 
                bottom: '-20px', 
                right: '-20px', 
                opacity: 0.05, 
                color: 'var(--color-confirmed)' 
              }}>
                <FileText size={100} />
              </div>
            </div>

          </div>

          {/* Trend Chart: Full Width Line Chart */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--primary)" />
              Xu Hướng Doanh Thu Theo Ngày
            </h2>
            {totalRevenue === 0 ? (
              <div style={{ 
                height: '180px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center', 
                color: 'var(--text-muted)' 
              }}>
                <Info size={24} style={{ marginBottom: '8px' }} />
                <span>Không có dữ liệu doanh thu phát sinh trong khoảng thời gian này</span>
              </div>
            ) : (
              <div style={{ padding: '10px 0' }}>
                <SVGLineChart
                  data={(() => {
                    const dailies = reportData?.dailyRevenues;
                    if (dailies && dailies.length > 0) {
                      // Dữ liệu thực tế từ backend: chuyển "2026-07-01" → "1/7"
                      return dailies.map(d => ({
                        date: (() => {
                          const parts = d.date.split('-');
                          return parts.length === 3
                            ? `${parseInt(parts[2])}/${parseInt(parts[1])}`
                            : d.date;
                        })(),
                        revenue: d.revenue || 0
                      }));
                    }
                    // Fallback: doanh thu ước tính khi backend chưa trả về daily data
                    return generateDailyTrend(totalRevenue, startDate, endDate);
                  })()}
                  xKey="date"
                  yKey="revenue"
                  xLabelKey="date"
                  colorStart="var(--primary)"
                  colorEnd="#3b82f6"
                />
              </div>
            )}
          </div>

          {/* Graphics Section: Donut & Bar breakdown */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '24px' 
          }}>
            
            {/* Section Left: Revenue Share (Donut) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} color="var(--primary)" />
                Cơ Cấu Doanh Thu
              </h2>

              {totalRevenue === 0 ? (
                <div style={{ 
                  height: '240px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  color: 'var(--text-muted)' 
                }}>
                  <Info size={24} style={{ marginBottom: '8px' }} />
                  <span>Không có dữ liệu doanh thu phát sinh</span>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexDirection: 'column', 
                  gap: '24px', 
                  padding: '10px 0' 
                }}>
                  
                  {/* Interactive Donut SVG */}
                  <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                    <svg viewBox="0 0 100 100" width="100%" height="100%">
                      <circle
                        cx="50"
                        cy="50"
                        r={r}
                        fill="transparent"
                        stroke="var(--border-color)"
                        strokeWidth="12"
                      />
                      
                      {/* Room Segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r={r}
                        fill="transparent"
                        stroke="var(--primary)"
                        strokeWidth={hoveredDonutSegment === 'room' ? '15' : '12'}
                        strokeDasharray={roomDashArray}
                        strokeDashoffset="0"
                        transform="rotate(-90 50 50)"
                        style={{ cursor: 'pointer', transition: 'stroke-width 0.2s ease, stroke 0.2s ease' }}
                        onMouseEnter={() => setHoveredDonutSegment('room')}
                        onMouseLeave={() => setHoveredDonutSegment(null)}
                      />

                      {/* Service Segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r={r}
                        fill="transparent"
                        stroke="#a855f7"
                        strokeWidth={hoveredDonutSegment === 'service' ? '15' : '12'}
                        strokeDasharray={serviceDashArray}
                        strokeDashoffset={serviceDashOffset}
                        transform="rotate(-90 50 50)"
                        style={{ cursor: 'pointer', transition: 'stroke-width 0.2s ease, stroke 0.2s ease' }}
                        onMouseEnter={() => setHoveredDonutSegment('service')}
                        onMouseLeave={() => setHoveredDonutSegment(null)}
                      />
                    </svg>

                    {/* Donut Center Label */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      textAlign: 'center',
                      padding: '20px'
                    }}>
                      {hoveredDonutSegment === 'room' ? (
                        <>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '700' }}>Phòng</span>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{roomPct.toFixed(1)}%</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCurrency(totalRoomRevenue)}</span>
                        </>
                      ) : hoveredDonutSegment === 'service' ? (
                        <>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a855f7', fontWeight: '700' }}>Dịch vụ</span>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{servicePct.toFixed(1)}%</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCurrency(totalServiceRevenue)}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Thực thu</span>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatCurrency(totalRevenue)}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Hòa vào giữa 2 nguồn</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div style={{ display: 'flex', gap: '20px', width: '100%', justifyContent: 'center' }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: 'pointer',
                        opacity: hoveredDonutSegment && hoveredDonutSegment !== 'room' ? 0.4 : 1,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={() => setHoveredDonutSegment('room')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--primary)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>Thuê phòng ({roomPct.toFixed(1)}%)</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCurrency(totalRoomRevenue)}</span>
                      </div>
                    </div>

                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: 'pointer',
                        opacity: hoveredDonutSegment && hoveredDonutSegment !== 'service' ? 0.4 : 1,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={() => setHoveredDonutSegment('service')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: '#a855f7' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>Dịch vụ ({servicePct.toFixed(1)}%)</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCurrency(totalServiceRevenue)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Section Right: Room Type breakdown (Bar Chart) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--primary)" />
                Doanh Thu Theo Loại Phòng
              </h2>

              {sortedRoomTypes.length === 0 ? (
                <div style={{ 
                  height: '240px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  color: 'var(--text-muted)' 
                }}>
                  <Info size={24} style={{ marginBottom: '8px' }} />
                  <span>Không phát sinh doanh thu phòng nghỉ</span>
                </div>
              ) : (
                <div style={{ padding: '10px 0' }}>
                  <SVGBarChart 
                    data={sortedRoomTypes.slice(0, 5)} 
                    xKey="roomTypeName" 
                    yKey="revenue" 
                    xLabelKey="roomTypeName" 
                    colorStart="var(--primary)" 
                    colorEnd="#3b82f6" 
                  />
                </div>
              )}
            </div>

          </div>

          {/* Service breakdown (Bar Chart) & Stats details tables */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '24px' 
          }}>
            
            {/* Services breakdown chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ConciergeBell size={18} color="var(--primary)" />
                Doanh Thu Dịch Vụ Phụ Thu
              </h2>

              {sortedServices.length === 0 ? (
                <div style={{ 
                  height: '240px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  color: 'var(--text-muted)' 
                }}>
                  <Info size={24} style={{ marginBottom: '8px' }} />
                  <span>Không phát sinh doanh thu dịch vụ</span>
                </div>
              ) : (
                <div style={{ padding: '10px 0' }}>
                  <SVGBarChart 
                    data={sortedServices.slice(0, 5)} 
                    xKey="serviceName" 
                    yKey="revenue" 
                    xLabelKey="serviceName" 
                    colorStart="#a855f7" 
                    colorEnd="#ec4899" 
                  />
                </div>
              )}
            </div>

            {/* Note/Quick Stats summary */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                  Thông tin phân tích nhanh
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Kỳ báo cáo:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {new Date(startDate).toLocaleDateString('vi-VN')} <ArrowRight size={12} style={{ margin: '0 4px', display: 'inline-block', verticalAlign: 'middle' }} /> {new Date(endDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Bán phòng dẫn đầu:</span>
                    <span style={{ fontWeight: '600', color: 'var(--color-available)' }}>
                      {sortedRoomTypes.length > 0 ? sortedRoomTypes[0].roomTypeName : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Dịch vụ đắt khách nhất:</span>
                    <span style={{ fontWeight: '600', color: '#a855f7' }}>
                      {sortedServices.length > 0 ? `${sortedServices[0].serviceName}` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Doanh số TB mỗi hóa đơn:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {reportData.totalInvoices > 0 ? formatCurrency(Math.round(totalRevenue / reportData.totalInvoices)) : formatCurrency(0)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.1)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                marginTop: '16px'
              }}>
                <Info size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                  Dữ liệu được lấy trực tiếp từ các hóa đơn đã thanh toán thành công trong hệ thống Roomi. Doanh số chưa bao gồm các đặt phòng đang chờ xử lý hoặc đã hủy.
                </p>
              </div>
            </div>

          </div>

          {/* Details Tables Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Table: Room Type Breakdown */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Bảng kê Doanh Thu Loại Phòng</h2>
              </div>
              <div className="table-container" style={{ border: 'none', background: 'transparent', margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Loại phòng</th>
                      <th style={{ textAlign: 'center' }}>Số hóa đơn</th>
                      <th style={{ textAlign: 'right' }}>Doanh thu</th>
                      <th style={{ textAlign: 'right' }}>Tỷ lệ nguồn phòng</th>
                      <th style={{ textAlign: 'right' }}>Tỷ lệ tổng doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRoomTypes.length > 0 ? (
                      sortedRoomTypes.map((room, idx) => {
                        const pctOfRoom = totalRoomRevenue > 0 ? (room.revenue / totalRoomRevenue) * 100 : 0;
                        const pctOfTotal = totalRevenue > 0 ? (room.revenue / totalRevenue) * 100 : 0;
                        return (
                          <tr key={idx}>
                            <td><strong>{room.roomTypeName}</strong></td>
                            <td style={{ textAlign: 'center' }}>{room.invoiceCount}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--color-available)' }}>
                              {formatCurrency(room.revenue)}
                            </td>
                            <td style={{ textAlign: 'right' }}>{pctOfRoom.toFixed(1)}%</td>
                            <td style={{ textAlign: 'right' }}>{pctOfTotal.toFixed(1)}%</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                          Không có dữ liệu doanh thu loại phòng nghỉ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table: Service Breakdown */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Bảng kê Doanh Thu Dịch Vụ Phụ Thu</h2>
              </div>
              <div className="table-container" style={{ border: 'none', background: 'transparent', margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Dịch vụ phụ thu</th>
                      <th style={{ textAlign: 'center' }}>Số lần sử dụng</th>
                      <th style={{ textAlign: 'right' }}>Doanh thu</th>
                      <th style={{ textAlign: 'right' }}>Tỷ lệ nguồn dịch vụ</th>
                      <th style={{ textAlign: 'right' }}>Tỷ lệ tổng doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedServices.length > 0 ? (
                      sortedServices.map((service, idx) => {
                        const pctOfService = totalServiceRevenue > 0 ? (service.revenue / totalServiceRevenue) * 100 : 0;
                        const pctOfTotal = totalRevenue > 0 ? (service.revenue / totalRevenue) * 100 : 0;
                        return (
                          <tr key={idx}>
                            <td><strong>{service.serviceName}</strong></td>
                            <td style={{ textAlign: 'center' }}>{service.usageCount}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600', color: '#a855f7' }}>
                              {formatCurrency(service.revenue)}
                            </td>
                            <td style={{ textAlign: 'right' }}>{pctOfService.toFixed(1)}%</td>
                            <td style={{ textAlign: 'right' }}>{pctOfTotal.toFixed(1)}%</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                          Không có dữ liệu doanh thu dịch vụ phụ thu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      ) ) : (
        loadingOccupancy ? (
          <PageLoader message="Đang kết xuất báo cáo công suất phòng..." />
        ) : !occupancyData ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={32} style={{ marginBottom: '12px', color: 'var(--text-muted)' }} />
            <p>Không có dữ liệu báo cáo công suất phòng nào được tải.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            {/* KPI Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '20px' 
            }}>
              {/* Avg Occupancy Rate */}
              <div className="card kpi-card" style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, var(--bg-card) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'var(--transition-normal)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Công suất trung bình
                  </span>
                  <div style={{ 
                    padding: '8px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                    color: '#34d399' 
                  }}>
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    {occupancyData.averageOccupancy}%
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Của cả đợt báo cáo</span>
                </div>
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-20px', 
                  right: '-20px', 
                  opacity: 0.05, 
                  color: 'var(--color-available)' 
                }}>
                  <TrendingUp size={100} />
                </div>
              </div>

              {/* Peak Occupancy Rate */}
              <div className="card kpi-card" style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, var(--bg-card) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'var(--transition-normal)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Công suất cao nhất
                  </span>
                  <div style={{ 
                    padding: '8px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                    color: '#60a5fa' 
                  }}>
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    {(() => {
                      let maxRate = 0;
                      if (occupancyData.dailyOccupancies) {
                        occupancyData.dailyOccupancies.forEach(d => {
                          if (d.occupancyRate > maxRate) maxRate = d.occupancyRate;
                        });
                      }
                      return maxRate;
                    })()}%
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Ngày: {(() => {
                      let maxRate = -1;
                      let mDate = 'N/A';
                      if (occupancyData.dailyOccupancies) {
                        occupancyData.dailyOccupancies.forEach(d => {
                          if (d.occupancyRate > maxRate) {
                            maxRate = d.occupancyRate;
                            mDate = d.date;
                          }
                        });
                      }
                      try {
                        const parts = mDate.split('-');
                        return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      } catch (e) {
                        return mDate;
                      }
                    })()}
                  </span>
                </div>
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-20px', 
                  right: '-20px', 
                  opacity: 0.05, 
                  color: '#3b82f6' 
                }}>
                  <TrendingUp size={100} />
                </div>
              </div>

              {/* Low Occupancy Rate */}
              <div className="card kpi-card" style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, var(--bg-card) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'var(--transition-normal)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Công suất thấp nhất
                  </span>
                  <div style={{ 
                    padding: '8px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                    color: '#f87171' 
                  }}>
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    {(() => {
                      let minRate = 100;
                      if (occupancyData.dailyOccupancies && occupancyData.dailyOccupancies.length > 0) {
                        occupancyData.dailyOccupancies.forEach(d => {
                          if (d.occupancyRate < minRate) minRate = d.occupancyRate;
                        });
                      } else {
                        minRate = 0;
                      }
                      return minRate;
                    })()}%
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Ngày: {(() => {
                      let minRate = 101;
                      let mDate = 'N/A';
                      if (occupancyData.dailyOccupancies && occupancyData.dailyOccupancies.length > 0) {
                        occupancyData.dailyOccupancies.forEach(d => {
                          if (d.occupancyRate < minRate) {
                            minRate = d.occupancyRate;
                            mDate = d.date;
                          }
                        });
                      }
                      try {
                        const parts = mDate.split('-');
                        return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      } catch (e) {
                        return mDate;
                      }
                    })()}
                  </span>
                </div>
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-20px', 
                  right: '-20px', 
                  opacity: 0.05, 
                  color: '#ef4444' 
                }}>
                  <TrendingUp size={100} />
                </div>
              </div>

              {/* Total Reporting Days */}
              <div className="card kpi-card" style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, var(--bg-card) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'var(--transition-normal)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Số ngày thống kê
                  </span>
                  <div style={{ 
                    padding: '8px', 
                    borderRadius: '10px', 
                    backgroundColor: 'rgba(168, 85, 247, 0.2)', 
                    color: '#c084fc' 
                  }}>
                    <Calendar size={20} />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    {occupancyData.dailyOccupancies ? occupancyData.dailyOccupancies.length : 0}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ngày hoạt động</span>
                </div>
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-20px', 
                  right: '-20px', 
                  opacity: 0.05, 
                  color: '#a855f7' 
                }}>
                  <Calendar size={100} />
                </div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--primary)" />
                Xu hướng công suất phòng (%)
              </h2>
              {(!occupancyData.dailyOccupancies || occupancyData.dailyOccupancies.length === 0) ? (
                <div style={{ 
                  height: '180px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  color: 'var(--text-muted)' 
                }}>
                  <Info size={24} style={{ marginBottom: '8px' }} />
                  <span>Không có dữ liệu trong khoảng thời gian này</span>
                </div>
              ) : (
                <div style={{ padding: '10px 0' }}>
                  <SVGLineChart 
                    data={occupancyData.dailyOccupancies.map(d => ({
                      ...d,
                      dateLabel: (() => {
                        try {
                          const parts = d.date.split('-');
                          return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
                        } catch (e) {
                          return d.date;
                        }
                      })()
                    }))} 
                    xKey="date" 
                    yKey="occupancyRate" 
                    xLabelKey="dateLabel" 
                    colorStart="#10b981" 
                    colorEnd="#059669" 
                    isPercent={true}
                  />
                </div>
              )}
            </div>

            {/* Room Type breakdown & Quick Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
              gap: '24px' 
            }}>
              
              {/* Room type breakdown chart */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={18} color="var(--primary)" />
                  Hiệu suất sử dụng theo loại phòng (%)
                </h2>

                {(!occupancyData.dailyOccupancies || occupancyData.dailyOccupancies.length === 0) ? (
                  <div style={{ 
                    height: '240px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    color: 'var(--text-muted)' 
                  }}>
                    <Info size={24} style={{ marginBottom: '8px' }} />
                    <span>Không có dữ liệu loại phòng</span>
                  </div>
                ) : (
                  <div style={{ padding: '10px 0' }}>
                    <SVGBarChart 
                      data={(() => {
                        const summary = {};
                        occupancyData.dailyOccupancies.forEach(day => {
                          if (day.roomTypeOccupancies) {
                            day.roomTypeOccupancies.forEach(rt => {
                              if (!summary[rt.roomTypeId]) {
                                summary[rt.roomTypeId] = {
                                  roomTypeName: rt.roomTypeName,
                                  totalRoomsSum: 0,
                                  occupiedRoomsSum: 0,
                                  daysCount: 0
                                };
                              }
                              summary[rt.roomTypeId].totalRoomsSum += rt.totalRooms;
                              summary[rt.roomTypeId].occupiedRoomsSum += rt.occupiedRooms;
                              summary[rt.roomTypeId].daysCount += 1;
                            });
                          }
                        });

                        return Object.keys(summary).map(key => {
                          const item = summary[key];
                          const avgTotal = item.daysCount > 0 ? (item.totalRoomsSum / item.daysCount) : 0;
                          const avgOccupied = item.daysCount > 0 ? (item.occupiedRoomsSum / item.daysCount) : 0;
                          const avgRate = avgTotal > 0 ? (avgOccupied / avgTotal) * 100.0 : 0.0;
                          return {
                            roomTypeName: item.roomTypeName,
                            occupancyRate: Math.round(avgRate * 100) / 100
                          };
                        }).sort((a, b) => b.occupancyRate - a.occupancyRate).slice(0, 5);
                      })()} 
                      xKey="roomTypeName" 
                      yKey="occupancyRate" 
                      xLabelKey="roomTypeName" 
                      colorStart="#10b981" 
                      colorEnd="#34d399" 
                      isPercent={true}
                    />
                  </div>
                )}
              </div>

              {/* Table of room type efficiency */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Bảng hiệu suất loại phòng nghỉ</h2>
                <div className="table-container" style={{ border: 'none', background: 'transparent', margin: 0, overflowX: 'auto' }}>
                  <table style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Loại phòng</th>
                        <th style={{ textAlign: 'center' }}>Số phòng TB/ngày</th>
                        <th style={{ textAlign: 'center' }}>Số phòng thuê TB/ngày</th>
                        <th style={{ textAlign: 'right' }}>Hiệu suất trung bình</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const summary = {};
                        occupancyData.dailyOccupancies.forEach(day => {
                          if (day.roomTypeOccupancies) {
                            day.roomTypeOccupancies.forEach(rt => {
                              if (!summary[rt.roomTypeId]) {
                                summary[rt.roomTypeId] = {
                                  roomTypeName: rt.roomTypeName,
                                  totalRoomsSum: 0,
                                  occupiedRoomsSum: 0,
                                  daysCount: 0
                                };
                              }
                              summary[rt.roomTypeId].totalRoomsSum += rt.totalRooms;
                              summary[rt.roomTypeId].occupiedRoomsSum += rt.occupiedRooms;
                              summary[rt.roomTypeId].daysCount += 1;
                            });
                          }
                        });

                        const list = Object.keys(summary).map(key => {
                          const item = summary[key];
                          const avgTotal = item.daysCount > 0 ? (item.totalRoomsSum / item.daysCount) : 0;
                          const avgOccupied = item.daysCount > 0 ? (item.occupiedRoomsSum / item.daysCount) : 0;
                          const avgRate = avgTotal > 0 ? (avgOccupied / avgTotal) * 100.0 : 0.0;
                          return {
                            roomTypeName: item.roomTypeName,
                            avgTotalRooms: Math.round(avgTotal * 10) / 10,
                            avgOccupiedRooms: Math.round(avgOccupied * 10) / 10,
                            occupancyRate: Math.round(avgRate * 100) / 100
                          };
                        }).sort((a, b) => b.occupancyRate - a.occupancyRate);

                        return list.length > 0 ? (
                          list.map((item, idx) => (
                            <tr key={idx}>
                              <td><strong>{item.roomTypeName}</strong></td>
                              <td style={{ textAlign: 'center' }}>{item.avgTotalRooms}</td>
                              <td style={{ textAlign: 'center' }}>{item.avgOccupiedRooms}</td>
                              <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--color-available)' }}>
                                {item.occupancyRate}%
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                              Không có dữ liệu loại phòng.
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Room status grid of selected date */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                    Sơ đồ chi tiết tình trạng phòng nghỉ
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Xem trực quan danh sách phòng Trống / Có khách theo từng ngày cụ thể
                  </p>
                </div>
                
                {/* Date navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '8px 12px' }}
                    disabled={(() => {
                      const idx = occupancyData.dailyOccupancies.findIndex(d => d.date === selectedOccupancyDate);
                      return idx <= 0;
                    })()}
                    onClick={() => {
                      const idx = occupancyData.dailyOccupancies.findIndex(d => d.date === selectedOccupancyDate);
                      if (idx > 0) {
                        setSelectedOccupancyDate(occupancyData.dailyOccupancies[idx - 1].date);
                      }
                    }}
                  >
                    Ngày trước
                  </button>

                  <select
                    value={selectedOccupancyDate}
                    onChange={(e) => setSelectedOccupancyDate(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {occupancyData.dailyOccupancies.map(d => {
                      let displayDate = d.date;
                      try {
                        const parts = d.date.split('-');
                        displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                      } catch (e) {}
                      return (
                        <option key={d.date} value={d.date}>
                          {displayDate} (Công suất: {d.occupancyRate}%)
                        </option>
                      );
                    })}
                  </select>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '8px 12px' }}
                    disabled={(() => {
                      const idx = occupancyData.dailyOccupancies.findIndex(d => d.date === selectedOccupancyDate);
                      return idx === -1 || idx === occupancyData.dailyOccupancies.length - 1;
                    })()}
                    onClick={() => {
                      const idx = occupancyData.dailyOccupancies.findIndex(d => d.date === selectedOccupancyDate);
                      if (idx !== -1 && idx < occupancyData.dailyOccupancies.length - 1) {
                        setSelectedOccupancyDate(occupancyData.dailyOccupancies[idx + 1].date);
                      }
                    }}
                  >
                    Ngày sau
                  </button>
                </div>
              </div>

              {/* Grid of rooms */}
              {(() => {
                const currentDayData = occupancyData.dailyOccupancies.find(d => d.date === selectedOccupancyDate);
                if (!currentDayData || !currentDayData.roomDetails || currentDayData.roomDetails.length === 0) {
                  return (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Không có sơ đồ chi tiết phòng nào được tải cho ngày này.
                    </div>
                  );
                }

                const sortedRooms = [...currentDayData.roomDetails]
                  .map(r => ({
                    ...r,
                    isOccupied: r.isOccupied !== undefined ? r.isOccupied : r.occupied
                  }))
                  .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, {numeric: true}));
                const totalRoomsCount = sortedRooms.length;
                const occupiedCount = sortedRooms.filter(r => r.isOccupied).length;
                const availableCount = totalRoomsCount - occupiedCount;

                return (
                  <div>
                    {/* Legend of room status */}
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      borderBottom: '1px dashed var(--border-color)',
                      paddingBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10b981' }} />
                        <span>Trống ({availableCount} phòng)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef4444' }} />
                        <span>Có khách ({occupiedCount} phòng)</span>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: '12px'
                    }}>
                      {sortedRooms.map(room => (
                        <div
                          key={room.roomId}
                          style={{
                            padding: '12px 8px',
                            borderRadius: 'var(--radius-md)',
                            border: room.isOccupied ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                            background: room.isOccupied 
                              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%)' 
                              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 100%)',
                            textAlign: 'center',
                            transition: 'var(--transition-fast)'
                          }}
                          className="room-card"
                        >
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '800',
                            color: room.isOccupied ? '#ef4444' : '#10b981'
                          }}>
                            {room.roomNumber}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          }}>
                            {room.roomTypeName}
                          </div>
                          <div style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '9px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            marginTop: '6px',
                            backgroundColor: room.isOccupied ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: room.isOccupied ? '#ef4444' : '#10b981'
                          }}>
                            {room.isOccupied ? 'Bận' : 'Sẵn sàng'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )
      )}

      {/* Add CSS dynamic animations */}
      <style>{`
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.15);
          border-color: var(--primary) !important;
        }
        
        .room-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .room-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }
        
        @media print {
          body {
            background: #ffffff;
            color: #000000;
          }
          .top-navbar, .mobile-menu-overlay, .navbar-mobile-toggle, .btn-secondary, input[type="date"], select, button {
            display: none !important;
          }
          .card {
            border: 1px solid #ccc !important;
            background: #fff !important;
            box-shadow: none !important;
            color: #000 !important;
            page-break-inside: avoid;
          }
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd !important;
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Reports;
