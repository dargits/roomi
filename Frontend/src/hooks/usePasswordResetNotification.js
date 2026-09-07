import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { passwordResetApi } from '../services/passwordResetApi';

export const usePasswordResetNotification = () => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const isEligible = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const fetchCount = useCallback(async () => {
    if (!isEligible) {
      setPendingCount(0);
      return;
    }
    try {
      setLoading(true);
      const count = await passwordResetApi.getPendingCount();
      setPendingCount(Number(count) || 0);
    } catch (err) {
      try {
        const requests = await passwordResetApi.getAllRequests();
        const count = requests.filter(r => r.status === 'PENDING').length;
        setPendingCount(count);
      } catch (e) {
        // Silent catch
      }
    } finally {
      setLoading(false);
    }
  }, [isEligible]);

  useEffect(() => {
    if (!isEligible) return;

    fetchCount();

    const handleUpdate = () => {
      fetchCount();
    };

    window.addEventListener('password-reset-updated', handleUpdate);
    const interval = setInterval(fetchCount, 30000);

    return () => {
      window.removeEventListener('password-reset-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [isEligible, fetchCount]);

  return { pendingCount, loading, refreshPendingCount: fetchCount };
};

export default usePasswordResetNotification;
