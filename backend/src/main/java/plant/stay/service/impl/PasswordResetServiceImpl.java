package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.AccountCheckResponse;
import plant.stay.exception.BusinessException;
import plant.stay.dto.request.ForceChangePasswordRequest;
import plant.stay.dto.request.ForgotPasswordRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.PasswordResetItemResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.PasswordResetRequest;
import plant.stay.model.PasswordResetStatus;
import plant.stay.model.User;
import plant.stay.repository.PasswordResetRequestRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.PasswordResetService;
import plant.stay.util.HashUtil;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PasswordResetServiceImpl implements PasswordResetService {

    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final plant.stay.service.EmailService emailService;
    private static final String UPPERCASE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Loại trừ chữ I, O dễ gây nhầm lẫn
    private static final String LOWERCASE_CHARS = "abcdefghijkmnopqrstuvwxyz"; // Loại trừ chữ l
    private static final String DIGIT_CHARS = "23456789";                   // Loại trừ số 0, 1
    private static final String SPECIAL_CHARS = "!@#$%^&*";
    private static final String ALL_COMBINED_CHARS = UPPERCASE_CHARS + LOWERCASE_CHARS + DIGIT_CHARS + SPECIAL_CHARS;
    private static final int TEMP_PASSWORD_LENGTH = 12;

    @Override
    @Transactional(readOnly = true)
    public AccountCheckResponse checkAccount(String account) {
        if (account == null || account.trim().isEmpty()) {
            return AccountCheckResponse.builder()
                    .exists(false)
                    .build();
        }

        String cleanAccount = account.trim();
        Optional<User> userOpt = userRepository.findByAccount(cleanAccount);
        if (userOpt.isEmpty()) {
            return AccountCheckResponse.builder()
                    .exists(false)
                    .account(cleanAccount)
                    .build();
        }

        User user = userOpt.get();
        return AccountCheckResponse.builder()
                .exists(true)
                .account(user.getAccount())
                .name(user.getName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .active(user.isActive())
                .build();
    }

    @Override
    @Transactional
    public MessageResponse requestPasswordReset(ForgotPasswordRequest req) {
        String account = req.getAccount() != null ? req.getAccount().trim() : "";
        if (account.isEmpty()) {
            throw new BusinessException("Vui lòng nhập tên tài khoản đăng nhập!");
        }

        User user = userRepository.findByAccount(account)
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản '" + account + "' không tồn tại trong hệ thống. Vui lòng kiểm tra lại!"));

        if (!user.isActive()) {
            throw new BusinessException("Tài khoản '" + account + "' đang bị vô hiệu hóa hoặc khóa. Vui lòng liên hệ trực tiếp Quản trị viên cơ sở!");
        }

        PasswordResetRequest request = PasswordResetRequest.builder()
                .account(account)
                .user(user)
                .status(PasswordResetStatus.PENDING)
                .build();
        passwordResetRequestRepository.save(request);

        auditLogService.log("User", user.getId(), "REQUEST_PASSWORD_RESET", user,
                "Yêu cầu cấp lại mật khẩu cho tài khoản: " + account + " (" + user.getName() + ")");

        return new MessageResponse("Yêu cầu cấp lại mật khẩu cho tài khoản '" + account + "' (" + user.getName() + ") đã được gửi tới Quản trị viên thành công. Vui lòng chờ phê duyệt!");
    }

    @Override
    @Transactional(readOnly = true)
    public List<PasswordResetItemResponse> getAllRequests() {
        return passwordResetRequestRepository.findAllByOrderByRequestedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getPendingCount() {
        return passwordResetRequestRepository.countByStatus(PasswordResetStatus.PENDING);
    }

    @Override
    @Transactional
    public PasswordResetItemResponse issueTempPassword(Long requestId, User adminActor) {
        PasswordResetRequest request = passwordResetRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu cấp lại mật khẩu #" + requestId));

        if (request.getStatus() != PasswordResetStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu này đã được xử lý (trạng thái: " + request.getStatus() + ")");
        }

        User user = request.getUser();
        if (user == null) {
            throw new IllegalArgumentException("Tài khoản này không tồn tại trong hệ thống nên không thể cấp mật khẩu tạm.");
        }

        // Sinh mật khẩu tạm thời bảo mật cao (12 ký tự, đa dạng chữ hoa, thường, số, ký tự đặc biệt)
        String tempPassword = generateSecureTempPassword();

        // Cập nhật mật khẩu mã hóa cho user và bật cờ bắt buộc đổi mật khẩu
        user.setPassword(HashUtil.hashPassword(tempPassword));
        user.setMustChangePassword(true);
        userRepository.save(user);

        // Cập nhật request
        request.setStatus(PasswordResetStatus.ISSUED);
        request.setTempPasswordHash(user.getPassword());
        request.setPlainTempPassword(tempPassword);
        request.setExpiresAt(LocalDateTime.now().plusHours(24));
        request.setIssuedBy(adminActor);
        request.setIssuedAt(LocalDateTime.now());
        passwordResetRequestRepository.save(request);

        auditLogService.log("PasswordResetRequest", request.getId(), "ISSUE_TEMP_PASSWORD", adminActor,
                "Quản trị viên " + adminActor.getName() + " đã cấp mật khẩu tạm thời (hiệu lực 24h) cho tài khoản: " + user.getAccount());

        // Gửi email chứa mật khẩu tạm thời tới người nhận qua Resend Service
        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            emailService.sendTempPasswordEmail(user.getEmail(), user.getName(), user.getAccount(), tempPassword);
        }

        return toDto(request);
    }

    @Override
    @Transactional
    public MessageResponse forceChangePassword(ForceChangePasswordRequest req) {
        String account = req.getAccount() != null ? req.getAccount().trim() : "";
        User user = userRepository.findByAccount(account)
                .orElseThrow(() -> new IllegalArgumentException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        if (!HashUtil.checkPassword(req.getTempPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu tạm thời không chính xác!");
        }

        if (!user.isMustChangePassword()) {
            throw new IllegalArgumentException("Tài khoản của bạn không nằm trong danh sách yêu cầu đổi mật khẩu tạm thời!");
        }

        // Kiểm tra hiệu lực 24h của mật khẩu tạm
        Optional<PasswordResetRequest> issuedOpt = passwordResetRequestRepository
                .findFirstByUserIdAndStatusOrderByRequestedAtDesc(user.getId(), PasswordResetStatus.ISSUED);

        if (issuedOpt.isPresent()) {
            PasswordResetRequest issuedReq = issuedOpt.get();
            if (issuedReq.getExpiresAt() != null && issuedReq.getExpiresAt().isBefore(LocalDateTime.now())) {
                issuedReq.setStatus(PasswordResetStatus.EXPIRED);
                passwordResetRequestRepository.save(issuedReq);
                throw new IllegalArgumentException("Mật khẩu tạm thời đã hết hiệu lực (quá 24 giờ). Vui lòng liên hệ Quản trị viên cấp lại!");
            }
            // Đánh dấu đã dùng
            issuedReq.setStatus(PasswordResetStatus.USED);
            issuedReq.setUsedAt(LocalDateTime.now());
            issuedReq.setPlainTempPassword(null); // Xóa plain text sau khi dùng
            passwordResetRequestRepository.save(issuedReq);
        }

        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp!");
        }

        if (HashUtil.checkPassword(req.getNewPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới không được trùng với mật khẩu tạm thời!");
        }

        // Đổi mật khẩu mới và gỡ cờ bắt buộc đổi
        user.setPassword(HashUtil.hashPassword(req.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        auditLogService.log("User", user.getId(), "FORCE_CHANGE_PASSWORD_SUCCESS", user,
                "Người dùng " + user.getName() + " đã đổi mật khẩu mới thành công từ mật khẩu tạm thời.");

        return new MessageResponse("Đổi mật khẩu mới thành công! Bây giờ bạn có thể đăng nhập bình thường.");
    }

    private PasswordResetItemResponse toDto(PasswordResetRequest r) {
        User u = r.getUser();
        return PasswordResetItemResponse.builder()
                .id(r.getId())
                .account(r.getAccount())
                .userName(u != null ? u.getName() : null)
                .userRole(u != null ? u.getRole() : null)
                .status(r.getStatus())
                .plainTempPassword(r.getPlainTempPassword())
                .expiresAt(r.getExpiresAt())
                .requestedAt(r.getRequestedAt())
                .issuedByName(r.getIssuedBy() != null ? r.getIssuedBy().getName() : null)
                .issuedAt(r.getIssuedAt())
                .usedAt(r.getUsedAt())
                .build();
    }

    /**
     * Sinh mật khẩu tạm thời ngẫu nhiên có độ entropy cao, chống tấn công Brute-Force:
     * - Độ dài: 12 ký tự
     * - Bộ sinh số ngẫu nhiên mật mã học (CSPRNG - SecureRandom)
     * - Bắt buộc bao gồm: Chữ hoa, Chữ thường, Chữ số, Ký tự đặc biệt
     * - Không gian mẫu: ~ 68^12 > 5.2 x 10^21 tổ hợp
     */
    private String generateSecureTempPassword() {
        SecureRandom random = new SecureRandom();
        List<Character> characters = new java.util.ArrayList<>(TEMP_PASSWORD_LENGTH);

        // Đảm bảo có tối thiểu mỗi nhóm ký tự: 2 hoa, 2 thường, 2 số, 2 đặc biệt
        characters.add(UPPERCASE_CHARS.charAt(random.nextInt(UPPERCASE_CHARS.length())));
        characters.add(UPPERCASE_CHARS.charAt(random.nextInt(UPPERCASE_CHARS.length())));
        characters.add(LOWERCASE_CHARS.charAt(random.nextInt(LOWERCASE_CHARS.length())));
        characters.add(LOWERCASE_CHARS.charAt(random.nextInt(LOWERCASE_CHARS.length())));
        characters.add(DIGIT_CHARS.charAt(random.nextInt(DIGIT_CHARS.length())));
        characters.add(DIGIT_CHARS.charAt(random.nextInt(DIGIT_CHARS.length())));
        characters.add(SPECIAL_CHARS.charAt(random.nextInt(SPECIAL_CHARS.length())));
        characters.add(SPECIAL_CHARS.charAt(random.nextInt(SPECIAL_CHARS.length())));

        // Điền các vị trí còn lại từ toàn bộ bảng ký tự kết hợp
        for (int i = characters.size(); i < TEMP_PASSWORD_LENGTH; i++) {
            characters.add(ALL_COMBINED_CHARS.charAt(random.nextInt(ALL_COMBINED_CHARS.length())));
        }

        // Xáo trộn ngẫu nhiên toàn bộ vị trí ký tự (Fisher-Yates Shuffle)
        java.util.Collections.shuffle(characters, random);

        StringBuilder passwordBuilder = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (char ch : characters) {
            passwordBuilder.append(ch);
        }
        return passwordBuilder.toString();
    }
}
