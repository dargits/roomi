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
import pricingApi from '../../services/pricingApi';
import { IoCalendarOutline, IoInformationCircleOutline, IoPricetagOutline } from 'react-icons/io5';

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const formatPrice = (amount: number | string) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
};

const BookingForm: React.FC<BookingFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [guests, setGuests] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  // Bảng chi tiết giá từng đêm (NCL-02-CN-006)
  const [priceBreakdown, setPriceBreakdown] = useState<any | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // Search Guest
  const [searchGuestTerm, setSearchGuestTerm] = useState('');
  
  const [formData, setFormData] = useState<{
    guestId: string | number;
    roomTypeId: string | number;
    roomId: number | null;
    checkInDate: string;
    checkOutDate: string;
    note: string;
  }>({
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
      setAvailableCount(null);
      setPriceBreakdown(null);
    }
  }, [isOpen]);

  // Tự động kiểm tra số phòng khả dụng khi có đủ 3 điều kiện
  useEffect(() => {
    const { roomTypeId, checkInDate, checkOutDate } = formData;
    if (!roomTypeId || !checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
      setAvailableCount(null);
      setPriceBreakdown(null);
      return;
    }
    let cancelled = false;
    setCheckingAvail(true);
    roomApi.getAvailableRooms(roomTypeId, checkInDate, checkOutDate)
      .then(data => { if (!cancelled) setAvailableCount(data?.length ?? 0); })
      .catch(() => { if (!cancelled) setAvailableCount(null); })
      .finally(() => { if (!cancelled) setCheckingAvail(false); });

    // Lấy bảng chi tiết giá từng đêm (NCL-02-CN-006)
    setLoadingBreakdown(true);
    pricingApi.getPriceBreakdown({
      roomTypeId,
      checkInDate,
      checkOutDate
    })
      .then(data => { if (!cancelled) setPriceBreakdown(data); })
      .catch(err => {
        console.error('Lỗi tính giá từng đêm:', err);
        if (!cancelled) setPriceBreakdown(null);
      })
      .finally(() => { if (!cancelled) setLoadingBreakdown(false); });

    return () => { cancelled = true; };
  }, [formData.roomTypeId, formData.checkInDate, formData.checkOutDate]);

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
        roomTypeId: Number(formData.roomTypeId)
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi tạo đặt phòng");
    } finally {
      setLoading(false);
    }
  };

  const roomTypeOptions = roomTypes.map(rt => ({ value: rt.id, label: rt.name }));

  // Badge màu số phòng trống
  const availBadgeClass = availableCount === 0
    ? 'bg-red-100 text-red-700 border border-red-200'
    : 'bg-green-100 text-green-700 border border-green-200';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo Đặt phòng mới" maxWidth="max-w-3xl">
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
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${availBadgeClass}`}>
                    {availableCount === 0 ? '⚠️ Không còn phòng trống' : `✓ ${availableCount} phòng trống cho khoảng ngày này`}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          
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

        {/* Bảng chi tiết giá từng đêm (NCL-02-CN-006) */}
        {loadingBreakdown && (
          <div className="p-4 bg-surface-container-low/50 rounded-lg border border-border-grey text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            Đang tính toán chi tiết giá từng đêm theo quy tắc (Lễ &gt; Cuối tuần &gt; Mùa &gt; Cơ bản)...
          </div>
        )}

        {!loadingBreakdown && priceBreakdown && priceBreakdown.nightlyDetails && priceBreakdown.nightlyDetails.length > 0 && (
          <div className="bg-surface-container-lowest p-4 rounded-lg border border-border-grey space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-grey pb-2">
              <div className="flex items-center gap-2">
                <IoCalendarOutline size={18} className="text-primary" />
                <span className="font-title-sm text-on-surface font-bold">
                  Chi tiết giá từng đêm ({priceBreakdown.totalNights} đêm)
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">
                Ưu tiên: <strong className="text-red-600">Ngày lễ</strong> &gt; <strong className="text-blue-600">Cuối tuần</strong> &gt; <strong className="text-amber-600">Theo mùa</strong> &gt; Giá cơ bản
              </span>
            </div>

            <div className="overflow-x-auto border border-border-grey rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant border-b border-border-grey">
                    <th className="py-2 px-3 font-semibold">Đêm</th>
                    <th className="py-2 px-3 font-semibold">Thứ</th>
                    <th className="py-2 px-3 font-semibold">Loại giá</th>
                    <th className="py-2 px-3 font-semibold">Tên nguồn áp dụng</th>
                    <th className="py-2 px-3 font-semibold text-right">Đơn giá đêm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {priceBreakdown.nightlyDetails.map((night: any, idx: number) => {
                    const d = new Date(night.date);
                    const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    const sourceBadge = 
                      night.priceSource === 'HOLIDAY' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
                          Ngày lễ
                        </span>
                      ) : night.priceSource === 'WEEKEND' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                          Cuối tuần
                        </span>
                      ) : night.priceSource === 'SEASONAL' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Theo mùa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          Giá cơ bản
                        </span>
                      );

                    return (
                      <tr key={idx} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="py-2 px-3 font-medium text-on-surface">{formattedDate}</td>
                        <td className="py-2 px-3 text-on-surface">{night.dayOfWeek}</td>
                        <td className="py-2 px-3">{sourceBadge}</td>
                        <td className="py-2 px-3 text-on-surface-variant">{night.sourceName}</td>
                        <td className="py-2 px-3 text-right font-bold text-on-surface">
                          {formatPrice(night.appliedPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container-low font-bold border-t border-border-grey text-on-surface">
                    <td colSpan={4} className="py-2 px-3 text-right">
                      Tổng tiền phòng dự kiến ({priceBreakdown.totalNights} đêm):
                    </td>
                    <td className="py-2 px-3 text-right text-primary font-bold text-sm">
                      {formatPrice(priceBreakdown.totalRoomPrice || priceBreakdown.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

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
