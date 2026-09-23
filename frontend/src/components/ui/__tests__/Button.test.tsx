import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button component', () => {
  it('renders button with children text', () => {
    render(<Button>Xác nhận</Button>);
    expect(screen.getByRole('button', { name: /xác nhận/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Bấm vào đây</Button>);

    fireEvent.click(screen.getByRole('button', { name: /bấm vào đây/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled=true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Vô hiệu hóa</Button>);

    const btn = screen.getByRole('button', { name: /vô hiệu hóa/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner when isLoading=true and disables click', () => {
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Lưu dữ liệu</Button>);

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
