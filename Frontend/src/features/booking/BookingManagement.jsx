import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoAddOutline, IoCalendarOutline, IoCloseCircleOutline, IoListOutline, IoLogInOutline, IoLogOutOutline, IoMapOutline, IoPencilOutline, IoPeopleOutline, IoPersonOutline, IoSearchOutline } from 'react-icons/io5';
import bookingApi from '../../services/bookingApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

import BookingList from './BookingList';
import BookingCalendar from './BookingCalendar';
import BookingForm from './BookingForm';
import BookingRequestList from './BookingRequestList';
import GroupBookingForm from './GroupBookingForm';
import GroupBookingList from './GroupBookingList';

const BookingManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định activeTab dựa trên pathname của URL
  const getActiveTab = () => {
    if (location.pathname.endsWith('/calendar')) return 'calendar';
    if (location.pathname.endsWith('/requests')) return 'requests';
    if (location.pathname.endsWith('/groups')) return 'groups';
    return 'list';
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tab) => {
    if (tab === 'calendar') {
      navigate('/manage/bookings/calendar');
    } else if (tab === 'requests') {
      navigate('/manage/bookings/requests');
    } else if (tab === 'groups') {
      navigate('/manage/bookings/groups');
    } else {
      navigate('/manage/bookings/list');
    }
  };
  
  // States cho BookingForm
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasAccess = ['OWNER', 'RECEPTIONIST', 'ADMIN', 'ACCOUNTANT'].includes(user?.role);
  const isAccountant = user?.role === 'ACCOUNTANT';

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

  const [autoAssignGroup, setAutoAssignGroup] = useState(null);

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="p-6 border-b border-border-grey bg-surface-container-lowest">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-headline-md text-on-surface flex items-center gap-2">
              <IoCalendarOutline size={28} className="text-primary" />
              Quản lý Đặt phòng
            </h2>
            <p className="text-on-surface-variant font-body-md mt-1">Quản lý danh sách đặt phòng và trạng thái phòng</p>
          </div>
          
          <div className="flex gap-3">
            <div className="flex bg-surface-container-low rounded-lg p-1 border border-border-grey">
              <button
                onClick={() => handleTabChange('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-md transition-colors cursor-pointer ${activeTab === 'list' ? 'bg-white shadow-sm text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <IoListOutline size={18} /> Danh sách
              </button>
              <button
                onClick={() => handleTabChange('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-md transition-colors cursor-pointer ${activeTab === 'calendar' ? 'bg-white shadow-sm text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <IoMapOutline size={18} /> Lịch phòng
              </button>
              <button
                onClick={() => handleTabChange('groups')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-md transition-colors cursor-pointer ${activeTab === 'groups' ? 'bg-white shadow-sm text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <IoPeopleOutline size={18} /> Đoàn
              </button>
              {/* Kế toán không xử lý yêu cầu từ web */}
              {!isAccountant && (
                <button
                  onClick={() => handleTabChange('requests')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-label-md transition-colors cursor-pointer ${activeTab === 'requests' ? 'bg-white shadow-sm text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <IoPersonOutline size={18} /> Yêu cầu từ Web
                </button>
              )}
            </div>
            
            {/* Kế toán không được tự tạo đặt phòng */}
            {!isAccountant && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsGroupFormOpen(true)} icon={IoPeopleOutline}>Tạo đoàn</Button>
                <Button onClick={openAddForm} icon={IoAddOutline}>Tạo Booking</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-0">
        {activeTab === 'list' && <BookingList key={`list-${refreshKey}`} />}
        {activeTab === 'calendar' && <BookingCalendar />}
        {activeTab === 'groups' && <GroupBookingList refreshKey={refreshKey} autoOpenAssignGroup={autoAssignGroup} />}
        {activeTab === 'requests' && <BookingRequestList key={`req-${refreshKey}`} />}
      </div>

      <BookingForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={handleFormSuccess} 
      />
      <GroupBookingForm
        isOpen={isGroupFormOpen}
        onClose={() => setIsGroupFormOpen(false)}
        onSuccess={(createdGroup, autoAssign) => {
          setIsGroupFormOpen(false);
          setRefreshKey((previous) => previous + 1);
          handleTabChange('groups');
          if (autoAssign && createdGroup) {
            setAutoAssignGroup(createdGroup);
          }
        }}
      />
    </div>
  );
};


export default BookingManagement;
