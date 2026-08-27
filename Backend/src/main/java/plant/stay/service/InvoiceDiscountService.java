package plant.stay.service;

import plant.stay.dto.request.ApplyDiscountRequest;
import plant.stay.dto.request.RejectDiscountRequest;
import plant.stay.dto.response.DiscountResponse;
import plant.stay.model.User;

/**
 * Service interface quản lý toàn bộ luồng giảm giá trên hóa đơn.
 */
public interface InvoiceDiscountService {

    /**
     * Lễ tân áp dụng khoản giảm giá cho hóa đơn.
     * Tự động duyệt hoặc chuyển trạng thái PENDING_DISCOUNT_APPROVAL tùy ngưỡng cấu hình.
     *
     * @param invoiceId ID hóa đơn
     * @param request   Thông tin giảm giá (loại, giá trị, lý do)
     * @param actor     Lễ tân thực hiện thao tác
     * @return DiscountResponse chứa kết quả và trạng thái phê duyệt
     */
    DiscountResponse applyDiscount(Long invoiceId, ApplyDiscountRequest request, User actor);

    /**
     * Xóa/Gỡ khoản giảm giá hiện tại khỏi hóa đơn.
     * Chỉ cho phép khi hóa đơn chưa thanh toán (không phải PAID).
     *
     * @param invoiceId ID hóa đơn
     * @param actor     Người thực hiện
     */
    void removeDiscount(Long invoiceId, User actor);

    /**
     * Chủ cơ sở phê duyệt khoản giảm giá đang chờ.
     *
     * @param invoiceId ID hóa đơn
     * @param actor     Chủ cơ sở thực hiện
     * @return DiscountResponse sau khi được duyệt
     */
    DiscountResponse approveDiscount(Long invoiceId, User actor);

    /**
     * Chủ cơ sở từ chối khoản giảm giá đang chờ.
     *
     * @param invoiceId ID hóa đơn
     * @param request   Lý do từ chối
     * @param actor     Chủ cơ sở thực hiện
     * @return DiscountResponse sau khi bị từ chối
     */
    DiscountResponse rejectDiscount(Long invoiceId, RejectDiscountRequest request, User actor);

    /**
     * Lấy thông tin khoản giảm giá đang hiệu lực của hóa đơn.
     *
     * @param invoiceId ID hóa đơn
     * @return DiscountResponse hoặc null nếu chưa có giảm giá
     */
    DiscountResponse getActiveDiscount(Long invoiceId);
}
