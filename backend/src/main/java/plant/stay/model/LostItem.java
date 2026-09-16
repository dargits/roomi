package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "lost_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LostItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking; // Lần lưu trú vừa kết thúc hoặc liên quan

    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    @Column(name = "found_location", nullable = false, length = 255)
    private String foundLocation;

    @Column(name = "found_date", nullable = false)
    private LocalDate foundDate;

    @Column(name = "found_time")
    private LocalTime foundTime;

    @Column(name = "storage_location", length = 255)
    private String storageLocation; // Nơi cất giữ hiện tại (kho, quầy lễ tân, ngăn kéo...)

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private LostItemStatus status = LostItemStatus.HOLDING;

    @Column(name = "retention_expiry_date")
    private LocalDate retentionExpiryDate; // Hạn lưu giữ tối đa

    // Thông tin trả đồ cho khách
    @Column(name = "receiver_name")
    private String receiverName;

    @Column(name = "receiver_phone", length = 20)
    private String receiverPhone;

    @Column(name = "receiver_note", columnDefinition = "TEXT")
    private String receiverNote;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "returned_by")
    private User returnedBy;

    // Thông tin xử lý quá hạn
    @Column(name = "disposal_method", length = 100)
    private String disposalMethod; // TIÊU HỦY, THANH LÝ, TẶNG TỪ THIỆN, SUNG CÔNG...

    @Column(name = "disposal_note", columnDefinition = "TEXT")
    private String disposalNote;

    @Column(name = "disposed_at")
    private LocalDateTime disposedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disposed_by")
    private User disposedBy;

    // Người ghi nhận & Thời gian
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
