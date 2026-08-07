import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

/**
 * AuthProvider manages all authentication state:
 * - token, user profile, initial loading state
 * - cleaningNotifications for HOUSEKEEPER role
 * - login / logout / fetchProfile actions
 *
 * Replaces prop-drilling of user + handleLogout + fetchProfile
 * across 12+ pages.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('roomi_token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaningNotifications, setCleaningNotifications] = useState([]);
  const navigate = useNavigate();

  /**
   * Clear all auth state and redirect to login.
   * Safe to call even when network is unavailable.
   */
  const handleLogout = useCallback(async () => {
    try {
      if (localStorage.getItem('roomi_token')) {
        await api.post('/auth/logout');
      }
    } catch {
      // Ignore network errors on logout — always clear local state
    }
    localStorage.removeItem('roomi_token');
    setToken(null);
    setUser(null);
    setCleaningNotifications([]);
    navigate('/portal');
  }, [navigate]);

  /**
   * Fetch the authenticated user's profile.
   * Also fetches cleaning notifications if user is HOUSEKEEPER.
   * Calls handleLogout on auth failure.
   */
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/profile');
      if (res.data?.data) {
        const u = res.data.data;
        setUser(u);

        // Fetch cleaning notifications for HOUSEKEEPER role only
        if (u.role === 'HOUSEKEEPER') {
          api.get('/cleaning-notifications')
            .then(notifsRes => {
              if (notifsRes.data?.data) {
                setCleaningNotifications(notifsRes.data.data);
              }
            })
            .catch(() => {}); // Non-blocking — notifications are not critical
        }
      }
    } catch {
      handleLogout();
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  /**
   * Save token to localStorage and trigger profile fetch.
   * Called after a successful login.
   * @param {string} newToken - JWT token from API
   */
  const handleLogin = useCallback((newToken) => {
    localStorage.setItem('roomi_token', newToken);
    setToken(newToken);
    navigate('/');
  }, [navigate]);

  // Fetch profile whenever token is present
  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Listen for auth:expired event from API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      handleLogout();
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [handleLogout]);

  const value = {
    token,
    user,
    loading,
    cleaningNotifications,
    setCleaningNotifications,
    handleLogin,
    handleLogout,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access AuthContext.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() must be used within an <AuthProvider>.');
  }
  return context;
}
