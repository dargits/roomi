import React from 'react';
import { BadgeCheck, CheckCircle2, Zap, Users, Info } from 'lucide-react';

const RoomCard = ({ room, onBookNow }) => {
  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded flex flex-col md:flex-row overflow-hidden hover:border-outline-variant transition-colors group">
      {/* Image Gallery */}
      <div className="w-full md:w-1/3 p-2 flex flex-col gap-1">
        <div
          className="bg-cover bg-center w-full h-40 rounded bg-surface-container"
          style={{ backgroundImage: `url('${room.imageUrls?.[0] || 'https://placehold.co/600x400?text=No+Image'}')` }}
        ></div>
        {room.imageUrls && room.imageUrls.length > 1 && (
          <div className="flex gap-1 h-16">
            <div
              className="bg-cover bg-center flex-1 h-full rounded bg-surface-container"
              style={{ backgroundImage: `url('${room.imageUrls[1]}')` }}
            ></div>
            {room.imageUrls.length > 2 && (
              <div
                className="bg-cover bg-center flex-1 h-full rounded bg-surface-container"
                style={{ backgroundImage: `url('${room.imageUrls[2]}')` }}
              ></div>
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
              <BadgeCheck className="text-[16px]" size={16} strokeWidth={1.5} />
              Xác nhận tức thời
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <span className="bg-surface-container border border-border-grey text-on-surface font-label-sm px-2 py-1 rounded flex items-center gap-1">
              <CheckCircle2 className="text-green-600 text-[14px]" size={14} strokeWidth={1.5} />
              Còn phòng
            </span>
            <span className="bg-surface-container border border-border-grey text-on-surface font-label-sm px-2 py-1 rounded flex items-center gap-1">
              <Zap className="text-primary text-[14px]" size={14} strokeWidth={1.5} />
              Đặt nhanh chóng
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-col">
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-1 border border-border-grey rounded font-body-md text-body-md text-on-surface w-max">
              <Users className="text-primary text-[16px]" size={16} strokeWidth={1.5} /> {room.maxCapacity} người
            </span>
          </div>
          {room.amenitiesDescription && (
             <div className="flex items-start gap-2 bg-surface-container-low p-3 border border-border-grey rounded text-body-md text-on-surface-variant leading-relaxed">
               <Info className="mt-0.5 text-primary opacity-80 text-[18px]" size={18} strokeWidth={1.5} />
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
            <div className="font-headline-md text-headline-md text-on-surface mb-2">
              {room.price} <span className="font-body-md text-body-md text-on-surface-variant font-normal">/đêm</span>
            </div>
            {room.primaryButton ? (
              <button 
                onClick={onBookNow}
                className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2 rounded shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors"
              >
                Đặt phòng ngay
              </button>
            ) : (
              <button 
                onClick={onBookNow}
                className="bg-surface-container-lowest text-primary border border-primary font-label-md text-label-md px-6 py-2 rounded hover:bg-surface-blue-light transition-colors"
              >
                Đặt phòng ngay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
