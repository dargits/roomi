package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.BackupHistoryDto;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.BackupService;
import plant.stay.service.OperationalDataSeederService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OperationalDataSeederServiceImpl implements OperationalDataSeederService {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final GuestRepository guestRepository;
    private final IdentityDocumentRepository identityDocumentRepository;
    private final LoyaltyTierRepository loyaltyTierRepository;
    private final CorporateClientRepository corporateClientRepository;
    private final NegotiatedPriceAgreementRepository negotiatedPriceAgreementRepository;
    private final BookingRepository bookingRepository;
    private final BookingServiceUsageRepository bookingServiceUsageRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceDiscountRepository invoiceDiscountRepository;
    private final PaymentRepository paymentRepository;
    private final DepositRepository depositRepository;
    private final DailyLedgerRepository dailyLedgerRepository;
    private final CashierShiftRepository cashierShiftRepository;
    private final CashierShiftClosingRepository cashierShiftClosingRepository;
    private final RoomCleaningRecordRepository roomCleaningRecordRepository;
    private final RoomIncidentRepository roomIncidentRepository;
    private final LostItemRepository lostItemRepository;
    private final LostItemLogRepository lostItemLogRepository;
    private final StayDeclarationRepository stayDeclarationRepository;
    private final RoomStayGuestRepository roomStayGuestRepository;
    private final BookingConfirmationLogRepository bookingConfirmationLogRepository;
    private final DebtApprovalRepository debtApprovalRepository;
    private final DebtCollectionLogRepository debtCollectionLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;
    private final BackupService backupService;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Override
    @Transactional
    public Map<String, Object> reseedOperationalData(User actor) {
        log.info("========== BẮT ĐẦU TÁI TẠO BỘ DỮ LIỆU MẪU VẬN HÀNH (01/01/2026 -> NAY) ==========");

        // 1. Xác định nhân viên thực hiện
        List<User> users = userRepository.findAll();
        User adminUser = actor != null ? actor : users.stream().filter(u -> u.getRole() == Role.ADMIN).findFirst().orElse(null);
        User ownerUser = users.stream().filter(u -> u.getRole() == Role.OWNER).findFirst().orElse(adminUser);
        User letan1 = users.stream().filter(u -> "letan".equals(u.getAccount())).findFirst().orElse(adminUser);
        User letan2 = users.stream().filter(u -> "letan2".equals(u.getAccount())).findFirst().orElse(letan1);
        User buongphong1 = users.stream().filter(u -> "buongphong".equals(u.getAccount())).findFirst().orElse(adminUser);
        User buongphong2 = users.stream().filter(u -> "buongphong2".equals(u.getAccount())).findFirst().orElse(buongphong1);

        // 2. Dọn sạch dữ liệu vận hành cũ với khóa ngoại an toàn
        log.info("Đang làm sạch các bảng dữ liệu vận hành cũ...");
        entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();
        String[] tablesToTruncate = {
                "room_cleaning_records", "payments", "invoice_discounts", "debt_collection_logs",
                "debt_approval_requests", "invoices", "booking_service_usages", "deposits",
                "stay_declarations", "lost_item_logs", "lost_items", "room_incidents",
                "booking_staying_guests", "room_stay_guests", "booking_confirmation_logs",
                "channel_room_blocks", "bookings", "cashier_shift_closings", "cashier_shifts",
                "daily_ledgers", "notifications", "identity_documents", "audit_logs"
        };
        for (String table : tablesToTruncate) {
            try {
                entityManager.createNativeQuery("TRUNCATE TABLE " + table).executeUpdate();
            } catch (Exception e) {
                log.warn("Không thể truncate bảng {}: {}", table, e.getMessage());
            }
        }
        entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();

        // 3. Chuẩn hóa Khách hàng & tạo Giấy tờ tùy thân (CCCD 2 mặt đầy đủ)
        List<Guest> guests = guestRepository.findAll();
        List<IdentityDocument> allDocs = new ArrayList<>();
        for (Guest g : guests) {
            allDocs.add(IdentityDocument.builder()
                    .guest(g)
                    .documentType(IdentityDocumentType.NATIONAL_ID_FRONT)
                    .documentNumber(g.getIdNumber())
                    .imageUrl("https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600")
                    .verified(true)
                    .build());
            allDocs.add(IdentityDocument.builder()
                    .guest(g)
                    .documentType(IdentityDocumentType.NATIONAL_ID_BACK)
                    .documentNumber(g.getIdNumber())
                    .imageUrl("https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600")
                    .verified(true)
                    .build());
        }
        identityDocumentRepository.saveAll(allDocs);
        log.info("Đã cập nhật giấy tờ tùy thân CCCD (mặt trước & mặt sau) cho {} khách hàng.", guests.size());

        // 4. Lấy danh mục phòng, dịch vụ, hợp đồng doanh nghiệp
        List<Room> allRooms = roomRepository.findAll();
        allRooms.sort(Comparator.comparing(Room::getRoomNumber));
        List<ExtraService> extraServices = extraServiceRepository.findAll();
        List<NegotiatedPriceAgreement> agreements = negotiatedPriceAgreementRepository.findAll();

        LocalDate today = LocalDate.now();
        LocalDate startDate = LocalDate.of(2026, 1, 2);

        List<Booking> bookingsToSave = new ArrayList<>();
        List<RoomStayGuest> roomStayGuestsToSave = new ArrayList<>();
        List<BookingConfirmationLog> confirmationLogsToSave = new ArrayList<>();
        List<BookingServiceUsage> usagesToSave = new ArrayList<>();
        List<Invoice> invoicesToSave = new ArrayList<>();
        List<InvoiceDiscount> invoiceDiscountsToSave = new ArrayList<>();
        List<Payment> paymentsToSave = new ArrayList<>();
        List<Deposit> depositsToSave = new ArrayList<>();
        List<StayDeclaration> declarationsToSave = new ArrayList<>();
        List<RoomCleaningRecord> cleaningsToSave = new ArrayList<>();

        String[] sources = {"WALKIN", "ONLINE", "BOOKING_COM", "AGODA", "TRAVELOKA", "AIRBNB"};
        int guestIndex = 0;
        int agreementIndex = 0;

        // Phòng đang ở hôm nay: 101, 102, 201, 203, 301
        Set<String> inHouseRoomNumbers = Set.of("101", "102", "201", "203", "301");
        // Phòng sắp nhận hôm nay/ngày mai: 104, 204, 302, 401
        Set<String> upcomingRoomNumbers = Set.of("104", "204", "302", "401");

        // Map lưu booking gần nhất của mỗi phòng để gắn với lost item
        Map<String, Booking> lastCheckoutBookingByRoom = new HashMap<>();

        // 5. Sinh chuỗi lịch sử lưu trú liền mạch, thực tế cho từng phòng từ tháng 1 đến 27/09/2026
        for (int rIdx = 0; rIdx < allRooms.size(); rIdx++) {
            Room room = allRooms.get(rIdx);
            RoomType roomType = room.getRoomType();
            String rNum = room.getRoomNumber();

            LocalDate currDate = startDate.plusDays(rIdx % 4);

            while (currDate.isBefore(today.minusDays(2))) {
                int stayDays = 1 + ((rIdx + currDate.getDayOfMonth()) % 3); // 1, 2, hoặc 3 đêm
                LocalDate checkIn = currDate;
                LocalDate checkOut = currDate.plusDays(stayDays);

                if (checkOut.isAfter(today.minusDays(1))) {
                    break;
                }

                Guest guest = guests.get(guestIndex % guests.size());
                guestIndex++;

                // Khách ở cùng phòng nếu phòng đôi/suite
                Guest coGuest = (roomType.getStandardCapacity() != null && roomType.getStandardCapacity() > 1 && guests.size() > 1)
                        ? guests.get((guestIndex + 5) % guests.size()) : null;

                String source = sources[(rIdx + currDate.getMonthValue()) % sources.length];
                boolean isCorporate = (guestIndex % 7 == 0) && !agreements.isEmpty();
                NegotiatedPriceAgreement agreement = isCorporate ? agreements.get(agreementIndex++ % agreements.size()) : null;

                BigDecimal nightPrice = isCorporate ? agreement.getPricePerNight() : roomType.getBasePrice();
                // Phụ thu cuối tuần nếu rơi vào thứ 6 / thứ 7 (+15%)
                if (checkIn.getDayOfWeek() == DayOfWeek.FRIDAY || checkIn.getDayOfWeek() == DayOfWeek.SATURDAY) {
                    nightPrice = nightPrice.multiply(new BigDecimal("1.15")).setScale(0, RoundingMode.HALF_UP);
                }
                BigDecimal roomAmount = nightPrice.multiply(BigDecimal.valueOf(stayDays));

                // Giờ nhận phòng thực tế (13:30 - 15:30)
                LocalDateTime checkedInAt = checkIn.atTime(13, 30).plusMinutes((rIdx * 19 + currDate.getDayOfMonth() * 7) % 120);
                // Giờ trả phòng thực tế (10:30 - 12:00)
                LocalDateTime checkedOutAt = checkOut.atTime(10, 30).plusMinutes((rIdx * 23 + currDate.getDayOfMonth() * 11) % 90);

                // Tỷ lệ hủy hợp lý ~3% (phát sinh phí hủy 30%)
                boolean isCancelled = (rIdx % 5 == 0 && currDate.getDayOfMonth() == 13);

                List<Guest> stayingGuestList = new ArrayList<>();
                stayingGuestList.add(guest);
                if (coGuest != null) {
                    stayingGuestList.add(coGuest);
                }

                Booking booking = Booking.builder()
                        .guest(guest)
                        .room(room)
                        .roomType(roomType)
                        .stayingGuests(stayingGuestList)
                        .checkInDate(checkIn)
                        .checkOutDate(checkOut)
                        .checkedInAt(isCancelled ? null : checkedInAt)
                        .checkedOutAt(isCancelled ? null : checkedOutAt)
                        .status(isCancelled ? BookingStatus.CANCELLED : BookingStatus.CHECKED_OUT)
                        .expectedPrice(roomAmount)
                        .actualPrice(isCancelled ? BigDecimal.ZERO : roomAmount)
                        .cancellationFee(isCancelled ? roomAmount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO)
                        .cancellationReason(isCancelled ? "Khách báo hoãn chuyến công tác do lịch trình thay đổi" : null)
                        .cancelledAt(isCancelled ? checkIn.minusDays(1).atTime(14, 0) : null)
                        .source(source)
                        .appliedAgreement(agreement)
                        .priceSource(isCorporate ? "NEGOTIATED" : "STANDARD")
                        .createdBy(letan1)
                        .note(isCancelled ? "Đã ghi nhận phí hủy phòng theo chính sách" : "Khách lưu trú hài lòng, dịch vụ chu đáo")
                        .build();

                bookingsToSave.add(booking);

                // Bản ghi khách ở thực tế trong phòng (RoomStayGuest)
                if (!isCancelled) {
                    roomStayGuestsToSave.add(RoomStayGuest.builder()
                            .booking(booking)
                            .fullName(guest.getName())
                            .birthYear(1985 + (rIdx % 15))
                            .documentType("CCCD")
                            .documentNumber(guest.getIdNumber())
                            .isChild(false)
                            .isPrimaryGuest(true)
                            .checkInAt(checkedInAt)
                            .isExported(true)
                            .build());

                    if (coGuest != null) {
                        roomStayGuestsToSave.add(RoomStayGuest.builder()
                                .booking(booking)
                                .fullName(coGuest.getName())
                                .birthYear(1989 + (rIdx % 12))
                                .documentType("CCCD")
                                .documentNumber(coGuest.getIdNumber())
                                .isChild(false)
                                .isPrimaryGuest(false)
                                .checkInAt(checkedInAt)
                                .isExported(true)
                                .build());
                    }
                }

                // Nhật ký gửi xác nhận đặt phòng
                confirmationLogsToSave.add(BookingConfirmationLog.builder()
                        .booking(booking)
                        .channel(ConfirmationChannel.EMAIL)
                        .recipient(guest.getEmail() != null ? guest.getEmail() : "khachhang@example.com")
                        .sentBy(letan1)
                        .status("SUCCESS")
                        .sentAt(checkIn.minusDays(1).atTime(14, 30))
                        .note("Gửi phiếu xác nhận đặt phòng tự động qua email thành công")
                        .build());

                if (!isCancelled) {
                    lastCheckoutBookingByRoom.put(rNum, booking);

                    BigDecimal serviceAmount = BigDecimal.ZERO;

                    // 65% lượt khách sử dụng dịch vụ phụ thu (minibar, giặt là, buffet, đưa đón)
                    if ((guestIndex % 3) != 0 && !extraServices.isEmpty()) {
                        ExtraService s1 = extraServices.get((guestIndex + rIdx) % extraServices.size());
                        int qty = 1 + (rIdx % 2);
                        usagesToSave.add(BookingServiceUsage.builder()
                                .booking(booking)
                                .extraService(s1)
                                .quantity(qty)
                                .unitPriceSnapshot(s1.getUnitPrice())
                                .note(s1.getName())
                                .isSystemMandatory(false)
                                .build());
                        serviceAmount = serviceAmount.add(s1.getUnitPrice().multiply(BigDecimal.valueOf(qty)));

                        if (stayDays >= 2) {
                            ExtraService s2 = extraServices.get(0); // Ăn sáng / giặt là
                            int s2Qty = stayDays;
                            usagesToSave.add(BookingServiceUsage.builder()
                                    .booking(booking)
                                    .extraService(s2)
                                    .quantity(s2Qty)
                                    .unitPriceSnapshot(s2.getUnitPrice())
                                    .note("Dịch vụ kèm theo số ngày lưu trú")
                                    .isSystemMandatory(false)
                                    .build());
                            serviceAmount = serviceAmount.add(s2.getUnitPrice().multiply(BigDecimal.valueOf(s2Qty)));
                        }
                    }

                    BigDecimal discountAmount = isCorporate ? roomAmount.multiply(new BigDecimal("0.05")).setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                    BigDecimal totalInvoice = roomAmount.add(serviceAmount).subtract(discountAmount);

                    Invoice invoice = Invoice.builder()
                            .booking(booking)
                            .mode(InvoiceMode.SINGLE)
                            .roomAmount(roomAmount)
                            .serviceAmount(serviceAmount)
                            .discountAmount(discountAmount)
                            .totalAmount(totalInvoice)
                            .status(InvoiceStatus.PAID)
                            .createdBy(checkedOutAt.getHour() < 15 ? letan1 : letan2)
                            .note("Hoàn tất thanh toán tiền phòng & dịch vụ khi trả phòng")
                            .build();
                    invoicesToSave.add(invoice);

                    // Bản ghi chiết khấu InvoiceDiscount nếu có giảm giá
                    if (discountAmount.compareTo(BigDecimal.ZERO) > 0) {
                        invoiceDiscountsToSave.add(InvoiceDiscount.builder()
                                .invoice(invoice)
                                .discountType(DiscountType.PERCENTAGE)
                                .discountValue(new BigDecimal("5.00"))
                                .calculatedAmount(discountAmount)
                                .reason("Ưu đãi giảm giá 5% cho khách hàng đối tác doanh nghiệp")
                                .status(DiscountStatus.APPLIED)
                                .createdBy(letan1)
                                .createdAt(checkedOutAt.minusMinutes(15))
                                .reviewedBy(adminUser)
                                .reviewedAt(checkedOutAt.minusMinutes(5))
                                .build());
                    }

                    // Phân bổ phương thức thanh toán: 35% Tiền mặt, 55% Chuyển khoản, 10% Thẻ
                    PaymentMethod payMethod = PaymentMethod.TRANSFER;
                    int pMod = (guestIndex + currDate.getDayOfMonth()) % 10;
                    if (pMod < 4) payMethod = PaymentMethod.CASH;
                    else if (pMod == 9) payMethod = PaymentMethod.CREDIT_CARD;

                    Payment payment = Payment.builder()
                            .invoice(invoice)
                            .amount(totalInvoice)
                            .method(payMethod)
                            .paidAt(checkedOutAt)
                            .collectedBy(checkedOutAt.getHour() < 15 ? letan1 : letan2)
                            .note("Thanh toán hóa đơn phòng " + rNum + " (" + payMethod.name() + ")")
                            .build();
                    paymentsToSave.add(payment);

                    // Tiền đặt cọc trước (áp dụng cho ~45% khách)
                    if (guestIndex % 2 == 0) {
                        BigDecimal depAmt = roomAmount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP);
                        LocalDateTime depTime = checkIn.minusDays(1).atTime(10, 0).plusMinutes((rIdx * 13) % 180);
                        depositsToSave.add(Deposit.builder()
                                .booking(booking)
                                .requiredAmount(depAmt)
                                .collectedAmount(depAmt)
                                .status(DepositStatus.COLLECTED)
                                .paymentMethod(PaymentMethod.TRANSFER)
                                .collectedBy(letan1)
                                .collectedAt(depTime)
                                .note("Đặt cọc giữ phòng 30% qua QR chuyển khoản")
                                .build());
                    }

                    // Khai báo tạm trú liên kết chặt chẽ
                    StayDeclaration declaration = StayDeclaration.builder()
                            .booking(booking)
                            .status(StayDeclarationStatus.COMPLETED)
                            .completedBy(letan1)
                            .completedAt(checkedInAt.plusHours(1))
                            .build();
                    booking.setStayDeclaration(declaration);
                    declarationsToSave.add(declaration);

                    // Nhật ký dọn buồng phòng sau khi trả phòng
                    LocalDateTime cleanStart = checkedOutAt.plusMinutes(10);
                    LocalDateTime cleanEnd = cleanStart.plusMinutes(35);
                    cleaningsToSave.add(RoomCleaningRecord.builder()
                            .room(room)
                            .roomType(roomType)
                            .housekeeper(rIdx % 2 == 0 ? buongphong1 : buongphong2)
                            .cleaningType("CHECKOUT")
                            .startedAt(cleanStart)
                            .completedAt(cleanEnd)
                            .actualDurationMinutes(35)
                            .standardDurationMinutes(35)
                            .status(CleaningRecordStatus.APPROVED)
                            .inspectedBy(letan1)
                            .inspectedAt(cleanEnd.plusMinutes(15))
                            .isInterrupted(false)
                            .hasIncident(false)
                            .incidentCount(0)
                            .rejectionCount(0)
                            .build());
                }

                int gapDays = (rIdx + currDate.getDayOfMonth()) % 3;
                currDate = checkOut.plusDays(gapDays);
            }

            // 6. Xử lý các phòng ĐANG Ở HÔM NAY (101, 102, 201, 203, 301)
            if (inHouseRoomNumbers.contains(rNum)) {
                // Đảm bảo có phòng check-in hôm nay để kiểm tra ngay trên tab Khai Báo Lưu Trú
                LocalDate checkIn = today;
                LocalDate checkOut = today.plusDays(2);
                Guest guest = guests.get(guestIndex % guests.size());
                guestIndex++;

                Guest coGuest = (roomType.getStandardCapacity() != null && roomType.getStandardCapacity() > 1 && guests.size() > 1)
                        ? guests.get((guestIndex + 5) % guests.size()) : null;

                long stayDays = ChronoUnit.DAYS.between(checkIn, checkOut);
                BigDecimal roomAmount = roomType.getBasePrice().multiply(BigDecimal.valueOf(stayDays));
                LocalDateTime checkedInAt = today.atTime(13, 0).plusMinutes((rIdx * 17) % 90);

                List<Guest> inHouseGuests = new ArrayList<>();
                inHouseGuests.add(guest);
                if (coGuest != null) {
                    inHouseGuests.add(coGuest);
                }

                Booking inHouseBooking = Booking.builder()
                        .guest(guest)
                        .room(room)
                        .roomType(roomType)
                        .stayingGuests(inHouseGuests)
                        .checkInDate(checkIn)
                        .checkOutDate(checkOut)
                        .checkedInAt(checkedInAt)
                        .status(BookingStatus.CHECKED_IN)
                        .expectedPrice(roomAmount)
                        .actualPrice(roomAmount)
                        .source("WALKIN")
                        .createdBy(letan1)
                        .note("Khách đang lưu trú tại phòng, hỗ trợ chu đáo")
                        .build();
                bookingsToSave.add(inHouseBooking);

                // RoomStayGuest cho khách đang ở
                roomStayGuestsToSave.add(RoomStayGuest.builder()
                        .booking(inHouseBooking)
                        .fullName(guest.getName())
                        .birthYear(1987 + (rIdx % 10))
                        .documentType("CCCD")
                        .documentNumber(guest.getIdNumber())
                        .isChild(false)
                        .isPrimaryGuest(true)
                        .checkInAt(checkedInAt)
                        .isExported("301".equals(rNum) ? false : true)
                        .build());

                if (coGuest != null) {
                    roomStayGuestsToSave.add(RoomStayGuest.builder()
                            .booking(inHouseBooking)
                            .fullName(coGuest.getName())
                            .birthYear(1991 + (rIdx % 8))
                            .documentType("CCCD")
                            .documentNumber(coGuest.getIdNumber())
                            .isChild(false)
                            .isPrimaryGuest(false)
                            .checkInAt(checkedInAt)
                            .isExported("301".equals(rNum) ? false : true)
                            .build());
                }

                // Dịch vụ minibar đã tiêu thụ trong phòng
                if (!extraServices.isEmpty()) {
                    ExtraService nướcSuối = extraServices.stream()
                            .filter(s -> s.getName().contains("Nước suối khoáng"))
                            .findFirst()
                            .orElse(extraServices.get(0));
                    usagesToSave.add(BookingServiceUsage.builder()
                            .booking(inHouseBooking)
                            .extraService(nướcSuối)
                            .quantity(2)
                            .unitPriceSnapshot(nướcSuối.getUnitPrice())
                            .note("Tiêu thụ minibar phòng")
                            .isSystemMandatory(false)
                            .build());
                }

                // Đặt cọc phòng đang ở
                BigDecimal depAmt = roomAmount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP);
                depositsToSave.add(Deposit.builder()
                        .booking(inHouseBooking)
                        .requiredAmount(depAmt)
                        .collectedAmount(depAmt)
                        .status(DepositStatus.COLLECTED)
                        .paymentMethod(PaymentMethod.CASH)
                        .collectedBy(letan1)
                        .collectedAt(checkedInAt.plusMinutes(5))
                        .note("Thu tiền cọc khi làm thủ tục check-in")
                        .build());

                // Khai báo tạm trú: riêng phòng 301 để PENDING để lễ tân trải nghiệm thao tác trên giao diện
                StayDeclarationStatus declStatus = "301".equals(rNum) ? StayDeclarationStatus.PENDING : StayDeclarationStatus.COMPLETED;
                StayDeclaration declaration = StayDeclaration.builder()
                        .booking(inHouseBooking)
                        .status(declStatus)
                        .completedBy(declStatus == StayDeclarationStatus.COMPLETED ? letan1 : null)
                        .completedAt(declStatus == StayDeclarationStatus.COMPLETED ? checkedInAt.plusHours(1) : null)
                        .build();
                inHouseBooking.setStayDeclaration(declaration);
                declarationsToSave.add(declaration);
            }

            // 7. Xử lý các phòng SẮP NHẬN PHÒNG (104, 204, 302, 401)
            if (upcomingRoomNumbers.contains(rNum)) {
                LocalDate checkIn = today.plusDays(rIdx % 2); // Hôm nay hoặc ngày mai
                LocalDate checkOut = checkIn.plusDays(2);
                Guest guest = guests.get(guestIndex % guests.size());
                guestIndex++;

                BigDecimal roomAmount = roomType.getBasePrice().multiply(BigDecimal.valueOf(2));

                Booking upcomingBooking = Booking.builder()
                        .guest(guest)
                        .room(room)
                        .roomType(roomType)
                        .stayingGuests(List.of(guest))
                        .checkInDate(checkIn)
                        .checkOutDate(checkOut)
                        .status(BookingStatus.CONFIRMED)
                        .expectedPrice(roomAmount)
                        .actualPrice(roomAmount)
                        .source("ONLINE")
                        .createdBy(letan1)
                        .note("Khách hẹn nhận phòng lúc 14h chiều, phòng đã sẵn sàng")
                        .build();
                bookingsToSave.add(upcomingBooking);

                // Đã nhận cọc chuyển khoản xác nhận giữ phòng
                BigDecimal depAmt = roomAmount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP);
                depositsToSave.add(Deposit.builder()
                        .booking(upcomingBooking)
                        .requiredAmount(depAmt)
                        .collectedAmount(depAmt)
                        .status(DepositStatus.COLLECTED)
                        .paymentMethod(PaymentMethod.TRANSFER)
                        .collectedBy(letan1)
                        .collectedAt(today.minusDays(1).atTime(9, 30))
                        .note("Khách cọc qua QR ngân hàng xác nhận đặt phòng")
                        .build());
            }
        }

        // Lưu toàn bộ Bookings, StayingGuests, Usages, Invoices, Discounts, Payments, Deposits, Declarations
        bookingRepository.saveAll(bookingsToSave);
        roomStayGuestRepository.saveAll(roomStayGuestsToSave);
        bookingConfirmationLogRepository.saveAll(confirmationLogsToSave);
        bookingServiceUsageRepository.saveAll(usagesToSave);
        invoiceRepository.saveAll(invoicesToSave);
        invoiceDiscountRepository.saveAll(invoiceDiscountsToSave);
        paymentRepository.saveAll(paymentsToSave);
        depositRepository.saveAll(depositsToSave);
        stayDeclarationRepository.saveAll(declarationsToSave);
        log.info("Đã lưu {} đặt phòng, {} khách lưu trú, {} dịch vụ, {} hóa đơn, {} chiết khấu, {} thanh toán, {} tiền cọc.",
                bookingsToSave.size(), roomStayGuestsToSave.size(), usagesToSave.size(),
                invoicesToSave.size(), invoiceDiscountsToSave.size(), paymentsToSave.size(), depositsToSave.size());

        // Dọn dẹp phòng 103 (DIRTY) vừa trả phòng hôm nay
        Room room103 = allRooms.stream().filter(r -> "103".equals(r.getRoomNumber())).findFirst().orElse(null);
        if (room103 != null) {
            cleaningsToSave.add(RoomCleaningRecord.builder()
                    .room(room103)
                    .roomType(room103.getRoomType())
                    .housekeeper(buongphong1)
                    .cleaningType("CHECKOUT")
                    .startedAt(today.atTime(11, 40))
                    .standardDurationMinutes(30)
                    .status(CleaningRecordStatus.IN_PROGRESS)
                    .isInterrupted(false)
                    .hasIncident(false)
                    .incidentCount(0)
                    .rejectionCount(0)
                    .build());
        }
        roomCleaningRecordRepository.saveAll(cleaningsToSave);
        log.info("Đã lưu {} bản ghi nhật ký dọn buồng phòng.", cleaningsToSave.size());

        // 8. Đồng bộ trạng thái thực tế phòng
        updateRealtimeRoomStatuses(allRooms, inHouseRoomNumbers, buongphong1);

        // 9. Sinh Ca làm việc thu ngân (CashierShift & CashierShiftClosing) khớp 100% doanh thu
        List<CashierShift> shifts = seedCashierShifts(startDate, today, paymentsToSave, depositsToSave, letan1, letan2);

        // 10. Sinh Sổ cái tài chính ngày (DailyLedger) khớp chính xác từng ngày
        List<DailyLedger> ledgers = seedDailyLedgers(startDate, today, paymentsToSave, depositsToSave, letan1);

        // 11. Sinh Sự cố phòng (RoomIncident) trải dài 9 tháng
        List<RoomIncident> incidents = seedRoomIncidents(allRooms, today, buongphong1, buongphong2, adminUser, letan1);

        // 12. Sinh Đồ thất lạc (LostItem & LostItemLog) gắn với phòng & khách lưu trú
        List<LostItem> lostItems = seedLostItems(allRooms, today, lastCheckoutBookingByRoom, buongphong1, buongphong2, letan1);

        // 13. Sinh Hồ sơ công nợ đối tác doanh nghiệp (DebtApprovalRequest & DebtCollectionLog)
        seedCorporateDebtRecords(bookingsToSave, invoicesToSave, guests, letan1, adminUser, today);

        // 14. Cập nhật Điểm tích lũy & Hạng thành viên khách hàng dựa trên chi tiêu thực tế
        updateGuestLoyaltyBasedOnSpending(guests, invoicesToSave);

        // 15. Sinh Thông báo mẫu cho ngày hôm nay
        seedSampleNotifications(users, today);

        // 16. Sinh Nhật ký kiểm toán hệ thống (AuditLog) toàn diện từ tháng 1 đến nay
        seedAuditLogs(users, bookingsToSave, invoicesToSave, shifts, incidents, lostItems, adminUser, letan1, buongphong1);

        // 17. Tự động khởi tạo bản sao lưu toàn diện (.ZIP) lưu trữ trong trung tâm backup
        BackupHistoryDto backupDto = null;
        try {
            backupDto = backupService.createBackup(adminUser, "FULL_ZIP");
            log.info("Đã tạo thành công bản sao lưu toàn diện hệ thống: {}", backupDto.getFileName());
        } catch (Exception e) {
            log.error("Lỗi khi tạo bản sao lưu mẫu: {}", e.getMessage(), e);
        }

        log.info("========== HOÀN TẤT TÁI TẠO BỘ DỮ LIỆU MẪU VẬN HÀNH THÀNH CÔNG ==========");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "Tái tạo dữ liệu mẫu từ tháng 1 đến nay và tạo bản sao lưu thành công.");
        result.put("bookingsCount", bookingsToSave.size());
        result.put("invoicesCount", invoicesToSave.size());
        result.put("paymentsCount", paymentsToSave.size());
        result.put("depositsCount", depositsToSave.size());
        result.put("declarationsCount", declarationsToSave.size());
        result.put("cleaningsCount", cleaningsToSave.size());
        result.put("cashierShiftsCount", shifts.size());
        result.put("dailyLedgersCount", ledgers.size());
        result.put("incidentsCount", incidents.size());
        result.put("lostItemsCount", lostItems.size());
        result.put("backupFile", backupDto != null ? backupDto.getFileName() : "N/A");
        result.put("backupSize", backupDto != null ? backupDto.getFormattedSize() : "N/A");

        return result;
    }

    private void updateRealtimeRoomStatuses(List<Room> allRooms, Set<String> inHouseRoomNumbers, User buongphong) {
        List<Room> updatedRooms = new ArrayList<>();
        for (Room r : allRooms) {
            String num = r.getRoomNumber();
            if (inHouseRoomNumbers.contains(num)) {
                r.setStatus(RoomStatus.OCCUPIED);
                r.setCleaningReason(null);
            } else if ("103".equals(num)) {
                r.setStatus(RoomStatus.DIRTY);
                r.setCleaningReason("CHECKOUT");
                r.setAssignedHousekeeper(buongphong);
            } else if ("202".equals(num)) {
                r.setStatus(RoomStatus.MAINTENANCE);
                r.setNotes("Bảo dưỡng định kỳ hệ thống điều hòa");
                r.setCleaningReason(null);
            } else {
                r.setStatus(RoomStatus.AVAILABLE);
                r.setCleaningReason(null);
                r.setAssignedHousekeeper(null);
            }
            updatedRooms.add(r);
        }
        roomRepository.saveAll(updatedRooms);
    }

    private List<CashierShift> seedCashierShifts(
            LocalDate startDate,
            LocalDate today,
            List<Payment> payments,
            List<Deposit> deposits,
            User letan1,
            User letan2
    ) {
        List<CashierShift> shiftsToSave = new ArrayList<>();
        List<CashierShiftClosing> closingsToSave = new ArrayList<>();
        LocalDate cur = startDate;

        while (!cur.isAfter(today)) {
            // Ca 1: Sáng 07:00 - 15:00
            LocalDateTime mStart = cur.atTime(7, 0);
            LocalDateTime mEnd = cur.atTime(15, 0);

            BigDecimal mCash = BigDecimal.ZERO;
            BigDecimal mTransfer = BigDecimal.ZERO;
            BigDecimal mCard = BigDecimal.ZERO;

            for (Payment p : payments) {
                if (!p.getPaidAt().isBefore(mStart) && p.getPaidAt().isBefore(mEnd)) {
                    if (p.getMethod() == PaymentMethod.CASH) mCash = mCash.add(p.getAmount());
                    else if (p.getMethod() == PaymentMethod.CREDIT_CARD) mCard = mCard.add(p.getAmount());
                    else mTransfer = mTransfer.add(p.getAmount());
                }
            }

            BigDecimal mDepCash = BigDecimal.ZERO;
            BigDecimal mDepTransfer = BigDecimal.ZERO;
            for (Deposit d : deposits) {
                if (d.getCollectedAt() != null && !d.getCollectedAt().isBefore(mStart) && d.getCollectedAt().isBefore(mEnd)) {
                    if (d.getPaymentMethod() == PaymentMethod.CASH) mDepCash = mDepCash.add(d.getCollectedAmount());
                    else mDepTransfer = mDepTransfer.add(d.getCollectedAmount());
                }
            }

            BigDecimal baseCash = new BigDecimal("2000000");
            BigDecimal mExpCash = baseCash.add(mCash).add(mDepCash);

            CashierShift shift1 = CashierShift.builder()
                    .openedBy(letan1)
                    .openedAt(mStart)
                    .openingCash(baseCash)
                    .openingNote("Bàn giao ca sáng, tiền mặt trong két 2.000.000 đ")
                    .status(CashierShiftStatus.CLOSED)
                    .closedBy(letan1)
                    .closedAt(mEnd)
                    .invoiceCash(mCash)
                    .invoiceTransfer(mTransfer)
                    .invoiceCard(mCard)
                    .depositCash(mDepCash)
                    .depositTransfer(mDepTransfer)
                    .depositCard(BigDecimal.ZERO)
                    .refundCash(BigDecimal.ZERO)
                    .refundTransfer(BigDecimal.ZERO)
                    .refundCard(BigDecimal.ZERO)
                    .expectedCash(mExpCash)
                    .actualCash(mExpCash)
                    .discrepancy(BigDecimal.ZERO)
                    .build();
            shiftsToSave.add(shift1);

            closingsToSave.add(CashierShiftClosing.builder()
                    .shift(shift1)
                    .closedBy(letan1)
                    .closedAt(mEnd)
                    .openingCash(baseCash)
                    .invoiceCash(mCash)
                    .invoiceTransfer(mTransfer)
                    .invoiceCard(mCard)
                    .depositCash(mDepCash)
                    .depositTransfer(mDepTransfer)
                    .depositCard(BigDecimal.ZERO)
                    .refundCash(BigDecimal.ZERO)
                    .refundTransfer(BigDecimal.ZERO)
                    .refundCard(BigDecimal.ZERO)
                    .expectedCash(mExpCash)
                    .actualCash(mExpCash)
                    .discrepancy(BigDecimal.ZERO)
                    .build());

            // Ca 2: Chiều 15:00 - 23:00
            LocalDateTime aStart = cur.atTime(15, 0);
            LocalDateTime aEnd = cur.atTime(23, 0);

            BigDecimal aCash = BigDecimal.ZERO;
            BigDecimal aTransfer = BigDecimal.ZERO;
            BigDecimal aCard = BigDecimal.ZERO;

            for (Payment p : payments) {
                if (!p.getPaidAt().isBefore(aStart) && p.getPaidAt().isBefore(aEnd)) {
                    if (p.getMethod() == PaymentMethod.CASH) aCash = aCash.add(p.getAmount());
                    else if (p.getMethod() == PaymentMethod.CREDIT_CARD) aCard = aCard.add(p.getAmount());
                    else aTransfer = aTransfer.add(p.getAmount());
                }
            }

            BigDecimal aDepCash = BigDecimal.ZERO;
            BigDecimal aDepTransfer = BigDecimal.ZERO;
            for (Deposit d : deposits) {
                if (d.getCollectedAt() != null && !d.getCollectedAt().isBefore(aStart) && d.getCollectedAt().isBefore(aEnd)) {
                    if (d.getPaymentMethod() == PaymentMethod.CASH) aDepCash = aDepCash.add(d.getCollectedAmount());
                    else aDepTransfer = aDepTransfer.add(d.getCollectedAmount());
                }
            }

            BigDecimal aExpCash = baseCash.add(aCash).add(aDepCash);
            boolean isPast = cur.isBefore(today);

            CashierShift shift2 = CashierShift.builder()
                    .openedBy(letan2)
                    .openedAt(aStart)
                    .openingCash(baseCash)
                    .openingNote("Tiếp quản ca chiều")
                    .status(isPast ? CashierShiftStatus.CLOSED : CashierShiftStatus.OPEN)
                    .closedBy(isPast ? letan2 : null)
                    .closedAt(isPast ? aEnd : null)
                    .invoiceCash(aCash)
                    .invoiceTransfer(aTransfer)
                    .invoiceCard(aCard)
                    .depositCash(aDepCash)
                    .depositTransfer(aDepTransfer)
                    .depositCard(BigDecimal.ZERO)
                    .refundCash(BigDecimal.ZERO)
                    .refundTransfer(BigDecimal.ZERO)
                    .refundCard(BigDecimal.ZERO)
                    .expectedCash(aExpCash)
                    .actualCash(aExpCash)
                    .discrepancy(BigDecimal.ZERO)
                    .build();
            shiftsToSave.add(shift2);

            if (isPast) {
                closingsToSave.add(CashierShiftClosing.builder()
                        .shift(shift2)
                        .closedBy(letan2)
                        .closedAt(aEnd)
                        .openingCash(baseCash)
                        .invoiceCash(aCash)
                        .invoiceTransfer(aTransfer)
                        .invoiceCard(aCard)
                        .depositCash(aDepCash)
                        .depositTransfer(aDepTransfer)
                        .depositCard(BigDecimal.ZERO)
                        .refundCash(BigDecimal.ZERO)
                        .refundTransfer(BigDecimal.ZERO)
                        .refundCard(BigDecimal.ZERO)
                        .expectedCash(aExpCash)
                        .actualCash(aExpCash)
                        .discrepancy(BigDecimal.ZERO)
                        .build());
            }

            cur = cur.plusDays(1);
        }

        cashierShiftRepository.saveAll(shiftsToSave);
        cashierShiftClosingRepository.saveAll(closingsToSave);
        log.info("Đã tạo {} ca thu ngân trực ban và {} bản ghi chốt ca (CashierShiftClosing).",
                shiftsToSave.size(), closingsToSave.size());
        return shiftsToSave;
    }

    private List<DailyLedger> seedDailyLedgers(
            LocalDate startDate,
            LocalDate today,
            List<Payment> payments,
            List<Deposit> deposits,
            User letan
    ) {
        Map<LocalDate, BigDecimal> cashMap = new HashMap<>();
        Map<LocalDate, BigDecimal> transferMap = new HashMap<>();
        Map<LocalDate, BigDecimal> cardMap = new HashMap<>();

        for (Payment p : payments) {
            LocalDate d = p.getPaidAt().toLocalDate();
            if (p.getMethod() == PaymentMethod.CASH) {
                cashMap.put(d, cashMap.getOrDefault(d, BigDecimal.ZERO).add(p.getAmount()));
            } else if (p.getMethod() == PaymentMethod.CREDIT_CARD) {
                cardMap.put(d, cardMap.getOrDefault(d, BigDecimal.ZERO).add(p.getAmount()));
            } else {
                transferMap.put(d, transferMap.getOrDefault(d, BigDecimal.ZERO).add(p.getAmount()));
            }
        }

        Map<LocalDate, BigDecimal> depCashMap = new HashMap<>();
        Map<LocalDate, BigDecimal> depTransferMap = new HashMap<>();
        for (Deposit dep : deposits) {
            if (dep.getCollectedAt() != null) {
                LocalDate d = dep.getCollectedAt().toLocalDate();
                if (dep.getPaymentMethod() == PaymentMethod.CASH) {
                    depCashMap.put(d, depCashMap.getOrDefault(d, BigDecimal.ZERO).add(dep.getCollectedAmount()));
                } else {
                    depTransferMap.put(d, depTransferMap.getOrDefault(d, BigDecimal.ZERO).add(dep.getCollectedAmount()));
                }
            }
        }

        List<DailyLedger> ledgers = new ArrayList<>();
        LocalDate cur = startDate;

        while (!cur.isAfter(today)) {
            boolean isPast = cur.isBefore(today);
            BigDecimal c = cashMap.getOrDefault(cur, BigDecimal.ZERO);
            BigDecimal tr = transferMap.getOrDefault(cur, BigDecimal.ZERO);
            BigDecimal cd = cardMap.getOrDefault(cur, BigDecimal.ZERO);
            BigDecimal dc = depCashMap.getOrDefault(cur, BigDecimal.ZERO);
            BigDecimal dt = depTransferMap.getOrDefault(cur, BigDecimal.ZERO);

            BigDecimal expCash = c.add(dc);

            ledgers.add(DailyLedger.builder()
                    .date(cur)
                    .status(isPast ? DailyLedgerStatus.CLOSED : DailyLedgerStatus.OPEN)
                    .closedBy(isPast ? letan : null)
                    .closedAt(isPast ? cur.atTime(23, 30) : null)
                    .totalInvoiceCash(c)
                    .totalInvoiceTransfer(tr)
                    .totalInvoiceCard(cd)
                    .totalDepositCash(dc)
                    .totalDepositTransfer(dt)
                    .totalDepositCard(BigDecimal.ZERO)
                    .totalRefundCash(BigDecimal.ZERO)
                    .totalRefundTransfer(BigDecimal.ZERO)
                    .totalRefundCard(BigDecimal.ZERO)
                    .totalExpectedCash(expCash)
                    .totalActualCash(expCash)
                    .totalDiscrepancy(BigDecimal.ZERO)
                    .cashHandoverAmount(expCash)
                    .build());

            cur = cur.plusDays(1);
        }

        dailyLedgerRepository.saveAll(ledgers);
        log.info("Đã khởi tạo {} sổ cái tài chính ngày (DailyLedger) liền mạch.", ledgers.size());
        return ledgers;
    }

    private List<RoomIncident> seedRoomIncidents(
            List<Room> allRooms,
            LocalDate today,
            User housekeeper1,
            User housekeeper2,
            User admin,
            User letan
    ) {
        Map<String, Room> rMap = allRooms.stream().collect(Collectors.toMap(Room::getRoomNumber, r -> r));
        List<RoomIncident> incidents = new ArrayList<>();

        Object[][] rawIncidents = {
                {"101", 240, IncidentSeverity.LIGHT, "Vòi hoa sen bị nghẹt cặn canxi đầu phun", "Đã tháo ngâm vệ sinh cặn canxi, dòng chảy thông suốt."},
                {"202", 215, IncidentSeverity.LIGHT, "Tay nắm cửa sổ bị lỏng ốc đệm", "Đã siết ốc cân chỉnh và thay đệm cao su mới."},
                {"301", 190, IncidentSeverity.LIGHT, "Tủ lạnh mini không đủ mát", "Kỹ thuật đã kiểm tra giàn lạnh và nạp thêm gas làm lạnh."},
                {"104", 165, IncidentSeverity.LIGHT, "Ổ cắm điện đầu giường bị lỏng chân", "Đã thay ổ cắm điện âm tường mới an toàn."},
                {"205", 140, IncidentSeverity.LIGHT, "Két sắt điện tử cảnh báo pin yếu", "Đã thay 4 viên pin AA mới và kiểm tra khóa cơ dự phòng."},
                {"102", 115, IncidentSeverity.LIGHT, "Cửa kính phòng tắm bị rít khi trượt", "Đã xịt dầu bôi trơn rãnh ray trượt và vệ sinh cát bẩn."},
                {"303", 90, IncidentSeverity.LIGHT, "Điều hòa phát ra tiếng rè khi gió mạnh", "Đã vệ sinh lưới lọc gió và siết ốc quạt lồng sóc."},
                {"401", 70, IncidentSeverity.LIGHT, "Khóa thẻ từ phản hồi chậm", "Đã hiệu chuẩn mắt đọc từ và thay pin khóa thông minh."},
                {"105", 50, IncidentSeverity.LIGHT, "Vòi xịt vệ sinh áp lực nước yếu", "Đã thông cặn van chia nước, áp lực nước đạt tiêu chuẩn."},
                {"203", 35, IncidentSeverity.LIGHT, "Đèn ngủ chập chờn tiếp xúc đui", "Đã thay đui đèn LED mới."},
                {"103", 15, IncidentSeverity.LIGHT, "Vòi sen rò rỉ nước ở khớp nối ren", "Đã thay gioăng cao su mới và quấn băng tan chống rò rỉ."},
                {"204", 5, IncidentSeverity.LIGHT, "Đèn ban công bị cháy bóng", "Đã thay bóng LED Philips 9W mới."},
                {"202", 0, IncidentSeverity.LIGHT, "Điều hòa cần bảo dưỡng định kỳ và nạp gas bổ sung", null}
        };

        for (Object[] row : rawIncidents) {
            String rNum = (String) row[0];
            int daysAgo = (Integer) row[1];
            IncidentSeverity sev = (IncidentSeverity) row[2];
            String desc = (String) row[3];
            String resolution = (String) row[4];

            Room r = rMap.get(rNum);
            if (r == null) continue;

            LocalDate incDate = today.minusDays(daysAgo);
            boolean isResolved = resolution != null;

            incidents.add(RoomIncident.builder()
                    .room(r)
                    .severity(sev)
                    .description(desc)
                    .status(isResolved ? IncidentStatus.RESOLVED : IncidentStatus.OPEN)
                    .reportedBy(daysAgo % 2 == 0 ? housekeeper1 : housekeeper2)
                    .reportedAt(incDate.atTime(10, 0))
                    .resolvedBy(isResolved ? admin : null)
                    .resolvedAt(isResolved ? incDate.atTime(15, 30) : null)
                    .resolutionNote(resolution)
                    .affectedBookingsCount(0)
                    .build());
        }

        roomIncidentRepository.saveAll(incidents);
        log.info("Đã tạo {} bản ghi sự cố phòng mẫu (RoomIncident).", incidents.size());
        return incidents;
    }

    private List<LostItem> seedLostItems(
            List<Room> allRooms,
            LocalDate today,
            Map<String, Booking> lastCheckoutBookingByRoom,
            User housekeeper1,
            User housekeeper2,
            User letan
    ) {
        Map<String, Room> rMap = allRooms.stream().collect(Collectors.toMap(Room::getRoomNumber, r -> r));
        List<LostItem> items = new ArrayList<>();
        List<LostItemLog> logsToSave = new ArrayList<>();

        Object[][] rawItems = {
                {"102", 210, "Tai nghe Apple AirPods Pro có hộp sạc", "Bàn trang điểm cạnh gương", "Trần Thị Lan", "0912345678", true},
                {"201", 180, "Áo khoác dạ nữ màu be dáng dài", "Trong tủ quần áo gỗ", "Lê Hoàng Nam", "0901234567", true},
                {"301", 150, "Kính râm gọng đen Ray-Ban trong bao da", "Trên bàn làm việc cạnh cửa sổ", "Vũ Thị Hồng Nhung", "0982345678", true},
                {"104", 120, "Sạc dự phòng Anker 10.000mAh màu đen", "Ngăn kéo tủ đầu giường", "Đặng Quốc Huy", "0931234567", true},
                {"205", 90, "Sách 'Atomic Habits' bản tiếng Anh", "Bàn trà ngoài ban công", "Hoàng Văn Tuấn", "0941234567", true},
                {"401", 60, "Đồng hồ đeo tay Casio Edifice màu bạc", "Bồn rửa mặt phòng tắm", "Phạm Minh Quang", "0951234567", true},
                {"105", 30, "Ô che mưa gấp gọn màu xanh navy", "Góc cửa phòng cạnh giá treo ô", "Bùi Thị Mai", "0961234567", true},
                {"203", 4, "Bình giữ nhiệt Lock&Lock màu xám", "Kệ cạnh TV", null, null, false},
                {"302", 2, "Củ sạc nhanh MacBook Type-C 67W", "Gần ổ cắm dưới chân bàn làm việc", null, null, false},
                {"103", 0, "Dù che nắng gấp 3 màu hồng", "Bàn ăn mini", null, null, false}
        };

        for (Object[] row : rawItems) {
            String rNum = (String) row[0];
            int daysAgo = (Integer) row[1];
            String itemName = (String) row[2];
            String foundLoc = (String) row[3];
            String recName = (String) row[4];
            String recPhone = (String) row[5];
            boolean isReturned = (Boolean) row[6];

            Room r = rMap.get(rNum);
            if (r == null) continue;

            LocalDate fDate = today.minusDays(daysAgo);
            Booking booking = lastCheckoutBookingByRoom.get(rNum);
            User creator = daysAgo % 2 == 0 ? housekeeper1 : housekeeper2;

            LostItem item = LostItem.builder()
                    .room(r)
                    .booking(booking)
                    .itemName(itemName)
                    .foundLocation(foundLoc)
                    .foundDate(fDate)
                    .foundTime(LocalTime.of(12, 30))
                    .storageLocation("Tủ đồ thất lạc Lễ tân")
                    .status(isReturned ? LostItemStatus.RETURNED : LostItemStatus.HOLDING)
                    .retentionExpiryDate(fDate.plusDays(30))
                    .receiverName(recName)
                    .receiverPhone(recPhone)
                    .receiverNote(isReturned ? "Khách quay lại nhận trực tiếp tại quầy hoặc gửi chuyển phát nhanh" : null)
                    .returnedAt(isReturned ? fDate.plusDays(1).atTime(14, 0) : null)
                    .returnedBy(isReturned ? letan : null)
                    .createdBy(creator)
                    .build();
            items.add(item);

            // Nhật ký LostItemLog
            logsToSave.add(LostItemLog.builder()
                    .lostItem(item)
                    .action("CREATED")
                    .previousStatus(null)
                    .newStatus(LostItemStatus.HOLDING)
                    .notes("Nhặt được đồ khi kiểm tra và dọn phòng sau khi khách trả")
                    .performedBy(creator)
                    .createdAt(fDate.atTime(12, 35))
                    .build());

            if (isReturned) {
                logsToSave.add(LostItemLog.builder()
                        .lostItem(item)
                        .action("RETURNED_TO_GUEST")
                        .previousStatus(LostItemStatus.HOLDING)
                        .newStatus(LostItemStatus.RETURNED)
                        .notes("Đã liên hệ xác minh và trao trả tài sản cho khách: " + recName)
                        .performedBy(letan)
                        .createdAt(fDate.plusDays(1).atTime(14, 5))
                        .build());
            }
        }

        lostItemRepository.saveAll(items);
        lostItemLogRepository.saveAll(logsToSave);
        log.info("Đã tạo {} đồ thất lạc mẫu (LostItem) và {} nhật ký xử lý (LostItemLog).", items.size(), logsToSave.size());
        return items;
    }

    private void seedCorporateDebtRecords(
            List<Booking> bookings,
            List<Invoice> invoices,
            List<Guest> guests,
            User letan,
            User admin,
            LocalDate today
    ) {
        List<Booking> corporateBookings = bookings.stream()
                .filter(b -> b.getAppliedAgreement() != null && b.getStatus() == BookingStatus.CHECKED_OUT)
                .toList();

        if (corporateBookings.size() < 2) return;

        List<DebtApprovalRequest> debtRequests = new ArrayList<>();
        List<DebtCollectionLog> debtLogs = new ArrayList<>();

        Booking b1 = corporateBookings.get(0);
        Invoice inv1 = invoices.stream().filter(i -> i.getBooking() != null && i.getBooking().equals(b1)).findFirst().orElse(null);
        if (inv1 != null) {
            DebtApprovalRequest debt1 = DebtApprovalRequest.builder()
                    .booking(b1)
                    .invoice(inv1)
                    .guest(b1.getGuest())
                    .debtAmount(inv1.getTotalAmount())
                    .dueDate(b1.getCheckOutDate().plusDays(30))
                    .reason("Công nợ doanh nghiệp đối tác trả sau chu kỳ tháng")
                    .status(DebtApprovalStatus.APPROVED)
                    .requestedBy(letan)
                    .requestedAt(b1.getCheckedOutAt().minusMinutes(20))
                    .approvedBy(admin)
                    .approvedAt(b1.getCheckedOutAt().minusMinutes(5))
                    .lastContactedAt(b1.getCheckOutDate().plusDays(15).atTime(9, 30))
                    .lastContactNote("Đã xác nhận thỏa thuận bảo lãnh thanh toán của công ty đối tác")
                    .lastContactResult("PROMISED_TO_PAY")
                    .promisedDate(b1.getCheckOutDate().plusDays(25))
                    .build();
            debtRequests.add(debt1);

            debtLogs.add(DebtCollectionLog.builder()
                    .debtApprovalRequest(debt1)
                    .contactDate(b1.getCheckOutDate().plusDays(15).atTime(9, 30))
                    .contactMethod("EMAIL")
                    .contactResult("PROMISED_TO_PAY")
                    .notes("Đã gửi sao kê bảng đối soát công nợ qua email cho kế toán trưởng công ty đối tác")
                    .promisedDate(b1.getCheckOutDate().plusDays(25))
                    .nextReminderDate(b1.getCheckOutDate().plusDays(26))
                    .build());
        }

        debtApprovalRepository.saveAll(debtRequests);
        debtCollectionLogRepository.saveAll(debtLogs);
        log.info("Đã tạo {} hồ sơ công nợ đối tác và {} nhật ký đối soát công nợ.", debtRequests.size(), debtLogs.size());
    }

    private void seedAuditLogs(
            List<User> users,
            List<Booking> bookings,
            List<Invoice> invoices,
            List<CashierShift> shifts,
            List<RoomIncident> incidents,
            List<LostItem> lostItems,
            User admin,
            User letan,
            User housekeeper
    ) {
        List<AuditLog> auditLogs = new ArrayList<>();

        // 1. Audit logs cho các đặt phòng tiêu biểu trải dài từ T1 đến T9
        int sampleStep = Math.max(1, bookings.size() / 50);
        for (int i = 0; i < bookings.size(); i += sampleStep) {
            Booking b = bookings.get(i);
            LocalDateTime ts = b.getCheckedInAt() != null ? b.getCheckedInAt() : b.getCheckInDate().atTime(14, 0);

            auditLogs.add(AuditLog.builder()
                    .entityName("Booking")
                    .entityId(b.getId())
                    .action("CREATE_BOOKING")
                    .actor(letan)
                    .timestamp(ts.minusDays(1))
                    .detailJson("{\"room\":\"" + (b.getRoom() != null ? b.getRoom().getRoomNumber() : "") + "\",\"guest\":\"" + (b.getGuest() != null ? b.getGuest().getName() : "") + "\"}")
                    .build());

            if (b.getStatus() == BookingStatus.CHECKED_OUT || b.getStatus() == BookingStatus.CHECKED_IN) {
                auditLogs.add(AuditLog.builder()
                        .entityName("Booking")
                        .entityId(b.getId())
                        .action("CHECK_IN")
                        .actor(letan)
                        .timestamp(ts)
                        .detailJson("{\"roomNumber\":\"" + (b.getRoom() != null ? b.getRoom().getRoomNumber() : "") + "\",\"action\":\"Khách nhận phòng thành công\"}")
                        .build());
            }

            if (b.getStatus() == BookingStatus.CHECKED_OUT && b.getCheckedOutAt() != null) {
                auditLogs.add(AuditLog.builder()
                        .entityName("Booking")
                        .entityId(b.getId())
                        .action("CHECK_OUT")
                        .actor(letan)
                        .timestamp(b.getCheckedOutAt())
                        .detailJson("{\"roomNumber\":\"" + (b.getRoom() != null ? b.getRoom().getRoomNumber() : "") + "\",\"action\":\"Hoàn tất trả phòng\"}")
                        .build());
            }
        }

        // 2. Audit logs cho các hóa đơn thanh toán
        int invStep = Math.max(1, invoices.size() / 30);
        for (int i = 0; i < invoices.size(); i += invStep) {
            Invoice inv = invoices.get(i);
            if (inv.getBooking() != null && inv.getBooking().getCheckedOutAt() != null) {
                auditLogs.add(AuditLog.builder()
                        .entityName("Invoice")
                        .entityId(inv.getId())
                        .action("CREATE_INVOICE")
                        .actor(letan)
                        .timestamp(inv.getBooking().getCheckedOutAt())
                        .detailJson("{\"totalAmount\":" + inv.getTotalAmount() + ",\"status\":\"PAID\"}")
                        .build());
            }
        }

        // 3. Audit logs cho ca làm việc thu ngân
        int shiftStep = Math.max(1, shifts.size() / 25);
        for (int i = 0; i < shifts.size(); i += shiftStep) {
            CashierShift s = shifts.get(i);
            auditLogs.add(AuditLog.builder()
                    .entityName("CashierShift")
                    .entityId(s.getId())
                    .action("OPEN_SHIFT")
                    .actor(s.getOpenedBy() != null ? s.getOpenedBy() : letan)
                    .timestamp(s.getOpenedAt())
                    .detailJson("{\"openingCash\":" + s.getOpeningCash() + "}")
                    .build());

            if (s.getStatus() == CashierShiftStatus.CLOSED && s.getClosedAt() != null) {
                auditLogs.add(AuditLog.builder()
                        .entityName("CashierShift")
                        .entityId(s.getId())
                        .action("CLOSE_SHIFT")
                        .actor(s.getClosedBy() != null ? s.getClosedBy() : letan)
                        .timestamp(s.getClosedAt())
                        .detailJson("{\"actualCash\":" + s.getActualCash() + ",\"discrepancy\":" + s.getDiscrepancy() + "}")
                        .build());
            }
        }

        // 4. Audit logs cho các sự cố phòng
        for (RoomIncident inc : incidents) {
            auditLogs.add(AuditLog.builder()
                    .entityName("RoomIncident")
                    .entityId(inc.getId())
                    .action("REPORT_INCIDENT")
                    .actor(inc.getReportedBy() != null ? inc.getReportedBy() : housekeeper)
                    .timestamp(inc.getReportedAt())
                    .detailJson("{\"room\":\"" + (inc.getRoom() != null ? inc.getRoom().getRoomNumber() : "") + "\",\"desc\":\"" + inc.getDescription() + "\"}")
                    .build());

            if (inc.getStatus() == IncidentStatus.RESOLVED && inc.getResolvedAt() != null) {
                auditLogs.add(AuditLog.builder()
                        .entityName("RoomIncident")
                        .entityId(inc.getId())
                        .action("RESOLVE_INCIDENT")
                        .actor(inc.getResolvedBy() != null ? inc.getResolvedBy() : admin)
                        .timestamp(inc.getResolvedAt())
                        .detailJson("{\"resolution\":\"" + inc.getResolutionNote() + "\"}")
                        .build());
            }
        }

        // 5. Audit logs cho đồ thất lạc
        for (LostItem li : lostItems) {
            auditLogs.add(AuditLog.builder()
                    .entityName("LostItem")
                    .entityId(li.getId())
                    .action("REGISTER_LOST_ITEM")
                    .actor(li.getCreatedBy() != null ? li.getCreatedBy() : housekeeper)
                    .timestamp(li.getFoundDate().atTime(li.getFoundTime() != null ? li.getFoundTime() : LocalTime.of(12, 30)))
                    .detailJson("{\"item\":\"" + li.getItemName() + "\",\"room\":\"" + (li.getRoom() != null ? li.getRoom().getRoomNumber() : "") + "\"}")
                    .build());

            if (li.getStatus() == LostItemStatus.RETURNED && li.getReturnedAt() != null) {
                auditLogs.add(AuditLog.builder()
                        .entityName("LostItem")
                        .entityId(li.getId())
                        .action("RETURN_LOST_ITEM")
                        .actor(li.getReturnedBy() != null ? li.getReturnedBy() : letan)
                        .timestamp(li.getReturnedAt())
                        .detailJson("{\"receiver\":\"" + li.getReceiverName() + "\"}")
                        .build());
            }
        }

        auditLogRepository.saveAll(auditLogs);
        log.info("Đã tạo {} bản ghi lịch sử kiểm toán hệ thống (AuditLog) chi tiết và liền mạch.", auditLogs.size());
    }

    private void updateGuestLoyaltyBasedOnSpending(List<Guest> guests, List<Invoice> invoices) {
        Map<Long, BigDecimal> spendingByGuestId = new HashMap<>();
        for (Invoice inv : invoices) {
            if (inv.getStatus() == InvoiceStatus.PAID && inv.getBooking() != null && inv.getBooking().getGuest() != null) {
                Long gId = inv.getBooking().getGuest().getId();
                spendingByGuestId.put(gId, spendingByGuestId.getOrDefault(gId, BigDecimal.ZERO).add(inv.getTotalAmount()));
            }
        }

        List<LoyaltyTier> tiers = loyaltyTierRepository.findAll();
        LoyaltyTier diamondTier = tiers.stream().filter(t -> t.getName().contains("Kim Cương")).findFirst().orElse(null);
        LoyaltyTier goldTier = tiers.stream().filter(t -> t.getName().contains("Vàng")).findFirst().orElse(null);
        LoyaltyTier silverTier = tiers.stream().filter(t -> t.getName().contains("Bạc")).findFirst().orElse(null);
        LoyaltyTier bronzeTier = tiers.stream().filter(t -> t.getName().contains("Đồng")).findFirst().orElse(null);

        for (Guest g : guests) {
            BigDecimal totalSpent = spendingByGuestId.getOrDefault(g.getId(), BigDecimal.ZERO);
            // 1 điểm tích lũy cho mỗi 10.000 VNĐ chi tiêu
            int calculatedPoints = totalSpent.divide(new BigDecimal("10000"), 0, RoundingMode.FLOOR).intValue();

            // Cộng thêm điểm ban đầu để các khách thân thiết giữ được phân hạng đẹp
            if (calculatedPoints < 100) calculatedPoints += 150;

            g.setLoyaltyPoints(calculatedPoints);

            if (calculatedPoints >= 3000 && diamondTier != null) {
                g.setLoyaltyTier(diamondTier);
            } else if (calculatedPoints >= 1500 && goldTier != null) {
                g.setLoyaltyTier(goldTier);
            } else if (calculatedPoints >= 500 && silverTier != null) {
                g.setLoyaltyTier(silverTier);
            } else {
                g.setLoyaltyTier(bronzeTier);
            }
        }

        guestRepository.saveAll(guests);
        log.info("Đã đồng bộ điểm tích lũy và hạng hội viên thực tế cho {} khách hàng.", guests.size());
    }

    private void seedSampleNotifications(List<User> users, LocalDate today) {
        List<Notification> sampleNotifs = new ArrayList<>();
        for (User u : users) {
            if (u.getRole() == Role.OWNER || u.getRole() == Role.RECEPTIONIST || u.getRole() == Role.ADMIN) {
                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.CHECKIN_TODAY)
                        .title("Check-in hôm nay: Phòng 104")
                        .body("Khách Đặng Quốc Huy dự kiến nhận phòng 104 lúc 15:30 chiều")
                        .refType("ROOM")
                        .isRead(false)
                        .build());

                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.CHECKIN_TODAY)
                        .title("Check-in hôm nay: Phòng 204")
                        .body("Khách Ngô Thanh Hằng dự kiến nhận phòng 204 lúc 16:00 chiều")
                        .refType("ROOM")
                        .isRead(false)
                        .build());

                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.CHECKOUT_TODAY)
                        .title("Check-out hoàn tất: Phòng 103")
                        .body("Phòng 103 đã hoàn tất thủ tục trả phòng và thanh toán hóa đơn")
                        .refType("ROOM")
                        .isRead(false)
                        .build());
            }

            if (u.getRole() == Role.HOUSEKEEPER || u.getRole() == Role.OWNER || u.getRole() == Role.RECEPTIONIST) {
                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.ROOM_DIRTY)
                        .title("Phòng cần dọn: 103 (CHECKOUT)")
                        .body("Phòng 103 vừa check-out lúc 11:30, buồng phòng đang tiến hành dọn dẹp")
                        .refType("ROOM")
                        .isRead(false)
                        .build());
            }

            if (u.getRole() == Role.OWNER || u.getRole() == Role.ACCOUNTANT) {
                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.STAY_MILESTONE)
                        .title("Cột mốc doanh thu tháng 9/2026")
                        .body("Hệ thống ghi nhận tổng doanh thu lũy kế tháng 9 đã vượt 50.000.000 đ")
                        .refType("INVOICE")
                        .isRead(false)
                        .build());
            }
        }

        notificationRepository.saveAll(sampleNotifs);
        log.info("Đã tạo {} thông báo mẫu cho ngày hôm nay.", sampleNotifs.size());
    }
}
