import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getEmployerJobs, formatTimestamp } from "../lib/firestore";
import type { JobPosting } from "../types";
import { logger } from "../lib/logger";

const WEB_DASHBOARD_URL = "https://iopps.ca/organization/dashboard";

export default function EmployerJobsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const loadJobs = async () => {
    if (!user) return;
    try {
      const jobsList = await getEmployerJobs(user.uid);
      setJobs(jobsList);
    } catch (error) {
      logger.error("Error loading employer jobs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [user])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === "all") return true;
    if (filter === "active") return job.active === true;
    return job.active === false;
  });

  const formatSalary = (job: JobPosting) => {
    if (!job.salaryRange) return null;
    if (typeof job.salaryRange === "string") return job.salaryRange;
    if (job.salaryRange.disclosed === false) return "Salary not disclosed";
    const { min, max, currency = "CAD" } = job.salaryRange;
    if (min && max) {
      return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`;
    }
    if (min) return `From $${min.toLocaleString()} ${currency}`;
    if (max) return `Up to $${max.toLocaleString()} ${currency}`;
    return null;
  };

  const renderJob = ({ item }: { item: JobPosting }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => (navigation as any).navigate("JobDetail", { jobId: item.id })}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={[styles.statusBadge, !item.active && styles.inactiveBadge]}>
          <Text style={[styles.statusText, !item.active && styles.inactiveText]}>
            {item.active ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>💼</Text>
          <Text style={styles.detailText}>{item.employmentType}</Text>
        </View>
        {formatSalary(item) && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>💰</Text>
            <Text style={styles.detailText}>{formatSalary(item)}</Text>
          </View>
        )}
      </View>

      {/* Tags */}
      <View style={styles.tagsRow}>
        {item.remoteFlag && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>Remote</Text>
          </View>
        )}
        {item.quickApplyEnabled && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>Quick Apply</Text>
          </View>
        )}
        {item.indigenousPreference && (
          <View style={[styles.tag, styles.indigenousTag]}>
            <Text style={[styles.tagText, styles.indigenousTagText]}>Indigenous Preferred</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{item.viewsCount || 0}</Text>
          <Text style={styles.statLabel}>Views</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{item.applicationsCount || 0}</Text>
          <Text style={styles.statLabel}>Applications</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Posted</Text>
          <Text style={styles.statDate}>{formatTimestamp(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
            All ({jobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "active" && styles.filterTabActive]}
          onPress={() => setFilter("active")}
        >
          <Text style={[styles.filterText, filter === "active" && styles.filterTextActive]}>
            Active ({jobs.filter((j) => j.active).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "inactive" && styles.filterTabActive]}
          onPress={() => setFilter("inactive")}
        >
          <Text style={[styles.filterText, filter === "inactive" && styles.filterTextActive]}>
            Inactive ({jobs.filter((j) => !j.active).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#14B8A6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No Job Postings</Text>
            <Text style={styles.emptyText}>
              {filter === "all"
                ? "Post your first job to start receiving applications."
                : `No ${filter} jobs found.`}
            </Text>
            <TouchableOpacity
              style={styles.postJobButton}
              onPress={() => Linking.openURL(WEB_DASHBOARD_URL)}
            >
              <Text style={styles.postJobButtonText}>Post a Job on Web</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          jobs.length > 0 ? (
            <TouchableOpacity
              style={styles.webButton}
              onPress={() => Linking.openURL(WEB_DASHBOARD_URL)}
            >
              <Text style={styles.webButtonIcon}>🌐</Text>
              <Text style={styles.webButtonText}>Edit or Post Jobs on Web</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 0,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#14B8A6",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  filterTextActive: {
    color: "#0F172A",
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: "#22C55E20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22C55E",
  },
  inactiveBadge: {
    backgroundColor: "#64748B20",
  },
  inactiveText: {
    color: "#64748B",
  },
  jobDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },
  indigenousTag: {
    backgroundColor: "#14B8A620",
  },
  indigenousTagText: {
    color: "#14B8A6",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  statDate: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#334155",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
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
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  postJobButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  postJobButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  webButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  webButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  webButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
  },
});
