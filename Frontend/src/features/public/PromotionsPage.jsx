import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import { useAppConfig } from '../../context/AppConfigContext';
import { 
  IoGiftOutline, 
  IoCopyOutline, 
  IoCheckmarkOutline, 
  IoCalendarOutline, 
  IoTimeOutline, 
  IoFlashOutline, 
  IoSparklesOutline, 
  IoArrowForwardOutline,
  IoHeartOutline
} from 'react-icons/io5';

const PROMOTIONS_DATA = [
  {
    id: 'early-bird',
    code: 'EARLY20',
    title: 'Ưu Đãi Đặt Sớm - Giảm Ngay 20%',
    discount: 'GIẢM 20%',
    category: 'Mùa du lịch',
    description: 'Áp dụng cho khách hàng đặt phòng trước từ 14 ngày trở lên. Bao gồm miễn phí buffet sáng và nước uống chào đón.',
    validUntil: '31/12/2026',
    minNights: 'Tối thiểu 2 đêm',
    badgeColor: 'bg-emerald-500',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'weekend-getaway',
    code: 'WEEKEND15',
    title: 'Kỳ Nghỉ Cuối Tuần - Nạp Lại Năng Lượng',
    discount: 'GIẢM 15%',
    category: 'Cuối tuần',
    description: 'Thư giãn cuối tuần trọn vẹn với ưu đãi giảm 15% cho các đêm Thứ Sáu đến Chủ Nhật. Tặng kèm voucher dịch vụ Spa 100k.',
    validUntil: 'Hàng tuần',
    minNights: 'Áp dụng Thứ 6 - CN',
    badgeColor: 'bg-blue-600',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'long-stay',
    code: 'LONGSTAY30',
    title: 'Lưu Trú Dài Ngày - Giá Cực Hấp Dẫn',
    discount: 'GIẢM ĐẾN 30%',
    category: 'Dài hạn',
    description: 'Dành riêng cho khách công tác hoặc kỳ nghỉ dài từ 5 đêm trở lên. Miễn phí dịch vụ giặt ủi và đưa đón sân bay 1 chiều.',
    validUntil: '31/12/2026',
    minNights: 'Từ 5 đêm trở lên',
    badgeColor: 'bg-purple-600',
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'honeymoon',
    code: 'HONEYMOON',
    title: 'Gói Trăng Mật & Cặp Đôi Lãng Mạn',
    discount: 'TẶNG DỊCH VỤ',
    category: 'Cặp đôi',
    description: 'Setup phòng ngủ hoa tươi, nến thơm, 1 chai rượu vang cao cấp và bữa tối lãng mạn tại nhà hàng khách sạn.',
    validUntil: 'Quanh năm',
    minNights: 'Từ 2 đêm',
    badgeColor: 'bg-rose-500',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'vip-member',
    code: 'LOYALTY10',
    title: 'Đặc Quyền Hội Viên Thân Thiết',
    discount: 'GIẢM THÊM 10%',
    category: 'Hội viên',
    description: 'Khách hàng có tài khoản tích điểm được giảm trực tiếp thêm 10% trên mọi loại giá phòng và ưu tiên nhận phòng sớm/trả phòng trễ.',
    validUntil: 'Vô thời hạn',
    minNights: 'Không giới hạn',
    badgeColor: 'bg-amber-500',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'group-tour',
    code: 'GROUP25',
    title: 'Ưu Đãi Đoàn & Gia Đình Lớn',
    discount: 'GIẢM 25%',
    category: 'Khách đoàn',
    description: 'Ưu đãi cực tốt khi đặt từ 3 phòng trở lên. Hỗ trợ sắp xếp các phòng gần nhau và miễn phí phòng họp nhóm 2 giờ.',
    validUntil: '31/12/2026',
    minNights: 'Từ 3 phòng trở lên',
    badgeColor: 'bg-teal-600',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'
  }
];

const PromotionsPage = () => {
  const navigate = useNavigate();
  const { hotelSetting } = useAppConfig();
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pt-16 flex flex-col">
      <PublicHeader />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#334155] text-white py-16 px-margin-desktop">
        <div className="max-w-container-max-width mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/40 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <IoFlashOutline size={16} /> Ưu Đãi Mới Nhất 2026
          </div>
          <h1 className="font-display-lg text-white mb-4 drop-shadow-sm">Chương Trình Khuyến Mãi & Ưu Đãi Đặc Biệt</h1>
          <p className="text-white/80 font-body-lg leading-relaxed">
            Khám phá các gói ưu đãi nghỉ dưỡng hấp dẫn tại {hotelSetting?.propertyName || 'StayGO'}. Tiết kiệm nhiều hơn cho kỳ nghỉ tuyệt vời của bạn và gia đình!
          </p>
        </div>
      </section>

      {/* Promotions Grid */}
      <main className="max-w-container-max-width mx-auto px-margin-desktop py-14 flex-1 w-full space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PROMOTIONS_DATA.map((promo) => {
            const isCopied = copiedCode === promo.code;
            return (
              <div 
                key={promo.id}
                className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-border-grey hover:shadow-lg transition-all duration-300 flex flex-col group"
              >
                {/* Image & Badge */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={promo.image} 
                    alt={promo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  {/* Category Tag */}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-on-surface px-3 py-1 rounded-full text-xs font-semibold shadow-xs">
                    {promo.category}
                  </span>

                  {/* Discount Badge */}
                  <span className={`absolute bottom-3 left-3 ${promo.badgeColor} text-white font-bold text-xs uppercase px-3 py-1 rounded-md shadow-md tracking-wider`}>
                    {promo.discount}
                  </span>
                </div>

                {/* Details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors">
                      {promo.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                      {promo.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border-grey text-xs text-on-surface-variant font-medium">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><IoCalendarOutline size={15} /> Hạn sử dụng:</span>
                      <span className="font-semibold text-on-surface">{promo.validUntil}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><IoTimeOutline size={15} /> Điều kiện:</span>
                      <span className="font-semibold text-on-surface">{promo.minNights}</span>
                    </div>
                  </div>

                  {/* Voucher Box & Apply Button */}
                  <div className="pt-2 flex items-center gap-2">
                    <div className="flex-1 bg-surface-container-low border border-dashed border-primary/50 p-2.5 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Mã khuyến mãi:</div>
                        <div className="font-mono font-bold text-primary text-sm tracking-wider">{promo.code}</div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleCopyCode(promo.code)}
                        className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Sao chép mã"
                      >
                        {isCopied ? (
                          <>
                            <IoCheckmarkOutline size={14} className="text-green-600" />
                            <span className="text-green-600">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <IoCopyOutline size={14} />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => navigate('/rooms')}
                      className="px-4 py-3 bg-primary text-white hover:bg-primary-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs whitespace-nowrap cursor-pointer"
                    >
                      Đặt ngay <IoArrowForwardOutline size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <section className="bg-gradient-to-r from-primary to-primary-700 text-white rounded-3xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="max-w-xl">
            <h2 className="font-headline-md text-white font-bold mb-2">Bạn Đi Theo Đoàn Hoặc Có Yêu Cầu Riêng?</h2>
            <p className="text-white/85 text-sm leading-relaxed">
              Hãy liên hệ trực tiếp với bộ phận chăm sóc khách hàng của chúng tôi để nhận báo giá ưu đãi độc quyền dành riêng cho đoàn công tác, tiệc cưới và sự kiện.
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/contact')}
              className="px-6 py-3 bg-white text-primary font-bold text-sm rounded-xl hover:bg-white/90 transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              Liên hệ tư vấn
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PromotionsPage;
