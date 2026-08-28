import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import RoomCard from '../../components/common/RoomCard';
import PublicBookingModal from '../landing/PublicBookingModal';
import PublicGroupBookingModal from './PublicGroupBookingModal';
import { roomTypeApi } from '../../services/roomTypeApi';
import { bookingRequestApi } from '../../services/bookingRequestApi';
import SearchBar from '../landing/SearchBar';
import { useAppConfig } from '../../context/AppConfigContext';
import { toast } from '../../context/ToastContext';
import { 
  IoCalendarOutline, 
  IoSearchOutline, 
  IoFilterOutline, 
  IoPeopleOutline, 
  IoBedOutline, 
  IoSparklesOutline,
  IoCheckmarkCircleOutline
} from 'react-icons/io5';
import LoadingScreen from '../../components/common/LoadingScreen';

const RoomsPage = () => {
  const navigate = useNavigate();
  const { hotelSetting } = useAppConfig();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [guestCapacity, setGuestCapacity] = useState('ALL');
  const [selectedRoomToBook, setSelectedRoomToBook] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRoomForGroup, setSelectedRoomForGroup] = useState(null);
  const [isGroupBookingModalOpen, setIsGroupBookingModalOpen] = useState(false);

  useEffect(() => {
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

  const handleSearch = async (from, to) => {
    setCheckInDate(from);
    setCheckOutDate(to);
    setLoading(true);
    try {
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      const data = await bookingRequestApi.getPublicAvailability(fromStr, toStr);
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
    if (!checkInDate || !checkOutDate) {
      toast.warning("Vui lòng chọn ngày Nhận phòng và Trả phòng trước khi đặt!", "Chưa chọn thời gian");
      return;
    }
    setSelectedRoomToBook(room);
    setIsBookingModalOpen(true);
  };

  const handleGroupBook = (room) => {
    if (!checkInDate || !checkOutDate) {
      toast.warning("Vui lòng chọn ngày Nhận phòng và Trả phòng trước khi đặt đoàn.", "Chưa chọn thời gian");
      return;
    }
    setSelectedRoomForGroup(room);
    setIsGroupBookingModalOpen(true);
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

      {/* Hero Section - Synchronized with Landing Page */}
      <section className="relative w-full h-[320px] flex flex-col items-center justify-center">
        <div className="absolute inset-0 z-0">
          <div 
            className="bg-cover bg-center w-full h-full bg-neutral-800" 
            style={{ backgroundImage: hotelSetting?.homeImage ? `url('${hotelSetting.homeImage}')` : undefined }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-container-max-width mx-auto mb-6">
          <h1 className="font-display-lg text-display-lg text-white mb-2 drop-shadow-md">
            Danh Sách Phòng & Bảng Giá{hotelSetting?.propertyName ? ` tại ${hotelSetting.propertyName}` : ''}
          </h1>
          <p className="font-title-lg text-title-lg text-white drop-shadow-md">
            Tìm kiếm để so sánh giá cả và lựa chọn không gian nghỉ dưỡng lý tưởng
          </p>
        </div>
        
        <SearchBar onSearch={handleSearch} />
      </section>

      {/* Main Room Grid */}
      <main className="max-w-container-max-width mx-auto px-margin-desktop mt-24 mb-16 flex-1 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-border-grey">
          <div>
            <h2 className="font-headline-md text-on-surface font-bold">Lựa chọn phòng phù hợp ({filteredRooms.length} loại phòng)</h2>
            <p className="text-sm text-on-surface-variant mt-1">Giá đã bao gồm thuế phí, nước suối chào đón và wifi miễn phí</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick Capacity Filter Buttons */}
            <div className="flex bg-surface-container-low border border-border-grey rounded p-1 gap-1 text-xs">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: '1', label: '1 khách' },
                { id: '2', label: '2 khách' },
                { id: '4', label: '3-4+ khách' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setGuestCapacity(f.id)}
                  className={`px-3 py-1.5 rounded transition-all font-medium ${guestCapacity === f.id ? 'bg-primary text-white font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <IoCheckmarkCircleOutline size={16} /> Miễn phí hủy trước 24h
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingScreen message="Đang tải thông tin bảng giá và phòng trống..." />
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
                onGroupBook={() => handleGroupBook(room)}
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
      <PublicGroupBookingModal
        isOpen={isGroupBookingModalOpen}
        onClose={() => setIsGroupBookingModalOpen(false)}
        roomTypes={rooms}
        initialRoom={selectedRoomForGroup}
        checkInDate={checkInDate ? new Date(checkInDate) : null}
        checkOutDate={checkOutDate ? new Date(checkOutDate) : null}
      />
    </div>
  );
};

export default RoomsPage;
