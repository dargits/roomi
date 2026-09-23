import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalErrorBoundary from '../GlobalErrorBoundary';

const BadComponent = () => {
  throw new Error('Test crash');
};

const GoodComponent = () => <div>Ứng dụng hoạt động bình thường</div>;

describe('GlobalErrorBoundary component', () => {
  beforeEach(() => {
    // Suppress console.error from error boundary in test logs
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <GlobalErrorBoundary>
        <GoodComponent />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Ứng dụng hoạt động bình thường')).toBeInTheDocument();
  });

  it('renders fallback UI when a child component throws an error', () => {
    render(
      <GlobalErrorBoundary>
        <BadComponent />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Đã Xảy Ra Lỗi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tải lại/i })).toBeInTheDocument();
  });
});
