import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

interface RetryableViewProps {
  error: Error | string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  title?: string;
  message?: string;
}

/**
 * A component that displays an error state with a retry button
 */
export function RetryableView({
  error,
  onRetry,
  isRetrying = false,
  title = "Something went wrong",
  message,
}: RetryableViewProps) {
  const errorMessage =
    message ||
    (error instanceof Error ? error.message : error) ||
    "An unexpected error occurred. Please try again.";

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>😕</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{errorMessage}</Text>

      <TouchableOpacity
        style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
        onPress={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? (
          <ActivityIndicator size="small" color="#0F172A" />
        ) : (
          <>
            <Text style={styles.retryIcon}>↻</Text>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

/**
 * A smaller inline retry component for use within lists or cards
 */
export function InlineRetry({
  onRetry,
  isRetrying = false,
  message = "Failed to load",
}: {
  onRetry: () => void;
  isRetrying?: boolean;
  message?: string;
}) {
  return (
    <View style={styles.inlineContainer}>
      <Text style={styles.inlineMessage}>{message}</Text>
      <TouchableOpacity
        style={styles.inlineButton}
        onPress={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? (
          <ActivityIndicator size="small" color="#14B8A6" />
        ) : (
          <Text style={styles.inlineButtonText}>Retry</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#0F172A",
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14B8A6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 140,
    justifyContent: "center",
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryIcon: {
    fontSize: 16,
    color: "#0F172A",
    marginRight: 8,
    fontWeight: "700",
  },
  retryButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
  // Inline styles
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    margin: 16,
  },
  inlineMessage: {
    color: "#94A3B8",
    fontSize: 14,
    marginRight: 12,
  },
  inlineButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: "#14B8A620",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#14B8A640",
  },
  inlineButtonText: {
    color: "#14B8A6",
    fontSize: 14,
    fontWeight: "600",
  },
});
