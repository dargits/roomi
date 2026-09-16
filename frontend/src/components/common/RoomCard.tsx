import React from 'react';
import {
  IoCheckmarkCircle,
  IoCheckmarkCircleOutline,
  IoCloseCircle,
  IoFlashOutline,
  IoInformationCircleOutline,
  IoPeopleOutline
} from 'react-icons/io5';

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
    <div className="bg-surface-container-lowest border border-border-grey rounded flex flex-col md:flex-row overflow-hidden hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
      {/* Image Gallery */}
      <div className="w-full md:w-1/3 p-2 flex flex-col gap-1">
        <div className="overflow-hidden rounded h-40 bg-surface-container">
          <div
            className="bg-cover bg-center w-full h-full rounded transition-transform duration-500 ease-out group-hover:scale-105"
            style={{ backgroundImage: `url('${room.imageUrls?.[0] || 'https://placehold.co/600x400?text=No+Image'}')` }}
          />
        </div>
        {room.imageUrls && room.imageUrls.length > 1 && (
          <div className="flex gap-1 h-16">
            <div
              className="bg-cover bg-center flex-1 h-full rounded bg-surface-container"
              style={{ backgroundImage: `url('${room.imageUrls[1]}')` }}
            />
            {room.imageUrls.length > 2 && (
              <div
                className="bg-cover bg-center flex-1 h-full rounded bg-surface-container"
                style={{ backgroundImage: `url('${room.imageUrls[2]}')` }}
              />
            )}
            {room.imageUrls.length > 3 && (
              <div
                className="bg-cover bg-center flex-1 h-full rounded relative bg-surface-container"
                style={{ backgroundImage: `url('${room.imageUrls[3]}')` }}
              >
                {room.imageUrls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                    <span className="text-white font-label-md text-label-md">+{room.imageUrls.length - 4}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details & Action */}
      <div className="w-full md:w-2/3 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-title-lg text-title-lg text-on-surface group-hover:text-primary transition-colors">
              {room.name}
            </h3>
            <div className="flex items-center gap-1 text-primary text-sm mt-1 font-label-md">
              <IoCheckmarkCircleOutline className="text-[16px]" size={16} strokeWidth={1.5} />
              Xác nhận tức thời
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            {isSoldOut ? (
              <span className="bg-red-50 border border-red-200 text-red-600 font-label-sm px-2.5 py-1 rounded flex items-center gap-1 font-medium shadow-2xs">
                <IoCloseCircle className="text-red-500 text-[14px]" size={14} />
                Hết phòng
              </span>
            ) : (
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-label-sm px-2.5 py-1 rounded flex items-center gap-1 font-medium shadow-2xs">
                <IoCheckmarkCircle className="text-emerald-600 text-[14px]" size={14} />
                {room.availableRooms !== undefined ? `Còn ${room.availableRooms} phòng` : 'Còn phòng'}
              </span>
            )}
            <span className="bg-surface-container border border-border-grey text-on-surface font-label-sm px-2 py-1 rounded flex items-center gap-1">
              <IoFlashOutline className="text-primary text-[14px]" size={14} strokeWidth={1.5} />
              Đặt nhanh chóng
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-col">
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-1 border border-border-grey rounded font-body-md text-body-md text-on-surface w-max">
              <IoPeopleOutline className="text-primary text-[16px]" size={16} strokeWidth={1.5} /> {room.maxCapacity} người
            </span>
          </div>
          {room.amenitiesDescription && (
            <div className="flex items-start gap-2 bg-surface-container-low p-3 border border-border-grey rounded text-body-md text-on-surface-variant leading-relaxed">
              <IoInformationCircleOutline className="mt-0.5 text-primary opacity-80 text-[18px]" size={18} strokeWidth={1.5} />
              <p>{room.amenitiesDescription}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-end border-t border-border-grey pt-4">
          <div>
            {room.badge && (
              <span className="bg-red-100 text-alert-red font-label-md text-label-md px-2 py-1 rounded">
                {room.badge}
              </span>
            )}
            {room.originalPrice && (
              <div className="font-body-md text-body-md text-on-surface-variant line-through mt-1">
                {room.originalPrice}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-headline-md text-headline-md text-on-surface">
              {room.price} <span className="font-body-md text-body-md text-on-surface-variant font-normal">{room.isAveragePrice ? '/đêm (TB)' : '/đêm'}</span>
            </div>
            {room.nights != null && room.nights > 1 && room.totalPrice != null ? (
              <div className="text-xs text-on-surface-variant mb-2">
                Tổng {room.nights} đêm: <strong className="text-on-surface">{new Intl.NumberFormat('vi-VN').format(room.totalPrice)} ₫</strong>
              </div>
            ) : (
              <div className="mb-2" />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {onGroupBook && (
                <button
                  type="button"
                  onClick={isSoldOut ? undefined : onGroupBook}
                  disabled={isSoldOut}
                  className={`border px-4 py-2 font-label-md text-label-md transition-colors ${
                    isSoldOut
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed select-none'
                      : 'border-primary bg-surface-container-lowest text-primary hover:bg-surface-blue-light cursor-pointer'
                  }`}
                >
                  Đặt theo đoàn
                </button>
              )}
              <button
                type="button"
                onClick={isSoldOut ? undefined : onBookNow}
                disabled={isSoldOut}
                className={
                  isSoldOut
                    ? 'bg-gray-200 text-gray-400 border border-gray-300 font-label-md text-label-md px-6 py-2 rounded cursor-not-allowed select-none'
                    : room.primaryButton
                      ? 'btn-shimmer bg-primary text-on-primary font-label-md text-label-md px-6 py-2 rounded shadow-sm hover:bg-primary-container hover:text-on-primary-container hover:shadow-md active:scale-95 transition-all cursor-pointer'
                      : 'btn-shimmer bg-surface-container-lowest text-primary border border-primary font-label-md text-label-md px-6 py-2 rounded hover:bg-surface-blue-light hover:shadow-sm active:scale-95 transition-all cursor-pointer'
                }
              >
                {isSoldOut ? 'Hết phòng' : 'Đặt phòng ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
