import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AntiSpamSlider from '../AntiSpamSlider';

describe('AntiSpamSlider Component', () => {
  it('renders unverified state correctly', () => {
    const onVerify = vi.fn();
    render(<AntiSpamSlider isVerified={false} onVerify={onVerify} />);

    expect(screen.getByText('Xác thực chống đặt ảo & spam')).toBeInTheDocument();
    expect(screen.getByText('Cần xác nhận')).toBeInTheDocument();
    expect(screen.getByText(/Trượt sang phải để xác nhận/)).toBeInTheDocument();
  });

  it('renders verified state correctly', () => {
    const onVerify = vi.fn();
    render(<AntiSpamSlider isVerified={true} onVerify={onVerify} />);

    expect(screen.getByText('✓ Đã xác thực người thật')).toBeInTheDocument();
    expect(screen.getByText('Đã xác thực thành công')).toBeInTheDocument();
  });

  it('renders disabled state when disabled prop is provided', () => {
    const onVerify = vi.fn();
    const { container } = render(<AntiSpamSlider isVerified={false} onVerify={onVerify} disabled={true} />);

    const track = container.querySelector('.opacity-50.pointer-events-none');
    expect(track).toBeInTheDocument();
  });
});
