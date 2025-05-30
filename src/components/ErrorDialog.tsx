import React from 'react';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, X } from 'lucide-react';

export default function ErrorDialog({
  isOpen,
  onClose,
  title = 'שגיאה בלתי צפויה',
  description = 'משהו השתבש. נסה שוב או פנה לתמיכה.',
  severity = 'error', // error | warning | info
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  severity?: 'error' | 'warning' | 'info';
}) {
  const colorMap = {
    error: 'text-red-600 bg-red-100',
    warning: 'text-yellow-600 bg-yellow-100',
    info: 'text-blue-600 bg-blue-100'
  };

  const icon = <AlertTriangle className={`w-6 h-6 ${colorMap[severity]}`} />;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center gap-2">
              {icon}
              <Dialog.Title className="text-lg font-bold text-gray-800">{title}</Dialog.Title>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 text-gray-700 text-sm">{description}</div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
