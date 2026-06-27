import React, { useEffect } from 'react';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const getToastIcon = (type: string): string => {
  switch (type) {
    case 'success': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    case 'info': return 'ℹ️';
    default: return 'ℹ️';
  }
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="fm-toast">
      <div className="fm-toast__icon">{getToastIcon(toast.type)}</div>
      <div className="fm-toast__content">
        <div className="fm-toast__message">{toast.message}</div>
      </div>
      <button
        className="fm-toast__dismiss"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fm-toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
