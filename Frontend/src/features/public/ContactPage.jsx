import React, { useState } from 'react';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import { useAppConfig } from '../../context/AppConfigContext';
import { 
  IoCallOutline, 
  IoMailOutline, 
  IoLocationOutline, 
  IoTimeOutline, 
  IoSendOutline,
  IoCheckmarkCircleOutline,
  IoHelpCircleOutline,
  IoChatbubblesOutline,
  IoShieldCheckmarkOutline
} from 'react-icons/io5';

const FAQS = [
  {
    q: 'Làm thế nào để gửi yêu cầu đặt phòng trực tuyến?',
    a: 'Quý khách chỉ cần truy cập trang "Phòng & Giá" hoặc "Trang chủ", chọn ngày đến, ngày đi, loại phòng ưng ý và bấm "Đặt phòng ngay". Nhân viên lễ tân sẽ kiểm tra và xác nhận trong vòng 15 phút.'
  },
  {
    q: 'Khách sạn hỗ trợ các hình thức thanh toán nào?',
    a: 'Chúng tôi hỗ trợ đa dạng phương thức thanh toán: Tiền mặt, chuyển khoản ngân hàng (VietQR), thẻ tín dụng (Visa, Mastercard, JCB) và thanh toán trực tiếp khi làm thủ tục nhận phòng.'
  },
  {
    q: 'Tôi có thể yêu cầu nhận phòng sớm hoặc trả phòng trễ không?',
    a: 'Có, quý khách vui lòng liên hệ trước với hotline hoặc ghi chú khi đặt phòng. Việc nhận phòng sớm hoặc trả phòng trễ sẽ tùy thuộc vào tình trạng phòng trống thực tế vào ngày quý khách đến.'
  },
  {
    q: 'Khách sạn có bãi đỗ xe ô tô miễn phí không?',
    a: 'Có, khách sạn có bãi đỗ xe ô tô và xe máy rộng rãi, có bảo vệ trông giữ 24/24 và camera an ninh hoàn toàn miễn phí cho khách lưu trú.'
  }
];

const ContactPage = () => {
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

  const handleSubmit = (e) => {
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

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-[#1A365D] via-[#1E293B] to-[#0F172A] text-white py-16 px-margin-desktop">
        <div className="max-w-container-max-width mx-auto text-center max-w-3xl">
          <span className="text-secondary-300 font-label-md uppercase tracking-wider font-semibold">Hỗ trợ & Giải đáp 24/7</span>
          <h1 className="font-display-lg text-white mt-2 mb-4 drop-shadow-sm">Liên Hệ Với Chúng Tôi</h1>
          <p className="text-white/85 font-body-lg leading-relaxed">
            Đội ngũ lễ tân và chăm sóc khách hàng của {hotelSetting?.propertyName || 'StayGO'} luôn sẵn sàng hỗ trợ quý khách mọi lúc, mọi nơi.
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
                  <IoSendOutline size={18} />
                  {sending ? 'Đang gửi thông tin...' : 'Gửi Lời Nhắn Đến Khách Sạn'}
                </button>
              </form>
            )}
          </div>

          {/* Map & Location Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface rounded-3xl overflow-hidden border border-border-grey shadow-sm">
              <div className="p-6 border-b border-border-grey bg-surface-container-low">
                <h3 className="font-title-sm font-bold text-on-surface flex items-center gap-2">
                  <IoLocationOutline size={18} className="text-primary" />
                  Bản Đồ Chỉ Đường
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{hotelSetting?.address || 'Trung tâm thành phố'}</p>
              </div>

              {/* Map visual / placeholder */}
              <div className="relative h-64 bg-slate-100 flex flex-col items-center justify-center text-center p-6 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80')" }}>
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
                <div className="relative z-10 text-white space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/90 mx-auto flex items-center justify-center shadow-lg animate-pulse">
                    <IoLocationOutline size={28} />
                  </div>
                  <h4 className="font-bold text-base">{hotelSetting?.propertyName || 'StayGO Hotel'}</h4>
                  <p className="text-xs text-white/80 max-w-xs">{hotelSetting?.address || 'Vị trí đắc địa, giao thông thuận lợi'}</p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hotelSetting?.propertyName || 'Khach san') + ' ' + (hotelSetting?.address || ''))}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block px-4 py-2 bg-white text-primary rounded-lg text-xs font-bold shadow-md hover:bg-slate-50 transition-colors"
                  >
                    Xem trên Google Maps
                  </a>
                </div>
              </div>

              <div className="p-6 space-y-3 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Cách sân bay / ga tàu: <strong>15 - 30 phút</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Cách trung tâm mua sắm & ẩm thực: <strong>5 phút đi bộ</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>Bãi đỗ xe ô tô 45 chỗ miễn phí trong khuôn viên</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Frequently Asked Questions (FAQ) */}
        <section className="bg-surface-container-low p-8 md:p-12 rounded-3xl border border-border-grey">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Hỏi & Đáp</span>
            <h2 className="font-headline-md text-on-surface font-bold mt-1">Câu Hỏi Thường Gặp</h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">Các giải đáp nhanh cho các thắc mắc phổ biến của khách hàng</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="p-6 bg-surface rounded-2xl border border-border-grey space-y-2">
                <div className="flex items-start gap-2 text-primary font-bold text-sm">
                  <IoHelpCircleOutline size={20} className="shrink-0 mt-0.5" />
                  <h4>{faq.q}</h4>
                </div>
                <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed pl-7">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
