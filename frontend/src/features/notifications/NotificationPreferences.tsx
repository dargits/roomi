import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Redirect to NotificationCenter with preferences tab active.
 */
const NotificationPreferences: React.FC = () => {
  return <Navigate to="/manage/notifications?tab=preferences" replace />;
};

export default NotificationPreferences;
