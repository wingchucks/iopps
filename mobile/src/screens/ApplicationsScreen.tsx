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
import { getMemberApplications, formatTimestamp } from "../lib/firestore";
import type { JobApplication, ApplicationStatus } from "../types";
import { logger } from "../lib/logger";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: "Submitted", color: "#3B82F6", bg: "#3B82F620" },
  reviewed: { label: "Reviewed", color: "#F59E0B", bg: "#F59E0B20" },
  shortlisted: { label: "Shortlisted", color: "#10B981", bg: "#10B98120" },
  rejected: { label: "Not Selected", color: "#EF4444", bg: "#EF444420" },
  hired: { label: "Hired", color: "#22C55E", bg: "#22C55E20" },
  withdrawn: { label: "Withdrawn", color: "#64748B", bg: "#64748B20" },
};

export default function ApplicationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");

  const loadApplications = async () => {
    if (!user) return;
    try {
      const data = await getMemberApplications(user.uid);
      setApplications(data);
    } catch (error) {
      logger.error("Error loading applications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };

  const filteredApplications = applications.filter((app) => {
    if (filter === "all") return true;
    if (filter === "active") {
      return ["submitted", "reviewed", "shortlisted"].includes(app.status);
    }
    return ["rejected", "hired", "withdrawn"].includes(app.status);
  });

  const renderApplicationCard = ({ item }: { item: JobApplication }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.submitted;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          (navigation as any).navigate("JobDetail", { jobId: item.jobId })
        }
      >
        <View style={styles.cardHeader}>
          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
          >
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <Text style={styles.jobTitle}>{item.jobTitle || "Job Position"}</Text>
        <Text style={styles.employerName}>
          {item.jobEmployerName || "Employer"}
        </Text>

        {item.jobLocation && (
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{item.jobLocation}</Text>
          </View>
        )}

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Applied:</Text>
          <Text style={styles.dateText}>{formatTimestamp(item.createdAt)}</Text>
        </View>

        {item.updatedAt && item.status !== "submitted" && (
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Updated:</Text>
            <Text style={styles.dateText}>
              {formatTimestamp(item.updatedAt)}
            </Text>
          </View>
        )}

        {item.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Note from employer:</Text>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>Sign in Required</Text>
        <Text style={styles.messageText}>
          Please sign in to view your applications.
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
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Applications</Text>
        <Text style={styles.headerSubtitle}>
          {applications.length}{" "}
          {applications.length === 1 ? "application" : "applications"} total
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {applications.filter((a) => a.status === "submitted").length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#F59E0B" }]}>
            {applications.filter((a) => a.status === "reviewed").length}
          </Text>
          <Text style={styles.statLabel}>Reviewed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#10B981" }]}>
            {applications.filter((a) => a.status === "shortlisted").length}
          </Text>
          <Text style={styles.statLabel}>Shortlisted</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(["all", "active", "closed"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredApplications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>
            {applications.length === 0
              ? "No applications yet"
              : "No applications match this filter"}
          </Text>
          <Text style={styles.emptyText}>
            {applications.length === 0
              ? "Apply to jobs and track your progress here."
              : "Try selecting a different filter."}
          </Text>
          {applications.length === 0 && (
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => (navigation as any).navigate("Jobs")}
            >
              <Text style={styles.browseButtonText}>Browse Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredApplications}
          renderItem={renderApplicationCard}
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
  statsRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3B82F6",
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#1E293B",
  },
  filterActive: {
    backgroundColor: "#14B8A620",
  },
  filterText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#14B8A6",
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
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
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
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  dateRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 13,
    color: "#64748B",
    width: 70,
  },
  dateText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  noteContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#0F172A",
    borderRadius: 8,
  },
  noteLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: "#F8FAFC",
    lineHeight: 20,
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
