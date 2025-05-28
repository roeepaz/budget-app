import React, { useEffect, useState } from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import './firebase';

export default function Login({ onLogin }) {
  const auth = getAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
    } catch (error) {
      console.error('Login failed:', error);
      alert('נכשל ההתחברות עם גוגל. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 flex items-center justify-center p-4 font-sans">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-300"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-700"></div>
      </div>

      <div className="relative">
        {/* Welcome message */}
        {showWelcome && (
          <div className="mb-8 text-center transform transition-all duration-1000 ease-out">
            <h1 className="text-5xl font-bold text-green-900 mb-3 bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
              ברוך הבא ל-Kesefy
            </h1> 
            <h2 className="text-lg text-green-900 font-medium">
            (נו כולנו שומעים מוזיקה ב-ספוטיפיי, בטח שאפשר להגיד כסיפיי)
            </h2>
            <p className="text-lg text-green-900 font-medium">
              ניהול פיננסי חכם ופשוט
            </p>
          </div>
        )}

        {/* Main login card */}
        <div className="bg-white/30 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-8 w-full max-w-md text-center transform transition-all duration-500 hover:scale-105">
          {/* Glass morphism header */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-green-500 mb-2">Kesefy</h2>
             <p className="text-text-green-500 text-sm">
              התחבר לחשבון הניהול הפיננסי שלך
            </p>
          </div>

          {/* Google login button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-2xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            ) : (
              <>
                <svg
                  className="w-6 h-6 transition-transform group-hover:scale-110"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3C34.7 32.3 30 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.6l6.6 4.8C14.3 16.1 18.8 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4c-7.7 0-14.3 4.3-17.7 10.6z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.4 0 10.2-2.1 13.8-5.5l-6.4-5.3C29.9 34.6 27.1 36 24 36c-6 0-10.7-3.7-12.5-8.8l-6.6 5.1C9.6 39.7 16.3 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-1.4 3.8-5.1 6-9.3 6-6 0-10.7-4.1-12.5-9.6l-6.6 5.1C9.6 39.7 16.3 44 24 44c11 0 20-9 20-20 0-1.3-.1-2.7-.4-3.5z"
                  />
                </svg>
                <span className="text-lg">התחבר עם Google</span>
              </>
            )}
          </button>

          {/* Info section */}
          <div className="mt-8 p-4 bg-green-500/20 rounded-xl border border-green-400/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-green-700 font-medium">למה Google?</h3>
            </div>
            <p className="text-green-900 text-sm leading-relaxed">
              התחברות מאובטחת ומהירה ללא צורך לזכור סיסמאות נוספות. כל המידע הפיננסי שלך מוגן ומוצפן.
            </p>
          </div>

          {/* Features list */}
          <div className="mt-6 space-y-3">
            {[
              { icon: "💰", text: "ניהול תקציב חכם" },
              { icon: "📊", text: "דוחות פיננסיים מפורטים" },
              { icon: "🎯", text: "מטרות חיסכון" }
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-green-900 text-sm leading-relaxed text-sm transform transition-all duration-300 hover:text-white"
              >
                <span className="text-lg">{feature.icon}</span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            © 2025 Kesify • Financial Management • מוגן ומאובטח
          </p>
        </div>
      </div>
    </div>
  );
}