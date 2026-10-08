import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (options: { type?: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type = 'info', title, message }: { type?: 'success' | 'error' | 'info'; title: string; message?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);
  const error = useCallback((title: string, message?: string) => toast({ type: 'error', title, message }), [toast]);
  const info = useCallback((title: string, message?: string) => toast({ type: 'info', title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-card transition-all duration-300 animate-in slide-in-from-bottom-2',
              t.type === 'success' && 'bg-surface text-primary border-semantic-success/30',
              t.type === 'error' && 'bg-surface text-primary border-semantic-error/30',
              t.type === 'info' && 'bg-surface text-primary border-border'
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-semantic-error shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">{t.title}</p>
              {t.message && <p className="text-xs text-secondary mt-0.5 leading-relaxed">{t.message}</p>}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-secondary/60 hover:text-primary transition-colors p-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
