import { useState, useEffect } from 'react';
import { Transaction } from './types';
import { HisaabDB } from './lib/db';
import { initAuth, GoogleUser } from './lib/auth';
import { SyncCoordinator } from './lib/sync';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import Reports from './components/Reports';
import SyncStatus from './components/SyncStatus';
import { Wallet, Landmark, BarChart2, CloudLightning } from 'lucide-react';

type Tab = 'tracker' | 'reports' | 'sync';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tracker');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [excludePersonal, setExcludePersonal] = useState<boolean>(() => {
    return localStorage.getItem('hisaab_exclude_personal') === 'true';
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showInstallPrompt, setShowInstallPrompt] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Load transactions and initialize authentication
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const list = await HisaabDB.getAll();
        setTransactions(list);
      } catch (err) {
        console.error('Error loading Local IndexedDB:', err);
      }
    };
    loadLocalData();

    // Init Firebase Auth & cache Google scopes token
    initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );

    // Online/Offline Listeners
    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync when back online
      SyncCoordinator.syncNow()
        .then(() => loadLocalData())
        .catch((err) => console.error('Auto sync on reconnect failed:', err));
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Update exclude personal selection preference
  const handleToggleExcludePersonal = () => {
    setExcludePersonal((prev) => {
      const next = !prev;
      localStorage.setItem('hisaab_exclude_personal', String(next));
      return next;
    });
  };

  // Add/Save a transaction
  const handleSaveTransaction = async (
    newTx: Omit<Transaction, 'id' | 'date' | 'time' | 'timestamp' | 'syncStatus'>
  ) => {
    const now = new Date();
    
    // Auto-formatting local date (YYYY-MM-DD)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Auto-formatting local time (HH:MM)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const tx: Transaction = {
      ...newTx,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      date: dateStr,
      time: timeStr,
      timestamp: Date.now(),
      syncStatus: 'pending',
    };

    // Save locally instantly
    try {
      await HisaabDB.save(tx);
      setTransactions((prev) => [tx, ...prev]);

      // If online and authenticated, trigger silent background sync
      if (user && isOnline) {
        SyncCoordinator.syncNow()
          .then(async () => {
            // Reload from IndexedDB to grab the updated synced state
            const list = await HisaabDB.getAll();
            setTransactions(list);
          })
          .catch((err) => console.error('Silent post-save sync failed:', err));
      }
    } catch (err) {
      console.error('Failed to save transaction:', err);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      await HisaabDB.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));

      // Synchronize deletion online
      if (user && isOnline) {
        SyncCoordinator.syncNow()
          .catch((err) => console.error('Sync after delete failed:', err));
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  // Refresh data list (e.g., after restore from Drive on login)
  const handleRefreshData = async () => {
    try {
      const list = await HisaabDB.getAll();
      setTransactions(list);
    } catch (err) {
      console.error('Failed to refresh list:', err);
    }
  };

  const triggerPWAInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 flex flex-col items-center py-4 px-3 sm:py-8 font-sans text-slate-800">
      {/* Mobile-First Frame container with professional smooth shadow and precise borders */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-[0_15px_40px_-15px_rgba(15,23,42,0.1)] flex flex-col overflow-hidden min-h-[92vh] sm:min-h-[85vh]">
        
        {/* App Title Header Bar - Soni Infotech Corporate Styling */}
        <header className="bg-slate-900 text-white p-5 flex flex-col gap-3 relative overflow-hidden">
          {/* Subtle design gradient accent behind header */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              {/* Premium Soni Infotech stylized tech icon */}
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Wallet size={18} className="text-white" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <h1 className="text-lg font-black tracking-tight leading-none text-white">Hisaab</h1>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    v1.2.0
                  </span>
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400 mt-0.5">
                  by Soni Infotech
                </p>
              </div>
            </div>

            {/* Offline-Only or Sync Warning status indicator */}
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <div className="bg-amber-500/10 text-amber-400 flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Offline
                </div>
              ) : user ? (
                <div className="bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  Synced
                </div>
              ) : (
                <div className="bg-slate-800 text-slate-400 flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase border border-slate-700">
                  Local Ledger
                </div>
              )}
            </div>
          </div>

          {/* PWA Install Notification Bar - Premium integration */}
          {showInstallPrompt && (
            <div className="mt-1 bg-gradient-to-r from-blue-900/40 to-slate-800/40 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between text-xs animate-fade-in relative z-10" id="pwa-prompt">
              <span className="font-medium text-slate-200 text-[11px]">Install Hisaab for fast desktop & mobile access</span>
              <button
                onClick={triggerPWAInstall}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wider uppercase px-3 py-1.5 rounded-lg text-[9px] transition cursor-pointer shadow-sm active:scale-95"
              >
                Install App
              </button>
            </div>
          )}
        </header>

        {/* Dynamic Screen View Controller Area */}
        <main className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-50/50">
          {activeTab === 'tracker' && (
            <div className="space-y-4 animate-fade-in" id="tracker-view">
              {/* Dashboard display stats metrics */}
              <Dashboard
                transactions={transactions}
                excludePersonal={excludePersonal}
                onToggleExcludePersonal={handleToggleExcludePersonal}
              />
              {/* Transaction save entry form */}
              <TransactionForm onSave={handleSaveTransaction} />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="animate-fade-in" id="reports-view">
              <Reports
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                excludePersonal={excludePersonal}
                onToggleExcludePersonal={handleToggleExcludePersonal}
              />
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="animate-fade-in" id="sync-view">
              <SyncStatus
                user={user}
                onUserChange={setUser}
                onRefreshData={handleRefreshData}
              />
            </div>
          )}
        </main>

        {/* One-Hand Friendly Bottom Navigation Bar - Polished professional styling */}
        <nav className="bg-white border-t border-slate-100 p-2.5 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.02)]" id="bottom-navbar">
          <button
            onClick={() => setActiveTab('tracker')}
            id="tab-tracker-btn"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === 'tracker'
                ? 'text-blue-600 font-extrabold bg-blue-50/60'
                : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
          >
            <Landmark size={20} className={activeTab === 'tracker' ? 'text-blue-600 stroke-[2.2px]' : 'text-slate-400'} />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Tracker</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            id="tab-reports-btn"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === 'reports'
                ? 'text-blue-600 font-extrabold bg-blue-50/60'
                : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
          >
            <BarChart2 size={20} className={activeTab === 'reports' ? 'text-blue-600 stroke-[2.2px]' : 'text-slate-400'} />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            id="tab-sync-btn"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-150 cursor-pointer ${
              activeTab === 'sync'
                ? 'text-blue-600 font-extrabold bg-blue-50/60'
                : 'text-slate-400 font-medium hover:text-slate-600'
            }`}
          >
            <CloudLightning size={20} className={activeTab === 'sync' ? 'text-blue-600 stroke-[2.2px]' : 'text-slate-400'} />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Backup</span>
          </button>
        </nav>

        {/* Corporate Soni Infotech Footer Credential */}
        <footer className="bg-slate-100/50 py-1.5 text-center text-[8px] font-semibold uppercase tracking-widest text-slate-400 border-t border-slate-150/50">
          Secured by Soni Infotech
        </footer>

      </div>
    </div>
  );
}
