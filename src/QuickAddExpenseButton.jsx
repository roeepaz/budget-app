import React, { useState } from 'react';

export default function QuickAddExpenseButton({ onAddExpense, categories }) {
  const [showModal, setShowModal] = useState(false);
  const [quickExpense, setQuickExpense] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = () => {
    if (!quickExpense.amount || !quickExpense.categoryId) return;

    const expense = {
      ...quickExpense,
      id: Math.floor(Math.random() * 1000000),
      amount: parseFloat(quickExpense.amount),
    };

    onAddExpense(expense); // רק מחזיר את ההוצאה
    setQuickExpense({
      amount: '',
      description: '',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 text-lg px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-lg transition duration-300"
      >
        הוסף הוצאה בקליק <span className="text-2xl">➕</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-center text-green-700">הוצאה מהירה</h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="סכום"
                className="w-full p-2 border rounded"
                value={quickExpense.amount}
                onChange={(e) => setQuickExpense({ ...quickExpense, amount: e.target.value })}
              />
              <select
                className="w-full p-2 border rounded"
                value={quickExpense.categoryId}
                onChange={(e) => setQuickExpense({ ...quickExpense, categoryId: parseFloat(e.target.value) })}
              >
                <option value="">בחר קטגוריה</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
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
              <button
                onClick={handleSubmit}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
              >
                הוסף הוצאה
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
