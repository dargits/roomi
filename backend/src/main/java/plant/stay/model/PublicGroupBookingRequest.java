package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "public_group_booking_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PublicGroupBookingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "representative_name", nullable = false, length = 150)
    private String representativeName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 150)
    private String email;

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "check_out_date", nullable = false)
    private LocalDate checkOutDate;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PublicGroupBookingRequestStatus status = PublicGroupBookingRequestStatus.PENDING;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "converted_group_booking_id")
    private GroupBooking convertedGroupBooking;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PublicGroupBookingRequestRoom> rooms = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}