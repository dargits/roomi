import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CorporateClientManagement } from '../CorporateClientManagement';
import { corporateClientApi } from '../../../services/corporateClientApi';

vi.mock('../../../services/corporateClientApi', () => ({
  corporateClientApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}));

describe('CorporateClientManagement component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and renders corporate client list', async () => {
    (corporateClientApi.getAll as any).mockResolvedValue([
      {
        id: 1,
        companyName: 'Công ty Cổ phần ABC',
        taxCode: '0101234567',
        contactPerson: 'Nguyen Van B',
        contactPhone: '0988888888',
        active: true
      }
    ]);

    render(
      <MemoryRouter>
        <CorporateClientManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Công ty Cổ phần ABC')).toBeInTheDocument();
      expect(screen.getByText(/0101234567/)).toBeInTheDocument();
      expect(screen.getByText('Nguyen Van B')).toBeInTheDocument();
    });
  });

  it('opens add client modal when clicking add button', async () => {
    (corporateClientApi.getAll as any).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <CorporateClientManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /thêm khách công ty/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /thêm khách công ty/i }));

    await waitFor(() => {
      expect(screen.getByText('Thêm mới khách hàng công ty')).toBeInTheDocument();
    });
  });
});
