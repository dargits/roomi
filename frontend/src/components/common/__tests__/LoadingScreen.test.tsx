import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingScreen, { SquareSpinner } from '../LoadingScreen';

describe('LoadingScreen Component', () => {
  it('renders default inline loading state with default message', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chờ trong giây lát')).toBeInTheDocument();
  });

  it('renders fullScreen loading overlay with elevated brand card', () => {
    const { container } = render(
      <LoadingScreen
        fullScreen
        message="Đang chuẩn bị phòng..."
        submessage="Vui lòng chờ trong giây lát"
        brandName="STAYAWAY RESORT"
      />
    );

    expect(screen.getByText('Đang chuẩn bị phòng...')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chờ trong giây lát')).toBeInTheDocument();
    expect(screen.getByText(/STAYAWAY RESORT/i)).toBeInTheDocument();

    // Check fixed overlay
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
  });

  it('renders compact inline loading state for size="sm"', () => {
    render(
      <LoadingScreen
        size="sm"
        message="Đang tải hóa đơn..."
      />
    );

    expect(screen.getByText('Đang tải hóa đơn...')).toBeInTheDocument();
  });

  it('SquareSpinner renders without errors for various sizes', () => {
    const { container, rerender } = render(<SquareSpinner size="sm" color="text-red-500" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    rerender(<SquareSpinner size="lg" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
