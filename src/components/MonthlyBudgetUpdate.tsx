import React, { useState } from 'react';
import { ChevronRight, TrendingUp, Calculator, DollarSign, User, Calendar } from 'lucide-react';
import { doc, setDoc, updateDoc,getDoc,collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useLocation } from 'react-router-dom';
import { db } from '../firebaseConfig'; // ודא שהנתיב נכון בהתאם למבנה שלך
import { useNavigate } from 'react-router-dom';


interface IncomeData {
  salary: string;
  freelance: string;
  passive: string;
  other: string;
  otherDescription: string;
}

type Step = 'welcome' | 'income' | 'summary';

const MonthlyBudgetUpdate: React.FC = () => {

const location = useLocation();
const isNewUserFromNav = location.state?.isNewUser ?? false;

      const navigate = useNavigate();
const [isNewUser, setIsNewUser] = useState<boolean>(isNewUserFromNav);
const [currentStep, setCurrentStep] = useState<Step>(
  isNewUserFromNav ? 'income' : 'welcome'
);
  const [incomeData, setIncomeData] = useState<IncomeData>({
    salary: '',
    freelance: '',
    passive: '',
    other: '',
    otherDescription: ''
  });

  const getCurrentMonth = (): string => {
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return months[new Date().getMonth()];
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const parseNumber = (val: string): number => parseFloat(val.replace(/,/g, '') || '0');

const calculateTotalIncome = (): number => {
  return (
    parseNumber(incomeData.salary) +
    parseNumber(incomeData.freelance) +
    parseNumber(incomeData.passive) +
    parseNumber(incomeData.other)
  );
};


  const handleIncomeChange = (field: keyof IncomeData, rawValue: string): void => {
  // מסנן תווים לא מספריים
  const numericOnly = rawValue.replace(/[^\d]/g, '');

  // מוסיף פסיקים
  const formatted = new Intl.NumberFormat('he-IL').format(Number(numericOnly));

  setIncomeData(prev => ({
    ...prev,
    [field]: numericOnly ? formatted : ''
  }));
};
const getCurrentMonthId = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const auth = getAuth();

const goToAdvisor = async (): Promise<void> => {
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      alert('אירעה שגיאה. לא נמצא משתמש מחובר.');
      return;
    }
    const totalIncome = calculateTotalIncome();
    await setDoc(doc(db, 'income_update', userId), {
      onboardingStep: 'done',
      lastIncomeMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    }, { merge: true });
    const monthId = getCurrentMonthId();

    const incomeEntryRef = doc(db, 'financial_data', userId, 'monthly_income', monthId);
    await setDoc(incomeEntryRef, {
      salary: parseNumber(incomeData.salary),
      freelance: parseNumber(incomeData.freelance),
      passive: parseNumber(incomeData.passive),
      other: parseNumber(incomeData.other),
      total: totalIncome,
      timestamp: new Date()
    });

    navigate('/advisor');
  };
if (!User) return <div className="text-center p-8">...טוען משתמש</div>;

  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <Calculator className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                שלום ובברכה! 👋
              </h1>
              <p className="text-gray-600 text-lg">
                זמן לעדכן את התקציב החודשי שלך
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 mb-6 text-white">
              <Calendar className="w-6 h-6 mx-auto mb-2" />
              <p className="font-semibold">חודש {getCurrentMonth()}</p>
              <p className="text-sm opacity-90">בואו נבנה יחד תקציב מותאם במיוחד עבורך</p>
            </div>

            <div className="space-y-4 mb-8">
              <div 
                onClick={() => {
                  setIsNewUser(true);
                  setCurrentStep('income');
                }}
                className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="w-6 h-6 text-green-600 ml-3" />
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">משתמש חדש</p>
                      <p className="text-sm text-gray-600">בואו נכיר ונבנה תקציב ראשון</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-green-600 transform rotate-180" />
                </div>
              </div>

              <div 
                onClick={() => {
                  setIsNewUser(false);
                  setCurrentStep('income');
                }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="w-6 h-6 text-blue-600 ml-3" />
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">עדכון חודשי</p>
                      <p className="text-sm text-gray-600">עדכון תקציב לחודש החדש</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-600 transform rotate-180" />
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500">
             3 דקות ונתכנן חודש שלם!🚀
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'income') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                בואו נדבר על ההכנסות שלך החודש
              </h2>
              <p className="text-gray-600">
                {isNewUser ? 'ספר לנו על מקורות ההכנסה שלך' : `איך היו ההכנסות בחודש ${getCurrentMonth()}?`}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  💼 משכורת/שכר קבוע
                </label>
                <div className="relative">
                  <input
                    type="text"
                      inputMode="numeric"
                      pattern="\d*"
                    value={incomeData.salary}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('salary', e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-right text-lg focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  💻 עבודה עצמאית/פרילנס
                </label>
                <div className="relative">
                  <input
                    type="text"
                      inputMode="numeric"
                      pattern="\d*"
                    value={incomeData.freelance}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('freelance', e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-right text-lg focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  📈 הכנסה פסיבית (השכרות, דיבידנדים)
                </label>
                <div className="relative">
                  <input
                    type="text"
                      inputMode="numeric"
                      pattern="\d*"
                    value={incomeData.passive}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('passive', e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-right text-lg focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  💰 הכנסות נוספות
                </label>
                <div className="relative mb-2">
                  <input
                    type="text"
                        inputMode="numeric"
                      pattern="\d*"
                    value={incomeData.other}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('other', e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-right text-lg focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">₪</span>
                </div>
                <input
                  type="text"
                    inputMode="numeric"
                  pattern="\d*"
                  value={incomeData.otherDescription}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncomeData(prev => ({ ...prev, otherDescription: e.target.value }))}
                  placeholder="תיאור (אופציונלי)"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-right focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {calculateTotalIncome() > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="text-center">
                    <p className="text-sm text-green-700 mb-1">סה"כ הכנסה חודשית</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(calculateTotalIncome())}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setCurrentStep('summary')}
                disabled={calculateTotalIncome() === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                המשך ליועץ התקציב ←
              </button>

              <button
                onClick={() => setCurrentStep('welcome')}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                חזור
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'summary') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rtl">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                מעולה! 🎉
              </h2>
              <p className="text-gray-600">
                קיבלנו את פרטי ההכנסה שלך
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
              <div className="space-y-3 text-right">
                {incomeData.salary && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-700">{formatCurrency(parseFloat(incomeData.salary))}</span>
                    <span className="text-gray-700">💼 משכורת קבועה</span>
                  </div>
                )}
                {incomeData.freelance && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-700">{formatCurrency(parseFloat(incomeData.freelance))}</span>
                    <span className="text-gray-700">💻 עבודה עצמאית</span>
                  </div>
                )}
                {incomeData.passive && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-700">{formatCurrency(parseFloat(incomeData.passive))}</span>
                    <span className="text-gray-700">📈 הכנסה פסיבית</span>
                  </div>
                )}
                {incomeData.other && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-700">{formatCurrency(parseFloat(incomeData.other))}</span>
                    <span className="text-gray-700">💰 {incomeData.otherDescription || 'הכנסות נוספות'}</span>
                  </div>
                )}
                <div className="border-t-2 border-blue-200 pt-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-blue-800">{formatCurrency(calculateTotalIncome())}</span>
                    <span className="text-lg font-semibold text-gray-800">סה"כ הכנסה</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-800 font-medium">
                🎯 עכשיו היועץ החכם שלנו יעזור לך לבנות תקציב מותאם אישית לחודש {getCurrentMonth()}
              </p>
            </div>

            <button
              onClick={goToAdvisor}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all mb-4"
            >
              בואו ניצור את התקציב החודשי! 🚀
            </button>

            <button
              onClick={() => setCurrentStep('income')}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              עריכת פרטי הכנסה
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MonthlyBudgetUpdate;