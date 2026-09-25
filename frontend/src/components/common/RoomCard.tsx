import React from 'react';
import {
  IoCheckmarkCircle,
  IoCheckmarkCircleOutline,
  IoCloseCircle,
  IoFlashOutline,
  IoInformationCircleOutline,
  IoPeopleOutline
} from 'react-icons/io5';
import Button from '../ui/Button';

export interface RoomCardData {
  id?: number | string;
  name: string;
  maxCapacity: number;
  basePrice?: number;
  currentPrice?: number;
  price?: string | number;
  originalPrice?: string | number;
  badge?: string;
  imageUrls?: string[];
  amenitiesDescription?: string;
  primaryButton?: boolean;
  totalPrice?: number;
  nights?: number;
  isAveragePrice?: boolean;
  availableRooms?: number;
  totalPhysicalRooms?: number;
  isAvailable?: boolean;
}

export interface RoomCardProps {
  room: RoomCardData;
  onBookNow?: () => void;
  onGroupBook?: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onBookNow, onGroupBook }) => {
  const isSoldOut = room.isAvailable === false || (room.availableRooms !== undefined && room.availableRooms <= 0);
  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded-2xl flex flex-col md:flex-row overflow-hidden hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group shadow-xs">
      {/* Image Gallery */}
      <div className="w-full md:w-1/3 p-3 flex flex-col gap-1.5">
        <div className="overflow-hidden rounded-xl h-44 bg-surface-container">
          <div
            className="bg-cover bg-center w-full h-full rounded-xl transition-transform duration-500 ease-out group-hover:scale-105"
            style={{ backgroundImage: `url('${room.imageUrls?.[0] || 'https://placehold.co/600x400?text=No+Image'}')` }}
          />
        </div>
        {room.imageUrls && room.imageUrls.length > 1 && (
          <div className="flex gap-1.5 h-16">
            <div
              className="bg-cover bg-center flex-1 h-full rounded-lg bg-surface-container"
              style={{ backgroundImage: `url('${room.imageUrls[1]}')` }}
            />
            {room.imageUrls.length > 2 && (
              <div
                className="bg-cover bg-center flex-1 h-full rounded-lg bg-surface-container"
                style={{ backgroundImage: `url('${room.imageUrls[2]}')` }}
              />
            )}
            {room.imageUrls.length > 3 && (
              <div
                className="bg-cover bg-center flex-1 h-full rounded-lg relative bg-surface-container"
                style={{ backgroundImage: `url('${room.imageUrls[3]}')` }}
              >
                {room.imageUrls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <span className="text-white font-label-md text-label-md">+{room.imageUrls.length - 4}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details & Action */}
      <div className="w-full md:w-2/3 p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div>
            <h3 className="font-title-lg text-title-lg text-on-surface group-hover:text-primary transition-colors font-bold">
              {room.name}
            </h3>
            <div className="flex items-center gap-1.5 text-primary text-xs mt-1 font-semibold">
              <IoCheckmarkCircleOutline className="text-[16px]" size={16} strokeWidth={1.5} />
              Xác nhận tức thời
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
            {isSoldOut ? (
              <span className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-semibold shadow-2xs">
                <IoCloseCircle className="text-rose-600 text-[14px]" size={14} />
                Hết phòng
              </span>
            ) : (
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-semibold shadow-2xs">
                <IoCheckmarkCircle className="text-emerald-600 text-[14px]" size={14} />
                {room.availableRooms !== undefined ? `Còn ${room.availableRooms} phòng` : 'Còn phòng'}
              </span>
            )}
            <span className="bg-[#F4F6F9] border border-border-grey text-[#002146] text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-medium">
              <IoFlashOutline className="text-primary text-[14px]" size={14} strokeWidth={1.5} />
              Đặt nhanh chóng
            </span>
          </div>
        </div>

        <div className="flex gap-2.5 mb-4 flex-col">
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#F4F6F9] px-3 py-1 border border-border-grey rounded-full text-xs font-semibold text-[#002146] w-max">
              <IoPeopleOutline className="text-primary text-[15px]" size={15} strokeWidth={1.5} /> {room.maxCapacity} người
            </span>
          </div>
          {room.amenitiesDescription && (
            <div className="flex items-start gap-2 bg-[#F4F6F9] p-3.5 border border-border-grey rounded-xl text-xs text-slate-500 leading-relaxed">
              <IoInformationCircleOutline className="mt-0.5 text-primary opacity-80 text-[18px] shrink-0" size={18} strokeWidth={1.5} />
              <p>{room.amenitiesDescription}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3.5 border-t border-border-grey pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            {room.badge && (
              <span className="bg-red-100 text-alert-red font-label-md text-label-md px-2.5 py-1 rounded-full text-xs font-semibold">
                {room.badge}
              </span>
            )}
            {room.originalPrice && (
              <div className="font-body-md text-xs sm:text-sm text-on-surface-variant line-through">
                {room.originalPrice}
              </div>
            )}
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="font-headline-md text-xl sm:text-2xl font-bold text-[#002146]">
              {room.price} <span className="font-body-md text-xs sm:text-sm text-slate-500 font-normal">{room.isAveragePrice ? '/đêm (TB)' : '/đêm'}</span>
            </div>
            {room.nights != null && room.nights > 1 && room.totalPrice != null ? (
              <div className="text-xs text-slate-500 mb-2.5">
                Tổng {room.nights} đêm: <strong className="text-[#002146] font-bold">{new Intl.NumberFormat('vi-VN').format(room.totalPrice)} ₫</strong>
              </div>
            ) : (
              <div className="mb-2" />
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              {onGroupBook && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isSoldOut}
                  onClick={isSoldOut ? undefined : onGroupBook}
                  className="w-full sm:w-auto min-h-[42px] justify-center"
                >
                  Đặt theo đoàn
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={isSoldOut}
                onClick={isSoldOut ? undefined : onBookNow}
                className="w-full sm:w-auto min-h-[42px] justify-center shadow-xs"
              >
                {isSoldOut ? 'Hết phòng' : 'Đặt phòng ngay'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default RoomCard;
