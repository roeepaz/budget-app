import React, { useState, useMemo } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  Target, 
  PiggyBank, 
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Calendar,
  DollarSign,
  Shield,
  Zap
} from 'lucide-react';

const SmartFinancialTips = ({ categories, goals, debts, expenses }) => {
  const [selectedTip, setSelectedTip] = useState(null);

  // חישובים בסיסיים
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const monthProgress = (dayOfMonth / daysInMonth) * 100;

  const currentMonthExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalMonthlyExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalBudget = [...categories, ...goals, ...debts].reduce((sum, item) => sum + (item.budget || 0), 0);

  // טיפים חכמים מבוססי נתונים
  const smartTips = useMemo(() => {
    const tips = [];
    
    // חישובי בסיס
    const regularCategories = categories.filter(c => !['savings', 'goal', 'debt'].includes(c.tag));
    const savingsCategories = categories.filter(c => c.tag === 'savings');
    
    const regularBudget = regularCategories.reduce((sum, c) => sum + (c.budget || 0), 0);
    const savingsBudget = savingsCategories.reduce((sum, c) => sum + (c.budget || 0), 0);
    
    const regularSpent = currentMonthExpenses
      .filter(exp => regularCategories.some(c => String(c.id) === String(exp.categoryId)))
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    const savingsSpent = currentMonthExpenses
      .filter(exp => savingsCategories.some(c => String(c.id) === String(exp.categoryId)))
      .reduce((sum, exp) => sum + exp.amount, 0);

    const avgDailySpend = dayOfMonth > 0 ? totalMonthlyExpenses / dayOfMonth : 0;
    const projectedMonthEnd = avgDailySpend * daysInMonth;

    // טיפ 1: ניהול קצב הוצאות
    if (monthProgress < 50 && (regularSpent / regularBudget) > 0.6) {
      tips.push({
        id: 'pace_control',
        type: 'warning',
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'שלט בקצב ההוצאות',
        description: 'אתה מוציא יותר מדי מהר השבוע - נסה להאט',
        details: [
          `ב-${Math.round(monthProgress)}% מהחודש כבר הוצאת ${Math.round((regularSpent / regularBudget) * 100)}% מהתקציב הרגיל`,
          'המלצה: נסה "יום ללא הוצאות" פעמיים השבוע',
          'טיפ: תכנן רכישות מראש במקום לקנות באופן ספונטני'
        ],
        actionable: true,
        priority: 'high'
      });
    }

    // טיפ 2: חיסכון אוטומטי
    if (savingsSpent < savingsBudget * 0.5 && monthProgress > 60) {
      tips.push({
        id: 'auto_savings',
        type: 'opportunity',
        icon: <PiggyBank className="w-5 h-5" />,
        title: 'הגדר חיסכון אוטומטי',
        description: 'אתה מפגר ביעדי החיסכון - הפוך את זה לאוטומטי',
        details: [
          `חיסכת רק ₪${savingsSpent.toLocaleString()} מתוך יעד של ₪${savingsBudget.toLocaleString()}`,
          'המלצה: הגדר העברה אוטומטית לחיסכון ב-1 לחודש',
          'טיפ: חיסכון של 10% מהכנסה זה כלל אצבע טוב'
        ],
        actionable: true,
        priority: 'medium'
      });
    }

    // טיפ 3: אופטימיזציה של קטגוריות
    const expensiveCategories = regularCategories
      .map(cat => ({
        ...cat,
        spent: currentMonthExpenses
          .filter(exp => String(exp.categoryId) === String(cat.id))
          .reduce((sum, exp) => sum + exp.amount, 0)
      }))
      .filter(cat => cat.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 2);

    if (expensiveCategories.length > 0) {
      const topCategory = expensiveCategories[0];
      tips.push({
        id: 'category_optimization',
        type: 'insight',
        icon: <Target className="w-5 h-5" />,
        title: `שים עין על "${topCategory.name}"`,
        description: 'זו הקטגוריה הכי יקרה שלך החודש',
        details: [
          `הוצאת ₪${topCategory.spent.toLocaleString()} על ${topCategory.name} (${Math.round((topCategory.spent / totalMonthlyExpenses) * 100)}% מכלל ההוצאות)`,
          'המלצה: בדוק אם יש הוצאות מיותרות בקטגוריה זו',
          'טיפ: נסה "כלל 24 השעות" - המתן יום לפני רכישות גדולות'
        ],
        actionable: true,
        priority: 'medium'
      });
    }

    // טיפ 4: חירום כספי
    const emergencyFund = goals.find(g => g.name.includes('חירום') || g.name.includes('משכנתא'));
    const monthlyIncome = totalBudget * 1.2; // הערכה גסה
    const recommendedEmergency = monthlyIncome * 3;

    if (!emergencyFund || (emergencyFund.currentAmount || 0) < recommendedEmergency * 0.5) {
      tips.push({
        id: 'emergency_fund',
        type: 'important',
        icon: <Shield className="w-5 h-5" />,
        title: 'בנה קרן חירום',
        description: 'אין לך מספיק כסף בצד למקרי חירום',
        details: [
          `מומלץ לך לחסוך ₪${recommendedEmergency.toLocaleString()} (3 משכורות) לחירום`,
          emergencyFund ? `יש לך כרגע ₪${(emergencyFund.currentAmount || 0).toLocaleString()}` : 'עדיין לא הגדרת יעד חירום',
          'המלצה: חסוך ₪200-500 בחודש עד להשלמת הקרן',
          'טיפ: שים את כסף החירום בחשבון נפרד שקשה לגשת אליו'
        ],
        actionable: true,
        priority: 'high'
      });
    }

    // טיפ 5: יעדים לטווח ארוך
    const activeGoals = goals.filter(g => (g.currentAmount || 0) < g.targetAmount);
    if (activeGoals.length > 3) {
      tips.push({
        id: 'focus_goals',
        type: 'strategy',
        icon: <Target className="w-5 h-5" />,
        title: 'התמקד ב-2-3 יעדים עיקריים',
        description: 'יותר מדי יעדים בו-זמנית יכולים לפזר את המאמצים',
        details: [
          `יש לך ${activeGoals.length} יעדים פעילים`,
          'המלצה: בחר 2-3 יעדים החשובים ביותר והתמקד בהם',
          'טיפ: סיים יעד אחד לפני שאתה מתחיל יעד חדש'
        ],
        actionable: true,
        priority: 'low'
      });
    }

    // טיפ 6: הוצאות משתנות
    const lastThreeMonths = [];
    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(currentYear, currentMonth - i, 1);
      const monthExpenses = expenses
        .filter(exp => {
          const d = new Date(exp.date);
          return d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      lastThreeMonths.push(monthExpenses);
    }

    const avgThreeMonths = lastThreeMonths.reduce((sum, month) => sum + month, 0) / lastThreeMonths.length;
    const currentVsAvg = ((totalMonthlyExpenses - avgThreeMonths) / avgThreeMonths) * 100;

    if (Math.abs(currentVsAvg) > 20) {
      tips.push({
        id: 'expense_volatility',
        type: currentVsAvg > 0 ? 'warning' : 'success',
        icon: currentVsAvg > 0 ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />,
        title: currentVsAvg > 0 ? 'הוצאות גבוהות מהרגיל' : 'הוצאות נמוכות מהרגיל',
        description: `החודש אתה ${currentVsAvg > 0 ? 'מוציא' : 'חוסך'} ${Math.abs(Math.round(currentVsAvg))}% ${currentVsAvg > 0 ? 'יותר' : 'פחות'} מהממוצע`,
        details: [
          `ממוצע 3 חודשים: ₪${avgThreeMonths.toLocaleString()}`,
          `החודש: ₪${totalMonthlyExpenses.toLocaleString()}`,
          currentVsAvg > 0 
            ? 'בדוק אם היו הוצאות חד-פעמיות או שינוי בהרגלים'
            : 'נהדר! אם זה מתוכנן - המשך כך'
        ],
        actionable: currentVsAvg > 0,
        priority: Math.abs(currentVsAvg) > 30 ? 'high' : 'medium'
      });
    }

    return tips.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [categories, goals, debts, expenses, currentMonthExpenses, totalMonthlyExpenses, monthProgress, dayOfMonth]);

  const getTypeColors = (type) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
          border: 'border-amber-200',
          icon: 'text-amber-600',
          title: 'text-amber-800',
          text: 'text-amber-700'
        };
      case 'opportunity':
        return {
          bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
          border: 'border-emerald-200',
          icon: 'text-emerald-600',
          title: 'text-emerald-800',
          text: 'text-emerald-700'
        };
      case 'insight':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          text: 'text-blue-700'
        };
      case 'important':
        return {
          bg: 'bg-gradient-to-br from-red-50 to-rose-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          text: 'text-red-700'
        };
      case 'strategy':
        return {
          bg: 'bg-gradient-to-br from-purple-50 to-violet-50',
          border: 'border-purple-200',
          icon: 'text-purple-600',
          title: 'text-purple-800',
          text: 'text-purple-700'
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'text-green-800',
          text: 'text-green-700'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-800',
          text: 'text-gray-700'
        };
    }
  };

  if (!smartTips.length) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm p-6 border border-green-200">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-green-800 mb-2">מצוין! הכל תקין</h3>
          <p className="text-green-700 text-sm">
            המערכת לא זיהתה נושאים שדורשים התייחסות. המשך לנהל את התקציב כמו שאתה עושה! 🎯
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          טיפים פיננסיים חכמים
        </h3>
        <div className="text-sm text-gray-500">
          {smartTips.length} המלצות מותאמות
        </div>
      </div>

      <div className="grid gap-4">
        {smartTips.slice(0, 4).map((tip) => {
          const colors = getTypeColors(tip.type);
          const isExpanded = selectedTip === tip.id;
          
          return (
            <div
              key={tip.id}
              className={`${colors.bg} ${colors.border} border rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md`}
              onClick={() => setSelectedTip(isExpanded ? null : tip.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`${colors.icon} flex-shrink-0 mt-1`}>
                    {tip.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-base ${colors.title} mb-1`}>
                      {tip.title}
                    </h4>
                    <p className={`text-sm ${colors.text} leading-relaxed`}>
                      {tip.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {tip.priority === 'high' && (
                    <Zap className="w-4 h-4 text-red-500" />
                  )}
                  <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ArrowDown className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                  <div className="space-y-2">
                    {tip.details.map((detail, index) => (
                      <div key={index} className={`text-sm ${colors.text} flex items-start gap-2`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current mt-2 flex-shrink-0" />
                        <span className="leading-relaxed">{detail}</span>
                      </div>
                    ))}
                  </div>
                  
                  {tip.actionable && (
                    <div className="mt-4 pt-3 border-t border-current border-opacity-20">
                      <div className={`text-xs ${colors.text} flex items-center gap-1`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="font-medium">טיפ פעיל - ניתן ליישום מיידי</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {smartTips.length > 4 && (
        <div className="text-center pt-2">
          <p className="text-sm text-gray-500">
            ועוד {smartTips.length - 4} המלצות נוספות...
          </p>
        </div>
      )}
    </div>
  );
};

export default SmartFinancialTips;