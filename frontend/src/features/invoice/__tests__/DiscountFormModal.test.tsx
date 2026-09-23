import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiscountFormModal from '../DiscountFormModal';

describe('DiscountFormModal component', () => {
  const mockInvoice = {
    roomAmount: 1000000,
    serviceAmount: 200000,
    remainingAmount: 1200000
  };

  it('renders modal when isOpen=true with base amount', () => {
    render(
      <DiscountFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={vi.fn()}
        isLoading={false}
        invoice={mockInvoice}
      />
    );

    expect(screen.getByRole('heading', { name: 'Áp dụng giảm giá' })).toBeInTheDocument();
    expect(screen.getByText(/1\.200\.000/)).toBeInTheDocument();
  });

  it('validates discount value and requires reason', async () => {
    const handleSubmit = vi.fn();
    render(
      <DiscountFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={handleSubmit}
        isLoading={false}
        invoice={mockInvoice}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /áp dụng giảm giá/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Giá trị giảm giá phải lớn hơn 0.')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits form correctly when filled with valid data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({ success: true });
    render(
      <DiscountFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={handleSubmit}
        isLoading={false}
        invoice={mockInvoice}
      />
    );

    const valueInput = screen.getByPlaceholderText(/ví dụ: 10/i);
    fireEvent.change(valueInput, { target: { value: '10' } });

    const reasonInput = screen.getByPlaceholderText(/khách hàng thân thiết/i);
    fireEvent.change(reasonInput, { target: { value: 'Khách VIP mùa hè' } });

    const submitBtn = screen.getByRole('button', { name: /áp dụng giảm giá/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        discountType: 'PERCENTAGE',
        discountValue: 10,
        reason: 'Khách VIP mùa hè'
      });
    });
  });
});
