import { describe, it, expect } from 'vitest';
import { buildCancelPolicyDescription } from '../DepositPolicyPage';

describe('buildCancelPolicyDescription', () => {
  it('tự động tạo điều khoản hủy khi có cả giờ xác nhận và hạn trước check-in', () => {
    const text = buildCancelPolicyDescription('40', '12', '12');
    expect(text).toContain('Miễn phí hủy trong 12h sau khi xác nhận hoặc trước giờ nhận phòng 12h');
    expect(text).toContain('trừ 40% tiền cọc');
    expect(text).toContain('hoàn lại 60% cọc');
  });

  it('tự động tạo điều khoản khi chỉ có hạn trước check-in', () => {
    const text = buildCancelPolicyDescription('50', '0', '24');
    expect(text).toContain('Miễn phí hủy trước giờ nhận phòng 24h');
    expect(text).toContain('trừ 50% tiền cọc');
    expect(text).toContain('hoàn lại 50% cọc');
  });

  it('xử lý khi phạt 100% không hoàn cọc', () => {
    const text = buildCancelPolicyDescription('100', '24', '48');
    expect(text).toContain('thu 100% tiền cọc (không hoàn cọc)');
  });

  it('xử lý khi miễn phí hủy 0% phạt', () => {
    const text = buildCancelPolicyDescription('0', '24', '48');
    expect(text).toBe('Miễn phí hủy phòng (hoàn 100% tiền cọc).');
  });
});
