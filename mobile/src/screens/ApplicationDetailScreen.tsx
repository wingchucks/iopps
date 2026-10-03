import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { ApiError } from "../lib/api";
import { EMPLOYER_STATUSES, getEmployerApplication, updateApplicationStatus } from "../lib/employer";
import { formatTimestamp } from "../lib/dates";
import { APPLICATION_STATUS_CONFIG as STATUS_CONFIG } from "../lib/applicationStatus";
import type { ApplicationStatus, EmployerApplication } from "../types";
import { logger } from "../lib/logger";

interface ApplicationDetailScreenProps {
  route: any;
  navigation: any;
}

type EmployerStatus = Exclude<ApplicationStatus, "withdrawn">;

export default function ApplicationDetailScreen({
  route,
  navigation,
}: ApplicationDetailScreenProps) {
  // Lists pass the application they show; otherwise it is looked up by ID.
  const { applicationId, application: listed } = route.params as {
    applicationId: string;
    application?: EmployerApplication;
  };
  const [application, setApplication] = useState<EmployerApplication | null>(listed ?? null);
  const [loading, setLoading] = useState(!listed);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (listed) return;
    const fetchApplication = async () => {
      try {
        setApplication(await getEmployerApplication(applicationId));
      } catch (error) {
        logger.error("Error fetching application:", error);
        Alert.alert(
          "Error",
          error instanceof ApiError ? error.message : "Failed to load application details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId, listed]);

  const handleStatusUpdate = async (newStatus: EmployerStatus) => {
    if (!application) return;

    Alert.alert(
      "Update Status",
      `Change application status to "${STATUS_CONFIG[newStatus].label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            setUpdating(true);
            try {
              await updateApplicationStatus(application.id, newStatus);
              setApplication({ ...application, status: newStatus });
              Alert.alert("Success", "Application status updated");
            } catch (error) {
              logger.error("Error updating application status:", error);
              Alert.alert(
                "Error",
                error instanceof ApiError ? error.message : "Failed to update status"
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleContactApplicant = () => {
    if (!application) return;

    if (application.applicantEmail) {
      Linking.openURL(`mailto:${application.applicantEmail}`);
    } else {
      Alert.alert("No Email", "Applicant email is not available");
    }
  };

  const handleViewResume = () => {
    if (application?.resumeUrl) {
      Linking.openURL(application.resumeUrl);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Application not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.submitted;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
        <Text style={styles.appliedDate}>
          Applied {formatTimestamp(application.appliedAt)}
        </Text>
      </View>

      {/* Applicant Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Applicant</Text>
        <View style={styles.card}>
          <Text style={styles.applicantName}>
            {application.applicantName || "Name not provided"}
          </Text>
          {!!application.applicantHeadline && (
            <Text style={styles.applicantEmail}>{application.applicantHeadline}</Text>
          )}
          <Text style={styles.applicantEmail}>
            {application.applicantEmail || "Email not provided"}
          </Text>
          {!!application.applicantLocation && (
            <Text style={styles.applicantEmail}>{application.applicantLocation}</Text>
          )}
        </View>
      </View>

      {/* Job Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Applied For</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("JobDetail", { jobId: application.jobId })
          }
        >
          <Text style={styles.jobTitle}>
            {application.jobTitle || "Job Position"}
          </Text>
          <Text style={styles.viewJobLink}>View job posting →</Text>
        </TouchableOpacity>
      </View>

      {/* Resume */}
      {!!application.resumeUrl && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resume</Text>
          <TouchableOpacity style={styles.resumeCard} onPress={handleViewResume}>
            <Text style={styles.resumeIcon}>📄</Text>
            <View style={styles.resumeInfo}>
              <Text style={styles.resumeText}>{application.resumeFileName || "View Resume"}</Text>
              <Text style={styles.resumeSubtext}>Tap to open</Text>
            </View>
            <Text style={styles.resumeArrow}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cover Letter */}
      {!!application.coverLetter && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cover Letter</Text>
          <View style={styles.card}>
            <Text style={styles.coverLetter}>{application.coverLetter}</Text>
          </View>
        </View>
      )}

      {!!application.references && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>References</Text>
          <View style={styles.card}>
            <Text style={styles.coverLetter}>{application.references}</Text>
          </View>
        </View>
      )}

      {/* Status Update: a withdrawn application cannot be reopened by the employer */}
      {application.status !== "withdrawn" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <View style={styles.statusOptions}>
            {EMPLOYER_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  application.status === status && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusUpdate(status)}
                disabled={updating || application.status === status}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    application.status === status &&
                      styles.statusOptionTextActive,
                  ]}
                >
                  {STATUS_CONFIG[status].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactApplicant}
        >
          <Text style={styles.contactButtonText}>Contact Applicant</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 40,
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
  errorContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  appliedDate: {
    fontSize: 13,
    color: "#64748B",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  applicantName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  applicantEmail: {
    fontSize: 14,
    color: "#94A3B8",
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  viewJobLink: {
    fontSize: 14,
    color: "#14B8A6",
    fontWeight: "500",
  },
  resumeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14B8A620",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#14B8A640",
  },
  resumeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  resumeInfo: {
    flex: 1,
  },
  resumeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  resumeSubtext: {
    fontSize: 13,
    color: "#94A3B8",
  },
  resumeArrow: {
    fontSize: 18,
    color: "#14B8A6",
  },
  coverLetter: {
    fontSize: 15,
    color: "#CBD5E1",
    lineHeight: 24,
  },
  statusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statusOptionActive: {
    backgroundColor: "#14B8A620",
    borderColor: "#14B8A6",
  },
  statusOptionText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },
  statusOptionTextActive: {
    color: "#14B8A6",
  },
  actions: {
    marginTop: 8,
  },
  contactButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  contactButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
});
