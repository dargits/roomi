import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IoShieldCheckmark, IoLockClosedOutline, IoCheckmarkCircle } from 'react-icons/io5';

interface AntiSpamSliderProps {
  isVerified: boolean;
  onVerify: (verified: boolean) => void;
  disabled?: boolean;
}

export const AntiSpamSlider: React.FC<AntiSpamSliderProps> = ({
  isVerified,
  onVerify,
  disabled = false,
}) => {
  const [dragProgress, setDragProgress] = useState<number>(isVerified ? 100 : 0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVerified) {
      setDragProgress(100);
    } else {
      setDragProgress(0);
    }
  }, [isVerified]);

  const handleStart = (clientX: number) => {
    if (disabled || isVerified) return;
    setIsDragging(true);
    handleMove(clientX);
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging || disabled || isVerified) return;
      if (!trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const handleWidth = 44;
      const maxDragDistance = rect.width - handleWidth;
      const currentDrag = clientX - rect.left - handleWidth / 2;
      const clamped = Math.max(0, Math.min(currentDrag, maxDragDistance));
      const percentage = Math.round((clamped / maxDragDistance) * 100);

      setDragProgress(percentage);

      if (percentage >= 90) {
        setDragProgress(100);
        setIsDragging(false);
        onVerify(true);
      }
    },
    [isDragging, disabled, isVerified, onVerify]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragProgress < 90) {
      setDragProgress(0);
    }
  }, [isDragging, dragProgress]);

  // Global mouse / touch listeners during active drag
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium px-0.5">
        <span className="flex items-center gap-1.5 text-zinc-600">
          <IoShieldCheckmark size={14} className={isVerified ? 'text-emerald-600' : 'text-primary'} />
          <span>Xác thực chống đặt ảo & spam</span>
        </span>
        <span className={`text-[10px] font-semibold ${isVerified ? 'text-emerald-700' : 'text-zinc-400'}`}>
          {isVerified ? '✓ Đã xác thực người thật' : 'Cần xác nhận'}
        </span>
      </div>

      <div
        ref={trackRef}
        className={`relative h-11 w-full rounded-xl overflow-hidden flex items-center border transition-all ${
          isVerified
            ? 'bg-emerald-50/80 border-emerald-300'
            : 'bg-zinc-100/90 border-zinc-200'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Fill bar behind handle */}
        <div
          className={`absolute left-0 top-0 bottom-0 transition-all duration-75 ${
            isVerified ? 'bg-emerald-500/20' : 'bg-primary/15'
          }`}
          style={{ width: `${dragProgress}%` }}
        />

        {/* Text inside the track */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-semibold">
          {isVerified ? (
            <span className="text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
              <IoCheckmarkCircle size={16} className="text-emerald-600" />
              Đã xác thực thành công
            </span>
          ) : (
            <span className="text-zinc-500/90 tracking-wide font-medium">
              Trượt sang phải để xác nhận →
            </span>
          )}
        </div>

        {/* Draggable handle */}
        <div
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => e.touches[0] && handleStart(e.touches[0].clientX)}
          className={`absolute top-1 bottom-1 w-10 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm transition-all duration-75 ${
            isVerified
              ? 'bg-emerald-600 text-white cursor-default'
              : 'bg-white text-zinc-700 border border-zinc-200 hover:border-primary hover:text-primary'
          }`}
          style={{
            left: `calc(${dragProgress}% * ((100% - 40px) / 100) + 2px)`,
          }}
          title={isVerified ? 'Đã xác thực' : 'Kéo để xác thực'}
        >
          {isVerified ? (
            <IoShieldCheckmark size={18} />
          ) : (
            <IoLockClosedOutline size={17} className={isDragging ? 'text-primary animate-pulse' : ''} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AntiSpamSlider;
