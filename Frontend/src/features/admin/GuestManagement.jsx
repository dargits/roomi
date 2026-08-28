import React, { useState, useEffect } from 'react';
import { guestApi } from '../../services/guestApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { IoAddOutline, IoCallOutline, IoDocumentOutline, IoMailOutline, IoPencilOutline, IoPeopleOutline, IoPersonOutline, IoSearchOutline, IoStarOutline, IoTimeOutline, IoTrashOutline, IoWarningOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';

const getBookingStatusBadge = (status) => {
  switch(status) {
    case 'NEW': return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded font-medium text-xs">Mới</span>;
    case 'CONFIRMED': return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium text-xs">Đã xác nhận</span>;
    case 'CHECKED_IN': return <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-medium text-xs">Đang ở</span>;
    case 'CHECKED_OUT': return <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium text-xs">Đã đi</span>;
    case 'CANCELLED': return <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-medium text-xs">Đã hủy</span>;
    case 'NO_SHOW': return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-medium text-xs">Không đến</span>;
    default: return <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium text-xs">{status}</span>;
  }
};

const GuestManagement = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const isAdmin = user?.role === 'ADMIN';

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

  // NCL-12-CN-005: Modal xóa dữ liệu cá nhân
  const [deleteDataModal, setDeleteDataModal] = useState({ open: false, guest: null });
  const [deleteDataLoading, setDeleteDataLoading] = useState(false);
  const [deleteDataError, setDeleteDataError] = useState('');

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
      const sorted = (data || []).sort((a, b) => (b.id || 0) - (a.id || 0));
      setGuests(sorted);
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
      <div className="px-4 py-3 border-b border-border-grey bg-surface-container-lowest">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <IoPeopleOutline size={22} className="text-primary" />
            <h2 className="font-title-lg text-on-surface font-bold text-base sm:text-lg">
              Quản lý Khách hàng
            </h2>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="relative flex-1 sm:w-60">
              <input 
                type="text" 
                placeholder="Tìm tên, SĐT, CCCD..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-border-grey rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-xs bg-white"
              />
              <IoSearchOutline className="absolute left-3 top-2 text-on-surface-variant/70" size={15} />
            </div>
            <Button size="sm" onClick={openAddModal} icon={IoAddOutline} className="shrink-0">
              Thêm khách
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
              <tr>
                <td colSpan="4" className="p-8 text-center">
                  <LoadingScreen message="Đang tải danh sách khách hàng..." />
                </td>
              </tr>
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
                      {guest.name !== '[Đã xóa]' && (
                        <button onClick={() => openEditModal(guest)} className="p-1.5 rounded-md hover:bg-surface-blue-light hover:text-primary transition-colors text-on-surface-variant" title="Sửa thông tin">
                          <IoPencilOutline size={18} />
                        </button>
                      )}
                      {isAdmin && guest.name !== '[Đã xóa]' && (
                        <button
                          onClick={() => {
                            setDeleteDataModal({ open: true, guest });
                            setDeleteDataError('');
                          }}
                          className="p-1.5 rounded-md hover:bg-red-50 hover:text-alert-red transition-colors text-on-surface-variant"
                          title="Xóa dữ liệu cá nhân (Luật 91/2025)"
                        >
                          <IoTrashOutline size={18} />
                        </button>
                      )}
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
                  <div className="font-title-sm text-on-surface">Phòng {booking.roomNumber || 'Chưa xếp'} - {booking.roomTypeName}</div>
                  <div className="text-sm text-on-surface-variant mt-1">
                    {formatStayDateTime(booking.checkInDate, 'checkin')} → {formatStayDateTime(booking.checkOutDate, 'checkout')} ({calculateNights(booking.checkInDate, booking.checkOutDate)} đêm)
                  </div>
                </div>
                <div className="text-right">
                  {getBookingStatusBadge(booking.status)}
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
          <div className="p-8 text-center text-on-surface-variant">Không tìm thấy dữ liệu thành viên.</div>
        )}
        <div className="flex justify-end pt-4 mt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={() => setIsLoyaltyModalOpen(false)}>Đóng</Button>
        </div>
      </Modal>

      {/* Modal Xóa dữ liệu cá nhân theo yêu cầu khách (NCL-12-CN-005 / QTN-24) */}
      <Modal
        isOpen={deleteDataModal.open}
        onClose={() => !deleteDataLoading && setDeleteDataModal({ open: false, guest: null })}
        title="Xóa dữ liệu cá nhân khách hàng"
        maxWidth="max-w-md"
      >
        {deleteDataModal.guest && (
          <div className="space-y-4">
            {deleteDataError && (
              <div className="p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">
                {deleteDataError}
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm flex items-start gap-2">
              <IoWarningOutline size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý pháp lý (Luật số 91/2025):</strong> Dữ liệu định danh của khách (tên, SĐT, CCCD, ảnh giấy tờ) sẽ bị ẩn danh vĩnh viễn. Lịch sử doanh thu và hóa đơn vẫn được lưu trữ theo quy định kế toán.
              </div>
            </div>

            <p className="text-body-md text-on-surface">
              Bạn có chắc chắn muốn xóa dữ liệu cá nhân của khách hàng <strong>{deleteDataModal.guest.name}</strong> (Mã #{deleteDataModal.guest.id})?
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
              <Button
                variant="secondary"
                disabled={deleteDataLoading}
                onClick={() => setDeleteDataModal({ open: false, guest: null })}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                icon={IoTrashOutline}
                isLoading={deleteDataLoading}
                onClick={async () => {
                  setDeleteDataLoading(true);
                  setDeleteDataError('');
                  try {
                    await guestApi.deletePersonalData(deleteDataModal.guest.id);
                    toastSuccess('Đã ẩn danh hóa dữ liệu cá nhân của khách thành công.');
                    setDeleteDataModal({ open: false, guest: null });
                    await fetchGuests();
                  } catch (err) {
                    setDeleteDataError(
                      err.response?.data?.message || 'Không thể xóa dữ liệu. Vui lòng kiểm tra lại.'
                    );
                  } finally {
                    setDeleteDataLoading(false);
                  }
                }}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GuestManagement;
