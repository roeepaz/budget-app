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

    // טיפ 1: Smart Debt Management (ניהול חוב חכם)
    const highInterestDebts = debts.filter(d => (d.annualRate || 0) > 0.05);
    const lowInterestDebts = debts.filter(d => (d.annualRate || 0) < 0.03);

    if (highInterestDebts.length > 0) {
      tips.push({
        id: 'high_interest_debt',
        type: 'important',
        icon: <AlertTriangle className="w-5 h-5" />,
        title: 'חיסול חובות בריבית גבוהה - עדיפות עליונה',
        description: 'זיהינו הלוואות עם ריבית של מעל 5%.',
        details: [
          'הריבית דריבית עובדת נגדך כשמדובר בחוב. הלוואות יקרות פוגעות ביכולת שלך לצבור הון לטווח הארוך.',
          'המלצה: שקול לעצור זמנית השקעות חדשות (למעט פנסיה/קרן השתלמות) והפנה את התזרים הפנוי לחיסול מהיר של החוב.',
          'טיפ: בדוק אפשרות למחזור ההלוואה לריבית נמוכה יותר בתמורה לשעבוד נכס (כגון קרן השתלמות או קופת גמל).'
        ],
        actionable: true,
        priority: 'high'
      });
    } else if (lowInterestDebts.length > 0 && savingsBudget > 0) {
      tips.push({
        id: 'low_interest_leverage',
        type: 'insight',
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'מינוף פיננסי חכם',
        description: 'החובות שלך נושאים ריבית נמוכה משמעותית מתשואת השוק.',
        details: [
          'מבחינה מתמטית, פדיון מוקדם של הלוואה בריבית אפסית או נמוכה מאוד (מתחת ל-3%) הוא לרוב פחות משתלם מלהשקיע את הכסף.',
          'המלצה: במקום להאיץ את תשלום החוב, שקול להשקיע את העודפים בשוק ההון (למשל רכישת קרן סל העוקבת אחר מדד דוגמת S&P 500).',
          'התשואה ההיסטורית בשוק המניות גבוהה יותר מעלות החוב שלך, מה שמייצר עבורך פער ארביטראז\' פיננסי אוטומטי.'
        ],
        actionable: true,
        priority: 'medium'
      });
    }

    // טיפ 2: קרן חירום מול השקעות
    const emergencyFund = goals.find(g => g.name.includes('חירום') || g.name.includes('משכנתא'));
    const monthlyIncome = totalBudget * 1.2; // בינתיים הערכה גסה
    const recommendedEmergency = monthlyIncome * 3;
    const hasFullEmergencyFund = emergencyFund && (emergencyFund.currentAmount || 0) >= recommendedEmergency;

    if (!emergencyFund || (emergencyFund.currentAmount || 0) < recommendedEmergency) {
      tips.push({
        id: 'emergency_fund_priority',
        type: 'important',
        icon: <Shield className="w-5 h-5" />,
        title: 'בניית רשת ביטחון פיננסית',
        description: 'הבסיס לחוסן כלכלי הוא קרן חירום נזילה שדורשת חיזוק.',
        details: [
          `לפני שחושבים על השקעות, מומלץ להעמיד בצד כ-3 עד 6 חודשי מחיות (כסף שיכול לשמש אותך בעת חירום).`,
          emergencyFund ? `המצב הנוכחי של הקרן שלך: ₪${(emergencyFund.currentAmount || 0).toLocaleString()} מתוך היעד.` : 'לא זיהינו קרן חירום ייעודית מוגדרת במערכת.',
          'המלצה: פתח פיקדון נזיל שמטרתו לספוג זעזועים (אובדן הכנסה פתאומי או הוצאה לא מתוכננת).',
          'הקמת קרן חזקה תמנע ממך את הצורך לקחת הלוואות יקרות או לפדות פיקדונות השקעה בהפסד מוקדם מהצפוי.'
        ],
        actionable: true,
        priority: 'high'
      });
    } else {
      tips.push({
        id: 'investing_opportunity',
        type: 'success',
        icon: <Lightbulb className="w-5 h-5" />,
        title: 'מתחילים לבנות הון (ריבית דריבית)',
        description: 'קרן החירום שלך איתנה ויש לך עודף תקציבי. תן לכסף לעבוד בשבילך.',
        details: [
          'השארת עודפי מזומנים גדולים בעו"ש לא מייצרת ערך ושוחקת אותם לאורך שנים בגלל האינפלציה.',
          'המלצה: פתח תיק השקעות או קופת גמל להשקעה והתחל להשקיע באופן קבוע ואוטומטי במדדים מפוזרים גלובלית.',
          'כוחו האמיתי של החיסכון נובע מפלא הריבית הדריבית. ככל שתתחיל מוקדם יותר לחשוף קצת הון לסיכון השוק, כך ההון יצמח דרמטית.'
        ],
        actionable: true,
        priority: 'high'
      });
    }

    // טיפ 3: אופטימיזציית מס
    if (savingsBudget > 1000) {
      tips.push({
        id: 'tax_optimization',
        type: 'opportunity',
        icon: <Target className="w-5 h-5" />,
        title: 'מקסום יתרונות מס ומכשירים פנסיונים',
        description: 'אנחנו רואים שיש לך יכולת חיסכון חודשית מרשימה. זו העת לבצע תכנון מס מקיף.',
        details: [
          'תכנון פיננסי חכם כולל ניצול מלא של כל הטבות המס שחוקי המדינה מאפשרים (למשל: סעיף 47 לפקודת מס הכנסה, קופת גמל להשקעה ותיקון 190).',
          'המלצה: בדוק פתיחת קרן השתלמות למעמד עצמאי גם אם אתה שכיר שמקבל קרן בעבודה (תחת תקנות מסוימות ניתן להפריש ולזכות). הפטור ממס רווחי הון הוא יתרון אדיר.',
          'טיפ: בחיסכון לטווח בינוני או שילוב פנסיוני, עלות דמי הניהול ומגן המס יהיו לפעמים חשובים יותר מסכום החסכון עצמו.'
        ],
        actionable: true,
        priority: 'medium'
      });
    }

    // טיפ 4: יחס שירות חוב (Debt Service Ratio)
    const totalMonthlyDebtPayments = debts.reduce((sum, d) => sum + (d.minPayment || 0), 0);
    const debtServiceRatio = monthlyIncome > 0 ? totalMonthlyDebtPayments / monthlyIncome : 0;

    if (debtServiceRatio > 0.3) {
      tips.push({
        id: 'debt_service_ratio',
        type: 'warning',
        icon: <AlertTriangle className="w-5 h-5" />,
        title: 'סכנת מינוף יתר - יחס החזר חוב גבוה מהמומלץ',
        description: `יחס כיסוי החוב שלך (PTI) עומד על כ-${Math.round(debtServiceRatio * 100)}% מההכנסה הכוללת.`,
        details: [
          'פרמטר זה מעיד על הנטל שההלוואות גובות ממך כל חודש. בנקים בישראל מתריעים כאשר יחס זה עובר את ה-30%-35%. חריגה מכך מגבילה את התזרים הפנוי.',
          'משמעות הדבר היא קושי להתמודד עם בלת"מים פיננסיים, ופרופיל סיכון גבוה לבנק שעשוי לייקר לך הלוואות עתידיות.',
          'המלצה: בצע בדק בית מיידי. האם ניתן לפרוס את החוב לזמן ארוך יותר? או מנגד למנף נכסים וחסכונות כדי לפרוע במכה הלוואות יקרות שחונקות את התזרים?'
        ],
        actionable: true,
        priority: 'high'
      });
    }

    // טיפ 5: עלות אלטרנטיבית
    const discretionaryCategories = regularCategories.filter(c => c.tag === 'want');
    const discretionaryBudget = discretionaryCategories.reduce((sum, c) => sum + (c.budget || 0), 0);

    if (discretionaryBudget > monthlyIncome * 0.2) {
      tips.push({
        id: 'opportunity_cost',
        type: 'strategy',
        icon: <Zap className="w-5 h-5" />,
        title: 'עלות אלטרנטיבית וכוחו של הון',
        description: 'נתח גדול (מעל 20%) מהתקציב מופנה ישירות לצריכה שוטפת ומותרות.',
        details: [
          'זה בריא להוציא על החיים עצמם ולשמור על איכות חיים גבוהה, אך שיטת העושר מצביעה על "עלות אלטרנטיבית".',
          `במקום להוציא את ה-₪${Math.round(discretionaryBudget).toLocaleString()} האלה היום, הקטנה של 15% בלבד לצורך השקעה במדד מניות יכולה לייצר עשרות ומאות אלפי שקלים נוספים בעתיד.`,
          'המלצה: כלל האצבע המוזהב - קודם שלם לעצמך. הסט סכום כסף לעבר תיק מניב בתחילת החודש באופן אוטומטי, ואת יתרת התקציב למותרות פזר בצורה חופשית. זה ישחרר אותך פסיכולוגית ממעקב מיקרוסקופי על הוצאות.'
        ],
        actionable: true,
        priority: 'low'
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