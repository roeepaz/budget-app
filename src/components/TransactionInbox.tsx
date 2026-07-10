import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CreditCard, 
  Calendar, 
  Tag, 
  ThumbsUp,
  Inbox
} from 'lucide-react';
import { Category, Expense } from '../type/appTypes';

interface Transaction {
  id: string;
  merchantName: string;
  amount: number;
  currency: string;
  date: string;
  time: string | null;
  cardLastFourDigits: string | null;
  category: string | null; // category parsed from MAX
  status: 'pending' | 'settled';
}

interface TransactionInboxProps {
  isOpen: boolean;
  onClose: () => void;
  pendingTransactions: Transaction[];
  categories: Category[];
  expenses: Expense[];
  onApprove: (id: string, categoryId: string | number) => Promise<void>;
  onIgnore: (id: string) => Promise<void>;
}

export default function TransactionInbox({
  isOpen,
  onClose,
  pendingTransactions,
  categories,
  expenses,
  onApprove,
  onIgnore
}: TransactionInboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort transactions by date ascending (oldest first)
  const sortedTransactions = [...pendingTransactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const currentTx = sortedTransactions[currentIndex];

  // Smart matching algorithm to suggest a category
  const getSmartSuggestion = (tx: Transaction): { categoryId: string | number; reason: string } | null => {
    if (!tx || categories.length === 0) return null;

    // Rule 1: Match based on previous exact description classification history
    const exactMatches = expenses.filter(
      (e) => e.description.trim().toLowerCase() === tx.merchantName.trim().toLowerCase()
    );
    if (exactMatches.length > 0) {
      const sorted = [...exactMatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const mostRecentCategoryId = sorted[0].categoryId;
      const matchedCat = categories.find((c) => String(c.id) === String(mostRecentCategoryId));
      if (matchedCat) {
        return {
          categoryId: matchedCat.id,
          reason: `סיווגת את "${tx.merchantName}" לקטגוריה זו בעבר`
        };
      }
    }

    // Rule 2: Keyword matching based on original MAX category
    const rawCategory = tx.category ? tx.category.toLowerCase() : '';
    if (rawCategory) {
      const keywords: Record<string, string[]> = {
        food: ['מזון', 'סופרמרקט', 'רשתות מזון', 'צרכנות', 'שופרסל', 'רמי לוי', 'יוחננוף', 'מכולת'],
        dining: ['מסעדות', 'בתי קפה', 'אוכל מוכן', 'פאבים', 'פיצה', 'בורגר'],
        transport: ['תחבורה', 'דלק', 'נסיעות', 'רכב', 'חניה', 'פנגו', 'רכבת', 'אוטובוסים'],
        utilities: ['חשמל', 'מים', 'ארנונה', 'גז', 'תקשורת', 'טלפון', 'אינטרנט', 'חשבונות'],
        leisure: ['בילוי', 'פנאי', 'בידור', 'סרטים', 'הופעות', 'ספורט', 'כושר', 'קאנטרי'],
        shopping: ['ביגוד', 'הנעלה', 'אופנה', 'קניון', 'צעצועים', 'מתנות', 'איפור', 'קוסמטיקה'],
        health: ['בריאות', 'פארם', 'סופר-פארם', 'תרופות', 'מרפאה', 'רופא', 'שיניים']
      };

      const findUserCat = (tag: string, searchWords: string[]) => {
        return categories.find(c => {
          const name = c.name.toLowerCase();
          return searchWords.some(word => name.includes(word));
        });
      };

      if (keywords.food.some(k => rawCategory.includes(k))) {
        const found = findUserCat('need', ['סופר', 'אוכל', 'מזון', 'קניות']);
        if (found) return { categoryId: found.id, reason: `מזוהה כקניית מזון/סופרמרקט (${tx.category})` };
      }
      if (keywords.dining.some(k => rawCategory.includes(k))) {
        const found = findUserCat('want', ['מסעדות', 'בילוי', 'אוכל', 'קפה']);
        if (found) return { categoryId: found.id, reason: `מזוהה כבילוי במסעדה/בית קפה (${tx.category})` };
      }
      if (keywords.transport.some(k => rawCategory.includes(k))) {
        const found = findUserCat('need', ['תחבורה', 'רכב', 'דלק', 'חניה', 'נסיעות']);
        if (found) return { categoryId: found.id, reason: `מזוהה כהוצאת רכב/תחבורה (${tx.category})` };
      }
      if (keywords.utilities.some(k => rawCategory.includes(k))) {
        const found = findUserCat('need', ['חשבונות', 'חשמל', 'מים', 'אינטרנט', 'בית']);
        if (found) return { categoryId: found.id, reason: `מזוהה כחשבונות שוטפים או מגורים (${tx.category})` };
      }
      if (keywords.leisure.some(k => rawCategory.includes(k))) {
        const found = findUserCat('want', ['בילוי', 'כושר', 'פנאי', 'ספורט']);
        if (found) return { categoryId: found.id, reason: `מזוהה כבילוי או פנאי (${tx.category})` };
      }
      if (keywords.shopping.some(k => rawCategory.includes(k))) {
        const found = findUserCat('want', ['קניות', 'ביגוד', 'אופנה', 'מתנות']);
        if (found) return { categoryId: found.id, reason: `מזוהה כקניות אופנה/שופינג (${tx.category})` };
      }
      if (keywords.health.some(k => rawCategory.includes(k))) {
        const found = findUserCat('need', ['בריאות', 'פארם', 'רופא']);
        if (found) return { categoryId: found.id, reason: `מזוהה כהוצאה רפואית/פארם (${tx.category})` };
      }
    }

    return {
      categoryId: categories[0].id,
      reason: 'קטגוריית ברירת מחדל'
    };
  };

  useEffect(() => {
    if (currentTx) {
      const suggestion = getSmartSuggestion(currentTx);
      if (suggestion) {
        setSelectedCategoryId(suggestion.categoryId);
      } else {
        setSelectedCategoryId('');
      }
    }
  }, [currentIndex, currentTx, sortedTransactions]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  if (pendingTransactions.length === 0) return null;

  const handleApprove = async () => {
    if (!currentTx || !selectedCategoryId) return;
    setIsSubmitting(true);
    try {
      await onApprove(currentTx.id, selectedCategoryId);
      if (currentIndex >= sortedTransactions.length - 1 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIgnore = async () => {
    if (!currentTx) return;
    setIsSubmitting(true);
    try {
      await onIgnore(currentTx.id);
      if (currentIndex >= sortedTransactions.length - 1 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSuggestion = currentTx ? getSmartSuggestion(currentTx) : null;
  const isSuggested = currentSuggestion && String(currentSuggestion.categoryId) === String(selectedCategoryId);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 font-sans" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-65 backdrop-blur-md transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white text-gray-900 text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-200">
                
                {/* Header Background Gradient (Soft Blue) */}
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-20"
                >
                  <X size={20} />
                </button>

                <div className="p-6 sm:p-8 relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500 bg-opacity-10 text-blue-600 rounded-2xl">
                      <Inbox size={24} />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-bold text-gray-900">
                        תיבת עסקאות ממתינות
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 mt-1">
                        מצאנו עסקאות חדשות מכרטיס האשראי שלך. בוא נשייך אותן לתקציב.
                      </p>
                    </div>
                  </div>

                  {pendingTransactions.length > 0 && currentTx ? (
                    <div className="space-y-6">
                      
                      {/* Progress Stepper */}
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>עסקה {currentIndex + 1} מתוך {sortedTransactions.length}</span>
                        <div className="flex gap-1">
                          {sortedTransactions.map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === currentIndex ? 'w-6 bg-blue-600' : 'w-2 bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Card View (Solid Gray Background) */}
                      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 shadow-inner relative overflow-hidden">
                        
                        {/* Corner Card Icon Tag */}
                        {currentTx.cardLastFourDigits && (
                          <div className="absolute top-4 left-4 flex items-center gap-1 text-[10px] text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-250">
                            <CreditCard size={10} />
                            <span>{currentTx.cardLastFourDigits}</span>
                          </div>
                        )}

                        <div className="space-y-4">
                          {/* Merchant & Amount */}
                          <div className="text-center py-4">
                            <h4 className="text-2xl font-bold text-gray-900 tracking-wide mb-1 leading-snug">
                              {currentTx.merchantName}
                            </h4>
                            <div className="text-3xl font-extrabold text-emerald-600">
                              ₪{currentTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>

                          <hr className="border-gray-200" />

                          {/* Transaction Details Fields */}
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-gray-400" />
                              <span>{currentTx.date}</span>
                            </div>
                            {currentTx.category && (
                              <div className="flex items-center gap-2">
                                <Tag size={16} className="text-gray-400" />
                                <span className="truncate max-w-[120px]">{currentTx.category}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Smart Suggestion Badge (Solid Blue Tint) */}
                      {currentSuggestion && isSuggested && (
                        <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs rounded-xl p-3 flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div className="text-right">
                            <span className="font-bold">הצעה חכמה: </span>
                            {currentSuggestion.reason}
                          </div>
                        </div>
                      )}

                      {/* Category Selector */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          בחר קטגוריה לתקציב:
                        </label>
                        <select
                          value={selectedCategoryId}
                          onChange={(e) => setSelectedCategoryId(e.target.value)}
                          className="w-full bg-white border border-gray-300 text-gray-950 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                        >
                          <option value="">-- בחר קטגוריה --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.name} ({c.tag === 'need' ? 'הכרחי' : c.tag === 'want' ? 'רצון' : 'אחר'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Navigation & Action Buttons */}
                      <div className="pt-4 space-y-3">
                        <div className="flex gap-3">
                          <button
                            onClick={handleApprove}
                            disabled={isSubmitting || !selectedCategoryId}
                            className="flex-1 bg-black hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm"
                          >
                            {isSuggested ? (
                              <>
                                <ThumbsUp size={18} />
                                <span>אשר סיווג</span>
                              </>
                            ) : (
                              <>
                                <Check size={18} />
                                <span>סווג הוצאה</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleIgnore}
                            disabled={isSubmitting}
                            className="bg-gray-100 hover:bg-gray-250 border border-gray-250 text-gray-600 hover:text-gray-900 font-bold p-3.5 rounded-2xl transition-colors disabled:opacity-50"
                            title="התעלם מהעסקה"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {/* Prev / Next buttons to browse other pending */}
                        {sortedTransactions.length > 1 && (
                          <div className="flex justify-between text-xs text-gray-500 px-1 pt-1">
                            <button
                              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                              disabled={currentIndex === 0}
                              className="flex items-center gap-1 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <ChevronRight size={16} />
                              <span>הקודם</span>
                            </button>
                            <button
                              onClick={() => setCurrentIndex((prev) => Math.min(sortedTransactions.length - 1, prev + 1))}
                              disabled={currentIndex === sortedTransactions.length - 1}
                              className="flex items-center gap-1 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <span>הבא</span>
                              <ChevronLeft size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* Success Celebration Screen */
                    <div className="py-10 text-center space-y-4">
                      <div className="w-20 h-20 bg-emerald-500 bg-opacity-10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-500 border-opacity-20">
                        <Check size={40} className="animate-bounce" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-950">כל העסקאות סווגו!</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          העסקאות נשמרו בהצלחה בספר ההוצאות החודשי שלך. עבודה מצוינת!
                        </p>
                      </div>
                      <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-2xl shadow-md active:scale-95 transition-all text-sm mt-4"
                      >
                        סגור
                      </button>
                    </div>
                  )}

                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
