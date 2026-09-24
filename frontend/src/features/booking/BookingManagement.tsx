import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IoAddOutline, IoCalendarOutline, IoCloseCircleOutline, IoListOutline, IoLogInOutline, IoLogOutOutline, IoMapOutline, IoPencilOutline, IoPeopleOutline, IoPersonOutline, IoSearchOutline, IoCashOutline, IoBedOutline, IoCloudUploadOutline } from 'react-icons/io5';
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
import InHouseGuestList from './InHouseGuestList';
import LegacyBookingImportModal from './LegacyBookingImportModal';

const BookingManagement: React.FC = () => {
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
      navigate('/manage/bookings?tab=list', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Xác định activeTab dựa trên query params (mặc định 'list' nếu là 'deposits' đang tạm ẩn)
  const tabParam = searchParams.get('tab');
  const activeTab = (!tabParam || tabParam === 'deposits') ? 'list' : tabParam;

  const handleTabChange = (tab: string) => {
    if (tab === 'requests') {
      setSearchParams({ tab, sub: 'ROOM' });
    } else {
      setSearchParams({ tab });
    }
  };
  
  // States cho BookingForm
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
    <div className="bg-surface rounded-xl shadow-xs border border-border-grey overflow-hidden">
      {/* Header 2 tầng hiện đại & ngăn nắp */}
      <div className="px-5 py-4 border-b border-border-grey bg-surface-container-lowest">
        {/* Tầng 1: Tiêu đề + Cụm nút tác vụ chính */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <IoCalendarOutline size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-title-lg text-on-surface font-bold text-lg sm:text-xl">
                  Quản lý Đặt phòng
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                  PMS Core
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Trung tâm tiếp nhận, điều phối lưu trú, xếp phòng và thanh toán
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {!isAccountant && (
            <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 flex-wrap">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsImportModalOpen(true)} 
                icon={IoCloudUploadOutline}
                title="Nhập dữ liệu đặt phòng cũ từ file Excel hoặc CSV"
                className="text-xs border-border-grey hover:bg-surface-container-low"
              >
                Nhập dữ liệu cũ
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsGroupFormOpen(true)} 
                icon={IoPeopleOutline}
                className="text-xs border-border-grey hover:bg-surface-container-low"
              >
                Tạo đoàn
              </Button>
              <Button 
                size="sm" 
                onClick={openAddForm} 
                icon={IoAddOutline}
                className="text-xs font-semibold shadow-xs"
              >
                Tạo đặt phòng
              </Button>
            </div>
          )}
        </div>

        {/* Tầng 2: Thanh Tabs chuyển View (Segmented Control) */}
        <div className="mt-4 pt-3 border-t border-border-grey/60 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="inline-flex bg-surface-container-low p-1 rounded-xl border border-border-grey text-xs font-medium">
            <button
              onClick={() => handleTabChange('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'list' 
                  ? 'bg-white text-primary shadow-xs' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
              }`}
            >
              <IoListOutline size={15} /> Danh sách
            </button>
            <button
              onClick={() => handleTabChange('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'calendar' 
                  ? 'bg-white text-primary shadow-xs' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
              }`}
            >
              <IoMapOutline size={15} /> Lịch phòng
            </button>
            <button
              onClick={() => handleTabChange('groups')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'groups' 
                  ? 'bg-white text-primary shadow-xs' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
              }`}
            >
              <IoPeopleOutline size={15} /> Đoàn
            </button>
            <button
              onClick={() => handleTabChange('in-house')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'in-house' 
                  ? 'bg-white text-primary shadow-xs' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
              }`}
            >
              <IoBedOutline size={15} /> Khách lưu trú
            </button>
            {!isAccountant && (
              <button
                onClick={() => handleTabChange('requests')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'requests' 
                    ? 'bg-white text-primary shadow-xs' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
                }`}
              >
                <IoPersonOutline size={15} /> Yêu cầu từ Web
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-0 min-h-[580px] flex flex-col">
        {activeTab === 'list' && <BookingList key={`list-${refreshKey}`} />}
        {activeTab === 'calendar' && <BookingCalendar />}
        {activeTab === 'groups' && <GroupBookingList refreshKey={refreshKey} autoOpenAssignGroup={autoAssignGroup} />}
        {activeTab === 'in-house' && <InHouseGuestList />}
        {/* Tạm ẩn: {activeTab === 'deposits' && <PendingDepositList />} */}
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
      <LegacyBookingImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
};


export default BookingManagement;
