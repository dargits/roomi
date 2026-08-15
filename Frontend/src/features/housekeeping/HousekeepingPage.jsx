import React, { useState } from 'react';
import { IoBrushOutline, IoListOutline } from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import CleaningTaskList from './CleaningTaskList';
import RoomStatusUpdate from './RoomStatusUpdate';

const TABS = [
  { id: 'tasks',    label: 'Phòng cần dọn',  icon: IoBrushOutline },
  { id: 'overview', label: 'Tổng quan phòng', icon: IoListOutline  }
];

const HousekeepingPage = () => {
  const { user }          = useAuth();
  const [tab, setTab]     = useState('tasks');
  const [refreshKey, setRefreshKey] = useState(0);

  const hasAccess = ['OWNER', 'HOUSEKEEPER', 'RECEPTIONIST', 'ADMIN'].includes(user?.role);
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
        icon={IoBrushOutline}
        title="Buồng phòng"
        subtitle="Quản lý vệ sinh và trạng thái phòng"
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

      {tab === 'tasks' && (
        <CleaningTaskList
          key={`tasks-${refreshKey}`}
          onRoomCleaned={() => setRefreshKey(k => k + 1)}
        />
      )}
      {tab === 'overview' && <RoomStatusUpdate key={`overview-${refreshKey}`} />}
    </div>
  );
};

export default HousekeepingPage;
