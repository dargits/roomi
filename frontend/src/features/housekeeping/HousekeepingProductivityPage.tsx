import React from 'react';
import { IoTrendingUpOutline } from 'react-icons/io5';
import PageHeader from '../../components/ui/PageHeader';
import HousekeepingProductivityReport from './HousekeepingProductivityReport';

const HousekeepingProductivityPage: React.FC = () => {
  return (
    <div className="space-y-5">
      <PageHeader
        icon={IoTrendingUpOutline}
        title="Năng Suất & Định Mức Buồng Phòng"
        subtitle="Theo dõi định mức thời gian, tiến độ dọn phòng và năng suất của toàn bộ nhân viên buồng phòng"
      />
      <HousekeepingProductivityReport />
    </div>
  );
};

export default HousekeepingProductivityPage;
