import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    action?: { label: string; onPress: () => void }
  ) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const TOAST_DURATION = 4000;
const TOAST_CONFIG: Record<ToastType, { icon: string; bgColor: string; borderColor: string }> = {
  success: { icon: "✓", bgColor: "#059669", borderColor: "#10B981" },
  error: { icon: "✕", bgColor: "#DC2626", borderColor: "#EF4444" },
  warning: { icon: "⚠", bgColor: "#D97706", borderColor: "#F59E0B" },
  info: { icon: "ℹ", bgColor: "#2563EB", borderColor: "#3B82F6" },
};

function ToastItem({
  toast,
  onHide,
}: {
  toast: Toast;
  onHide: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TOAST_CONFIG[toast.type];

  React.useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after duration
    const timer = setTimeout(() => {
      hideToast();
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.toastIcon}>
        <Text style={styles.toastIconText}>{config.icon}</Text>
      </View>
      <Text style={styles.toastMessage} numberOfLines={2}>
        {toast.message}
      </Text>
      {toast.action && (
        <TouchableOpacity
          style={styles.toastAction}
          onPress={() => {
            toast.action?.onPress();
            hideToast();
          }}
        >
          <Text style={styles.toastActionText}>{toast.action.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.toastClose} onPress={hideToast}>
        <Text style={styles.toastCloseText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();
  const toastIdRef = useRef(0);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      action?: { label: string; onPress: () => void }
    ) => {
      const id = `toast-${toastIdRef.current++}`;
      setToasts((prev) => [...prev, { id, message, type, action }]);
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <View style={[styles.toastContainer, { top: insets.top + 10 }]}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingRight: 40,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  toastIconText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  toastMessage: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  toastAction: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
  },
  toastActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  toastClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  toastCloseText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
});
