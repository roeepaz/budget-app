import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 
import { useUserData } from '../hooks/useUserData';

import Sidebar from '../components/Sidebar';
import { Dialog } from '@headlessui/react';
import FeedbackForm from '../components/FeedbackForm';
import { MessageSquare } from 'lucide-react';
import FullPageError from '../components/FullPageError';
import GaugeChart from 'react-gauge-chart';
import { 
  DollarSign, 
  Menu, 
  X, 
  Home, 
  PieChart as PieIcon, 
  TrendingUp, 
  Calculator,
  LogOut,
  AlertCircle,
  Target,
  ArrowDownCircle,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';


// רכיב מד התקדמות קטן לקטגוריות
const CategoryProgressBar = ({ percentage, spent, budget, isOverBudget }) => {
  // בדיקות בטיחות בסיסיות
  const safePercentage = typeof percentage === 'number' && !isNaN(percentage) ? percentage : 0;
  const safeSpent = typeof spent === 'number' && !isNaN(spent) && spent >= 0 ? spent : 0;
  const safeBudget = typeof budget === 'number' && !isNaN(budget) && budget > 0 ? budget : 0;
  const safeIsOverBudget = Boolean(isOverBudget);
  
  // חישוב מחדש של האחוז על בסיס נתונים בטוחים
  const calculatedPercentage = safeBudget > 0 ? (safeSpent / safeBudget) * 100 : 0;
  const finalPercentage = Math.max(safePercentage, calculatedPercentage);
  
  // הגבלת האחוז לטווח סביר (0-150% למקרה של חריגה)
  const cappedPercentage = Math.min(Math.max(finalPercentage, 0), 150);
  const displayPercentage = Math.min(cappedPercentage, 100); // להצגה בבר
  
  // קביעת צבע הבר עם לוגיקה משופרת
  const getBarColor = () => {
    if (safeIsOverBudget || finalPercentage > 100) return 'bg-red-500';
    if (finalPercentage >= 95) return 'bg-orange-600';
    if (finalPercentage >= 80) return 'bg-orange-500';
    if (finalPercentage >= 60) return 'bg-yellow-500';
    if (finalPercentage >= 0) return 'bg-green-500';
    return 'bg-gray-400'; // fallback
  };

  // קביעת טקסט הסטטוס
  const getStatusText = () => {
    if (safeBudget <= 0) return 'ללא תקציב מוגדר';
    if (safeSpent <= 0) return 'טרם נוצל';
    if (safeIsOverBudget || finalPercentage > 100) {
      const overage = safeSpent - safeBudget;
      return `חריגה: +₪${overage.toLocaleString()}`;
    }
    if (finalPercentage >= 95) return 'כמעט מלא';
    if (finalPercentage >= 80) return 'מתקרב למלא';
    return `${Math.round(finalPercentage)}% נוצל`;
  };

  // בדיקה אם להציג את הבר
  const showBar = safeBudget > 0 && safeSpent >= 0;
  
  // בדיקה אם יש נתונים תקינים להצגה
  const hasValidData = safeBudget > 0 || safeSpent > 0;

  if (!hasValidData) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="text-xs text-gray-400 italic">אין נתונים להצגה</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      {showBar ? (
        <>
          {/* הבר עצמו */}
          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-0">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getBarColor()}`}
              style={{ 
                width: `${displayPercentage}%`,
                minWidth: safeSpent > 0 ? '2px' : '0px' // מינימום רוחב כדי שיהיה נראה
              }}
            />
          </div>
          
          {/* טקסט סטטוס */}
          <div className={`text-xs font-medium whitespace-nowrap ${
            safeIsOverBudget || finalPercentage > 100 
              ? 'text-red-600' 
              : finalPercentage >= 80 
                ? 'text-orange-600' 
                : 'text-gray-600'
          }`}>
            {getStatusText()}
          </div>
        </>
      ) : (
        /* במקרה שאין תקציב אבל יש הוצאה */
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-blue-400 h-2 rounded-full w-2 transition-all duration-500" />
          </div>
          <div className="text-xs text-gray-500 italic whitespace-nowrap">
            {safeSpent > 0 ? `₪${safeSpent.toLocaleString()} - ${getStatusText()}` : 'ללא פעילות'}
          </div>
        </div>
      )}
    </div>
  );
};;

export default function HomePage({ user }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const {
    categories,
    expenses,
    debts,
    goals,
    loading,
    addExpenseToDB,
    userFatalError
  } = useUserData(user?.uid);
  
    const currentMonthExpenses = expenses.filter(exp => {
      const d = new Date(exp.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  const totalExpensesThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);


  useEffect(() => {
    if (!loading && categories.length === 0 && !userFatalError) {
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
      showErrorDialog('בעיה ביציאה', 'לא הצלחנו לבצע את תהליך היציאה. נסה שוב בעוד רגע.', 'error');
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
  const avgDailySpend = day > 0 ? totalSpent / day : 0;
  const projectedEndOfMonth = avgDailySpend * daysInMonth;

  const insights = [];

  if (projectedEndOfMonth > totalBudget) {
    insights.push({
      icon: <TrendingUp className="text-red-600" />,
      text: `⚠️ בקצב ההוצאות הנוכחי תחרוג ב־₪${Math.round(projectedEndOfMonth - totalBudget)} עד סוף החודש.`
    });
  }

  if (percentUsed > 100) {
    insights.push({
      icon: <AlertCircle className="text-red-500" />,
      text: 'חריגה מהתקציב! חשוב לבדוק את הקטגוריות החריגות.'
    });
  }

  if (monthProgress < 50 && percentUsed > 60) {
    insights.push({
      icon: <TrendingUp className="text-orange-500" />,
      text: 'קצב ההוצאות גבוה יחסית לשלב זה של החודש.'
    });
  }

  if (monthProgress > 50 && percentUsed < 50) {
    insights.push({
      icon: <ArrowDownCircle className="text-green-500" />,
      text: '💰 אתה מתנהל באחריות – ההוצאות שלך נמוכות יחסית.'
    });
  }

  const hasZeroBudget = categories.concat(goals, debts).some(c => (c.budget || 0) === 0);
  if (hasZeroBudget) {
    insights.push({
      icon: <AlertCircle className="text-yellow-500" />,
      text: 'יש קטגוריות ללא תקציב מוגדר – זה עלול להוביל להפתעות לא צפויות.'
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: <DollarSign className="text-blue-500" />,
      text: 'התקציב שלך מאוזן נכון לעכשיו. המשך כך! 🎯'
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
const monthlySavingsTotal = expenses
  .filter(exp => {
    const d = new Date(exp.date);
    const isThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    const category = categories.find(c => String(c.id) === String(exp.categoryId));
    return isThisMonth && category?.tag === 'savings';
  })
  .reduce((sum, exp) => sum + exp.amount, 0);


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
if(userFatalError){
    return(
    <FullPageError
      title={userFatalError.title}
      description={userFatalError.description}
      severity={userFatalError.severity}
    />
    )
  }
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 from-blue-50 to-purple-50 relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-300"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-700"></div>
      </div>
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

          {/* כותרת אישית */}
          <div className="text-center mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-1">שלום, {user.displayName} 👋</h1>
            <p className="text-gray-600 text-base">זה מצב התקציב שלך לחודש הנוכחי</p>
            {!sidebarOpen && (
              <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-30 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                משוב
              </button>
            )}

     {/* מודל המשוב */}
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed z-50 inset-0">
      {/* הצללה אחורית */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      {/* תוכן המודל במרכז המסך */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden z-10">
          <div className="p-4 flex justify-between items-center border-b">
            <h3 className="text-lg font-bold">משוב למערכת</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500 text-sm">
              ✖ סגור
            </button>
          </div>
          <div className="p-6">
            <FeedbackForm />
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>

    </div>

    {/* כרטיסי סיכום */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-center">
      {/* הוצאות חודשיות */}
      <div className="bg-white rounded-xl shadow p-4">
        <p className="text-sm text-gray-500">סה"כ הוצאות החודש</p>
        <p className="text-2xl font-bold text-red-500">₪{monthlyExpenses.toLocaleString()}</p>
      </div>

      {/* יתרה / חריגה */}
      <div className="bg-white rounded-xl shadow p-4">
        <p className="text-sm text-gray-500">מצב התקציב</p>

        {totalSpent <= totalBudget ? (
          <p className="text-2xl font-bold text-green-600">
            נותרו ₪{(totalBudget - totalSpent).toLocaleString()}
          </p>
        ) : (
          <p className="text-2xl font-bold text-red-600">
            חריגה של ₪{(totalSpent - totalBudget).toLocaleString()} מהתקציב!
          </p>
        )}
      </div>
      {/* חסכון חודשי */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-500">חיסכון החודש</p>

        <p className="text-2xl font-bold text-green-600 mt-1">
          ₪{monthlySavingsTotal.toLocaleString()}
        </p>

        {totalBudget > 0 && monthlySavingsTotal / totalBudget < 0.1 && (
          <p className="text-xs text-yellow-500 mt-1">
            כדאי לשקול להגדיל את הסכום שמועבר לחיסכון 🙏
          </p>
        )}
      </div>
    </div>

    {/* מד התקציב החודשי */}
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center mb-5">
      <GaugeChart 
        id="budget-gauge"
        nrOfLevels={30}
        colors={['#10B981', '#F59E0B', '#EF4444']}
        arcWidth={0.3}
        percent={budgetUsedPercentage / 100}
        textColor="#374151"
        needleColor="#111827"
        formatTextValue={() => `${budgetUsedPercentage.toFixed(0)}%`}
        style={{ width: '200px', maxWidth: '100%' }}
      />

      
    </div>


          {/* תרשימים ונתונים נוספים */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/*תרשים קטגוריות משופר עם טיפול במקרי קצה*/}
<div className="bg-white rounded-xl shadow-lg p-6">
  {/* כותרת מתוקנת */}
  <div className="mb-6">
    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
      <PieIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
      <span>הוצאות לפי קטגוריות</span>
    </h3>
    
    {/* מידע נוסף אם נחוץ */}
    {categoriesWithExpenses?.length > 0 && (
      <p className="text-sm text-gray-500">
        {categoriesWithExpenses.length} קטגוריות פעילות השבוע
      </p>
    )}
  </div>

  {/* תוכן עיקרי */}
  <div className="space-y-4">
    {/* מקרה: אין נתונים כלל */}
    {(!displayCategories || displayCategories.length === 0) ? (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PieIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-lg font-medium mb-2">עדיין לא הוספת קטגוריות</p>
        <p className="text-gray-400 text-sm">הוסף הוצאה ראשונה כדי לראות את התרשים</p>
      </div>
    ) : (!categoriesWithExpenses || categoriesWithExpenses.length === 0) ? (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <PieIcon className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-gray-600 text-lg font-medium mb-2">אין הוצאות השבוע</p>
        <p className="text-gray-400 text-sm">הוסף הוצאה ראשונה כדי לראות את החלוקה לפי קטגוריות</p>
      </div>
    ) : (
      /* הצגת קטגוריות */
      <>
        <div className="space-y-6">
          {(showAllCategories ? categoriesWithExpenses : categoriesWithExpenses.slice(0, 5)).map((category, index) => {
            // בדיקות בטיחות
            const safeTotal = Math.max(0, Number(category.total) || 0);
            const safeBudget = category.budget && Number(category.budget) > 0 ? Number(category.budget) : null;
            const safeRemaining = Number(category.remaining) || 0;
            const isOnThePeni = safeRemaining == 0;
            const percentOfBudget = safeBudget ? Math.min((safeTotal / safeBudget) * 100, 150) : 0;
            const hasBudget = safeBudget !== null;
            const isOverBudget = hasBudget && safeRemaining < 0;
            const isNearlyExhausted =!isOnThePeni && hasBudget && safeRemaining >= 0 && safeRemaining <= 50;

            return (
              <div 
                key={category.id || `category-${index}`} 
                className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
              >
                {/* שורת מידע עליונה */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white"
                      style={{ backgroundColor: category.color || '#6B7280' }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-800 text-base truncate">
                        {category.name || 'קטגוריה ללא שם'}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        ₪{safeTotal.toLocaleString('he-IL')}
                        {hasBudget && (
                          <span className="text-gray-400">
                            {' / '}₪{safeBudget.toLocaleString('he-IL')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* סטטוס */}
                  <div className="flex-shrink-0 text-left">
                    {isOverBudget ? (
                      <div className="text-red-600 font-semibold text-sm">
                        <span className="block">חריגה</span>
                        <span className="block text-xs">
                          +₪{Math.abs(safeRemaining).toLocaleString('he-IL')}
                        </span>
                      </div>
                    ) : isNearlyExhausted ? (
                      <div className="text-orange-600 font-medium text-sm">
                        <span className="block">כמעט נגמר</span>
                        <span className="block text-xs text-gray-500">
                          ₪{safeRemaining.toLocaleString('he-IL')} נותרו
                        </span>
                      </div>
                    ) : hasBudget && safeRemaining > 0 ? (
                      <div className="text-green-600 font-medium text-sm">
                        <span className="block">בתקציב</span>
                        <span className="block text-xs text-gray-500">
                          ₪{safeRemaining.toLocaleString('he-IL')} נותרו
                        </span>
                      </div>
                    ) : isOnThePeni ? (
                      <div className="text-gray-500 text-sm">
                        <span className="block">מדויק</span>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        <span className="block">ללא תקציב</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* בר התקדמות */}
                {hasBudget && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>0%</span>
                        <span className="text-lg font-bold text-black-1800">{Math.round(percentOfBudget)}%</span>
                      <span>100%</span>
                    </div>
                    
                   <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ease-out ${
                        isOverBudget || percentOfBudget === 100
                          ? 'bg-red-500'
                          : percentOfBudget >= 90
                            ? 'bg-orange-500'
                            : percentOfBudget >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(percentOfBudget, 100)}%`,
                        minWidth: safeTotal > 0 ? '4px' : '0px'
                      }}
                    />
                  </div>
                    {isOverBudget && (
                      <div className="text-xs text-red-600 font-medium text-center bg-red-50 rounded py-1">
                        חריגה של {Math.round(percentOfBudget - 100)}% מהתקציב
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* כפתור הצגת עוד */}
        {categoriesWithExpenses.length > 5 && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="w-full py-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 
                       text-sm font-medium transition-all duration-200 rounded-lg
                       border border-blue-200 hover:border-blue-300"
            >
              {showAllCategories 
                ? '🔼 הצג פחות קטגוריות' 
                : `🔽 הצג עוד ${categoriesWithExpenses.length - 5} קטגוריות`
              }
            </button>
          </div>
        )}
      </>
    )}
  </div>
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