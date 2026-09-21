import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IoBrushOutline, IoListOutline, IoWarningOutline, IoCubeOutline } from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs/Tabs';
import CleaningTaskList from './CleaningTaskList';
import RoomStatusUpdate from './RoomStatusUpdate';
import RoomIncidentModal from './RoomIncidentModal';
import LostAndFoundPage from './LostAndFoundPage';

const TABS = [
  { id: 'tasks',          label: 'Phòng cần dọn',        icon: IoBrushOutline },
  { id: 'overview',       label: 'Tổng quan phòng',       icon: IoListOutline  },
  { id: 'lost-and-found', label: 'Đồ khách để quên',     icon: IoCubeOutline },
  { id: 'incidents',      label: 'Sự cố phòng & Bảo trì', icon: IoWarningOutline }
];

const HousekeepingPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'tasks';
  const [refreshKey, setRefreshKey] = useState(0);

  const hasAccess = ['OWNER', 'HOUSEKEEPER', 'RECEPTIONIST', 'ADMIN'].includes(user?.role || '');
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
        subtitle="Quản lý vệ sinh, trạng thái phòng và đồ khách để quên"
      />

      {/* Tabs */}
      <Tabs tabs={TABS} paramKey="tab" defaultTab="tasks" variant="pill" className="mt-0" />

      {tab === 'tasks' && (
        <CleaningTaskList
          key={`tasks-${refreshKey}`}
          onRoomCleaned={() => setRefreshKey(k => k + 1)}
        />
      )}
      {tab === 'overview' && <RoomStatusUpdate key={`overview-${refreshKey}`} />}
      {tab === 'lost-and-found' && <LostAndFoundPage key={`lost-and-found-${refreshKey}`} />}
      {tab === 'incidents' && (
        <RoomIncidentModal
          isOpen={true}
          onClose={() => setSearchParams({ tab: 'tasks' })}
          onIncidentReported={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
};

export default HousekeepingPage;
