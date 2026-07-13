import { Transaction } from '../types';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  excludePersonal: boolean;
  onToggleExcludePersonal: () => void;
}

export default function Dashboard({
  transactions,
  excludePersonal,
  onToggleExcludePersonal,
}: DashboardProps) {
  // Calculate Totals based on filter
  const filtered = transactions.filter((t) => {
    if (excludePersonal && t.type === 'expense' && t.expenseType === 'personal') {
      return false;
    }
    return true;
  });

  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-4" id="dashboard-container">
      {/* Exclude Personal Toggle - Professional elegant iOS/Material design */}
      <div className="flex items-center justify-between px-1" id="exclude-personal-wrapper">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Hide Personal Expenses
        </span>
        <button
          onClick={onToggleExcludePersonal}
          id="exclude-personal-toggle-btn"
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            excludePersonal ? 'bg-blue-600' : 'bg-slate-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out mt-1 ${
              excludePersonal ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Main Portfolio Balance Card - Royal Indigo-Slate Gradient with modern soft shadow */}
      <div
        id="balance-card"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl shadow-blue-950/10 border border-slate-800"
      >
        {/* Decorative subtle brand background logo */}
        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white pointer-events-none">
          <Wallet size={110} strokeWidth={1} />
        </div>
        
        <div className="flex items-center justify-between mb-2 relative z-10">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            {excludePersonal ? 'Net Business Balance' : 'Current Net Balance'}
          </h2>
          {excludePersonal && (
            <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">
              Personal Excl.
            </span>
          )}
        </div>
        
        <p className="font-sans text-4xl font-black tracking-tight text-white leading-none mt-1 relative z-10">
          {formatCurrency(balance)}
        </p>

        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 relative z-10">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></span>
          Ledger active & fully secured
        </div>
      </div>

      {/* Income & Expense Breakdown - Professional Left-Border Accent Cards */}
      <div className="grid grid-cols-2 gap-3.5" id="breakdown-grid">
        {/* Income Card - Emerald left-border accent */}
        <div
          id="income-summary-card"
          className="rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[90px] hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Income
            </span>
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowUpRight size={14} strokeWidth={2.5} />
            </div>
          </div>
          <p className="truncate text-lg font-black tracking-tight mt-1 text-emerald-600">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        {/* Expense Card - Rose left-border accent */}
        <div
          id="expense-summary-card"
          className="rounded-2xl border border-slate-200/80 border-l-4 border-l-rose-500 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[90px] hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Expense
            </span>
            <div className="p-1 rounded-lg bg-rose-50 text-rose-600">
              <ArrowDownRight size={14} strokeWidth={2.5} />
            </div>
          </div>
          <p className="truncate text-lg font-black tracking-tight mt-1 text-rose-600">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>
    </div>
  );
}
