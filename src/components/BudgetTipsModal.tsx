

// components/BudgetTipsModal.tsx
import React, { useState } from 'react';
import { X, CheckCircle, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';

interface Tip {
  title: string;
  icon: string;
  description: string;
  content: string[];
  tip: string;
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const tips = [
  {
    title: "צרכים בסיסיים - הבסיס שלך",
    icon: "🏠",
    description: "התחילו תמיד בקטגוריות החיוניות",
    content: [
      "דיור - שכר דירה, משכנתא, חשבונות",
      "מזון ומוצרי צריכה בסיסיים",
      "תחבורה ותקשורת",
      "בריאות וביטוחים חיוניים"
    ],
    tip: "💡 כלל האצבע: 50-60% מההכנסה לצרכים בסיסיים"
  },
  {
    title: "רצונות ומותרות - ההנאה בחיים",
    icon: "🎉",
    description: "הוצאות שמשפרות את איכות החיים",
    content: [
      "בילוי ופנאי - מסעדות, קולנוע",
      "תחביבים וחוגים נוספים",
      "נופש וטיולים",
      "קניות לא חיוניות"
    ],
    tip: "💡 כלל האצבע: 20-30% מההכנסה למותרות"
  },
  {
    title: "קרן חירום - הביטחון שלכם",
    icon: "🛡️",
    description: "הכנה להוצאות בלתי צפויות",
    content: [
      "אירועים רפואיים דחופים",
      "תקלות בבית או ברכב",
      "אובדן הכנסה זמני",
      "הוצאות בלתי צפויות אחרות"
    ],
    tip: "💡 יעד: 3-6 חודשי הוצאות בסיסיות"
  },
  {
    title: "חיסכון כללי - העתיד שלכם",
    icon: "🌱",
    description: "בניית עתיד כלכלי יציב",
    content: [
      "פנסיה וקופות גמל נוספות",
      "חיסכון לילדים",
      "רכישות גדולות עתידיות (לא מטרות קצרות טווח לקניה מסויימת, אל חשש נוסיף אותם בהמשך)",
      "השקעות והגשמת חלומות"
    ],
    tip: "💡 כלל האצבע: 10-20% מההכנסה לחיסכון"
  }
];
const BudgetTipsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  if (!isOpen) return null;

  const nextStep  = () => currentStep < tips.length - 1 && setCurrentStep(s => s + 1);
  const prevStep  = () => currentStep >  0              && setCurrentStep(s => s - 1);
  const tip       = tips[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-auto z-50">
      {/* ← New: section-titles navigation */}
      <div className="absolute top-4 flex gap-2 rtl:gap-2">
        {tips.map((t, i) => (
          <span
            key={i}
            onClick={() => setCurrentStep(i)}
            className={`px-3 py-1 rounded-full text-xs sm:text-sm cursor-pointer transition ${
              i === currentStep
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {t.title}
          </span>
        ))}
      </div>

      <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-xl md:max-w-3xl max-h-screen sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 sm:p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-4 mb-2">
            <div className="text-2xl sm:text-3xl">{tip.icon}</div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">{tip.title}</h2>
              <p className="text-xs sm:text-base text-blue-100">{tip.description}</p>
            </div>
          </div>
          </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {tip.content.map((line,i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-700">{line}</span>
            </div>
          ))}
          {/* Tip Box */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <span className="text-base">💡</span>
              <p className="text-xs sm:text-sm font-medium text-gray-700">{tip.tip}</p>
            </div>
          </div>
          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button onClick={prevStep} disabled={currentStep===0}
              className={`flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-all ${
                currentStep===0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-xs sm:text-sm">הקודם</span>
            </button>
            {/* Dots */}
            <div className="flex gap-1 sm:gap-2">
              {tips.map((_,i)=>(
                <div key={i}
                  className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full transition-all ${
                    i===currentStep ? 'bg-blue-500'
                    : i<currentStep   ? 'bg-green-500'
                                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            {currentStep < tips.length - 1 ? (
              <button onClick={nextStep}
                className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-1 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                <span className="text-xs sm:text-sm">הבא</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={onClose}
                className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-1 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
              >
                <span className="text-xs sm:text-sm">בואו נתחיל!</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="bg-gray-50 px-4 sm:px-6 py-3 rounded-b-2xl text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            זכרו: תקציב טוב הוא תקציב שמתאים לכם ולמשפחתכם 💚
          </p>
        </div>
      </div>
    </div>
  );
};

export default BudgetTipsModal;
