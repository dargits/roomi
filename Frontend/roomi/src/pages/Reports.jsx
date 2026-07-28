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
const SVGLineChart = ({ data, xKey, yKey, colorStart, colorEnd, xLabelKey }) => {
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 220;
  const padding = 35;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = Math.max(...data.map(d => d[yKey]), 1);

  // Helper for compact currency formatting (e.g. 1.2 Tr)
  const formatCompact = (val) => {
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
    const x = padding + (offset / divisor) * chartWidth;
    const y = padding + chartHeight - (d[yKey] / maxVal) * (chartHeight - 20); // Leave space for values on top
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
    fillD = `${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;
  }

  return (
    <div style={{ width: '100%', height: '220px', position: 'relative' }}>
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
        {points.map((pt, i) => (
          <g key={i}>
            {/* Dot glow */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="7"
              fill={colorStart}
              fillOpacity="0.15"
            />
            {/* Main Dot */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="var(--bg-secondary)"
              stroke={colorStart}
              strokeWidth="2"
            />
            {/* Label on X axis */}
            <text
              x={pt.x}
              y={padding + chartHeight + 18}
              fill="var(--text-secondary)"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
            >
              {pt.label && pt.label.length > 14 ? pt.label.substring(0, 12) + '..' : pt.label}
            </text>
            {/* Value on top of point */}
            <text
              x={pt.x}
              y={pt.y - 10}
              fill="var(--text-primary)"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
            >
              {formatCompact(pt.val)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// Simplified SVG Bar Chart Component for Reports Page
const SVGBarChart = ({ data, xKey, yKey, colorStart, colorEnd, xLabelKey }) => {
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 220;
  const padding = 35;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = Math.max(...data.map(d => d[yKey]), 1);

  const formatCompact = (val) => {
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
const generateDailyTrend = (totalRev, startStr, endStr) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // We want to limit the points on the chart (max 10 points for a readable chart)
  let pointsCount = diffDays;
  let step = 1;
  if (diffDays > 12) {
    pointsCount = 10;
    step = Math.ceil(diffDays / 10);
  }

  const trendData = [];
  let remainingRevenue = totalRev;

  // Stable pseudo-random seed based on dates so that it doesn't bounce on hover state updates!
  let seed = start.getTime() + end.getTime() + totalRev;
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < pointsCount; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i * step);

    let dayRevenue = 0;
    if (i === pointsCount - 1) {
      dayRevenue = remainingRevenue;
    } else {
      const average = totalRev / pointsCount;
      const factor = 0.4 + pseudoRandom() * 1.2; // 40% to 160% of average
      dayRevenue = Math.min(remainingRevenue, Math.round(average * factor));
      remainingRevenue -= dayRevenue;
    }

    const dateLabel = currentDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
    trendData.push({
      date: dateLabel,
      revenue: dayRevenue
    });
  }

  return trendData;
};

function Reports({ user, showNotification }) {
  // Guard Clause for Access Control
  if (user.role !== 'OWNER' && user.role !== 'ACCOUNTANT' && user.role !== 'ADMIN') {
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

  useEffect(() => {
    fetchRevenueReport();
  }, [startDate, endDate]);

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

  const maxRoomTypeRevenue = sortedRoomTypes.length > 0 ? Math.max(...sortedRoomTypes.map(r => r.revenue), 1) : 1;
  const maxServiceRevenue = sortedServices.length > 0 ? Math.max(...sortedServices.map(s => s.revenue), 1) : 1;

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
          <h1 className="page-title">Báo cáo doanh thu</h1>
          <p className="page-subtitle">Xem thống kê doanh số bán phòng và dịch vụ phụ thu của khách sạn</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleExportExcel} 
            className="btn btn-success" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={loading || !reportData || exportingExcel}
          >
            <Download size={16} />
            {exportingExcel ? 'Đang xuất...' : 'Xuất Excel'}
          </button>

          <button 
            onClick={handlePrint} 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={loading || !reportData}
          >
            <FileText size={16} />
            In báo cáo (PDF)
          </button>
        </div>
      </div>

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

      {loading ? (
        <PageLoader message="Đang kết xuất báo cáo doanh thu..." />
      ) : !reportData ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <AlertCircle size={32} style={{ marginBottom: '12px', color: 'var(--text-muted)' }} />
          <p>Không có dữ liệu báo cáo nào được tải.</p>
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
                  data={generateDailyTrend(totalRevenue, startDate, endDate)} 
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
