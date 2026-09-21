import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * GlobalErrorBoundary — Bọc toàn bộ ứng dụng để bắt lỗi render không mong muốn.
 * Khi có lỗi, hiển thị màn hình fallback thay vì crash trắng trang.
 */
class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[GlobalErrorBoundary] Lỗi không xử lý được:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f7f5] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-gray-200 shadow-lg p-8 text-center">
            {/* Icon lỗi */}
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-red-50 border-2 border-red-200 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-red-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
            </div>

            {/* Tiêu đề */}
            <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wider mb-2">
              Đã Xảy Ra Lỗi
            </h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Ứng dụng gặp lỗi không mong muốn. Vui lòng tải lại trang hoặc quay về trang chủ.
            </p>

            {/* Chi tiết lỗi (chỉ hiện trong dev mode) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer mb-2">
                  Chi tiết lỗi (dev only)
                </summary>
                <div className="bg-gray-50 border border-gray-200 p-3 overflow-auto max-h-40">
                  <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 text-sm font-bold tracking-wider uppercase border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Trang Chủ
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 text-sm font-bold tracking-wider uppercase bg-primary text-white hover:opacity-90 transition-opacity"
              >
                Tải Lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
