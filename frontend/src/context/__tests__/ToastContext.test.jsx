import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider, useToast, useConfirm, toast } from '../ToastContext';

const TestComponent = () => {
  const { success, error, warning, info, confirm } = useToast();

  return (
    <div>
      <button onClick={() => success('Thao tác thành công!')}>Trigger Success</button>
      <button onClick={() => error('Đã có lỗi xảy ra!')}>Trigger Error</button>
      <button onClick={() => warning('Vui lòng chọn ngày trước!')}>Trigger Warning</button>
      <button onClick={() => info('Thông tin bổ sung')}>Trigger Info</button>
      <button onClick={async () => {
        const res = await confirm({ title: 'Xác nhận', message: 'Bạn có chắc chắn?' });
        if (res) {
          success('Đã xác nhận');
        }
      }}>Trigger Confirm</button>
    </div>
  );
};

describe('Toast and Confirm Context', () => {
  it('renders and displays success toast when triggered', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Success'));
    expect(screen.getByText('Thao tác thành công!')).toBeInTheDocument();
  });

  it('renders warning toast with title and message', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Warning'));
    expect(screen.getByText('Vui lòng chọn ngày trước!')).toBeInTheDocument();
  });

  it('handles confirm dialog confirmation', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Confirm'));
    expect(screen.getByText('Bạn có chắc chắn?')).toBeInTheDocument();

    // Click confirm button
    fireEvent.click(screen.getByText('Đồng ý'));
    expect(await screen.findByText('Đã xác nhận')).toBeInTheDocument();
  });

  it('triggers singleton toast helper', () => {
    render(
      <ToastProvider>
        <div>App Root</div>
      </ToastProvider>
    );

    act(() => {
      toast.warning('Cảnh báo toàn cục');
    });

    expect(screen.getByText('Cảnh báo toàn cục')).toBeInTheDocument();
  });
});
