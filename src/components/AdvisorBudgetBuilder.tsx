import React, { useState, useEffect } from 'react';
import { X, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Category,Debt, SavingsGoal } from '../type/appTypes';



interface Allocations {
  emergencyFundMonthly: number;
  generalSavings: number;
  discretionarySpending: number;
  debtAllocations: { id: string; name: string; totalPayment: number }[];
  goalAllocations: { id: string; name: string; allocatedMonthly: number  }[];
}

interface Props {
  allocations: Allocations;
  categories: Category[];
  goals: SavingsGoal[];
  debts: Debt[];
  totalDebt: number | undefined;
  totalGoals: number | undefined;
  totalSavings: number;
  totalEmergency: number;
  totalWants: number;
  totalNeeds: number;
  onClose: () => void;
  onUpdate: (
    updatedCategories: Category[],
    updatedGoals: SavingsGoal[],
    updatedDebts: Debt[]
  ) => void;
}

export default function AdvisorBudgetBuilder({
  allocations,
  categories,
  goals,
  debts,
  totalNeeds,
  onClose,
  onUpdate,
}: Props) {
  const [localCategories, setLocalCategories] = useState([...categories]);
  const [localGoals, setLocalGoals] = useState([...goals]);
  const [localDebts, setLocalDebts] = useState([...debts]);

  // Initialize budgets with advisor recommendations
useEffect(() => {
  const needCats = categories.filter(c => c.tag === 'need');
  const wantCats = categories.filter(c => c.tag === 'want');
  const savingCats = categories.filter(c => c.tag === 'savings');
  const emergencyCats = categories.filter(c => c.tag === 'emergency');

  const needsPerCat = needCats.length > 0 ? Math.round(totalNeeds / needCats.length) : 0;
  const wantsPerCat = wantCats.length > 0 ? Math.round(allocations.discretionarySpending / wantCats.length) : 0;
  const savingsPerCat = savingCats.length > 0 ? Math.round(allocations.generalSavings / savingCats.length) : 0;
  const emergencyPerCat = emergencyCats.length > 0 ? Math.round(allocations.emergencyFundMonthly / emergencyCats.length) : 0;

  setLocalCategories(
    categories.map(cat => {
      let recommendedBudget = Math.round(cat.budget ?? 0);
      switch (cat.tag) {
        case 'need': recommendedBudget = needsPerCat; break;
        case 'want': recommendedBudget = wantsPerCat; break;
        case 'savings': recommendedBudget = savingsPerCat; break;
        case 'emergency': recommendedBudget = emergencyPerCat; break;
      }
      return { ...cat, budget: recommendedBudget };
    })
  );

  setLocalDebts(
    debts.map(debt => ({
      ...debt,
      budget: Math.round(allocations.debtAllocations.find(d => d.id === debt.id)?.totalPayment ?? debt.budget ?? 0),
    }))
  );

  setLocalGoals(
    goals.map(goal => ({
      ...goal,
      budget: Math.round(allocations.goalAllocations.find(g => g.id === goal.id)?.allocatedMonthly ?? goal.budget ?? 0),
    }))
  );
}, []);


  const updateCategory = (id: string | number, budget: number) => {
    setLocalCategories(prev =>
      prev.map(cat => cat.id === id ? { ...cat, budget: Math.max(0, Math.round(budget)) } : cat)
    );
  };


const updateDebt = (id: string | number, budget: number) => {
  setLocalDebts(prev =>
    prev.map(g => (g.id === id ? { ...g, budget: Math.max(0, Math.round(budget)) } : g))
  );
};

  const updateGoal = (id: string | number, budget: number) => {
  setLocalGoals(prev =>
    prev.map(g => (g.id === id ? { ...g, budget: Math.max(0, Math.round(budget)) } : g))
  );
};


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString('he-IL');
  };

  // פונקציה לטיפול בהזנת טקסט עם פסיקים
  const parseNumberInput = (value: string): number => {
    const cleanValue = value.replace(/[,\s]/g, '');
    const parsed = parseInt(cleanValue) || 0;
    return Math.max(0, parsed);
  };

  const calculateTotals = () => {
    const needsTotal = localCategories.filter(c => c.tag === 'need').reduce((sum, c) => sum + (c.budget || 0), 0);
    const wantsTotal = localCategories.filter(c => c.tag === 'want').reduce((sum, c) => sum + (c.budget || 0), 0);
    const savingsTotal = localCategories.filter(c => c.tag === 'savings').reduce((sum, c) => sum + (c.budget || 0), 0);
    const emergencyTotal = localCategories.filter(c => c.tag === 'emergency').reduce((sum, c) => sum + (c.budget || 0), 0);
    const debtsTotal = localDebts.reduce((sum, d) => sum + (d.budget || 0), 0);
    const goalsTotal = localGoals.reduce((sum, g) => sum + (g.budget || 0), 0);

    return {
      needsTotal,
      wantsTotal,
      savingsTotal,
      emergencyTotal,
      debtsTotal,
      goalsTotal,
      grandTotal: needsTotal + wantsTotal + savingsTotal + emergencyTotal + debtsTotal + goalsTotal
    };
  };

  const totals = calculateTotals();
  const recommendedTotal = Math.round(totalNeeds + allocations.discretionarySpending + allocations.generalSavings + 
                          allocations.emergencyFundMonthly + 
                          allocations.debtAllocations.reduce((sum, d) => sum + d.totalPayment, 0) +
                          allocations.goalAllocations.reduce((sum, g) => sum + g.allocatedMonthly, 0));

  const renderBudgetSection = (
    title: string,
    items: { id: string | number; name: string; budget?: number }[],
    recommendedTotal: number,
    actualTotal: number,
    onUpdate: (id: string | number, budget: number) => void,
    color: string = 'blue'
  ) => {
    const isOverBudget = actualTotal > recommendedTotal;
    const isUnderBudget = actualTotal < recommendedTotal;

    return (
      <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">מומלץ:</span>
            <span className="font-medium text-gray-800">{formatCurrency(recommendedTotal)}</span>
            <span className="text-sm text-gray-600">|</span>
            <span className="text-sm text-gray-600">בפועל:</span>
            <span className={`font-medium ${isOverBudget ? 'text-red-600' : isUnderBudget ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(actualTotal)}
            </span>
            {isOverBudget ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : !isUnderBudget ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : null}
          </div>
        </div>
        
        {items.length === 0 ? (
          <div className="text-gray-500 text-center py-4">אין פריטים בקטגוריה זו</div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-700">{item.name}</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      className="w-32 border-2 rounded-lg px-3 py-2 text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
                      value={formatNumber(item.budget || 0)}
                      onChange={(e) => onUpdate(item.id, parseNumberInput(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        // מקשי קיצור לשינוי מהיר
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          onUpdate(item.id, (item.budget || 0) + 100);
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          onUpdate(item.id, Math.max(0, (item.budget || 0) - 100));
                        } else if (e.key === 'Enter') {
                          (e.target as HTMLElement).blur();
                        }
                      }}
                      placeholder="0"
                    />
                  </div>
                  <span className="text-lg text-gray-600 font-medium">₪</span>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => onUpdate(item.id, (item.budget || 0) + 100)}
                      className="w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded text-blue-600 text-xs font-bold transition-colors"
                      title="הוסף 100 ₪"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onUpdate(item.id, Math.max(0, (item.budget || 0) - 100))}
                      className="w-6 h-6 bg-red-100 hover:bg-red-200 rounded text-red-600 text-xs font-bold transition-colors"
                      title="הפחת 100 ₪"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const needCats = localCategories.filter(c => c.tag === 'need');
  const wantCats = localCategories.filter(c => c.tag === 'want');
  const savingCats = localCategories.filter(c => c.tag === 'savings');
  const emergencyCats = localCategories.filter(c => c.tag === 'emergency');

  const confirmAndClose = () => {
    onUpdate(localCategories, localGoals, localDebts);
    onClose();
  };

  const isBalanced = Math.abs(totals.grandTotal - recommendedTotal) < 50;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-start p-4 overflow-auto">
      <div className="bg-gray-50 w-full max-w-4xl rounded-lg shadow-xl my-4 relative">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">📊 בונה תקציב לפי המלצות היועץ</h2>
              <p className="text-blue-100 mt-1">התאם את ההקצאות לפי הצרכים שלך • השתמש בחצים למעלה/מטה לשינוי מהיר</p>
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        <div className={`p-4 border-b ${isBalanced ? 'bg-green-50' : 'bg-orange-50'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">סה"כ תקציב מומלץ:</span>
              <span className="font-bold text-xl">{formatCurrency(recommendedTotal)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">סה"כ תקציב בפועל:</span>
              <span className={`font-bold text-xl ${isBalanced ? 'text-green-600' : 'text-orange-600'}`}>
                {formatCurrency(totals.grandTotal)}
              </span>
              {isBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              )}
            </div>
          </div>
          {!isBalanced && (
            <div className="mt-2 text-center">
              <span className="text-sm text-orange-600 font-medium">
                הפרש: {formatCurrency(Math.abs(totals.grandTotal - recommendedTotal))} 
                {totals.grandTotal > recommendedTotal ? ' מעל התקציב' : ' מתחת לתקציב'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {renderBudgetSection(
            '🏠 צרכים בסיסיים (Needs)', 
            needCats, 
            Math.round(totalNeeds), 
            totals.needsTotal, 
            updateCategory,
            'green'
          )}

          {renderBudgetSection(
            '🎉 רצונות (Wants)', 
            wantCats, 
            Math.round(allocations.discretionarySpending), 
            totals.wantsTotal, 
            updateCategory,
            'purple'
          )}

          {renderBudgetSection(
            '💰 חיסכון כללי', 
            savingCats, 
            Math.round(allocations.generalSavings), 
            totals.savingsTotal, 
            updateCategory,
            'blue'
          )}

          {renderBudgetSection(
            '🛡️ קרן חירום', 
            emergencyCats, 
            Math.round(allocations.emergencyFundMonthly), 
            totals.emergencyTotal, 
            updateCategory,
            'yellow'
          )}

          {renderBudgetSection(
            '💳 חובות',
            localDebts,
            Math.round(allocations.debtAllocations.reduce((sum, d) => sum + d.totalPayment, 0)),
            totals.debtsTotal,
            updateDebt,
            'red'
          )}

          {renderBudgetSection(
            '🎯 מטרות חסכון',
            localGoals,
            Math.round(allocations.goalAllocations.reduce((sum, g) => sum + g.allocatedMonthly, 0)),
            totals.goalsTotal,
            updateGoal,
            'indigo'
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-6 rounded-b-lg border-t">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={confirmAndClose}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
                isBalanced 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              ✅ אישור והחלת תקציב
            </button>
          </div>
          {!isBalanced && (
            <div className="mt-3 text-center text-sm text-gray-600">
              💡 כדאי לאזן את התקציב לפני האישור
            </div>
          )}
          <div className="mt-2 text-center text-xs text-gray-500">
            💡 טיפ: השתמש בחצים ↑↓ במקלדת לשינוי מהיר של 100₪ • לחץ על השדה לבחירה מלאה
          </div>
        </div>
      </div>
    </div>
  );
}