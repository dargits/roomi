import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import hotelSettingApi from '../services/hotelSettingApi';
import { HotelSettingResponse } from '../types';

export interface AppConfigContextType {
  hotelSetting: HotelSettingResponse | null;
  config?: any;
  isAppLoading: boolean;
}

const AppConfigContext = createContext<AppConfigContextType | null>(null);

export const AppConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hotelSetting, setHotelSetting] = useState<HotelSettingResponse | null>(null);
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await hotelSettingApi.getPublicSetting();
        setHotelSetting(data);
      } catch (error) {
        console.error('Failed to fetch public hotel settings:', error);
        // Fallback default settings if backend is down
        setHotelSetting({
          propertyName: '',
          address: 'Đang cập nhật',
          phone: 'Đang cập nhật',
          email: 'Đang cập nhật',
          defaultCheckinTime: '14:00',
          defaultCheckoutTime: '12:00',
          homeImage: ''
        });
      } finally {
        setTimeout(() => {
          setIsAppLoading(false);
        }, 100);
      }
    };

    fetchConfig();
  }, []);

  return (
    <AppConfigContext.Provider value={{ hotelSetting, config: hotelSetting, isAppLoading }}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = (): AppConfigContextType => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
};

export default AppConfigContext;
