
export interface CompanyAccount {
  id: string;
  name: string;
  companyName: string;
  maxMonthlyLimit: number;
  currentBalance: number;
  groupId?: string;
  isManual?: boolean;
}

export interface TransferGroup {
  id: string;
  name: string;
  accountIds: string[];
  cycleDays: number;
}

export interface ScheduledTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface SimulationConfig {
  accountCount: number;
  groupSize: number;
  cycleDays: number;
  globalMaxLimit: number;
  startDate: string;
  selectedAccountIds?: string[];
  autoExecutionEnabled: boolean;
  scheduledExecutionTime: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  config: SimulationConfig;
  involvedCompanies: string[];
  totalVolume: number;
  transferCount: number;
  groupCount: number;
}
