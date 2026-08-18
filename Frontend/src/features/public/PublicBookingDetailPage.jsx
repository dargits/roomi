import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  IoAlertCircleOutline, 
  IoCallOutline, 
  IoCartOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseOutline, 
  IoDocumentOutline, 
  IoInformationCircleOutline, 
  IoLocationOutline, 
  IoMoonOutline, 
  IoPersonOutline, 
  IoTimeOutline, 
  IoCashOutline,
  IoCopyOutline,
  IoShareSocialOutline,
  IoQrCodeOutline,
  IoPrintOutline,
  IoBedOutline,
  IoMailOutline,
  IoShieldCheckmarkOutline,
  IoWalletOutline,
  IoReceiptOutline,
  IoArrowForwardOutline,
  IoCheckmarkDoneOutline
} from 'react-icons/io5';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import publicBookingApi from '../../services/publicBookingApi';
import InvoicePrintTemplate from '../booking/InvoicePrintTemplate';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';
import { useToast } from '../../context/ToastContext';
import { useAppConfig } from '../../context/AppConfigContext';

const VALID_TABS = ['info', 'services', 'invoice', 'deposit'];

const fmtMoney = (n) => {
  if (n == null) return '0 ₫';
  return Number(n).toLocaleString('vi-VN') + ' ₫';
};

const PublicBookingDetailPage = () => {
  const { bookingId, tab } = useParams();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const { hotelSetting } = useAppConfig();

  const activeTab = VALID_TABS.includes(tab) ? tab : 'info';

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState({ invoice: null, payments: [] });
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [deposits, setDeposits] = useState([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      if (activeTab === 'services') {
        fetchServices();
      } else if (activeTab === 'invoice') {
        fetchInvoice();
      } else if (activeTab === 'deposit') {
        fetchDeposits();
      }
    }
  }, [bookingId, activeTab]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const data = await publicBookingApi.getPublicBookingById(bookingId);
      setBooking(data);
    } catch (error) {
      console.error("Lỗi lấy thông tin đặt phòng công khai", error);
      toastError("Không tìm thấy thông tin đặt phòng hoặc liên kết không hợp lệ.");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const data = await publicBookingApi.getPublicBookingServices(bookingId);
      setServices(data || []);
    } catch (error) {
      console.error("Lỗi tải dịch vụ", error);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const data = await publicBookingApi.getPublicBookingInvoice(bookingId);
      setInvoiceData(data || { invoice: null, payments: [] });
    } catch (error) {
      console.error("Lỗi tải hóa đơn", error);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fetchDeposits = async () => {
    setDepositLoading(true);
    try {
      const data = await publicBookingApi.getPublicBookingDeposits(bookingId);
      setDeposits(data || []);
    } catch (error) {
      console.error("Lỗi tải thông tin cọc", error);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleTabChange = (newTab) => {
    navigate(`/booking-detail/${bookingId}/${newTab}`);
  };

  const copySpecificTabLink = (tabKey, tabLabel) => {
    const url = `${window.location.origin}/booking-detail/${bookingId}/${tabKey}`;
    navigator.clipboard.writeText(url);
    toastSuccess(`Đã sao chép link phần "${tabLabel}"! Bạn có thể gửi cho bạn bè ngay.`);
  };

  const copyCurrentTabLink = () => {
    const tabName = activeTab === 'info' ? 'Thông tin chung' :
                    activeTab === 'services' ? 'Dịch vụ phụ thu' :
                    activeTab === 'invoice' ? 'Hóa đơn & Thanh toán' : 'Đặt cọc';
    copySpecificTabLink(activeTab, tabName);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'NEW': return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold text-xs inline-flex items-center gap-1">🟡 Mới tạo</span>;
      case 'CONFIRMED': return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold text-xs inline-flex items-center gap-1">🔵 Đã xác nhận</span>;
      case 'CHECKED_IN': return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold text-xs inline-flex items-center gap-1">🟢 Đang lưu trú</span>;
      case 'CHECKED_OUT': return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-semibold text-xs inline-flex items-center gap-1">⚪ Đã hoàn tất trả phòng</span>;
      case 'CANCELLED': return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-semibold text-xs inline-flex items-center gap-1">🔴 Đã hủy</span>;
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-semibold text-xs">{status}</span>;
    }
  };

  // Tính toán số dư hóa đơn
  const invoice = invoiceData?.invoice;
  const payments = invoiceData?.payments || [];
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const invoiceTotal = invoice?.totalAmount || booking?.actualPrice || booking?.expectedPrice || 0;
  const remainingDue = Math.max(0, invoiceTotal - totalPaid);

  // VietQR URL nếu còn tiền cần thanh toán
  const bankAccount = hotelSetting?.bankAccount || '12005999999999';
  const bankCode = hotelSetting?.bankCode || 'TCB';
  const accountName = hotelSetting?.bankAccountName || 'STAY AWAY';
  const qrTransferContent = `BK${bookingId} ${booking?.guestName || ''}`.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const vietQrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact2.png?amount=${remainingDue}&addInfo=${encodeURIComponent(qrTransferContent)}&accountName=${encodeURIComponent(accountName)}`;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-container-lowest">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-8 mt-16">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <div className="text-on-surface-variant font-medium text-base">Đang tải chi tiết đặt phòng...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-container-lowest">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-8 mt-16 text-center max-w-md mx-auto space-y-4">
          <IoAlertCircleOutline size={56} className="text-error mx-auto" />
          <h2 className="text-2xl font-bold text-on-surface">Không tìm thấy thông tin đặt phòng</h2>
          <p className="text-on-surface-variant text-sm">
            Mã đặt phòng #{bookingId} không tồn tại hoặc đã bị gỡ bỏ. Vui lòng kiểm tra lại liên kết.
          </p>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
            Quay về Trang chủ
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-container-low/40">
      <PublicHeader />

      <main className="flex-1 mt-16 py-8 px-4 md:px-margin-desktop max-w-5xl mx-auto w-full">
        {/* Banner thông báo trang chia sẻ & nút sao chép link */}
        <div className="bg-gradient-to-r from-primary/10 via-blue-50 to-primary/5 border border-primary/20 rounded-xl p-4 md:p-5 mb-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
              <IoShareSocialOutline size={20} />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-base md:text-lg flex items-center gap-2">
                Trang Chi Tiết Đặt Phòng Trực Tuyến
              </h3>
              <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
                Bạn có thể sao chép liên kết của từng mục dưới đây để gửi cho bạn bè hoặc người cùng đi xem rõ ràng.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={copyCurrentTabLink}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold text-xs md:text-sm rounded-lg hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
            >
              <IoCopyOutline size={16} /> Sao chép link phần này
            </button>
          </div>
        </div>

        {/* Thẻ Header tổng quan đặt phòng */}
        <div className="bg-surface-container-lowest rounded-2xl border border-border-grey p-6 md:p-8 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border-grey">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                  {booking.guestName}
                </h1>
                {getStatusBadge(booking.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <IoCallOutline size={16} className="text-primary" /> {booking.guestPhone}
                </span>
                <span className="flex items-center gap-1.5">
                  <IoBedOutline size={16} className="text-primary" /> 
                  <strong>{booking.roomTypeName}</strong> 
                  {booking.roomNumber && <span className="text-primary font-bold ml-1">• Phòng {booking.roomNumber}</span>}
                </span>
                <span className="text-xs bg-surface-container-low text-on-surface px-2.5 py-1 rounded border border-border-grey">
                  Mã đơn: #{booking.id}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl border border-border-grey w-full md:w-auto text-right">
              <div className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mb-1">
                Thời gian lưu trú
              </div>
              <div className="font-title-sm text-on-surface flex items-center justify-end gap-2">
                <span className="font-semibold">{formatStayDateTime(booking.checkInDate, 'checkin')}</span>
                <span className="text-on-surface-variant">→</span>
                <span className="font-semibold">{formatStayDateTime(booking.checkOutDate, 'checkout')}</span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                  {calculateNights(booking.checkInDate, booking.checkOutDate)} đêm
                </span>
              </div>
            </div>
          </div>

          {/* Dải nút sao chép link trực tiếp cho từng tab */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
              <IoShareSocialOutline size={15} /> Sao chép nhanh liên kết gửi người khác:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copySpecificTabLink('info', 'Thông tin chung')}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                  activeTab === 'info'
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-surface-container-low border-border-grey text-on-surface hover:border-primary/50'
                }`}
              >
                <IoInformationCircleOutline size={14} /> Link Thông tin
              </button>

              <button
                type="button"
                onClick={() => copySpecificTabLink('services', 'Dịch vụ phụ thu')}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                  activeTab === 'services'
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-surface-container-low border-border-grey text-on-surface hover:border-primary/50'
                }`}
              >
                <IoCartOutline size={14} /> Link Dịch vụ
              </button>

              <button
                type="button"
                onClick={() => copySpecificTabLink('invoice', 'Hóa đơn & Thanh toán')}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                  activeTab === 'invoice'
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-surface-container-low border-border-grey text-on-surface hover:border-primary/50'
                }`}
              >
                <IoDocumentOutline size={14} /> Link Hóa đơn
              </button>

              <button
                type="button"
                onClick={() => copySpecificTabLink('deposit', 'Đặt cọc')}
                className={`text-xs px-3 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                  activeTab === 'deposit'
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-surface-container-low border-border-grey text-on-surface hover:border-primary/50'
                }`}
              >
                <IoCashOutline size={14} /> Link Đặt cọc
              </button>
            </div>
          </div>
        </div>

        {/* Khung Chuyển Tab và Nội Dung */}
        <div className="bg-surface-container-lowest rounded-2xl border border-border-grey shadow-sm overflow-hidden mb-12">
          {/* Navigation Bar Tabs */}
          <div className="flex border-b border-border-grey bg-surface-container-low/50 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleTabChange('info')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm md:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'info'
                  ? 'border-primary text-primary bg-white shadow-xs'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/50'
              }`}
            >
              <IoInformationCircleOutline size={20} />
              <span>1. Thông tin chung</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('services')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm md:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'services'
                  ? 'border-primary text-primary bg-white shadow-xs'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/50'
              }`}
            >
              <IoCartOutline size={20} />
              <span>2. Dịch vụ phụ thu</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('invoice')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm md:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'invoice'
                  ? 'border-primary text-primary bg-white shadow-xs'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/50'
              }`}
            >
              <IoDocumentOutline size={20} />
              <span>3. Hóa đơn & Thanh toán</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('deposit')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm md:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'deposit'
                  ? 'border-primary text-primary bg-white shadow-xs'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/50'
              }`}
            >
              <IoCashOutline size={20} />
              <span>4. Đặt cọc</span>
            </button>
          </div>

          {/* TAB CONTENT PANELS */}
          <div className="p-6 md:p-8">
            
            {/* TAB 1: THÔNG TIN CHUNG */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chi tiết khách hàng */}
                  <div className="bg-surface-container-low p-5 rounded-xl border border-border-grey space-y-4">
                    <h3 className="font-bold text-on-surface text-base flex items-center gap-2 border-b border-border-grey pb-2.5">
                      <IoPersonOutline size={18} className="text-primary"/> Thông tin Khách hàng
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Họ và tên:</span>
                        <span className="font-bold text-on-surface">{booking.guestName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Số điện thoại:</span>
                        <span className="font-semibold text-on-surface">{booking.guestPhone}</span>
                      </div>
                      {booking.guestEmail && (
                        <div className="flex justify-between items-center">
                          <span className="text-on-surface-variant">Email:</span>
                          <span className="font-medium text-on-surface">{booking.guestEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chi tiết phòng */}
                  <div className="bg-surface-container-low p-5 rounded-xl border border-border-grey space-y-4">
                    <h3 className="font-bold text-on-surface text-base flex items-center gap-2 border-b border-border-grey pb-2.5">
                      <IoBedOutline size={18} className="text-primary"/> Thông tin Phòng đã đặt
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Loại phòng:</span>
                        <span className="font-bold text-primary">{booking.roomTypeName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Số phòng:</span>
                        <span className="font-semibold text-on-surface">
                          {booking.roomNumber ? `Phòng ${booking.roomNumber}` : 'Khách sạn sẽ xếp phòng khi nhận phòng'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Nhận phòng:</span>
                        <span className="font-medium text-on-surface">{formatStayDateTime(booking.checkInDate, 'checkin')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Trả phòng:</span>
                        <span className="font-medium text-on-surface">{formatStayDateTime(booking.checkOutDate, 'checkout')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Tổng thời gian:</span>
                        <span className="font-bold text-primary">{calculateNights(booking.checkInDate, booking.checkOutDate)} đêm</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chính sách nhận & trả phòng */}
                <div className="bg-surface-container-low p-5 rounded-xl border border-border-grey space-y-3">
                  <h3 className="font-bold text-on-surface text-base flex items-center gap-2 border-b border-border-grey pb-2.5">
                    <IoShieldCheckmarkOutline size={18} className="text-primary"/> Quy định & Hướng dẫn nhận phòng
                  </h3>
                  <ul className="text-sm text-on-surface-variant space-y-2 list-disc list-inside">
                    <li>Giờ nhận phòng tiêu chuẩn: <strong>từ 14:00</strong>. Giờ trả phòng tiêu chuẩn: <strong>trước 12:00</strong>.</li>
                    <li>Quý khách vui lòng xuất trình CMND/CCCD hoặc Hộ chiếu khi làm thủ tục nhận phòng tại quầy lễ tân.</li>
                    <li>Nếu có nhu cầu nhận phòng sớm hoặc trả phòng muộn, vui lòng liên hệ trực tiếp lễ tân khách sạn để được hỗ trợ theo tình trạng phòng thực tế.</li>
                  </ul>
                </div>

                {/* Ghi chú */}
                {booking.note && (
                  <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-200/80">
                    <h4 className="font-bold text-amber-900 text-sm mb-1">Ghi chú từ quý khách:</h4>
                    <p className="text-sm text-amber-800 italic">{booking.note}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DỊCH VỤ PHỤ THU */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-on-surface text-lg flex items-center gap-2">
                    <IoCartOutline size={22} className="text-primary" />
                    Danh Sách Dịch Vụ Phụ Thu
                  </h3>
                  <button
                    type="button"
                    onClick={() => copySpecificTabLink('services', 'Dịch vụ phụ thu')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-border-grey text-on-surface flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    <IoCopyOutline size={14} className="text-primary" /> Sao chép link dịch vụ
                  </button>
                </div>

                {servicesLoading ? (
                  <div className="py-12 text-center text-on-surface-variant">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Đang tải danh sách dịch vụ phụ thu...
                  </div>
                ) : services.length === 0 ? (
                  <div className="bg-surface-container-low p-8 rounded-xl border border-border-grey text-center space-y-2">
                    <IoCartOutline size={40} className="text-on-surface-variant/40 mx-auto" />
                    <h4 className="font-semibold text-on-surface">Chưa có dịch vụ phụ thu nào</h4>
                    <p className="text-xs text-on-surface-variant">
                      Chưa ghi nhận đồ uống, minibar, giặt ủi hay dịch vụ gọi thêm cho đợt lưu trú này.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border-grey rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-border-grey">
                        <tr>
                          <th className="p-3.5">#</th>
                          <th className="p-3.5">Tên dịch vụ</th>
                          <th className="p-3.5 text-center">Số lượng</th>
                          <th className="p-3.5 text-right">Đơn giá</th>
                          <th className="p-3.5 text-right">Thành tiền</th>
                          <th className="p-3.5">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-grey">
                        {services.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-surface-container-low/40">
                            <td className="p-3.5 text-on-surface-variant font-medium">{index + 1}</td>
                            <td className="p-3.5 font-bold text-on-surface">{item.serviceName || item.extraService?.name}</td>
                            <td className="p-3.5 text-center font-semibold text-on-surface">{item.quantity}</td>
                            <td className="p-3.5 text-right text-on-surface-variant">{fmtMoney(item.unitPrice || item.price)}</td>
                            <td className="p-3.5 text-right font-bold text-primary">{fmtMoney(item.totalPrice || (item.quantity * (item.unitPrice || item.price || 0)))}</td>
                            <td className="p-3.5 text-xs text-on-surface-variant italic">{item.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-surface-container-low/70 font-bold border-t border-border-grey">
                        <tr>
                          <td colSpan="4" className="p-4 text-right text-on-surface">Tổng tiền phụ thu:</td>
                          <td className="p-4 text-right text-primary text-base font-black">
                            {fmtMoney(services.reduce((sum, item) => sum + (item.totalPrice || (item.quantity * (item.unitPrice || item.price || 0))), 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HÓA ĐƠN & THANH TOÁN */}
            {activeTab === 'invoice' && (
              <div className="space-y-8">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <h3 className="font-bold text-on-surface text-lg flex items-center gap-2">
                    <IoDocumentOutline size={22} className="text-primary" />
                    Bảng Kê Hóa Đơn & Tình Trạng Thanh Toán
                  </h3>
                  <div className="flex items-center gap-2">
                    {invoice && (
                      <button
                        type="button"
                        onClick={() => setPrintingInvoice(invoice)}
                        className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container border border-border-grey text-on-surface rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <IoPrintOutline size={15} /> In / Xem hóa đơn
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copySpecificTabLink('invoice', 'Hóa đơn & Thanh toán')}
                      className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <IoCopyOutline size={15} /> Sao chép link hóa đơn
                    </button>
                  </div>
                </div>

                {invoiceLoading ? (
                  <div className="py-12 text-center text-on-surface-variant">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Đang tải bảng kê hóa đơn...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Thẻ tóm tắt tài chính */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-surface-container-low p-4 rounded-xl border border-border-grey">
                        <div className="text-xs text-on-surface-variant font-medium">Tổng tiền dịch vụ & phòng</div>
                        <div className="text-xl font-bold text-on-surface mt-1">{fmtMoney(invoiceTotal)}</div>
                      </div>

                      <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                        <div className="text-xs text-emerald-800 font-medium">Đã thanh toán</div>
                        <div className="text-xl font-bold text-emerald-700 mt-1">{fmtMoney(totalPaid)}</div>
                      </div>

                      <div className={`p-4 rounded-xl border ${remainingDue > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                        <div className={`text-xs font-medium ${remainingDue > 0 ? 'text-amber-900' : 'text-green-800'}`}>
                          {remainingDue > 0 ? 'Số tiền còn lại cần trả' : 'Tình trạng thanh toán'}
                        </div>
                        <div className={`text-xl font-black mt-1 ${remainingDue > 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {remainingDue > 0 ? fmtMoney(remainingDue) : 'ĐÃ HOÀN TẤT'}
                        </div>
                      </div>
                    </div>

                    {/* Bảng chi tiết tính tiền */}
                    <div className="bg-surface-container-low p-5 rounded-xl border border-border-grey space-y-3">
                      <h4 className="font-bold text-on-surface text-sm border-b border-border-grey pb-2 flex items-center gap-1.5">
                        <IoReceiptOutline size={16} className="text-primary"/> Chi tiết các khoản thanh toán
                      </h4>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Tiền phòng ({calculateNights(booking.checkInDate, booking.checkOutDate)} đêm):</span>
                          <span className="font-semibold text-on-surface">{fmtMoney(invoice?.roomAmount || booking.actualPrice || booking.expectedPrice)}</span>
                        </div>
                        {invoice?.serviceAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Tiền dịch vụ phụ thu:</span>
                            <span className="font-semibold text-on-surface">{fmtMoney(invoice.serviceAmount)}</span>
                          </div>
                        )}
                        {invoice?.discountAmount > 0 && (
                          <div className="flex justify-between text-green-700 font-medium">
                            <span>Giảm giá / Ưu đãi:</span>
                            <span>- {fmtMoney(invoice.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-border-grey pt-2 text-base font-bold text-on-surface">
                          <span>Tổng cộng:</span>
                          <span className="text-primary font-black">{fmtMoney(invoiceTotal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* VietQR Chuyển khoản nếu còn nợ */}
                    {remainingDue > 0 && (
                      <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border border-blue-200 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-xs">
                        <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm shrink-0 text-center">
                          <img 
                            src={vietQrUrl} 
                            alt="VietQR Thanh toán" 
                            className="w-44 h-44 object-contain mx-auto"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="text-[11px] font-bold text-primary mt-1">Quét mã VietQR chuyển khoản</div>
                        </div>

                        <div className="space-y-2.5 flex-1 text-sm">
                          <div className="flex items-center gap-2">
                            <IoQrCodeOutline size={20} className="text-primary shrink-0" />
                            <h4 className="font-bold text-base text-on-surface">Thanh toán nhanh qua Ngân hàng</h4>
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            Quý khách hoặc bạn bè có thể mở ứng dụng Ngân hàng (Mobile Banking) quét mã QR bên cạnh để chuyển khoản với số tiền và nội dung đã được điền sẵn.
                          </p>
                          <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-1.5 text-xs font-mono">
                            <div className="flex justify-between"><span className="text-on-surface-variant">Ngân hàng:</span><span className="font-bold text-on-surface">{bankCode}</span></div>
                            <div className="flex justify-between"><span className="text-on-surface-variant">Số tài khoản:</span><span className="font-bold text-primary">{bankAccount}</span></div>
                            <div className="flex justify-between"><span className="text-on-surface-variant">Chủ tài khoản:</span><span className="font-bold text-on-surface">{accountName}</span></div>
                            <div className="flex justify-between"><span className="text-on-surface-variant">Số tiền:</span><span className="font-bold text-red-600">{fmtMoney(remainingDue)}</span></div>
                            <div className="flex justify-between"><span className="text-on-surface-variant">Nội dung CK:</span><span className="font-bold text-on-surface">{qrTransferContent}</span></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lịch sử các lần thanh toán */}
                    {payments.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                          <IoWalletOutline size={16} className="text-primary"/> Lịch sử thanh toán đã ghi nhận ({payments.length})
                        </h4>
                        <div className="divide-y divide-border-grey border border-border-grey rounded-xl overflow-hidden text-sm">
                          {payments.map((p, idx) => (
                            <div key={p.id || idx} className="p-3.5 bg-surface-container-lowest flex justify-between items-center hover:bg-surface-container-low/50">
                              <div>
                                <div className="font-semibold text-on-surface">
                                  {p.paymentMethod === 'CASH' ? 'Tiền mặt' : p.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : p.paymentMethod}
                                </div>
                                <div className="text-xs text-on-surface-variant mt-0.5">
                                  {p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '—'} {p.note ? `• ${p.note}` : ''}
                                </div>
                              </div>
                              <div className="font-bold text-emerald-700 text-base">
                                + {fmtMoney(p.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ĐẶT CỌC */}
            {activeTab === 'deposit' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-on-surface text-lg flex items-center gap-2">
                    <IoCashOutline size={22} className="text-primary" />
                    Thông Tin & Chính Sách Đặt Cọc
                  </h3>
                  <button
                    type="button"
                    onClick={() => copySpecificTabLink('deposit', 'Đặt cọc')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-border-grey text-on-surface flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    <IoCopyOutline size={14} className="text-primary" /> Sao chép link đặt cọc
                  </button>
                </div>

                {depositLoading ? (
                  <div className="py-12 text-center text-on-surface-variant">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Đang tải thông tin đặt cọc...
                  </div>
                ) : deposits.length === 0 ? (
                  <div className="bg-surface-container-low p-8 rounded-xl border border-border-grey text-center space-y-2">
                    <IoCashOutline size={40} className="text-on-surface-variant/40 mx-auto" />
                    <h4 className="font-semibold text-on-surface">Không có khoản đặt cọc nào</h4>
                    <p className="text-xs text-on-surface-variant">
                      Đơn đặt phòng này không yêu cầu đặt cọc trước hoặc thanh toán trực tiếp tại quầy.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {deposits.map((dep, idx) => (
                        <div key={dep.id || idx} className="bg-surface-container-low p-5 rounded-xl border border-border-grey space-y-3">
                          <div className="flex justify-between items-center border-b border-border-grey pb-2.5">
                            <span className="font-bold text-sm text-on-surface">Khoản cọc #{dep.id || (idx + 1)}</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              dep.status === 'COLLECTED' ? 'bg-blue-100 text-blue-800' :
                              dep.status === 'REFUNDED' ? 'bg-green-100 text-green-800' :
                              dep.status === 'FORFEITED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {dep.status === 'COLLECTED' ? 'Đã thu cọc' :
                               dep.status === 'REFUNDED' ? 'Đã hoàn cọc' :
                               dep.status === 'FORFEITED' ? 'Đã khấu trừ' : dep.status}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant">Tiền cọc yêu cầu:</span>
                              <span className="font-semibold text-on-surface">{fmtMoney(dep.requiredAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-on-surface-variant">Tiền cọc đã thu:</span>
                              <span className="font-bold text-primary">{fmtMoney(dep.collectedAmount)}</span>
                            </div>
                            {dep.refundedAmount > 0 && (
                              <div className="flex justify-between text-green-700">
                                <span>Tiền đã hoàn lại:</span>
                                <span className="font-bold">{fmtMoney(dep.refundedAmount)}</span>
                              </div>
                            )}
                            {dep.penaltyAmount > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>Phí phạt / Khấu trừ hủy:</span>
                                <span className="font-bold">{fmtMoney(dep.penaltyAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs text-on-surface-variant pt-2 border-t border-border-grey">
                              <span>Hình thức:</span>
                              <span>{dep.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50/60 p-5 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <IoInformationCircleOutline size={16} className="text-blue-700" />
                        Chính sách cọc & Hoàn hủy của khách sạn
                      </div>
                      <p className="leading-relaxed">
                        Khoản tiền đặt cọc được dùng để đảm bảo giữ phòng cho quý khách. Trường hợp hủy phòng đúng hạn theo chính sách miễn phí, tiền cọc sẽ được hoàn trả đầy đủ theo quy định của khách sạn.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Template In hóa đơn */}
      {printingInvoice && (
        <InvoicePrintTemplate 
          invoice={printingInvoice} 
          booking={booking} 
          onClose={() => setPrintingInvoice(null)} 
        />
      )}

      <Footer />
    </div>
  );
};

export default PublicBookingDetailPage;
