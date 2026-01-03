// src/shared/components/Toast.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast Provider Component
 *
 * Wrap your app with this provider to enable toast notifications
 *
 * @example
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(7);
      const newToast: Toast = {
        id,
        duration: 5000,
        ...toast,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, newToast.duration);
      }
    },
    [hideToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

/**
 * useToast Hook
 *
 * Access toast functionality from any component
 *
 * @example
 * const { showToast } = useToast();
 * showToast({ type: "success", title: "Saved!", message: "Your changes have been saved." });
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

/**
 * Toast Container Component
 *
 * Renders all active toasts
 */
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed top-0 end-0 flex max-h-screen w-full flex-col-reverse gap-3 p-4 sm:top-4 sm:max-w-md sm:flex-col">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Toast Item Component
 *
 * Individual toast notification
 */
interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
  };

  const colors = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-600",
      text: "text-green-900",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "text-red-600",
      text: "text-red-900",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      text: "text-blue-900",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      icon: "text-yellow-600",
      text: "text-yellow-900",
    },
  };

  const color = colors[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 40,
      }}
      className="pointer-events-auto w-full"
    >
      <div
        className={`relative flex items-start gap-3 rounded-lg border p-4 shadow-lg ${color.bg} ${color.border}`}
      >
        {/* Icon */}
        <div className={`${color.icon}`}>{icons[toast.type]}</div>

        {/* Content */}
        <div className="flex-1 pt-0.5">
          <h3 className={`font-semibold ${color.text}`}>{toast.title}</h3>
          {toast.message && (
            <p className={`mt-1 text-sm ${color.text} opacity-90`}>
              {toast.message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onClose(toast.id)}
          className={`rounded-md p-1 transition-colors hover:bg-black/5 ${color.icon}`}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/**
 * Standalone toast functions for convenience
 */
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    // This requires ToastProvider to be present
    const event = new CustomEvent("show-toast", {
      detail: { type: "success", title, message, duration },
    });
    window.dispatchEvent(event);
  },
  error: (title: string, message?: string, duration?: number) => {
    const event = new CustomEvent("show-toast", {
      detail: { type: "error", title, message, duration },
    });
    window.dispatchEvent(event);
  },
  info: (title: string, message?: string, duration?: number) => {
    const event = new CustomEvent("show-toast", {
      detail: { type: "info", title, message, duration },
    });
    window.dispatchEvent(event);
  },
  warning: (title: string, message?: string, duration?: number) => {
    const event = new CustomEvent("show-toast", {
      detail: { type: "warning", title, message, duration },
    });
    window.dispatchEvent(event);
  },
};
