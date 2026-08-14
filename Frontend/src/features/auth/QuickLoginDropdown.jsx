import React, { useState } from 'react';
import { mockAccounts } from '../../mock/mockAccounts';
import { Settings, ChevronDown } from 'lucide-react';

const QuickLoginDropdown = ({ onSelectRole }) => {
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
      desc: 'Thủ tục check-in/out, hỗ trợ khách', 
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

  const handleSelect = (roleName) => {
    if (mockAccounts[roleName]) {
      onSelectRole(mockAccounts[roleName]);
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full border border-border-grey border-dashed rounded-md mt-4 bg-surface-container-lowest overflow-hidden shadow-sm">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-surface-container-low hover:bg-surface-container transition-colors border-b border-border-grey"
      >
        <div className="flex items-center gap-1.5 text-on-surface font-label-md text-label-md">
          <Settings className="text-primary" size={16} strokeWidth={1.5} />
          Tài khoản Demo (môi trường phát triển)
        </div>
        <ChevronDown className="text-outline transition-transform duration-200" size={18} strokeWidth={1.5} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div className="p-2 flex flex-col gap-1.5 bg-surface-container-lowest">
          {roles.map((role) => (
            <div 
              key={role.id}
              onClick={() => handleSelect(role.name)}
              className="flex items-center gap-2.5 p-2 border border-border-grey rounded-md cursor-pointer hover:border-primary hover:bg-surface-blue-light transition-all group shadow-sm hover:shadow"
            >
              <div className={`px-1.5 py-0.5 rounded border font-bold text-[10px] ${role.tagColor}`}>
                {role.id}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-title-sm text-on-surface group-hover:text-primary transition-colors">{role.name}</h4>
                  <span className="text-[10px] font-mono text-outline font-medium">{role.username}</span>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight">{role.desc}</p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-outline text-center mt-1 pb-1">Click vào tài khoản để tự động điền vào form</p>
        </div>
      )}
    </div>
  );
};

export default QuickLoginDropdown;
