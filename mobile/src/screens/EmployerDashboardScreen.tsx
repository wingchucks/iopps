import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import {
  getEmployerStats,
  getEmployerJobs,
  getEmployerApplications,
  formatTimestamp,
} from "../lib/firestore";
import type { JobPosting, JobApplication } from "../types";
import { logger } from "../lib/logger";

const WEB_DASHBOARD_URL = "https://iopps.ca/organization/dashboard";
const WEB_PROFILE_URL = "https://iopps.ca/organization/profile";

export default function EmployerDashboardScreen() {
  const navigation = useNavigation();
  const { user, isEmployerPending, employerProfile, refreshAccountState } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    unreadMessages: 0,
  });
  const [recentJobs, setRecentJobs] = useState<JobPosting[]>([]);
  const [recentApplications, setRecentApplications] = useState<JobApplication[]>([]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [statsData, jobs, applications] = await Promise.all([
        getEmployerStats(user.uid),
        getEmployerJobs(user.uid),
        getEmployerApplications(user.uid),
      ]);
      setStats(statsData);
      setRecentJobs(jobs.slice(0, 3));
      setRecentApplications(applications.slice(0, 5));
    } catch (error) {
      logger.error("Error loading employer dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Refresh account state in case employer was approved
      refreshAccountState();
    }, [user, refreshAccountState])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "#3B82F6"; // blue
      case "reviewed":
        return "#F59E0B"; // amber
      case "shortlisted":
        return "#14B8A6"; // teal
      case "hired":
        return "#22C55E"; // green
      case "rejected":
        return "#EF4444"; // red
      default:
        return "#64748B"; // gray
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#14B8A6"
        />
      }
    >
      {/* Pending Employer Banner */}
      {isEmployerPending && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerIcon}>⏳</Text>
          <View style={styles.pendingBannerContent}>
            <Text style={styles.pendingBannerTitle}>Account Pending Approval</Text>
            <Text style={styles.pendingBannerText}>
              Your employer account is being reviewed. You can set up your organization profile while we review your application.
            </Text>
            <TouchableOpacity
              style={styles.pendingBannerButton}
              onPress={() => Linking.openURL(WEB_PROFILE_URL)}
            >
              <Text style={styles.pendingBannerButtonText}>Complete Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isEmployerPending ? "Welcome, " + (employerProfile?.organizationName || "Employer") : "Employer Dashboard"}
        </Text>
        <Text style={styles.subtitle}>
          {isEmployerPending
            ? "Complete your profile while we review your application"
            : "Manage your opportunities and track applications"}
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activeJobs}</Text>
          <Text style={styles.statLabel}>Active Jobs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalApplications}</Text>
          <Text style={styles.statLabel}>Applications</Text>
        </View>
        <View style={[styles.statCard, stats.pendingApplications > 0 && styles.statCardHighlight]}>
          <Text style={styles.statNumber}>{stats.pendingApplications}</Text>
          <Text style={styles.statLabel}>Pending Review</Text>
        </View>
        <View style={[styles.statCard, stats.unreadMessages > 0 && styles.statCardHighlight]}>
          <Text style={styles.statNumber}>{stats.unreadMessages}</Text>
          <Text style={styles.statLabel}>Unread Messages</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate("EmployerJobs")}
          >
            <Text style={styles.actionIcon}>💼</Text>
            <Text style={styles.actionText}>View Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate("EmployerApplications")}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Applications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate("Messages")}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Applications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Applications</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("EmployerApplications")}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentApplications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No applications yet</Text>
          </View>
        ) : (
          recentApplications.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.applicationCard}
              onPress={() =>
                (navigation as any).navigate("ApplicationDetail", {
                  applicationId: app.id,
                })
              }
            >
              <View style={styles.applicationHeader}>
                <Text style={styles.applicantName} numberOfLines={1}>
                  {app.memberDisplayName || app.memberEmail || "Applicant"}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(app.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(app.status) },
                    ]}
                  >
                    {app.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {app.jobTitle || "Job Position"}
              </Text>
              <Text style={styles.applicationDate}>
                Applied {formatTimestamp(app.createdAt)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Jobs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Job Postings</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("EmployerJobs")}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>
              {isEmployerPending
                ? "You can post jobs once your account is approved"
                : "No job postings yet"}
            </Text>
            {!isEmployerPending && (
              <TouchableOpacity
                style={styles.postJobButton}
                onPress={() => Linking.openURL(WEB_DASHBOARD_URL)}
              >
                <Text style={styles.postJobButtonText}>Post a Job on Web</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          recentJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() =>
                (navigation as any).navigate("JobDetail", { jobId: job.id })
              }
            >
              <View style={styles.jobHeader}>
                <Text style={styles.jobCardTitle} numberOfLines={1}>
                  {job.title}
                </Text>
                <View
                  style={[
                    styles.activeBadge,
                    !job.active && styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.activeBadgeText,
                      !job.active && styles.inactiveBadgeText,
                    ]}
                  >
                    {job.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
              <Text style={styles.jobLocation}>{job.location}</Text>
              <View style={styles.jobStats}>
                <Text style={styles.jobStatText}>
                  {job.viewsCount || 0} views
                </Text>
                <Text style={styles.jobStatDot}>•</Text>
                <Text style={styles.jobStatText}>
                  {job.applicationsCount || 0} applications
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Web Dashboard Link */}
      <TouchableOpacity
        style={styles.webDashboardButton}
        onPress={() => Linking.openURL(WEB_DASHBOARD_URL)}
      >
        <Text style={styles.webDashboardIcon}>🌐</Text>
        <View style={styles.webDashboardContent}>
          <Text style={styles.webDashboardTitle}>Full Dashboard on Web</Text>
          <Text style={styles.webDashboardSubtitle}>
            Post jobs, manage billing, and more
          </Text>
        </View>
        <Text style={styles.webDashboardArrow}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  // Pending Employer Banner
  pendingBanner: {
    flexDirection: "row",
    backgroundColor: "#F59E0B20",
    borderWidth: 1,
    borderColor: "#F59E0B40",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pendingBannerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  pendingBannerContent: {
    flex: 1,
  },
  pendingBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FCD34D",
    marginBottom: 4,
  },
  pendingBannerText: {
    fontSize: 14,
    color: "#FDE68A",
    lineHeight: 20,
    marginBottom: 12,
  },
  pendingBannerButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  pendingBannerButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statCardHighlight: {},
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#14B8A6",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
    overflow: "hidden",
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  seeAllText: {
    fontSize: 14,
    color: "#14B8A6",
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 12,
  },
  postJobButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  postJobButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  applicationCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  jobTitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 4,
  },
  applicationDate: {
    fontSize: 12,
    color: "#64748B",
  },
  jobCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  jobCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    flex: 1,
    marginRight: 8,
  },
  activeBadge: {
    backgroundColor: "#22C55E20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
  },
  inactiveBadge: {
    backgroundColor: "#64748B20",
  },
  inactiveBadgeText: {
    color: "#64748B",
  },
  jobLocation: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 8,
  },
  jobStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  jobStatText: {
    fontSize: 12,
    color: "#64748B",
  },
  jobStatDot: {
    fontSize: 12,
    color: "#64748B",
    marginHorizontal: 6,
  },
  webDashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  webDashboardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  webDashboardContent: {
    flex: 1,
  },
  webDashboardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  webDashboardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  webDashboardArrow: {
    fontSize: 24,
    color: "#64748B",
  },
});
