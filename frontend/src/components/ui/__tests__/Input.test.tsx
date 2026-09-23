import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../Input';

describe('Input component', () => {
  it('renders input with label and placeholder', () => {
    render(
      <Input
        label="Họ và tên"
        placeholder="Nhập họ và tên..."
        value=""
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/họ và tên/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập họ và tên...')).toBeInTheDocument();
  });

  it('triggers onChange when user types', () => {
    const handleChange = vi.fn();
    render(
      <Input
        label="Tài khoản"
        placeholder="Nhập tài khoản"
        onChange={handleChange}
      />
    );

    const input = screen.getByPlaceholderText('Nhập tài khoản');
    fireEvent.change(input, { target: { value: 'admin123' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays error message when error prop is provided', () => {
    render(
      <Input
        label="Email"
        error="Email không hợp lệ"
        placeholder="example@mail.com"
      />
    );

    expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
  });

  it('displays helperText when provided and no error', () => {
    render(
      <Input
        label="Mật khẩu"
        helperText="Tối thiểu 6 ký tự"
        placeholder="******"
      />
    );

    expect(screen.getByText('Tối thiểu 6 ký tự')).toBeInTheDocument();
  });
});
