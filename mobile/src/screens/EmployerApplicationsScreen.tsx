import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import {
  getEmployerApplications,
  updateApplicationStatus,
  formatTimestamp,
} from "../lib/firestore";
import type { JobApplication, ApplicationStatus } from "../types";
import { logger } from "../lib/logger";

type FilterType = "all" | "pending" | "reviewed" | "shortlisted" | "hired" | "rejected";

export default function EmployerApplicationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  const loadApplications = async () => {
    if (!user) return;
    try {
      const apps = await getEmployerApplications(user.uid);
      setApplications(apps);
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

  const handleRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };

  const handleStatusUpdate = async (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    Alert.alert(
      "Update Status",
      `Mark this application as "${newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              await updateApplicationStatus(applicationId, newStatus);
              // Update local state
              setApplications((prev) =>
                prev.map((app) =>
                  app.id === applicationId ? { ...app, status: newStatus } : app
                )
              );
            } catch (error) {
              logger.error("Error updating application status:", error);
              Alert.alert("Error", "Failed to update status. Please try again.");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "#3B82F6";
      case "reviewed":
        return "#F59E0B";
      case "shortlisted":
        return "#14B8A6";
      case "hired":
        return "#22C55E";
      case "rejected":
        return "#EF4444";
      default:
        return "#64748B";
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (filter === "all") return true;
    if (filter === "pending") return app.status === "submitted" || app.status === "reviewed";
    return app.status === filter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "hired", label: "Hired" },
    { key: "rejected", label: "Rejected" },
  ];

  const renderApplication = ({ item }: { item: JobApplication }) => (
    <TouchableOpacity
      style={styles.applicationCard}
      onPress={() =>
        (navigation as any).navigate("ApplicationDetail", {
          applicationId: item.id,
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.applicationHeader}>
        <View style={styles.applicantInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.memberDisplayName || item.memberEmail || "A").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.applicantDetails}>
            <Text style={styles.applicantName} numberOfLines={1}>
              {item.memberDisplayName || "Applicant"}
            </Text>
            <Text style={styles.applicantEmail} numberOfLines={1}>
              {item.memberEmail}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.jobInfo}>
        <Text style={styles.jobTitle} numberOfLines={1}>
          {item.jobTitle || "Job Position"}
        </Text>
        <Text style={styles.applicationDate}>
          Applied {formatTimestamp(item.createdAt)}
        </Text>
      </View>

      {item.coverLetter && (
        <Text style={styles.coverLetterPreview} numberOfLines={2}>
          "{item.coverLetter}"
        </Text>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {item.resumeUrl && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(item.resumeUrl!)}
          >
            <Text style={styles.actionButtonText}>View Resume</Text>
          </TouchableOpacity>
        )}

        {item.status === "submitted" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.reviewButton]}
              onPress={() => handleStatusUpdate(item.id, "reviewed")}
            >
              <Text style={styles.reviewButtonText}>Mark Reviewed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.shortlistButton]}
              onPress={() => handleStatusUpdate(item.id, "shortlisted")}
            >
              <Text style={styles.shortlistButtonText}>Shortlist</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === "reviewed" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.shortlistButton]}
              onPress={() => handleStatusUpdate(item.id, "shortlisted")}
            >
              <Text style={styles.shortlistButtonText}>Shortlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleStatusUpdate(item.id, "rejected")}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === "shortlisted" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.hireButton]}
              onPress={() => handleStatusUpdate(item.id, "hired")}
            >
              <Text style={styles.hireButtonText}>Mark Hired</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleStatusUpdate(item.id, "rejected")}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            (navigation as any).navigate("Conversation", {
              conversationId: item.id,
              memberId: item.memberId,
            })
          }
        >
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>
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
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === item.key && styles.filterTabActive,
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === item.key && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Applications List */}
      <FlatList
        data={filteredApplications}
        keyExtractor={(item) => item.id}
        renderItem={renderApplication}
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
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Applications</Text>
            <Text style={styles.emptyText}>
              {filter === "all"
                ? "Applications will appear here when candidates apply to your jobs."
                : `No ${filter} applications found.`}
            </Text>
          </View>
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
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: "#14B8A6",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
  },
  filterTabTextActive: {
    color: "#0F172A",
  },
  listContent: {
    padding: 16,
  },
  applicationCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  applicantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  applicantDetails: {
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  applicantEmail: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  jobInfo: {
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },
  applicationDate: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  coverLetterPreview: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
    marginBottom: 12,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#334155",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  reviewButton: {
    backgroundColor: "#F59E0B20",
  },
  reviewButtonText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
  },
  shortlistButton: {
    backgroundColor: "#14B8A620",
  },
  shortlistButtonText: {
    color: "#14B8A6",
    fontSize: 12,
    fontWeight: "600",
  },
  hireButton: {
    backgroundColor: "#22C55E20",
  },
  hireButtonText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "600",
  },
  rejectButton: {
    backgroundColor: "#EF444420",
  },
  rejectButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
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
  },
});
