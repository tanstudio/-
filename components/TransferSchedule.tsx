
import React, { useState, useMemo } from 'react';
import { ScheduledTransfer, CompanyAccount, TransferGroup } from '../types';
import { Calendar, ArrowRightLeft, Search, Download, ChevronUp, ChevronDown, Filter, DollarSign, Layers, SlidersHorizontal, X, ArrowUpRight, ArrowDownLeft, Edit2, Check } from 'lucide-react';

interface TransferScheduleProps {
  transfers: ScheduledTransfer[];
  accounts: CompanyAccount[];
  groups: TransferGroup[];
  onUpdateTransfer: (id: string, updates: Partial<ScheduledTransfer>) => void;
}

type SortField = 'date' | 'amount' | 'status' | 'fromAccount' | 'toAccount';
type SortOrder = 'asc' | 'desc';

export const TransferSchedule: React.FC<TransferScheduleProps> = ({ transfers, accounts, groups, onUpdateTransfer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [groupIdFilter, setGroupIdFilter] = useState<string>('all');
  const [fromAccountIdFilter, setFromAccountIdFilter] = useState<string>('all');
  const [toAccountIdFilter, setToAccountIdFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState<string>('');

  const getAccountName = (id: string) => {
    return accounts.find(a => a.id === id)?.companyName || id;
  };

  const getGroupLabel = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return 'N/A';
    
    // 先找自定義組別
    const customGroup = groups.find(g => g.id === acc.groupId);
    if (customGroup) return customGroup.name;

    // 若是自動分組，通常會帶有 GRP-AUTO 前綴
    if (acc.groupId?.startsWith('GRP-AUTO')) {
      return `自動鏈 ${acc.groupId.split('-').pop()}`;
    }
    
    if (acc.groupId === 'GRP-GLOBAL-AUTO') return '全域循環池';
    
    return acc.groupId || '自動調度';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSaveDate = (id: string) => {
    if (tempDate) {
      onUpdateTransfer(id, { date: tempDate });
    }
    setEditingTxId(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setGroupIdFilter('all');
    setFromAccountIdFilter('all');
    setToAccountIdFilter('all');
    setMinAmount('');
    setMaxAmount('');
  };

  const processedTransfers = useMemo(() => {
    let result = transfers.filter(tx => {
      const matchesSearch = 
        getAccountName(tx.fromAccountId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getAccountName(tx.toAccountId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.date.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
      
      const acc = accounts.find(a => a.id === tx.fromAccountId);
      const matchesGroup = groupIdFilter === 'all' || acc?.groupId === groupIdFilter;

      const matchesFromAcc = fromAccountIdFilter === 'all' || tx.fromAccountId === fromAccountIdFilter;
      const matchesToAcc = toAccountIdFilter === 'all' || tx.toAccountId === toAccountIdFilter;

      const min = minAmount !== '' ? parseFloat(minAmount) : -Infinity;
      const max = maxAmount !== '' ? parseFloat(maxAmount) : Infinity;
      const matchesAmount = tx.amount >= min && tx.amount <= max;
      
      return matchesSearch && matchesStatus && matchesGroup && matchesFromAcc && matchesToAcc && matchesAmount;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'fromAccount') {
        comparison = getAccountName(a.fromAccountId).localeCompare(getAccountName(b.fromAccountId));
      } else if (sortField === 'toAccount') {
        comparison = getAccountName(a.toAccountId).localeCompare(getAccountName(b.toAccountId));
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transfers, searchTerm, statusFilter, groupIdFilter, fromAccountIdFilter, toAccountIdFilter, minAmount, maxAmount, sortField, sortOrder, accounts]);

  const exportToCSV = () => {
    const headers = ['日期', '出賬賬戶', '入賬賬戶', '金額', '狀態', '所屬組別'];
    const rows = processedTransfers.map(tx => [
      tx.date,
      getAccountName(tx.fromAccountId),
      getAccountName(tx.toAccountId),
      tx.amount,
      tx.status === 'pending' ? '處理中' : '已完成',
      getGroupLabel(tx.fromAccountId)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `轉賬排程表_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-30"><ChevronUp className="w-3 h-3" /></div>;
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" /> : 
      <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  const activeFilterCount = [
    statusFilter !== 'all',
    groupIdFilter !== 'all',
    fromAccountIdFilter !== 'all',
    toAccountIdFilter !== 'all',
    minAmount !== '',
    maxAmount !== ''
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              資金轉賬編排計畫
            </h2>
            <p className="text-sm text-slate-500">已過濾與排序的自動化分錄異動明細。</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋公司或日期..." 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                showAdvancedFilters || activeFilterCount > 0 
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              篩選條件
              {activeFilterCount > 0 && (
                <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              匯出 CSV
            </button>
          </div>
        </div>

        {(showAdvancedFilters || activeFilterCount > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3" /> 循環組別
              </label>
              <select 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={groupIdFilter}
                onChange={(e) => setGroupIdFilter(e.target.value)}
              >
                <option value="all">所有組別</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-red-500" /> 出帳實體
              </label>
              <select 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={fromAccountIdFilter}
                onChange={(e) => setFromAccountIdFilter(e.target.value)}
              >
                <option value="all">所有來源</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.companyName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> 入賬實體
              </label>
              <select 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={toAccountIdFilter}
                onChange={(e) => setToAccountIdFilter(e.target.value)}
              >
                <option value="all">所有目的</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.companyName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3" /> 執行狀態
              </label>
              <select 
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">所有狀態</option>
                <option value="pending">等待處理</option>
                <option value="completed">處理完畢</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> 最低金額
              </label>
              <input 
                type="number" 
                placeholder="最小額度"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> 最高金額
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="最大額度"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
                <button 
                  onClick={resetFilters}
                  className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-lg transition-colors"
                  title="重置篩選"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
              <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('date')}>
                <div className="flex items-center">交易日期 <SortIndicator field="date" /></div>
              </th>
              <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('fromAccount')}>
                <div className="flex items-center">出賬實體 (來源) <SortIndicator field="fromAccount" /></div>
              </th>
              <th className="px-6 py-3 border-b border-slate-100 text-center w-12"></th>
              <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('toAccount')}>
                <div className="flex items-center">入賬實體 (目的) <SortIndicator field="toAccount" /></div>
              </th>
              <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group text-right" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end">交易金額 <SortIndicator field="amount" /></div>
              </th>
              <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('status')}>
                <div className="flex items-center">狀態 <SortIndicator field="status" /></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {processedTransfers.map((tx) => {
              const isEditing = editingTxId === tx.id;
              return (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 border-b border-slate-100 min-w-[140px]">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          autoFocus
                          type="date" 
                          className="w-full text-[11px] border border-indigo-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          value={tempDate}
                          onChange={(e) => setTempDate(e.target.value)}
                        />
                        <button onClick={() => handleSaveDate(tx.id)} className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingTxId(null)} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group/date">
                        <span className="text-sm text-slate-600 font-medium">{tx.date}</span>
                        <button 
                          onClick={() => { setEditingTxId(tx.id); setTempDate(tx.date); }}
                          className="opacity-0 group-hover/date:opacity-100 p-1 hover:bg-slate-100 rounded transition-all ml-2"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400 hover:text-indigo-500" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">{getAccountName(tx.fromAccountId)}</span>
                      <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter bg-indigo-50 w-fit px-1.5 py-0.5 rounded mt-0.5 border border-indigo-100 shadow-sm">
                        {getGroupLabel(tx.fromAccountId)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100 text-center">
                    <ArrowRightLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors mx-auto" />
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">{getAccountName(tx.toAccountId)}</p>
                    <p className="text-xs text-slate-400 font-mono">{tx.toAccountId}</p>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100 text-right">
                    <span className="text-sm font-bold text-slate-900">${tx.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-100">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                      tx.status === 'pending' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {tx.status === 'pending' ? '等待處理' : '處理完畢'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
        <div>顯示 {processedTransfers.length} 筆交易記錄</div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            待處理: <span className="text-slate-900 font-bold">${processedTransfers.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            已完成: <span className="text-slate-900 font-bold">${processedTransfers.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0).toLocaleString()}</span>
          </div>
          <div className="text-indigo-600">
            篩選總計: <span className="text-slate-900 font-bold text-sm">${processedTransfers.reduce((s, t) => s + t.amount, 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
