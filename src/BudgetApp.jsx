import { useState, useEffect } from 'react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
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
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const newTotal = budgetData.reduce((sum, item) => sum + item.amount, 0);
    setTotalAmount(newTotal);
  }, [budgetData]);

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
      percentage: newTotal > 0 ? parseFloat(((item.amount / newTotal) * 100).toFixed(1)) : 0
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
      percentage: newTotal > 0 ? parseFloat(((item.amount / newTotal) * 100).toFixed(1)) : 0
    }));
    setBudgetData(updatedWithPercentages);
    setTotalAmount(newTotal);
    setAvailableFunds(prev => direction === 'add' ? prev - amountToAdd : prev + amountToAdd);
    setAmountToAdd(0);
  };

  const getCategoryColor = (index) => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#EF4444', '#6366F1', '#14B8A6', '#F97316'
    ];
    return colors[index % colors.length];
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
return (
  <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
    <header className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-green-700'} text-white shadow-md`}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <DollarSign size={24} />
          <h1 className="text-xl font-bold">ניהול כספים</h1>
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
        {/* סקירת ההשקעה */}
        <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <PieChart size={20} className="mr-2" />
              סקירת ההשקעה
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

        {/* התפלגות תקציב + תרשים עוגה */}
        <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-4">התפלגות תקציב</h2>
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* גרף מלבני */}
            <div className="flex-1">
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

            {/* תרשים עוגה */}
            <div className="w-full lg:w-1/3 h-72">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie
                    data={budgetData.filter(item => item.amount > 0)}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {budgetData
                      .filter(item => item.amount > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                      ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      {/* המשך... */}
    </main>

    <footer className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-green-700'} text-white text-center`}>
      <p className="text-sm">ניהול תקציב אישי © 2025 יצירת אומנות מאת רועי פז</p>
    </footer>
  </div>
);

}
