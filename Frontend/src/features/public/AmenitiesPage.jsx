import React, { useState, useEffect } from 'react';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import { extraServiceApi } from '../../services/extraServiceApi';
import { useAppConfig } from '../../context/AppConfigContext';
import { 
  IoRestaurantOutline, 
  IoWaterOutline, 
  IoCarSportOutline, 
  IoFitnessOutline, 
  IoWifiOutline, 
  IoSparklesOutline, 
  IoTimeOutline, 
  IoCheckmarkCircleOutline,
  IoShieldCheckmarkOutline,
  IoHeadsetOutline,
  IoPricetagOutline
} from 'react-icons/io5';

const FEATURED_FACILITIES = [
  {
    icon: IoRestaurantOutline,
    title: "Nhà Hàng & Buffet Sáng",
    description: "Phục vụ ẩm thực Á - Âu đa dạng với nguồn nguyên liệu tươi ngon từ địa phương. Buffet sáng miễn phí cho khách lưu trú.",
    hours: "06:00 - 22:00 hàng ngày",
    tag: "Ẩm thực",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
  },
  {
    icon: IoWaterOutline,
    title: "Hồ Bơi Vô Cực Ngoài Trời",
    description: "Tận hưởng làn nước trong xanh với view ngắm toàn cảnh thành phố thơ mộng. Có khu vực hồ bơi an toàn cho trẻ em.",
    hours: "06:00 - 20:00",
    tag: "Thư giãn",
    image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80"
  },
  {
    icon: IoSparklesOutline,
    title: "Spa & Massage Trị Liệu",
    description: "Trải nghiệm liệu trình massage truyền thống, xông hơi đá muối Himalaya giúp tái tạo năng lượng sau ngày dài làm việc.",
    hours: "09:00 - 23:00",
    tag: "Chăm sóc sức khỏe",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80"
  },
  {
    icon: IoFitnessOutline,
    title: "Phòng Gym & Thể Hình Hiện Đại",
    description: "Trang bị đầy đủ máy chạy bộ, tạ đa năng, giàn tập hiện đại nhập khẩu từ nước ngoài, phục vụ miễn phí cho khách lưu trú.",
    hours: "24/7",
    tag: "Thể thao",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80"
  },
  {
    icon: IoCarSportOutline,
    title: "Dịch Vụ Đưa Đón Sân Bay & Thuê Xe",
    description: "Đội ngũ xe 4-7-16 chỗ đời mới đón tiễn sân bay đúng giờ, chu đáo cùng dịch vụ cho thuê xe máy, ô tô tự lái tiện lợi.",
    hours: "Theo lịch hẹn 24/7",
    tag: "Di chuyển",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=800&q=80"
  },
  {
    icon: IoWifiOutline,
    title: "Wifi Tốc Độ Cao & Trung Tâm Hội Nghị",
    description: "Hệ thống Internet cáp quang phủ sóng toàn bộ khuôn viên. Phòng họp và hội trường trang bị âm thanh, máy chiếu hiện đại.",
    hours: "24/7",
    tag: "Công việc",
    image: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80"
  }
];

const AmenitiesPage = () => {
  const { hotelSetting } = useAppConfig();
  const [extraServices, setExtraServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await extraServiceApi.getPublicServices();
        setExtraServices(data || []);
      } catch (error) {
        console.error("Lỗi tải danh sách dịch vụ phụ thu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pt-16 flex flex-col">
      <PublicHeader />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white py-16 px-margin-desktop">
        <div className="max-w-container-max-width mx-auto text-center max-w-3xl">
          <span className="text-secondary-300 font-label-md uppercase tracking-wider font-semibold">Dịch vụ & Tiện ích đẳng cấp</span>
          <h1 className="font-display-lg text-white mt-2 mb-4 drop-shadow-sm">Trải Nghiệm Hoàn Hảo Tại {hotelSetting?.propertyName || 'StayGO'}</h1>
          <p className="text-white/80 font-body-lg leading-relaxed">
            Chúng tôi tự hào mang đến cho quý khách chuỗi tiện ích đa dạng, từ ẩm thực, thư giãn đến hỗ trợ di chuyển và công việc, giúp kỳ nghỉ trọn vẹn nhất.
          </p>
        </div>
      </section>

      {/* Highlights Bar */}
      <section className="bg-surface-container-low border-b border-border-grey py-6 px-margin-desktop">
        <div className="max-w-container-max-width mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <IoCheckmarkCircleOutline className="text-primary mb-1.5" size={28} />
            <span className="font-title-sm font-bold text-on-surface">Miễn phí bữa sáng</span>
            <span className="text-xs text-on-surface-variant">Áp dụng cho mọi hạng phòng</span>
          </div>
          <div className="flex flex-col items-center">
            <IoWifiOutline className="text-primary mb-1.5" size={28} />
            <span className="font-title-sm font-bold text-on-surface">Wifi 500Mbps</span>
            <span className="text-xs text-on-surface-variant">Phủ sóng khắp khách sạn</span>
          </div>
          <div className="flex flex-col items-center">
            <IoHeadsetOutline className="text-primary mb-1.5" size={28} />
            <span className="font-title-sm font-bold text-on-surface">Lễ tân 24/7</span>
            <span className="text-xs text-on-surface-variant">Hỗ trợ quý khách mọi lúc</span>
          </div>
          <div className="flex flex-col items-center">
            <IoShieldCheckmarkOutline className="text-primary mb-1.5" size={28} />
            <span className="font-title-sm font-bold text-on-surface">An ninh tối đa</span>
            <span className="text-xs text-on-surface-variant">Camera & Bảo vệ 24/24</span>
          </div>
        </div>
      </section>

      {/* Featured Facilities Section */}
      <main className="max-w-container-max-width mx-auto px-margin-desktop py-14 flex-1 w-full space-y-16">
        <section>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-headline-lg text-on-surface font-bold">Khu Vực & Tiện Nghi Nổi Bật</h2>
            <p className="text-on-surface-variant text-sm mt-2">Được thiết kế hiện đại nhằm mang lại sự thoải mái và tiện nghi tối đa cho kỳ nghỉ của bạn</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURED_FACILITIES.map((fac, idx) => {
              const Icon = fac.icon;
              return (
                <div key={idx} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border-grey hover:shadow-md transition-all duration-300 group flex flex-col">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={fac.image} 
                      alt={fac.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-3 right-3 bg-surface/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-primary shadow-xs">
                      {fac.tag}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Icon size={18} />
                        </div>
                        <h3 className="font-title-md font-bold text-on-surface">{fac.title}</h3>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{fac.description}</p>
                    </div>
                    <div className="pt-3 border-t border-border-grey flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <IoTimeOutline size={15} className="text-primary" />
                      <span>Thời gian: {fac.hours}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dynamic Extra Services Section from Backend */}
        <section className="bg-surface-container-lowest p-8 md:p-10 rounded-3xl border border-border-grey shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-primary text-xs font-bold uppercase tracking-wider">Phục vụ tận phòng & Theo yêu cầu</span>
              <h2 className="font-headline-md text-on-surface font-bold mt-1">Bảng Giá Dịch Vụ Phụ Thu & Tiện Ích Kèm Theo</h2>
              <p className="text-sm text-on-surface-variant mt-1">Quý khách có thể yêu cầu thêm trực tiếp với Lễ tân hoặc đặt trước khi đến</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary/10 px-4 py-2 rounded-xl">
              <IoPricetagOutline size={16} /> Giá minh bạch - Niêm yết
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-on-surface-variant">Đang tải bảng giá dịch vụ...</div>
          ) : extraServices.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-sm">
              Không có phụ phí phát sinh. Tất cả dịch vụ cơ bản đều miễn phí kèm theo phòng.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {extraServices.map(svc => (
                <div key={svc.id} className="p-4 bg-surface rounded-xl border border-border-grey flex items-center justify-between hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary font-bold text-sm">
                      ✨
                    </div>
                    <div>
                      <h4 className="font-title-sm font-semibold text-on-surface">{svc.name}</h4>
                      <p className="text-xs text-on-surface-variant">{svc.unit ? `Tính theo: ${svc.unit}` : 'Dịch vụ trọn gói'}</p>
                    </div>
                  </div>
                  <div className="text-right font-title-sm font-bold text-primary">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(svc.unitPrice || 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AmenitiesPage;
