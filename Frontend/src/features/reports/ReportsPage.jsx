import React, { useState } from 'react';
import { IoBarChartOutline, IoPricetagOutline, IoTrendingUpOutline } from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import RevenueReport from './RevenueReport';
import OccupancyReport from './OccupancyReport';

const TABS = [
  { id: 'revenue',   label: 'Doanh thu',       icon: IoTrendingUpOutline },
  { id: 'occupancy', label: 'Công suất phòng', icon: IoPricetagOutline    }
];

const ReportsPage = () => {
  const { user }       = useAuth();
  const [tab, setTab]  = useState('revenue');

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
      <div className="flex bg-surface-container-low rounded-xl p-1 border border-border-grey w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-sm transition-colors ${
                tab === t.id
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'revenue'   && <RevenueReport />}
      {tab === 'occupancy' && <OccupancyReport />}
    </div>
  );
};

export default ReportsPage;
