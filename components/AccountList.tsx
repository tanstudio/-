
import React from 'react';
import { CompanyAccount, TransferGroup } from '../types';
import { Building2 } from 'lucide-react';

interface AccountListProps {
  accounts: CompanyAccount[];
  groups: TransferGroup[];
}

export const AccountList: React.FC<AccountListProps> = ({ accounts, groups }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          受控實體清單
        </h2>
      </div>
      <div className="overflow-y-auto max-h-[600px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
              <th className="px-6 py-3 border-b border-slate-100">公司 / 賬戶</th>
              <th className="px-6 py-3 border-b border-slate-100">每月限額</th>
              <th className="px-6 py-3 border-b border-slate-100">所屬組別</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => {
              const groupName = groups.find(g => g.id === acc.groupId)?.name;
              return (
                <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {acc.companyName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{acc.companyName}</p>
                        <p className="text-xs text-slate-500 font-mono">{acc.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-700">
                      ${acc.maxMonthlyLimit.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${groupName ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                      {groupName || '未分配 (自動)'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
