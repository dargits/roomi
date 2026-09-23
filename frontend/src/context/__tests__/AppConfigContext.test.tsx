import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppConfigProvider, useAppConfig } from '../AppConfigContext';
import hotelSettingApi from '../../services/hotelSettingApi';

vi.mock('../../services/hotelSettingApi', () => ({
  default: {
    getPublicSetting: vi.fn()
  }
}));

const TestConsumer = () => {
  const { hotelSetting, isAppLoading } = useAppConfig();
  if (isAppLoading) return <div>Loading config...</div>;
  return (
    <div>
      <span data-testid="hotel-name">{hotelSetting?.propertyName}</span>
      <span data-testid="hotel-phone">{hotelSetting?.phone}</span>
    </div>
  );
};

describe('AppConfigContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads public hotel settings and renders in consumer', async () => {
    (hotelSettingApi.getPublicSetting as any).mockResolvedValue({
      propertyName: 'StayAway Luxury',
      phone: '0987654321',
      homeImage: 'https://example.com/hero.jpg'
    });

    render(
      <AppConfigProvider>
        <TestConsumer />
      </AppConfigProvider>
    );

    expect(screen.getByText('Loading config...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('hotel-name')).toHaveTextContent('StayAway Luxury');
      expect(screen.getByTestId('hotel-phone')).toHaveTextContent('0987654321');
    });
  });

  it('falls back to default settings when API fails', async () => {
    (hotelSettingApi.getPublicSetting as any).mockRejectedValue(new Error('Network error'));

    render(
      <AppConfigProvider>
        <TestConsumer />
      </AppConfigProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('hotel-name')).toHaveTextContent('STAY AWAY');
    });
  });
});
