import React, { createContext, useContext, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { colors } from "@/src/constants/colors";
import type { ToastItem, ToastType } from "@/src/features/feedback/toast.types";

type ToastContextValue = { showToast: (message: string, type?: ToastType) => void; };
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  function showToast(message: string, type: ToastType = "info") {
    const id = String(Date.now());
    setToast({ id, message, type });
    setTimeout(() => { setToast((current) => (current?.id === id ? null : current)); }, 2500);
  }
  const bgColor = toast?.type === "success" ? colors.success : toast?.type === "error" ? colors.danger : colors.text;
  const value = useMemo(() => ({ showToast }), []);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <View style={{ position: "absolute", left: 16, right: 16, bottom: 24, backgroundColor: bgColor, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 }}><Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>{toast.message}</Text></View> : null}
    </ToastContext.Provider>
  );
}

export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error("useToast must be used inside ToastProvider"); return context; }
