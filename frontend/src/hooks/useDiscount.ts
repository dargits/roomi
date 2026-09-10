import { useState, useCallback } from 'react';
import discountApi from '../services/discountApi';
import { toast } from '../context/ToastContext';
import { DiscountResponse } from '../types';

/**
 * Custom hook quản lý toàn bộ state và logic cho tính năng giảm giá hóa đơn.
 */
export const useDiscount = (
  invoiceId: number | string | null | undefined,
  onDiscountChange?: () => void
) => {
  const [activeDiscount, setActiveDiscount] = useState<DiscountResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /** Tải thông tin giảm giá hiện tại */
  const fetchActiveDiscount = useCallback(async () => {
    if (!invoiceId) return;
    try {
      const data = await discountApi.getActiveDiscount(invoiceId);
      setActiveDiscount(data);
    } catch (err: any) {
      // 204 No Content → không có giảm giá
      if (err.response?.status === 204 || err.response?.status === 404) {
        setActiveDiscount(null);
      }
    }
  }, [invoiceId]);

  /** Lễ tân áp dụng giảm giá */
  const applyDiscount = useCallback(
    async (payload: any) => {
      if (!invoiceId) return { success: false, message: 'Thiếu invoiceId' };
      setIsLoading(true);
      try {
        const result = await discountApi.applyDiscount(invoiceId, payload);
        setActiveDiscount(result);
        toast.success(
          (result as any).statusMessage || 'Đã áp dụng giảm giá thành công.',
          'Giảm giá'
        );
        onDiscountChange?.();
        return { success: true, data: result };
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Không thể áp dụng giảm giá.';
        toast.error(msg, 'Lỗi giảm giá');
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [invoiceId, onDiscountChange]
  );

  /** Xóa khoản giảm giá */
  const removeDiscount = useCallback(async () => {
    if (!invoiceId) return { success: false, message: 'Thiếu invoiceId' };
    setIsLoading(true);
    try {
      await discountApi.removeDiscount(invoiceId);
      setActiveDiscount(null);
      toast.success('Đã xóa khoản giảm giá.', 'Giảm giá');
      onDiscountChange?.();
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa giảm giá.';
      toast.error(msg, 'Lỗi');
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, onDiscountChange]);

  /** Owner phê duyệt giảm giá */
  const approveDiscount = useCallback(async () => {
    if (!invoiceId) return { success: false, message: 'Thiếu invoiceId' };
    setIsLoading(true);
    try {
      const result = await discountApi.approveDiscount(invoiceId);
      setActiveDiscount(result);
      toast.success('Đã phê duyệt giảm giá. Hóa đơn đã được cập nhật.', 'Phê duyệt');
      onDiscountChange?.();
      return { success: true, data: result };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể phê duyệt giảm giá.';
      toast.error(msg, 'Lỗi');
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, onDiscountChange]);

  /** Owner từ chối giảm giá */
  const rejectDiscount = useCallback(
    async (rejectReason: string) => {
      if (!invoiceId) return { success: false, message: 'Thiếu invoiceId' };
      setIsLoading(true);
      try {
        const result = await discountApi.rejectDiscount(invoiceId, { rejectReason });
        setActiveDiscount(result);
        toast.warning('Đã từ chối khoản giảm giá.', 'Từ chối');
        onDiscountChange?.();
        return { success: true, data: result };
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Không thể từ chối giảm giá.';
        toast.error(msg, 'Lỗi');
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [invoiceId, onDiscountChange]
  );

  return {
    activeDiscount,
    isLoading,
    fetchActiveDiscount,
    applyDiscount,
    removeDiscount,
    approveDiscount,
    rejectDiscount,
  };
};

export default useDiscount;
