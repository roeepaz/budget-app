import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, ArrowRight, BarChart3, PieChart as PieChartIcon, Home } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
// Main App Component
type CategoryTag = 'need'|'want'|'debt'|'emergency'|'goal';

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  tag: CategoryTag;    // <-- כאן
}
export interface Expense {
  id: number;
  amount: number;
  description: string;
  categoryId: number;
  date: string; // ISO yyyy-MM-dd
}

interface ExpenseTrackerProps {
  user: { uid: string } | null;
}

export default function ExpenseTracker({ user }: ExpenseTrackerProps) {
  // Default categories
  const defaultCategories: Category[] = [];

  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'categories'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const selectedYear = 2025;

  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const filteredExpenses = expenses.filter(exp => new Date(exp.date).getMonth() === selectedMonth);

  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: undefined,
    description: '',
    categoryId: undefined,
    date: new Date().toISOString().split('T')[0]
  });

  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({
    name: '',
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    icon: '📊',
    tag: 'need'
  });

  const userId = user?.uid;
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Load user data
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setExpenses(data.expenses || []);
          setCategories(data.categories || defaultCategories);
        }
      } catch (error) {
        console.error('⚠️ Error loading data:', error);
      } finally {
        setHasLoaded(true);
        setLoading(false);
      }
    })();
  }, [userId]);

  // Save on changes
  useEffect(() => {
    if (!userId || !hasLoaded) return;
    const handle = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', userId), { categories, expenses });
      } catch (error) {
        console.error('⚠️ Error saving data:', error);
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [categories, expenses, userId, hasLoaded]);

  if (loading) return <div className="text-center p-8 text-lg">🚀 טוען נתונים...</div>;
  if (!user) return <div>Loading or not authenticated...</div>;

  // Handlers
  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.categoryId) return;
    const exp: Expense = {
      id: Date.now(),
      amount: newExpense.amount,
      description: newExpense.description || '',
      categoryId: newExpense.categoryId,
      date: newExpense.date || new Date().toISOString().split('T')[0]
    };
    setExpenses(prev => [...prev, exp]);
    setNewExpense({ amount: undefined, description: '', categoryId: undefined, date: new Date().toISOString().split('T')[0] });
  };

  const handleAddCategory = () => {
    if (!newCategory.name) return;
    const cat: Category = {
      id: Date.now(),
      ...newCategory
    };
    setCategories(prev => [...prev, cat]);
    setNewCategory({ name: '', color: '#' + Math.floor(Math.random() * 16777215).toString(16), icon: '📊', tag: 'need' });
  };

  const handleDeleteExpense = (id: number) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Summary calculations
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesByCategory = categories.map(cat => {
    const catExps = filteredExpenses.filter(e => e.categoryId === cat.id);
    const total = catExps.reduce((s, e) => s + e.amount, 0);
    return { name: cat.name, value: total, color: cat.color, icon: cat.icon, percentage: totalExpenses ? ((total / totalExpenses) * 100).toFixed(1) : '0' };
  });

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = monthNames.map((m, idx) => ({ month: m, amount: expenses.filter(e => new Date(e.date).getMonth() === idx).reduce((s, e) => s + e.amount, 0) }));
  
if (loading) {
  return <div className="text-center p-8 text-lg">🚀 טוען נתונים...</div>;
}
  if (!user) {
  return <div>Loading or not authenticated...</div>;
}

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <Home className="mr-2" /> Home Expense Tracker
          </h1>
          <div className="text-sm bg-blue-700 px-3 py-1 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Expense Summary for {monthNames[selectedMonth]}</h2>
            Total: ₪{totalExpenses.toFixed(2)}
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto flex">
          <button 
            className={`px-4 py-3 font-medium text-sm flex items-center ${activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 className="mr-2 w-4 h-4" /> Dashboard
          </button>
          <button 
            className={`px-4 py-3 font-medium text-sm flex items-center ${activeTab === 'expenses' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Plus className="mr-2 w-4 h-4" /> Add Expenses
          </button>
          <button 
            className={`px-4 py-3 font-medium text-sm flex items-center ${activeTab === 'categories' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('categories')}
          >
            <PieChartIcon className="mr-2 w-4 h-4" /> Categories
          </button>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="container mx-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary Card */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Expense Summary</h2>
                <div className="flex items-center justify-center h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory.filter(cat => cat.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, percentage}) => `${name}: ${percentage}%`}
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₪${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  {expensesByCategory
                    .filter(cat => cat.value > 0)
                    .sort((a, b) => b.value - a.value)
                    .map(category => (
                      <div key={category.name} className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center">
                          <span className="mr-2">{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">₪{category.value.toFixed(2)}</span>
                          <span className="ml-2 text-sm text-gray-500">({category.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Monthly Trend */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Monthly Trend</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={monthlyData} onClick={(data) => {
                      if (data?.activeLabel) {
                        const monthIndex = monthNames.indexOf(data.activeLabel);
                        if (monthIndex !== -1) {
                          setSelectedMonth(monthIndex);
                        }
                      }
                    }}>

                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₪${value}`} />
                      <Bar dataKey="amount" fill="#4F46E5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Daily Average</div>
                      <div className="font-medium">₪{(totalExpenses / 30).toFixed(2)}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-gray-500">Top Category</div>
                      <div className="font-medium">
                        {expensesByCategory.sort((a, b) => b.value - a.value)[0]?.name || 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent Transactions */}
              <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
                <h2 className="text-xl font-semibold mb-4">הוצאות לחודש המוצג</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                     <tr dir="rtl">
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">קטגוריה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תיאור</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סכום</th>
                    </tr>

                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {expenses
                      .filter(expense => {
                        const date = new Date(expense.date);
                        return (
                          date.getMonth()  === selectedMonth &&
                          date.getFullYear() === selectedYear
                        );
                      })
                       .sort((a, b) =>
                          new Date(b.date).getTime() - new Date(a.date).getTime()
                        )
                      .map(expense => {
                        const category = categories.find(c => c.id === expense.categoryId);
                        return (
                          <tr key={expense.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-row-reverse items-center justify-end">
                                <span className="mr-2" style={{ color: category?.color }}>
                                  {category?.icon}
                                </span>
                                <span className="text-sm font-medium">{category?.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">₪{expense.amount.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Add Expenses Tab */}
          {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Form */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₪)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={newExpense.categoryId}
                      onChange={(e) => setNewExpense({...newExpense, categoryId: parseInt(e.target.value)})}
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      placeholder="What was this expense for?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                    />
                  </div>
                  
                  <button 
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center"
                    onClick={handleAddExpense}
                  >
                    <Plus className="mr-2 w-4 h-4" /> Add Expense
                  </button>
                </div>
              </div>
              
              {/* Expense List */}
              <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4">All Expenses</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr dir="rtl">
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">קטגוריה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תיאור</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סכום</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expenses
                        .sort((a, b) =>
                          new Date(b.date).getTime() - new Date(a.date).getTime()
                        )                        .map(expense => {
                          const category = categories.find(c => c.id === expense.categoryId);
                          return (
                            <tr key={expense.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="mr-2" style={{color: category?.color}}>{category?.icon}</span>
                                  <span className="text-sm font-medium">{category?.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">₪{expense.amount.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button 
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
         {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add / Edit Category Form */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">
                {selectedCategoryId ? 'Edit Category' : 'Add New Category'}
              </h2>

              <div className="space-y-4">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g. Groceries, Rent, etc."
                  />
                </div>
                <label>תיוג (מה מייצג הכסף שהולך לקטגוריה זו)</label>
                  <select
                    value={newCategory.tag}
                    onChange={e => setNewCategory({
                      ...newCategory,
                      tag: e.target.value as CategoryTag
                    })}
                  >
                    <option value="need">Needs (בסיסי)</option>
                    <option value="want">Wants (מותרות)</option>
                    <option value="debt">Debt (הלוואות)</option>
                    <option value="emergency">Emergency (חירום)</option>
                    <option value="goal">Goal (מטרה)</option>
                  </select>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="color"
                    className="w-full p-1 h-10 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                  <select
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  >
                    <option value="🍔">🍔 אוכל</option>
                    <option value="🏠">🏠 דיור</option>
                    <option value="🚗">🚗 תחבורה</option>
                    <option value="💡">💡 שירותים (חשמל, מים וכו')</option>
                    <option value="🎬">🎬 בידור</option>
                    <option value="💊">💊 בריאות</option>
                    <option value="👕">👕 ביגוד</option>
                    <option value="📚">📚 חינוך</option>
                    <option value="💰">💰 חיסכון</option>
                    <option value="🧒">🧒 ילדים</option>
                    <option value="📊">📊 אחר</option>
                  </select>
                </div>

                {/* Edit Dropdown */}
                <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Optional: edit Existing Category (adds new if none selected)
            </label>
            <select
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              value={selectedCategoryId.toString()}
              onChange={e => {
                const val = e.target.value;
                setSelectedCategoryId(val);
                const selectedId = parseInt(val, 10);
                const selected = categories.find(cat => cat.id === selectedId);
                if (selected) {
                  setNewCategory({
                    name: selected.name,
                    color: selected.color,
                    icon: selected.icon,
                    tag: selected.tag
                  });
                } else {
                  setNewCategory({ name: '', color: '#000000', icon: '', tag: 'need' });
                }
              }}
            >
              <option value="">בחר קטגוריה לעריכה</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

                {/* Add/Update Button */}
                <button
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center"
                  onClick={() => {
                    if (selectedCategoryId) {
                        const selectedId = parseInt(selectedCategoryId);
                      // הסר את הקטגוריה שנבחרה
                      const filteredCategories = categories.filter((cat) => cat.id !== selectedId);

                      // צור קטגוריה חדשה עם אותו ID או חדש – תלוי בצורך
                      const updatedCategory = { ...newCategory, id: selectedId };
                      // setNewCategory({ ...newCategory, id: selectedId })
                      // עדכן את הרשימה
                      setCategories([...filteredCategories, updatedCategory]);

                      // איפוס
                      setSelectedCategoryId('');
                    }
                     else {
                      // Add new category
                      handleAddCategory();
                    }

                    // Clear form
                    setNewCategory({ name: '', color: '#000000', icon: '', tag: 'need' });
                  }}
                >
                  <Plus className="mr-2 w-4 h-4" />
                  {selectedCategoryId ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </div>
                   
              {/* Categories List */}
              <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4">All Categories</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map(category => {
                    const categoryExpenses = expenses.filter(expense => expense.categoryId === category.id);
                    const totalAmount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
                    
                    return (
                      <div 
                        key={category.id} 
                        className="border rounded-lg p-4 flex flex-col"
                        style={{borderLeftColor: category.color, borderLeftWidth: '4px'}}
                      >
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-2">{category.icon}</span>
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {categoryExpenses.length} transactions
                        </div>
                        <div className="mt-auto font-medium">
                          ₪{totalAmount.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}