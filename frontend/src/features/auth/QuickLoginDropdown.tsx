import React, { useState } from 'react';
import { mockAccounts } from '../../mock/mockAccounts';
import { IoChevronDownOutline, IoSettingsOutline } from 'react-icons/io5';

interface QuickLoginDropdownProps {
  onSelectRole: (account: { username: string; password: string; name?: string; role?: string }) => void;
}

const QuickLoginDropdown: React.FC<QuickLoginDropdownProps> = ({ onSelectRole }) => {
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    { 
      id: 'VT-01', 
      name: 'Chủ sở hữu', 
      desc: 'Quản lý tổng thể khách sạn', 
      username: 'chusohuu',
      tagColor: 'bg-blue-100 text-blue-700 border-blue-200' 
    },
    { 
      id: 'VT-02', 
      name: 'Lễ tân', 
      desc: 'Thủ tục nhận/trả phòng, hỗ trợ khách', 
      username: 'letan',
      tagColor: 'bg-green-100 text-green-700 border-green-200' 
    },
    { 
      id: 'VT-03', 
      name: 'Buồng phòng', 
      desc: 'Kiểm tra phòng, điều phối dọn dẹp', 
      username: 'buongphong',
      tagColor: 'bg-yellow-100 text-yellow-700 border-yellow-200' 
    },
    { 
      id: 'VT-04', 
      name: 'Kế toán', 
      desc: 'Kiểm soát thu chi, báo cáo tài chính', 
      username: 'ketoan',
      tagColor: 'bg-purple-100 text-purple-700 border-purple-200' 
    },
    { 
      id: 'VT-05', 
      name: 'Quản trị viên', 
      desc: 'Toàn quyền: quản lý hệ thống, nhân sự', 
      username: 'admin',
      tagColor: 'bg-red-100 text-red-700 border-red-200' 
    },
  ];

  const handleSelect = (roleName: string) => {
    if (mockAccounts[roleName]) {
      onSelectRole(mockAccounts[roleName]);
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full border border-border-grey rounded-xl mt-3 bg-surface-container-lowest overflow-hidden shadow-2xs">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-border-grey cursor-pointer"
      >
        <div className="flex items-center gap-2 text-[#002146] text-xs font-semibold">
          <IoSettingsOutline className="text-primary" size={16} strokeWidth={1.5} />
          Tài khoản Demo (môi trường thử nghiệm)
        </div>
        <IoChevronDownOutline className="text-slate-500 transition-transform duration-200" size={16} strokeWidth={1.5} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div className="p-2.5 flex flex-col gap-2 bg-surface-container-lowest">
          {roles.map((role) => (
            <div 
              key={role.id}
              onClick={() => handleSelect(role.name)}
              className="flex items-center gap-3 p-2.5 border border-border-grey rounded-xl cursor-pointer hover:border-primary/50 hover:bg-slate-50 transition-all group shadow-2xs hover:shadow-xs"
            >
              <div className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${role.tagColor}`}>
                {role.id}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-xs text-[#002146] group-hover:text-primary transition-colors">{role.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500 font-medium">{role.username}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{role.desc}</p>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-primary font-semibold text-center mt-1 pb-1">⚡ Nhấn vào tài khoản để đăng nhập tự động ngay</p>
        </div>
      )}
    </div>
  );
};

export default QuickLoginDropdown;
