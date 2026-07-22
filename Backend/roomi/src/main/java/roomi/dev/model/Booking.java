package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Entity
@Table(name = "bookings", indexes = {
    @Index(name = "idx_bookings_room_dates", columnList = "room_id, check_in_date, check_out_date")
})
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "guest_id", nullable = false)
    private Guest guest;
    
    @ManyToOne
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;
    
    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;
    
    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;
    
    @Column(name = "check_out_date", nullable = false)
    private LocalDate checkOutDate;
    
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private Status status = Status.NEW;
    
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private Source source = Source.WALK_IN;
    
    @Column(name = "expected_price", precision = 12)
    private BigDecimal expectedPrice;
    
    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
    
    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    public enum Status {
        NEW, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW
    }
    
    public enum Source {
        WALK_IN, PHONE, EXTERNAL_CHANNEL, BOOKING_PORTAL
    }
}