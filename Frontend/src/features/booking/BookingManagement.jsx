import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IoAddOutline, IoCalendarOutline, IoCloseCircleOutline, IoListOutline, IoLogInOutline, IoLogOutOutline, IoMapOutline, IoPencilOutline, IoPeopleOutline, IoPersonOutline, IoSearchOutline, IoCashOutline } from 'react-icons/io5';
import bookingApi from '../../services/bookingApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

import BookingList from './BookingList';
import BookingCalendar from './BookingCalendar';
import BookingForm from './BookingForm';
import BookingRequestList from './BookingRequestList';
import GroupBookingForm from './GroupBookingForm';
import GroupBookingList from './GroupBookingList';
import PendingDepositList from './PendingDepositList';

const BookingManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Backward compatibility: Redirect legacy paths to query params
  useEffect(() => {
    if (location.pathname.endsWith('/calendar')) {
      navigate('/manage/bookings?tab=calendar', { replace: true });
    } else if (location.pathname.endsWith('/requests')) {
      navigate('/manage/bookings?tab=requests', { replace: true });
    } else if (location.pathname.endsWith('/groups')) {
      navigate('/manage/bookings?tab=groups', { replace: true });
    } else if (location.pathname.endsWith('/deposits')) {
      navigate('/manage/bookings?tab=deposits', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Xác định activeTab dựa trên query params
  const activeTab = searchParams.get('tab') || 'list';

  const handleTabChange = (tab) => {
    if (tab === 'requests') {
      setSearchParams({ tab, sub: 'ROOM' });
    } else {
      setSearchParams({ tab });
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
      <div className="px-4 py-3 border-b border-border-grey bg-surface-container-lowest">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2 shrink-0">
            <IoCalendarOutline size={22} className="text-primary" />
            <h2 className="font-title-lg text-on-surface font-bold text-base sm:text-lg">
              Quản lý Đặt phòng
            </h2>
          </div>
          
          {/* Tabs & Action buttons on single compact row */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 w-full lg:w-auto">
            {/* Tabs */}
            <div className="flex bg-surface-container-low rounded-lg p-0.5 border border-border-grey overflow-x-auto max-w-full">
              <button
                onClick={() => handleTabChange('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'list' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <IoListOutline size={15} /> Danh sách
              </button>
              <button
                onClick={() => handleTabChange('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'calendar' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <IoMapOutline size={15} /> Lịch phòng
              </button>
              <button
                onClick={() => handleTabChange('groups')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'groups' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <IoPeopleOutline size={15} /> Đoàn
              </button>
              <button
                onClick={() => handleTabChange('deposits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'deposits' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <IoCashOutline size={15} /> Cọc chưa quyết toán
              </button>
              {/* Kế toán không xử lý yêu cầu từ web */}
              {!isAccountant && (
                <button
                  onClick={() => handleTabChange('requests')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'requests' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <IoPersonOutline size={15} /> Yêu cầu từ Web
                </button>
              )}
            </div>
            
            {/* Action Buttons */}
            {!isAccountant && (
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setIsGroupFormOpen(true)} icon={IoPeopleOutline}>
                  Tạo đoàn
                </Button>
                <Button size="sm" onClick={openAddForm} icon={IoAddOutline}>
                  Tạo Booking
                </Button>
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
        {activeTab === 'deposits' && <PendingDepositList />}
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
