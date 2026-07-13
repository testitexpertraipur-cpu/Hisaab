import { HisaabDB } from './db';
import { GoogleWorkspaceAPI } from './googleApi';
import { getAccessToken } from './auth';
import { Transaction } from '../types';

export class SyncCoordinator {
  private static isSyncing = false;
  private static onStateChangeCallbacks: ((state: { isSyncing: boolean; lastSyncedAt: string | null }) => void)[] = [];

  public static registerCallback(cb: (state: { isSyncing: boolean; lastSyncedAt: string | null }) => void) {
    this.onStateChangeCallbacks.push(cb);
  }

  public static unregisterCallback(cb: (state: { isSyncing: boolean; lastSyncedAt: string | null }) => void) {
    this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter(c => c !== cb);
  }

  private static notify() {
    const lastSync = localStorage.getItem('hisaab_last_synced') || null;
    this.onStateChangeCallbacks.forEach(cb => cb({ isSyncing: this.isSyncing, lastSyncedAt: lastSync }));
  }

  public static async syncNow(): Promise<boolean> {
    if (this.isSyncing) return false;
    const token = await getAccessToken();
    if (!token) {
      return false;
    }

    if (!navigator.onLine) {
      return false;
    }

    try {
      this.isSyncing = true;
      this.notify();

      // 1. Find or create Spreadsheet
      let spreadsheetId = localStorage.getItem('hisaab_spreadsheet_id');
      if (!spreadsheetId) {
        const sheetInfo = await GoogleWorkspaceAPI.findOrCreateSpreadsheet(token);
        spreadsheetId = sheetInfo.id;
        localStorage.setItem('hisaab_spreadsheet_id', spreadsheetId);
        localStorage.setItem('hisaab_spreadsheet_url', sheetInfo.url);
      }

      // 2. Synchronize all local transactions to the Sheet
      const currentTransactions = await HisaabDB.getAll();
      await GoogleWorkspaceAPI.syncTransactionsToSheet(token, spreadsheetId, currentTransactions);

      // 3. Backup the raw JSON file to Google Drive
      await GoogleWorkspaceAPI.backupToDrive(token, currentTransactions);

      // 4. Update syncStatus to 'synced' in IndexedDB
      let changed = false;
      const updated = currentTransactions.map(t => {
        if (t.syncStatus === 'pending') {
          t.syncStatus = 'synced';
          changed = true;
        }
        return t;
      });

      if (changed) {
        await HisaabDB.saveBulk(updated);
      }

      // Save sync timing
      const now = new Date().toISOString();
      localStorage.setItem('hisaab_last_synced', now);
      
      this.isSyncing = false;
      this.notify();
      return true;
    } catch (err) {
      console.error('Synchronization failed:', err);
      this.isSyncing = false;
      this.notify();
      throw err;
    }
  }

  public static async checkAndRestoreOnLogin(): Promise<Transaction[] | null> {
    const token = await getAccessToken();
    if (!token) return null;

    try {
      // Check if local DB is empty
      const local = await HisaabDB.getAll();
      if (local.length > 0) {
        // Local database has data, sync it up to avoid losing it
        await this.syncNow();
        return null;
      }

      // Local is empty! Try to restore from Drive
      const restored = await GoogleWorkspaceAPI.restoreFromDrive(token);
      if (restored && restored.length > 0) {
        // Save to local IndexedDB
        await HisaabDB.saveBulk(restored);
        
        // Also look up Spreadsheet
        const sheetInfo = await GoogleWorkspaceAPI.findOrCreateSpreadsheet(token);
        localStorage.setItem('hisaab_spreadsheet_id', sheetInfo.id);
        localStorage.setItem('hisaab_spreadsheet_url', sheetInfo.url);
        
        localStorage.setItem('hisaab_last_synced', new Date().toISOString());
        this.notify();
        return restored;
      }
    } catch (err) {
      console.error('Auto restore failed on login:', err);
    }
    return null;
  }
}
