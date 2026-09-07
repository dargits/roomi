package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "room_stay_guests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomStayGuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false, length = 150)
    private String fullName;

    @Column(name = "birth_year")
    private Integer birthYear;

    @Column(name = "document_type", length = 30)
    @Builder.Default
    private String documentType = "CCCD"; // CCCD, PASSPORT, OTHER

    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @Column(name = "is_child")
    @Builder.Default
    private Boolean isChild = false;

    @Column(name = "is_primary_guest")
    @Builder.Default
    private Boolean isPrimaryGuest = false;

    @Column(name = "check_in_at")
    @Builder.Default
    private LocalDateTime checkInAt = LocalDateTime.now();

    @Column(name = "left_early_at")
    private LocalDateTime leftEarlyAt;

    @Column(name = "is_exported")
    @Builder.Default
    private Boolean isExported = false; // Đã nằm trong bản khai báo lưu trú đã kết xuất

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
