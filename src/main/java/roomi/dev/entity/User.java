package roomi.dev.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    private String userName;
    @Column(unique = true)
    private String account;
    private String password;
    @Column(unique = true)
    private String email;
    @Column(unique = true)
    private String phone;
    private String avatarUrl;
    @ManyToOne
    @JoinColumn(name = "role_id") // Optional but recommended: names the foreign key column explicitly
    private Role role;

    @OneToOne
    private Session session;
}
