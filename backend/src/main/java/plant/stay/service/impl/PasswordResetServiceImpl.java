package plant.stay.service.impl;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import plant.stay.dto.response.AccountCheckResponse;
import plant.stay.exception.BusinessException;
import plant.stay.dto.request.ForceChangePasswordRequest;
import plant.stay.dto.request.ForgotPasswordRequest;
import plant.stay.dto.request.ResetPasswordWithTokenRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.PasswordResetItemResponse;
import plant.stay.dto.response.VerifyResetTokenResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.PasswordResetRequest;
import plant.stay.model.PasswordResetStatus;
import plant.stay.model.User;
import plant.stay.repository.PasswordResetRequestRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.PasswordResetService;
import plant.stay.util.HashUtil;

import java.net.URI;
import java.security.SecureRandom;
import java.time.Duration;
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

    @Value("${app.frontend-url:${app.domain:https://stayaway.io.vn}}")
    private String appFrontendUrl;

    private static final String UPPERCASE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWERCASE_CHARS = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGIT_CHARS = "23456789";
    private static final String SPECIAL_CHARS = "!@#$%^&*";
    private static final String ALL_COMBINED_CHARS = UPPERCASE_CHARS + LOWERCASE_CHARS + DIGIT_CHARS + SPECIAL_CHARS;
    private static final int TEMP_PASSWORD_LENGTH = 12;
    private static final int RESET_TOKEN_EXPIRE_MINUTES = 10;

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

        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            throw new BusinessException("Tài khoản '" + account + "' (" + user.getName() + ") chưa được cài đặt địa chỉ email. Vui lòng liên hệ trực tiếp Quản trị viên để được hỗ trợ!");
        }

        // Chống spam: Nếu vừa gửi yêu cầu trong vòng 60 giây, yêu cầu đợi
        Optional<PasswordResetRequest> recentReqOpt = passwordResetRequestRepository
                .findFirstByUserIdAndStatusOrderByRequestedAtDesc(user.getId(), PasswordResetStatus.PENDING);
        if (recentReqOpt.isPresent()) {
            PasswordResetRequest recent = recentReqOpt.get();
            if (recent.getRequestedAt() != null && recent.getRequestedAt().isAfter(LocalDateTime.now().minusSeconds(60))) {
                throw new BusinessException("Hệ thống đã gửi liên kết đặt lại mật khẩu gần đây. Vui lòng kiểm tra hộp thư đến (Inbox) / thư rác (Spam) hoặc đợi 1 phút trước khi gửi lại!");
            }
            // Vô hiệu hóa yêu cầu chờ cũ để dùng yêu cầu mới
            recent.setStatus(PasswordResetStatus.EXPIRED);
            passwordResetRequestRepository.save(recent);
        }

        // Sinh token ngẫu nhiên không thể brute-force (256-bit entropy) và thiết lập thời hạn 10 phút
        String token = generateSecureToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRE_MINUTES);
        String resetLink = resolveFrontendBaseUrl() + "/reset-password/" + token;

        PasswordResetRequest request = PasswordResetRequest.builder()
                .account(account)
                .user(user)
                .resetToken(token)
                .expiresAt(expiresAt)
                .status(PasswordResetStatus.PENDING)
                .build();
        passwordResetRequestRepository.save(request);

        // Gửi email chứa liên kết đặt lại mật khẩu (hiệu lực 10 phút)
        boolean emailSent = emailService.sendPasswordResetLinkEmail(
                user.getEmail(),
                user.getName(),
                user.getAccount(),
                resetLink,
                RESET_TOKEN_EXPIRE_MINUTES
        );

        String maskedEmail = maskEmail(user.getEmail());
        auditLogService.log("User", user.getId(), "REQUEST_PASSWORD_RESET", user,
                "Yêu cầu đặt lại mật khẩu cho tài khoản: " + account + " (" + user.getName() + "). Đã gửi link tới: " + maskedEmail);

        if (!emailSent) {
            return new MessageResponse("Hệ thống đã tạo liên kết đặt lại mật khẩu nhưng việc gửi email tự động tạm thời bị gián đoạn. Vui lòng liên hệ Quản trị viên để nhận liên kết!");
        }

        return new MessageResponse("Liên kết đặt lại mật khẩu (hiệu lực 10 phút) đã được gửi đến email " + maskedEmail + " của bạn. Vui lòng kiểm tra hộp thư đến hoặc mục thư rác (Spam)!");
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
            throw new IllegalArgumentException("Tài khoản này không tồn tại trong hệ thống nên không thể cấp lại mật khẩu.");
        }

        // Không cho phép Admin/Chủ cơ sở tự cấp lại mật khẩu cho chính bản thân mình
        if (adminActor != null && user.getId().equals(adminActor.getId())) {
            throw new BusinessException("Bạn không thể tự cấp lại mật khẩu cho chính tài khoản của mình. Vui lòng nhờ Quản trị viên/Chủ cơ sở khác thực hiện hoặc đổi mật khẩu trong mục Thông tin cá nhân!");
        }

        // Sinh token bảo mật cao chống brute-force và tạo link hiệu lực 10 phút
        String token = generateSecureToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRE_MINUTES);
        String resetLink = resolveFrontendBaseUrl() + "/reset-password/" + token;

        // Cập nhật request
        request.setStatus(PasswordResetStatus.ISSUED);
        request.setResetToken(token);
        request.setPlainTempPassword(resetLink); // Lưu link để Admin có thể sao chép nếu cần
        request.setExpiresAt(expiresAt);
        request.setIssuedBy(adminActor);
        request.setIssuedAt(LocalDateTime.now());
        passwordResetRequestRepository.save(request);

        // Gửi email chứa liên kết đặt lại mật khẩu 10 phút tới người dùng
        boolean emailSent = false;
        String emailMessage;
        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            emailSent = emailService.sendPasswordResetLinkEmail(user.getEmail(), user.getName(), user.getAccount(), resetLink, RESET_TOKEN_EXPIRE_MINUTES);
            if (emailSent) {
                emailMessage = "Đã gửi liên kết đặt lại mật khẩu (hiệu lực 10 phút) về email " + maskEmail(user.getEmail()) + " của người dùng.";
                auditLogService.log("PasswordResetRequest", request.getId(), "ISSUE_RESET_LINK", adminActor,
                        "Quản trị viên " + adminActor.getName() + " đã phê duyệt và gửi link đặt lại mật khẩu (hiệu lực 10 phút) tới " + user.getEmail() + " cho tài khoản: " + user.getAccount());
            } else {
                emailMessage = "Hệ thống tạm thời chưa gửi được email tự động tới " + user.getEmail() + ". Quản trị viên có thể sao chép liên kết đặt lại mật khẩu bên dưới để gửi trực tiếp cho nhân viên.";
                auditLogService.log("PasswordResetRequest", request.getId(), "ISSUE_RESET_LINK", adminActor,
                        "Quản trị viên " + adminActor.getName() + " đã phê duyệt link đặt lại mật khẩu cho tài khoản: " + user.getAccount() + " (Gửi email thất bại)");
            }
        } else {
            emailMessage = "Tài khoản chưa có địa chỉ email. Quản trị viên vui lòng sao chép liên kết đặt lại mật khẩu bên dưới để gửi trực tiếp cho nhân viên.";
            auditLogService.log("PasswordResetRequest", request.getId(), "ISSUE_RESET_LINK", adminActor,
                    "Quản trị viên " + adminActor.getName() + " đã cấp link đặt lại mật khẩu cho tài khoản: " + user.getAccount() + " (Không có email)");
        }

        PasswordResetItemResponse response = toDto(request);
        response.setEmailSent(emailSent);
        response.setEmailMessage(emailMessage);
        response.setResetToken(token);
        response.setResetLink(resetLink);
        return response;
    }

    @Override
    @Transactional
    public PasswordResetItemResponse rejectRequest(Long requestId, User adminActor) {
        PasswordResetRequest request = passwordResetRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu cấp lại mật khẩu #" + requestId));

        if (request.getStatus() != PasswordResetStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể từ chối yêu cầu đang ở trạng thái Chờ cấp (trạng thái hiện tại: " + request.getStatus() + ")");
        }

        User user = request.getUser();
        if (adminActor != null && user != null && user.getId().equals(adminActor.getId())) {
            throw new BusinessException("Bạn không thể tự từ chối yêu cầu cấp lại mật khẩu của chính tài khoản mình.");
        }

        request.setStatus(PasswordResetStatus.REJECTED);
        request.setIssuedBy(adminActor);
        request.setIssuedAt(LocalDateTime.now());
        passwordResetRequestRepository.save(request);

        auditLogService.log("PasswordResetRequest", request.getId(), "REJECT_PASSWORD_RESET", adminActor,
                "Quản trị viên " + adminActor.getName() + " đã từ chối yêu cầu cấp lại mật khẩu cho tài khoản: " + (user != null ? user.getAccount() : request.getAccount()));

        return toDto(request);
    }

    @Override
    @Transactional
    public VerifyResetTokenResponse verifyResetToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return VerifyResetTokenResponse.builder()
                    .valid(false)
                    .message("Mã token liên kết không hợp lệ.")
                    .build();
        }

        String cleanToken = token.trim();
        Optional<PasswordResetRequest> reqOpt = passwordResetRequestRepository.findByResetToken(cleanToken);
        if (reqOpt.isEmpty()) {
            return VerifyResetTokenResponse.builder()
                    .valid(false)
                    .message("Liên kết đặt lại mật khẩu không tồn tại hoặc đã bị hủy bỏ.")
                    .build();
        }

        PasswordResetRequest request = reqOpt.get();
        if (request.getStatus() == PasswordResetStatus.USED) {
            return VerifyResetTokenResponse.builder()
                    .valid(false)
                    .message("Liên kết đặt lại mật khẩu này đã được sử dụng trước đó.")
                    .build();
        }

        if (request.getStatus() == PasswordResetStatus.REJECTED) {
            return VerifyResetTokenResponse.builder()
                    .valid(false)
                    .message("Yêu cầu đặt lại mật khẩu này đã bị từ chối.")
                    .build();
        }

        if (request.getExpiresAt() != null && request.getExpiresAt().isBefore(LocalDateTime.now())) {
            if (request.getStatus() != PasswordResetStatus.EXPIRED) {
                request.setStatus(PasswordResetStatus.EXPIRED);
                passwordResetRequestRepository.save(request);
            }
            return VerifyResetTokenResponse.builder()
                    .valid(false)
                    .message("Liên kết đặt lại mật khẩu đã hết hiệu lực (quá 10 phút). Vui lòng yêu cầu liên kết mới!")
                    .build();
        }

        long remainingSeconds = 0;
        if (request.getExpiresAt() != null) {
            remainingSeconds = Math.max(0, Duration.between(LocalDateTime.now(), request.getExpiresAt()).getSeconds());
        }

        User user = request.getUser();
        return VerifyResetTokenResponse.builder()
                .valid(true)
                .account(request.getAccount())
                .userName(user != null ? user.getName() : null)
                .userEmail(user != null ? maskEmail(user.getEmail()) : null)
                .remainingSeconds(remainingSeconds)
                .message("Liên kết hợp lệ.")
                .build();
    }

    @Override
    @Transactional
    public MessageResponse resetPasswordWithToken(ResetPasswordWithTokenRequest req) {
        if (req.getToken() == null || req.getToken().trim().isEmpty()) {
            throw new BusinessException("Mã token không được để trống!");
        }

        String cleanToken = req.getToken().trim();
        PasswordResetRequest request = passwordResetRequestRepository.findByResetToken(cleanToken)
                .orElseThrow(() -> new BusinessException("Liên kết đặt lại mật khẩu không tồn tại hoặc không hợp lệ!"));

        if (request.getStatus() == PasswordResetStatus.USED) {
            throw new BusinessException("Liên kết đặt lại mật khẩu này đã được sử dụng!");
        }

        if (request.getStatus() == PasswordResetStatus.REJECTED) {
            throw new BusinessException("Yêu cầu đặt lại mật khẩu này đã bị từ chối!");
        }

        if (request.getExpiresAt() != null && request.getExpiresAt().isBefore(LocalDateTime.now())) {
            request.setStatus(PasswordResetStatus.EXPIRED);
            passwordResetRequestRepository.save(request);
            throw new BusinessException("Liên kết đặt lại mật khẩu đã hết hiệu lực (quá 10 phút). Vui lòng gửi lại yêu cầu mới!");
        }

        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new BusinessException("Mật khẩu mới và xác nhận mật khẩu không khớp!");
        }

        if (req.getNewPassword().length() < 6) {
            throw new BusinessException("Mật khẩu mới phải có tối thiểu 6 ký tự!");
        }

        User user = request.getUser();
        if (user == null) {
            throw new BusinessException("Tài khoản người dùng liên kết không tồn tại!");
        }

        // Đổi mật khẩu mới và gỡ cờ bắt buộc đổi mật khẩu
        user.setPassword(HashUtil.hashPassword(req.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        // Cập nhật trạng thái request thành USED
        request.setStatus(PasswordResetStatus.USED);
        request.setUsedAt(LocalDateTime.now());
        passwordResetRequestRepository.save(request);

        auditLogService.log("User", user.getId(), "RESET_PASSWORD_WITH_TOKEN_SUCCESS", user,
                "Người dùng " + user.getName() + " (" + user.getAccount() + ") đã đặt lại mật khẩu thành công qua liên kết token.");

        return new MessageResponse("Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.");
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
        String link = r.getResetToken() != null ? resolveFrontendBaseUrl() + "/reset-password/" + r.getResetToken() : null;
        return PasswordResetItemResponse.builder()
                .id(r.getId())
                .userId(u != null ? u.getId() : null)
                .account(r.getAccount())
                .userName(u != null ? u.getName() : null)
                .userEmail(u != null ? u.getEmail() : null)
                .userRole(u != null ? u.getRole() : null)
                .status(r.getStatus())
                .plainTempPassword(r.getPlainTempPassword())
                .resetToken(r.getResetToken())
                .resetLink(link)
                .expiresAt(r.getExpiresAt())
                .requestedAt(r.getRequestedAt())
                .issuedByName(r.getIssuedBy() != null ? r.getIssuedBy().getName() : null)
                .issuedAt(r.getIssuedAt())
                .usedAt(r.getUsedAt())
                .build();
    }

    /**
     * Sinh token ngẫu nhiên bảo mật cao (CSPRNG), 32 bytes (256-bit entropy),
     * định dạng 64 ký tự Hexadecimal, tuyệt đối chống tấn công Brute-Force (hơn 1.15 x 10^77 tổ hợp).
     */
    private String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        StringBuilder sb = new StringBuilder(64);
        for (byte b : randomBytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    /**
     * Tự động nhận diện Base URL của Frontend (ưu tiên theo Origin / Referer của request đang thực hiện,
     * sau đó dự phòng sang cấu hình app.frontend-url / app.domain).
     */
    private String resolveFrontendBaseUrl() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null && attributes.getRequest() != null) {
                HttpServletRequest request = attributes.getRequest();
                String origin = request.getHeader("Origin");
                if (origin != null && !origin.isBlank()) {
                    return origin.replaceAll("/+$", "");
                }
                String referer = request.getHeader("Referer");
                if (referer != null && !referer.isBlank()) {
                    URI uri = URI.create(referer);
                    String scheme = uri.getScheme();
                    String host = uri.getHost();
                    int port = uri.getPort();
                    if (port > 0 && port != 80 && port != 443) {
                        return scheme + "://" + host + ":" + port;
                    }
                    return scheme + "://" + host;
                }
            }
        } catch (Exception ignored) {}

        if (appFrontendUrl != null && !appFrontendUrl.isBlank()) {
            return appFrontendUrl.replaceAll("/+$", "");
        }
        return "https://stayaway.io.vn";
    }

    /**
     * Che bớt địa chỉ email vì lý do bảo mật riêng tư (ví dụ: ng***n@domain.com)
     */
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int atIndex = email.indexOf("@");
        String namePart = email.substring(0, atIndex);
        String domainPart = email.substring(atIndex);
        if (namePart.length() <= 2) {
            return namePart.charAt(0) + "***" + domainPart;
        }
        return namePart.substring(0, 2) + "***" + namePart.charAt(namePart.length() - 1) + domainPart;
    }
}
