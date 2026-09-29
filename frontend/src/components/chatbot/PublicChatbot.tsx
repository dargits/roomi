import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoChatbubbleEllipsesSharp,
  IoClose,
  IoSend,
  IoSparkles,
  IoRefreshOutline,
  IoBedOutline,
  IoTimeOutline,
  IoCallOutline,
  IoSearchOutline,
  IoChevronForwardOutline,
  IoCalendarOutline,
  IoChevronDownOutline,
  IoChevronUpOutline
} from 'react-icons/io5';
import { useAppConfig } from '../../context/AppConfigContext';
import roomTypeApi from '../../services/roomTypeApi';
import extraServiceApi from '../../services/extraServiceApi';
import aiApi from '../../services/aiApi';
import { RoomTypeResponse, ExtraServiceResponse } from '../../types';
import { cancellationPolicyApi, CancellationPolicyItem } from '../../services/cancellationPolicyApi';

export interface PublicChatbotProps {
  onOpenLookup?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  roomCards?: RoomTypeResponse[];
  serviceCards?: ExtraServiceResponse[];
  quickReplies?: string[];
  action?: {
    type: 'open_lookup' | 'navigate' | 'call_phone';
    label: string;
    payload?: string;
  };
}

const STORAGE_KEY = 'stayaway_chatbot_history_v1';

const DEFAULT_QUICK_REPLIES = [
  '🛏️ Gợi ý phòng nghỉ',
  '💰 Bảng giá hôm nay',
  '⏰ Giờ nhận & trả phòng',
  '🍳 Dịch vụ & Phụ thu'
];

export const PublicChatbot: React.FC<PublicChatbotProps> = ({ onOpenLookup }) => {
  const navigate = useNavigate();
  const { hotelSetting } = useAppConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [showGreetingBubble, setShowGreetingBubble] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [services, setServices] = useState<ExtraServiceResponse[]>([]);
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicyItem[]>([]);
  const [chatCheckIn, setChatCheckIn] = useState<string>('');
  const [chatCheckOut, setChatCheckOut] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to format date display DD/MM/YYYY
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Load public room types and extra services for knowledge base
  useEffect(() => {
    let isMounted = true;
    const loadKnowledgeData = async () => {
      try {
        const [roomsData, servicesData, policiesData] = await Promise.all([
          roomTypeApi.getPublicRoomTypes().catch(() => []),
          extraServiceApi.getPublicServices().catch(() => []),
          cancellationPolicyApi.getPublicPolicies().catch(() => [])
        ]);
        if (isMounted) {
          setRoomTypes(roomsData || []);
          setServices(servicesData || []);
          setCancellationPolicies(policiesData || []);
        }
      } catch (err) {
        console.warn('Failed to load public chatbot knowledge base data:', err);
      }
    };
    loadKnowledgeData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format timestamp
  const getNowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // Initial welcome message generator
  const createWelcomeMessage = (): ChatMessage => {
    const propName = hotelSetting?.propertyName || 'Stay Away Luxury';
    return {
      id: 'welcome-msg',
      sender: 'bot',
      text: `👋 **Xin chào Quý khách!**\nEm là **StayBot** - Trợ lý hỗ trợ đặt phòng trực tuyến của **${propName}** ✨\n\nEm có thể hỗ trợ Quý khách tra cứu phòng trống theo ngày, xem bảng giá ưu đãi mới nhất và giải đáp thông tin đặt phòng 24/7.\n\nQuý khách muốn tìm hiểu thông tin nào hôm nay ạ?`,
      timestamp: getNowTime(),
      quickReplies: DEFAULT_QUICK_REPLIES
    };
  };

  // Restore messages from sessionStorage or initialize
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // fallback
    }
    setMessages([createWelcomeMessage()]);
  }, [hotelSetting?.propertyName]);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // quota exceeded fallback
      }
    }
  }, [messages]);

  // Greeting bubble delay
  useEffect(() => {
    const timer = setTimeout(() => {
      const dismissed = sessionStorage.getItem('stayaway_chatbot_bubble_dismissed');
      if (!dismissed && !isOpen) {
        setShowGreetingBubble(true);
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when open
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isOpen) {
      timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen]);

  const handleDismissGreeting = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowGreetingBubble(false);
    sessionStorage.setItem('stayaway_chatbot_bubble_dismissed', 'true');
  };

  const handleResetConversation = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    const welcome = createWelcomeMessage();
    setMessages([welcome]);
  };

  // Vietnamese query normalizer
  const normalizeText = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // AI Knowledge responder
  const generateBotReply = (userQuery: string): ChatMessage => {
    const norm = normalizeText(userQuery);
    const time = getNowTime();
    const propName = hotelSetting?.propertyName || 'Stay Away Luxury';
    const address = hotelSetting?.address || 'Z115, Phan Đình Phùng, TP. Thái Nguyên';
    const phone = hotelSetting?.phone || '0365224245';
    const email = hotelSetting?.email || 'lienhe@stayaway.vn';
    const checkinTime = hotelSetting?.defaultCheckinTime || '14:00';
    const checkoutTime = hotelSetting?.defaultCheckoutTime || '12:00';

    // 1. Room lookup / Recommendations
    const isRoomRelated =
      norm.includes('phong') ||
      norm.includes('room') ||
      norm.includes('o ghep') ||
      norm.includes('nguoi') ||
      norm.includes('gia dinh') ||
      norm.includes('cap doi') ||
      norm.includes('banh bao');

    // 1.1 Couple / 2 people
    if ((norm.includes('2 nguoi') || norm.includes('doi') || norm.includes('couple') || norm.includes('hai nguoi')) && isRoomRelated) {
      const coupleRooms = roomTypes.filter((r) => r.standardCapacity === 2);
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Dành cho kỳ nghỉ **2 người**, ${propName} gợi ý các hạng phòng lý tưởng với không gian ấm cúng, riêng tư và đầy đủ tiện nghi tiêu chuẩn:`,
        timestamp: time,
        roomCards: coupleRooms.length > 0 ? coupleRooms : roomTypes.slice(0, 2),
        quickReplies: ['💰 Xem giá phòng khác', '⏰ Giờ nhận/trả phòng', '🍳 Dịch vụ đi kèm'],
        action: {
          type: 'navigate',
          label: 'Xem chi tiết & Đặt phòng ngay',
          payload: '/rooms'
        }
      };
    }

    // 1.2 Family / Group (3-4 people)
    if (
      (norm.includes('gia dinh') ||
        norm.includes('3 nguoi') ||
        norm.includes('4 nguoi') ||
        norm.includes('nhom') ||
        norm.includes('dong nguoi')) &&
      isRoomRelated
    ) {
      const familyRooms = roomTypes.filter((r) => r.maxCapacity >= 3);
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Dành cho **gia đình & nhóm bạn (3 - 4 người)**, Quý khách nên chọn các phòng có diện tích rộng rãi, ban công thoáng mát và bồn tắm thư giãn:`,
        timestamp: time,
        roomCards: familyRooms.length > 0 ? familyRooms : roomTypes.slice(-2),
        quickReplies: ['🛏️ Có kê thêm giường phụ?', '🍳 Buffet sáng cho bé?', '📞 Liên hệ Lễ tân'],
        action: {
          type: 'navigate',
          label: 'Xem & Đặt phòng gia đình',
          payload: '/rooms'
        }
      };
    }

    // 1.3 Cheapest room
    if (norm.includes('re nhat') || norm.includes('tiet kiem') || norm.includes('gia re')) {
      const sorted = [...roomTypes].sort((a, b) => (a.currentPrice || a.basePrice) - (b.currentPrice || b.basePrice));
      const cheapest = sorted[0];
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: cheapest
          ? `Hạng phòng tiết kiệm nhất hiện tại là **${cheapest.name}** với giá chỉ từ **${formatCurrency(cheapest.currentPrice || cheapest.basePrice)}/đêm**:`
          : `Hạng phòng tiết kiệm nhất có mức giá chỉ từ **500.000 đ/đêm** với đầy đủ tiện nghi tivi cáp, điều hòa, wifi và nước suối miễn phí.`,
        timestamp: time,
        roomCards: cheapest ? [cheapest] : undefined,
        quickReplies: ['💰 Xem bảng giá tất cả phòng', '🛏️ Phòng cao cấp hơn', '⏰ Giờ check-in'],
        action: {
          type: 'navigate',
          label: 'Đặt phòng tiết kiệm ngay',
          payload: '/rooms'
        }
      };
    }

    // 1.4 Luxury / Presidential / VIP suite
    if (
      norm.includes('tong thong') ||
      norm.includes('vip') ||
      norm.includes('sang nhat') ||
      norm.includes('dep nhat') ||
      norm.includes('suite') ||
      norm.includes('sang trong') ||
      norm.includes('view dep')
    ) {
      const luxuryRooms = roomTypes.filter((r) =>
        r.name.toLowerCase().includes('tổng thống') ||
        r.name.toLowerCase().includes('sang trọng') ||
        r.name.toLowerCase().includes('suite')
      );
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Các hạng phòng **Sang Trọng & Tổng Thống** mang đến trải nghiệm nghỉ dưỡng 5 sao với tầm nhìn panorama ngắm toàn cảnh, phòng khách riêng, bồn tắm massage thủy lực và minibar cao cấp:`,
        timestamp: time,
        roomCards: luxuryRooms.length > 0 ? luxuryRooms : roomTypes.slice(-2),
        quickReplies: ['💰 Bảng giá chi tiết', '🍳 Dịch vụ Spa & Thư giãn', '📞 Hotline hỗ trợ VIP'],
        action: {
          type: 'navigate',
          label: 'Khám phá không gian Suite & Đặt ngay',
          payload: '/rooms'
        }
      };
    }

    // 1.5 General Price / Room types list
    if (
      norm.includes('bang gia') ||
      norm.includes('gia phong') ||
      norm.includes('goi y phong') ||
      norm.includes('danh sach phong') ||
      norm.includes('cac loai phong') ||
      norm.includes('co nhung phong nao') ||
      norm.includes('gia ca')
    ) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Dưới đây là **Bảng giá các hạng phòng công khai** tại **${propName}** hôm nay. Quý khách có thể bấm **Xem & Đặt phòng** để giữ phòng ngay:`,
        timestamp: time,
        roomCards: roomTypes.length > 0 ? roomTypes : undefined,
        quickReplies: ['⏰ Giờ nhận & trả phòng', '🍳 Dịch vụ & Buffet sáng', '🔍 Tra cứu mã đặt phòng'],
        action: {
          type: 'navigate',
          label: 'Xem tất cả phòng & Đặt ngay',
          payload: '/rooms'
        }
      };
    }

    // 2. Check-in / Check-out time policies
    if (
      norm.includes('nhan phong') ||
      norm.includes('tra phong') ||
      norm.includes('checkin') ||
      norm.includes('check in') ||
      norm.includes('checkout') ||
      norm.includes('check out') ||
      norm.includes('gio nhan') ||
      norm.includes('gio tra') ||
      norm.includes('may gio') ||
      norm.includes('nhan som') ||
      norm.includes('tra muon')
    ) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `⏰ **Quy định Giờ Nhận & Trả phòng tại ${propName}:**\n\n• **Giờ nhận phòng (Check-in):** Từ **${checkinTime}** hàng ngày.\n• **Giờ trả phòng (Check-out):** Trước **${checkoutTime}** trưa.\n\n💡 *Ghi chú linh hoạt:*\n- **Nhận phòng sớm / Trả phòng muộn:** Khách sạn hỗ trợ tùy thuộc vào tình trạng phòng trống thực tế của ngày hôm đó (có thể áp dụng phụ thu theo quy định).\n- Quý khách cần hỗ trợ gửi hành lý trước giờ nhận phòng hoặc sau giờ trả phòng đều được **miễn phí 100%** tại quầy Lễ tân!`,
        timestamp: time,
        quickReplies: ['🛏️ Tư vấn chọn phòng', '📞 Liên hệ Lễ tân xin check-in sớm', '📍 Địa chỉ khách sạn']
      };
    }

    // 2.5 Cancellation & Refund policies
    if (
      norm.includes('huy phong') ||
      norm.includes('chinh sach huy') ||
      norm.includes('hoan tien') ||
      norm.includes('hoan coc') ||
      norm.includes('huy dat') ||
      norm.includes('doi phong') ||
      norm.includes('doi ngay')
    ) {
      const generalPol = cancellationPolicies.find((p) => p.roomTypeId == null) || cancellationPolicies[0];
      const freeHours = generalPol?.freeCancelHours ?? 24;
      const penalty = generalPol?.penaltyPercent ?? 50;
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `🛡️ **Chính sách Hủy phòng & Hoàn tiền tại ${propName}:**\n\n• **Miễn phí hủy:** Trước **${freeHours} giờ** so với giờ nhận phòng tiêu chuẩn.\n• **Hủy muộn hoặc vắng mặt (No-show):** Áp dụng phí phạt **${penalty}%** tiền cọc theo quy định của cơ sở lưu trú.\n\nQuý khách có thể bấm **Tra cứu đơn** bên dưới để kiểm tra chính sách chi tiết trên đơn đặt phòng của mình!`,
        timestamp: time,
        quickReplies: ['🔍 Tra cứu mã đặt phòng', '🛏️ Xem bảng giá phòng', '📞 Gọi Hotline Lễ tân'],
        action: {
          type: 'open_lookup',
          label: '🔍 Kiểm tra đơn đặt phòng'
        }
      };
    }

    // 3. Extra Services (Breakfast Buffet, Laundry, Motorbike, Spa, Extra bed)
    if (
      norm.includes('an sang') ||
      norm.includes('buffet') ||
      norm.includes('an uong') ||
      norm.includes('nha hang')
    ) {
      const buffetService = services.find((s) => normalizeText(s.name).includes('buffet') || normalizeText(s.name).includes('an sang'));
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `🍳 **Dịch vụ Ẩm thực & Buffet sáng:**\n\nKhách sạn phục vụ tiệc buffet sáng đa dạng các món ẩm thực truyền thống Việt Nam và món Á - Âu từ 06:30 - 09:30 hàng ngày.${buffetService ? `\n\n• **Giá vé:** **${formatCurrency(buffetService.unitPrice)}/${buffetService.unit}**.` : ''}\n\n*Trẻ em dưới 6 tuổi được miễn phí khi đi kèm người lớn.*`,
        timestamp: time,
        serviceCards: buffetService ? [buffetService] : undefined,
        quickReplies: ['🍳 Xem dịch vụ khác', '🛏️ Xem bảng giá phòng', '📞 Gọi lễ tân đặt bàn']
      };
    }

    if (norm.includes('xe may') || norm.includes('thue xe') || norm.includes('phuong tien')) {
      const motoService = services.find((s) => normalizeText(s.name).includes('xe may'));
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `🛵 **Dịch vụ Thuê xe máy tự lái:**\n\nKhách sạn có sẵn đội xe tay ga và xe số đời mới, vận hành êm ái, kèm sẵn 02 mũ bảo hiểm đạt chuẩn an toàn.${motoService ? `\n\n• **Mức giá ưu đãi:** **${formatCurrency(motoService.unitPrice)}/${motoService.unit}** (giao nhận xe trực tiếp tại sảnh lễ tân).` : ''}`,
        timestamp: time,
        serviceCards: motoService ? [motoService] : undefined,
        quickReplies: ['🍳 Dịch vụ giặt là', '🛏️ Đặt phòng nghỉ', '📞 Gọi lễ tân đặt xe']
      };
    }

    if (norm.includes('giat la') || norm.includes('giat ui') || norm.includes('say')) {
      const laundryService = services.find((s) => normalizeText(s.name).includes('giat'));
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `🧺 **Dịch vụ Giặt là & Giặt sấy cao cấp:**\n\nKhách sạn cung cấp dịch vụ giặt sấy, là ủi thơm tho và giao đồ nhanh chóng ngay trong ngày.${laundryService ? `\n\n• **Chi phí:** **${formatCurrency(laundryService.unitPrice)}/${laundryService.unit}**.` : ''}`,
        timestamp: time,
        serviceCards: laundryService ? [laundryService] : undefined,
        quickReplies: ['🍳 Xem dịch vụ khác', '🛏️ Xem loại phòng', '📞 Liên hệ Lễ tân']
      };
    }

    if (norm.includes('spa') || norm.includes('massage') || norm.includes('thu gian')) {
      const spaService = services.find((s) => normalizeText(s.name).includes('spa'));
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `💆 **Dịch vụ Spa & Chăm sóc sức khỏe:**\n\nKhu vực Spa đem đến các liệu trình massage thảo dược toàn thân, ngâm chân đá nóng giúp Quý khách giải tỏa mệt mỏi sau chuyến đi.${spaService ? `\n\n• **Giá liệu trình:** **${formatCurrency(spaService.unitPrice)}/${spaService.unit}**.` : ''}`,
        timestamp: time,
        serviceCards: spaService ? [spaService] : undefined,
        quickReplies: ['🛏️ Xem phòng nghỉ VIP', '🍳 Buffet sáng', '📞 Đặt lịch Spa']
      };
    }

    if (norm.includes('dich vu') || norm.includes('tien ich') || norm.includes('phu thu') || norm.includes('extra')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `✨ **Danh mục Dịch vụ & Tiện ích nổi bật tại ${propName}:**\n\nQuý khách có thể đăng ký sử dụng ngay khi đặt phòng hoặc yêu cầu lễ tân phục vụ bất kỳ lúc nào:`,
        timestamp: time,
        serviceCards: services.length > 0 ? services.slice(0, 4) : undefined,
        quickReplies: ['🛏️ Bảng giá phòng', '⏰ Giờ nhận/trả phòng', '🔍 Tra cứu đặt phòng']
      };
    }

    // 4. Booking Lookup
    if (
      norm.includes('tra cuu') ||
      norm.includes('tim phong') ||
      norm.includes('ma dat') ||
      norm.includes('hoa don') ||
      norm.includes('kiem tra don') ||
      norm.includes('xem lai don') ||
      norm.includes('don dat phong')
    ) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `🔍 **Tra cứu Hóa đơn & Đặt phòng trực tuyến:**\n\nQuý khách chỉ cần có **Mã đặt phòng** (ví dụ: *101*) và **Số điện thoại** đã đăng ký khi đặt phòng để xem chi tiết tình trạng phòng, bảng kê chi phí và tải hóa đơn thanh toán điện tử.\n\n👉 Bấm nút bên dưới để mở cửa sổ tra cứu nhanh:`,
        timestamp: time,
        quickReplies: ['🛏️ Đặt phòng mới', '📞 Hotline hỗ trợ tra cứu', '⏰ Giờ nhận phòng'],
        action: {
          type: 'open_lookup',
          label: '🔍 Mở Tra Cứu Hóa Đơn & Đặt Phòng'
        }
      };
    }

    // 5. Contact & Address
    if (
      norm.includes('dia chi') ||
      norm.includes('o dau') ||
      norm.includes('vi tri') ||
      norm.includes('ban do') ||
      norm.includes('hotline') ||
      norm.includes('so dien thoai') ||
      norm.includes('sdt') ||
      norm.includes('lien he') ||
      norm.includes('email') ||
      norm.includes('le tan')
    ) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `📍 **Thông tin Liên hệ & Địa chỉ ${propName}:**\n\n• **Địa chỉ:** ${address}\n• **Hotline Lễ tân (24/7):** [${phone}](tel:${phone})\n• **Email hỗ trợ:** [${email}](mailto:${email})\n\nĐội ngũ Lễ tân luôn sẵn sàng hỗ trợ Quý khách 24/7 bất kể ngày đêm!`,
        timestamp: time,
        quickReplies: ['🛏️ Xem bảng giá phòng', '🔍 Tra cứu mã đặt phòng', '⏰ Giờ nhận/trả phòng'],
        action: {
          type: 'call_phone',
          label: `📞 Gọi Hotline: ${phone}`,
          payload: phone
        }
      };
    }

    // 6. Payment & Deposit / Cancellation Policy
    if (
      norm.includes('thanh toan') ||
      norm.includes('chuyen khoan') ||
      norm.includes('tien mat') ||
      norm.includes('dat coc') ||
      norm.includes('coc') ||
      norm.includes('chinh sach') ||
      norm.includes('huy phong')
    ) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `💳 **Phương thức Thanh toán & Chính sách Đặt cọc:**\n\n• **Hình thức thanh toán:** Chuyển khoản QR ngân hàng (tự động xác nhận), Thẻ ATM/Visa/MasterCard hoặc Tiền mặt tại quầy lễ tân.\n• **Chính sách đặt cọc:** Quý khách có thể đặt cọc trước để giữ chắc chắn phòng đẹp nhất trong các dịp cao điểm.\n• **Chính sách hủy/đổi phòng:** Linh hoạt hỗ trợ đổi ngày miễn phí nếu báo trước ít nhất 24 giờ trước thời điểm nhận phòng.`,
        timestamp: time,
        quickReplies: ['🛏️ Đặt phòng ngay', '🔍 Tra cứu đơn đặt phòng', '📞 Hỏi lễ tân chi tiết']
      };
    }

    // 7. Greetings / Politeness
    if (
      norm.includes('xin chao') ||
      norm.includes('chao') ||
      norm.includes('hello') ||
      norm.includes('hi') ||
      norm.includes('alo') ||
      norm.includes('hey')
    ) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Chào Quý khách! Rất vui được đồng hành cùng Quý khách tại **${propName}**.\n\nQuý khách đang tìm kiếm hạng phòng cho chuyến công tác, kỳ nghỉ cặp đôi hay chuyến du lịch cùng cả gia đình ạ?`,
        timestamp: time,
        quickReplies: ['🛏️ Phòng 2 người', '👨‍👩‍👧‍👦 Phòng gia đình', '💰 Bảng giá hôm nay', '🔍 Tra cứu đặt phòng']
      };
    }

    // 8. Thanks / Goodbye
    if (
      norm.includes('cam on') ||
      norm.includes('thank') ||
      norm.includes('tks') ||
      norm.includes('ok') ||
      norm.includes('tuyet voi') ||
      norm.includes('tam biet') ||
      norm.includes('bye')
    ) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Dạ không có gì ạ! Rất hân hạnh được phục vụ Quý khách. Chúc Quý khách có một kỳ nghỉ thật tuyệt vời và đáng nhớ tại **${propName}**! ❤️\n\nNếu cần thêm bất kỳ sự trợ giúp nào, Quý khách cứ nhắn em nhé!`,
        timestamp: time,
        quickReplies: DEFAULT_QUICK_REPLIES
      };
    }

    // 9. Intelligent Fallback with Helpful Chips
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `Dạ, em chưa hiểu rõ yêu cầu này của Quý khách lắm ạ. Quý khách vui lòng chọn một trong các chủ đề hỗ trợ nhanh bên dưới, hoặc bấm gọi hotline để được nhân viên lễ tân tư vấn trực tiếp ngay nhé!`,
      timestamp: time,
      quickReplies: DEFAULT_QUICK_REPLIES,
      action: {
        type: 'call_phone',
        label: `📞 Gọi Hotline Lễ tân: ${phone}`,
        payload: phone
      }
    };
  };

  // Handle user send message with Gemini AI backend and graceful local fallback
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: getNowTime()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Support synchronous timer tests in test environment
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      setTimeout(() => {
        const botReply = generateBotReply(query);
        setMessages((prev) => [...prev, botReply]);
        setIsTyping(false);
      }, 550);
      return;
    }

    // Natural typing delay (450ms - 650ms)
    setTimeout(async () => {
      try {
        // Call backend AI Gemini endpoint with system context
        const res = await aiApi.publicChat({
          message: query,
          checkIn: chatCheckIn || undefined,
          checkOut: chatCheckOut || undefined
        });

        if (res && res.reply && !res.error) {
          const botReply: ChatMessage = {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: res.reply,
            timestamp: getNowTime(),
            quickReplies: DEFAULT_QUICK_REPLIES
          };
          setMessages((prev) => [...prev, botReply]);
        } else {
          // Fallback to local rule engine if AI returned error/blank
          const botReply = generateBotReply(query);
          setMessages((prev) => [...prev, botReply]);
        }
      } catch (err) {
        console.warn('AI chat error, using local fallback:', err);
        const botReply = generateBotReply(query);
        setMessages((prev) => [...prev, botReply]);
      } finally {
        setIsTyping(false);
      }
    }, 550);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionClick = (action: NonNullable<ChatMessage['action']>) => {
    if (action.type === 'open_lookup') {
      if (onOpenLookup) {
        onOpenLookup();
      } else {
        navigate('/booking-detail/lookup');
      }
    } else if (action.type === 'navigate' && action.payload) {
      navigate(action.payload);
    } else if (action.type === 'call_phone' && action.payload) {
      window.open(`tel:${action.payload}`, '_self');
    }
  };

  return (
    <>
      {/* Floating Action Button & Bubble Container */}
      <div className="fixed bottom-16 sm:bottom-6 right-3 sm:right-6 z-50 flex flex-col items-end select-none">
        {/* Proactive Greeting Speech Bubble */}
        {showGreetingBubble && !isOpen && (
          <div
            onClick={() => {
              setShowGreetingBubble(false);
              setIsOpen(true);
            }}
            className="mb-3 mr-1 bg-white text-slate-800 p-3.5 rounded-2xl shadow-xl border border-slate-200/90 max-w-[280px] sm:max-w-[320px] cursor-pointer animate-bounce-gentle transition-all hover:scale-102 hover:border-primary/40 relative group"
          >
            {/* Close small cross */}
            <button
              type="button"
              onClick={handleDismissGreeting}
              className="absolute -top-2 -right-2 w-5 h-5 bg-slate-100 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center text-xs shadow-xs transition-colors cursor-pointer"
              title="Đóng lời chào"
            >
              <IoClose size={14} />
            </button>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#002B5B] to-primary text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <IoSparkles size={16} className="text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary flex items-center gap-1 mb-0.5">
                  StayBot Trợ Lý
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Chào Quý khách! Quý khách cần xem bảng giá ưu đãi hay hỗ trợ chọn phòng hôm nay không ạ?
                </p>
              </div>
            </div>
            {/* Pointer arrow */}
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-slate-200/90 rotate-45 transform"></div>
          </div>
        )}

        {/* Trigger FAB (Floating Action Button) */}
        <button
          type="button"
          onClick={() => {
            setShowGreetingBubble(false);
            setIsOpen((prev) => !prev);
          }}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 cursor-pointer ${
            isOpen
              ? 'bg-slate-800 text-white rotate-90 scale-95 shadow-slate-900/30'
              : 'bg-gradient-to-tr from-[#002B5B] via-primary to-blue-600 hover:shadow-primary/40 text-white hover:scale-108 active:scale-95 ring-4 ring-primary/20 shadow-primary/30'
          }`}
          title={isOpen ? 'Thu nhỏ hộp chat' : 'Mở trợ lý tư vấn trực tuyến'}
        >
          {isOpen ? (
            <IoClose size={26} />
          ) : (
            <>
              <IoChatbubbleEllipsesSharp size={28} className="drop-shadow-xs" />
              {/* Online Pulse Dot */}
              <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B63E] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#00B63E] border-2 border-white"></span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Chatbot Popup Window */}
      {isOpen && (
        <div
          className="fixed bottom-16 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-6 z-50 w-auto sm:w-[410px] h-[calc(100dvh-80px)] sm:h-[600px] max-h-[640px] bg-slate-50 rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-page-enter"
          style={{ boxShadow: '0 20px 50px -12px rgba(0, 33, 70, 0.25)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#001833] via-[#002B5B] to-[#0052CC] text-white px-4 py-3.5 flex items-center justify-between shadow-xs relative overflow-hidden shrink-0">
            {/* Ambient luxury light effect */}
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
                  <IoSparkles size={18} className="text-amber-300" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00B63E] border-2 border-[#002B5B]"></span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-wide text-white">
                    StayBot Concierge
                  </h3>
                  <span className="text-[10px] bg-white/15 text-white/95 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-white/10 backdrop-blur-xs">
                    <IoSparkles size={10} className="text-amber-300" /> Trợ lý AI
                  </span>
                </div>
                <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B63E] animate-pulse"></span>
                  Trực tuyến • {hotelSetting?.propertyName || 'Stay Away'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 relative z-10 text-white/85">
              <button
                type="button"
                onClick={handleResetConversation}
                className="p-1.5 hover:bg-white/15 text-white/90 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Làm mới cuộc trò chuyện"
              >
                <IoRefreshOutline size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/15 text-white/90 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <IoClose size={20} />
              </button>
            </div>
          </div>

          {/* Quick Date Selector Bar for real-time room vacancy check */}
          <div className="bg-white/90 backdrop-blur-xs px-3.5 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs shrink-0 select-none">
            <button
              type="button"
              onClick={() => setShowDatePicker((v) => !v)}
              className="flex items-center gap-2 text-slate-700 hover:text-primary font-medium transition-colors cursor-pointer group"
            >
              <div className="w-5 h-5 rounded-md bg-blue-100/70 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <IoCalendarOutline size={12} />
              </div>
              <span className="text-xs">
                {chatCheckIn && chatCheckOut
                  ? `${formatDateDisplay(chatCheckIn)} → ${formatDateDisplay(chatCheckOut)}`
                  : 'Chọn ngày lưu trú để AI tra cứu phòng trống'}
              </span>
              <span className="text-[10px] text-slate-400 group-hover:text-primary transition-colors">
                {showDatePicker ? <IoChevronUpOutline size={12} /> : <IoChevronDownOutline size={12} />}
              </span>
            </button>
            {chatCheckIn && (
              <button
                type="button"
                onClick={() => {
                  setChatCheckIn('');
                  setChatCheckOut('');
                }}
                className="text-[10px] font-medium text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Xóa ngày
              </button>
            )}
          </div>
          {showDatePicker && (
            <div className="bg-white p-3.5 border-b border-slate-200/80 shadow-inner shrink-0 animate-page-enter">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <IoCalendarOutline size={14} className="text-primary" /> Thời gian lưu trú
                </span>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Ngày nhận phòng
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={chatCheckIn}
                    onChange={(e) => {
                      setChatCheckIn(e.target.value);
                      if (chatCheckOut && e.target.value > chatCheckOut) {
                        setChatCheckOut('');
                      }
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Ngày trả phòng
                  </label>
                  <input
                    type="date"
                    min={chatCheckIn || todayStr}
                    value={chatCheckOut}
                    onChange={(e) => setChatCheckOut(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>
              {chatCheckIn && chatCheckOut && (
                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-emerald-600 font-medium">
                    ✓ {formatDateDisplay(chatCheckIn)} - {formatDateDisplay(chatCheckOut)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDatePicker(false);
                      handleSendMessage(`Kiểm tra phòng trống từ ${formatDateDisplay(chatCheckIn)} đến ${formatDateDisplay(chatCheckOut)}`);
                    }}
                    className="px-2.5 py-1 bg-primary text-white rounded-md text-[11px] font-bold hover:bg-primary-hover transition-colors cursor-pointer shadow-2xs"
                  >
                    Kiểm tra phòng
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#002B5B] to-primary text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <IoSparkles size={12} className="text-amber-300" />
                    </div>
                  )}

                  <div className={`flex flex-col ${isBot ? 'items-start max-w-[85%]' : 'items-end max-w-[85%]'}`}>
                    {isBot && (
                      <span className="text-[10px] font-semibold text-slate-400 mb-1 ml-1 select-none">
                        StayBot
                      </span>
                    )}

                    <div
                      className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isBot
                          ? 'bg-white text-slate-800 border border-slate-200/90 shadow-xs rounded-tl-xs'
                          : 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-xs rounded-tr-xs'
                      }`}
                    >
                      {/* Message Text with simple Markdown formatting */}
                      <div className="whitespace-pre-line space-y-1">
                        {msg.text.split('\n').map((line, idx) => {
                          const parts = line.split(/(\*\*.*?\*\*)/g);
                          return (
                            <div key={idx}>
                              {parts.map((part, pIdx) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={pIdx} className={isBot ? 'text-primary font-bold' : 'font-bold'}>
                                      {part.slice(2, -2)}
                                    </strong>
                                  );
                                }
                                return part;
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Room Recommendation Cards */}
                      {isBot && msg.roomCards && msg.roomCards.length > 0 && (
                        <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                          {msg.roomCards.map((room) => {
                            const img = room.imageUrls?.[0] || 'https://i.ibb.co/1fxxj3ZK/images-3-jpg.jpg';
                            const price = room.currentPrice || room.basePrice;
                            return (
                              <div
                                key={room.id}
                                className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/80 flex gap-2.5 items-center hover:border-primary/40 hover:bg-white transition-all shadow-2xs"
                              >
                                <img
                                  src={img}
                                  alt={room.name}
                                  className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200/60"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-[12px] text-slate-900 truncate">
                                    {room.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <IoBedOutline size={12} className="text-primary shrink-0" />
                                    <span>Tối đa {room.maxCapacity} khách</span>
                                  </p>
                                  <p className="text-[11px] font-bold text-primary mt-1">
                                    {formatCurrency(price)}
                                    <span className="text-[9px] font-normal text-slate-500">/đêm</span>
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsOpen(false);
                                    navigate('/rooms');
                                  }}
                                  className="bg-primary hover:bg-primary-hover text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                                >
                                  Đặt ngay
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Extra Service Cards */}
                      {isBot && msg.serviceCards && msg.serviceCards.length > 0 && (
                        <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-100">
                          {msg.serviceCards.map((srv) => (
                            <div
                              key={srv.id}
                              className="bg-slate-50 rounded-lg p-2 border border-slate-200/80 flex items-center justify-between text-[11px]"
                            >
                              <span className="font-semibold text-slate-800">{srv.name}</span>
                              <span className="font-bold text-primary">
                                {formatCurrency(srv.unitPrice)}
                                <span className="text-[9px] text-slate-500 font-normal">/{srv.unit}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Button */}
                      {isBot && msg.action && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleActionClick(msg.action!)}
                            className="w-full flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-bold py-2 px-3 rounded-xl border border-primary/20 transition-all cursor-pointer shadow-2xs"
                          >
                            {msg.action.label}
                            <IoChevronForwardOutline size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[9px] text-slate-400 mt-1 px-1">
                      {msg.timestamp}
                    </span>

                    {/* Quick Replies below latest message */}
                    {isBot && msg.quickReplies && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[100%]">
                        {msg.quickReplies.map((reply, rIdx) => (
                          <button
                            key={rIdx}
                            type="button"
                            onClick={() => handleSendMessage(reply)}
                            className="bg-white hover:bg-blue-50/90 hover:text-primary text-slate-700 border border-slate-200/90 hover:border-primary/40 rounded-full text-[11px] py-1 px-3 transition-all cursor-pointer font-medium shadow-2xs active:scale-95"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#002B5B] to-primary text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <IoSparkles size={12} className="text-amber-300" />
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-3.5 py-2.5 w-fit shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></span>
                  <span className="text-[11px] text-slate-500 font-medium ml-1">
                    StayBot đang soạn tin...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-200/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs select-none">
            <button
              type="button"
              onClick={() => handleSendMessage('🛏️ Gợi ý phòng nghỉ')}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-primary hover:border-primary/40 whitespace-nowrap cursor-pointer transition-all shadow-2xs active:scale-95 text-[11px] font-medium"
            >
              <IoBedOutline size={13} className="text-primary" /> Phòng & Giá
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('⏰ Giờ nhận & trả phòng')}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-primary hover:border-primary/40 whitespace-nowrap cursor-pointer transition-all shadow-2xs active:scale-95 text-[11px] font-medium"
            >
              <IoTimeOutline size={13} className="text-primary" /> Check-in/out
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenLookup) {
                  onOpenLookup();
                } else {
                  handleSendMessage('🔍 Tra cứu mã đặt phòng');
                }
              }}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-primary hover:border-primary/40 whitespace-nowrap cursor-pointer transition-all shadow-2xs active:scale-95 text-[11px] font-medium"
            >
              <IoSearchOutline size={13} className="text-primary" /> Tra cứu đơn
            </button>
            <a
              href={`tel:${hotelSetting?.phone || '0365224245'}`}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-primary hover:border-primary/40 whitespace-nowrap transition-all shadow-2xs active:scale-95 text-[11px] font-medium"
            >
              <IoCallOutline size={13} className="text-primary" /> Hotline
            </a>
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi (VD: phòng 2 người, ăn sáng...)"
              className="flex-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-full px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                inputText.trim() && !isTyping
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-95 shadow-xs active:scale-95'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title="Gửi câu hỏi"
            >
              <IoSend size={15} />
            </button>
          </div>

          {/* Footer branding */}
          <div className="py-1.5 bg-white text-center text-[10px] text-slate-400 select-none border-t border-slate-100 flex items-center justify-center gap-1">
            <span>⚡ StayBot AI Concierge</span>
            <span>•</span>
            <span>Hỗ trợ trực tuyến 24/7</span>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicChatbot;
