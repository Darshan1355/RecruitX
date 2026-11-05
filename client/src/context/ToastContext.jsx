import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', title = '') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast = { id, message, type, title };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = (msg, title) => showToast(msg, 'success', title);
  const error = (msg, title) => showToast(msg, 'error', title);
  const info = (msg, title) => showToast(msg, 'info', title);
  const warning = (msg, title) => showToast(msg, 'warning', title);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 ${
                isSuccess
                  ? 'bg-navy-900/95 border-emerald-500/40 text-emerald-200 shadow-glow-cyan'
                  : isError
                  ? 'bg-navy-900/95 border-rose-500/40 text-rose-200'
                  : isWarning
                  ? 'bg-navy-900/95 border-amber-500/40 text-amber-200'
                  : 'bg-navy-900/95 border-cyan-500/40 text-cyan-200 shadow-glow-cyan'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-cyan-400" />}
              </div>

              <div className="flex-1 min-w-0">
                {t.title && <h5 className="font-bold text-xs text-white mb-0.5">{t.title}</h5>}
                <p className="text-xs leading-relaxed text-slate-200">{t.message}</p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
