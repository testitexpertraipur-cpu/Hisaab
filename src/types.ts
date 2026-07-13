export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  expenseType: 'normal' | 'personal';
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  timestamp: number;
  syncStatus: 'synced' | 'pending';
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  isShared: boolean;
}
