import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { View, Text } from "react-native";

type ToastType = "success" | "error" | "info";

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({
      visible: true,
      message,
      type,
    });

    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      hideToast,
    }),
    [showToast, hideToast]
  );

  const backgroundColor =
    toast.type === "success"
      ? "#16A34A"
      : toast.type === "error"
        ? "#DC2626"
        : "#334155";

  return (
    <ToastContext.Provider value={value}>
      {children}

      {toast.visible ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 100,
            backgroundColor,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 14,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {toast.message}
          </Text>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}