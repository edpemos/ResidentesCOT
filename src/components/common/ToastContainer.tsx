import React, { useState, useEffect } from 'react';
import { useToastStore } from '../../store/toastStore';
import type { Toast } from '../../store/toastStore';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

const ICON_MAP = {
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', bar: 'bg-emerald-400' },
  error:   { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25',         bar: 'bg-red-400' },
  warning: { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/25',     bar: 'bg-amber-400' },
  info:    { icon: Info,          color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/25',       bar: 'bg-teal-400' },
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { dismiss } = useToastStore();
  const [exiting, setExiting] = useState(false);
  const { icon: Icon, color, bg, bar } = ICON_MAP[toast.type];

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => dismiss(toast.id), 200);
  };

  // Trigger exit animation shortly before auto-dismiss
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const exitTimer = setTimeout(() => setExiting(true), duration - 220);
    return () => clearTimeout(exitTimer);
  }, [toast.duration]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={clsx(
        'relative flex items-start gap-3 w-full max-w-sm rounded-2xl px-4 py-3.5 shadow-2xl border backdrop-blur-xl overflow-hidden',
        'bg-slate-900/90 dark:bg-slate-950/90',
        bg,
        exiting ? 'toast-exit' : 'toast-enter'
      )}
    >
      {/* Progress bar */}
      <div className={clsx('absolute bottom-0 left-0 h-0.5 rounded-full', bar)}
        style={{
          animation: `shrink ${toast.duration ?? 4000}ms linear forwards`,
          width: '100%'
        }}
      />

      <Icon className={clsx('w-5 h-5 mt-0.5 shrink-0', color)} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Cerrar notificación"
        className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notificaciones"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
