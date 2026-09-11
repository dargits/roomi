import React, { useState, useEffect } from 'react';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import SearchBar from './SearchBar';
import FilterSidebar from './FilterSidebar';
import RoomCard, { RoomCardData } from '../../components/common/RoomCard';
import { useAppConfig, DEFAULT_HERO_IMAGE } from '../../context/AppConfigContext';
import { roomTypeApi } from '../../services/roomTypeApi';
import { bookingRequestApi } from '../../services/bookingRequestApi';
import PublicBookingModal from './PublicBookingModal';
import PublicGroupBookingModal from '../public/PublicGroupBookingModal';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import { 
  IoLocationOutline, 
  IoCallOutline, 
  IoMailOutline, 
  IoTimeOutline, 
  IoNavigateOutline 
} from 'react-icons/io5';

const LandingPage: React.FC = () => {
  const { hotelSetting, isAppLoading } = useAppConfig();
  const { warning: toastWarning } = useToast();
  const [rooms, setRooms] = useState<RoomCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceLimit, setPriceLimit] = useState<number>(10000000); // Default max 10M

  const isInitialLoading = isAppLoading || (loading && rooms.length === 0);

  // Booking states
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRoomToBook, setSelectedRoomToBook] = useState<RoomCardData | null>(null);
  const [selectedRoomForGroup, setSelectedRoomForGroup] = useState<RoomCardData | null>(null);
  const [isGroupBookingModalOpen, setIsGroupBookingModalOpen] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomTypeApi.getPublicRoomTypes();
        // Map backend model to RoomCard props
        const mappedRooms: RoomCardData[] = data.map(room => {
          const displayPrice = room.currentPrice != null ? room.currentPrice : room.basePrice;
          const hasSpecialPrice = room.currentPrice != null && Number(room.currentPrice) !== Number(room.basePrice);
          return {
            id: room.id,
            name: room.name,
            maxCapacity: room.maxCapacity,
            amenitiesDescription: room.amenitiesDescription,
            basePrice: room.basePrice,
            currentPrice: room.currentPrice,
            price: new Intl.NumberFormat('vi-VN').format(displayPrice || 0) + ' ₫',
            originalPrice: hasSpecialPrice ? new Intl.NumberFormat('vi-VN').format(room.basePrice || 0) + ' ₫' : undefined,
            badge: hasSpecialPrice ? (room.priceSourceName || 'Giá ưu đãi') : undefined,
            imageUrls: room.imageUrls || [],
            primaryButton: true
          };
        });
        setRooms(mappedRooms);
        
        // Update max price based on fetched rooms
        if (mappedRooms.length > 0) {
          const prices = mappedRooms.map(r => (r.currentPrice != null ? r.currentPrice : (r.basePrice || 0)));
          const highestPrice = Math.max(...prices);
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

  const handleSearch = async (from: Date, to: Date) => {
    setCheckInDate(from);
    setCheckOutDate(to);
    setLoading(true);
    
    try {
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      const data = await bookingRequestApi.getPublicAvailability(fromStr, toStr);
      
      const mappedRooms: RoomCardData[] = (data as any[]).map(room => {
        const displayPrice = room.currentPrice != null ? room.currentPrice : (room.pricePerNight != null ? room.pricePerNight : room.basePrice);
        const hasSpecialPrice = displayPrice != null && Number(displayPrice) !== Number(room.basePrice);
        return {
          id: room.roomTypeId || room.id,
          name: room.name,
          maxCapacity: room.maxCapacity,
          amenitiesDescription: room.amenitiesDescription,
          basePrice: room.basePrice,
          currentPrice: displayPrice,
          price: new Intl.NumberFormat('vi-VN').format(displayPrice || 0) + ' ₫',
          originalPrice: hasSpecialPrice ? new Intl.NumberFormat('vi-VN').format(room.basePrice || 0) + ' ₫' : undefined,
          badge: hasSpecialPrice ? (room.priceSourceName || (room.priceSource === 'SPECIAL' ? 'Giá ngày áp dụng' : undefined)) : undefined,
          imageUrls: room.imageUrls || [],
          primaryButton: true
        };
      });
      setRooms(mappedRooms);
    } catch (error) {
      console.error("Lỗi khi tìm phòng trống:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (room: RoomCardData) => {
    if (!checkInDate || !checkOutDate) {
      toastWarning("Vui lòng chọn ngày Nhận phòng và Trả phòng trước khi đặt!");
      return;
    }
    setSelectedRoomToBook(room);
    setIsBookingModalOpen(true);
  };

  const handleGroupBook = (room: RoomCardData) => {
    if (!checkInDate || !checkOutDate) {
      toastWarning("Vui lòng chọn ngày Nhận phòng và Trả phòng trước khi đặt đoàn.");
      return;
    }
    setSelectedRoomForGroup(room);
    setIsGroupBookingModalOpen(true);
  };

  const handleTypeChange = (typeName: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedTypes(prev => [...prev, typeName]);
    } else {
      setSelectedTypes(prev => prev.filter(t => t !== typeName));
    }
  };

  const handleAmenityChange = (amenity: string, isChecked: boolean) => {
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
    const effPrice = room.currentPrice != null ? room.currentPrice : (room.basePrice || 0);
    if (effPrice > priceLimit) {
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
    const priceA = a.currentPrice != null ? a.currentPrice : (a.basePrice || 0);
    const priceB = b.currentPrice != null ? b.currentPrice : (b.basePrice || 0);
    if (sortBy === 'price_asc') return priceA - priceB;
    if (sortBy === 'price_desc') return priceB - priceA;
    if (sortBy === 'capacity_desc') return b.maxCapacity - a.maxCapacity;
    return 0;
  });

  const hotelAddress = hotelSetting?.address?.trim() || 'Z115, Phan Đình Phùng, Tp. Thái Nguyên, Tỉnh Thái Nguyên';
  const hotelName = hotelSetting?.propertyName?.trim() || 'STAY AWAY';
  const mapQuery = hotelAddress || `${hotelName}, Việt Nam`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  const directMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pt-16 flex flex-col">
      {/* Full Page Initial Loading Overlay */}
      {isInitialLoading && (
        <LoadingScreen
          fullScreen
          message="Đang tải dữ liệu..."
          submessage="Vui lòng chờ trong giây lát"
        />
      )}

      <PublicHeader />

      {/* Hero Section */}
      <section className="relative z-30 w-full h-[320px] flex flex-col items-center justify-center">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div 
            className="bg-cover bg-center w-full h-full bg-neutral-800 animate-hero-zoom" 
            style={{ backgroundImage: `url('${hotelSetting?.homeImage || DEFAULT_HERO_IMAGE}')` }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-container-max-width mx-auto mb-6 animate-fade-in-up">
          <h1 className="font-display-lg text-display-lg text-white mb-2 drop-shadow-md">
            Khách sạn và nơi để ở{hotelSetting?.propertyName ? ` tại ${hotelSetting.propertyName}` : ''}
          </h1>
          <p className="font-title-lg text-title-lg text-white drop-shadow-md">Tìm kiếm để so sánh giá cả và khám phá ưu đãi tuyệt vời có miễn phí hủy</p>
        </div>
        
        <div className="w-full flex justify-center animate-fade-in-up animate-delay-100">
          <SearchBar onSearch={handleSearch} />
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-container-max-width mx-auto px-margin-desktop mt-24 mb-16 grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 w-full">
        <FilterSidebar 
          roomTypes={rooms.map(r => r.name)} 
          selectedTypes={selectedTypes} 
          onTypeChange={handleTypeChange}
          selectedAmenities={selectedAmenities}
          onAmenityChange={handleAmenityChange}
          maxPriceLimit={Math.max(...rooms.map(r => r.basePrice || 0), 10000000)}
          priceLimit={priceLimit}
          onPriceChange={setPriceLimit}
        />
        
        {/* Room List Area */}
        <section className="md:col-span-9">
          <div className="flex items-center justify-between mb-6 border-b border-border-grey pb-2">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Các loại phòng{hotelSetting?.propertyName ? ` tại ${hotelSetting.propertyName}` : ''}
            </h2>
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
              <div className="space-y-4 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col md:flex-row rounded-2xl border border-border-grey bg-surface-container-lowest overflow-hidden shadow-sm">
                    <div className="md:w-72 h-48 md:h-auto bg-surface-container-high/60 shrink-0" />
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="h-6 w-1/3 bg-surface-container-high/80 rounded" />
                        <div className="h-4 w-1/4 bg-surface-container-high/60 rounded" />
                        <div className="h-4 w-2/3 bg-surface-container-high/50 rounded" />
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-border-grey/50">
                        <div className="h-6 w-28 bg-surface-container-high/80 rounded" />
                        <div className="flex gap-2">
                          <div className="h-9 w-24 bg-surface-container-high/60 rounded-lg" />
                          <div className="h-9 w-28 bg-surface-container-high/80 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant">Hiện chưa có loại phòng nào phù hợp với bộ lọc.</div>
            ) : (
              filteredRooms.map(room => (
                <RoomCard key={room.id} room={room} onBookNow={() => handleBookNow(room)} onGroupBook={() => handleGroupBook(room)} />
              ))
            )}
          </div>
        </section>
      </main>

      {/* Hotel Location & Interactive Map Section */}
      <section className="w-full bg-surface-container-low/60 border-t border-border-grey py-14 px-4 md:px-margin-desktop">
        <div className="max-w-container-max-width mx-auto">
          {/* Section Heading */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Vị trí thuận tiện</span>
            <h2 className="font-headline-md font-bold text-on-surface mt-1">
              Vị Trí Cơ Sở & Chỉ Đường
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-2">
              Bản đồ định vị cơ sở {hotelName}. Dễ dàng tra cứu đường đi và khám phá các điểm đến lân cận.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-surface-container-lowest rounded-3xl border border-border-grey overflow-hidden shadow-xs">
            {/* Left Col: Branch Info & Quick Actions */}
            <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 animate-pulse-glow">
                    <IoLocationOutline size={24} />
                  </div>
                  <div>
                    <h3 className="font-title-md font-bold text-on-surface">
                      {hotelName}
                    </h3>
                    <span className="text-xs text-primary font-medium">Vị trí cơ sở</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-border-grey/60 space-y-2">
                  <p className="text-xs md:text-sm text-on-surface font-medium leading-relaxed">
                    {hotelAddress}
                  </p>
                  <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Ghim vị trí thực tế trên Google Maps
                  </p>
                </div>

                <div className="space-y-3 text-xs md:text-sm text-on-surface-variant">
                  {hotelSetting?.phone && (
                    <div className="flex items-center gap-3">
                      <IoCallOutline size={18} className="text-primary shrink-0" />
                      <span>Hotline hỗ trợ: <strong className="text-on-surface">{hotelSetting.phone}</strong></span>
                    </div>
                  )}
                  {hotelSetting?.email && (
                    <div className="flex items-center gap-3">
                      <IoMailOutline size={18} className="text-primary shrink-0" />
                      <span>Email: <strong className="text-on-surface">{hotelSetting.email}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <IoTimeOutline size={18} className="text-primary shrink-0" />
                    <span>Giờ phục vụ: <strong className="text-on-surface">Nhận {hotelSetting?.defaultCheckinTime?.substring(0,5) || '14:00'} - Trả {hotelSetting?.defaultCheckoutTime?.substring(0,5) || '12:00'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={directMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-shimmer w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-label-md font-semibold text-xs md:text-sm hover:bg-primary/90 hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
                >
                  <IoNavigateOutline size={18} />
                  Mở chỉ đường trên Google Maps
                </a>
              </div>
            </div>

            {/* Right Col: Interactive Google Maps Pinned */}
            <div className="lg:col-span-7 min-h-[350px] md:min-h-[420px] relative bg-surface-container-low">
              <iframe
                title={`Bản đồ vị trí cơ sở ${hotelName}`}
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                className="w-full h-full min-h-[350px] md:min-h-[420px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Booking Modal */}
      <PublicBookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        roomType={selectedRoomToBook}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
      />
      <PublicGroupBookingModal
        isOpen={isGroupBookingModalOpen}
        onClose={() => setIsGroupBookingModalOpen(false)}
        roomTypes={rooms}
        initialRoom={selectedRoomForGroup}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
      />
    </div>
  );
};

export default LandingPage;
