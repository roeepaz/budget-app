import { useState, useEffect } from 'react';
import { ChevronLeft, PlusCircle, TrendingUp, AlertCircle, ArrowUpCircle, ArrowDownCircle, DollarSign, Percent } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function BudgetPlanner({ user }) {
    const navigate = useNavigate();

  // Sample data - in a real app, this would come from your backend
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [userDebts, setUserDebts] = useState([]);
  const [userSavingsGoals, setUserSavingsGoals] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [editingId, setEditingId] = useState(null);
  const [editBudget, setEditBudget] = useState('');

  // Calculate total budget and spending
  const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0);
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const now = new Date();
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const monthProgress = Math.floor((now.getDate() / daysInMonth) * 100);

  const userId = user?.uid;
const [loading, setLoading] = useState(true);
const [hasLoaded, setHasLoaded] = useState(false); // דגל לקריאה שהסתיימה

useEffect(() => {
  if (!userId) return;

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Fetch categories and expenses from 'users/{userId}'
      const userDocRef = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDocRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const loadedExpenses = userData.expenses || [];
        const loadedCategories = userData.categories || [];

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
        const updatedCategories = loadedCategories.map(cat => ({
          ...cat,
          budget: cat.budget || 0,
          spent: expensesByCategory[cat.id] || 0,
        }));
        setExpenses(loadedExpenses);
        setCategories(updatedCategories);
      }

      // Fetch debts and savingsGoals from 'financial_data/{userId}'
      const financialDataRef = doc(db, 'financial_data', userId);
      const financialSnapshot = await getDoc(financialDataRef);
      if (financialSnapshot.exists()) {
        const financialData = financialSnapshot.data();
        setUserDebts(financialData.debts || []);
        // Convert Firestore Timestamps to Date objects for savingsGoals
        const loadedGoals = (financialData.goals || []).map(goal => ({
          ...goal,
          targetDate: goal.targetDate && goal.targetDate.toDate ? goal.targetDate.toDate() : (goal.targetDate ? new Date(goal.targetDate) : new Date()),
        }));
        setUserSavingsGoals(loadedGoals);
      } else {
        setUserDebts([]);
        setUserSavingsGoals([]);
      }

    } catch (error) {
      console.error("⚠️ שגיאה בטעינת הנתונים:", error);
      // Set to empty arrays in case of error to avoid render issues
      setExpenses([]);
      setCategories([]);
      setUserDebts([]);
      setUserSavingsGoals([]);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  };

  loadUserData();
}, [userId]);

  
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
const formatCategoryCount = (count) => {
  if (count === 1) return 'קטגוריה אחת';
  if (count === 2) return 'שתי קטגוריות';
  return `${count} קטגוריות`;
};

  const generateInsights = () => {
  if (totalBudget === 0) return [];

  const insights = [];

  const overBudgetCategories = categories.filter(cat => cat.spent > cat.budget);
  const closeToLimitCategories = categories.filter(
    cat => cat.spent >= cat.budget * 0.8 && cat.spent < cat.budget
  );

  if (overBudgetCategories.length > 0) {
  const names = overBudgetCategories.slice(0, 3).map(c => c.name).join(', ');
  const countText = formatCategoryCount(overBudgetCategories.length, 'קטגורי');
  insights.push({
    type: 'warning',
    icon: <AlertCircle className="text-red-500" />,
    text: `${countText} חרגו מהתקציב: ${names}${overBudgetCategories.length > 3 ? ' ועוד' : ''}`,
  });
}


 if (closeToLimitCategories.length > 0) {
  const names = closeToLimitCategories.slice(0, 3).map(c => c.name).join(', ');
  const countText = formatCategoryCount(closeToLimitCategories.length, 'קטגורי');
  insights.push({
    type: 'alert',
    icon: <AlertCircle className="text-amber-500" />,
    text: `${countText} מתקרבות למגבלת התקציב: ${names}${closeToLimitCategories.length > 3 ? ' ועוד' : ''}`,
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
  const startEdit = (id, currentBudget) => {
    setEditingId(id);
    setEditBudget(currentBudget.toString());
  };

  const saveEdit = () => {
    const budget = parseFloat(editBudget);
    if (!isNaN(budget)) {
      setCategories(categories.map(cat => 
        cat.id === editingId ? {...cat, budget: budget} : cat
      ));
      setEditingId(null);
    }
  };
const hebrewMonthYear = new Date().toLocaleDateString('he-IL', {
  year: 'numeric',
  month: 'long'
});

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-6">
       <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
         🎯 <span className="text-yellow-500">מתכנן התקציב החכם</span>
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
              <h2 className="text-lg font-semibold text-gray-700">סיכום תקציב חודשי</h2>
              <div className="text-sm text-gray-500 text-right">{hebrewMonthYear}</div>

            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
            <h3 className="font-medium mb-3 text-gray-700">תובנות מהירות</h3>
            {insights.slice(0, 2).map((insight, index) => (
              <div key={index} className="flex items-start mb-2 text-gray-600">
                <div className="ml-2 rtl:mr-2 rtl:ml-0">{insight.icon}</div>
                <div className="text-sm">{insight.text}</div>
              </div>
            ))}
          </div>

          {/* Savings Goal Contributions Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">💰 מטרות חיסכון פעילות</h2>
            {userSavingsGoals.length > 0 ? (
              <div className="space-y-3">
                {userSavingsGoals.map(goal => (
                  <div key={goal.id} className="bg-green-50 p-3 rounded-lg shadow-sm">
                    <div className="font-medium text-green-700">{goal.name}</div>
                    <div className="text-sm text-gray-600">
                      הקצאה חודשית: ₪{(goal.userAllocatedContribution ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">
                      התקדמות: ₪{(goal.currentAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₪{goal.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {goal.targetDate && (
                       <div className="text-xs text-gray-500">
                         יעד: {new Date(goal.targetDate).toLocaleDateString('he-IL')}
                       </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">אין מטרות חיסכון שהוגדרו ביועץ התקציב.</p>
            )}
          </div>

          {/* Debt Payments Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">💳 תשלומי חובות חודשיים</h2>
            {userDebts.length > 0 ? (
              <div className="space-y-3">
                {userDebts.map(debt => (
                  <div key={debt.id} className="bg-red-50 p-3 rounded-lg shadow-sm">
                    <div className="font-medium text-red-700">{debt.name}</div>
                    <div className="text-sm text-gray-600">
                      תשלום חודשי מתוכנן: ₪{(debt.userAllocatedPayment ?? debt.minPayment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">
                      יתרת קרן: ₪{debt.principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {debt.annualRate !== undefined && (
                       <div className="text-xs text-gray-500">
                         ריבית שנתית: {(debt.annualRate * 100).toFixed(1)}%
                       </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">אין חובות שהוגדרו ביועץ התקציב.</p>
            )}
          </div>
        </div>
      )}
      
      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">תקציב לפי קטגוריה</h2>
            
          </div>
          
          
          {/* Categories List */}
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="text-xl ml-2 rtl:mr-2 rtl:ml-0">{category.icon}</span>
                    <span className="font-medium text-gray-800">{category.name}</span>
                  </div>
                  {editingId === category.id ? (
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        className="w-24 p-1 border border-gray-300 rounded-md text-sm ml-2 rtl:mr-2 rtl:ml-0"
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                      />
                      <button 
                        className="text-blue-600 text-sm hover:text-blue-800"
                        onClick={saveEdit}
                      >
                        שמור
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="text-sm text-gray-500"
                      onClick={() => startEdit(category.id, category.budget)}
                    >
                      עריכה
                    </button>
                  )}
                </div>
                
               <div className="flex justify-between text-sm text-gray-500 mb-1">
                <div>₪{category.spent.toFixed(2)} / ₪{category.budget.toFixed(2)}</div>
                <div>
                    {category.budget > 0 
                    ? `${Math.round((category.spent / category.budget) * 100)}%`
                    : '—'}
                </div>
                </div>

               <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full ${
                        category.spent > category.budget
                            ? 'bg-red-600'
                            : category.spent > category.budget * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                        width: category.budget > 0 
                            ? `${Math.min((category.spent / category.budget) * 100, 100)}%` 
                            : '0%',
                        minWidth: category.spent > 0 ? '4px' : '0px'
                        }}
                    ></div>
                </div>

                
                <div className="mt-2 text-sm">
                  <span className="font-medium">
                    נותר: ₪{(category.budget - category.spent).toFixed(2)}
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
                <div className="ml-3 rtl:mr-3 rtl:ml-0">{insight.icon}</div>
                  <div>
                  <div className="font-medium mb-1 text-gray-800">
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
            <div className="border-r-4 rtl:border-l-4 rtl:border-r-0 border-green-500 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start">
                <div className="ml-3 rtl:mr-3 rtl:ml-0"><TrendingUp className="text-green-500" /></div>
                <div>
                  <div className="font-medium mb-1 text-gray-800">טיפ לחיסכון</div>
                  <div className="text-sm text-gray-700">
                    שקול להקצות 10% לחיסכון בכל חודש. בדוק את 'יועץ התקציב החכם' לקבלת המלצות נוספות.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}