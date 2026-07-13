import React, { useState } from 'react';
import { Transaction } from '../types';
import { Plus, Minus, Check } from 'lucide-react';

interface TransactionFormProps {
  onSave: (transaction: Omit<Transaction, 'id' | 'date' | 'time' | 'timestamp' | 'syncStatus'>) => void;
}

const POPULAR_SUGGESTIONS = {
  income: ['Salary', 'Freelance Work', 'Client Payout', 'Investment Return', 'Cash Received', 'Refund'],
  expense: ['Groceries', 'Fuel / Transport', 'Office Supplies', 'Rent', 'Dining Out', 'Electricity', 'Mobile / Internet'],
};

export default function TransactionForm({ onSave }: TransactionFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [expenseType, setExpenseType] = useState<'normal' | 'personal'>('normal');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onSave({
      amount: numAmount,
      description: description.trim() || (type === 'income' ? 'Income' : 'Expense'),
      type,
      expenseType: type === 'expense' ? expenseType : 'normal',
    });

    // Flash success
    setShowSuccess(true);
    setAmount('');
    setDescription('');
    
    setTimeout(() => {
      setShowSuccess(false);
    }, 1500);
  };

  const suggestions = type === 'income' ? POPULAR_SUGGESTIONS.income : POPULAR_SUGGESTIONS.expense;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-150" id="transaction-form-card">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4 px-1">
        Quick Entry
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4" id="transaction-form">
        {/* Toggle between Income and Expense */}
        <div className="grid grid-cols-2 gap-3" id="type-toggle-grid">
          <button
            type="button"
            id="type-income-btn"
            onClick={() => {
              setType('income');
              setExpenseType('normal');
            }}
            className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm shadow-emerald-500/5'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            <Plus size={14} strokeWidth={2.5} />
            Income
          </button>
          <button
            type="button"
            id="type-expense-btn"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm shadow-rose-500/5'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            <Minus size={14} strokeWidth={2.5} />
            Expense
          </button>
        </div>

        {/* Amount Input */}
        <div className="relative" id="amount-input-wrapper">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 px-1">
            Amount
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 font-semibold text-lg text-slate-400">₹</span>
            <input
              type="number"
              id="amount-input"
              required
              min="0.01"
              step="any"
              pattern="[0-9]*"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-9 pr-4 font-sans text-lg font-bold text-slate-800 placeholder-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-150"
            />
          </div>
        </div>

        {/* Expense Type Toggle (Normal vs Personal) */}
        {type === 'expense' && (
          <div className="space-y-1.5" id="expense-type-wrapper">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2.5" id="expense-type-toggle-grid">
              <button
                type="button"
                id="exp-type-normal-btn"
                onClick={() => setExpenseType('normal')}
                className={`py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  expenseType === 'normal'
                    ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                }`}
              >
                Business / Work
              </button>
              <button
                type="button"
                id="exp-type-personal-btn"
                onClick={() => setExpenseType('personal')}
                className={`py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  expenseType === 'personal'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 font-bold shadow-sm shadow-amber-500/5'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                }`}
              >
                Personal
              </button>
            </div>
          </div>
        )}

        {/* Description / Category Input */}
        <div id="description-input-wrapper" className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
            Description
          </label>
          <input
            type="text"
            id="description-input"
            maxLength={100}
            placeholder="What was this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-150"
          />

          {/* Rapid suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1 px-1" id="suggestions-container">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDescription(s)}
                className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded-full border border-transparent transition-all duration-100 cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Automatic details note */}
        <div className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider bg-slate-50 rounded-lg py-2 border border-slate-100">
          Auto-Capturing Date & Time
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          id="save-transaction-btn"
          disabled={showSuccess}
          className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
            showSuccess
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
              : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.99] shadow-lg shadow-blue-600/20'
          }`}
        >
          {showSuccess ? (
            <>
              <Check size={16} strokeWidth={2.5} className="animate-bounce" />
              Saved Successfully!
            </>
          ) : (
            'Save Entry'
          )}
        </button>
      </form>
    </div>
  );
}
