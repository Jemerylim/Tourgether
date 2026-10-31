// Adapted from https://21st.dev/@ayushmxxn/components/toast-1
import React, { createContext, useCallback, useContext, useState } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

const ToastContext = createContext(null);

const icons = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

// Replaces alert(): `const { showToast } = useToast(); showToast("Event deleted", "success")`.
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[3000] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map(({ id, message, type }) => {
          const Icon = icons[type] || Info;
          return (
            <div
              key={id}
              className="pointer-events-auto flex max-w-md animate-toast-in items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-soft"
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${type === "error" ? "text-mustard" : "text-lagoon-light"}`} aria-hidden="true" />
              <span>{message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside a ToastProvider");
  return context;
};
