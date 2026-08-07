import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PageLoader from './PageLoader';

describe('PageLoader Component', () => {
  it('renders default loading message', () => {
    render(<PageLoader />);
    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
  });

  it('renders custom loading message when passed as prop', () => {
    const customMessage = 'Đang lấy danh sách phòng...';
    render(<PageLoader message={customMessage} />);
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });
});
