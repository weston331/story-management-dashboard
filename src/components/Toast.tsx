import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-6 end-6 z-50 flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-3rem)] sm:max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void; key?: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = {
    success: {
      bg: 'bg-[#14231c]',
      border: 'border-emerald-500/40',
      text: 'text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    },
    error: {
      bg: 'bg-[#2a1414]',
      border: 'border-red-500/40',
      text: 'text-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
    },
    info: {
      bg: 'bg-[#1b1c24]',
      border: 'border-[#D4AF37]/40',
      text: 'text-stone-200',
      icon: <Info className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />,
      glow: 'shadow-[0_0_15px_rgba(212,175,55,0.15)]',
    },
  }[toast.type];

  return (
    <motion.div
      id={`toast-${toast.id}`}
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      layout
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${config.bg} ${config.border} ${config.text} ${config.glow} backdrop-blur-md relative`}
    >
      {config.icon}
      <div className="flex-1 text-sm font-medium leading-relaxed pe-6 text-start">
        {toast.message}
      </div>
      <button
        id={`dismiss-toast-${toast.id}-btn`}
        onClick={() => onDismiss(toast.id)}
        className="absolute top-3 end-3 text-stone-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
