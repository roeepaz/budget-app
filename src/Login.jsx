import React, { useEffect } from 'react';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import './firebase';

export default function Login({ onLogin }) {
  const auth = getAuth();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
    } catch (error) {
      console.error('Login failed:', error);
      alert('נכשל ההתחברות עם גוגל');
    }
  };

  useEffect(() => {
    document.title = 'התחברות - ניהול כלכלי';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
      <div className="bg-white shadow-xl rounded-lg p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">התחברות לחשבון</h2>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md shadow transition-all duration-300"
        >
          <svg
            className="w-5 h-5"
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
          התחבר עם Google
        </button>
      </div>
    </div>
  );
}
