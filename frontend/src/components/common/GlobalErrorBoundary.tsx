import React, { Component, ErrorInfo, ReactNode } from 'react';
import { IoAlertCircleOutline, IoRefreshOutline, IoHomeOutline } from 'react-icons/io5';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkError: boolean;
}

/**
 * Enterprise Global Error Boundary
 * Catches unhandled runtime errors & dynamic import chunk failures.
 * Automatically recovers from stale chunk caches on new deployments.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const message = error?.message || '';
    const isChunkError = 
      message.includes('dynamically imported module') ||
      message.includes('Loading chunk') ||
      message.includes('Failed to fetch') ||
      error.name === 'ChunkLoadError';

    return {
      hasError: true,
      error,
      errorInfo: null,
      isChunkError,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[GlobalErrorBoundary] Uncaught runtime error:', error, errorInfo);
    this.setState({ errorInfo });

    // Handle chunk 404 after production deploy:
    // If a dynamic import chunk fails to load and we haven't reloaded recently, auto-reload once
    if (this.state.isChunkError) {
      const lastReload = sessionStorage.getItem('chunk_error_reload_ts');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('chunk_error_reload_ts', now.toString());
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { isChunkError, error } = this.state;

      return (
        <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-border-grey shadow-lg p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-alert-red mx-auto flex items-center justify-center mb-4">
              <IoAlertCircleOutline size={32} />
            </div>

            <h1 className="text-xl font-bold text-on-surface mb-2">
              {isChunkError ? 'Đã có bản cập nhật mới' : 'Đã có lỗi không mong muốn'}
            </h1>

            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              {isChunkError
                ? 'Hệ thống vừa cập nhật phiên bản mới. Vui lòng làm mới trang để tải các thành phần mới nhất.'
                : 'Ứng dụng gặp sự cố khi xử lý dữ liệu. Vui lòng tải lại trang hoặc quay về trang chủ.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs"
              >
                <IoRefreshOutline size={18} /> Tải lại trang
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors border border-border-grey"
              >
                <IoHomeOutline size={18} /> Về trang chủ
              </button>
            </div>

            {/* Error stack in DEV mode */}
            {import.meta.env.DEV && error && (
              <details className="mt-6 text-left border border-border-grey rounded-lg p-3 bg-surface-container-low">
                <summary className="text-xs font-semibold text-alert-red cursor-pointer">
                  Chi tiết lỗi (Chế độ phát triển)
                </summary>
                <pre className="text-[11px] text-on-surface-variant overflow-x-auto mt-2 whitespace-pre-wrap font-mono">
                  {error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
