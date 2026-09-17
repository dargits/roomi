import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IoBarChartOutline,
  IoPricetagOutline,
  IoTrendingUpOutline,
  IoStatsChartOutline,
  IoGlobeOutline,
  IoTimeOutline
} from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs/Tabs';
import RevenueReport from './RevenueReport';
import OccupancyReport from './OccupancyReport';
import AdrRevparReport from './AdrRevparReport';
import ChannelReport from './ChannelReport';
import DebtAgingReport from './DebtAgingReport';

const TABS = [
  { id: 'revenue',    label: 'Doanh thu',                                        icon: IoTrendingUpOutline },
  { id: 'debt-aging', label: 'Tuổi nợ & Nhắc thu',                              icon: IoTimeOutline },
  { id: 'occupancy',  label: 'Công suất phòng',                                  icon: IoPricetagOutline },
  { id: 'adr-revpar', label: 'Giá bán TB & Doanh thu/phòng (ADR & RevPAR)',       icon: IoStatsChartOutline },
  { id: 'channel',    label: 'Cơ cấu theo kênh',                                 icon: IoGlobeOutline }
];

const ReportsPage: React.FC = () => {
  const { user }       = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'revenue';

  const hasAccess = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role || '');
  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={IoBarChartOutline}
        title="Báo cáo & Phân tích"
        subtitle="Phân tích doanh thu, tuổi nợ & nhắc thu, công suất, hiệu quả giá bán và cơ cấu đặt phòng theo kênh"
      />

      {/* Tabs */}
      <Tabs tabs={TABS} paramKey="tab" defaultTab="revenue" className="mt-0" />

      {tab === 'revenue'    && <RevenueReport />}
      {tab === 'debt-aging' && <DebtAgingReport />}
      {tab === 'occupancy'  && <OccupancyReport />}
      {tab === 'adr-revpar' && <AdrRevparReport />}
      {tab === 'channel'    && <ChannelReport />}
    </div>
  );
};

export default ReportsPage;
