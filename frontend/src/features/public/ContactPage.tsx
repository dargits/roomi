import React, { useState } from 'react';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import { useAppConfig, DEFAULT_HERO_IMAGE } from '../../context/AppConfigContext';
import { 
  IoCallOutline, 
  IoMailOutline, 
  IoLocationOutline, 
  IoTimeOutline, 
  IoCheckmarkCircleOutline,
  IoNavigateOutline
} from 'react-icons/io5';

const ContactPage: React.FC = () => {
  const { hotelSetting } = useAppConfig();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'DAT_PHONG',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
      setFormData({
        name: '',
        phone: '',
        email: '',
        subject: 'DAT_PHONG',
        message: ''
      });
    }, 800);
  };

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pt-16 flex flex-col">
      <PublicHeader />

      {/* Hero Banner with Hotel Background Image */}
      <section className="relative w-full h-[320px] flex flex-col items-center justify-center text-white px-4 md:px-margin-desktop overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div 
            className="bg-cover bg-center w-full h-full bg-neutral-800 animate-hero-zoom" 
            style={{ backgroundImage: `url('${hotelSetting?.homeImage || DEFAULT_HERO_IMAGE}')` }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 max-w-container-max-width mx-auto text-center max-w-3xl px-4 animate-fade-in-up">
          <span className="text-secondary-300 font-label-md uppercase tracking-wider font-semibold">Hỗ trợ & Giải đáp 24/7</span>
          <h1 className="font-display-lg text-white mt-2 mb-3 drop-shadow-md">Liên Hệ Với Chúng Tôi</h1>
          <p className="text-white/90 font-body-lg leading-relaxed drop-shadow-sm">
            Đội ngũ lễ tân và chăm sóc khách hàng của {hotelSetting?.propertyName || 'Khách sạn'} luôn sẵn sàng hỗ trợ quý khách mọi lúc, mọi nơi.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-container-max-width mx-auto px-margin-desktop py-14 flex-1 w-full space-y-16">
        
        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-surface rounded-2xl border border-border-grey shadow-sm flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <IoLocationOutline size={26} />
            </div>
            <h3 className="font-title-sm font-bold text-on-surface">Địa Chỉ Khách Sạn</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {hotelSetting?.address || 'Đang cập nhật địa chỉ'}
            </p>
          </div>

          <div className="p-6 bg-surface rounded-2xl border border-border-grey shadow-sm flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <IoCallOutline size={26} />
            </div>
            <h3 className="font-title-sm font-bold text-on-surface">Hotline Đặt Phòng</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <a href={`tel:${hotelSetting?.phone}`} className="text-primary font-bold hover:underline">
                {hotelSetting?.phone || 'Đang cập nhật'}
              </a>
              <br />
              Phục vụ 24/7 (Cước phí thông thường)
            </p>
          </div>

          <div className="p-6 bg-surface rounded-2xl border border-border-grey shadow-sm flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <IoMailOutline size={26} />
            </div>
            <h3 className="font-title-sm font-bold text-on-surface">Hộp Thư Điện Tử</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <a href={`mailto:${hotelSetting?.email}`} className="text-primary font-bold hover:underline">
                {hotelSetting?.email || 'contact@staygo.vn'}
              </a>
              <br />
              Phản hồi trong vòng 2 giờ
            </p>
          </div>

          <div className="p-6 bg-surface rounded-2xl border border-border-grey shadow-sm flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <IoTimeOutline size={26} />
            </div>
            <h3 className="font-title-sm font-bold text-on-surface">Giờ Phục Vụ</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Nhận phòng: <strong>{hotelSetting?.defaultCheckinTime?.substring(0,5) || '14:00'}</strong><br />
              Trả phòng: <strong>{hotelSetting?.defaultCheckoutTime?.substring(0,5) || '12:00'}</strong><br />
              Lễ tân trực: <strong>24/24</strong>
            </p>
          </div>
        </div>

        {/* Form & Map Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Contact Inquiry Form */}
          <div className="lg:col-span-7 bg-surface-container-lowest p-8 md:p-10 rounded-3xl border border-border-grey shadow-sm">
            <div className="mb-6">
              <span className="text-primary font-bold text-xs uppercase tracking-wider">Để lại lời nhắn</span>
              <h2 className="font-headline-md text-on-surface font-bold mt-1">Gửi Yêu Cầu Hoặc Phản Hồi</h2>
              <p className="text-xs text-on-surface-variant mt-1">Vui lòng điền thông tin bên dưới, nhân viên chăm sóc khách hàng sẽ liên hệ lại quý khách sớm nhất.</p>
            </div>

            {submitted ? (
              <div className="p-6 bg-green-50 border border-green-200 rounded-2xl text-center space-y-3">
                <IoCheckmarkCircleOutline size={48} className="text-green-600 mx-auto" />
                <h3 className="font-title-md font-bold text-green-900">Gửi Tin Nhắn Thành Công!</h3>
                <p className="text-sm text-green-700">
                  Cảm ơn quý khách đã liên hệ. Bộ phận lễ tân của {hotelSetting?.propertyName || 'StayGO'} sẽ phản hồi lại qua SĐT / Email trong thời gian sớm nhất.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-2 px-5 py-2 bg-green-700 text-white rounded-lg text-xs font-semibold hover:bg-green-800 transition-colors cursor-pointer"
                >
                  Gửi lời nhắn khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      className="w-full p-3 border border-border-grey rounded-xl text-sm bg-surface focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="0912 345 678"
                      className="w-full p-3 border border-border-grey rounded-xl text-sm bg-surface focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Email tiếp nhận
                    </label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="name@email.com"
                      className="w-full p-3 border border-border-grey rounded-xl text-sm bg-surface focus:outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Chủ đề liên hệ
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full p-3 border border-border-grey rounded-xl text-sm bg-surface focus:outline-none focus:border-primary font-medium"
                    >
                      <option value="DAT_PHONG">Hỏi thông tin đặt phòng</option>
                      <option value="DICH_VU">Dịch vụ ăn uống & Hội nghị</option>
                      <option value="DOAN">Đặt phòng đoàn / Doanh nghiệp</option>
                      <option value="PHAN_HOI">Góp ý chất lượng dịch vụ</option>
                      <option value="KHAC">Vấn đề khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Nội dung lời nhắn <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Quý khách vui lòng mô tả chi tiết yêu cầu, ngày dự kiến lưu trú hoặc thắc mắc cần giải đáp..."
                    className="w-full p-3 border border-border-grey rounded-xl text-sm bg-surface focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {sending ? 'Đang gửi thông tin...' : 'Gửi lời nhắn'}
                </button>
              </form>
            )}
          </div>

          {/* Map & Information Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-border-grey shadow-sm">
              <h3 className="font-title-md font-bold text-on-surface mb-3">Chỉ Đường & Vị Trí</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                {hotelSetting?.propertyName || 'Khách sạn'} tọa lạc tại {hotelSetting?.address || 'vị trí trung tâm thuận tiện'}. Quý khách có thể dễ dàng di chuyển và định vị thông qua bản đồ bên dưới:
              </p>
              <div className="aspect-video bg-surface-container-low rounded-2xl overflow-hidden border border-border-grey flex items-center justify-center text-xs text-on-surface-variant mb-4">
                <iframe
                  title={`Google Maps ${hotelSetting?.propertyName || ''}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(hotelSetting?.address?.trim() || hotelSetting?.propertyName?.trim() || 'Z115, Phan Đình Phùng, Tp. Thái Nguyên')}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                ></iframe>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelSetting?.address?.trim() || hotelSetting?.propertyName?.trim() || 'Z115, Phan Đình Phùng, Tp. Thái Nguyên')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-medium text-xs border border-border-grey transition-colors"
              >
                <IoNavigateOutline size={16} />
                Mở chỉ đường trên Google Maps
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
