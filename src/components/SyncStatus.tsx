import { useState, useEffect } from 'react';
import { googleSignIn, logout, getAccessToken, GoogleUser } from '../lib/auth';
import { SyncCoordinator } from '../lib/sync';
import { GoogleWorkspaceAPI } from '../lib/googleApi';
import { Cloud, CloudOff, RefreshCw, LogOut, Check, FileSpreadsheet, Share2, Copy } from 'lucide-react';

interface SyncStatusProps {
  user: GoogleUser | null;
  onUserChange: (user: GoogleUser | null) => void;
  onRefreshData: () => void;
}

export default function SyncStatus({ user, onUserChange, onRefreshData }: SyncStatusProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load state and listen to SyncCoordinator callbacks
  useEffect(() => {
    setLastSyncedAt(localStorage.getItem('hisaab_last_synced'));
    setSpreadsheetUrl(localStorage.getItem('hisaab_spreadsheet_url'));

    const syncCallback = (state: { isSyncing: boolean; lastSyncedAt: string | null }) => {
      setIsSyncing(state.isSyncing);
      setLastSyncedAt(state.lastSyncedAt);
      setSpreadsheetUrl(localStorage.getItem('hisaab_spreadsheet_url'));
    };

    SyncCoordinator.registerCallback(syncCallback);
    return () => {
      SyncCoordinator.unregisterCallback(syncCallback);
    };
  }, []);

  // Check spreadsheet public sharing status when spreadsheetUrl changes or user signs in
  useEffect(() => {
    const fetchSharingStatus = async () => {
      if (!user) return;
      const sheetId = localStorage.getItem('hisaab_spreadsheet_id');
      const token = await getAccessToken();
      if (sheetId && token) {
        const shared = await GoogleWorkspaceAPI.checkSharingStatus(token, sheetId);
        setIsShared(shared);
        if (shared && spreadsheetUrl) {
          setShareUrl(spreadsheetUrl);
        }
      }
    };
    fetchSharingStatus();
  }, [user, spreadsheetUrl]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onUserChange(res.user);
        // Automatically check and restore database from drive if empty
        const restored = await SyncCoordinator.checkAndRestoreOnLogin();
        if (restored) {
          onRefreshData();
        } else {
          // Otherwise sync the existing local transactions up
          await SyncCoordinator.syncNow();
          onRefreshData();
        }
      }
    } catch (err: any) {
      console.error('Google link error:', err);
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Sign out from Hisaab? Local data will still remain on this device.')) {
      try {
        await logout();
        onUserChange(null);
        localStorage.removeItem('hisaab_spreadsheet_id');
        localStorage.removeItem('hisaab_spreadsheet_url');
        localStorage.removeItem('hisaab_last_synced');
        setSpreadsheetUrl(null);
        setShareUrl(null);
        setIsShared(false);
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setErrorMessage(null);
    try {
      const success = await SyncCoordinator.syncNow();
      if (success) {
        onRefreshData();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync failed. Are you online?');
    }
  };

  const handleEnableSharing = async () => {
    const sheetId = localStorage.getItem('hisaab_spreadsheet_id');
    const token = await getAccessToken();
    if (!sheetId || !token) return;

    setErrorMessage(null);
    try {
      const success = await GoogleWorkspaceAPI.enableSharing(token, sheetId);
      if (success) {
        setIsShared(true);
        if (spreadsheetUrl) {
          setShareUrl(spreadsheetUrl);
        }
      }
    } catch (err: any) {
      setErrorMessage('Failed to enable spreadsheet sharing.');
    }
  };

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLastSynced = (isoString: string | null) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4" id="sync-status-card">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1 px-1 flex items-center justify-between">
        <span>Cloud Sync & Backup</span>
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${
          navigator.onLine ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${navigator.onLine ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          {navigator.onLine ? 'Online' : 'Offline'}
        </span>
      </h2>

      {errorMessage && (
        <div className="bg-rose-50 text-rose-800 text-xs font-semibold p-3 rounded-xl border border-rose-100" id="sync-error-banner">
          {errorMessage}
        </div>
      )}

      {!user ? (
        <div className="space-y-3 py-2 text-center" id="not-connected-wrapper">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-100">
            <CloudOff size={20} strokeWidth={2} />
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className="text-sm font-bold text-slate-800">Offline-First Ledger</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your ledger saves instantly to local IndexedDB. Connect Google Drive and Sheets to secure automated backups and live synchronization.
            </p>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            id="google-connect-btn"
            className="w-full mt-2 cursor-pointer flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-sm hover:shadow active:scale-[0.99]"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{isLoggingIn ? 'Connecting...' : 'Sync G-Drive Account'}</span>
          </button>

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-left mt-3">
            <p className="text-[11px] text-blue-800 font-semibold leading-relaxed flex items-start gap-1.5">
              <span className="text-base leading-none">💡</span>
              <span>
                <strong>Kisi bhi Gmail se connect karein:</strong> Aap backup ke liye <strong>koi bhi Gmail / Google account</strong> use kar sakte hain. Agar aapka phone kisi dusre email par chal raha hai tab bhi aap login screen par <em>"Use another account"</em> select karke apna personal backup email jod sakte hain!
              </span>
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4" id="connected-wrapper">
          {/* User account details info box */}
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100" id="account-info-box">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user.displayName || 'Google User'}
              </p>
              <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
              title="Disconnect Google Account"
            >
              <LogOut size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Sync Stats list */}
          <div className="space-y-2 text-xs font-medium text-slate-600" id="sync-stats-list">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100/50">
              <span className="flex items-center gap-1.5">
                <Cloud size={14} className="text-emerald-500" />
                Google Drive Backup
              </span>
              <span className="text-slate-400 text-[10px] font-mono">Automatic</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100/50">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet size={14} className="text-emerald-500" />
                Google Sheets Log
              </span>
              <span className="text-slate-400 text-[10px] font-mono">Live</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100/50">
              <span className="text-slate-400">Last Synced:</span>
              <span className="text-slate-700 font-mono text-[10px]">{formatLastSynced(lastSyncedAt)}</span>
            </div>
          </div>

          {/* Open Sheet & Sync Action Buttons */}
          <div className="grid grid-cols-2 gap-2" id="connected-actions-grid">
            {spreadsheetUrl ? (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                id="open-sheet-link"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all text-center shadow-sm"
              >
                <FileSpreadsheet size={12} strokeWidth={2} className="text-emerald-600" />
                Open Sheet
              </a>
            ) : (
              <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                Preparing Sheet...
              </div>
            )}

            <button
              onClick={handleManualSync}
              disabled={isSyncing || !navigator.onLine}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                isSyncing
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.99] shadow-sm disabled:opacity-50'
              }`}
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} strokeWidth={2} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Read-Only Sharing Controller */}
          {spreadsheetUrl && (
            <div className="pt-2 border-t border-slate-100 space-y-2" id="sharing-controller">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Share2 size={12} strokeWidth={2} className="text-slate-500" />
                  Read-Only Link Share
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  isShared ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {isShared ? 'Shared' : 'Private'}
                </span>
              </div>

              {!isShared ? (
                <button
                  onClick={handleEnableSharing}
                  className="w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Share2 size={12} strokeWidth={2} />
                  Enable Read-Only Share
                </button>
              ) : (
                <div className="flex gap-1.5" id="share-link-copy-wrapper">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl || ''}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    title="Copy Share URL"
                  >
                    {copied ? <Check size={11} strokeWidth={2} /> : <Copy size={11} strokeWidth={2} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
