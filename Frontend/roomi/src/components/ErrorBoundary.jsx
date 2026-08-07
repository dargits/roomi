import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary catches React render errors in child components,
 * preventing a single component crash from bringing down the entire app.
 *
 * Must be a class component — React's error boundary API is class-only.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production, you would send this to an error reporting service
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            minHeight: '400px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-maintenance-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={36} color="var(--color-maintenance)" />
          </div>

          <h2
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            Đã xảy ra lỗi không mong đợi
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              maxWidth: '440px',
              margin: '0 0 24px',
              lineHeight: '1.6',
            }}
          >
            {this.props.message || 'Trang này gặp sự cố. Vui lòng thử tải lại trang.'}
          </p>

          <button
            onClick={this.handleReset}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
            Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
