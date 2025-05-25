import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, ArrowRight, BarChart3, PieChart as PieChartIcon, Home, Target, DollarSign } from 'lucide-react'; // Added Target and DollarSign
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
// Main App Component

export default function ExpenseTracker({ user }) {
  const defaultCategories = [
    { id: 1, name: 'אוכל', color: '#FF6384', icon: '🍔' },
    { id: 2, name: 'דיור', color: '#36A2EB', icon: '🏠' },
    { id: 3, name: 'תחבורה', color: '#FFCE56', icon: '🚗' },
    { id: 4, name: 'שירותים', color: '#4BC0C0', icon: '💡' },
    { id: 5, name: 'בידור', color: '#9966FF', icon: '🎬' },
    { id: 6, name: 'בריאות', color: '#FF6B6B', icon: '💊' },
    { id: 7, name: 'ביגוד', color: '#4B5563', icon: '👕' }
  ];

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth()); // מאי = 4
  const selectedYear = 2025;

  const [categories, setCategories] = useState(defaultCategories);
  const [expenses, setExpenses] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [userDebts, setUserDebts] = useState([]);
  const [userSavingsGoals, setUserSavingsGoals] = useState([]);



const filteredExpenses = expenses.filter(exp => {
  return new Date(exp.date).getMonth() === selectedMonth;
});



  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    icon: '📊'
  });

const userId = user?.uid;
const [loading, setLoading] = useState(true);
const [hasLoaded, setHasLoaded] = useState(false); // דגל לקריאה שהסתיימה

useEffect(() => {
  if (!userId) return;

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Load expenses and categories
      const userDocRef = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDocRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setExpenses(userData.expenses || []);
        setCategories(userData.categories || defaultCategories);
      } else {
        setExpenses([]);
        setCategories(defaultCategories);
      }

      // Load debts and savings goals
      const financialDataRef = doc(db, 'financial_data', userId);
      const financialSnapshot = await getDoc(financialDataRef);
      if (financialSnapshot.exists()) {
        const financialData = financialSnapshot.data();
        setUserDebts(financialData.debts || []);
        // Convert Firestore Timestamps to Date objects for savingsGoals if necessary, though not used in this display
        const loadedGoals = (financialData.goals || []).map(goal => ({
          ...goal,
          // targetDate: goal.targetDate && goal.targetDate.toDate ? goal.targetDate.toDate() : (goal.targetDate ? new Date(goal.targetDate) : new Date()),
        }));
        setUserSavingsGoals(loadedGoals);
      } else {
        setUserDebts([]);
        setUserSavingsGoals([]);
      }

    } catch (error) {
      console.error("⚠️ שגיאה בטעינת הנתונים:", error);
      setExpenses([]);
      setCategories(defaultCategories);
      setUserDebts([]);
      setUserSavingsGoals([]);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  };

  loadUserData();
}, [userId, defaultCategories]); // Added defaultCategories to dependency array as it's used in error/no data case

useEffect(() => {
  if (!userId || !hasLoaded) return; // מונע שמירה לפני טעינה

  const timeout = setTimeout(() => {
    setDoc(doc(db, 'users', userId), {
      expenses,
      categories
    });
  }, 800); // שמירה אחרי 800ms של שקט

  return () => clearTimeout(timeout);
}, [expenses, categories, userId, hasLoaded]);

  
if (loading) {
  return <div className="text-center p-8 text-lg">🚀 טוען נתונים...</div>;
}
  if (!user) {
  return <div>Loading or not authenticated...</div>;
}
// Handlers
const handleAddExpense = () => {
  if (!newExpense.amount || !newExpense.categoryId) return;
  
  const expense = {
    id: Math.floor(Math.random() * 1000000),
    amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      categoryId: parseInt(newExpense.categoryId),
      date: newExpense.date
    };
    
    setExpenses([...expenses, expense]);
    setNewExpense({
      amount: '',
      description: '',
      categoryId: '',
      date: new Date().toISOString().split('T')[0]
    });
  };
  
  const handleAddCategory = () => {
    if (!newCategory.name) return;
    
    const category = {
      id: Math.floor(Math.random() * 1000000),
      name: newCategory.name,
      color: newCategory.color,
      icon: newCategory.icon
    };
    
    setCategories([...categories, category]);
    setNewCategory({
      name: '',
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      icon: '📊'
    });
  };
  
  const handleDeleteExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };
  
  // Calculate summary data
 const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

const expensesByCategory = categories.map(category => {
  const categoryExpenses = filteredExpenses.filter(exp => exp.categoryId === category.id);
  const totalAmount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const percentage = totalExpenses ? (totalAmount / totalExpenses * 100).toFixed(1) : 0;

  return {
    name: category.name,
    value: totalAmount,
    color: category.color,
    icon: category.icon,
    percentage
  };
});
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthlyData = monthNames.map((month, index) => {
  const total = expenses
    .filter(exp => new Date(exp.date).getMonth() === index)
    .reduce((sum, exp) => sum + exp.amount, 0);
  return { month, amount: total };
});


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
              
              {/* Planned Payments Card */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">תשלומים מתוכננים למטרות והלוואות</h2>
                
                {/* Savings Goals Contributions */}
                <div className="mb-4">
                  <h3 className="text-md font-semibold text-blue-600 mb-2 flex items-center">
                    <Target size={18} className="mr-2" /> חסכונות למטרות
                  </h3>
                  {userSavingsGoals.length > 0 ? (
                    <ul className="space-y-1 text-sm text-gray-600">
                      {userSavingsGoals.map(goal => (
                        <li key={goal.id} className="flex justify-between">
                          <span>{goal.name}:</span>
                          <span className="font-medium">₪{(goal.userAllocatedContribution ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">אין תרומות מתוכננות למטרות חיסכון.</p>
                  )}
                </div>

                {/* Debt Payments */}
                <div>
                  <h3 className="text-md font-semibold text-red-600 mb-2 flex items-center">
                    <DollarSign size={18} className="mr-2" /> החזרי הלוואות
                  </h3>
                  {userDebts.length > 0 ? (
                    <ul className="space-y-1 text-sm text-gray-600">
                      {userDebts.map(debt => (
                        <li key={debt.id} className="flex justify-between">
                          <span>{debt.name}:</span>
                          <span className="font-medium">₪{(debt.userAllocatedPayment ?? debt.minPayment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">אין החזרי הלוואות מתוכננים.</p>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
                <h2 className="text-xl font-semibold mb-4">הוצאות לחודש המוצג ({monthNames[selectedMonth]})</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                     <tr dir="rtl">
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">קטגוריה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תיאור</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סכום</th>
                    </tr>

                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses // Use pre-filtered expenses for the selected month
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(expense => {
                        const category = categories.find(c => c.id === expense.categoryId);
                        return (
                          <tr key={expense.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center"> {/* Adjusted for LTR icon display */}
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
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={newExpense.categoryId}
                      onChange={(e) => setNewExpense({...newExpense, categoryId: e.target.value})}
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
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(expense => {
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Optional: edit Existing Category (adds new if none selected)</label>
                  <select
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={selectedCategoryId}
                    onChange={(e) => {
                      const selectedId = parseInt(e.target.value);
                      setSelectedCategoryId(selectedId);
                      const selected = categories.find((cat) => cat.id === selectedId);
                      if (selected) {
                        setNewCategory({
                          name: selected.name,
                          color: selected.color,
                          icon: selected.icon,
                        });
                      } else {
                        setNewCategory({ name: '', color: '#000000', icon: '' });
                      }
                    }}
                  >
                    <option value="">בחר קטגוריה לעריכה</option>
                    {categories.map((category) => (
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
                    setNewCategory({ name: '', color: '#000000', icon: '' });
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