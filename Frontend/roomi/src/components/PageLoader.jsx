import React from 'react';

function PageLoader({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 0',
      minHeight: '300px',
      width: '100%',
      color: 'var(--text-secondary)',
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      {/* Animated Loading Ring */}
      <div style={{
        position: 'relative',
        width: '50px',
        height: '50px',
        marginBottom: '20px'
      }}>
        {/* Static Background Ring */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: '3px solid var(--border-color)',
          borderRadius: '50%',
          boxSizing: 'border-box'
        }} />
        {/* Animated Spin Ring */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: '3px solid transparent',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          boxSizing: 'border-box'
        }} />
        {/* Central Pulsing Glow */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          width: '20px',
          height: '20px',
          background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)',
          borderRadius: '50%',
          opacity: 0.8,
          animation: 'pulse 1.5s ease-in-out infinite',
          boxShadow: '0 0 10px var(--primary)'
        }} />
      </div>
      
      {/* Loading Text */}
      <p style={{
        fontSize: '14px',
        fontWeight: '500',
        letterSpacing: '0.5px',
        animation: 'pulse 1.5s ease-in-out infinite',
        color: 'var(--text-muted)',
        margin: 0
      }}>
        {message}
      </p>
    </div>
  );
}

export default PageLoader;
