import React from 'react';
import { Brain, Shield, X, CheckCircle } from 'lucide-react';

interface BudgetPrepModalProps {
  onClose: () => void;
}

const BudgetPrepModal: React.FC<BudgetPrepModalProps> = ({ onClose }) => {
  return (
    <div
      className="
        fixed inset-0
        bg-black bg-opacity-50
        flex items-start justify-center
        p-4
        overflow-auto
        z-50
      "
    >
      <div
        className="
          bg-white rounded-3xl shadow-2xl
          w-full max-w-md sm:max-w-xl md:max-w-3xl
          max-h-screen sm:max-h-[90vh]
          overflow-y-auto
          relative
          animate-in slide-in-from-bottom-4 duration-300
        "
      >
        {/* Скрытие */}
        <button
          onClick={onClose}
          className="
            absolute top-4 left-4
            p-2 rounded-full bg-gray-100 hover:bg-gray-200
            transition-colors z-10
          "
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Контент */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 sm:p-8 space-y-6">
          {/* Заголовок */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="bg-amber-500 rounded-full p-3 shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-amber-800">
                שיעורי בית - הכנה חשובה! 📚
              </h2>
              <p className="text-amber-700 text-sm sm:text-base">
                לפני שמתחילים, חשוב שתכינו מידע בסיסי על המצב הכלכלי שלכם
              </p>
            </div>
          </div>

          {/* Блоки */}
          <div className="space-y-6">
            <div className="bg-amber-100 border-r-4 border-amber-400 p-4 sm:p-6 rounded-xl">
              <h3 className="font-bold text-amber-800 mb-2 text-base sm:text-lg">💡 מה צריך לחשוב מראש?</h3>
              <p className="text-amber-700 text-sm sm:text-base leading-relaxed">
                כדי שהמערכת תוכל לבנות עבורכם תקציב מדויק ומותאם, חשוב שתכינו רשימה של ההוצאות הקבועות שלכם.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* הוצאות בסיס */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-red-100">
                <div className="flex items-center mb-2 space-x-2 rtl:space-x-reverse">
                  <Shield className="w-6 h-6 text-red-600" />
                  <h3 className="text-base sm:text-xl font-bold text-red-800">רשימת הוצאות הבסיס שלכם</h3>
                </div>
                <ul className="list-disc list-inside text-gray-600 text-sm sm:text-base space-y-1">
                  <li>שכר דירה / משכנתא</li>
                  <li>חשבונות (חשמל, מים, גז, טלפון, אינטרנט)</li>
                  <li>קניות בסיסיות בסופר</li>
                  <li>תחבורה (דלק / תחבורה ציבורית)</li>
                  <li>ביטוחים (בריאות, רכב, דירה)</li>
                  <li>תרופות וטיפולים רפואיים בסיסיים</li>
                </ul>
              </div>

              {/* מה לא נכלל */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-purple-100">
                <div className="flex items-center mb-2 space-x-2 rtl:space-x-reverse">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xs">✨</span>
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-purple-800">מה לא נכלל בהוצאות הבסיס?</h3>
                </div>
                <ul className="list-disc list-inside text-gray-600 text-sm sm:text-base space-y-1">
                  <li>בילויים ומסעדות</li>
                  <li>קניות לא חיוניות</li>
                  <li>חופשות וטיולים</li>
                  <li>הלוואות קיימות</li>
                  <li>מטרות חיסכון ספציפיות</li>
                  <li>חיסכון כללי וקרן חירום</li>
                </ul>
              </div>
            </div>

          {/* משתמשים קיימים vs חדשים */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="font-bold text-blue-800 mb-3 sm:mb-4 text-base sm:text-lg">📊 איך לחשב את ההוצאות שלכם?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white rounded-lg p-4 sm:p-5 shadow-sm border border-green-100">
                <h4 className="font-semibold text-green-700 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                  <span className="bg-green-100 rounded-full p-1.5 sm:p-2 ml-2">🆕</span>
                  משתמש חדש?
                </h4>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                  עברו על החשבונות האחרונים שלכם וחשבו בממוצע כמה אתם מוציאים בחודש על כל קטגוריה בסיסית.
                  קחו 2-3 חודשים אחרונים לממוצע מדויק יותר.
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-5 shadow-sm border border-orange-100">
                <h4 className="font-semibold text-orange-700 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                  <span className="bg-orange-100 rounded-full p-1.5 sm:p-2 ml-2">⭐</span>
                  משתמש קבוע?
                </h4>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                היכנסו להוצאות המתויגות שלכם וסכמו את כל ההוצאות שמתויגות בקטגוריות "בסיס" מהחודשים האחרונים.
                </p>
              </div>
            </div>
          </div>
            {/* דגשים חשובים */}
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 sm:p-6 space-y-4">
              <h3 className="font-bold text-red-800 text-base sm:text-lg">🚨 דגשים חשובים להצלחה:</h3>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2 rtl:space-x-reverse">
                  <CheckCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
                  <span>לפחות קטגוריה אחת של חיסכון כללי</span>
                </li>
                <li className="flex items-start space-x-2 rtl:space-x-reverse">
                  <CheckCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
                  <span>לפחות קטגוריה אחת של קרן חירום</span>
                </li>
                <li className="flex items-start space-x-2 rtl:space-x-reverse">
                  <CheckCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
                  <span>קטגוריות הוצאות בסיס מדויקות</span>
                </li>
              </ul>
            </div>
          </div>

          {/* כפתור סגירה */}
          <div className="text-center mt-4">
            <button
              onClick={onClose}
              className="
                bg-gradient-to-r from-green-500 to-green-600
                text-white px-6 py-3 rounded-2xl font-bold text-base sm:text-lg
                shadow-lg hover:shadow-xl transform hover:scale-105
                transition-all duration-200 flex items-center justify-center mx-auto
              "
            >
              <CheckCircle className="w-5 h-5 ml-2" />
              הבנתי, בואו נתחיל! 🎯
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPrepModal;
