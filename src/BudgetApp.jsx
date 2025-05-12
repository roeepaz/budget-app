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
        <div className={`rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-2">התפלגות תקציב בעוגה</h2>
          <div className="w-full h-72">
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
                  {budgetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>

    <footer className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-green-700'} text-white text-center`}>
      <p className="text-sm">ניהול תקציב אישי © 2025 יצירת אומנות מאת רועי פז</p>
    </footer>
  </div>
);
}
