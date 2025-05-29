import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, RefreshCw, Home, Mail, ArrowLeft } from 'lucide-react';

export default function FullPageError({
  title = 'אירעה שגיאה',
  description = 'משהו השתבש. נסה לרענן את הדף או פנה לתמיכה.',
  severity = 'error',
}: {
  title?: string;
  description?: string;
  severity?: 'error' | 'warning' | 'info';
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const colorConfigs = {
    error: {
      gradient: 'from-red-500 to-pink-600',
      iconColor: 'text-red-500',
      buttonColor: 'bg-red-500 hover:bg-red-600',
      accentColor: 'text-red-600',
      bgGradient: 'from-red-50 to-pink-50'
    },
    warning: {
      gradient: 'from-yellow-500 to-orange-600',
      iconColor: 'text-yellow-500',
      buttonColor: 'bg-yellow-500 hover:bg-yellow-600',
      accentColor: 'text-yellow-600',
      bgGradient: 'from-yellow-50 to-orange-50'
    },
    info: {
      gradient: 'from-blue-500 to-purple-600',
      iconColor: 'text-blue-500',
      buttonColor: 'bg-blue-500 hover:bg-blue-600',
      accentColor: 'text-blue-600',
      bgGradient: 'from-blue-50 to-purple-50'
    }
  };

  const config = colorConfigs[severity];

  const iconMap = {
    error: <AlertTriangle className={`w-16 h-16 ${config.iconColor} drop-shadow-lg`} />,
    warning: <AlertCircle className={`w-16 h-16 ${config.iconColor} drop-shadow-lg`} />,
    info: <Info className={`w-16 h-16 ${config.iconColor} drop-shadow-lg`} />
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-gradient-to-br ${config.bgGradient} flex flex-col items-center justify-center text-center p-8 min-h-screen`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-white rounded-full opacity-30 animate-bounce" style={{animationDelay: '0s'}}></div>
      <div className="absolute top-40 right-32 w-6 h-6 bg-white rounded-full opacity-20 animate-bounce" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-32 left-16 w-3 h-3 bg-white rounded-full opacity-25 animate-bounce" style={{animationDelay: '2s'}}></div>

      {/* Main Content Container */}
      <div className={`relative z-10 transition-all duration-1000 ease-out transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
      }`}>
        
        {/* Icon with Animation */}
        <div className="relative mb-8">
          <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} rounded-full blur-2xl opacity-20 animate-pulse`}></div>
          <div className="relative bg-white rounded-full p-6 shadow-2xl border border-gray-100">
            {iconMap[severity]}
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent mb-4 leading-tight`}>
          {title}
        </h1>

        {/* Description */}
        <p className="text-gray-600 text-lg md:text-xl mb-12 max-w-2xl leading-relaxed font-medium">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`${config.buttonColor} text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed min-w-[180px]`}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'מרענן...' : 'רענן את הדף'}
          </button>

          <button
            onClick={() => window.history.back()}
            className="bg-white text-gray-700 px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 border border-gray-200 hover:border-gray-300 min-w-[180px]"
          >
            <ArrowLeft className="w-5 h-5" />
            חזור אחורה
          </button>
        </div>

        {/* Additional Options */}
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center text-gray-500">
          <button className="flex items-center gap-2 hover:text-gray-700 transition-colors duration-200 group">
            <Home className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            <span>חזרה לעמוד הבית</span>
          </button>
          
          <div className="hidden sm:block h-4 w-px bg-gray-300"></div>
          
          <button className="flex items-center gap-2 hover:text-gray-700 transition-colors duration-200 group">
            <Mail className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            <span>צור קשר עם התמיכה</span>
          </button>
        </div>

        {/* Status Code Display (if needed) */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-400 text-sm font-mono">
            קוד שגיאה: {severity === 'error' ? '500' : severity === 'warning' ? '404' : '200'}
          </p>
        </div>
      </div>

      {/* Bottom Wave Animation */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <svg className="relative block w-full h-24" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path 
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
            className={`fill-current text-white opacity-20`}
          >
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="translate"
              values="0 0;-200 0;0 0"
              dur="20s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </div>
  );
}