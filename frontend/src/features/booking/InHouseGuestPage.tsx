import React from 'react';
import { IoBedOutline } from 'react-icons/io5';
import InHouseGuestList from './InHouseGuestList';

const InHouseGuestPage: React.FC = () => {
  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-border-grey bg-surface-container-lowest flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <IoBedOutline size={20} />
          </div>
          <div>
            <h2 className="font-title-lg text-on-surface font-bold text-base sm:text-lg leading-tight">
              Danh Sách Khách Đang Lưu Trú
            </h2>
            <p className="text-xs text-on-surface-variant">
              Theo dõi tình trạng phòng đang có khách, số lượng người, thời gian lưu trú và công nợ phát sinh
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <InHouseGuestList />
    </div>
  );
};

export default InHouseGuestPage;
