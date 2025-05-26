import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, PlusCircle, TrendingUp, AlertCircle, ArrowUpCircle, ArrowDownCircle, DollarSign, Percent } from 'lucide-react';
import { 
  Home, 
  PieChart as PieIcon, 
  Calculator,
  LogOut,
  Wallet,
} from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; // הנתיב לפי מיקום הקובץ
import { useUserData } from '../hooks/useUserData';
export default function BudgetPlanner({ user }) {
  const navigate = useNavigate();
  const [trueCategories, setTrueCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editBudget, setEditBudget] = useState('');
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loadError, setLoadError] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayItems = useMemo(() => {
    const goalItems = goals.map(g => ({
      id: `goal-${g.id}`,
      originalId: g.id,
      name: g.name,
      icon: '🎯',
      tag: 'goal',
      type: 'goal',
      budget: g.budget || 0,
      spent: expenses.filter(e => e.categoryId === `goal-${g.id}`).reduce((sum, e) => sum + e.amount, 0)
    }));
    const debtItems = debts.map(d => ({
      id: `debt-${d.id}`,
      originalId: d.id,
      name: d.name,
      icon: '💳',
      tag: 'debt',
      type: 'debt',
      budget: d.budget || 0,
      spent: expenses.filter(e => e.categoryId === `debt-${d.id}`).reduce((sum, e) => sum + e.amount, 0)
    }));
    const processedTrueCategories = trueCategories.map(cat => ({
      ...cat,
      type: 'category'
    }));
    return [...processedTrueCategories, ...goalItems, ...debtItems];
  }, [trueCategories, goals, debts, expenses]);

  const totalBudget = displayItems.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = displayItems.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = Math.floor((now.getDate() / daysInMonth) * 100);

  const userId = user?.uid;
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const {
    categories,
    addExpenseToDB
  } = useUserData(user?.uid);
  useEffect(() => {
    if (!userId) return;

    const loadUserData = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const finRef = doc(db, 'financial_data', userId);

        const [userSnap, finSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(finRef)
        ]);

        let loadedExpenses = [];
        let loadedCategoriesData = [];
        let loadedDebtsData = [];
        let loadedGoalsData = [];

        if (userSnap.exists()) {
          const d = userSnap.data();
          loadedExpenses = d.expenses || [];
          loadedCategoriesData = d.categories || [];
        }

        if (finSnap.exists()) {
          const d = finSnap.data();
          loadedDebtsData = d.debts || [];
          loadedGoalsData = d.goals || [];
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const expensesByCategory = {};

        for (const exp of loadedExpenses) {
          const date = new Date(exp.date);
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            const id = exp.categoryId;
            expensesByCategory[id] = (expensesByCategory[id] || 0) + exp.amount;
          }
        }

        const processedCategories = loadedCategoriesData.map(cat => ({
          ...cat,
          spent: expensesByCategory[cat.id] || 0,
          budget: cat.budget || 0,
        }));

        setExpenses(loadedExpenses);
        setDebts(loadedDebtsData);
        setGoals(loadedGoalsData);
        setTrueCategories(processedCategories);
      } catch (error) {
        console.error("⚠️ שגיאה בטעינת הנתונים:", error);
        setLoadError(true);
      } finally {
        setHasLoaded(true);
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (!userId || !hasLoaded) return;

    const userDocData = {
      expenses,
      categories: trueCategories
    };

    const financialDocData = {
      goals,
      debts
    };

    const timeout = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', userId), userDocData);
        await setDoc(doc(db, 'financial_data', userId), financialDocData, { merge: true });
      } catch (error) {
        console.error("⚠️ שגיאה בשמירת הנתונים:", error);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [expenses, trueCategories, goals, debts, userId, hasLoaded]);

if (loading) {
  return <div className="text-center p-8 text-lg">🚀 טוען נתונים...</div>;
}
  if (!user) {
  return <div>Loading or not authenticated...</div>;
}
if (loadError) {
  return (
    <div className="p-6 text-center text-red-600" dir="rtl">
      ❌ ארעה שגיאה בטעינת הנתונים. אנא נסה לרענן את הדף או בדוק את החיבור.
    </div>
  );
}
const formatCategoryCount = (count) => {
  if (count === 1) return 'קטגוריה אחת';
  if (count === 2) return 'שתי קטגוריות';
  return `${count} קטגוריות`;
};

  const generateInsights = () => {
  if (totalBudget === 0) return [];

  const insights = [];
  // The insights generation will need to use displayItems or re-calculate based on combined data.
  const overBudgetItems = displayItems.filter(item => item.budget > 0 && item.spent > item.budget);
  const closeToLimitItems = displayItems.filter(
    item => item.budget > 0 && item.spent >= item.budget * 0.8 && item.spent < item.budget
  );

  if (overBudgetItems.length > 0) {
  const names = overBudgetItems.slice(0, 3).map(c => c.name).join(', ');
  const countText = formatCategoryCount(overBudgetItems.length, 'פריטי תקציב'); // Changed from 'קטגורי'
  insights.push({
    type: 'warning',
    icon: <AlertCircle className="text-red-500" />,
    text: `${countText} חרגו מהתקציב: ${names}${overBudgetItems.length > 3 ? ' ועוד' : ''}`,
  });
}

if (closeToLimitItems.length > 0) {
  const names = closeToLimitItems.slice(0, 3).map(c => c.name).join(', ');
  const countText = formatCategoryCount(closeToLimitItems.length, 'פריטי תקציב'); // Changed from 'קטגורי'
  insights.push({
    type: 'alert',
    icon: <AlertCircle className="text-amber-500" />,
    text: `${countText} מתקרבות למגבלת התקציב: ${names}${closeToLimitItems.length > 3 ? ' ועוד' : ''}`,
  });
}


  const spendingRatio = totalSpent / totalBudget;

  if (monthProgress < 50 && spendingRatio > 0.6) {
    insights.push({
      type: 'rate',
      icon: <TrendingUp className="text-red-500" />,
      text: 'קצב ההוצאות שלך גבוה מדי יחסית לתחילת החודש'
    });
  } else if (monthProgress > 80 && spendingRatio < 0.7) {
    insights.push({
      type: 'saving',
      icon: <ArrowDownCircle className="text-green-500" />,
      text: 'אתה חוסך יותר מהצפוי החודש. כל הכבוד!'
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'normal',
      icon: <DollarSign className="text-blue-500" />,
      text: 'התקציב שלך מאוזן לחודש זה'
    });
  }

  return insights;
};
const generateMonthlyComparison = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const previousExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
  });

  const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const previousTotal = previousExpenses.reduce((sum, e) => sum + e.amount, 0);

  const percentDiff = previousTotal > 0 
    ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
    : 0;

  return {
    currentTotal,
    previousTotal,
    percentDiff,
    direction: percentDiff > 0 ? 'up' : 'down'
  };
};

  const insights = generateInsights();
const comparison = generateMonthlyComparison();


  // Handle editing a budget
  const startEdit = (id, currentBudget, type) => {
    setEditingId(id);
    setEditBudget(currentBudget.toString());
    setEditingType(type); // Set the type of item being edited
  };

 const saveEdit = () => {
  const budget = parseFloat(editBudget);
  if (isNaN(budget)) return;

  if (editingType === 'category') {
    setTrueCategories(trueCategories.map(cat => 
      cat.id === editingId ? { ...cat, budget } : cat
    ));
  } else if (editingType === 'goal') {
    const itemToEdit = displayItems.find(item => item.id === editingId);
    if (itemToEdit && itemToEdit.originalId) {
      setGoals(goals.map(goal => 
        goal.id === itemToEdit.originalId ? { ...goal, budget } : goal
      ));
    }
  } else if (editingType === 'debt') {
    const itemToEdit = displayItems.find(item => item.id === editingId);
    if (itemToEdit && itemToEdit.originalId) {
      setDebts(debts.map(debt =>
        debt.id === itemToEdit.originalId ? { ...debt, budget } : debt
      ));
    }
  }

  setEditingId(null);
  setEditingType(null);
};

const hebrewMonthYear = new Date().toLocaleDateString('he-IL', {
  year: 'numeric',
  month: 'long'
});
  const tagColors = {
    need: '#3B82F6',
    want: '#10B981',
    debt: '#F59E0B',
    emergency: '#FF6384',
    goal: '#8B5CF6',
    savings: '#36A2EB'
  };
 const menuItems = [
    { icon: Home, label: 'דף הבית', path: '/', current: true },
    { icon: Wallet, label: 'ניהול חסכונות', path: '/budget' },
    { icon: PieIcon, label: 'מעקב הוצאות', path: '/expense' },
    { icon: Calculator, label: 'ניהול תקציב', path: '/budgetPlanner' },
    { icon: DollarSign, label: 'ייעוץ פיננסי', path: '/advisor' },
  ];
  
  const displayCategories = [
    ...categories,
    ...debts.map(d => ({
      id: `debt-${d.id}`,
      name: d.name,
      color: tagColors.debt,
      icon: '💳',
      tag: 'debt'
    })),
    ...goals.map(g => ({
      id: `goal-${g.id}`,
      name: g.name,
      color: tagColors.goal,
      icon: '🎯',
      tag: 'goal'
    }))
  ];
  
  return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
      <Sidebar
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        menuItems={menuItems}
        displayCategories={displayCategories}
        addExpenseToDB={addExpenseToDB}
      />
       <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
       <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
         🎯 <span className="text-yellow-500">מנהל התקציב</span>
        </h1>

            <button 
            className="flex items-center text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full text-sm transition"
            onClick={() => navigate('/')}
            >
            <ChevronLeft size={18} className="ml-1" />
            חזרה
            </button>
      </div>
      
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="mb-6 flex justify-center gap-3">
  {[
    { id: 'summary', label: 'סיכום תקציב' },
    { id: 'categories', label: 'תקציב לפי קטגוריה' },
    { id: 'insights', label: 'תובנות חכמות' },
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm 
        ${activeTab === tab.id
          ? 'bg-yellow-400 text-gray-900'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      {tab.label}
    </button>
  ))}
</div>


      </div>
      
      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div>
          {/* Budget Overview */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">סיכום תקציב חודשי</h2>
              <div className="text-sm text-gray-500 text-right">{hebrewMonthYear}</div>

            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">תקציב כולל</div>
                <div className="text-xl font-bold">₪{totalBudget.toFixed(2)}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">נותר</div>
                <div className="text-xl font-bold text-green-600">₪{totalRemaining.toFixed(2)}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">נוצל</div>
                <div className="text-xl font-bold text-red-500">₪{totalSpent.toFixed(2)}</div>
              </div>
            </div>
            
            {/* Monthly Progress */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium">התקדמות חודשית</div>
                <div className="text-sm text-gray-500">{monthProgress}%</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${monthProgress}%` }}
                ></div>
              </div>
            </div>
            
            {/* Budget vs Spent */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium">ניצול תקציב</div>
                <div className="text-sm text-gray-500">{Math.round((totalSpent/totalBudget)*100)}%</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${totalSpent > totalBudget ? 'bg-red-500' : 'bg-green-500'}`} 
                  style={{ width: `${Math.min((totalSpent/totalBudget)*100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Key Insights */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium mb-3">תובנות מהירות</h3>
            {insights.slice(0, 2).map((insight, index) => (
              <div key={index} className="flex items-start mb-2">
                <div className="mr-2">{insight.icon}</div>
                <div className="text-sm">{insight.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">תקציב לפי קטגוריה</h2>
            
          </div>
          
          
          {/* Categories List - Now iterates over displayItems */}
          <div className="space-y-4">
            {displayItems.map((item) => ( 
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                     {item.tag && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        item.tag === 'goal' ? 'bg-green-100 text-green-700' :
                        item.tag === 'debt' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'}`}>
                        {item.tag === 'goal' ? 'מטרה' : item.tag === 'debt' ? 'חוב' : ''}
                      </span>
                    )}
                  </div>
                  {editingId === item.id ? (
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        className="w-24 p-1 border border-gray-300 rounded-md text-sm ml-2"
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                      />
                      <button 
                        className="text-blue-600 text-sm"
                        onClick={saveEdit} 
                      >
                        שמור
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="text-sm text-gray-500"
                      onClick={() => startEdit(item.id, item.budget, item.type)} 
                    >
                      עריכה
                    </button>
                  )}
                </div>
                
               <div className="flex justify-between text-sm text-gray-500 mb-1">
                <div>₪{item.spent.toFixed(2)} / ₪{item.budget.toFixed(2)}</div>
                <div>
                    {item.budget > 0 
                    ? `${Math.round((item.spent / item.budget) * 100)}%`
                    : '—'}
                </div>
                </div>

               <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full ${
                        item.spent > item.budget
                            ? 'bg-red-600'
                            : item.spent > item.budget * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                        width: item.budget > 0 
                            ? `${Math.min((item.spent / item.budget) * 100, 100)}%` 
                            : '0%',
                        minWidth: item.spent > 0 ? '4px' : '0px'
                        }}
                    ></div>
                </div>

                
                <div className="mt-2 text-sm">
                  <span className="font-medium">
                    נותר: ₪{(item.budget - item.spent).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">תובנות חכמות</h2>
          
          {/* Monthly Comparison */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium mb-3">השוואה לחודש קודם</h3>
            <div className="flex items-center mb-2">
                {comparison.direction === 'down' ? (
                <ArrowDownCircle size={20} className="text-green-500 ml-2" />
                ) : (
                <ArrowUpCircle size={20} className="text-red-500 ml-2" />
                )}
                <div>
                <span className="font-medium">
                    {Math.abs(comparison.percentDiff)}% {comparison.direction === 'down' ? 'פחות' : 'יותר'} הוצאות
                </span>{' '}
                לעומת החודש הקודם
                </div>
            </div>
            </div>

          
          {/* Smart Insights */}
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="border-r-4 border-blue-500 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="ml-3">{insight.icon}</div>
                  <div>
                    <div className="font-medium mb-1">
                      {insight.type === 'warning' ? 'אזהרה' : 
                       insight.type === 'alert' ? 'התראה' :
                       insight.type === 'rate' ? 'קצב הוצאות' :
                       insight.type === 'saving' ? 'חיסכון' : 'תובנה'}
                    </div>
                    <div className="text-sm text-gray-700">{insight.text}</div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Tips */}
            <div className="border-r-4 border-green-500 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start">
                <div className="ml-3"><TrendingUp className="text-green-500" /></div>
                <div>
                  <div className="font-medium mb-1">טיפ לחיסכון</div>
                  <div className="text-sm text-gray-700">
                    שקול להקצות 10% לחיסכון בכל חודש
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