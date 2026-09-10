import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import hotelSettingApi from '../services/hotelSettingApi';
import { HotelSettingResponse } from '../types';

export interface AppConfigContextType {
  hotelSetting: HotelSettingResponse | null;
  config?: any;
  isAppLoading: boolean;
}

const AppConfigContext = createContext<AppConfigContextType | null>(null);

export const DEFAULT_HERO_IMAGE = 'https://i.ibb.co/TxVT7pQz/images-11-jpg.jpg';

export const AppConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hotelSetting, setHotelSetting] = useState<HotelSettingResponse | null>(null);
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await hotelSettingApi.getPublicSetting();
        setHotelSetting({
          ...data,
          homeImage: data?.homeImage?.trim() ? data.homeImage : DEFAULT_HERO_IMAGE
        });
      } catch (error) {
        console.error('Failed to fetch public hotel settings:', error);
        // Fallback default settings if backend is down
        setHotelSetting({
          propertyName: 'STAY AWAY',
          address: 'Z115, Phan Đình Phùng, Tp. Thái Nguyên, Tỉnh Thái Nguyên',
          phone: '0365224245',
          email: 'lienhe@stayaway.vn',
          defaultCheckinTime: '14:00',
          defaultCheckoutTime: '12:00',
          homeImage: DEFAULT_HERO_IMAGE
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
