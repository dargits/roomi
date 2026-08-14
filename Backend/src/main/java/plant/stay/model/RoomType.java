package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "room_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name; // Tên loại phòng (vd: Deluxe, Standard Single...)

    @Column(name = "max_capacity", nullable = false)
    private Integer maxCapacity; // Sức chứa tối đa (số người)

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice; // Giá cơ bản (VNĐ)

    @Column(name = "amenities_description", columnDefinition = "TEXT")
    private String amenitiesDescription; // Mô tả tiện nghi kèm theo

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "room_type_images", joinColumns = @JoinColumn(name = "room_type_id"))
    @Column(name = "image_url", length = 500)
    @Builder.Default
    private List<String> imageUrls = new java.util.ArrayList<>(); // Danh sách ảnh của loại phòng

    @Builder.Default
    @Column(name = "active")
    private boolean active = true; // Trạng thái hoạt động

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}