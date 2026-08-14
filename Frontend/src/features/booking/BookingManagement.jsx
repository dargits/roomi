import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, List, Plus, Search, Map, DoorOpen, LogIn, LogOut, XCircle, User, Edit } from 'lucide-react';
import bookingApi from '../../services/bookingApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

import BookingList from './BookingList';
import BookingCalendar from './BookingCalendar';
import BookingForm from './BookingForm';
import BookingRequestList from './BookingRequestList';

const BookingManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'calendar'
  
  // States cho BookingForm
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasAccess = user?.role === 'OWNER' || user?.role === 'RECEPTIONIST';

  if (!hasAccess) {
    return <div className="p-6 text-alert-red bg-red-50 rounded-md">Bạn không có quyền truy cập trang này.</div>;
  }

  const openAddForm = () => {
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setRefreshKey(prev => prev + 1); // Refresh the list
  };

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="p-6 border-b border-border-grey bg-surface-container-lowest">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-headline-md text-on-surface flex items-center gap-2">
              <CalendarIcon size={28} className="text-primary" />
              Quản lý Đặt phòng
            </h2>
            <p className="text-on-surface-variant font-body-md mt-1">Quản lý danh sách đặt phòng và trạng thái phòng</p>
          </div>
          
          <div className="flex gap-3">
            <div className="flex bg-surface-container-low rounded-lg p-1 border border-border-grey">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-md transition-colors ${activeTab === 'list' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <List size={18} /> Danh sách
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-md transition-colors ${activeTab === 'calendar' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <Map size={18} /> Lịch phòng
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-md transition-colors ${activeTab === 'requests' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <User size={18} /> Yêu cầu từ Web
              </button>
            </div>
            
            <Button onClick={openAddForm} icon={Plus}>
              Tạo Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-0">
        {activeTab === 'list' && <BookingList key={`list-${refreshKey}`} />}
        {activeTab === 'calendar' && <BookingCalendar />}
        {activeTab === 'requests' && <BookingRequestList key={`req-${refreshKey}`} />}
      </div>

      <BookingForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={handleFormSuccess} 
      />
    </div>
  );
};

export default BookingManagement;
