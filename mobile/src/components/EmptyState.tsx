import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/**
 * Generic empty state component
 */
export function EmptyState({
  icon = '📭',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]} testID="empty-state">
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Empty state for jobs list
 */
export function EmptyJobsState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon="💼"
      title="No Jobs Found"
      message="We couldn't find any jobs matching your criteria. Try adjusting your filters or check back later."
      actionLabel={onRefresh ? "Refresh" : undefined}
      onAction={onRefresh}
    />
  );
}

/**
 * Empty state for saved jobs
 */
export function EmptySavedJobsState({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="🔖"
      title="No Saved Jobs"
      message="Save jobs you're interested in to easily find them later. Tap the bookmark icon on any job to save it."
      actionLabel={onBrowse ? "Browse Jobs" : undefined}
      onAction={onBrowse}
    />
  );
}

/**
 * Empty state for applications
 */
export function EmptyApplicationsState({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="📝"
      title="No Applications Yet"
      message="You haven't applied to any jobs yet. Start exploring opportunities and submit your first application."
      actionLabel={onBrowse ? "Find Jobs" : undefined}
      onAction={onBrowse}
    />
  );
}

/**
 * Empty state for notifications
 */
export function EmptyNotificationsState() {
  return (
    <EmptyState
      icon="🔔"
      title="No Notifications"
      message="You're all caught up! When you receive new messages or updates about your applications, they'll appear here."
    />
  );
}

/**
 * Empty state for messages
 */
export function EmptyMessagesState() {
  return (
    <EmptyState
      icon="💬"
      title="No Messages"
      message="Your conversations with employers will appear here. Apply to jobs to start connecting with potential employers."
    />
  );
}

/**
 * Empty state for search results
 */
export function EmptySearchState({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon="🔍"
      title="No Results"
      message={`We couldn't find anything matching "${query}". Try a different search term or browse all listings.`}
      actionLabel={onClear ? "Clear Search" : undefined}
      onAction={onClear}
    />
  );
}

/**
 * Empty state for scholarships
 */
export function EmptyScholarshipsState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon="🎓"
      title="No Scholarships Found"
      message="There are no scholarships available at the moment. Check back soon for new opportunities."
      actionLabel={onRefresh ? "Refresh" : undefined}
      onAction={onRefresh}
    />
  );
}

/**
 * Empty state for conferences
 */
export function EmptyConferencesState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon="🎪"
      title="No Events Found"
      message="There are no conferences or gatherings listed right now. Check back for upcoming events."
      actionLabel={onRefresh ? "Refresh" : undefined}
      onAction={onRefresh}
    />
  );
}

/**
 * Empty state for vendors/shop
 */
export function EmptyVendorsState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon="🏪"
      title="No Vendors Found"
      message="No Indigenous-owned businesses match your search. Try different filters or browse all vendors."
      actionLabel={onRefresh ? "Browse All" : undefined}
      onAction={onRefresh}
    />
  );
}

/**
 * Empty state for job alerts
 */
export function EmptyJobAlertsState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon="⏰"
      title="No Job Alerts"
      message="Create job alerts to get notified when new jobs match your preferences."
      actionLabel={onCreate ? "Create Alert" : undefined}
      onAction={onCreate}
    />
  );
}

/**
 * Error state (network/loading error)
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="😕"
      title="Something Went Wrong"
      message={message || "We encountered an error loading this content. Please try again."}
      actionLabel={onRetry ? "Try Again" : undefined}
      onAction={onRetry}
    />
  );
}

/**
 * Offline state
 */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="📡"
      title="You're Offline"
      message="Please check your internet connection and try again."
      actionLabel={onRetry ? "Retry" : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#14B8A6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
});
