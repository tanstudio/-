
import { CompanyAccount, TransferGroup, ScheduledTransfer, SimulationConfig } from '../types';

export const generateSchedule = (
  accounts: CompanyAccount[],
  groups: TransferGroup[],
  config: SimulationConfig
): ScheduledTransfer[] => {
  const transfers: ScheduledTransfer[] = [];
  const startTimestamp = new Date(config.startDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  groups.forEach((group) => {
    const groupAccounts = group.accountIds
      .map(id => accounts.find(a => a.id === id))
      .filter((a): a is CompanyAccount => !!a);
    
    // 循環鏈至少需要 2 個實體
    if (groupAccounts.length < 2) return;

    // 計算該組別的安全循環量：取組內最低限額的 70%-90%
    const minLimitInGroup = Math.min(...groupAccounts.map(a => a.maxMonthlyLimit));
    const groupCirculationVolume = Math.floor(minLimitInGroup * (0.7 + Math.random() * 0.2));

    if (groupCirculationVolume <= 10) return; // 金額過小不進行模擬

    // 建立 A -> B -> C -> ... -> A 的閉環路徑
    for (let i = 0; i < groupAccounts.length; i++) {
      const fromAcc = groupAccounts[i];
      const toAcc = groupAccounts[(i + 1) % groupAccounts.length];

      if (fromAcc.id === toAcc.id) continue;

      // 根據總額決定拆分筆數，避免小額被過度拆分
      const numTransactions = groupCirculationVolume > 1000 ? (Math.floor(Math.random() * 4) + 6) : 3;
      let remainingTotal = groupCirculationVolume;

      for (let j = 0; j < numTransactions; j++) {
        const isLast = j === numTransactions - 1;
        let amount: number;

        if (isLast) {
          amount = remainingTotal;
        } else {
          // 確保每筆交易至少有 1 元，且保留足夠餘額給後續分錄
          const avgLeft = remainingTotal / (numTransactions - j);
          const maxPossible = Math.floor(remainingTotal * 0.5);
          const minPossible = Math.max(1, Math.floor(avgLeft * 0.5));
          
          amount = Math.floor(minPossible + Math.random() * (Math.max(1, maxPossible - minPossible)));
          remainingTotal -= amount;
        }

        if (amount <= 0) continue;

        // 隨機分佈在設定的週期內
        const randomDayOffset = Math.floor(Math.random() * group.cycleDays);
        const transferDate = new Date(startTimestamp + (randomDayOffset * dayMs));

        transfers.push({
          id: `tx-${Math.random().toString(36).substring(2, 11)}`,
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          amount,
          date: transferDate.toISOString().split('T')[0],
          status: 'pending'
        });
      }
    }
  });

  return transfers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
