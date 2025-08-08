import React, { useState } from 'react';
import {Category,Expense,CategoryTag,Debt, SavingsGoal} from '../type/appTypes'

type QuickAddExpenseButtonProps = {
  onAddExpense: (expense: Expense) => void;
  categories: Category[];
  goals: SavingsGoal[];      // <-- add
  debts: Debt[];             // <-- add
  className?: string;
};

export default function QuickAddExpenseButton({
  onAddExpense,
  categories,
  goals,
  debts,
  className,
}: QuickAddExpenseButtonProps) {
  const getLocalDateString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().split('T')[0];
  };

  const tagColors: Record<CategoryTag, string> = {
    need: '#3B82F6',
    want: '#EF4444',
    debt: '#F59E0B',
    emergency: '#10B981',
    goal: '#8B5CF6',
    savings: '#6366F1',
  };

  const [showModal, setShowModal] = useState(false);
  const [quickExpense, setQuickExpense] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: getLocalDateString(),
  });

  // virtual items for debts/goals
  const dynamicCats: Category[] = [
    ...debts.map(d => ({
      id: `debt-${d.id}`,
      name: d.name,
      color: tagColors.debt,
      icon: '💳',
      tag: 'debt' as CategoryTag,
    })),
    ...goals.map(g => ({
      id: `goal-${g.id}`,
      name: g.name,
      color: tagColors.goal,
      icon: '🎯',
      tag: 'goal' as CategoryTag,
    })),
  ];

  const visibleCategories: Array<Pick<Category,'id'|'name'|'icon'|'tag'>> = [
    ...categories.filter(c => !c.hidden),
    ...dynamicCats,
  ];

  const handleSubmit = () => {
    const amt = parseFloat(quickExpense.amount);
    if (!Number.isFinite(amt) || amt <= 0 || !quickExpense.categoryId) return;

    // IMPORTANT: find in the merged list
    const selected = visibleCategories.find(
      c => String(c.id) === String(quickExpense.categoryId)
    );
    if (!selected) return;

    // ⚠️ Make sure Expense.categoryId is string in your types
    const expense: Expense = {
      id: Date.now(),
      amount: amt,
      description: quickExpense.description,
      categoryId: String(selected.id),
      date: quickExpense.date,
    };

    onAddExpense(expense);

    setQuickExpense({
      amount: '',
      description: '',
      categoryId: '',
      date: getLocalDateString(),
    });
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 text-lg px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-lg transition duration-300 ${className ?? ''}`}
      >
        הוסף הוצאה בקליק <span className="text-2xl">➕</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-center text-green-700">הוצאה מהירה</h2>
            <div className="space-y-4">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="סכום"
                className="w-full p-2 border rounded"
                value={quickExpense.amount}
                onChange={(e) => setQuickExpense({ ...quickExpense, amount: e.target.value })}
              />
              <select
                className="w-full p-2 border rounded"
                value={quickExpense.categoryId}
                onChange={(e) => setQuickExpense({ ...quickExpense, categoryId: e.target.value })}
              >
                <option value="">בחר קטגוריה</option>
                {visibleCategories.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {(c as any).icon ?? ''} {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="תיאור (אופציונלי)"
                className="w-full p-2 border rounded"
                value={quickExpense.description}
                onChange={(e) => setQuickExpense({ ...quickExpense, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSubmit}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                >
                  הוסף הוצאה
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
