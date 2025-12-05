import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { listSavedJobs, formatTimestamp } from "../lib/firestore";
import type { SavedJob } from "../types";
import { logger } from "../lib/logger";

export default function SavedJobsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedJobs = async () => {
    if (!user) return;
    try {
      const data = await listSavedJobs(user.uid);
      setSavedJobs(data);
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

  const renderJobCard = ({ item }: { item: SavedJob }) => {
    const job = item.job;
    if (!job) return null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => (navigation as any).navigate("JobDetail", { jobId: job.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {job.featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
            {!job.active && (
              <View style={styles.closedBadge}>
                <Text style={styles.closedText}>Closed</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.employerName}>{job.employerName}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{job.location}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{job.employmentType}</Text>
        </View>

        {job.salaryRange && (
          <Text style={styles.salary}>{job.salaryRange}</Text>
        )}

        <View style={styles.tagsRow}>
          {job.remoteFlag && (
            <View style={[styles.tag, styles.remoteTag]}>
              <Text style={styles.tagText}>Remote</Text>
            </View>
          )}
          {job.indigenousPreference && (
            <View style={[styles.tag, styles.indigenousTag]}>
              <Text style={styles.tagText}>Indigenous Preference</Text>
            </View>
          )}
          {job.quickApplyEnabled && (
            <View style={[styles.tag, styles.quickApplyTag]}>
              <Text style={styles.tagText}>Quick Apply</Text>
            </View>
          )}
        </View>

        <Text style={styles.savedDate}>
          Saved {formatTimestamp(item.createdAt)}
        </Text>
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
  cardHeaderLeft: {
    flexDirection: "row",
    gap: 8,
  },
  featuredBadge: {
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "600",
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  metaDot: {
    color: "#64748B",
    marginHorizontal: 8,
  },
  salary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  remoteTag: {
    backgroundColor: "#3B82F620",
  },
  indigenousTag: {
    backgroundColor: "#14B8A620",
  },
  quickApplyTag: {
    backgroundColor: "#8B5CF620",
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#F8FAFC",
  },
  savedDate: {
    fontSize: 12,
    color: "#64748B",
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
