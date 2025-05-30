import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Check, AlertCircle, Plus, Minus } from 'lucide-react';

// Mock types for demo
interface Category {
  id: string | number;
  name: string;
  budget?: number;
  tag: 'need' | 'want' | 'savings' | 'emergency';
}

interface Debt {
  id: string | number;
  name: string;
  budget?: number;
}

interface SavingsGoal {
  id: string | number;
  name: string;
  budget?: number;
}

interface Allocations {
  emergencyFundMonthly: number;
  generalSavings: number;
  discretionarySpending: number;
  debtAllocations: { id: string; name: string; totalPayment: number }[];
  goalAllocations: { id: string; name: string; allocatedMonthly: number }[];
}

interface Props {
  allocations: Allocations;
  categories: Category[];
  goals: SavingsGoal[];
  debts: Debt[];
  totalNeeds: number;
  onClose: () => void;
  onUpdate: (
    updatedCategories: Category[],
    updatedGoals: SavingsGoal[],
    updatedDebts: Debt[]
  ) => void;
}

// Demo data for the component
const demoData = {
  allocations: {
    emergencyFundMonthly: 2500,
    generalSavings: 3000,
    discretionarySpending: 4000,
    debtAllocations: [
      { id: '1', name: 'משכנתא', totalPayment: 5500 },
      { id: '2', name: 'הלוואת רכב', totalPayment: 1200 }
    ],
    goalAllocations: [
      { id: '1', name: 'חופשה', allocatedMonthly: 800 },
      { id: '2', name: 'מחשב חדש', allocatedMonthly: 600 }
    ]
  },
  categories: [
    { id: '1', name: 'דיור', budget: 6000, tag: 'need' as const },
    { id: '2', name: 'מזון', budget: 2500, tag: 'need' as const },
    { id: '3', name: 'בילויים', budget: 1500, tag: 'want' as const },
    { id: '4', name: 'ביגוד', budget: 800, tag: 'want' as const },
    { id: '5', name: 'חיסכון כללי', budget: 2000, tag: 'savings' as const },
    { id: '6', name: 'קרן חירום', budget: 1500, tag: 'emergency' as const }
  ],
  goals: [
    { id: '1', name: 'חופשה', budget: 800 },
    { id: '2', name: 'מחשב חדש', budget: 600 }
  ],
  debts: [
    { id: '1', name: 'משכנתא', budget: 5500 },
    { id: '2', name: 'הלוואת רכב', budget: 1200 }
  ],
  totalNeeds: 8500
};

export default function ModernBudgetBuilder({
  allocations = demoData.allocations,
  categories = demoData.categories,
  goals = demoData.goals,
  debts = demoData.debts,
  totalNeeds = demoData.totalNeeds,
  onClose = () => {},
  onUpdate = () => {}
}: Partial<Props>) {
  const [localCategories, setLocalCategories] = useState([...categories]);
  const [localGoals, setLocalGoals] = useState([...goals]);
  const [localDebts, setLocalDebts] = useState([...debts]);
  const [activeTab, setActiveTab] = useState('needs');

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

  const parseNumberInput = (value: string): number => {
    const cleanValue = value.replace(/[,\s]/g, '');
    const parsed = parseInt(cleanValue) || 0;
    return Math.max(0, parsed);
  };

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

  const needCats = localCategories.filter(c => c.tag === 'need');
  const wantCats = localCategories.filter(c => c.tag === 'want');
  const savingCats = localCategories.filter(c => c.tag === 'savings');
  const emergencyCats = localCategories.filter(c => c.tag === 'emergency');

  const isBalanced = Math.abs(totals.grandTotal - recommendedTotal) < 50;

  const tabs = [
    { id: 'needs', label: 'צרכים', count: needCats.length, icon: '🏠' },
    { id: 'wants', label: 'רצונות', count: wantCats.length, icon: '🎉' },
    { id: 'savings', label: 'חיסכון', count: savingCats.length + emergencyCats.length, icon: '💰' },
    { id: 'debts', label: 'חובות', count: localDebts.length, icon: '💳' },
    { id: 'goals', label: 'מטרות', count: localGoals.length, icon: '🎯' }
  ];
  const BudgetItem = ({ item, onUpdate }: {
  item: { id: string | number; name: string; budget?: number };
  onUpdate: (id: string | number, budget: number) => void;
}) => {
  const [inputValue, setInputValue] = useState(String(item.budget ?? 0));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // עדכן את inputValue רק אם המשתמש לא עורך כרגע
    if (!isEditing) {
      setInputValue(String(item.budget ?? 0));
    }
  }, [item.budget, isEditing]);
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800 text-lg">{item.name}</h4>
        <div className="text-2xl font-bold text-blue-600">
          {formatCurrency(item.budget || 0)} {/* כאן אפשר להשאיר עיצוב */}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdate(item.id, Math.max(0, (item.budget || 0) - 100))}
          className="w-10 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>

        <input
  type="number"
  className="flex-1 text-center text-lg font-semibold border-2 border-gray-200 rounded-xl py-3 px-4 focus:border-blue-500 focus:outline-none transition-colors"
  value={inputValue}
  onFocus={() => setIsEditing(true)}
  onBlur={() => setIsEditing(false)}
  onChange={(e) => {
    const value = e.target.value;
    setInputValue(value);

    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      onUpdate(item.id, Math.max(0, parsed));
    }
  }}
  inputMode="numeric"
  placeholder="0"
/>


        <button
          onClick={() => onUpdate(item.id, (item.budget || 0) + 100)}
          className="w-10 h-10 bg-green-50 hover:bg-green-100 text-green-600 rounded-full flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};



  const renderTabContent = () => {
    switch (activeTab) {
      case 'needs':
        return needCats.map(item => (
          <BudgetItem key={item.id} item={item} onUpdate={updateCategory} />
        ));
      case 'wants':
        return wantCats.map(item => (
          <BudgetItem key={item.id} item={item} onUpdate={updateCategory} />
        ));
      case 'savings':
        return [...savingCats, ...emergencyCats].map(item => (
          <BudgetItem key={item.id} item={item} onUpdate={updateCategory} />
        ));
      case 'debts':
        return localDebts.map(item => (
          <BudgetItem key={item.id} item={item} onUpdate={updateDebt} />
        ));
      case 'goals':
        return localGoals.map(item => (
          <BudgetItem key={item.id} item={item} onUpdate={updateGoal} />
        ));
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">בונה תקציב</h1>
                <p className="text-sm text-gray-600">התאם את התקציב שלך</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className={`p-4 ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border-b`}>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-sm text-gray-600">מומלץ</div>
              <div className="text-lg font-bold">{formatCurrency(recommendedTotal)}</div>
            </div>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">בפועל</div>
              <div className={`text-lg font-bold ${isBalanced ? 'text-green-600' : 'text-orange-600'}`}>
                {formatCurrency(totals.grandTotal)}
              </div>
            </div>
          </div>
          {!isBalanced && (
            <div className="text-center mt-2">
              <span className="text-sm text-orange-600 font-medium">
                הפרש: {formatCurrency(Math.abs(totals.grandTotal - recommendedTotal))}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white border-b overflow-x-auto">
          <div className="flex min-w-max px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[80px] py-3 px-4 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="bg-gray-200 text-gray-700 text-xs rounded-full px-2 py-0.5">
                      {tab.count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4 max-w-md mx-auto">
            {renderTabContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t p-4">
          <div className="flex gap-3 max-w-md mx-auto">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={() => {
                onUpdate(localCategories, localGoals, localDebts);
                onClose();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-black transition-colors ${
                isBalanced 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {isBalanced ? '✅ אישור' : '⚠️ אישור בכל זאת'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}