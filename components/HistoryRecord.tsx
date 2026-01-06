
import React, { useState } from 'react';
import { HistoryEntry } from '../types';
import { History, Clock, Building, ChevronRight, X, Search, FileText, Info } from 'lucide-react';

interface HistoryRecordProps {
  history: HistoryEntry[];
  onClear: () => void;
}

export const HistoryRecord: React.FC<HistoryRecordProps> = ({ history, onClear }) => {
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = selectedEntry 
    ? selectedEntry.involvedCompanies.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            排程執行歷史
          </h2>
          <p className="text-sm text-slate-500">系統自動記錄每一次資金循環分錄的生成日誌。</p>
        </div>
        <button 
          onClick={onClear}
          className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
        >
          清除歷史記錄
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="px-6 py-4 border-b border-slate-100">執行時間</th>
                <th className="px-6 py-4 border-b border-slate-100">配置參數</th>
                <th className="px-6 py-4 border-b border-slate-100">參與實體</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">執行規模</th>
                <th className="px-6 py-4 border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <History className="w-12 h-12" />
                      <p className="text-sm font-medium">尚無歷史執行記錄</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{new Date(entry.timestamp).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{entry.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                          組大小: {entry.config.groupSize}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                          週期: {entry.config.cycleDays}d
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700 font-medium">{entry.involvedCompanies.length} 間公司</span>
                        <button 
                          onClick={() => { setSelectedEntry(entry); setSearchTerm(''); }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline underline-offset-2 ml-1"
                        >
                          查看明單
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-slate-900">${entry.totalVolume.toLocaleString()}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">{entry.transferCount} 筆交易 / {entry.groupCount} 組</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 明單詳情 Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                  <FileText className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">排程參與實體明單</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-indigo-600 font-bold">{selectedEntry.id}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(selectedEntry.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats & Search */}
            <div className="p-6 border-b border-slate-100 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">總公司數</p>
                  <p className="text-lg font-bold text-slate-800">{selectedEntry.involvedCompanies.length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">交易總額</p>
                  <p className="text-lg font-bold text-slate-800">${(selectedEntry.totalVolume / 1000000).toFixed(2)}M</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">平均每家</p>
                  <p className="text-lg font-bold text-slate-800">${(selectedEntry.totalVolume / selectedEntry.involvedCompanies.length).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="在參與實體中搜尋..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((name, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        {i + 1}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 truncate">{name}</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-400 italic flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <p>找不到符合條件的實體名稱</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <Info className="w-3 h-3" /> 
                歷史數據不可手動更改
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
