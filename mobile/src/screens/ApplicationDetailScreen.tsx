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
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { formatTimestamp } from "../lib/firestore";
import type { JobApplication, ApplicationStatus } from "../types";
import { logger } from "../lib/logger";

interface ApplicationDetailScreenProps {
  route: any;
  navigation: any;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: "Submitted", color: "#3B82F6", bg: "#3B82F620" },
  reviewed: { label: "Reviewed", color: "#F59E0B", bg: "#F59E0B20" },
  shortlisted: { label: "Shortlisted", color: "#10B981", bg: "#10B98120" },
  rejected: { label: "Not Selected", color: "#EF4444", bg: "#EF444420" },
  hired: { label: "Hired", color: "#22C55E", bg: "#22C55E20" },
  withdrawn: { label: "Withdrawn", color: "#64748B", bg: "#64748B20" },
};

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Not Selected" },
];

export default function ApplicationDetailScreen({
  route,
  navigation,
}: ApplicationDetailScreenProps) {
  const { applicationId } = route.params;
  const { user } = useAuth();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const appDoc = await getDoc(doc(db, "applications", applicationId));
        if (appDoc.exists()) {
          setApplication({ id: appDoc.id, ...appDoc.data() } as JobApplication);
        }
      } catch (error) {
        logger.error("Error fetching application:", error);
        Alert.alert("Error", "Failed to load application details");
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId]);

  const handleStatusUpdate = async (newStatus: ApplicationStatus) => {
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
              await updateDoc(doc(db, "applications", applicationId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
              });
              setApplication({ ...application, status: newStatus });
              Alert.alert("Success", "Application status updated");
            } catch (error) {
              logger.error("Error updating application status:", error);
              Alert.alert("Error", "Failed to update status");
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

    if (application.memberEmail) {
      Linking.openURL(`mailto:${application.memberEmail}`);
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
          Applied {formatTimestamp(application.createdAt)}
        </Text>
      </View>

      {/* Applicant Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Applicant</Text>
        <View style={styles.card}>
          <Text style={styles.applicantName}>
            {application.memberDisplayName || "Name not provided"}
          </Text>
          <Text style={styles.applicantEmail}>
            {application.memberEmail || "Email not provided"}
          </Text>
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
          {application.jobLocation && (
            <Text style={styles.jobLocation}>{application.jobLocation}</Text>
          )}
          <Text style={styles.viewJobLink}>View job posting →</Text>
        </TouchableOpacity>
      </View>

      {/* Resume */}
      {application.resumeUrl && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resume</Text>
          <TouchableOpacity style={styles.resumeCard} onPress={handleViewResume}>
            <Text style={styles.resumeIcon}>📄</Text>
            <View style={styles.resumeInfo}>
              <Text style={styles.resumeText}>View Resume</Text>
              <Text style={styles.resumeSubtext}>Tap to open</Text>
            </View>
            <Text style={styles.resumeArrow}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cover Letter */}
      {application.coverLetter && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cover Letter</Text>
          <View style={styles.card}>
            <Text style={styles.coverLetter}>{application.coverLetter}</Text>
          </View>
        </View>
      )}

      {/* Status Update */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Status</Text>
        <View style={styles.statusOptions}>
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusOption,
                application.status === option.value && styles.statusOptionActive,
              ]}
              onPress={() => handleStatusUpdate(option.value)}
              disabled={updating || application.status === option.value}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  application.status === option.value &&
                    styles.statusOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
  jobLocation: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 8,
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
