
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CompanyAccount, TransferGroup, ScheduledTransfer, SimulationConfig, HistoryEntry } from './types';
import { generateSchedule } from './services/scheduler';
import { DashboardHeader } from './components/DashboardHeader';
import { AccountList } from './components/AccountList';
import { TransferSchedule } from './components/TransferSchedule';
import { EntityManager } from './components/EntityManager';
import { HistoryRecord } from './components/HistoryRecord';
import { Layout, Settings, Briefcase, X, ShieldAlert, Building, CalendarRange, Gauge, Hash, Layers, Zap, ArrowRight, CheckCircle2, Search, CheckSquare, Square, Clock, AlertCircle, History, Calendar } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>({
    accountCount: 30,
    groupSize: 5,
    cycleDays: 30,
    globalMaxLimit: 1000000,
    startDate: new Date().toISOString().split('T')[0],
    selectedAccountIds: [],
    autoExecutionEnabled: false,
    scheduledExecutionTime: '',
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'management' | 'history'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<SimulationConfig>(config);
  const [accounts, setAccounts] = useState<CompanyAccount[]>([]);
  const [groups, setGroups] = useState<TransferGroup[]>([]);
  const [transfers, setTransfers] = useState<ScheduledTransfer[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settingsSearch, setSettingsSearch] = useState('');
  const [settingsGroupFilter, setSettingsGroupFilter] = useState('all');
  
  const [selectedAuditId, setSelectedAuditId] = useState<string>('all');
  const [selectedAuditMonth, setSelectedAuditMonth] = useState<string>('all');
  
  const executionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeUntilExecution, setTimeUntilExecution] = useState<string>('');

  // 初始化數據
  useEffect(() => {
    const savedHistory = localStorage.getItem('nexus_transfer_history');
    const savedAccounts = localStorage.getItem('nexus_accounts');
    const savedGroups = localStorage.getItem('nexus_groups');

    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
    if (savedGroups) setGroups(JSON.parse(savedGroups));
  }, []);

  // 儲存狀態
  useEffect(() => {
    localStorage.setItem('nexus_transfer_history', JSON.stringify(history));
    localStorage.setItem('nexus_accounts', JSON.stringify(accounts));
    localStorage.setItem('nexus_groups', JSON.stringify(groups));
  }, [history, accounts, groups]);

  const initializeSystem = (
    targetConfig: SimulationConfig = config, 
    accountPool?: CompanyAccount[],
    forceResetAccountList: boolean = false
  ) => {
    let baseAccounts: CompanyAccount[] = [];
    
    if (accountPool && accountPool.length > 0) {
      baseAccounts = [...accountPool];
    } else if (!forceResetAccountList && accounts.length > 0) {
      baseAccounts = [...accounts];
    } else {
      const count = Math.max(2, targetConfig.accountCount);
      baseAccounts = Array.from({ length: count }).map((_, i) => ({
        id: `ACC-${1000 + i}`,
        name: `賬戶 ${i + 1}`,
        companyName: `實體 ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ''} 控股`,
        maxMonthlyLimit: targetConfig.globalMaxLimit * (0.8 + Math.random() * 0.4),
        currentBalance: 5000000,
      }));
    }

    const activeAccountIds = (targetConfig.selectedAccountIds && targetConfig.selectedAccountIds.length > 0)
      ? targetConfig.selectedAccountIds
      : baseAccounts.map(a => a.id);
    
    // 取得當前參與排程的實體（淺拷貝防止 Mutation）
    const activeAccounts = baseAccounts
      .filter(acc => activeAccountIds.includes(acc.id))
      .map(acc => ({ ...acc }));

    // 使用手動定義的組別作為基礎，計算當前成員
    const scheduleGroups: TransferGroup[] = groups.map(g => ({
      ...g,
      accountIds: activeAccounts.filter(acc => acc.groupId === g.id).map(a => a.id)
    }));

    // 找出未被手動指派的實體
    const unassignedAccounts = activeAccounts.filter(acc => 
      !groups.some(g => g.id === acc.groupId)
    );

    let groupIdx = 1;
    const isGlobalMode = targetConfig.groupSize >= 51 || targetConfig.groupSize >= unassignedAccounts.length;

    if (unassignedAccounts.length > 0) {
      if (isGlobalMode && unassignedAccounts.length >= 2) {
        const groupId = `GRP-GLOBAL-AUTO`;
        scheduleGroups.push({
          id: groupId,
          name: '自動全域循環池',
          accountIds: unassignedAccounts.map(a => a.id),
          cycleDays: targetConfig.cycleDays,
        });
      } else {
        const safeGroupSize = Math.max(2, targetConfig.groupSize);
        const tempUnassigned = [...unassignedAccounts];
        
        while (tempUnassigned.length > 0) {
          let batch = tempUnassigned.splice(0, safeGroupSize);
          if (batch.length === 1 && scheduleGroups.length > 0) {
            const lastGroup = scheduleGroups[scheduleGroups.length - 1];
            lastGroup.accountIds.push(batch[0].id);
          } else {
            const groupId = `GRP-AUTO-${groupIdx++}`;
            scheduleGroups.push({
              id: groupId,
              name: `自動循環鏈 ${groupIdx - 1}`,
              accountIds: batch.map(a => a.id),
              cycleDays: targetConfig.cycleDays,
            });
          }
        }
      }
    }

    setAccounts(baseAccounts);
    const schedule = generateSchedule(activeAccounts, scheduleGroups, targetConfig);
    setTransfers(schedule);
    
    if (schedule.length > 0 && !forceResetAccountList) {
      const newHistoryEntry: HistoryEntry = {
        id: `LOG-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        config: { ...targetConfig },
        involvedCompanies: activeAccounts.map(a => a.companyName),
        totalVolume: schedule.reduce((sum, tx) => sum + tx.amount, 0),
        transferCount: schedule.length,
        groupCount: scheduleGroups.length
      };
      setHistory(prev => [newHistoryEntry, ...prev].slice(0, 50));
    }

    if (forceResetAccountList) {
      const allIds = baseAccounts.map(a => a.id);
      setConfig({ ...targetConfig, selectedAccountIds: allIds });
      setTempConfig({ ...targetConfig, selectedAccountIds: allIds });
    } else {
      setConfig(targetConfig);
    }
  };

  useEffect(() => {
    if (executionTimerRef.current) clearInterval(executionTimerRef.current);
    if (config.autoExecutionEnabled && config.scheduledExecutionTime) {
      executionTimerRef.current = setInterval(() => {
        const now = new Date();
        const target = new Date(config.scheduledExecutionTime);
        const diff = target.getTime() - now.getTime();
        if (diff <= 0) {
          initializeSystem({ ...config, autoExecutionEnabled: false }); 
          if (executionTimerRef.current) clearInterval(executionTimerRef.current);
          setTimeUntilExecution('已完成執行');
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeUntilExecution(`${hours}h ${mins}m ${secs}s`);
        }
      }, 1000);
    } else {
      setTimeUntilExecution('');
    }
    return () => { if (executionTimerRef.current) clearInterval(executionTimerRef.current); };
  }, [config.autoExecutionEnabled, config.scheduledExecutionTime]);

  useEffect(() => { 
    if (accounts.length === 0) initializeSystem(config, undefined, true); 
  }, []);

  const handleUpdateAccount = (id: string, updates: Partial<CompanyAccount>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleAddAccount = (acc: Omit<CompanyAccount, 'id' | 'currentBalance'>) => {
    const newAcc: CompanyAccount = {
      ...acc,
      id: `ACC-${Math.floor(Math.random() * 9000) + 1000}`,
      currentBalance: 5000000,
      isManual: true
    };
    setAccounts(prev => [...prev, newAcc]);
    setTempConfig(prev => ({ ...prev, selectedAccountIds: [...(prev.selectedAccountIds || []), newAcc.id] }));
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setTempConfig(prev => ({ ...prev, selectedAccountIds: (prev.selectedAccountIds || []).filter(sid => sid !== id) }));
  };

  const handleAddGroup = (group: Omit<TransferGroup, 'id' | 'accountIds'>) => {
    const newGroup: TransferGroup = {
      ...group,
      id: `GRP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      accountIds: []
    };
    setGroups(prev => [...prev, newGroup]);
  };

  const handleUpdateGroup = (id: string, updates: Partial<TransferGroup>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    setAccounts(prev => prev.map(a => a.groupId === id ? { ...a, groupId: undefined } : a));
    if (settingsGroupFilter === id) setSettingsGroupFilter('all');
  };

  const handleUpdateTransfer = (id: string, updates: Partial<ScheduledTransfer>) => {
    setTransfers(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
  };

  const applyManualChanges = () => {
    initializeSystem({ ...config, accountCount: accounts.length, selectedAccountIds: tempConfig.selectedAccountIds }, accounts, false);
    setActiveTab('dashboard');
  };

  const totalVolume = useMemo(() => transfers.reduce((sum, tx) => sum + tx.amount, 0), [transfers]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transfers.forEach(tx => { months.add(tx.date.slice(0, 7)); });
    return ['all', ...Array.from(months).sort()];
  }, [transfers]);

  const auditData = useMemo(() => {
    if (!selectedAuditId) return null;
    const isGlobalAudit = selectedAuditId === 'all';
    const targetTransfers = selectedAuditMonth === 'all' ? transfers : transfers.filter(tx => tx.date.startsWith(selectedAuditMonth));
    const getStats = (accId: string) => {
      const outF = targetTransfers.filter(tx => tx.fromAccountId === accId).reduce((s, t) => s + t.amount, 0);
      const inF = targetTransfers.filter(tx => tx.toAccountId === accId).reduce((s, t) => s + t.amount, 0);
      return { inF, outF, diff: inF - outF };
    };
    if (isGlobalAudit) {
      const activeAccountIds = config.selectedAccountIds || accounts.map(a => a.id);
      const activeAccountsOnly = accounts.filter(a => activeAccountIds.includes(a.id));
      const breakdowns = activeAccountsOnly.map(acc => {
        const stats = getStats(acc.id);
        return { id: acc.id, name: acc.companyName, ...stats, isBalanced: Math.abs(Math.round(stats.diff)) === 0 };
      });
      const totalOut = targetTransfers.reduce((s, t) => s + t.amount, 0);
      return { id: 'SYSTEM', name: '所有參與實體 (系統總結)', month: selectedAuditMonth, inFlow: totalOut, outFlow: totalOut, diff: 0, isBalanced: true, isTotalAudit: selectedAuditMonth === 'all', isGlobalAudit: true, breakdowns: breakdowns };
    } else {
      const targetEntity = accounts.find(a => a.id === selectedAuditId);
      if (!targetEntity) return null;
      const stats = getStats(targetEntity.id);
      return { id: targetEntity.id, name: targetEntity.companyName, month: selectedAuditMonth, inFlow: stats.inF, outFlow: stats.outF, diff: stats.diff, isBalanced: Math.abs(Math.round(stats.diff)) === 0, isTotalAudit: selectedAuditMonth === 'all', isGlobalAudit: false, breakdowns: [] };
    }
  }, [transfers, accounts, selectedAuditId, selectedAuditMonth, config.selectedAccountIds]);

  const chartData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    transfers.forEach(tx => { dailyMap[tx.date] = (dailyMap[tx.date] || 0) + tx.amount; });
    return Object.entries(dailyMap).map(([date, amount]) => ({
      date: date.split('-').slice(1).join('/'),
      amount
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [transfers]);

  const filteredSettingsAccounts = useMemo(() => {
    return accounts.filter(a => {
      const matchesSearch = a.companyName.toLowerCase().includes(settingsSearch.toLowerCase()) || 
                           a.id.toLowerCase().includes(settingsSearch.toLowerCase());
      
      let matchesGroup = true;
      if (settingsGroupFilter === 'unassigned') {
        matchesGroup = !a.groupId;
      } else if (settingsGroupFilter !== 'all') {
        matchesGroup = a.groupId === settingsGroupFilter;
      }
      
      return matchesSearch && matchesGroup;
    });
  }, [accounts, settingsSearch, settingsGroupFilter]);

  const toggleAccountSelection = (id: string) => {
    const current = tempConfig.selectedAccountIds || [];
    setTempConfig(prev => ({
      ...prev,
      selectedAccountIds: current.includes(id) ? current.filter(cid => cid !== id) : [...current, id]
    }));
  };

  const selectAllAccounts = (select: boolean) => {
    setTempConfig(prev => ({ ...prev, selectedAccountIds: select ? accounts.map(a => a.id) : [] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative overflow-x-hidden">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-200">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">Nexus 資金調度系統</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Gauge className="w-4 h-4 inline-block mr-1" /> 儀表板
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <History className="w-4 h-4 inline-block mr-1" /> 歷史記錄
            </button>
            <button onClick={() => setActiveTab('management')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'management' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Building className="w-4 h-4 inline-block mr-1" /> 後台管理
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => { setTempConfig(config); setIsSettingsOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-sm font-medium border border-transparent hover:border-indigo-100">
              <Settings className="w-4 h-4" />系統設定
            </button>
          </div>
        </div>
      </nav>

      {isSettingsOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setIsSettingsOpen(false)} />}
      <aside className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[60] transform transition-transform duration-300 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">系統核心設定</h2>
            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section className="space-y-6">
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" /> 自動化預約計畫
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={tempConfig.autoExecutionEnabled} onChange={(e) => setTempConfig({...tempConfig, autoExecutionEnabled: e.target.checked})} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                {tempConfig.autoExecutionEnabled && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <input type="datetime-local" className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={tempConfig.scheduledExecutionTime} onChange={(e) => setTempConfig({...tempConfig, scheduledExecutionTime: e.target.value})} />
                  </div>
                )}
              </div>

              {/* 新增：排程起始日期 */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" /> 排程起始日期
                </label>
                <div className="relative group">
                  <input 
                    type="date" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all group-hover:bg-white"
                    value={tempConfig.startDate}
                    onChange={(e) => setTempConfig({...tempConfig, startDate: e.target.value})}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium px-1 italic">
                  * 系統將根據此日期為基準，在設定的週期內分散生成分錄。
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Building className="w-4 h-4 text-indigo-500" /> 選擇參與排程的實體</label>
                  <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{filteredSettingsAccounts.length} 顯示</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <select 
                      value={settingsGroupFilter}
                      onChange={(e) => setSettingsGroupFilter(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">所有組別 (全部實體)</option>
                      <option value="unassigned">未指派 (自動分配)</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>指定組別：{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="搜尋公司名稱或 ID..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" value={settingsSearch} onChange={(e) => setSettingsSearch(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-2 mb-2"><button onClick={() => selectAllAccounts(true)} className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded border border-indigo-100 transition-colors">全選所有</button><button onClick={() => selectAllAccounts(false)} className="text-[10px] font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded border border-slate-100 transition-colors">全部取消</button></div>
                <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/50 p-2 space-y-1 scrollbar-thin">
                  {filteredSettingsAccounts.length > 0 ? (
                    filteredSettingsAccounts.map(acc => {
                      const isSelected = (tempConfig.selectedAccountIds || []).includes(acc.id);
                      const groupName = groups.find(g => g.id === acc.groupId)?.name;
                      return (
                        <div key={acc.id} onClick={() => toggleAccountSelection(acc.id)} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}>
                          {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{acc.companyName}</span>
                            <span className="text-[9px] font-mono text-slate-400">{acc.id} {groupName ? `| ${groupName}` : ''}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (<div className="py-8 text-center text-[10px] text-slate-400 italic">無匹配的實體</div>)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Layers className="w-4 h-4 text-emerald-500" /> 循環鏈分組大小</label><input type="number" min="2" className="w-20 px-2 py-1 text-center border border-slate-200 rounded-lg text-xs font-bold" value={tempConfig.groupSize} onChange={(e) => setTempConfig({...tempConfig, groupSize: parseInt(e.target.value) || 2})} /></div>
                <input type="range" min="2" max="50" className="w-full accent-emerald-600" value={tempConfig.groupSize} onChange={(e) => setTempConfig({...tempConfig, groupSize: parseInt(e.target.value)})} />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><CalendarRange className="w-4 h-4 text-amber-500" /> 分散週期</label><span className="text-xs font-bold text-amber-700">{tempConfig.cycleDays} 天</span></div>
                <input type="range" min="1" max="365" className="w-full accent-amber-600" value={tempConfig.cycleDays} onChange={(e) => setTempConfig({...tempConfig, cycleDays: parseInt(e.target.value)})} />
              </div>
            </section>
          </div>
          <div className="p-6 border-t bg-slate-50"><button onClick={() => { initializeSystem(tempConfig, undefined, false); setIsSettingsOpen(false); }} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]">更新計畫並重新排程</button></div>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {activeTab === 'dashboard' ? (
          <>
            <DashboardHeader totalAccounts={config.selectedAccountIds?.length || accounts.length} totalVolume={totalVolume} activeGroups={groups.length} scheduledTransfers={transfers.length} />
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all duration-300">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-indigo-600" /><div><h2 className="text-lg font-bold text-slate-800 leading-tight">實體資金循環審計 (Conservation Check)</h2><p className="text-xs text-slate-500">正在進行全系統守恆分析，僅包含已選擇參與的實體。</p></div></div>
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto"><select value={selectedAuditMonth} onChange={(e) => setSelectedAuditMonth(e.target.value)} className="pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none">{availableMonths.map(m => <option key={m} value={m}>{m === 'all' ? '全週期' : m}</option>)}</select><select value={selectedAuditId} onChange={(e) => setSelectedAuditId(e.target.value)} className="flex-1 min-w-[300px] pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none"><option value="all">所有參與實體</option>{accounts.filter(a => (config.selectedAccountIds || []).includes(a.id)).map(acc => (<option key={acc.id} value={acc.id}>{acc.companyName}</option>))}</select></div>
              </div>
              {auditData ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500"><div className="bg-slate-50 p-5 rounded-xl border border-slate-100"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">累計流出</p><p className="text-2xl font-mono font-bold text-red-600">${auditData.outFlow.toLocaleString()}</p></div><div className="bg-slate-50 p-5 rounded-xl border border-slate-100"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">累計流入</p><p className="text-2xl font-mono font-bold text-emerald-600">${auditData.inFlow.toLocaleString()}</p></div><div className={`p-5 rounded-xl border ${auditData.isBalanced ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">閉環驗證</p><p className={`text-2xl font-mono font-bold ${auditData.isBalanced ? 'text-indigo-700' : 'text-amber-700'}`}>${auditData.diff.toLocaleString()}</p></div></div>
                  {auditData.isGlobalAudit && (<div className="border border-slate-200 rounded-xl overflow-hidden"><table className="w-full text-left border-collapse"><thead><tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50"><th className="px-6 py-3 border-b border-slate-100">公司名稱</th><th className="px-6 py-3 border-b border-slate-100 text-right">流出</th><th className="px-6 py-3 border-b border-slate-100 text-right">流入</th><th className="px-6 py-3 border-b border-slate-100 text-center">狀態</th></tr></thead><tbody className="divide-y divide-slate-100">{auditData.breakdowns.map((item) => (<tr key={item.id} className="hover:bg-slate-50/80 transition-colors"><td className="px-6 py-3 text-xs font-bold text-slate-800">{item.name}</td><td className="px-6 py-3 text-right text-xs font-mono text-red-500">-${item.outF.toLocaleString()}</td><td className="px-6 py-3 text-right text-xs font-mono text-emerald-600">+${item.inF.toLocaleString()}</td><td className="px-6 py-3 text-center">{item.isBalanced ? (<CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />) : (<div className="w-2 h-2 rounded-full bg-amber-400 mx-auto" />)}</td></tr>))}</tbody></table></div>)}
                </div>
              ) : (<div className="py-12 text-center text-slate-400">請選擇審計對象</div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[450px]"><h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-600" />每日資金流動預測</h2><ResponsiveContainer width="100%" height="85%"><AreaChart data={chartData}><defs><linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} /><Tooltip /><Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt)" /></AreaChart></ResponsiveContainer></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><h2 className="text-lg font-bold text-slate-800 mb-4">系統操作</h2><div className="space-y-4"><button onClick={() => initializeSystem(config, accounts, false)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">手動重整循環分錄</button><div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100"><p className="text-[10px] text-indigo-400 font-bold uppercase mb-2">系統狀態</p><div className="flex justify-between text-xs mb-1"><span className="text-slate-600">活動實體</span><span className="font-bold">{config.selectedAccountIds?.length || accounts.length}</span></div><div className="flex justify-between text-xs"><span className="text-slate-600">自定義組別</span><span className="font-bold">{groups.length}</span></div></div></div></div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8"><div className="xl:col-span-1"><AccountList accounts={accounts} groups={groups} /></div><div className="xl:col-span-3"><TransferSchedule transfers={transfers} accounts={accounts} groups={groups} onUpdateTransfer={handleUpdateTransfer} /></div></div>
          </>
        ) : activeTab === 'management' ? (
          <EntityManager 
            accounts={accounts} 
            groups={groups}
            onAdd={handleAddAccount} 
            onUpdate={handleUpdateAccount} 
            onDelete={handleDeleteAccount} 
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onApply={applyManualChanges} 
          />
        ) : (
          <HistoryRecord history={history} onClear={() => setHistory([])} />
        )}
      </main>
    </div>
  );
};

export default App;
