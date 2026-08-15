import React, { useState, useEffect } from 'react';
import { IoAddOutline, IoCheckmarkCircleOutline, IoDocumentOutline, IoLogInOutline, IoLogOutOutline, IoPersonOutline, IoSearchOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { guestApi } from '../../services/guestApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import bookingApi from '../../services/bookingApi';

const BookingForm = ({ isOpen, onClose, onSuccess }) => {
  const [guests, setGuests] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search Guest
  const [searchGuestTerm, setSearchGuestTerm] = useState('');
  
  const [formData, setFormData] = useState({
    guestId: '',
    roomTypeId: '',
    roomId: null,
    checkInDate: '',
    checkOutDate: '',
    note: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchRoomTypes();
      setFormData({
        guestId: '',
        roomTypeId: '',
        roomId: null,
        checkInDate: '',
        checkOutDate: '',
        note: ''
      });
      setSearchGuestTerm('');
      setGuests([]);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchGuestTerm.length >= 2) {
        fetchGuests(searchGuestTerm);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchGuestTerm]);

  const fetchGuests = async (keyword) => {
    try {
      const data = await guestApi.searchGuests(keyword);
      setGuests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const data = await roomTypeApi.getAllRoomTypes();
      setRoomTypes(data.filter(rt => rt.active));
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectGuest = (guest) => {
    setFormData(prev => ({ ...prev, guestId: guest.id }));
    setSearchGuestTerm(guest.name + ' - ' + guest.phone);
    setGuests([]); // close dropdown
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Validate
      if (!formData.guestId) {
        throw new Error("Vui lòng chọn hoặc tạo khách hàng");
      }
      if (formData.checkInDate >= formData.checkOutDate) {
        throw new Error("Ngày trả phòng phải sau ngày nhận phòng");
      }

      await bookingApi.createBooking(formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Lỗi tạo đặt phòng");
    } finally {
      setLoading(false);
    }
  };

  const roomTypeOptions = roomTypes.map(rt => ({ value: rt.id, label: rt.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo Đặt phòng mới" maxWidth="max-w-2xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">
          {error}
        </div>
      )}
      
      <form id="bookingForm" onSubmit={handleSubmit} className="space-y-6">
        
        {/* Guest Selection */}
        <div className="bg-surface-container-lowest p-4 rounded-lg border border-border-grey space-y-3 relative">
          <label className="font-label-md text-on-surface flex items-center gap-2">
            <IoPersonOutline size={18} className="text-primary"/> 
            Khách hàng <span className="text-error">*</span>
          </label>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Nhập tên hoặc SĐT để tìm khách hàng..." 
              value={searchGuestTerm}
              onChange={(e) => {
                setSearchGuestTerm(e.target.value);
                if (!e.target.value) setFormData(prev => ({ ...prev, guestId: '' }));
              }}
              className="w-full pl-10 pr-4 py-2 border border-border-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-body-md"
            />
            <IoSearchOutline className="absolute left-3 top-2.5 text-on-surface-variant/70" size={18} />
          </div>

          {/* Search Dropdown */}
          {guests.length > 0 && !formData.guestId && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-border-grey rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {guests.map(guest => (
                <div 
                  key={guest.id} 
                  onClick={() => selectGuest(guest)}
                  className="p-3 hover:bg-surface-blue-light cursor-pointer border-b border-border-grey last:border-0"
                >
                  <div className="font-title-sm text-on-surface">{guest.name}</div>
                  <div className="text-xs text-on-surface-variant flex gap-3 mt-1">
                    <span>SĐT: {guest.phone || '—'}</span>
                    <span>CCCD: {guest.idNumber || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!formData.guestId && searchGuestTerm.length >= 2 && guests.length === 0 && (
             <div className="text-sm text-on-surface-variant mt-2 p-2 bg-yellow-50 rounded">
               Không tìm thấy khách. Vui lòng tạo khách mới trước (trong menu Khách hàng).
             </div>
          )}
        </div>

        {/* Room & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select 
            label="Loại phòng" 
            name="roomTypeId" 
            value={formData.roomTypeId} 
            onChange={handleInputChange} 
            options={roomTypeOptions} 
            required 
          />
          
          <div /> {/* Empty space */}

          <Input 
            label="Ngày nhận phòng" 
            type="date" 
            name="checkInDate" 
            icon={IoLogInOutline} 
            value={formData.checkInDate} 
            onChange={handleInputChange} 
            required 
          />
          
          <Input 
            label="Ngày trả phòng" 
            type="date" 
            name="checkOutDate" 
            icon={IoLogOutOutline} 
            value={formData.checkOutDate} 
            onChange={handleInputChange} 
            required 
          />
        </div>

        <Input 
          label="Ghi chú thêm" 
          name="note" 
          icon={IoDocumentOutline} 
          value={formData.note} 
          onChange={handleInputChange} 
          placeholder="Yêu cầu đặc biệt..." 
        />

      </form>
      
      <div className="flex justify-end gap-3 pt-6 border-t border-border-grey mt-6">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Hủy</Button>
        <Button type="submit" form="bookingForm" icon={IoCheckmarkCircleOutline} isLoading={loading}>Xác nhận Đặt phòng</Button>
      </div>
    </Modal>
  );
};

export default BookingForm;
