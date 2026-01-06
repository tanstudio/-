
import React from 'react';
import { Activity, ShieldCheck, TrendingUp, Users } from 'lucide-react';

interface StatsProps {
  totalAccounts: number;
  totalVolume: number;
  activeGroups: number;
  scheduledTransfers: number;
}

export const DashboardHeader: React.FC<StatsProps> = ({ 
  totalAccounts, 
  totalVolume, 
  activeGroups, 
  scheduledTransfers 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard 
        icon={<Users className="w-6 h-6 text-blue-600" />} 
        label="管理實體" 
        value={totalAccounts.toString()} 
        subtext="受控公司賬戶"
      />
      <StatCard 
        icon={<TrendingUp className="w-6 h-6 text-green-600" />} 
        label="月度循環總額" 
        value={`$${(totalVolume / 1000000).toFixed(2)}M`} 
        subtext="預計總流量"
      />
      <StatCard 
        icon={<Activity className="w-6 h-6 text-purple-600" />} 
        label="流動性分組" 
        value={activeGroups.toString()} 
        subtext="自動循環鏈結"
      />
      <StatCard 
        icon={<ShieldCheck className="w-6 h-6 text-amber-600" />} 
        label="待處理任務" 
        value={scheduledTransfers.toString()} 
        subtext="排程自動化操作"
      />
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subtext: string }> = ({ 
  icon, label, value, subtext 
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
    <div>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      <p className="text-sm text-slate-500">{subtext}</p>
    </div>
  </div>
);
