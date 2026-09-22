import React, { useState, useEffect } from 'react';
import { IoAddOutline, IoCheckmarkCircleOutline, IoDocumentOutline, IoLogInOutline, IoLogOutOutline, IoPersonOutline, IoSearchOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { guestApi } from '../../services/guestApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import bookingApi from '../../services/bookingApi';
import { roomApi } from '../../services/roomApi';
import { corporateClientApi, CorporateClient } from '../../services/corporateClientApi';
import { negotiatedPriceApi, NegotiatedPricePreviewResponse } from '../../services/negotiatedPriceApi';

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [guests, setGuests] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [corporateClients, setCorporateClients] = useState<CorporateClient[]>([]);
  const [pricePreview, setPricePreview] = useState<NegotiatedPricePreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  // Search Guest
  const [searchGuestTerm, setSearchGuestTerm] = useState('');
  
  const [formData, setFormData] = useState<{
    guestId: string | number;
    roomTypeId: string | number;
    roomId: number | null;
    checkInDate: string;
    checkOutDate: string;
    corporateClientId: string | number;
    note: string;
    source: string;
  }>({
    guestId: '',
    roomTypeId: '',
    roomId: null,
    checkInDate: '',
    checkOutDate: '',
    corporateClientId: '',
    note: '',
    source: 'WALKIN'
  });

  useEffect(() => {
    if (isOpen) {
      fetchRoomTypes();
      corporateClientApi.getAll(undefined, true).then(setCorporateClients).catch(console.error);
      setFormData({
        guestId: '',
        roomTypeId: '',
        roomId: null,
        checkInDate: '',
        checkOutDate: '',
        corporateClientId: '',
        note: '',
        source: 'WALKIN'
      });
      setSearchGuestTerm('');
      setGuests([]);
      setError('');
      setAvailableCount(null);
      setPricePreview(null);
    }
  }, [isOpen]);

  // Tự động kiểm tra số phòng khả dụng khi có đủ 3 điều kiện
  useEffect(() => {
    const { roomTypeId, checkInDate, checkOutDate } = formData;
    if (!roomTypeId || !checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
      setAvailableCount(null);
      return;
    }
    let cancelled = false;
    setCheckingAvail(true);
    roomApi.getAvailableRooms(roomTypeId, checkInDate, checkOutDate)
      .then(data => { if (!cancelled) setAvailableCount(data?.length ?? 0); })
      .catch(() => { if (!cancelled) setAvailableCount(null); })
      .finally(() => { if (!cancelled) setCheckingAvail(false); });
    return () => { cancelled = true; };
  }, [formData.roomTypeId, formData.checkInDate, formData.checkOutDate]);

  // Tự động kiểm tra giá thỏa thuận khi chọn khách công ty
  useEffect(() => {
    const { corporateClientId, roomTypeId, checkInDate, checkOutDate } = formData;
    if (!corporateClientId || !roomTypeId || !checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
      setPricePreview(null);
      return;
    }
    let cancelled = false;
    negotiatedPriceApi.preview({
      corporateClientId: Number(corporateClientId),
      roomTypeId: Number(roomTypeId),
      checkInDate,
      checkOutDate,
    })
      .then(res => { if (!cancelled) setPricePreview(res); })
      .catch(() => { if (!cancelled) setPricePreview(null); });
    return () => { cancelled = true; };
  }, [formData.corporateClientId, formData.roomTypeId, formData.checkInDate, formData.checkOutDate]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectGuest = (guest: any) => {
    setFormData(prev => ({ ...prev, guestId: guest.id }));
    setSearchGuestTerm(guest.name + ' - ' + guest.phone);
    setGuests([]); // close dropdown
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      await bookingApi.createBooking({
        ...formData,
        guestId: Number(formData.guestId),
        roomTypeId: Number(formData.roomTypeId),
        corporateClientId: formData.corporateClientId ? Number(formData.corporateClientId) : undefined,
        source: formData.source || 'WALKIN'
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi tạo đặt phòng");
    } finally {
      setLoading(false);
    }
  };

  const roomTypeOptions = roomTypes.map(rt => ({ value: rt.id, label: rt.name }));
  const channelSourceOptions = [
    { value: 'WALKIN', label: 'Khách tại quầy (Walk-in)' },
    { value: 'PHONE', label: 'Kênh điện thoại' },
    { value: 'SOCIAL', label: 'Kênh mạng xã hội (FB, Zalo, Tiktok...)' },
    { value: 'ONLINE', label: 'Cổng đặt phòng trực tiếp' },
    { value: 'SIMULATION', label: 'Kênh OTA / Đại lý (Airbnb, Booking...)' },
  ];

  // Badge màu số phòng trống
  const availBadgeClass = availableCount === 0
    ? 'bg-red-100 text-red-700 border border-red-200'
    : 'bg-green-100 text-green-700 border border-green-200';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo Đặt phòng mới" maxWidth="max-w-2xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-xl text-sm">
          {error}
        </div>
      )}
      
      <form id="bookingForm" onSubmit={handleSubmit} className="space-y-5">
        
        {/* Guest Selection */}
        <div className="bg-[#FBFDF9] p-4 rounded-xl border border-border-grey space-y-2 relative">
          <label className="block text-xs font-bold text-[#586650] uppercase tracking-wider">
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
              className="w-full px-3.5 py-2.5 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-[#D4F63D] focus:border-[#626F47] outline-none text-sm text-[#1A2411] placeholder:text-[#8E9B86] transition-all"
            />
          </div>

          {/* Search Dropdown */}
          {guests.length > 0 && !formData.guestId && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-border-grey rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {guests.map(guest => (
                <div 
                  key={guest.id} 
                  onClick={() => selectGuest(guest)}
                  className="p-3 hover:bg-[#F2F6ED] cursor-pointer border-b border-border-grey last:border-0 transition-colors"
                >
                  <div className="font-semibold text-sm text-[#1A2411]">{guest.name}</div>
                  <div className="text-xs text-[#606D56] flex gap-3 mt-1">
                    <span>SĐT: {guest.phone || '—'}</span>
                    <span>CCCD: {guest.idNumber || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!formData.guestId && searchGuestTerm.length >= 2 && guests.length === 0 && (
             <div className="text-xs text-amber-800 mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
               Không tìm thấy khách. Vui lòng tạo khách mới trước (trong menu Khách hàng).
             </div>
          )}
        </div>

        {/* Corporate Client Selection (Negotiated Price) */}
        <div className="bg-[#FBFDF9] p-4 rounded-xl border border-border-grey space-y-2">
          <label className="block text-xs font-bold text-[#586650] uppercase tracking-wider">
            Khách hàng công ty (nếu có thỏa thuận giá)
          </label>
          <select
            name="corporateClientId"
            value={formData.corporateClientId}
            onChange={handleInputChange}
            className="w-full px-3.5 py-2.5 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-[#D4F63D] focus:border-[#626F47] outline-none text-sm text-[#1A2411] transition-all"
          >
            <option value="">-- Không áp dụng (Khách lẻ thông thường) --</option>
            {corporateClients.map(c => (
              <option key={c.id} value={c.id}>
                {c.companyName} {c.taxCode ? `(MST: ${c.taxCode})` : ''}
              </option>
            ))}
          </select>

          {/* Negotiated Price Banner */}
          {pricePreview?.applied && (
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm animate-fade-in">
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800 text-sm">
                  <span>🏷️ Đã tự động áp giá thỏa thuận:</span>
                  <span className="underline">{pricePreview.agreementName}</span>
                </div>
                <div className="text-emerald-700">
                  Mức giá: <strong>{pricePreview.pricePerNight?.toLocaleString('vi-VN')} đ/đêm</strong> × {pricePreview.totalNights} đêm = <strong className="text-sm text-emerald-900">{pricePreview.totalPrice?.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>
              <div className="text-right sm:self-center">
                <span className="text-gray-400 line-through text-xs block">
                  Giá niêm yết: {pricePreview.standardPrice?.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-emerald-700 font-bold text-xs">
                  (Tiết kiệm {(pricePreview.standardPrice - pricePreview.totalPrice)?.toLocaleString('vi-VN')} đ)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Room & Dates & Channel Source */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select 
              label="Loại phòng" 
              name="roomTypeId" 
              value={formData.roomTypeId} 
              onChange={handleInputChange} 
              options={roomTypeOptions} 
              required 
            />
            {/* Badge số phòng khả dụng */}
            {formData.roomTypeId && formData.checkInDate && formData.checkOutDate && (
              <div className="mt-1.5">
                {checkingAvail ? (
                  <span className="text-xs text-on-surface-variant">Đang kiểm tra phòng trống...</span>
                ) : availableCount !== null ? (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${availBadgeClass}`}>
                    {availableCount === 0 ? '⚠️ Không còn phòng trống' : `✓ ${availableCount} phòng trống cho khoảng ngày này`}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          
          <Select 
            label="Kênh đặt phòng" 
            name="source" 
            value={formData.source} 
            onChange={handleInputChange} 
            options={channelSourceOptions} 
            required 
          />

          <Input 
            label="Ngày nhận phòng" 
            type="date" 
            name="checkInDate" 
            value={formData.checkInDate} 
            onChange={handleInputChange} 
            required 
          />
          
          <Input 
            label="Ngày trả phòng" 
            type="date" 
            name="checkOutDate" 
            value={formData.checkOutDate} 
            onChange={handleInputChange} 
            required 
          />
        </div>

        <Input 
          label="Ghi chú thêm" 
          name="note" 
          value={formData.note} 
          onChange={handleInputChange} 
          placeholder="Yêu cầu đặc biệt..." 
        />

      </form>
      
      <div className="flex justify-end gap-3 pt-4 border-t border-border-grey mt-6">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Hủy</Button>
        <Button type="submit" form="bookingForm" isLoading={loading}>Xác nhận Đặt phòng</Button>
      </div>
    </Modal>
  );
};

export default BookingForm;
