import React, { useState, useEffect, useMemo } from 'react';
import {
  IoCartOutline,
  IoCashOutline,
  IoFlashOutline,
  IoAlertCircleOutline,
  IoDownloadOutline,
  IoRefreshOutline,
  IoSearchOutline,
  IoCheckmarkCircleOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoSparklesOutline,
  IoBedOutline,
  IoFilterOutline,
  IoInformationCircleOutline,
  IoTrendingUpOutline,
  IoPieChartOutline,
  IoArrowForwardOutline
} from 'react-icons/io5';
import reportApi from '../../services/reportApi';
import { BestSellingServicesReportResponse, CatalogServiceItem, AutoSurchargeItem } from '../../types';
import LoadingScreen from '../../components/common/LoadingScreen';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const fmtCompactCurrency = (amount?: number) => {
  if (!amount || amount === 0) return '0 đ';
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + ' tỷ';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + ' tr';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + ' k';
  return amount + ' đ';
};

const getDefaultDates = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;
  const firstDay = `${y}-${m}-01`;
  return { from: firstDay, to: today };
};

const BestSellingServicesReport: React.FC = () => {
  const defaultDates = getDefaultDates();
  const [fromDate, setFromDate] = useState<string>(defaultDates.from);
  const [toDate, setToDate] = useState<string>(defaultDates.to);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('ALL');

  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [data, setData] = useState<BestSellingServicesReportResponse | null>(null);

  // Active sub-tab: 'catalog' | 'auto' | 'room-types'
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'auto' | 'room-types'>('catalog');

  // Filter for catalog services: 'all' | 'active_sales' | 'zero_sales'
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'active_sales' | 'zero_sales'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Expanded rows for catalog service room type breakdown
  const [expandedServices, setExpandedServices] = useState<Record<number, boolean>>({});

  const toggleExpand = (serviceId: number) => {
    setExpandedServices(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const roomTypeId = selectedRoomType !== 'ALL' ? Number(selectedRoomType) : undefined;
      const res = await reportApi.getBestSellingServicesReport(fromDate, toDate, roomTypeId);
      setData(res);
    } catch (err) {
      console.error('Lỗi khi tải báo cáo dịch vụ phụ thu bán chạy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [fromDate, toDate, selectedRoomType]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await reportApi.exportBestSellingServicesCsv(fromDate, toDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao_cao_dich_vu_phu_thu_${fromDate}_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Lỗi khi xuất CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  const handlePresetDate = (type: 'today' | '7days' | 'this_month' | 'last_month') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (type === 'today') {
      const dStr = `${y}-${pad(m + 1)}-${pad(now.getDate())}`;
      setFromDate(dStr);
      setToDate(dStr);
    } else if (type === '7days') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 6);
      setFromDate(`${past7.getFullYear()}-${pad(past7.getMonth() + 1)}-${pad(past7.getDate())}`);
      setToDate(`${y}-${pad(m + 1)}-${pad(now.getDate())}`);
    } else if (type === 'this_month') {
      setFromDate(`${y}-${pad(m + 1)}-01`);
      setToDate(`${y}-${pad(m + 1)}-${pad(now.getDate())}`);
    } else if (type === 'last_month') {
      const firstPrev = new Date(y, m - 1, 1);
      const lastPrev = new Date(y, m, 0);
      setFromDate(`${firstPrev.getFullYear()}-${pad(firstPrev.getMonth() + 1)}-01`);
      setToDate(`${lastPrev.getFullYear()}-${pad(lastPrev.getMonth() + 1)}-${pad(lastPrev.getDate())}`);
    }
  };

  // Filtered catalog services
  const filteredCatalogServices = useMemo(() => {
    if (!data?.catalogServices) return [];
    return data.catalogServices.filter(item => {
      // Filter by search
      if (searchTerm && !item.serviceName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Filter by sub category
      if (catalogFilter === 'active_sales' && item.salesCount === 0) {
        return false;
      }
      if (catalogFilter === 'zero_sales' && item.salesCount > 0) {
        return false;
      }
      return true;
    });
  }, [data?.catalogServices, searchTerm, catalogFilter]);

  // Max revenue among catalog services for relative bar visualization
  const maxCatalogRev = useMemo(() => {
    if (!data?.catalogServices || data.catalogServices.length === 0) return 1;
    const max = Math.max(...data.catalogServices.map(i => i.revenue || 0));
    return max > 0 ? max : 1;
  }, [data?.catalogServices]);

  if (loading && !data) {
    return <LoadingScreen message="Đang phân tích số liệu dịch vụ phụ thu bán chạy..." />;
  }

  const summary = data?.summary;
  const catalogSharePct = summary && summary.totalSurchargeRevenue > 0
    ? ((summary.catalogServicesRevenue / summary.totalSurchargeRevenue) * 100).toFixed(1)
    : '0.0';
  const autoSharePct = summary && summary.totalSurchargeRevenue > 0
    ? ((summary.autoSurchargeRevenue / summary.totalSurchargeRevenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* 1. FILTER BAR */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick presets & Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Input
                label="Từ ngày"
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-36 text-sm"
              />
              <span className="text-on-surface-variant text-sm mt-5">→</span>
              <Input
                label="Đến ngày"
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-36 text-sm"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 pt-5">
              <button
                onClick={() => handlePresetDate('7days')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border-grey bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                7 ngày qua
              </button>
              <button
                onClick={() => handlePresetDate('this_month')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border-grey bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                Tháng này
              </button>
              <button
                onClick={() => handlePresetDate('last_month')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border-grey bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                Tháng trước
              </button>
            </div>

            {/* Room Type Selector */}
            <div className="w-56 pt-1">
              <Select
                label="Loại phòng so sánh"
                value={selectedRoomType}
                onChange={e => setSelectedRoomType(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả loại phòng' },
                  ...(data?.roomTypeComparisons.map(rt => ({
                    value: String(rt.roomTypeId),
                    label: rt.roomTypeName
                  })) || [])
                ]}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end lg:self-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadReport}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <IoRefreshOutline size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center gap-1.5"
            >
              <IoDownloadOutline size={16} />
              {exporting ? 'Đang xuất...' : 'Xuất CSV'}
            </Button>
          </div>
        </div>

        {/* Note on data source matching revenue report */}
        <div className="mt-4 pt-3 border-t border-border-grey/50 flex items-center gap-2 text-xs text-on-surface-variant">
          <IoInformationCircleOutline size={16} className="text-primary shrink-0" />
          <span>
            Số liệu phụ thu được trích xuất trực tiếp từ các <strong>hóa đơn đã lập hợp lệ</strong> (khớp với Báo cáo Doanh thu). Dịch vụ đã ghi nhận nhưng chưa vào hóa đơn không được tính vào kỳ này.
          </span>
        </div>
      </div>

      {/* 2. KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng Doanh Thu Phụ Thu */}
        <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Tổng Phụ Thu Kỳ Này
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IoCashOutline size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface">
            {fmtCurrency(summary?.totalSurchargeRevenue)}
          </div>
          <div className="text-xs text-on-surface-variant mt-2 flex items-center gap-2">
            <span className="font-medium text-on-surface">{summary?.totalSalesCount || 0} lượt</span>
            <span>•</span>
            <span>{summary?.totalQuantity || 0} số lượng</span>
          </div>
        </div>

        {/* Card 2: Dịch Vụ Chủ Động Mua */}
        <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Dịch Vụ Khách Chủ Động Mua
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IoCartOutline size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface">
            {fmtCurrency(summary?.catalogServicesRevenue)}
          </div>
          <div className="text-xs text-on-surface-variant mt-2 flex items-center justify-between">
            <span>Chiếm <strong>{catalogSharePct}%</strong> tổng phụ thu</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
              {summary?.totalCatalogServices || 0} dịch vụ
            </span>
          </div>
        </div>

        {/* Card 3: Phụ Thu Tự Động */}
        <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Phụ Thu Sinh Tự Động
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <IoFlashOutline size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface">
            {fmtCurrency(summary?.autoSurchargeRevenue)}
          </div>
          <div className="text-xs text-on-surface-variant mt-2 flex items-center justify-between">
            <span>Chiếm <strong>{autoSharePct}%</strong> tổng phụ thu</span>
            <span className="text-[11px] text-amber-700 font-medium">Thêm người, lệch giờ</span>
          </div>
        </div>

        {/* Card 4: Dịch Vụ 0 Lượt Bán (Cảnh Báo Cân Nhắc Bỏ) */}
        <div
          onClick={() => {
            setActiveSubTab('catalog');
            setCatalogFilter('zero_sales');
          }}
          className="bg-surface-container-lowest border border-border-grey hover:border-red-300 rounded-2xl p-5 shadow-xs cursor-pointer transition-all hover:shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-error">
              Không Ai Dùng (0 Lượt)
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-error flex items-center justify-center group-hover:scale-110 transition-transform">
              <IoAlertCircleOutline size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-error">
            {summary?.zeroSalesCatalogServices || 0} dịch vụ
          </div>
          <div className="text-xs text-on-surface-variant mt-2 flex items-center justify-between">
            <span className="group-hover:underline text-error/80 font-medium">Bấm để lọc cân nhắc bỏ</span>
            <IoArrowForwardOutline size={14} className="text-error" />
          </div>
        </div>
      </div>

      {/* 3. VISUAL CHARTS: TOP REVENUE SERVICES & STRUCTURE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Best-Selling Services Bar Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
                <IoTrendingUpOutline size={20} className="text-primary" />
                Top Dịch Vụ Do Khách Mua Mang Lại Doanh Thu Cao Nhất
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Các dịch vụ chiếm tỷ trọng doanh thu cao cần được đẩy mạnh và đảm bảo sẵn sàng
              </p>
            </div>
            {summary?.topServiceName && summary.topServiceName !== 'Chưa có' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                <IoSparklesOutline size={13} />
                Quán quân: {summary.topServiceName}
              </span>
            )}
          </div>

          <div className="space-y-3.5 pt-2">
            {data?.catalogServices && data.catalogServices.filter(s => s.revenue > 0).slice(0, 5).length > 0 ? (
              data.catalogServices
                .filter(s => s.revenue > 0)
                .slice(0, 5)
                .map((service, idx) => {
                  const widthPct = Math.max(5, Math.min(100, (service.revenue / maxCatalogRev) * 100));
                  return (
                    <div key={service.serviceId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-surface-container font-mono text-[10px] font-bold flex items-center justify-center text-on-surface-variant">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-on-surface">{service.serviceName}</span>
                          <span className="text-on-surface-variant">
                            ({service.salesCount} lượt • {service.totalQuantity} {service.unit})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">{fmtCurrency(service.revenue)}</span>
                          <span className="text-[11px] font-semibold text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                            {service.revenueShare}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-sm text-on-surface-variant">
                Chưa phát sinh doanh thu từ dịch vụ chủ động trong khoảng thời gian này.
              </div>
            )}
          </div>
        </div>

        {/* Revenue Structure Breakdown */}
        <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-headline-sm text-on-surface flex items-center gap-2 mb-1">
              <IoPieChartOutline size={20} className="text-indigo-600" />
              Cơ Cấu Nguồn Phụ Thu
            </h3>
            <p className="text-xs text-on-surface-variant">
              Tỷ lệ giữa dịch vụ chủ động và phụ thu tự động hệ thống
            </p>

            <div className="mt-6 space-y-4">
              {/* Active Catalog Services bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-on-surface flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                    Khách chủ động mua
                  </span>
                  <span className="font-bold text-indigo-700">{catalogSharePct}%</span>
                </div>
                <div className="text-sm font-semibold text-on-surface">
                  {fmtCurrency(summary?.catalogServicesRevenue)}
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${catalogSharePct}%` }} />
                </div>
              </div>

              {/* Auto Surcharges bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-on-surface flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Phụ thu sinh tự động
                  </span>
                  <span className="font-bold text-amber-700">{autoSharePct}%</span>
                </div>
                <div className="text-sm font-semibold text-on-surface">
                  {fmtCurrency(summary?.autoSurchargeRevenue)}
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${autoSharePct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border-grey/60 text-xs text-on-surface-variant bg-surface-container/40 p-3 rounded-xl">
            <span className="font-semibold text-on-surface block mb-1">Gợi ý cho Chủ cơ sở:</span>
            {summary && summary.zeroSalesCatalogServices > 0 ? (
              <span>
                Hiện có <strong className="text-error">{summary.zeroSalesCatalogServices} dịch vụ 0 lượt bán</strong>. Bạn nên kiểm tra menu, giảm bớt chi phí duy trì hoặc đổi mới gói dịch vụ.
              </span>
            ) : (
              <span>
                Tất cả dịch vụ trong danh mục đều đã phát sinh lượt bán. Tiếp tục duy trì chất lượng phục vụ.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. TABS CONTENT */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl shadow-xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-border-grey px-4 pt-3 bg-surface-container/30">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`pb-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === 'catalog'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <IoCartOutline size={18} />
            Dịch vụ trong danh mục (Khách chủ động mua)
            <span className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant">
              {data?.catalogServices.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('auto')}
            className={`pb-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === 'auto'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <IoFlashOutline size={18} />
            Dòng phụ thu sinh tự động (Hệ thống)
            <span className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant">
              {data?.autoSurcharges.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('room-types')}
            className={`pb-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === 'room-types'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <IoBedOutline size={18} />
            So sánh tiêu thụ giữa các loại phòng
            <span className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant">
              {data?.roomTypeComparisons.length || 0}
            </span>
          </button>
        </div>

        {/* TAB 1: CATALOG SERVICES */}
        {activeSubTab === 'catalog' && (
          <div className="p-5 space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCatalogFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    catalogFilter === 'all'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  Tất cả ({data?.catalogServices.length || 0})
                </button>
                <button
                  onClick={() => setCatalogFilter('active_sales')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    catalogFilter === 'active_sales'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  Có phát sinh bán ({data?.catalogServices.filter(s => s.salesCount > 0).length || 0})
                </button>
                <button
                  onClick={() => setCatalogFilter('zero_sales')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    catalogFilter === 'zero_sales'
                      ? 'bg-error text-white shadow-xs'
                      : 'bg-red-50 text-error hover:bg-red-100'
                  }`}
                >
                  Không ai dùng (0 lượt) ({summary?.zeroSalesCatalogServices || 0})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
                <input
                  type="text"
                  placeholder="Tìm theo tên dịch vụ..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-container border border-border-grey rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/60"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-border-grey rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container border-b border-border-grey text-on-surface-variant font-semibold">
                    <th className="py-3 px-3 w-8"></th>
                    <th className="py-3 px-3">Tên dịch vụ</th>
                    <th className="py-3 px-3 text-right">Đơn giá</th>
                    <th className="py-3 px-3 text-center">Đơn vị</th>
                    <th className="py-3 px-3 text-right">Số lượt bán</th>
                    <th className="py-3 px-3 text-right">Tổng số lượng</th>
                    <th className="py-3 px-3 text-right">Doanh thu mang lại</th>
                    <th className="py-3 px-3 text-right">Tỷ trọng (%)</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-3">Đánh giá & Khuyến nghị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey/50">
                  {filteredCatalogServices.length > 0 ? (
                    filteredCatalogServices.map(service => {
                      const isExpanded = !!expandedServices[service.serviceId];
                      const isZeroSales = service.salesCount === 0;
                      const isHot = service.revenueShare >= 20;

                      return (
                        <React.Fragment key={service.serviceId}>
                          <tr
                            className={`hover:bg-surface-container/50 transition-colors ${
                              isZeroSales ? 'bg-red-50/20' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              {service.roomTypeBreakdown.length > 0 && (
                                <button
                                  onClick={() => toggleExpand(service.serviceId)}
                                  className="text-on-surface-variant hover:text-on-surface p-1"
                                  title="Xem phân rã theo loại phòng"
                                >
                                  {isExpanded ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-on-surface">
                              <div className="flex items-center gap-1.5">
                                <span>{service.serviceName}</span>
                                {service.roomTypeBreakdown.length > 0 && (
                                  <span className="text-[10px] text-on-surface-variant/70 font-normal">
                                    ({service.roomTypeBreakdown.length} loại phòng dùng)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-on-surface">
                              {fmtCurrency(service.unitPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-center text-on-surface-variant">
                              {service.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-on-surface">
                              {service.salesCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-on-surface">
                              {service.totalQuantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-primary font-mono text-sm">
                              {fmtCurrency(service.revenue)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-on-surface">
                              <div className="flex items-center justify-end gap-1.5">
                                <span>{service.revenueShare}%</span>
                                <div className="w-12 h-1.5 bg-surface-container rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(100, service.revenueShare)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {service.active ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                  <IoCheckmarkCircleOutline size={11} />
                                  Đang bán
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container text-on-surface-variant">
                                  Ngưng bán
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {isZeroSales ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-error">
                                  <IoAlertCircleOutline size={14} />
                                  Không ai dùng — Cân nhắc bỏ
                                </span>
                              ) : isHot ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800">
                                  <IoSparklesOutline size={14} />
                                  Bán chạy ({service.revenueShare}%) — Đẩy mạnh
                                </span>
                              ) : (
                                <span className="text-xs text-on-surface-variant">
                                  Bình thường ({service.salesCount} lượt)
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded row for room type breakdown */}
                          {isExpanded && service.roomTypeBreakdown.length > 0 && (
                            <tr className="bg-surface-container/30">
                              <td colSpan={10} className="py-3 px-8">
                                <div className="bg-surface-container-lowest border border-border-grey rounded-xl p-3.5 space-y-2">
                                  <div className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                                    <IoBedOutline size={15} className="text-primary" />
                                    Phân rã tiêu thụ dịch vụ "{service.serviceName}" theo từng loại phòng:
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                                    {service.roomTypeBreakdown.map(rt => (
                                      <div
                                        key={rt.roomTypeId}
                                        className="p-2.5 bg-surface-container/50 rounded-lg border border-border-grey/60 text-xs"
                                      >
                                        <div className="font-semibold text-on-surface">{rt.roomTypeName}</div>
                                        <div className="mt-1 flex items-center justify-between text-on-surface-variant">
                                          <span>Lượt: <strong>{rt.salesCount}</strong> (SL: {rt.totalQuantity})</span>
                                          <span className="font-bold text-primary">{fmtCurrency(rt.revenue)}</span>
                                        </div>
                                        <div className="text-[11px] text-on-surface-variant/80 mt-0.5 text-right">
                                          Chiếm {rt.shareInService}% tổng doanh thu món này
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-on-surface-variant">
                        Không tìm thấy dịch vụ phù hợp với điều kiện lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: AUTO SURCHARGES */}
        {activeSubTab === 'auto' && (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50/50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
              <IoFlashOutline size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Nhóm phụ thu sinh tự động của hệ thống:</strong> Bao gồm phụ thu thêm người (người ở ghép vượt quá sức chứa tiêu chuẩn của phòng) và phụ thu lệch giờ (nhận phòng sớm, trả phòng trễ). Nhóm này được tách riêng hoàn toàn để không làm nhiễu danh mục dịch vụ bán lẻ do khách chủ động chọn.
              </div>
            </div>

            <div className="overflow-x-auto border border-border-grey rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container border-b border-border-grey text-on-surface-variant font-semibold">
                    <th className="py-3 px-3">Mã loại</th>
                    <th className="py-3 px-3">Khoản phụ thu</th>
                    <th className="py-3 px-3 text-right">Số lượt phát sinh</th>
                    <th className="py-3 px-3 text-right">Tổng số lượng</th>
                    <th className="py-3 px-3 text-right">Doanh thu thu về</th>
                    <th className="py-3 px-3 text-right">Tỷ trọng (% tổng phụ thu)</th>
                    <th className="py-3 px-3">Phân bổ loại phòng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey/50">
                  {data?.autoSurcharges && data.autoSurcharges.length > 0 ? (
                    data.autoSurcharges.map(item => (
                      <tr key={item.code} className="hover:bg-surface-container/50">
                        <td className="py-3 px-3 font-mono font-semibold text-on-surface-variant">
                          <span className="px-2 py-0.5 rounded bg-surface-container text-xs">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-on-surface text-sm">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-on-surface text-sm">
                          {item.salesCount} lượt
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-on-surface">
                          {item.totalQuantity}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-600 font-mono text-sm">
                          {fmtCurrency(item.revenue)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-on-surface">
                          {item.revenueShare}%
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {item.roomTypeBreakdown.map(rt => (
                              <span
                                key={rt.roomTypeId}
                                className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface"
                                title={`Doanh thu: ${fmtCurrency(rt.revenue)} (${rt.salesCount} lượt)`}
                              >
                                {rt.roomTypeName}: <strong>{fmtCurrency(rt.revenue)}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                        Không có khoản phụ thu tự động nào phát sinh trong kỳ báo cáo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ROOM TYPE COMPARISON */}
        {activeSubTab === 'room-types' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                  <IoBedOutline size={18} className="text-primary" />
                  So sánh tiêu thụ dịch vụ phụ thu giữa các loại phòng
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Nhận biết phân khúc khách hàng ở loại phòng nào chi tiêu dịch vụ nhiều nhất và dịch vụ ưa thích của từng nhóm
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {data?.roomTypeComparisons && data.roomTypeComparisons.length > 0 ? (
                data.roomTypeComparisons.map((rt, idx) => (
                  <div
                    key={rt.roomTypeId}
                    className="bg-surface-container/30 border border-border-grey rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-on-surface">{rt.roomTypeName}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="text-xl font-bold text-primary font-mono mb-1">
                        {fmtCurrency(rt.totalRevenue)}
                      </div>
                      <div className="text-xs text-on-surface-variant mb-4">
                        Chiếm <strong>{rt.revenueShare}%</strong> tổng phụ thu • {rt.salesCount} lượt dùng
                      </div>

                      {/* Top services for this room type */}
                      <div className="space-y-2 border-t border-border-grey/50 pt-3">
                        <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                          Dịch vụ tiêu thụ nhiều nhất:
                        </span>
                        {rt.topServices && rt.topServices.length > 0 ? (
                          rt.topServices.map((s, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between text-xs">
                              <span className="text-on-surface truncate pr-2">• {s.name}</span>
                              <span className="font-medium text-on-surface-variant shrink-0">
                                {fmtCompactCurrency(s.revenue)} ({s.quantity})
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">Chưa sử dụng dịch vụ</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-on-surface-variant text-sm">
                  Chưa có dữ liệu so sánh loại phòng.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BestSellingServicesReport;
