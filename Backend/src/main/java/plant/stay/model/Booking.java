package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bookings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_id", nullable = false)
    private Guest guest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    // Phòng cụ thể — nullable cho đến khi được gán
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_booking_id")
    private GroupBooking groupBooking;

    @ManyToMany
    @JoinTable(
        name = "booking_staying_guests",
        joinColumns = @JoinColumn(name = "booking_id"),
        inverseJoinColumns = @JoinColumn(name = "guest_id")
    )
    @Builder.Default
    private List<Guest> stayingGuests = new ArrayList<>();

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "check_out_date", nullable = false)
    private LocalDate checkOutDate;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @OneToOne(mappedBy = "booking", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private StayDeclaration stayDeclaration;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.NEW;

    @Column(name = "expected_price", precision = 12, scale = 2)
    private BigDecimal expectedPrice; // Giá dự kiến lúc đặt

    @Column(name = "actual_price", precision = 12, scale = 2)
    private BigDecimal actualPrice; // Giá thực tế (cập nhật khi check-out)

    @Column(name = "cancellation_fee", precision = 12, scale = 2)
    private BigDecimal cancellationFee; // Phí hủy theo chính sách

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(length = 20)
    @Builder.Default
    private String source = "WALKIN"; // WALKIN hoặc ONLINE

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy; // Nhân viên tạo booking

    @Column(name = "deposit_amount", precision = 12, scale = 2)
    private BigDecimal depositAmount;

    @Version
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
