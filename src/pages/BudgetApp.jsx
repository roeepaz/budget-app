import { useState, useEffect } from 'react';
import { DollarSign, PieChart, Plus, Minus, RefreshCw } from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const DARK_MODE_KEY = 'budget-app-dark-mode';
const CURRENCY_MODE_KEY = 'budget-app-currency-mode';

const initialBudgetData = [
  { id: 1, category: "S&P", amount: 0, percentage: 0 },
  { id: 2, category: 'נאסדק', amount: 0, percentage: 0 },
  { id: 3, category: "ביטקוין", amount: 0, percentage: 0 },
  { id: 4, category: "קרן כספית", amount: 0, percentage: 0 },
  { id: 5, category: "מניות", amount: 0, percentage: 0 },
];

export default function BudgetApp({ user }) {
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [activeCategory, setActiveCategory] = useState(null);
  const [amountToAdd, setAmountToAdd] = useState(0);
  const [direction, setDirection] = useState('add');
  const [fundsChange, setFundsChange] = useState(0);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [budgetData, setBudgetData] = useState([]);
  const [availableFunds, setAvailableFunds] = useState(0);

  // Currency conversion state
  const [currencyMode, setCurrencyMode] = useState(() => {
    const saved = localStorage.getItem(CURRENCY_MODE_KEY);
    return saved || 'ILS'; // 'ILS' or 'USD'
  });
  const [exchangeRate, setExchangeRate] = useState(0.27); // default approximation

  const sortedBudgetData = [...budgetData].sort((a, b) => b.percentage - a.percentage);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const userId = user.uid;

  useEffect(() => {
    // משתמש ב-ExchangeRate-API שהוא API אמין ומעודכן להמרת מטבעות
    const url = 'https://api.exchangerate-api.com/v4/latest/ILS';
    console.log('Fetching rate from', url);
    
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('ExchangeRate API response:', data);
        const rate = data?.rates?.USD;
        
        if (typeof rate === 'number') {
          setExchangeRate(rate);
          console.log('Exchange rate ILS to USD:', rate);
        } else {
          console.error('Unexpected exchange rate response:', data);
          // נופל חזרה לשער ברירת מחדל במקרה של שגיאה
          setExchangeRate(0.27); // ערך ברירת מחדל מקורב לשער ILS/USD
        }
      })
      .catch(err => {
        console.error('Failed to fetch exchange rate:', err);
        // נופל חזרה לשער ברירת מחדל במקרה של שגיאה
        setExchangeRate(0.27); // ערך ברירת מחדל מקורב לשער ILS/USD
      });
  }, []);

  // שמירת מצב המטבע בלוקל סטורג'
  useEffect(() => {
    localStorage.setItem(CURRENCY_MODE_KEY, currencyMode);
  }, [currencyMode]);

  // Helper: convert between currencies
  const convertCurrency = (value, toMode) => {
    // Always store in ILS, convert for display
    if (toMode === 'USD') {
      return value * exchangeRate;
    } else {
      return value;
    }
  };

  // Helper: convert from display currency to storage currency (ILS)
  const convertToILS = (value) => {
    if (currencyMode === 'USD') {
      return value / exchangeRate;
    }
    return value;
  };

  // Helper: display values based on mode
  const displayValue = (ilsValue) => {
    const val = currencyMode === 'USD' ? ilsValue * exchangeRate : ilsValue;
    return currencyMode === 'USD'
      ? `$${val.toFixed(2)}`
      : `₪${val.toLocaleString()}`;
  };

  useEffect(() => {
    const loadData = async () => {
      const ref = doc(db, 'budgets', userId);
      try {
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setBudgetData(data.budgetData || initialBudgetData);
          setAvailableFunds(data.availableFunds || 0);
        }
      } catch (error) {
        console.error("Error loading data", error);
      }
      setLoading(false);
    };
    loadData();
  }, [userId]);

  useEffect(() => {
    if (!userId || loading) return;
    const timeout = setTimeout(() => {
      setDoc(doc(db, 'budgets', userId), { budgetData, availableFunds });
    }, 800);
    return () => clearTimeout(timeout);
  }, [budgetData, availableFunds, userId]);

  useEffect(() => {
    const newTotal = budgetData.reduce((sum, item) => sum + item.amount, 0);
    setTotalAmount(newTotal);
  }, [budgetData]);

  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleUpdateFunds = () => {
    if (!fundsChange) return;
    // המר את הסכום לשקלים לפני השמירה
    const ilsValue = convertToILS(fundsChange);
    setAvailableFunds(prev => prev + ilsValue);
    setFundsChange(0);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory = { id: Math.floor(Math.random() * 1e6), category: newCategoryName.trim(), amount: 0, percentage: 0 };
    setBudgetData([...budgetData, newCategory]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (id) => {
    const category = budgetData.find(item => item.id === id);
    if (!category) return;
    const updatedFunds = availableFunds + category.amount;
    const filtered = budgetData.filter(item => item.id !== id);
    const newTotal = filtered.reduce((sum, item) => sum + item.amount, 0);
    const updatedWithPercentages = filtered.map(item => ({ ...item, percentage: parseFloat(((item.amount / newTotal) * 100).toFixed(1)) }));
    setAvailableFunds(updatedFunds);
    setBudgetData(updatedWithPercentages);
    if (activeCategory === id) setActiveCategory(null);
  };

  const handleUpdateAmount = () => {
    if (!activeCategory || amountToAdd <= 0) return;
    // המר את הסכום לשקלים לפני השמירה
    const ilsAmount = convertToILS(amountToAdd);
    const delta = direction === 'add' ? ilsAmount : -ilsAmount;

    if (direction === 'add' && ilsAmount > availableFunds) {
      alert('אין מספיק כספים זמינים!');
      return;
    }
    const categoryData = budgetData.find(item => item.id === activeCategory);
    if (direction === 'subtract' && ilsAmount > categoryData.amount) {
      alert('לא ניתן להוריד יותר ממה שיש בקטגוריה!');
      return;
    }

    const updatedData = budgetData.map(item => item.id === activeCategory ? { ...item, amount: item.amount + delta } : item);
    const newTotal = updatedData.reduce((sum, item) => sum + item.amount, 0);
    const updatedWithPercentages = updatedData.map(item => ({ ...item, percentage: parseFloat(((item.amount / newTotal) * 100).toFixed(1)) }));

    setBudgetData(updatedWithPercentages);
    setAvailableFunds(prev => direction === 'add' ? prev - ilsAmount : prev + ilsAmount);
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
  const getCategoryColorHex = (index) => {
    const hexColors = [
      '#3B82F6', // blue-500
      '#10B981', // green-500
      '#F59E0B', // yellow-500
      '#8B5CF6', // purple-500
      '#EC4899', // pink-500
      '#EF4444', // red-500
      '#6366F1', // indigo-500
      '#14B8A6', // teal-500
      '#F97316'  // orange-500
    ];
    return hexColors[index % hexColors.length];
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleCurrency = () => setCurrencyMode(prev => (prev === 'ILS' ? 'USD' : 'ILS'));

  if (!user || loading) return <div className="text-center p-8 text-lg">🚀 טוען נתונים...</div>;

  // חישוב הערכים המוצגים בהתאם למטבע שנבחר
  const displayedAvailableFunds = currencyMode === 'USD' 
    ? (availableFunds * exchangeRate).toFixed(2) 
    : availableFunds.toLocaleString();

  const displayedTotalAmount = currencyMode === 'USD'
    ? (totalAmount * exchangeRate).toFixed(2)
    : totalAmount.toLocaleString();

  const currencySymbol = currencyMode === 'USD' ? '$' : '₪';

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <header className={`p-4 flex justify-between items-center ${isDarkMode ? 'bg-gray-800' : 'bg-green-700'} text-white shadow-md`}>
        <div className="flex items-center space-x-2">
          <DollarSign size={24} />
          <h1 className="text-xl font-bold">ניהול כספים ({currencyMode})</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleCurrency} className="px-3 py-1 bg-blue-500 rounded text-white">החלף ל{currencyMode === 'ILS' ? 'USD' : 'ILS'}</button>
          <button onClick={toggleDarkMode} className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-green-600'}`}>{isDarkMode ? '☀' : '🌙'}</button>
        </div>
      </header>

      <main className="container mx-auto p-4 flex-grow flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <PieChart size={20} className="mr-2" />
                סקירת הכסף שלי 
              </h2>
             <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              סה"כ: {currencySymbol}{currencyMode === 'USD' 
                ? (totalAmount * exchangeRate).toLocaleString(undefined, {maximumFractionDigits: 1, minimumFractionDigits: 1})
                : totalAmount.toLocaleString(undefined, {maximumFractionDigits: 1, minimumFractionDigits: 1})}
            </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  <tr>
                    <th className="py-2">קטגוריה</th>
                    <th className="py-2">סכום ({currencySymbol})</th>
                    <th className="py-2">אחוז</th>
                    <th className="py-2 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBudgetData.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${activeCategory === item.id ? (isDarkMode ? 'bg-gray-700' : 'bg-green-50') : ''}`}
                    >
                      <td className="py-3 flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 ${getCategoryColor(index)}`}></span>
                        {item.category}
                      </td>
                      <td className="py-3">{displayValue(item.amount)}</td>
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
                    <td className="py-3">{currencySymbol}{currencyMode === 'USD' 
                        ? (totalAmount * exchangeRate).toLocaleString(undefined, {maximumFractionDigits: 1, minimumFractionDigits: 1})
                        : totalAmount.toLocaleString(undefined, {maximumFractionDigits: 1, minimumFractionDigits: 1})}
                    </td>
                    <td className="py-3">100%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-lg font-semibold mb-4">התפלגות הכספים</h2>
            <div className="h-6 w-full rounded-full overflow-hidden flex">
              {sortedBudgetData.map((item, index) => (
                <div
                  key={item.id}
                  style={{ width: `${item.percentage}%` }}
                  className={`${getCategoryColor(index)} h-full`}
                  title={`${item.category}: ${item.percentage}%`}
                ></div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {sortedBudgetData.map((item, index) => (
                <div key={item.id} className="flex items-center text-sm">
                  <span className={`w-3 h-3 rounded-full mr-1 ${getCategoryColor(index)}`}></span>
                  <span>{item.category}: {item.percentage}%</span>
                </div>
              ))}
            </div>
            
            <div className="w-full lg:w-1/3 h-72">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie
                    data={sortedBudgetData.filter(item => item.amount > 0)}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {sortedBudgetData
                      .filter(item => item.amount > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColorHex(index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [
                    currencyMode === 'USD' 
                      ? `$${(value * exchangeRate).toFixed(2)}` 
                      : `₪${value.toLocaleString()}`,
                    'סכום'
                  ]} />
                </RePieChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>

        <div className="w-full md:w-1/3">
          <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} sticky top-4`}>
            <h2 className="text-lg font-semibold mb-4">עדכון תקציב</h2>
            <div className={`p-3 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
              <div className="text-sm mb-1">כספים זמינים</div>
              <div className="text-xl font-bold">{currencySymbol}{displayedAvailableFunds}</div>
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-2">הוסף/הסר כספים זמינים</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={fundsChange || ''}
                  onChange={(e) => setFundsChange(parseFloat(e.target.value) || 0)}
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
                {sortedBudgetData.map((item) => (
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
                  onChange={(e) => setAmountToAdd(parseFloat(e.target.value) || 0)}
                  className={`w-full p-2 pr-8 rounded border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                  min="0"
                  step="0.01"
                />
                <span className="absolute right-2 top-2 text-gray-500">{currencySymbol}</span>
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
        <p className="text-sm">ניהול תקציב אישי יצירת אומנות מאת רועי פז © 2025</p>
      </footer>
    </div>
  );
}