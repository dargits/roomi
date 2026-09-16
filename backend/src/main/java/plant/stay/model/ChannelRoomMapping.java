package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "channel_room_mappings", uniqueConstraints = {
    @UniqueConstraint(name = "uq_channel_room_type", columnNames = {"channel_id", "room_type_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelRoomMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @Column(name = "external_room_type_code", nullable = false, length = 100)
    private String externalRoomTypeCode; // Mã loại phòng bên kênh OTA (vd: "DELUXE_DOUBLE", "STD_SINGLE")

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType; // Loại phòng trong hệ thống

    @Column(name = "allocated_rooms", nullable = false)
    @Builder.Default
    private Integer allocatedRooms = 1; // Số phòng tối đa phân bổ cho kênh đối với loại phòng này

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
