import { useState } from 'react';
import { Transaction } from '../types';
import { Trash2, AlertTriangle, Calendar, Filter } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  excludePersonal: boolean;
  onToggleExcludePersonal: () => void;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'all';

export default function Reports({
  transactions,
  onDeleteTransaction,
  excludePersonal,
  onToggleExcludePersonal,
}: ReportsProps) {
  const [period, setPeriod] = useState<Period>('all');

  // Helpers to check date ranges
  const getTodayString = () => {
    // Return local date in YYYY-MM-DD format based on local system clock
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isWithinDays = (dateStr: string, daysLimit: number) => {
    const tDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = today.getTime() - tDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays < daysLimit;
  };

  // Filter transactions by Period
  const periodFiltered = transactions.filter((t) => {
    if (period === 'daily') {
      return t.date === getTodayString();
    }
    if (period === 'weekly') {
      return isWithinDays(t.date, 7);
    }
    if (period === 'monthly') {
      return isWithinDays(t.date, 30);
    }
    return true; // All Time
  });

  // Calculate Metrics for the period BEFORE excluding personal (to show actual personal expenses too)
  const periodIncome = periodFiltered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodExpenseTotal = periodFiltered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodPersonalExpense = periodFiltered
    .filter((t) => t.type === 'expense' && t.expenseType === 'personal')
    .reduce((sum, t) => sum + t.amount, 0);

  // Now filter out personal expenses for final calculations if toggle is on
  const finalFilteredList = periodFiltered.filter((t) => {
    if (excludePersonal && t.type === 'expense' && t.expenseType === 'personal') {
      return false;
    }
    return true;
  });

  const finalIncome = finalFilteredList
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const finalExpense = finalFilteredList
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = finalIncome - finalExpense;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleDeleteClick = (id: string, desc: string, amt: number) => {
    if (window.confirm(`Delete "${desc}" (₹${amt})? This cannot be undone.`)) {
      onDeleteTransaction(id);
    }
  };

  return (
    <div className="space-y-4" id="reports-container">
      {/* Filters Card - Modern and clean */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm" id="reports-filters-card">
        <div className="flex items-center justify-between mb-3.5" id="filters-header">
          <h2 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Filter size={12} strokeWidth={2.5} />
            Report Period
          </h2>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exclude Personal:</span>
            <input
              type="checkbox"
              checked={excludePersonal}
              onChange={onToggleExcludePersonal}
              id="exclude-personal-checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        {/* Period Selector Tabs - Segmented design */}
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl" id="period-tabs">
          {(['daily', 'weekly', 'monthly', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                period === p
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Period Summary Cards Grid - Left-border accents */}
      <div className="grid grid-cols-2 gap-3" id="period-metrics-grid">
        <div className="rounded-xl border border-slate-200/80 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Income</p>
          <p className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(finalIncome)}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 border-l-4 border-l-rose-500 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Expense</p>
          <p className="text-lg font-black text-rose-600 mt-1">{formatCurrency(finalExpense)}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 border-l-4 border-l-amber-500 bg-amber-50/20 p-4 shadow-sm relative overflow-hidden">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Personal</p>
          <p className="text-lg font-black text-amber-700 mt-1">{formatCurrency(periodPersonalExpense)}</p>
          {excludePersonal && periodPersonalExpense > 0 && (
            <div className="absolute right-2.5 bottom-2.5 text-amber-600" title="Excluded from Net Balance">
              <AlertTriangle size={13} strokeWidth={2.5} />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md text-white">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Net Balance</p>
          <p className="text-lg font-black mt-1 text-slate-100">{formatCurrency(netBalance)}</p>
        </div>
      </div>

      {/* Transactions List - Modernized card wrapper */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" id="period-transactions-card">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calendar size={12} strokeWidth={2.5} />
            Ledger Entries ({finalFilteredList.length})
          </h3>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            Filtered view
          </span>
        </div>

        {finalFilteredList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            No entries found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1" id="transactions-scroller">
            {finalFilteredList.map((t) => (
              <div
                key={t.id}
                id={`tx-${t.id}`}
                className="flex items-center justify-between py-2.5 hover:bg-slate-50 rounded-lg px-2 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-700">
                      {t.description}
                    </p>
                    {t.type === 'expense' && t.expenseType === 'personal' && (
                      <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-700">
                        Personal
                      </span>
                    )}
                    {t.syncStatus === 'pending' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" title="Pending sync"></span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                    {t.date} at {t.time}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <p
                    className={`text-sm font-bold ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <button
                    onClick={() => handleDeleteClick(t.id, t.description, t.amount)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-150 cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
