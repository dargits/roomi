import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiscountPanel from '../DiscountPanel';
import { InvoiceDiscountResponse } from '../../../types';

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true)
  })
}));

describe('DiscountPanel component', () => {
  const mockDiscount: InvoiceDiscountResponse = {
    id: 1,
    invoiceId: 100,
    discountType: 'FIXED_AMOUNT',
    discountValue: 200000,
    calculatedAmount: 200000,
    status: 'APPLIED',
    reason: 'Khách VIP',
    createdByName: 'Lễ tân 1',
    createdAt: '2026-09-23T10:00:00'
  };

  it('renders discount amount and reason correctly', () => {
    render(
      <DiscountPanel
        discount={mockDiscount}
        onRemove={() => {}}
        onApprove={() => {}}
        onReject={() => {}}
      />
    );

    expect(screen.getAllByText(/200\.000/)[0]).toBeInTheDocument();
    expect(screen.getByText(/Khách VIP/)).toBeInTheDocument();
    expect(screen.getByText('Đã áp dụng')).toBeInTheDocument();
  });

  it('renders approve and reject buttons for OWNER when status is PENDING_APPROVAL', async () => {
    const pendingDiscount: InvoiceDiscountResponse = {
      ...mockDiscount,
      status: 'PENDING_APPROVAL'
    };

    const handleApprove = vi.fn();

    render(
      <DiscountPanel
        discount={pendingDiscount}
        userRole="OWNER"
        onRemove={() => {}}
        onApprove={handleApprove}
        onReject={() => {}}
      />
    );

    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
    const approveBtn = screen.getByRole('button', { name: /duyệt/i });
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);
    await waitFor(() => {
      expect(handleApprove).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onRemove when clicking delete discount button', async () => {
    const handleRemove = vi.fn();
    render(
      <DiscountPanel
        discount={mockDiscount}
        onRemove={handleRemove}
        onApprove={() => {}}
        onReject={() => {}}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /xóa giảm giá/i });
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });
});
