import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Toast, ToastType } from './Toast';

type ToastOptions = {
  message: string;
  type?: ToastType;
  duration?: number; // ms
  actionLabel?: string;
  onActionPress?: () => void;
};

type ToastContextValue = {
  showToast: (opts: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [actionLabel, setActionLabel] = useState<string | undefined>(undefined);
  const actionRef = useRef<(() => void) | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setVisible(false);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  actionRef.current = null;
    setActionLabel(undefined);
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    setMessage(opts.message);
    setType(opts.type ?? 'info');
    setActionLabel(opts.actionLabel);
  actionRef.current = opts.onActionPress ?? null;
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hide(), opts.duration ?? 2500);
  }, [hide]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        visible={visible}
        message={message}
        type={type}
        actionLabel={actionLabel}
        onActionPress={() => {
          actionRef.current?.();
          hide();
        }}
      />
    </ToastContext.Provider>
  );
};
