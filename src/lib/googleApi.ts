import { Transaction } from '../types';

interface DriveFile {
  id: string;
  name: string;
  webViewLink?: string;
}

export class GoogleWorkspaceAPI {
  // 1. Spreadsheet Management
  public static async findOrCreateSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
    try {
      // Search for existing spreadsheet
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='Hisaab Tracker' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`;
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!searchRes.ok) {
        throw new Error('Failed to search Google Drive for spreadsheet');
      }

      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return {
          id: searchData.files[0].id,
          url: searchData.files[0].webViewLink || `https://docs.google.com/spreadsheets/d/${searchData.files[0].id}`,
        };
      }

      // If not found, create a new one
      const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: 'Hisaab Tracker',
          },
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create Google Spreadsheet');
      }

      const createData = await createRes.json();
      return {
        id: createData.spreadsheetId,
        url: createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${createData.spreadsheetId}`,
      };
    } catch (error) {
      console.error('findOrCreateSpreadsheet error:', error);
      throw error;
    }
  }

  public static async syncTransactionsToSheet(
    accessToken: string,
    spreadsheetId: string,
    transactions: Transaction[]
  ): Promise<void> {
    try {
      // 1. Clear the sheet first to prevent trailing stale rows
      const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Z10000:clear`;
      const clearRes = await fetch(clearUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!clearRes.ok) {
        throw new Error('Failed to clear Google Sheet before syncing');
      }

      // 2. Prepare data matrix
      const headers = ['Transaction ID', 'Date', 'Time', 'Description', 'Type', 'Expense Type', 'Amount (₹)'];
      // Sort oldest first for natural spreadsheet log ordering
      const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
      
      const rows = sortedTransactions.map((t) => [
        t.id,
        t.date,
        t.time,
        t.description,
        t.type,
        t.type === 'expense' ? t.expenseType : '-',
        t.amount,
      ]);

      const values = [headers, ...rows];

      // 3. Write data to sheet
      const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`;
      const writeRes = await fetch(writeUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      });

      if (!writeRes.ok) {
        throw new Error('Failed to write transactions to Google Sheet');
      }
    } catch (error) {
      console.error('syncTransactionsToSheet error:', error);
      throw error;
    }
  }

  // 2. Drive Backup & Restore Management
  public static async findBackupFile(accessToken: string): Promise<DriveFile | null> {
    try {
      const url = `https://www.googleapis.com/drive/v3/files?q=name='hisaab_backup.json' and trashed=false&fields=files(id,name)`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to search for backup file in Google Drive');
      }

      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0];
      }
      return null;
    } catch (error) {
      console.error('findBackupFile error:', error);
      return null;
    }
  }

  public static async backupToDrive(accessToken: string, transactions: Transaction[]): Promise<void> {
    try {
      const backupData = JSON.stringify(transactions, null, 2);
      const existingFile = await this.findBackupFile(accessToken);

      if (existingFile) {
        // Update content of existing file
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
        const updateRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: backupData,
        });

        if (!updateRes.ok) {
          throw new Error('Failed to update backup file on Google Drive');
        }
      } else {
        // Create file metadata
        const metadataUrl = 'https://www.googleapis.com/drive/v3/files';
        const metadataRes = await fetch(metadataUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'hisaab_backup.json',
            mimeType: 'application/json',
          }),
        });

        if (!metadataRes.ok) {
          throw new Error('Failed to create backup metadata on Google Drive');
        }

        const metadata = await metadataRes.json();
        const fileId = metadata.id;

        // Upload contents to newly created file
        const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: backupData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload backup contents to Google Drive');
        }
      }
    } catch (error) {
      console.error('backupToDrive error:', error);
      throw error;
    }
  }

  public static async restoreFromDrive(accessToken: string): Promise<Transaction[] | null> {
    try {
      const existingFile = await this.findBackupFile(accessToken);
      if (!existingFile) {
        return null;
      }

      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`;
      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to download backup content from Google Drive');
      }

      const transactions = await res.json();
      if (Array.isArray(transactions)) {
        return transactions;
      }
      return null;
    } catch (error) {
      console.error('restoreFromDrive error:', error);
      throw error;
    }
  }

  // 3. Enable Read-only Sharing Capability
  public static async enableSharing(accessToken: string, fileId: string): Promise<boolean> {
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create public share permissions on Google Spreadsheet');
      }

      return true;
    } catch (error) {
      console.error('enableSharing error:', error);
      return false;
    }
  }

  public static async checkSharingStatus(accessToken: string, fileId: string): Promise<boolean> {
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,role,type)`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) return false;
      const data = await res.json();
      if (data.permissions) {
        return data.permissions.some(
          (p: any) => p.role === 'reader' && p.type === 'anyone'
        );
      }
      return false;
    } catch (error) {
      console.error('checkSharingStatus error:', error);
      return false;
    }
  }
}
