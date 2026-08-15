import React, { useState, useEffect } from 'react';
import { guestApi } from '../../services/guestApi';
import { useAuth } from '../../context/AuthContext';
import { IoAddOutline, IoCallOutline, IoDocumentOutline, IoMailOutline, IoPencilOutline, IoPeopleOutline, IoPersonOutline, IoSearchOutline, IoStarOutline, IoTimeOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const GuestManagement = () => {
  const { user } = useAuth();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    phone: '',
    idNumber: '',
    email: ''
  });
  const [formError, setFormError] = useState('');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedGuestHistory, setSelectedGuestHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [selectedGuestLoyalty, setSelectedGuestLoyalty] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchGuests();
  }, [debouncedSearch]);

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const data = await guestApi.searchGuests(debouncedSearch);
      setGuests(data);
    } catch (error) {
      console.error("Failed to fetch guests", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData({ id: null, name: '', phone: '', idNumber: '', email: '' });
    setIsEditing(false);
    setFormError('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (guest) => {
    setFormData({
      id: guest.id,
      name: guest.name,
      phone: guest.phone || '',
      idNumber: guest.idNumber || '',
      email: guest.email || ''
    });
    setIsEditing(true);
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (isEditing) {
        await guestApi.updateGuest(formData.id, formData);
      } else {
        await guestApi.createGuest(formData);
      }
      setIsFormModalOpen(false);
      fetchGuests();
    } catch (error) {
      console.error("Form submit error", error);
      setFormError(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  const viewHistory = async (guest) => {
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      // Assuming getGuestHistory returns array of bookings for this guest
      const history = await guestApi.getGuestHistory(guest.id);
      setSelectedGuestHistory(history);
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const viewLoyalty = async (guest) => {
    setIsLoyaltyModalOpen(true);
    setLoyaltyLoading(true);
    try {
      const loyalty = await guestApi.getGuestLoyalty(guest.id);
      setSelectedGuestLoyalty(loyalty);
    } catch (error) {
      console.error("Failed to fetch loyalty", error);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const hasAccess = ['OWNER', 'RECEPTIONIST', 'ADMIN'].includes(user?.role);

  if (!hasAccess) {
    return <div className="p-6 text-alert-red bg-red-50 rounded-md">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="p-6 border-b border-border-grey bg-surface-container-lowest">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-headline-md text-on-surface flex items-center gap-2">
              <IoPeopleOutline size={28} className="text-primary" />
              Quản lý Khách hàng
            </h2>
            <p className="text-on-surface-variant font-body-md mt-1">Danh sách khách hàng, điểm thưởng và lịch sử lưu trú</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input 
                type="text" 
                placeholder="Tìm tên, SĐT, CCCD..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-body-md"
              />
              <IoSearchOutline className="absolute left-3 top-2.5 text-on-surface-variant/70" size={18} />
            </div>
            <Button onClick={openAddModal} icon={IoAddOutline}>
              Thêm
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b-2 border-border-grey font-label-md text-on-surface-variant uppercase tracking-wider">
              <th className="p-4 font-semibold">Tên Khách Hàng</th>
              <th className="p-4 font-semibold">Liên Hệ</th>
              <th className="p-4 font-semibold text-center">Hạng Thành Viên</th>
              <th className="p-4 font-semibold text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu...</td></tr>
            ) : guests.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-on-surface-variant">Không tìm thấy khách hàng nào.</td></tr>
            ) : (
              guests.map(guest => (
                <tr key={guest.id} className="border-b border-border-grey hover:bg-surface-container-low transition-colors group">
                  <td className="p-4">
                    <div className="font-title-sm text-on-surface flex items-center gap-2">
                      <IoPersonOutline size={16} className="text-on-surface-variant" />
                      {guest.name}
                    </div>
                    {guest.idNumber && (
                      <div className="text-xs text-on-surface-variant mt-1 ml-6">
                        CCCD: {guest.idNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-on-surface-variant">
                    <div className="font-body-sm flex items-center gap-2">
                      <IoCallOutline size={14} /> {guest.phone || '—'}
                    </div>
                    <div className="font-body-sm flex items-center gap-2 mt-1">
                      <IoMailOutline size={14} /> {guest.email || '—'}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex items-center justify-center flex-col">
                      <span className="font-label-md px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                        {guest.loyaltyTierName || 'Thành viên mới'}
                      </span>
                      <span className="text-xs text-on-surface-variant mt-1 font-medium">{guest.loyaltyPoints || 0} điểm</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => viewHistory(guest)} className="p-1.5 rounded-md hover:bg-surface-blue-light hover:text-primary transition-colors text-on-surface-variant" title="Lịch sử lưu trú">
                        <IoTimeOutline size={18} />
                      </button>
                      <button onClick={() => viewLoyalty(guest)} className="p-1.5 rounded-md hover:bg-yellow-50 hover:text-yellow-600 transition-colors text-on-surface-variant" title="Chi tiết Điểm/Hạng">
                        <IoStarOutline size={18} />
                      </button>
                      <button onClick={() => openEditModal(guest)} className="p-1.5 rounded-md hover:bg-surface-blue-light hover:text-primary transition-colors text-on-surface-variant" title="Sửa thông tin">
                        <IoPencilOutline size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={isEditing ? 'Cập nhật Khách hàng' : 'Thêm Khách hàng mới'} maxWidth="max-w-md">
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">
            {formError}
          </div>
        )}
        <form id="guestForm" onSubmit={handleSubmit} className="space-y-4">
          <Input label="Tên khách hàng" name="name" icon={IoPersonOutline} required value={formData.name} onChange={handleInputChange} />
          <Input label="Số điện thoại" name="phone" icon={IoCallOutline} required value={formData.phone} onChange={handleInputChange} />
          <Input label="CCCD/CMND" name="idNumber" icon={IoDocumentOutline} value={formData.idNumber} onChange={handleInputChange} />
          <Input label="Email" name="email" type="email" icon={IoMailOutline} value={formData.email} onChange={handleInputChange} />
        </form>
        <div className="flex justify-end gap-3 pt-6 border-t border-border-grey mt-6">
          <Button variant="ghost" onClick={() => setIsFormModalOpen(false)}>Hủy</Button>
          <Button type="submit" form="guestForm">Lưu dữ liệu</Button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Lịch sử Lưu trú" maxWidth="max-w-2xl">
        {historyLoading ? (
          <div className="p-8 text-center text-on-surface-variant">Đang tải lịch sử...</div>
        ) : selectedGuestHistory.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">Khách hàng chưa có lịch sử đặt phòng nào.</div>
        ) : (
          <div className="space-y-3">
            {selectedGuestHistory.map((booking, idx) => (
              <div key={idx} className="p-4 border border-border-grey rounded-lg bg-surface-container-lowest flex justify-between items-center">
                <div>
                  <div className="font-title-sm text-on-surface">Phòng {booking.roomNumber} - {booking.roomTypeName}</div>
                  <div className="text-sm text-on-surface-variant mt-1">{booking.checkInDate} đến {booking.checkOutDate}</div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${booking.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end pt-4 mt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={() => setIsHistoryModalOpen(false)}>Đóng</Button>
        </div>
      </Modal>

      {/* Loyalty Modal */}
      <Modal isOpen={isLoyaltyModalOpen} onClose={() => setIsLoyaltyModalOpen(false)} title="Thông tin Hạng Thành Viên" maxWidth="max-w-sm">
        {loyaltyLoading ? (
          <div className="p-8 text-center text-on-surface-variant">Đang tải thông tin...</div>
        ) : selectedGuestLoyalty ? (
          <div className="flex flex-col items-center p-4">
            <div className="w-24 h-24 rounded-full bg-yellow-50 border-4 border-yellow-200 flex items-center justify-center mb-4">
              <IoStarOutline size={40} className="text-yellow-500" />
            </div>
            <h3 className="font-headline-sm text-on-surface">{selectedGuestLoyalty.tierName || 'Thành viên'}</h3>
            <p className="text-3xl font-bold text-primary mt-4">{selectedGuestLoyalty.points || 0} <span className="text-base font-normal text-on-surface-variant">điểm</span></p>
            <p className="text-sm text-on-surface-variant mt-2 text-center">Tích lũy 1 điểm cho mỗi 100.000 VNĐ chi tiêu.</p>
          </div>
        ) : (
          <div className="p-8 text-center text-on-surface-variant">Không tìm thấy dữ liệu Loyalty.</div>
        )}
        <div className="flex justify-end pt-4 mt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={() => setIsLoyaltyModalOpen(false)}>Đóng</Button>
        </div>
      </Modal>
    </div>
  );
};

export default GuestManagement;
