import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import RoomCard from '../../components/common/RoomCard';
import PublicBookingModal from '../landing/PublicBookingModal';
import { roomTypeApi } from '../../services/roomTypeApi';
import { bookingRequestApi } from '../../services/bookingRequestApi';
import { useAppConfig } from '../../context/AppConfigContext';
import { 
  IoCalendarOutline, 
  IoSearchOutline, 
  IoFilterOutline, 
  IoPeopleOutline, 
  IoBedOutline, 
  IoSparklesOutline,
  IoCheckmarkCircleOutline
} from 'react-icons/io5';

const RoomsPage = () => {
  const navigate = useNavigate();
  const { hotelSetting } = useAppConfig();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestCapacity, setGuestCapacity] = useState('ALL');
  const [selectedRoomToBook, setSelectedRoomToBook] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    // Set default dates: today & tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setCheckInDate(today.toISOString().split('T')[0]);
    setCheckOutDate(tomorrow.toISOString().split('T')[0]);

    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await roomTypeApi.getPublicRoomTypes();
      const mapped = (data || []).map(room => ({
        id: room.id,
        name: room.name,
        rating: 4.8,
        ratingScore: 9.2,
        ratingText: "Xuất sắc",
        reviews: 86,
        maxCapacity: room.maxCapacity,
        amenitiesDescription: room.amenitiesDescription,
        basePrice: room.basePrice,
        price: new Intl.NumberFormat('vi-VN').format(room.basePrice) + ' ₫',
        imageUrls: room.imageUrls || [],
        primaryButton: true
      }));
      setRooms(mapped);
    } catch (error) {
      console.error("Lỗi tải danh sách phòng:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAvailability = async (e) => {
    e.preventDefault();
    if (!checkInDate || !checkOutDate) {
      alert("Vui lòng chọn ngày nhận phòng và trả phòng!");
      return;
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      alert("Ngày trả phòng phải sau ngày nhận phòng!");
      return;
    }

    setLoading(true);
    try {
      const data = await bookingRequestApi.getPublicAvailability(checkInDate, checkOutDate);
      const mapped = (data || []).map(room => ({
        id: room.roomTypeId || room.id,
        name: room.name,
        rating: 4.8,
        ratingScore: 9.2,
        ratingText: "Xuất sắc",
        reviews: 86,
        maxCapacity: room.maxCapacity,
        amenitiesDescription: room.amenitiesDescription,
        basePrice: room.basePrice,
        price: new Intl.NumberFormat('vi-VN').format(room.basePrice) + ' ₫',
        imageUrls: room.imageUrls || [],
        primaryButton: true
      }));
      setRooms(mapped);
    } catch (error) {
      console.error("Lỗi kiểm tra phòng trống:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (room) => {
    setSelectedRoomToBook(room);
    setIsBookingModalOpen(true);
  };

  const filteredRooms = rooms.filter(room => {
    if (guestCapacity === 'ALL') return true;
    if (guestCapacity === '1') return room.maxCapacity === 1;
    if (guestCapacity === '2') return room.maxCapacity === 2;
    if (guestCapacity === '4') return room.maxCapacity >= 3;
    return true;
  });

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pt-16 flex flex-col">
      <PublicHeader />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#1A365D] to-[#0F172A] text-white py-14 px-margin-desktop">
        <div className="max-w-container-max-width mx-auto">
          <div className="max-w-2xl">
            <span className="text-secondary-300 font-label-md uppercase tracking-wider font-semibold">Khám phá không gian nghỉ dưỡng</span>
            <h1 className="font-display-lg text-white mt-2 mb-4 drop-shadow-sm">Danh Sách Phòng & Bảng Giá</h1>
            <p className="text-white/80 font-body-lg leading-relaxed">
              Tất cả các phòng tại {hotelSetting?.propertyName || 'StayGO'} đều được trang bị nội thất cao cấp, máy điều hòa, Wifi tốc độ cao và dịch vụ dọn phòng hàng ngày.
            </p>
          </div>

          {/* Quick Date Search Card */}
          <form onSubmit={handleSearchAvailability} className="mt-8 bg-surface text-on-surface p-4 md:p-6 rounded-2xl shadow-xl border border-border-grey grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <IoCalendarOutline className="text-primary" size={16} /> Ngày nhận phòng
              </label>
              <input 
                type="date" 
                value={checkInDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full p-2.5 border border-border-grey rounded-lg text-sm bg-surface-container-low font-medium focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <IoCalendarOutline className="text-primary" size={16} /> Ngày trả phòng
              </label>
              <input 
                type="date" 
                value={checkOutDate}
                min={checkInDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full p-2.5 border border-border-grey rounded-lg text-sm bg-surface-container-low font-medium focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <IoPeopleOutline className="text-primary" size={16} /> Sức chứa khách
              </label>
              <select 
                value={guestCapacity}
                onChange={(e) => setGuestCapacity(e.target.value)}
                className="w-full p-2.5 border border-border-grey rounded-lg text-sm bg-surface-container-low font-medium focus:outline-none focus:border-primary"
              >
                <option value="ALL">Tất cả các loại phòng</option>
                <option value="1">Phòng đơn (1 người)</option>
                <option value="2">Phòng đôi (2 người)</option>
                <option value="4">Phòng gia đình (3-4+ người)</option>
              </select>
            </div>

            <button 
              type="submit"
              className="w-full h-[42px] bg-primary text-white hover:bg-primary-600 rounded-lg font-label-md font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <IoSearchOutline size={18} /> Kiểm tra phòng trống
            </button>
          </form>
        </div>
      </section>

      {/* Main Room Grid */}
      <main className="max-w-container-max-width mx-auto px-margin-desktop py-12 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-border-grey">
          <div>
            <h2 className="font-headline-md text-on-surface font-bold">Lựa chọn phòng phù hợp ({filteredRooms.length} loại phòng)</h2>
            <p className="text-sm text-on-surface-variant mt-1">Giá đã bao gồm thuế phí, nước suối chào đón và wifi miễn phí</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <IoCheckmarkCircleOutline size={16} /> Miễn phí hủy phòng trước 24 giờ
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-on-surface-variant">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>Đang tải thông tin bảng giá và phòng trống...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-low rounded-2xl border border-border-grey">
            <IoBedOutline size={48} className="mx-auto text-on-surface-variant/40 mb-3" />
            <h3 className="text-lg font-bold text-on-surface">Không tìm thấy loại phòng phù hợp</h3>
            <p className="text-sm text-on-surface-variant mt-1">Vui lòng thử chọn khoảng ngày khác hoặc thay đổi bộ lọc sức chứa.</p>
            <button 
              onClick={fetchRooms}
              className="mt-4 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors cursor-pointer"
            >
              Xem tất cả loại phòng
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRooms.map(room => (
              <RoomCard 
                key={room.id} 
                room={room} 
                onBookNow={() => handleBookNow(room)} 
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Booking Modal */}
      <PublicBookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        roomType={selectedRoomToBook}
        checkInDate={checkInDate ? new Date(checkInDate) : null}
        checkOutDate={checkOutDate ? new Date(checkOutDate) : null}
      />
    </div>
  );
};

export default RoomsPage;
