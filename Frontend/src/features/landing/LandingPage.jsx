import React, { useState, useEffect } from 'react';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import SearchBar from './SearchBar';
import FilterSidebar from './FilterSidebar';
import RoomCard from '../../components/common/RoomCard';
import { useAppConfig } from '../../context/AppConfigContext';
import { roomTypeApi } from '../../services/roomTypeApi';
import { bookingRequestApi } from '../../services/bookingRequestApi';
import PublicBookingModal from './PublicBookingModal';

const LandingPage = () => {
  const { hotelSetting } = useAppConfig();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [priceLimit, setPriceLimit] = useState(10000000); // Default max 10M

  // Booking states
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRoomToBook, setSelectedRoomToBook] = useState(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomTypeApi.getPublicRoomTypes();
        // Map backend model to RoomCard props
        const mappedRooms = data.map(room => ({
          id: room.id,
          name: room.name,
          rating: 4.5, // Placeholder
          ratingScore: 8.5, // Placeholder
          ratingText: "Tuyệt vời", // Placeholder
          reviews: 120, // Placeholder
          maxCapacity: room.maxCapacity,
          amenitiesDescription: room.amenitiesDescription,
          basePrice: room.basePrice,
          price: new Intl.NumberFormat('vi-VN').format(room.basePrice) + ' ₫',
          imageUrls: room.imageUrls || [],
          primaryButton: true
        }));
        setRooms(mappedRooms);
        
        // Update max price based on fetched rooms
        if (mappedRooms.length > 0) {
          const highestPrice = Math.max(...mappedRooms.map(r => r.basePrice));
          setPriceLimit(highestPrice > 0 ? highestPrice : 10000000);
        }
      } catch (error) {
        console.error("Lỗi khi lấy danh sách phòng:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const handleSearch = async (from, to) => {
    setCheckInDate(from);
    setCheckOutDate(to);
    setLoading(true);
    
    try {
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      const data = await bookingRequestApi.getPublicAvailability(fromStr, toStr);
      
      const mappedRooms = data.map(room => ({
        id: room.roomTypeId || room.id,
        name: room.name,
        rating: 4.5, 
        ratingScore: 8.5, 
        ratingText: "Tuyệt vời", 
        reviews: 120, 
        maxCapacity: room.maxCapacity,
        amenitiesDescription: room.amenitiesDescription,
        basePrice: room.basePrice,
        price: new Intl.NumberFormat('vi-VN').format(room.basePrice) + ' ₫',
        imageUrls: room.imageUrls || [],
        primaryButton: true
      }));
      setRooms(mappedRooms);
    } catch (error) {
      console.error("Lỗi khi tìm phòng trống:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (room) => {
    if (!checkInDate || !checkOutDate) {
      alert("Vui lòng chọn ngày Nhận phòng và Trả phòng trước khi đặt!");
      return;
    }
    setSelectedRoomToBook(room);
    setIsBookingModalOpen(true);
  };

  const handleTypeChange = (typeName, isChecked) => {
    if (isChecked) {
      setSelectedTypes(prev => [...prev, typeName]);
    } else {
      setSelectedTypes(prev => prev.filter(t => t !== typeName));
    }
  };

  const handleAmenityChange = (amenity, isChecked) => {
    if (isChecked) {
      setSelectedAmenities(prev => [...prev, amenity]);
    } else {
      setSelectedAmenities(prev => prev.filter(a => a !== amenity));
    }
  };

  const [sortBy, setSortBy] = useState('default');

  const filteredRooms = rooms.filter(room => {
    // 1. Filter by Room Type
    if (selectedTypes.length > 0 && !selectedTypes.includes(room.name)) {
      return false;
    }
    // 2. Filter by Price
    if (room.basePrice > priceLimit) {
      return false;
    }
    // 3. Filter by Amenities (room must have ALL selected amenities)
    if (selectedAmenities.length > 0) {
      const roomAmenities = (room.amenitiesDescription || "").toLowerCase();
      const hasAll = selectedAmenities.every(a => roomAmenities.includes(a.toLowerCase()));
      if (!hasAll) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.basePrice - b.basePrice;
    if (sortBy === 'price_desc') return b.basePrice - a.basePrice;
    if (sortBy === 'capacity_desc') return b.maxCapacity - a.maxCapacity;
    if (sortBy === 'popular') return b.reviews - a.reviews;
    return 0;
  });
  
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pt-16 flex flex-col">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative w-full h-[320px] flex flex-col items-center justify-center">
        <div className="absolute inset-0 z-0">
          <div 
            className="bg-cover bg-center w-full h-full" 
            style={{ backgroundImage: `url('${hotelSetting?.homeImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCo1YHiL5se9gdga38ezOmfnhfIypx9vFPk7GdjIyxrYpTx8TNgDwhN4t4WAE7z9R3e2qAVepVSkpAJOYFyo7ItqUhS846P5DdAbYAdkE5Tzd-Lfl8XZLlo9qbQFRi-egz4gbP0DPln99NeynZJgOB9emHu4hX0Tdrg3owl65A6nyfL1Evgt6hubFC9f2nhX2MeXLr8GLvs4GlXUHjk-qx99047GkOSI2xp8r_PEFJXbYXo_cJrLOIrKQ'}')` }}
          ></div>
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative z-10 text-center px-4 max-w-container-max-width mx-auto mb-6">
          <h1 className="font-display-lg text-display-lg text-white mb-2 drop-shadow-md">Khách sạn và nơi để ở tại {hotelSetting?.propertyName || 'Thái Nguyên'}</h1>
          <p className="font-title-lg text-title-lg text-white drop-shadow-md">Tìm kiếm để so sánh giá cả và khám phá ưu đãi tuyệt vời có miễn phí hủy</p>
        </div>
        
        <SearchBar onSearch={handleSearch} />
      </section>

      {/* Main Content Area */}
      <main className="max-w-container-max-width mx-auto px-margin-desktop mt-24 mb-16 grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 w-full">
        <FilterSidebar 
          roomTypes={rooms.map(r => r.name)} 
          selectedTypes={selectedTypes} 
          onTypeChange={handleTypeChange}
          selectedAmenities={selectedAmenities}
          onAmenityChange={handleAmenityChange}
          maxPriceLimit={Math.max(...rooms.map(r => r.basePrice), 10000000)}
          priceLimit={priceLimit}
          onPriceChange={setPriceLimit}
        />
        
        {/* Room List Area */}
        <section className="md:col-span-9">
          <div className="flex items-center justify-between mb-6 border-b border-border-grey pb-2">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Các loại phòng tại {hotelSetting?.propertyName || 'StayGO'}</h2>
          </div>

          {/* Sorting Tabs */}
          <div className="flex overflow-x-auto mb-6 border-b border-border-grey">
            <button 
              onClick={() => setSortBy('default')}
              className={`px-4 py-3 font-title-md text-title-md whitespace-nowrap transition-colors border-b-2 ${sortBy === 'default' ? 'text-primary border-primary' : 'text-on-surface hover:text-primary border-transparent'}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setSortBy('price_asc')}
              className={`px-4 py-3 font-title-md text-title-md whitespace-nowrap transition-colors border-b-2 ${sortBy === 'price_asc' ? 'text-primary border-primary' : 'text-on-surface hover:text-primary border-transparent'}`}
            >
              Giá thấp nhất
            </button>
            <button 
              onClick={() => setSortBy('price_desc')}
              className={`px-4 py-3 font-title-md text-title-md whitespace-nowrap transition-colors border-b-2 ${sortBy === 'price_desc' ? 'text-primary border-primary' : 'text-on-surface hover:text-primary border-transparent'}`}
            >
              Giá cao nhất
            </button>
            <button 
              onClick={() => setSortBy('capacity_desc')}
              className={`px-4 py-3 font-title-md text-title-md whitespace-nowrap transition-colors border-b-2 ${sortBy === 'capacity_desc' ? 'text-primary border-primary' : 'text-on-surface hover:text-primary border-transparent'}`}
            >
              Sức chứa lớn nhất
            </button>
          </div>

          {/* Room Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-10 text-on-surface-variant">Đang tải danh sách phòng...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant">Hiện chưa có loại phòng nào phù hợp với bộ lọc.</div>
            ) : (
              filteredRooms.map(room => (
                <RoomCard key={room.id} room={room} onBookNow={() => handleBookNow(room)} />
              ))
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Booking Modal */}
      <PublicBookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        roomType={selectedRoomToBook}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
      />
    </div>
  );
};

export default LandingPage;
