import React, { createContext, useState, useContext, useEffect } from 'react';
import hotelSettingApi from '../services/hotelSettingApi';

const AppConfigContext = createContext(null);

export const AppConfigProvider = ({ children }) => {
  const [hotelSetting, setHotelSetting] = useState(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await hotelSettingApi.getPublicSetting();
        setHotelSetting(data);
      } catch (error) {
        console.error('Failed to fetch public hotel settings:', error);
        // Fallback default settings if backend is down
        setHotelSetting({
          propertyName: 'StayGO',
          address: 'Đang cập nhật',
          phone: 'Đang cập nhật',
          email: 'Đang cập nhật',
          defaultCheckinTime: '14:00',
          defaultCheckoutTime: '12:00',
          homeImage: ''
        });
      } finally {
        setIsAppLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <AppConfigContext.Provider value={{ hotelSetting, isAppLoading }}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
};
