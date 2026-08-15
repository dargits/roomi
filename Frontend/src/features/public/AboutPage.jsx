import React from 'react';
import { useNavigate } from 'react-router-dom';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import { useAppConfig } from '../../context/AppConfigContext';
import { 
  IoBusinessOutline, 
  IoShieldCheckmarkOutline, 
  IoHeartOutline, 
  IoLocationOutline, 
  IoStar, 
  IoTimeOutline, 
  IoDocumentTextOutline,
  IoCheckmarkCircleOutline,
  IoPeopleOutline,
  IoBedOutline,
  IoSparklesOutline
} from 'react-icons/io5';

const AboutPage = () => {
  const navigate = useNavigate();
  const { hotelSetting } = useAppConfig();

  const STATS = [
    { label: 'Loại phòng cao cấp', value: '10+', icon: IoBedOutline },
    { label: 'Khách hàng hài lòng', value: '99.2%', icon: IoHeartOutline },
    { label: 'Đánh giá bình quân', value: '4.9 / 5', icon: IoStar },
    { label: 'Hỗ trợ khách hàng', value: '24/7', icon: IoPeopleOutline },
  ];

  const POLICIES = [
    {
      title: 'Quy định Nhận & Trả phòng',
      desc: `Giờ nhận phòng tiêu chuẩn: ${hotelSetting?.defaultCheckinTime?.substring(0,5) || '14:00'}. Giờ trả phòng: ${hotelSetting?.defaultCheckoutTime?.substring(0,5) || '12:00'}. Nhận phòng sớm hoặc trả phòng trễ phụ thuộc vào tình trạng phòng sẵn có và có thể áp dụng phụ phí.`
    },
    {
      title: 'Chính sách Trẻ em & Giường phụ',
      desc: 'Trẻ em dưới 6 tuổi được miễn phí khi ngủ chung giường với bố mẹ. Trẻ từ 6 đến 12 tuổi áp dụng phụ thu bữa sáng. Yêu cầu kê thêm giường phụ vui lòng liên hệ lễ tân trước khi đến.'
    },
    {
      title: 'Chính sách Hủy phòng & Hoàn tiền',
      desc: 'Miễn phí hủy phòng trước 24 giờ so với ngày nhận phòng đối với hầu hết các gói tiêu chuẩn. Các đặt phòng trong dịp Lễ, Tết hoặc chương trình khuyến mãi đặc biệt tuân theo điều kiện cụ thể khi đặt.'
    },
    {
      title: 'Quy định Chung & Vật nuôi',
      desc: 'Nghiêm cấm hút thuốc tại khu vực phòng ngủ không hút thuốc và hành lang chung. Vui lòng không mang theo thú cưng trừ khi có thông báo và thỏa thuận đặc biệt trước với ban quản lý.'
    }
  ];

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pt-16 flex flex-col">
      <PublicHeader />

      {/* Hero Banner */}
      <section className="relative w-full h-[360px] flex items-center justify-center bg-gradient-to-r from-[#111827] to-[#1F2937] text-white px-margin-desktop overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('${hotelSetting?.homeImage || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80'}')` }}></div>
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <span className="text-secondary-300 font-label-md uppercase tracking-wider font-semibold">Chào mừng quý khách đến với</span>
          <h1 className="font-display-lg text-white mt-2 mb-4 drop-shadow-md">{hotelSetting?.propertyName || 'STAYGO HOTEL'}</h1>
          <p className="text-white/85 font-body-lg leading-relaxed">
            Điểm dừng chân lý tưởng kết hợp hoàn hảo giữa không gian nghỉ dưỡng sang trọng, dịch vụ chuyên nghiệp và lòng hiếu khách nồng hậu.
          </p>
        </div>
      </section>

      {/* Key Stats */}
      <section className="bg-surface-container-low border-b border-border-grey py-8 px-margin-desktop">
        <div className="max-w-container-max-width mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex flex-col items-center text-center p-4 bg-surface rounded-xl border border-border-grey shadow-xs">
                <Icon size={28} className="text-primary mb-2" />
                <span className="text-2xl md:text-3xl font-extrabold text-on-surface font-title-lg">{stat.value}</span>
                <span className="text-xs text-on-surface-variant font-medium mt-1">{stat.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Story & Vision Section */}
      <main className="max-w-container-max-width mx-auto px-margin-desktop py-16 flex-1 w-full space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-primary font-bold text-xs uppercase tracking-wider">Về chúng tôi</span>
              <h2 className="font-headline-lg text-on-surface font-bold mt-1">Hành Trình Kiến Tạo Trải Nghiệm Khác Biệt</h2>
            </div>
            <p className="text-on-surface-variant leading-relaxed text-sm md:text-base">
              Tọa lạc tại vị trí đắc địa ở <strong>{hotelSetting?.address || 'trung tâm thành phố'}</strong>, {hotelSetting?.propertyName || 'StayGO'} được xây dựng với mục tiêu mang đến cho khách lưu trú một không gian tiện nghi, ấm cúng như chính ngôi nhà của mình nhưng vẫn ngập tràn trải nghiệm đẳng cấp.
            </p>
            <p className="text-on-surface-variant leading-relaxed text-sm md:text-base">
              Từ những chi tiết thiết kế phòng ngủ tinh tế, hệ thống giường nệm êm ái đạt chuẩn, cho tới từng bữa ăn sáng hay nụ cười đón tiếp của nhân viên lễ tân — tất cả đều được chăm chút tỉ mỉ với tôn chỉ <em>"Sự hài lòng của bạn là niềm tự hào của chúng tôi"</em>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3">
                <IoCheckmarkCircleOutline size={22} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-on-surface text-sm">Vị Trí Trung Tâm</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Thuận tiện di chuyển, gần điểm tham quan & ẩm thực.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <IoCheckmarkCircleOutline size={22} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-on-surface text-sm">Dịch Vụ Chu Đáo</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Đội ngũ nhân viên tận tâm, đào tạo chuyên nghiệp.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <img 
              src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80" 
              alt="Lobby" 
              className="rounded-2xl w-full h-64 object-cover shadow-md hover:scale-[1.02] transition-transform duration-300"
            />
            <img 
              src="https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=600&q=80" 
              alt="Room view" 
              className="rounded-2xl w-full h-64 object-cover shadow-md mt-6 hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        </div>

        {/* Hotel Policies & Rules */}
        <section className="bg-surface-container-lowest p-8 md:p-12 rounded-3xl border border-border-grey shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Thông tin cần biết</span>
            <h2 className="font-headline-md text-on-surface font-bold mt-1">Chính Sách & Quy Định Lưu Trú</h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">Kính mời quý khách tham khảo các quy định chung để kỳ nghỉ diễn ra thuận lợi nhất</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {POLICIES.map((p, idx) => (
              <div key={idx} className="p-6 bg-surface rounded-2xl border border-border-grey space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-primary font-bold text-base">
                  <IoDocumentTextOutline size={20} />
                  <h3>{p.title}</h3>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed pl-7">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Location & Directions */}
        <section className="bg-surface-container-low p-8 md:p-10 rounded-3xl border border-border-grey flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">
              <IoLocationOutline size={16} /> Địa chỉ liên hệ
            </div>
            <h2 className="font-headline-md text-on-surface font-bold">Dễ Dàng Tìm Thấy Chúng Tôi</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              📍 <strong>{hotelSetting?.address || 'Địa chỉ đang cập nhật'}</strong><br />
              📞 Hotline đặt phòng 24/7: <strong>{hotelSetting?.phone || 'Đang cập nhật'}</strong><br />
              ✉️ Email tiếp nhận: <strong>{hotelSetting?.email || 'Đang cập nhật'}</strong>
            </p>
          </div>

          <div className="flex gap-4">
            <button 
              type="button"
              onClick={() => navigate('/contact')}
              className="px-6 py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-600 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              Gửi Tin Nhắn Cho Chúng Tôi
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
