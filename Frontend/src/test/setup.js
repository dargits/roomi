import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock hotelSettingApi to prevent axios warnings in AppConfigContext
vi.mock('../services/hotelSettingApi', () => {
  return {
    default: {
      getPublicSetting: vi.fn().mockResolvedValue({
        propertyName: 'StayGO',
        address: 'Mock Address',
        phone: '123456789',
        email: 'mock@example.com',
        defaultCheckinTime: '14:00',
        defaultCheckoutTime: '12:00',
        homeImage: ''
      })
    }
  }
});
