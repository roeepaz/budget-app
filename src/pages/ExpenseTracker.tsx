import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, ArrowRight, BarChart3, PieChart as PieChartIcon, Home } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import {Category,Expense,CategoryTag,ExpenseTrackerProps,Debt, SavingsGoal} from '../type/appTypes'

export default function ExpenseTracker({ user }: ExpenseTrackerProps) {
  // Default categories
  const defaultCategories: Category[] = [
    { id: 1, name: 'קרן ביטחון', color: '#FF6384', icon: '🛡️', tag: 'emergency', currentAmount: 0 },
    { id: 2, name: 'חיסכון כללי', color: '#36A2EB', icon: '💰', tag: 'savings', currentAmount: 0 },
  ];

  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'categories'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const selectedYear = 2025;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loadError, setLoadError] = useState<boolean>(false);
  // Form state
  const [newExpense, setNewExpense] = useState({
    amount: '',         // Use empty string for form input
    description: '',
    categoryId: '',     // Use empty string for form input
    date: new Date().toISOString().split('T')[0],
  });

  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({
    name: '',
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    icon: '📊',
    tag: 'need'
  });

  // All possible tags - FIXED: include 'savings'
  const tags: CategoryTag[] = ['need', 'want', 'debt', 'emergency', 'goal', 'savings'];
  
  const tagColors: Record<CategoryTag, string> = {
    need:      '#3B82F6', // blue
    want:      '#10B981', // green
    debt:      '#F59E0B', // yellow
    emergency: '#FF6384', // red
    goal:      '#8B5CF6', // purple
    savings:   '#36A2EB'  // light blue
  };

  const userId = user?.uid;
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Helper function to clean data for Firebase (removes undefined values)
  const cleanDataForFirebase = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(cleanDataForFirebase);
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = cleanDataForFirebase(value);
        }
      }
      return cleaned;
    }
    return obj;
  };

  // Load user data from Firebase
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        // Load categories & expenses from users/{uid}
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          setCategories(data.categories?.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            icon: c.icon,
            tag: c.tag,
            budget: c.budget ?? 0,
            hidden: c.hidden ?? false,
            currentAmount: ['savings', 'emergency'].includes(c.tag)
              ? c.currentAmount ?? 0
              : c.currentAmount
          })) || defaultCategories);


          setExpenses(data.expenses || []);
        }
        // Load debts & goals from financial_data/{uid}
        const finSnap = await getDoc(doc(db, 'financial_data', userId));
        if (finSnap.exists()) {
          const data = finSnap.data() as any;
          setDebts(data.debts || []);
          setGoals(data.goals || []);
        }
      } catch (error) {
    //console.error("⚠️ שגיאה בטעינת הנתונים:", error);
    setLoadError(true);
    setHasLoaded(false); // ❌ אל תאפשר שמירה
  }  finally {
        setHasLoaded(true);
        setLoading(false);
      }
    })();
  }, [userId]);

  // Save data to Firebase when state changes - FIXED: Clean data before saving
  useEffect(() => {
    if (!userId || !hasLoaded) return;
    const timeout = setTimeout(() => {
      // Clean data before saving to Firebase
      const cleanCategories = cleanDataForFirebase(categories);
      const cleanExpenses = cleanDataForFirebase(expenses);
      const cleanDebts = cleanDataForFirebase(debts);
      const cleanGoals: SavingsGoal[] = goals.map(g => ({
              id: g.id,
              name: g.name,
              targetAmount: g.targetAmount,
              currentAmount: g.currentAmount,
              priority: g.priority,
              targetDate: g.targetDate as Timestamp,
              budget: g.budget ?? 0
            }));
    
      setDoc(doc(db, 'users', userId), { 
        categories: cleanCategories, 
        expenses: cleanExpenses 
      }, { merge: true });
      
      setDoc(doc(db, 'financial_data', userId), { 
        debts: cleanDebts, 
        goals: cleanGoals 
      }, { merge: true });
    }, 800);
    return () => clearTimeout(timeout);
  }, [categories, expenses, debts, goals, userId, hasLoaded]);

  // Create dynamic categories from debts and goals
  const dynamicCats: Category[] = [
    ...debts.map(d => ({ 
      id: `debt-${d.id}`, 
      name: d.name, 
      color: tagColors.debt, 
      icon: '💳', 
      tag: 'debt' as CategoryTag
    })),
    ...goals.map(g => ({ 
      id: `goal-${g.id}`, 
      name: g.name, 
      color: tagColors.goal, 
      icon: '🎯', 
      tag: 'goal' as CategoryTag
    }))
  ];
  const visibleCategories = categories.filter(c => !c.hidden);

  const displayCategories = [...visibleCategories, ...dynamicCats];
  const displayCategoriesWithTheHidden = [...categories, ...dynamicCats];

  // Filter expenses for current month
  const filteredExpenses = expenses.filter(exp => new Date(exp.date).getMonth() === selectedMonth);

  // Add expense handler - also updates debts/goals if needed
  const handleAddExpense = () => {
    const amt = parseFloat(newExpense.amount);
    const catId = newExpense.categoryId;
    if (!amt || !catId) return;

    // Update debt or goal based on category ID
    if (typeof catId === 'string' && catId.startsWith('debt-')) {
      const id = catId.replace('debt-', '');
      setDebts(prev =>
        prev.map(d => (d.id === id ? { ...d, principal: d.principal - amt } : d))
      );
    } else if (typeof catId === 'string' && catId.startsWith('goal-')) {
      const id = catId.replace('goal-', '');
      setGoals(prev =>
        prev.map(g => (g.id === id ? { ...g, currentAmount: (g.currentAmount ?? 0) + amt } : g))
      );
    }

    // Handle savings/emergency categories
    const catIndex = categories.findIndex(c => String(c.id) === catId);
    if (catIndex !== -1) {
      const cat = categories[catIndex];
      if (cat.tag === 'savings' || cat.tag === 'emergency') {
        const updated = [...categories];
        updated[catIndex] = {
          ...cat,
          currentAmount: (cat.currentAmount ?? 0) + amt
        };
        setCategories(updated);
      }
    }

    // Create new expense object
    const exp: Expense = {
      id: Date.now(),
      amount: amt,
      description: newExpense.description,
      categoryId: catId, // Store as is (string or number)
      date: newExpense.date
    };
    
    // Add to expenses array
    setExpenses(prev => [...prev, exp]);
    
    // Reset form
    setNewExpense({ 
      amount: '', 
      description: '', 
      categoryId: '', 
      date: new Date().toISOString().split('T')[0] 
    });
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;

    const isSavingType = newCategory.tag === 'savings' || newCategory.tag === 'emergency';

    const cat: Category = {
      id: Date.now(),
      name: newCategory.name,
      color: newCategory.color,
      icon: newCategory.icon,
      tag: newCategory.tag,
      ...(isSavingType && { currentAmount: 0 })  // מוסיף רק אם צריך
    };

    setCategories(prev => [...prev, cat]);

    // איפוס הטופס
    setNewCategory({ 
      name: '', 
      color: '#' + Math.floor(Math.random() * 16777215).toString(16), 
      icon: '📊', 
      tag: 'need' 
    });
  };

  // Delete expense handler
  const handleDeleteExpense = (id: number) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Filter and sort expenses
  const filtered = expenses
    .filter(e => new Date(e.date).getMonth() === selectedMonth)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Summary calculations
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Compute expenses by category
  const expensesByCategory = displayCategories.map(cat => {
    const total = filtered
      .filter(e => String(e.categoryId) === String(cat.id)) // Convert both to string for comparison
      .reduce((sum, e) => sum + e.amount, 0);
    
    return {
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      value: total,
      percentage: totalExpenses
        ? ((total / totalExpenses) * 100).toFixed(1)
        : '0'
    };
  });

  // Prepare monthly data for chart
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = monthNames.map((m, idx) => ({ 
    month: m, 
    amount: expenses
      .filter(e => new Date(e.date).getMonth() === idx)
      .reduce((s, e) => s + e.amount, 0) 
  }));

  // Compute expenses by tag
  const byTag: { tag: CategoryTag; sum: number }[] = tags.map(tag => {
    // Calculate sum from categories
    let tagSum = categories
      .filter(c => c.tag === tag)
      .reduce((s, c) => {
        const catSum = filteredExpenses
          .filter(e => String(e.categoryId) === String(c.id)) // Convert both to string
          .reduce((ss, ex) => ss + ex.amount, 0);
        return s + catSum;
      }, 0);
    
    // Add sums from dynamic categories (debts & goals) if they match the tag
    if (tag === 'debt' || tag === 'goal') {
      const dynamicSum = filteredExpenses
        .filter(e => {
          const catId = String(e.categoryId);
          return catId.startsWith(tag + '-');
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      tagSum += dynamicSum;
    }
    
    return { tag, sum: tagSum };
  });

  // Add percentages to tag data
  type TagSum = { tag: CategoryTag; sum: number };

  // 1. בונים מפה של סכומים לפי tag  
  const tagMap = displayCategories.reduce<Record<CategoryTag, number>>((acc, cat) => {
    const catData = expensesByCategory.find(c => c.name === cat.name);
    if (catData && catData.value > 0) {
      acc[cat.tag] = (acc[cat.tag] || 0) + catData.value;
    }
    return acc;
  }, {} as Record<CategoryTag, number>);

  // 2. הופכים את המפה למערך עם אחוזים
  const byTagWithPct: Array<TagSum & { pct: string }> = Object.entries(tagMap)
    .map(([tag, sum]) => ({
      tag: tag as CategoryTag,
      sum,
      pct: totalExpenses
        ? ((sum / totalExpenses) * 100).toFixed(1)
        : '0'
    }));

  if (loading) {
    return <div className="text-center p-8 text-lg" dir="rtl">🚀 טוען נתונים...</div>;
  }
  
  if (!user) {
    return <div dir="rtl">המשתמש לא מחובר...</div>;
  }
  if (loadError) {
  return (
    <div className="p-6 text-center text-red-600" dir="rtl">
      ❌ ארעה שגיאה בטעינת הנתונים. אנא נסה לרענן את הדף או בדוק את החיבור.
    </div>
  );
}
  return (
    <div className="flex flex-col h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <Home className="ml-2" /> מנהל הוצאות
          </h1>
          <div className="text-sm bg-blue-700 px-3 py-1 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">סיכום הוצאות עבור {monthNames[selectedMonth]}</h2>
            סך הכל: ₪{totalExpenses.toFixed(2)}
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
            <BarChart3 className="ml-2 w-4 h-4" /> לוח מחוונים
          </button>
          <button 
            className={`px-4 py-3 font-medium text-sm flex items-center ${activeTab === 'expenses' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Plus className="ml-2 w-4 h-4" /> הוסף הוצאה
          </button>
          <button 
            className={`px-4 py-3 font-medium text-sm flex items-center ${activeTab === 'categories' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('categories')}
          >
            <PieChartIcon className="ml-2 w-4 h-4" /> קטגוריות
          </button>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="container mx-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Categories Distribution */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">חלוקה לקטגוריות</h2>
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
                        //label={({name, percentage}) => `${name}: ${percentage}%`}
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
                          <span className="ml-2">{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">₪{category.value.toFixed(2)}</span>
                          <span className="mr-2 text-sm text-gray-500">({category.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Tag Distribution */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">חלוקה לסוגי הוצאה</h2>
                <div className="flex items-center justify-center h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byTagWithPct}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="sum"
            
                        labelLine={false}
                      >
                        {byTagWithPct.map((entry, i) => (
                          <Cell key={i} fill={tagColors[entry.tag]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            const tagNames: Record<CategoryTag, string> = {
                              need: 'צרכים',
                              want: 'רצונות',
                              debt: 'חובות',
                              emergency: 'קרן חירום',
                              goal: 'מטרות',
                              savings: 'חסכונות'
                            };
                            return (
                              <div className="bg-white border rounded shadow-md px-3 py-2 text-sm text-gray-800">
                                <div className="font-medium">{tagNames[data.tag as CategoryTag]}</div>
                                <div>₪{data.sum.toFixed(2)}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4">
                  {byTagWithPct.map(t => {
                    // Translate tag names to Hebrew
                    const tagNames: Record<CategoryTag, string> = {
                      need: 'צרכים',
                      want: 'רצונות',
                      debt: 'חובות',
                      emergency: 'קרן חירום',
                      goal: 'מטרות',
                      savings: 'חסכונות'
                    };
                    
                    return (
                      <div key={t.tag} className="flex items-center justify-between py-2 border-b">
                        <span>{tagNames[t.tag]}</span>
                        <div className="flex items-center">
                          <span className="font-medium">₪{t.sum.toFixed(2)}</span>
                          <span className="mr-2 text-sm text-gray-500">({t.pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Monthly Trend */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">טרנד חודשי</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={monthlyData} 
                      onClick={(data) => {
                        if (data?.activeLabel) {
                          const monthIndex = monthNames.indexOf(data.activeLabel);
                          if (monthIndex !== -1) {
                            setSelectedMonth(monthIndex);
                          }
                        }
                      }}
                    >
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₪${value}`} />
                      <Bar dataKey="amount" fill="#4F46E5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700">סטטיסטיקה מהירה</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-gray-500">ממוצע יומי</div>
                      <div className="font-medium">₪{(totalExpenses / 30).toFixed(2)}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-gray-500">קטגוריה מובילה</div>
                      <div className="font-medium">
                        {expensesByCategory.sort((a, b) => b.value - a.value)[0]?.name || 'אין'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent Transactions */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">הוצאות לחודש הנוכחי</h2>
                <div className="h-64 overflow-y-auto">
                  <div className="min-h-full flex flex-col">
                    <table className="min-w-full divide-y divide-gray-200 flex-grow">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
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
                              date.getMonth() === selectedMonth &&
                              date.getFullYear() === selectedYear
                            );
                          })
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(expense => {
                            const category = displayCategoriesWithTheHidden.find(c => String(c.id) === String(expense.categoryId));
                            return (
                              <tr key={expense.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="ml-2" style={{ color: category?.color }}>
                                      {category?.icon}
                                    </span>
                                    <span className="text-sm font-medium">{category?.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">₪{expense.amount.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}
          
          {/* Add Expenses Tab */}
          {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Form */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">הוסף הוצאה חדשה</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">סכום (₪)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
                    <select
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={newExpense.categoryId}
                      onChange={(e) => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                    >
                      <option value="">בחר קטגוריה</option>
                      {displayCategories.map(category => (
                        <option key={String(category.id)} value={String(category.id)}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      placeholder="תיאור ההוצאה"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">תאריך</label>
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
                    <Plus className="ml-2 w-4 h-4" /> הוסף הוצאה
                  </button>
                </div>
              </div>
              
              {/* Expense List */}
              <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4">כל ההוצאות</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">קטגוריה</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תיאור</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סכום</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expenses
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(expense => {
                          // Find matching category
                          const category = displayCategoriesWithTheHidden.find(c => String(c.id) === String(expense.categoryId));
                          
                          return (
                            <tr key={expense.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="ml-2" style={{ color: category?.color }}>{category?.icon}</span>
                                  <span className="text-sm font-medium">{category?.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">₪{expense.amount.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">תיוג (מה מייצג הכסף שהולך לקטגוריה זו)</label>
                  <select
                    value={newCategory.tag}
                    onChange={e => setNewCategory({
                      ...newCategory,
                      tag: e.target.value as CategoryTag
                    })}
                  >
                    <option value="need">Needs (בסיסי)</option>
                    <option value="want">Wants (מותרות)</option>
                    <option value="emergency">Emergency (חירום)</option>
                    <option value="savings">savings (חיסכון)</option>
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
                      const original = categories.find(c => c.id === selectedId);
                        const updatedCategory = {
                          ...newCategory,
                          id: selectedId,
                          ...(original?.currentAmount !== undefined && { currentAmount: original.currentAmount })
                        };

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