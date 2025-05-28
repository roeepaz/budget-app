import React, { useState } from 'react';
import { MessageSquare, Send, Heart, CheckCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { getAuth } from 'firebase/auth';
    const SERVICE_ID = process.env.EMAILJS_SERVICE_ID!;
const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID!;
const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY!;


export default function FeedbackForm() {
const [lastSentTime, setLastSentTime] = useState<number | null>(null);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
const auth = getAuth();
const user = auth.currentUser;

if (!user || !user.email) {
  return (
    <div className="text-center text-red-500 font-medium mt-10">
      ⚠️ לא ניתן לשלוח משוב – משתמש לא מחובר.
    </div>
  );
}

const name = user.displayName || user.email.split('@')[0];


  const handleSend = async () => {
    if (!message.trim()) return;

    
    const now = Date.now();
    
    if (lastSentTime && now - lastSentTime < 60000) {
        alert('ניתן לשלוח משוב רק פעם בדקה 🙏');
        return;
    }
    setLoading(true);

    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          name: user.displayName || user.email?.split('@')[0],
          user_email: user.email,
          message: message,
        },
        PUBLIC_KEY
      );

      setSubmitted(true);
      setMessage('');
setLastSentTime(Date.now());

      // Reset status after 3 seconds
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error('EmailJS Error:', error);
      alert('שליחה נכשלה. נסה שוב.');
    } finally {
      setLoading(false);
    }
    };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-8 rounded-2xl shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-800 mb-2">תודה רבה!</h3>
          <p className="text-green-700">המשוב שלך נשלח בהצלחה ויעזור לנו לשפר את החוויה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold">שתף אותנו במחשבות שלך</h2>
          </div>
          <p className="text-blue-100 leading-relaxed">
            כל משוב חשוב לנו! בין אם זה רעיון לשיפור, בעיה שנתקלת בה, או פשוט דבר שאהבת - נשמח לשמוע
          </p>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* User info display */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user.displayName?.[0] || 'U'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.displayName || 'משתמש'}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Textarea with modern styling */}
          <div className="relative">
            <textarea
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 resize-none text-right"
              rows={6}
              placeholder="ספר לנו מה עובר לך... 💭"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ direction: 'rtl' }}
            />
            <div className="absolute bottom-3 left-3 text-xs text-gray-400">
              {message.length} תווים
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                loading || !message.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  שלח משוב
                </>
              )}
            </button>
            
            <button
              onClick={() => setMessage('')}
              disabled={loading}
              className="px-4 py-4 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
            >
              נקה
            </button>
          </div>

          {/* Encouraging footer */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-2">
            <Heart className="w-4 h-4 text-red-400" />
            <span>המשוב שלך עוזר לנו לשפר ולגדול</span>
          </div>
        </div>
      </div>
    </div>
  );
}
