import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Menu,Plus, Trash2, ArrowRight, BarChart3, PieChart as PieChartIcon, Home, Calendar, Target, CreditCard, TrendingUp, Filter, Search } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection,getDocs  } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import {Category,Expense,CategoryTag,ExpenseTrackerProps,Debt, SavingsGoal, RecurringExpense} from '../type/appTypes'
import SidebarWrapper from '../components/SidebarWrapper';
import FullPageError from '../components/FullPageError';

export default function ExpenseTracker({ user }: ExpenseTrackerProps) {
  // Default categories
  const defaultCategories: Category[] = [
    { id: 1, name: 'קרן ביטחון', color: '#FF6384', icon: '🛡️', tag: 'emergency', currentAmount: 0 },
    { id: 2, name: 'חיסכון כללי', color: '#36A2EB', icon: '💰', tag: 'savings', currentAmount: 0 },
  ];
const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
const [showRecurringForm, setShowRecurringForm] = useState(false);
const [recurringForm, setRecurringForm] = useState({
  amount: '',
  description: '',
  categoryId: '',
  dayOfMonth: 1,
  startDate: new Date().toISOString().split('T')[0],
  endDate: ''
});

  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'categories'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => 2020 + i);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loadError, setLoadError] = useState<boolean>(false);
const [monthlyIncomeData, setMonthlyIncomeData] = useState<Record<string, number>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

const [fatalError, setFatalError] = useState<null | {
  title?: string;
  description?: string;
  severity?: 'error' | 'warning' | 'info';
}>(null)
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
  need:      '#3B82F6', // כחול
  want:      '#EF4444', // אדום
  debt:      '#F59E0B', // צהוב
  emergency: '#10B981', // ירוק
  goal:      '#8B5CF6', // סגול
  savings:   '#6366F1'  // כחול-סגול שונה מ־need
};
;

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
    const colRef = collection(db, 'financial_data', userId, 'monthly_income');
    const snapshot = await getDocs(colRef);
    const incomeMap: Record<string, number> = {};

    snapshot.forEach(docSnap => {
      const month = docSnap.id; // example: "2025-05"
      const total = docSnap.data().total;
      if (typeof total === 'number') {
        incomeMap[month] = total;
      }
    });

    setMonthlyIncomeData(incomeMap);

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
          setRecurringExpenses(data.recurringExpenses || [])
        }
        // Load debts & goals from financial_data/{uid}
        const finSnap = await getDoc(doc(db, 'financial_data', userId));
        if (finSnap.exists()) {
          const data = finSnap.data() as any;
          setDebts(data.debts || []);
          setGoals(data.goals || []);
        }
      } catch (error) {
    setFatalError({
        title: 'שגיאה בטעינת נתונים',
        description: 'לא הצלחנו לטעון מידע מהשרת. בדוק את החיבור ונסה שוב.',
        severity: 'error'
      });
      setLoadError(true);
    setHasLoaded(false); // ❌ אל תאפשר שמירה
  }  finally {
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
      
      setDoc(doc(db, 'financial_data', userId), { 
        debts: cleanDebts, 
        goals: cleanGoals 
      }, { merge: true });
      const cleanRecurring = cleanDataForFirebase(recurringExpenses);

      setDoc(doc(db, 'users', userId), { 
        categories: cleanCategories, 
        expenses: cleanExpenses,
        recurringExpenses: cleanRecurring // ✅ שמירה
      }, { merge: true });

    }, 800);
    return () => clearTimeout(timeout);
  }, [categories, expenses, debts, goals, userId, hasLoaded]);
  const [generatedThisMonth, setGeneratedThisMonth] = useState<Set<string>>(new Set());


  useEffect(() => {
    if (!hasLoaded || !userId) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const keyForRecurring = (r: RecurringExpense) =>
      `${r.id}_${year}_${month}`;

    const generated: Expense[] = [];
    const newKeys: string[] = [];

    for (const r of recurringExpenses) {
      const key = keyForRecurring(r);

      // אם כבר נוצרה החודש — מדלג
      if (generatedThisMonth.has(key)) continue;

      const start = new Date(r.startDate);
      const end = r.endDate ? new Date(r.endDate) : null;
      const valid = start <= today && (!end || today <= end);
      if (!valid) continue;

      const lastDay = new Date(year, month + 1, 0).getDate();
      const safeDay = Math.min(r.dayOfMonth, lastDay);
      const date = new Date(year, month, safeDay);

      generated.push({
        id: Date.now() + Math.random(),
        amount: r.amount,
        description: r.description,
        categoryId: r.categoryId,
        date: date.toISOString().split('T')[0]
      });

      newKeys.push(key);
    }

    if (generated.length > 0) {
      setExpenses(prev => [...prev, ...generated]);
      setGeneratedThisMonth(prev => {
        const updated = new Set(prev);
        newKeys.forEach(k => updated.add(k));
        return updated;
      });
    }
  }, [recurringExpenses, hasLoaded, userId]);
  const currentMonthId = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const previousMonthId = selectedMonth === 0
    ? `${selectedYear - 1}-12`
    : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const currentIncome = monthlyIncomeData?.[currentMonthId];
  const previousIncome = monthlyIncomeData?.[previousMonthId];


  const incomeChangePct = previousIncome
    ? (((currentIncome - previousIncome) / previousIncome) * 100).toFixed(1)
    : '0.0';
  const incomeChangePctNum = parseFloat(incomeChangePct);

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
  
const [showByTag, setShowByTag] = useState(false);

  // Filter expenses for current month
const filteredExpenses = expenses.filter(exp => {
  const date = new Date(exp.date);
  return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
});

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

  // Delete expense handler
  const handleDeleteExpense = (id: number) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Filter and sort expenses
  const filtered = filteredExpenses
    .filter(e => new Date(e.date).getMonth() === selectedMonth)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Summary calculations
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Compute expenses by category
  const expensesByCategory = displayCategoriesWithTheHidden.map(cat => {
    const total = filteredExpenses
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
  const monthlyData = monthNames.map((m, idx) => {
  const monthId = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
  return {
    month: m,
    expenses: expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === idx && d.getFullYear() === selectedYear;
      })
      .reduce((sum, e) => sum + e.amount, 0),
    income: monthlyIncomeData[monthId] || 0
  };
});


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
const handleAddRecurring = () => {
  const { amount, description, categoryId, dayOfMonth, startDate, endDate } = recurringForm;

  // בדיקות בסיסיות
  if (!amount || !description || !categoryId || !dayOfMonth || !startDate) {
    alert('אנא מלא את כל השדות הנדרשים');
    return;
  }

  const newRecurring: RecurringExpense = {
    id: String(Date.now()),
    amount: parseFloat(amount),
    description,
    categoryId,
    dayOfMonth: Number(dayOfMonth),
    startDate,
    endDate: endDate || undefined
  };

  setRecurringExpenses(prev => [...prev, newRecurring]);

  // איפוס טופס
  setRecurringForm({
    amount: '',
    description: '',
    categoryId: '',
    dayOfMonth: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  setShowRecurringForm(false);
};
const handleDeleteRecurring = (id: string) => {
  setRecurringExpenses(prev => prev.filter(r => r.id !== id));

  // מחיקה של ההוצאה הצפויה הבאה (אם נוצרה)
  setExpenses(prev => prev.filter(exp => {
    const match = recurringExpenses.find(r => r.id === id);
    if (!match) return true;

    const expDate = new Date(exp.date);
    const now = new Date();
    return !(
      exp.description === match.description &&
      exp.categoryId === match.categoryId &&
      expDate.getMonth() === now.getMonth() &&
      expDate.getFullYear() === now.getFullYear()
    );
  }));
};

  // Add percentages to tag data
  type TagSum = { tag: CategoryTag; sum: number };

  // 1. בונים מפה של סכומים לפי tag  
  const tagMap = displayCategoriesWithTheHidden.reduce<Record<CategoryTag, number>>((acc, cat) => {
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

if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 flex items-center justify-center from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">🚀 טוען נתונים…</p>
        </div>
      </div>
    );
  }
  
  if(fatalError){
      return(
      <FullPageError
        title={fatalError.title}
        description={fatalError.description}
        severity={fatalError.severity}
      />
      )
    }
const tagIcons: Record<CategoryTag, string> = {
  need: '🛒',
  want: '🎉',
  debt: '💳',
  emergency: '🛡️',
  goal: '🎯',
  savings: '💰'
};
const tagLabels: Record<CategoryTag, string> = {
  need: 'הוצאות בסיס',
  want: 'רצונות',
  savings: 'חיסכון',
  emergency: 'חירום',
  goal: 'מטרה',
  debt: 'חוב'
};
const byTagForChart = byTagWithPct.map(({ tag, sum, pct }) => ({
  name: tagLabels[tag],
  icon: tagIcons[tag],
  color: tagColors[tag],
  value: sum,
  percentage: pct
}));


return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-emerald-100 from-slate-50 via-blue-50 to-indigo-100" dir="rtl">
    
    {/* Modern Header */}
    <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50 relative">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo & Title */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                kesefy
              </h1>
              <p className="text-sm text-gray-500">מנהל הכספים האישיים שלך</p>
            </div>
          </div>

          {/* Top Stats & Selectors */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-2xl shadow-lg">
              <div className="text-center text-black">
                <div className="text-sm opacity-90">סה"כ החודש</div>
                <div className="text-xl font-bold">₪{totalExpenses.toLocaleString()}</div>
              </div>
            </div>
            <select
              className="bg-white/90 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select 
              className="bg-white/90 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthNames.map((month, idx) => (
                <option key={idx} value={idx}>{month} {selectedYear}</option>
              ))}
            </select>
          </div>

          {/* Menu Button – Mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 right-4 z-50 p-3 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow lg:hidden"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>
    </header>

    {/* Sidebar */}
    <SidebarWrapper sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

    {/* Navigation Tabs */}
    <nav className="bg-white/70 backdrop-blur-sm border-b border-white/30 overflow-x-auto">
      <div className="container mx-auto px-6">
        <div className="flex w-max space-x-1 space-x-reverse">
          {[
            { id: 'dashboard', label: 'לוח בקרה', icon: BarChart3 },
            { id: 'expenses', label: 'הוצאות', icon: Plus },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`px-6 py-4 font-medium text-sm flex items-center space-x-2 space-x-reverse transition-all duration-200 relative ${
                  activeTab === tab.id 
                    ? 'text-blue-600 bg-white/60 rounded-t-xl border-b-2 border-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/30 rounded-t-xl'
                }`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>

    {/* Main Content */}
    <main className="container mx-auto px-6 py-8">

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">הכנסות החודש</p>
                    <p className="text-2xl font-bold text-gray-900">₪{currentIncome.toLocaleString()}</p>
                    <p className={`text-xs flex items-center mt-2 ${incomeChangePctNum  >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      <TrendingUp className="w-3 h-3 ml-1" />
                      {incomeChangePctNum  >= 0 ? '+' : ''}{incomeChangePct}% לעומת החודש הקודם
                    </p>
                  </div>

                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">הוצאות החודש</p>
                    <p className="text-2xl font-bold text-gray-900">₪{totalExpenses.toLocaleString()}</p>
                    <p className="text-xs text-orange-600 flex items-center mt-2">
                      <Target className="w-3 h-3 ml-1" />
                      {((totalExpenses / 15000) * 100).toFixed(1)}% מהתקציב
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>



              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">הוראות קבע</p>
                    <p className="text-2xl font-bold text-gray-900">{recurringExpenses.length}</p>
                    <p className="text-xs text-purple-600 flex items-center mt-2">
                      <Calendar className="w-3 h-3 ml-1" />
                      פעילות השבוע
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Category Distribution */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {showByTag ? 'פילוח לפי תגיות' : 'פילוח לפי קטגוריות'}
                </h2>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onClick={() => setShowByTag(prev => !prev)}
                    className="text-sm text-blue-600 hover:text-blue-800 border border-blue-100 px-3 py-1 rounded-xl transition"
                  >
                    {showByTag ? 'הצג לפי קטגוריה' : 'הצג לפי תגית'}
                  </button>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <PieChartIcon className="w-4 h-4 text-white" />
                  </div>
                </div>

              </div>
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={showByTag ? byTagForChart : expensesByCategory}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(showByTag ? byTagForChart : expensesByCategory).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>

                      <Tooltip 
                        formatter={(value: any) => [`₪${value}`, 'סכום']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {(showByTag ? byTagForChart : expensesByCategory)
                    .sort((a, b) => b.value - a.value)
                    .map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.icon ?? ''}</span>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900">₪{item.value.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{item.percentage}%</div>
                        </div>
                      </div>
                  ))}
                </div>

              </div>

              {/* Monthly Trend */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">מגמה חודשית</h2>
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                      />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;

                        const expenses = payload.find(p => p.dataKey === 'expenses');
                        const income = payload.find(p => p.dataKey === 'income');

                        return (
                          <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                            padding: '10px 16px',
                            direction: 'rtl',
                            fontFamily: 'inherit'
                          }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>{label}</div>
                            {expenses && (
                              <div style={{ color: '#EF4444', fontSize: '14px' }}>
                                הוצאות: ₪{expenses.value?.toLocaleString()}
                              </div>
                            )}
                            {income && (
                              <div style={{ color: '#10B981', fontSize: '14px' }}>
                                הכנסות: ₪{income.value?.toLocaleString()}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                      <Bar
                      dataKey="expenses"
                      radius={[6, 6, 0, 0]}
                      barSize={30}
                      fill="#EF4444"
                      onClick={(data) => {
                        const clickedIndex = monthNames.findIndex(m => m === data.month);
                        if (clickedIndex !== -1) setSelectedMonth(clickedIndex);
                      }}
                    />
                    <Bar
                      dataKey="income"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                      fill="#10B981"
                      onClick={(data) => {
                        const clickedIndex = monthNames.findIndex(m => m === data.month);
                        if (clickedIndex !== -1) setSelectedMonth(clickedIndex);
                      }}
                    />

                    <Legend 
                      formatter={(value: string) => value === 'expenses' ? 'הוצאות' : 'הכנסות'}
                    />

                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">הוצאות אחרונות</h2>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 space-x-reverse">
                  <span>צפה בהכל</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                {expenses
                  .filter(expense => {
                    const date = new Date(expense.date);
                    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map(expense => {
                    const category = displayCategoriesWithTheHidden.find(c => String(c.id) === String(expense.categoryId));
                    return (
                      <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center space-x-4 space-x-reverse">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${category?.color}20`, color: category?.color }}
                          >
                            {category?.icon}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{expense.description}</div>
                            <div className="text-sm text-gray-500">{category?.name} • {expense.date}</div>
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900">₪{expense.amount.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Expense Form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-6">הוסף הוצאה חדשה</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">סכום (₪)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריה</label>
                  <select
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">תיאור</label>
                  <input 
                    type="text" 
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="תיאור ההוצאה"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך</label>
                  <input 
                    type="date" 
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  />
                </div>
                
                <button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center justify-center space-x-2 space-x-reverse font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  onClick={handleAddExpense}
                >
                  <Plus className="w-5 h-5" />
                  <span>הוסף הוצאה</span>
                </button>
              </div>

              {/* Recurring Expenses Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">הוראות קבע</h3>
                  <button
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-teal-700 text-sm font-medium transition-all duration-200"
                    onClick={() => setShowRecurringForm(!showRecurringForm)}
                  >
                    {showRecurringForm ? 'בטל' : '➕ הוסף הוראת קבע'}
                  </button>
                </div>

                {showRecurringForm && (
                  <div className="space-y-4 p-4 bg-gray-50/50 rounded-xl mb-4">
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        type="number"
                        placeholder="סכום (₪)"
                        className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                        value={recurringForm.amount}
                        onChange={(e) => setRecurringForm({...recurringForm, amount: e.target.value})}
                      />
                      
                      <input
                        type="text"
                        placeholder="תיאור"
                        className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                        value={recurringForm.description}
                        onChange={(e) => setRecurringForm({...recurringForm, description: e.target.value})}
                      />
                      
                      <select
                        className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                        value={recurringForm.categoryId}
                        onChange={(e) => setRecurringForm({...recurringForm, categoryId: e.target.value})}
                      >
                        <option value="">בחר קטגוריה</option>
                        {displayCategories.map(category => (
                          <option key={String(category.id)} value={String(category.id)}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                      </select>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">יום בחודש</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                            value={recurringForm.dayOfMonth}
                            onChange={(e) => setRecurringForm({...recurringForm, dayOfMonth: Number(e.target.value)})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">תאריך התחלה</label>
                          <input
                            type="date"
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                            value={recurringForm.startDate}
                            onChange={(e) => setRecurringForm({...recurringForm, startDate: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">תאריך סיום (אופציונלי)</label>
                        <input
                          type="date"
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          value={recurringForm.endDate}
                          onChange={(e) => setRecurringForm({...recurringForm, endDate: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleAddRecurring}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 font-medium"
                    >
                      שמור הוראת קבע
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {recurringExpenses.map(recurring => {
                    const category = displayCategories.find(c => String(c.id) === String(recurring.categoryId));
                    return (
                      <div key={recurring.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <div className="text-lg">{category?.icon}</div>
                          <div>
                            <div className="font-medium text-sm">{recurring.description}</div>
                            <div className="text-xs text-gray-500">
                              ₪{recurring.amount} • {recurring.dayOfMonth} בחודש
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteRecurring(recurring.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Expenses List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    הוצאות {monthNames[selectedMonth]} ({filteredExpenses.length})
                  </h2>
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="text-sm text-gray-500">
                      סה"כ: <span className="font-bold text-gray-900">₪{totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">אין הוצאות</h3>
                    <p className="text-gray-500">הוסף הוצאות כדי לראות אותן כאן</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredExpenses
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(expense => {
                        const category = displayCategoriesWithTheHidden.find(c => String(c.id) === String(expense.categoryId));
                        return (
                          <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors group">
                            <div className="flex items-center space-x-4 space-x-reverse">
                              <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg"
                                style={{ backgroundColor: `${category?.color}20`, color: category?.color }}
                              >
                                {category?.icon}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{expense.description}</div>
                                <div className="text-sm text-gray-500">
                                  {category?.name} • {new Date(expense.date).toLocaleDateString('he-IL')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 space-x-reverse">
                              <div className="text-left">
                                <div className="font-bold text-gray-900">₪{expense.amount.toLocaleString()}</div>
                              </div>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-2 transition-all duration-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">פילוח לפי תגיות</h3>
                  <div className="space-y-3">
                    {byTagWithPct.map(({ tag, sum, pct }) => (
                      <div key={tag} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tagColors[tag] }}
                          />
                          <span className="text-sm capitalize">{tag}</span>
                        </div>
                        <div className="text-left">
                          <div className="font-medium">₪{sum.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{pct}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">סטטיסטיקות מהירות</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">ממוצע ליום</span>
                      <span className="font-medium">₪{(totalExpenses / new Date(selectedYear, selectedMonth + 1, 0).getDate()).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">הוצאה גבוהה ביותר</span>
                      <span className="font-medium">₪{Math.max(...filteredExpenses.map(e => e.amount), 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">הוצאה נמוכה ביותר</span>
                      <span className="font-medium">₪{Math.min(...filteredExpenses.map(e => e.amount), 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600">נותר לחודש</span>
                      <span className="font-bold text-emerald-600">₪{(15000 - totalExpenses).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );

}