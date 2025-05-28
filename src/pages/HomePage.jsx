import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // או הנתיב שלך
import QuickAddExpenseButton from '../components/QuickAddExpenseButton';
import { useUserData } from '../hooks/useUserData';
import { 
  DollarSign, 
  Menu, 
  X, 
  Home, 
  PieChart as PieIcon, 
  TrendingUp, 
  Calculator,
  LogOut,
  Wallet,
  Target,
  CreditCard,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { AlertCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
export default function HomePage({ user }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const {
    categories,
    expenses,
    debts,
    goals,
    loading,
    addExpenseToDB
  } = useUserData(user?.uid);
  
    const currentMonthExpenses = expenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
const totalExpensesThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  useEffect(() => {
    if (!loading && categories.length === 0) {
      navigate('/landing');
    }
  }, [loading, categories, navigate]);


useEffect(() => {
  if (!user || loading) return;

  const checkOnboarding = async () => {
    const ref = doc(db, 'income_update', user.uid);
    const snap = await getDoc(ref);
    const data = snap.data() || {};

    const step = data.onboardingStep || 'landing';
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    if (step === 'landing') {
      navigate('/landing');
    } else if (step === 'income') {
      navigate('/monthlyIncome', { state: { isNewUser: true } });
    } else if (data.lastIncomeMonth !== currentMonth) {
      navigate('/monthlyIncome', { state: { isNewUser: false } });
    }
  };

  checkOnboarding();
}, [user, loading]);



  const handleLogout = () => {
    signOut(auth)
      .then(() => navigate('/'))
      .catch((error) => {
        console.error('Logout failed:', error);
        alert('אירעה שגיאה ביציאה מהמערכת');
      });
  };

  const tags = ['need', 'want', 'debt', 'emergency', 'goal', 'savings'];
  
  const tagColors = {
    need: '#3B82F6',
    want: '#10B981',
    debt: '#F59E0B',
    emergency: '#FF6384',
    goal: '#8B5CF6',
    savings: '#36A2EB'
  };

  const displayCategories = [
    ...categories,
    ...debts.map(d => ({
      id: `debt-${d.id}`,
      name: d.name,
      color: tagColors.debt,
      icon: '💳',
      tag: 'debt',
      budget: d.budget ?? 0
    })),
    ...goals.map(g => ({
      id: `goal-${g.id}`,
      name: g.name,
      color: tagColors.goal,
      icon: '🎯',
      tag: 'goal',
      budget: g.budget ?? 0
    }))
  ];

  // חישוב סטטיסטיקות
const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const now = new Date();
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
  }).reduce((sum, exp) => sum + exp.amount, 0);

  const totalDebts = debts.reduce((sum, debt) => sum + (debt.principal || 0), 0);
  const totalGoals = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const goalsProgress = goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);

const totalCategoryBudget = categories.reduce((sum, c) => sum + (c.budget || 0), 0);
const totalGoalBudget = goals.reduce((sum, g) => sum + (g.budget || 0), 0);
const totalDebtBudget = debts.reduce((sum, d) => sum + (d.budget || 0), 0);

const totalBudget = totalCategoryBudget + totalGoalBudget + totalDebtBudget;
const totalSpent = monthlyExpenses;
const budgetUsedPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;


const generateQuickInsights = () => {
  if (!categories || !expenses) return [];
  
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = now.getDate();
  const monthProgress = Math.floor((day / daysInMonth) * 100);
  
  const totalBudget = [...categories, ...debts, ...goals].reduce(
    (sum, item) => sum + (item.budget || 0), 0
  );
  const totalSpent = expenses
  .filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === month && d.getFullYear() === year;
  })
  .reduce((sum, e) => sum + e.amount, 0);
  
  const percentUsed = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
  

  const insights = [];
  
  if (percentUsed > 100) {
    insights.push({
      icon: <AlertCircle className="text-red-500" />,
      text: 'חרגת מהתקציב החודשי. כדאי לבדוק את הקטגוריות.'
    });
  } else if (monthProgress < 50 && percentUsed > 60) {
    insights.push({
      icon: <TrendingUp className="text-orange-500" />,
      text: 'קצב ההוצאות גבוה יחסית לתחילת החודש.'
    });
  } else if (monthProgress > 80 && percentUsed < 70) {
    insights.push({
      icon: <ArrowDownCircle className="text-green-500" />,
      text: 'אתה חוסך יותר מהצפוי – מעולה!'
    });
  } else {
    insights.push({
      icon: <DollarSign className="text-blue-500" />,
      text: 'התקציב שלך מאוזן נכון לעכשיו.'
    });
  }
  
  return insights;
};
const getCategoryBudgetAlerts = () => {
  const items = [
    ...categories.map(c => ({
      name: c.name,
      spent: expenses
      .filter(e => String(e.categoryId) === String(c.id))
      .reduce((sum, e) => sum + e.amount, 0),
      budget: c.budget || 0,
    })),
    ...goals.map(g => ({
      name: g.name,
      spent: expenses
      .filter(e => String(e.categoryId) === `goal-${g.id}`)
      .reduce((sum, e) => sum + e.amount, 0),
      budget: g.budget || 0,
    })),
    ...debts.map(d => ({
      name: d.name,
      spent: expenses
      .filter(e => String(e.categoryId) === `debt-${d.id}`)
      .reduce((sum, e) => sum + e.amount, 0),
      budget: d.budget || 0,
    })),
  ];
  
  const overLimit = items.filter(i => i.budget > 0 && i.spent > i.budget);
  const nearLimit = items.filter(
    i => i.budget > 0 && i.spent >= 0.8 * i.budget && i.spent <= i.budget
  );

  return { overLimit, nearLimit };
};
const categoriesWithExpenses = displayCategories.map(category => {
  const categoryExpenses = currentMonthExpenses
    .filter(exp => String(exp.categoryId) === String(category.id))
    .reduce((sum, exp) => sum + exp.amount, 0);

  const categoryBudget = category.budget ?? 0;
  const remaining = categoryBudget - categoryExpenses;
  const overBudget = remaining < 0;

  return {
    ...category,
    total: categoryExpenses,
    percentage: totalExpensesThisMonth
      ? (categoryExpenses / totalExpensesThisMonth) * 100
      : 0,
    remaining,
    overBudget
  };
}).sort((a, b) => b.total - a.total);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 flex items-center justify-center from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">🚀 טוען נתונים…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 from-blue-50 to-purple-50 relative">
      {/* כפתור תפריט במובייל */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 p-3 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Overlay למובייל */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        displayCategories={displayCategories}
        addExpenseToDB={addExpenseToDB}
      />
      {/* תוכן עיקרי */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-8 pt-20 lg:pt-8">
          {/* כותרת עיקרית */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
  <img
    //src={logo} // if you used import
     src="/logo.png" // if placed in public folder
    alt="Kesefy Logo"
    className="w-32 h-auto rounded-xl shadow-md"
  />
</div>

            <h1 className="text-3xl lg:text-5xl font-extrabold text-gray-800 mb-2">
              לוח הבקרה שלך
            </h1>
            <p className="text-gray-600 text-base lg:text-lg">באהבה מרועי פז 🎓</p>
          </div>

          {/* כרטיסי סיכום */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 mb-8" dir="rtl">
            {/* הוצאות חודשיות */}
            <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 border-r-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">הוצאות החודש</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-800">₪{monthlyExpenses.toLocaleString()}</p>
                </div>
                <div className="p-2 lg:p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* ניצול תקציב */}
            <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 border-r-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">ניצול תקציב</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-800">
                    {budgetUsedPercentage}%
                  </p>
                  <p className={`text-xs mt-1 ${totalSpent > totalBudget ? 'text-red-600' : 'text-gray-500'}`}>
                    {totalSpent > totalBudget
                      ? `חריגה של ₪${(totalSpent - totalBudget).toFixed(2)}`
                      : `נותרו ₪${(totalBudget - totalSpent).toFixed(2)} לניצול`}
                  </p>
                </div>
                <div className="p-2 lg:p-3 bg-green-100 rounded-lg">
                  <Wallet className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* חובות */}
            <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 border-r-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">חובות</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-800">
                    {totalDebts > 0 ? `₪${totalDebts.toLocaleString()}` : 'אין חובות'}
                  </p>
                </div>
                <div className="p-2 lg:p-3 bg-orange-100 rounded-lg">
                  <CreditCard className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
                </div>
              </div>
            </div>

          </div>

          {/* תרשימים ונתונים נוספים */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* הוצאות לפי קטגוריות */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PieIcon className="w-6 h-6 text-blue-600" />
              הוצאות לפי קטגוריות
            </h3>
            {displayCategories.length > 0 ? (
              <div className="space-y-3">
                {(showAllCategories ? categoriesWithExpenses : categoriesWithExpenses.slice(0, 5)).map(category => (
                  <div key={category.id} className="flex items-center justify-between flex-col sm:flex-row gap-1 sm:gap-0">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="text-gray-700 font-medium text-sm lg:text-base">
                        {category.name}
                      </span>
                    </div>

                    <div className="text-left">
                      <div className="text-sm lg:text-base font-bold text-gray-800">
                        ₪{category.total.toLocaleString()} <span className="text-xs text-gray-500">({category.percentage.toFixed(1)}%)</span>
                      </div>

                      {category.budget !== undefined && typeof category.remaining === 'number' && (
                        <div className={`text-xs lg:text-sm mt-1 ${category.overBudget ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {category.overBudget
                            ? `חריגה של ₪${Math.abs(category.remaining).toLocaleString()} מהתקציב`
                            : `נותרו ₪${category.remaining.toLocaleString()} בתקציב`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {categoriesWithExpenses.length > 5 && (
                  <button
                    className="text-sm text-blue-600 hover:underline mt-2"
                    onClick={() => setShowAllCategories(prev => !prev)}
                  >
                    {showAllCategories ? 'הצג פחות' : 'הצג עוד'}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">עדיין לא הוגדרו קטגוריות</p>
            )}

          </div>

            {/* יעדים פעילים */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-purple-600" />
                יעדים פעילים
              </h3>
              {goals.length > 0 ? (
                <div className="space-y-4">
                  {goals.slice(0, 3).map((goal) => {
                    const progress = goal.currentAmount || 0;
                    const percentage = (progress / goal.targetAmount) * 100;
                    
                    return (
                      <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-800 text-sm lg:text-base">{goal.name}</h4>
                          <span className="text-xs lg:text-sm text-gray-600">
                            ₪{progress.toLocaleString()} / ₪{goal.targetAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs lg:text-sm text-gray-600 mt-1">{percentage.toFixed(1)}% הושלם</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">עדיין לא הוגדרו יעדים</p>
              )}
            </div>
          </div>
      {/* התראות קטגוריה */}
      <div className="mt-6 border border-yellow-300 bg-yellow-50 rounded-xl p-5 shadow-sm">
        <h3 className="text-md font-bold text-yellow-800 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          התראות קטגוריה
        </h3>

        <ul className="space-y-2 text-sm">
          {getCategoryBudgetAlerts().overLimit.map((item, i) => (
            <li key={`over-${i}`} className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>
                <span className="font-semibold">חריגה:</span> "{item.name}" חרגה מהתקציב שלה
              </span>
            </li>
          ))}

          {getCategoryBudgetAlerts().nearLimit.map((item, i) => (
            <li key={`near-${i}`} className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              <span>
                <span className="font-semibold">התראה:</span> "{item.name}" מתקרבת לקצה התקציב
              </span>
            </li>
          ))}

          {getCategoryBudgetAlerts().overLimit.length === 0 && 
          getCategoryBudgetAlerts().nearLimit.length === 0 && (
            <li className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              כל הקטגוריות עומדות בתקציב החודשי 🎯
            </li>
          )}
        </ul>
      </div>

          {/* תובנות תקציביות */} 
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              תובנות החודש
            </h3>
            <ul className="text-gray-700 text-sm space-y-2">
              {generateQuickInsights().map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>{insight.icon}</span>
                  <span>{insight.text}</span>
                </li>
              ))}
            </ul>
          </div>


          {/* טיפים והתראות */}
          {(totalDebts > 0 || monthlyExpenses > totalExpenses * 0.3) && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 lg:p-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                התראות פיננסיות
              </h3>
              <div className="space-y-2 text-yellow-700 text-sm lg:text-base">
                {totalDebts > 0 && (
                  <p>• יש לך חובות בסך ₪{totalDebts.toLocaleString()} - כדאי לתכנן החזרה</p>
                )}
                {monthlyExpenses > totalExpenses * 0.3 && (
                  <p>• ההוצאות החודשיות גבוהות יחסית - כדאי לבדוק את התקציב</p>
                )}
              </div>
            </div>
          )}
          {budgetUsedPercentage > 100 && (
              <p className="text-sm text-red-600 mt-1">חריגה מהתקציב! 😬</p>
            )}
        </div>
      </div>
    </div>
  );
}