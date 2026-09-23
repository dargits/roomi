import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IoBarChartOutline,
  IoPricetagOutline,
  IoTrendingUpOutline,
  IoStatsChartOutline,
  IoGlobeOutline,
  IoTimeOutline,
  IoGitCompareOutline,
  IoBriefcaseOutline,
  IoCartOutline,
  IoWalletOutline,
  IoSpeedometerOutline
} from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs/Tabs';
import RevenueReport from './RevenueReport';
import OccupancyReport from './OccupancyReport';
import AdrRevparReport from './AdrRevparReport';
import ChannelReport from './ChannelReport';
import DebtAgingReport from './DebtAgingReport';
import PeriodComparisonReport from './PeriodComparisonReport';
import NegotiatedRevenueReport from './NegotiatedRevenueReport';
import BestSellingServicesReport from './BestSellingServicesReport';

interface ReportCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }>;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'finance',
    name: 'Tài chính & Doanh thu',
    icon: IoWalletOutline,
    description: 'Phân tích doanh thu tổng hợp, dịch vụ phụ thu, tuổi nợ và so sánh đa kỳ',
    tabs: [
      { id: 'revenue',               label: 'Doanh thu',          icon: IoTrendingUpOutline },
      { id: 'best-selling-services', label: 'Dịch vụ phụ thu',    icon: IoCartOutline },
      { id: 'period-comparison',     label: 'So sánh kỳ trước',   icon: IoGitCompareOutline },
      { id: 'debt-aging',            label: 'Tuổi nợ & Nhắc thu',  icon: IoTimeOutline },
      { id: 'negotiated-revenue',    label: 'Giá thỏa thuận',     icon: IoBriefcaseOutline },
    ]
  },
  {
    id: 'operations',
    name: 'Hiệu suất & Vận hành',
    icon: IoSpeedometerOutline,
    description: 'Chỉ số công suất phòng, hiệu quả giá bán phòng và cơ cấu kênh',
    tabs: [
      { id: 'occupancy',             label: 'Công suất phòng',             icon: IoPricetagOutline },
      { id: 'adr-revpar',            label: 'Giá bán & Doanh thu phòng',    icon: IoStatsChartOutline },
      { id: 'channel',               label: 'Cơ cấu theo kênh',           icon: IoGlobeOutline },
    ]
  }
];

const ReportsPage: React.FC = () => {
  const { user }       = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'revenue';

  const hasAccess = ['OWNER', 'ACCOUNTANT', 'ADMIN', 'RECEPTIONIST'].includes(user?.role || '');
  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  // Tự động xác định nhóm danh mục dựa trên tab đang kích hoạt trong URL
  const activeCategory =
    REPORT_CATEGORIES.find((cat) => cat.tabs.some((t) => t.id === currentTab)) ||
    REPORT_CATEGORIES[0];

  const handleCategoryChange = (categoryId: string) => {
    const targetCat = REPORT_CATEGORIES.find((c) => c.id === categoryId);
    if (targetCat && !targetCat.tabs.some((t) => t.id === currentTab)) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', targetCat.tabs[0].id);
      setSearchParams(newParams);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={IoBarChartOutline}
        title="Báo cáo & Phân tích"
        subtitle="Phân tích doanh thu, so sánh chỉ số đa kỳ, tuổi nợ, công suất, hiệu quả giá bán và cơ cấu đặt phòng theo kênh"
      />

      {/* Bộ chuyển đổi nhóm danh mục Báo cáo (Category Switcher) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-bright p-2 rounded-2xl border border-border-grey shadow-2xs">
        <div className="inline-flex p-1 bg-surface-container-low rounded-xl border border-border-grey/70">
          {REPORT_CATEGORIES.map((category) => {
            const isCategoryActive = activeCategory.id === category.id;
            const CatIcon = category.icon;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryChange(category.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isCategoryActive
                    ? 'bg-surface-bright text-[#1A2411] font-bold shadow-xs border border-border-grey/80'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50'
                }`}
              >
                <CatIcon className={isCategoryActive ? 'text-primary' : 'text-on-surface-variant'} size={18} />
                <span>{category.name}</span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full transition-colors ${
                    isCategoryActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {category.tabs.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chú thích nhóm báo cáo */}
        <div className="text-xs text-on-surface-variant hidden md:flex items-center gap-2 px-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse" />
          <span>{activeCategory.description}</span>
        </div>
      </div>

      {/* Tabs tương ứng với nhóm đang chọn */}
      <Tabs tabs={activeCategory.tabs} paramKey="tab" defaultTab={activeCategory.tabs[0].id} className="mt-0" />

      {currentTab === 'revenue'               && <RevenueReport />}
      {currentTab === 'best-selling-services' && <BestSellingServicesReport />}
      {currentTab === 'period-comparison'     && <PeriodComparisonReport />}
      {currentTab === 'debt-aging'            && <DebtAgingReport />}
      {currentTab === 'occupancy'             && <OccupancyReport />}
      {currentTab === 'adr-revpar'            && <AdrRevparReport />}
      {currentTab === 'channel'               && <ChannelReport />}
      {currentTab === 'negotiated-revenue'    && <NegotiatedRevenueReport />}
    </div>
  );
};

export default ReportsPage;

