
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CompanyAccount, TransferGroup } from '../types';
import { Building2, Plus, Trash2, Edit2, Check, X, Save, Layers, ListFilter, Search, Filter, Hash, Building, ExternalLink } from 'lucide-react';

interface EntityManagerProps {
  accounts: CompanyAccount[];
  groups: TransferGroup[];
  onAdd: (account: Omit<CompanyAccount, 'id' | 'currentBalance'>) => void;
  onUpdate: (id: string, updates: Partial<CompanyAccount>) => void;
  onDelete: (id: string) => void;
  onAddGroup: (group: Omit<TransferGroup, 'id' | 'accountIds'>) => void;
  onUpdateGroup: (id: string, updates: Partial<TransferGroup>) => void;
  onDeleteGroup: (id: string) => void;
  onApply: () => void;
}

export const EntityManager: React.FC<EntityManagerProps> = ({ 
  accounts, groups, onAdd, onUpdate, onDelete, onAddGroup, onUpdateGroup, onDeleteGroup, onApply 
}) => {
  const [subTab, setSubTab] = useState<'entities' | 'groups'>('entities');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Pop-up 狀態管理
  const [activePopUpId, setActivePopUpId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // 篩選與搜尋狀態
  const [entitySearch, setEntitySearch] = useState('');
  const [entityGroupFilter, setEntityGroupFilter] = useState<'all' | 'unassigned' | string>('all');
  
  // Entity Form
  const [entityFormData, setEntityFormData] = useState({ companyName: '', maxMonthlyLimit: 500000, groupId: '' });
  
  // Group Form
  const [groupFormData, setGroupFormData] = useState({ name: '', cycleDays: 30 });
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // 點擊外部關閉彈窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopUpId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddEntity = () => {
    if (!entityFormData.companyName) return;
    onAdd({ 
      name: entityFormData.companyName, 
      companyName: entityFormData.companyName, 
      maxMonthlyLimit: entityFormData.maxMonthlyLimit,
      groupId: entityFormData.groupId || undefined
    });
    setEntityFormData({ companyName: '', maxMonthlyLimit: 500000, groupId: '' });
    setIsAdding(false);
  };

  const handleAddGroup = () => {
    if (!groupFormData.name) return;
    onAddGroup({ ...groupFormData });
    setGroupFormData({ name: '', cycleDays: 30 });
    setIsAddingGroup(false);
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchesSearch = acc.companyName.toLowerCase().includes(entitySearch.toLowerCase()) || 
                           acc.id.toLowerCase().includes(entitySearch.toLowerCase());
      
      let matchesGroup = true;
      if (entityGroupFilter === 'unassigned') {
        matchesGroup = !acc.groupId;
      } else if (entityGroupFilter !== 'all') {
        matchesGroup = acc.groupId === entityGroupFilter;
      }
      
      return matchesSearch && matchesGroup;
    });
  }, [accounts, entitySearch, entityGroupFilter]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-slate-50/50 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            後台管理中心
          </h2>
          <p className="text-sm text-slate-500">管理公司實體與自定義循環組別參數。</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mr-2">
            <button 
              onClick={() => setSubTab('entities')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'entities' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <ListFilter className="w-4 h-4" /> 實體列表
            </button>
            <button 
              onClick={() => setSubTab('groups')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'groups' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Layers className="w-4 h-4" /> 組別管理
            </button>
          </div>

          <button 
            onClick={onApply}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <Save className="w-4 h-4" /> 立即生效並重算
          </button>
        </div>
      </div>

      {/* Content Section */}
      {subTab === 'entities' ? (
        <div className="flex flex-col">
          <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋公司名稱或 ID..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  className="bg-transparent outline-none cursor-pointer pr-4 font-bold text-slate-700"
                  value={entityGroupFilter}
                  onChange={(e) => setEntityGroupFilter(e.target.value)}
                >
                  <option value="all">所有組別</option>
                  <option value="unassigned">未指派 (自動分配)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all whitespace-nowrap shadow-md shadow-indigo-100"
              >
                <Plus className="w-4 h-4" /> 新增公司
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4 border-b border-slate-100 w-32">實體 ID</th>
                  <th className="px-6 py-4 border-b border-slate-100">公司名稱</th>
                  <th className="px-6 py-4 border-b border-slate-100">月度交易限額 ($)</th>
                  <th className="px-6 py-4 border-b border-slate-100 w-48">指派組別</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {isAdding && (
                  <tr className="bg-indigo-50/30 animate-in fade-in duration-300">
                    <td className="px-6 py-4 border-b border-slate-100 text-slate-400 italic text-xs font-mono">NEW-GEN</td>
                    <td className="px-6 py-4 border-b border-slate-100">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="輸入公司名稱..." 
                        className="w-full px-3 py-1.5 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={entityFormData.companyName}
                        onChange={e => setEntityFormData({...entityFormData, companyName: e.target.value})}
                      />
                    </td>
                    <td className="px-6 py-4 border-b border-slate-100">
                      <input 
                        type="number" 
                        className="w-full px-3 py-1.5 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        value={entityFormData.maxMonthlyLimit}
                        onChange={e => setEntityFormData({...entityFormData, maxMonthlyLimit: parseInt(e.target.value) || 0})}
                      />
                    </td>
                    <td className="px-6 py-4 border-b border-slate-100">
                      <select 
                        className="w-full px-3 py-1.5 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        value={entityFormData.groupId}
                        onChange={e => setEntityFormData({...entityFormData, groupId: e.target.value})}
                      >
                        <option value="">自動分配 (Auto)</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 border-b border-slate-100 text-right space-x-2">
                      <button onClick={handleAddEntity} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setIsAdding(false)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"><X className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )}
                {filteredAccounts.map((acc) => {
                  const isEditing = editingId === acc.id;
                  const group = groups.find(g => g.id === acc.groupId);
                  return (
                    <tr key={acc.id} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-indigo-50/20' : ''}`}>
                      <td className="px-6 py-4 border-b border-slate-100 font-mono text-xs text-slate-400">{acc.id}</td>
                      <td className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-800 text-sm">
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 border border-indigo-200 rounded text-sm"
                            value={acc.companyName}
                            onChange={e => onUpdate(acc.id, { companyName: e.target.value })}
                          />
                        ) : acc.companyName}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100 text-sm">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-full px-2 py-1 border border-indigo-200 rounded text-sm font-mono"
                            value={acc.maxMonthlyLimit}
                            onChange={e => onUpdate(acc.id, { maxMonthlyLimit: parseInt(e.target.value) || 0 })}
                          />
                        ) : (
                          <span className="font-mono text-slate-700">${acc.maxMonthlyLimit.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100">
                        {isEditing ? (
                          <select 
                            className="w-full px-2 py-1 border border-indigo-200 rounded text-sm bg-white"
                            value={acc.groupId || ''}
                            onChange={e => onUpdate(acc.id, { groupId: e.target.value || undefined })}
                          >
                            <option value="">自動分配</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold ${acc.groupId ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                            <Layers className="w-3 h-3" />
                            {group?.name || '自動分配'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100 text-right">
                        {isEditing ? (
                          <button onClick={() => setEditingId(null)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center justify-end gap-1 ml-auto">
                            <Check className="w-4 h-4" /> 完成
                          </button>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(acc.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(acc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">自定義組別管理 ({groups.length})</span>
             <button 
              onClick={() => setIsAddingGroup(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> 建立新組別
            </button>
          </div>
          <table className="w-full text-left border-collapse overflow-visible">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="px-6 py-4 border-b border-slate-100">組別 ID</th>
                <th className="px-6 py-4 border-b border-slate-100">組別名稱</th>
                <th className="px-6 py-4 border-b border-slate-100">循環天數 (週期)</th>
                <th className="px-6 py-4 border-b border-slate-100">當前成員數量</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {isAddingGroup && (
                <tr className="bg-emerald-50/30 animate-in fade-in duration-300">
                  <td className="px-6 py-4 border-b border-slate-100 text-slate-400 italic text-xs font-mono">NEW-GRP</td>
                  <td className="px-6 py-4 border-b border-slate-100">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="例如：海外控股中心..." 
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={groupFormData.name}
                      onChange={e => setGroupFormData({...groupFormData, name: e.target.value})}
                    />
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        className="w-20 px-3 py-1.5 border border-emerald-200 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        value={groupFormData.cycleDays}
                        onChange={e => setGroupFormData({...groupFormData, cycleDays: parseInt(e.target.value) || 1})}
                      />
                      <span className="text-xs text-slate-500">天</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100 text-slate-400 italic text-xs">等待指派</td>
                  <td className="px-6 py-4 border-b border-slate-100 text-right space-x-2">
                    <button onClick={handleAddGroup} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setIsAddingGroup(false)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              )}
              {groups.map((g) => {
                const isEditing = editingGroupId === g.id;
                const memberAccounts = accounts.filter(a => a.groupId === g.id);
                const memberCount = memberAccounts.length;
                const isPopUpActive = activePopUpId === g.id;

                return (
                  <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-indigo-50/20' : ''}`} style={{ zIndex: isPopUpActive ? 50 : 'auto', position: 'relative' }}>
                    <td className="px-6 py-4 border-b border-slate-100 font-mono text-xs text-slate-400">{g.id}</td>
                    <td className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800 text-sm">
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="w-full px-2 py-1 border border-indigo-200 rounded text-sm"
                          value={g.name}
                          onChange={e => onUpdateGroup(g.id, { name: e.target.value })}
                        />
                      ) : g.name}
                    </td>
                    <td className="px-6 py-4 border-b border-slate-100 text-sm">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="w-20 px-2 py-1 border border-indigo-200 rounded text-sm font-mono"
                            value={g.cycleDays}
                            onChange={e => onUpdateGroup(g.id, { cycleDays: parseInt(e.target.value) || 1 })}
                          />
                          <span className="text-[10px] text-slate-400 uppercase font-bold">天</span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2 text-slate-700 font-medium">{g.cycleDays} 天</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-b border-slate-100 relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopUpId(isPopUpActive ? null : g.id);
                        }}
                        className={`group px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 border ${
                          memberCount > 0 
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-200' 
                          : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                        }`}
                      >
                        <Layers className={`w-3 h-3 ${memberCount > 0 ? 'text-indigo-500 group-hover:text-white' : 'text-slate-300'}`} />
                        {memberCount} 個實體
                      </button>

                      {/* 修復後的 Pop-up 組件 */}
                      {memberCount > 0 && isPopUpActive && (
                        <div 
                          ref={popoverRef}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 sm:w-96 p-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 border border-slate-200 dark:border-slate-700/50 origin-top overflow-hidden"
                        >
                          {/* Pop-up Header */}
                          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-md">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg border border-indigo-200 dark:border-indigo-500/30">
                                <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold uppercase tracking-wider">成員詳細名冊</span>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">所屬組別：{g.name}</span>
                              </div>
                            </div>
                            <span className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded font-mono font-bold">
                              {memberCount} MEMBERS
                            </span>
                          </div>
                          
                          {/* Pop-up Content */}
                          <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-white dark:bg-slate-900">
                            {memberAccounts.map((member) => (
                              <div key={member.id} className="group/item flex flex-col p-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-indigo-500/10 border border-transparent hover:border-slate-100 dark:hover:border-indigo-500/20">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-200 transition-colors">
                                    {member.companyName}
                                  </span>
                                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover/item:text-indigo-400 opacity-0 group-hover/item:opacity-100 transition-all" />
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">ID: {member.id}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                  <span className="font-mono">限額: ${member.maxMonthlyLimit.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Pop-up Footer */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700/30 flex justify-center">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">End of member list</span>
                          </div>
                          
                          {/* 指示箭頭 (向上指向按鈕) */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-slate-100 dark:border-b-slate-800/80" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 border-b border-slate-100 text-right">
                      {isEditing ? (
                        <button onClick={() => setEditingGroupId(null)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center justify-end gap-1 ml-auto">
                          <Check className="w-4 h-4" /> 完成
                        </button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingGroupId(g.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteGroup(g.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </div>
  );
};
