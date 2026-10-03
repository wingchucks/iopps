import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { listSavedJobs, savedJobStates, unsaveJob, type SavedJobState } from "../lib/savedJobs";
import { formatTimestamp } from "../lib/dates";
import type { SavedJob } from "../types";
import { logger } from "../lib/logger";

const STATE_LABELS: Partial<Record<SavedJobState, string>> = {
  closed: "Closed",
  unavailable: "No longer available",
};

export default function SavedJobsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [states, setStates] = useState<Record<string, SavedJobState>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedJobs = async () => {
    if (!user) return;
    try {
      const data = await listSavedJobs(user.uid);
      setSavedJobs(data);
      // Closed and removed jobs are marked; the list still shows without this.
      savedJobStates(data.map((saved) => saved.jobId))
        .then(setStates)
        .catch((error) => logger.error("Error checking saved jobs:", error));
    } catch (error) {
      logger.error("Error loading saved jobs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSavedJobs();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSavedJobs();
  };

  const removeSavedJob = (saved: SavedJob) => {
    if (!user) return;
    Alert.alert("Remove Saved Job", `Remove "${saved.title || "this job"}" from your saved jobs?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await unsaveJob(user.uid, saved.jobId);
            setSavedJobs((current) => current.filter((item) => item.jobId !== saved.jobId));
          } catch (error) {
            logger.error("Error removing saved job:", error);
            Alert.alert("Error", "Failed to remove this job. Please try again.");
          }
        },
      },
    ]);
  };

  const renderJobCard = ({ item }: { item: SavedJob }) => {
    const stateLabel = STATE_LABELS[states[item.jobId]];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => (navigation as any).navigate("JobDetail", { jobId: item.jobId })}
      >
        {stateLabel && (
          <View style={styles.cardHeader}>
            <View style={styles.closedBadge}>
              <Text style={styles.closedText}>{stateLabel}</Text>
            </View>
          </View>
        )}

        <Text style={styles.jobTitle}>{item.title || "Saved job"}</Text>
        {!!item.employerName && <Text style={styles.employerName}>{item.employerName}</Text>}

        <View style={styles.footerRow}>
          <Text style={styles.savedDate}>Saved {formatTimestamp(item.savedAt)}</Text>
          <TouchableOpacity
            onPress={() => removeSavedJob(item)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title || "this job"} from saved jobs`}
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>Sign in Required</Text>
        <Text style={styles.messageText}>
          Please sign in to view your saved jobs.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => (navigation as any).navigate("SignIn")}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading saved jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Jobs</Text>
        <Text style={styles.headerSubtitle}>
          {savedJobs.length} {savedJobs.length === 1 ? "job" : "jobs"} saved
        </Text>
      </View>

      {savedJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔖</Text>
          <Text style={styles.emptyTitle}>No saved jobs yet</Text>
          <Text style={styles.emptyText}>
            Save jobs you're interested in and they'll appear here.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => (navigation as any).navigate("Jobs")}
          >
            <Text style={styles.browseButtonText}>Browse Jobs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#14B8A6"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  closedBadge: {
    backgroundColor: "#64748B20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closedText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  employerName: {
    fontSize: 14,
    color: "#14B8A6",
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  savedDate: {
    fontSize: 12,
    color: "#64748B",
  },
  removeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  signInButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
});
