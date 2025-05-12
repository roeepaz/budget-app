import { useState, useEffect } from 'react';
import { DollarSign, PieChart, Plus, Minus, RefreshCw } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'budget-app-data';
const FUNDS_KEY = 'budget-app-funds';
const DARK_MODE_KEY = 'budget-app-dark-mode';

const initialBudgetData = [
  { id: 1, category: "S&P", amount: 0, percentage: 0 },
  { id: 2, category: "נאסדאק", amount: 0, percentage: 0 },
  { id: 3, category: "ביטקוין", amount: 0, percentage: 0 },
  { id: 4, category: "מניות", amount: 0, percentage: 0 },
];

export default function BudgetApp() {
  const [budgetData, setBudgetData] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialBudgetData;
  });

  const [availableFunds, setAvailableFunds] = useState(() => {
    const saved = localStorage.getItem(FUNDS_KEY);
    return saved ? JSON.parse(saved) : 0;
  });

  const [totalAmount, setTotalAmount] = useState(0);
  const [activeCategory, setActiveCategory] = useState(null);
  const [amountToAdd, setAmountToAdd] = useState(0);
  const [direction, setDirection] = useState('add');
  const [fundsChange, setFundsChange] = useState(0);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
      const saved = localStorage.getItem(DARK_MODE_KEY);
      return saved ? JSON.parse(saved) : false;
    });
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(budgetData));
  }, [budgetData]);

  useEffect(() => {
    localStorage.setItem(FUNDS_KEY, JSON.stringify(availableFunds));
  }, [availableFunds]);

  useEffect(() => {
    const newTotal = budgetData.reduce((sum, item) => sum + item.amount, 0);
    setTotalAmount(newTotal);
  }, [budgetData]);
  
  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleUpdateFunds = () => {
    if (!fundsChange) return;
    setAvailableFunds(prev => prev + fundsChange);
    setFundsChange(0);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newId = budgetData.length ? Math.max(...budgetData.map(c => c.id)) + 1 : 1;
    const newCategory = {
      id: newId,
      category: newCategoryName.trim(),
      amount: 0,
      percentage: 0,
    };
    setBudgetData([...budgetData, newCategory]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (id) => {
    const category = budgetData.find(item => item.id === id);
    if (!category) return;
    const updatedFunds = availableFunds + category.amount;
    const filtered = budgetData.filter(item => item.id !== id);
    const newTotal = filtered.reduce((sum, item) => sum + item.amount, 0);
    const updatedWithPercentages = filtered.map(item => ({
      ...item,
      percentage: parseFloat(((item.amount / newTotal) * 100).toFixed(1))
    }));
    setAvailableFunds(updatedFunds);
    setBudgetData(updatedWithPercentages);
    if (activeCategory === id) setActiveCategory(null);
  };

  const handleUpdateAmount = () => {
    if (!activeCategory || amountToAdd <= 0) return;

    const amountChange = direction === 'add' ? amountToAdd : -amountToAdd;

    if (direction === 'add' && amountToAdd > availableFunds) {
      alert('Not enough available funds!');
      return;
    }

    const categoryData = budgetData.find(item => item.id === activeCategory);
    if (direction === 'subtract' && amountToAdd > categoryData.amount) {
      alert('Cannot subtract more than the category contains!');
      return;
    }

    const updatedData = budgetData.map(item => {
      if (item.id === activeCategory) {
        return { ...item, amount: item.amount + amountChange };
      }
      return item;
    });

    const newTotal = updatedData.reduce((sum, item) => sum + item.amount, 0);
    const updatedWithPercentages = updatedData.map(item => ({
      ...item,
      percentage: parseFloat(((item.amount / newTotal) * 100).toFixed(1))
    }));

    setBudgetData(updatedWithPercentages);
    setTotalAmount(newTotal);
    setAvailableFunds(prev => direction === 'add' ? prev - amountToAdd : prev + amountToAdd);
    setAmountToAdd(0);
  };

  const getCategoryColor = (index) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-red-500',
      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <header className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-green-700'} text-white shadow-md`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign size={24} />
            <h1 className="text-xl font-bold">ניהול תקציב</h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-green-600'}`}
          >
            {isDarkMode ? '☀' : '🌙'}
          </button>
        </div>
      </header>

      <main className="container mx-auto p-4 flex-grow flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <PieChart size={20} className="mr-2" />
                סקירת תקציב
              </h2>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                סה"כ: {totalAmount.toLocaleString()} ₪
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  <tr>
                    <th className="py-2">קטגוריה</th>
                    <th className="py-2">סכום (₪)</th>
                    <th className="py-2">אחוז</th>
                    <th className="py-2 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetData.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${activeCategory === item.id ? (isDarkMode ? 'bg-gray-700' : 'bg-green-50') : ''}`}
                    >
                      <td className="py-3 flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 ${getCategoryColor(index)}`}></span>
                        {item.category}
                      </td>
                      <td className="py-3">{item.amount.toLocaleString()}</td>
                      <td className="py-3">{item.percentage}%</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => setActiveCategory(item.id)}
                          className={`px-2 py-1 rounded ${
                            activeCategory === item.id
                              ? (isDarkMode ? 'bg-green-700 text-white' : 'bg-green-600 text-white')
                              : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')
                          }`}
                        >
                          בחר
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  <tr className={`border-t-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <td className="py-3">סה"כ</td>
                    <td className="py-3">{totalAmount.toLocaleString()}</td>
                    <td className="py-3">100%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold mb-4">התפלגות תקציב</h2>
            <div className="h-6 w-full rounded-full overflow-hidden flex">
              {budgetData.map((item, index) => (
                <div
                  key={item.id}
                  style={{ width: `${item.percentage}%` }}
                  className={`${getCategoryColor(index)} h-full`}
                  title={`${item.category}: ${item.percentage}%`}
                ></div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {budgetData.map((item, index) => (
                <div key={item.id} className="flex items-center text-sm">
                  <span className={`w-3 h-3 rounded-full mr-1 ${getCategoryColor(index)}`}></span>
                  <span>{item.category}: {item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/3">
          <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} sticky top-4`}>
            <h2 className="text-lg font-semibold mb-4">עדכון תקציב</h2>
            <div className={`p-3 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
              <div className="text-sm mb-1">כספים זמינים</div>
              <div className="text-xl font-bold">{availableFunds.toLocaleString()} ₪</div>
            </div>
            <div className="mb-4">
  <label className="block text-sm mb-2">הוסף/הסר כספים זמינים</label>
  <div className="flex gap-2">
    <input
      type="number"
      value={fundsChange || ''}
      onChange={(e) => setFundsChange(parseInt(e.target.value) || 0)}
      className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
    />
    <button
      onClick={handleUpdateFunds}
      className={`px-4 py-2 rounded ${isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white'}`}
    >
      עדכן
    </button>
  </div>
</div>

<div className="mb-6">
  <label className="block text-sm mb-2">הוסף קטגוריה חדשה</label>
  <div className="flex gap-2">
    <input
      type="text"
      value={newCategoryName}
      onChange={(e) => setNewCategoryName(e.target.value)}
      placeholder="שם הקטגוריה"
      className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
    />
    <button
      onClick={handleAddCategory}
      className={`px-4 py-2 rounded ${isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white'}`}
    >
      הוסף
    </button>
  </div>
</div>
<div className="mb-4">
  <label className="block text-sm mb-2">בחר קטגוריה</label>
  <div className="flex flex-wrap gap-2">
    {budgetData.map((item) => (
      <div key={item.id} className="relative">
        <button
          onClick={() => setActiveCategory(item.id)}
          className={`px-3 py-1 pr-7 text-sm rounded-full relative ${
            activeCategory === item.id
              ? (isDarkMode ? 'bg-green-700 text-white' : 'bg-green-600 text-white')
              : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')
          }`}
        >
          {item.category}
        </button>
        <span
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveCategory(item.id);
          }}
          className={`absolute right-1 top-1/2 -translate-y-1/2 px-1 text-xs rounded cursor-pointer ${
            isDarkMode ? 'bg-red-800 text-white' : 'bg-red-500 text-white'
          }`}
        >
          ✕
        </span>
      </div>
    ))}
  </div>
</div>
            {activeCategory && (
              <div className={`p-3 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <div className="text-sm mb-1">קטגוריה נבחרת</div>
                <div className="font-bold">
                  {budgetData.find(item => item.id === activeCategory)?.category}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm mb-2">סוג פעולה</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDirection('add')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center ${
                    direction === 'add'
                      ? (isDarkMode ? 'bg-green-700 text-white' : 'bg-green-600 text-white')
                      : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')
                  }`}
                >
                  <Plus size={16} className="mr-1" /> הוסף
                </button>
                <button
                  onClick={() => setDirection('subtract')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center ${
                    direction === 'subtract'
                      ? (isDarkMode ? 'bg-red-700 text-white' : 'bg-red-500 text-white')
                      : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')
                  }`}
                >
                  <Minus size={16} className="mr-1" /> הורד
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm mb-2">סכום</label>
              <div className="relative">
                <input
                  type="number"
                  value={amountToAdd || ''}
                  onChange={(e) => setAmountToAdd(parseInt(e.target.value) || 0)}
                  className={`w-full p-2 pr-8 rounded border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                  min="0"
                />
                <span className="absolute right-2 top-2 text-gray-500">₪</span>
              </div>
            </div>

            <button
              onClick={handleUpdateAmount}
              disabled={!activeCategory || amountToAdd <= 0}
              className={`w-full py-2 rounded-lg flex items-center justify-center ${
                !activeCategory || amountToAdd <= 0
                  ? (isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500')
                  : direction === 'add'
                    ? (isDarkMode ? 'bg-green-700 text-white' : 'bg-green-600 text-white')
                    : (isDarkMode ? 'bg-red-700 text-white' : 'bg-red-500 text-white')
              }`}
            >
              <RefreshCw size={16} className="mr-2" />
              עדכן תקציב
            </button>
          </div>
        </div>
      </main>

      <footer className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-green-700'} text-white text-center`}>
        <p className="text-sm">ניהול תקציב אישי © 2025</p>
      </footer>
    </div>
  );
}
