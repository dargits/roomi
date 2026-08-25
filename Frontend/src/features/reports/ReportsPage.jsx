import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { IoBarChartOutline, IoPricetagOutline, IoTrendingUpOutline } from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs/Tabs';
import RevenueReport from './RevenueReport';
import OccupancyReport from './OccupancyReport';

const TABS = [
  { id: 'revenue',   label: 'Doanh thu',       icon: IoTrendingUpOutline },
  { id: 'occupancy', label: 'Công suất phòng', icon: IoPricetagOutline    }
];

const ReportsPage = () => {
  const { user }       = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'revenue';

  const hasAccess = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role);
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
        title="Báo cáo"
        subtitle="Phân tích doanh thu và công suất hoạt động"
      />

      {/* Tabs */}
      <Tabs tabs={TABS} paramKey="tab" defaultTab="revenue" className="mt-0" />

      {tab === 'revenue'   && <RevenueReport />}
      {tab === 'occupancy' && <OccupancyReport />}
    </div>
  );
};

export default ReportsPage;
