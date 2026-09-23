import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RoomStatusUpdate from '../RoomStatusUpdate';
import { roomApi } from '../../../services/roomApi';

vi.mock('../../../services/roomApi', () => ({
  roomApi: {
    getAllRooms: vi.fn(),
    updateStatus: vi.fn()
  }
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}));

describe('RoomStatusUpdate component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders room list and statistics', async () => {
    (roomApi.getAllRooms as any).mockResolvedValue([
      {
        id: 101,
        roomNumber: '101',
        status: 'DIRTY',
        floor: '1',
        roomTypeName: 'Standard Room'
      },
      {
        id: 102,
        roomNumber: '102',
        status: 'AVAILABLE',
        floor: '1',
        roomTypeName: 'Deluxe Room'
      }
    ]);

    render(<RoomStatusUpdate />);

    await waitFor(() => {
      expect(screen.getByText('P. 101')).toBeInTheDocument();
      expect(screen.getByText('P. 102')).toBeInTheDocument();
      expect(screen.getAllByText('Cần dọn').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Trống').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('filters rooms by search term', async () => {
    (roomApi.getAllRooms as any).mockResolvedValue([
      { id: 101, roomNumber: '101', status: 'DIRTY', floor: '1' },
      { id: 205, roomNumber: '205', status: 'AVAILABLE', floor: '2' }
    ]);

    render(<RoomStatusUpdate />);

    await waitFor(() => {
      expect(screen.getByText('P. 101')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/tìm theo số phòng/i);
    fireEvent.change(searchInput, { target: { value: '205' } });

    expect(screen.queryByText('P. 101')).not.toBeInTheDocument();
    expect(screen.getByText('P. 205')).toBeInTheDocument();
  });
});
