import React from 'react';
import {
  IoShieldCheckmarkOutline,
  IoPhonePortraitOutline,
  IoLayersOutline,
} from 'react-icons/io5';

export interface ConcurrentSessionControlProps {
  value: number; // 0 = unlimited, 1 = single session, > 1 = custom
  onChange: (val: number) => void;
  error?: string | null;
  className?: string;
}

export const ConcurrentSessionControl: React.FC<ConcurrentSessionControlProps> = ({
  value,
  onChange,
  error,
  className = ''
}) => {
  // mode: 'single' (1) | 'unlimited' (0) | 'custom' (> 1)
  const mode: 'single' | 'unlimited' | 'custom' =
    value === 1 ? 'single' : value === 0 ? 'unlimited' : 'custom';

  const customCount = value > 1 ? value : 2;

  const handleSelectMode = (newMode: 'single' | 'unlimited' | 'custom') => {
    if (newMode === 'single') {
      onChange(1);
    } else if (newMode === 'unlimited') {
      onChange(0);
    } else {
      onChange(customCount);
    }
  };

  const handleCustomCountChange = (count: number) => {
    const clamped = Math.max(2, Math.min(50, count));
    onChange(clamped);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Số phiên đăng nhập đồng thời <span className="text-error">*</span>
        </label>
        <span className="text-xs font-semibold text-primary">
          {mode === 'single' && 'Chế độ: 1 thiết bị duy nhất (Đăng nhập đơn)'}
          {mode === 'unlimited' && 'Chế độ: Không giới hạn (Đa thiết bị)'}
          {mode === 'custom' && `Chế độ: Giới hạn tối đa ${value} thiết bị`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Option 1: 1 thiết bị duy nhất (Single Session) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectMode('single')}
          onKeyDown={(e) => e.key === 'Enter' && handleSelectMode('single')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
            mode === 'single'
              ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary'
              : 'bg-surface-container-lowest border-border-grey hover:bg-surface-container-low hover:border-border-grey/80'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  mode === 'single' ? 'bg-primary text-white shadow-2xs' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <IoShieldCheckmarkOutline size={20} />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Bảo mật cao
              </span>
            </div>
            <h4 className="font-bold text-sm text-on-surface">1 thiết bị duy nhất</h4>
            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              Tự động đăng xuất phiên cũ khi đăng nhập máy mới. Ngăn chặn triệt để việc dùng chung tài khoản.
            </p>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-border-grey/60 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Khuyên dùng quầy</span>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                mode === 'single' ? 'border-primary bg-primary text-white' : 'border-border-grey bg-white'
              }`}
            >
              {mode === 'single' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </div>
        </div>

        {/* Option 2: Không giới hạn (Unlimited) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectMode('unlimited')}
          onKeyDown={(e) => e.key === 'Enter' && handleSelectMode('unlimited')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
            mode === 'unlimited'
              ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary'
              : 'bg-surface-container-lowest border-border-grey hover:bg-surface-container-low hover:border-border-grey/80'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  mode === 'unlimited' ? 'bg-primary text-white shadow-2xs' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <IoPhonePortraitOutline size={20} />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Linh hoạt
              </span>
            </div>
            <h4 className="font-bold text-sm text-on-surface">Không giới hạn</h4>
            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              Cho phép đăng nhập đồng thời trên nhiều máy tính, laptop và điện thoại cá nhân cùng lúc.
            </p>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-border-grey/60 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Đa thiết bị tự do</span>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                mode === 'unlimited' ? 'border-primary bg-primary text-white' : 'border-border-grey bg-white'
              }`}
            >
              {mode === 'unlimited' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </div>
        </div>

        {/* Option 3: Giới hạn tùy chỉnh (Custom N) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectMode('custom')}
          onKeyDown={(e) => e.key === 'Enter' && handleSelectMode('custom')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
            mode === 'custom'
              ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary'
              : 'bg-surface-container-lowest border-border-grey hover:bg-surface-container-low hover:border-border-grey/80'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  mode === 'custom' ? 'bg-primary text-white shadow-2xs' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <IoLayersOutline size={20} />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Tùy chỉnh
              </span>
            </div>
            <h4 className="font-bold text-sm text-on-surface">Giới hạn số lượng</h4>
            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              Chỉ định số máy tối đa được phép hoạt động song song. Đăng nhập máy thứ N+1 sẽ thu hồi phiên cũ nhất.
            </p>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-border-grey/60 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Tối đa {customCount} máy</span>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                mode === 'custom' ? 'border-primary bg-primary text-white' : 'border-border-grey bg-white'
              }`}
            >
              {mode === 'custom' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </div>
        </div>
      </div>

      {/* Bộ điều khiển số lượng khi chọn Tùy chỉnh */}
      {mode === 'custom' && (
        <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-grey flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div>
            <p className="text-xs font-bold text-on-surface">Số lượng thiết bị tối đa cho phép đăng nhập đồng thời:</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Áp dụng chung cho tất cả tài khoản trong hệ thống khi đăng nhập.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => handleCustomCountChange(customCount - 1)}
              disabled={customCount <= 2}
              className="w-8 h-8 rounded-lg border border-border-grey bg-white flex items-center justify-center text-sm font-bold text-on-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
              title="Giảm 1 thiết bị"
            >
              -
            </button>
            <span className="w-14 text-center font-bold text-sm text-primary py-1 px-2 bg-white rounded-lg border border-border-grey shadow-2xs">
              {customCount}
            </span>
            <button
              type="button"
              onClick={() => handleCustomCountChange(customCount + 1)}
              disabled={customCount >= 50}
              className="w-8 h-8 rounded-lg border border-border-grey bg-white flex items-center justify-center text-sm font-bold text-on-surface hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
              title="Tăng 1 thiết bị"
            >
              +
            </button>
            <span className="text-xs font-semibold text-on-surface-variant ml-1">thiết bị</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-error font-medium">{error}</p>}
    </div>
  );
};

export default ConcurrentSessionControl;
