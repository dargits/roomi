import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiscount } from '../useDiscount';
import discountApi from '../../services/discountApi';

vi.mock('../../services/discountApi', () => ({
  default: {
    getActiveDiscount: vi.fn(),
    applyDiscount: vi.fn(),
    removeDiscount: vi.fn(),
    approveDiscount: vi.fn(),
    rejectDiscount: vi.fn()
  }
}));

vi.mock('../../context/ToastContext', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  },
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}));

describe('useDiscount hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch active discount successfully', async () => {
    const mockDiscount = {
      id: 1,
      calculatedAmount: 100000,
      status: 'APPLIED',
      statusMessage: 'Đã áp dụng'
    };
    (discountApi.getActiveDiscount as any).mockResolvedValue(mockDiscount);

    const { result } = renderHook(() => useDiscount(100));

    await act(async () => {
      await result.current.fetchActiveDiscount();
    });

    expect(result.current.activeDiscount).toEqual(mockDiscount);
    expect(discountApi.getActiveDiscount).toHaveBeenCalledWith(100);
  });

  it('should handle 204 or 404 when fetching active discount', async () => {
    (discountApi.getActiveDiscount as any).mockRejectedValue({
      response: { status: 404 }
    });

    const { result } = renderHook(() => useDiscount(100));

    await act(async () => {
      await result.current.fetchActiveDiscount();
    });

    expect(result.current.activeDiscount).toBeNull();
  });

  it('should apply discount and call onDiscountChange callback', async () => {
    const onDiscountChange = vi.fn();
    const appliedData = {
      id: 2,
      calculatedAmount: 50000,
      status: 'APPLIED'
    };
    (discountApi.applyDiscount as any).mockResolvedValue(appliedData);

    const { result } = renderHook(() => useDiscount(100, onDiscountChange));

    let res: any;
    await act(async () => {
      res = await result.current.applyDiscount({ discountType: 'FIXED_AMOUNT', discountValue: 50000 });
    });

    expect(res.success).toBe(true);
    expect(result.current.activeDiscount).toEqual(appliedData);
    expect(onDiscountChange).toHaveBeenCalled();
  });

  it('should remove discount successfully', async () => {
    const onDiscountChange = vi.fn();
    (discountApi.removeDiscount as any).mockResolvedValue({});

    const { result } = renderHook(() => useDiscount(100, onDiscountChange));

    let res: any;
    await act(async () => {
      res = await result.current.removeDiscount();
    });

    expect(res.success).toBe(true);
    expect(result.current.activeDiscount).toBeNull();
    expect(onDiscountChange).toHaveBeenCalled();
  });
});
