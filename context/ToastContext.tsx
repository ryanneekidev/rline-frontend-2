'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastData {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    const duration = type === 'success' ? 3000 : 4000;
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, duration);
  }, []);

  function dismiss() {
    setToast(null);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-4 right-4 left-4 z-50 flex justify-center sm:left-auto sm:justify-end">
          <div
            className={cn(
              'toast-animate flex w-full max-w-sm items-center justify-between gap-3 rounded-lg px-4 py-3 shadow-lg',
              toast.type === 'success' ? 'bg-success text-white' :
              toast.type === 'error' ? 'bg-destructive text-white' :
              'bg-foreground text-background'
            )}
          >
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={dismiss} className="shrink-0 opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
