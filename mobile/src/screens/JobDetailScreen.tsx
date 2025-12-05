import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { JobPosting } from "../types";
import { useAuth } from "../context/AuthContext";
import { isJobSaved, saveJob, unsaveJob } from "../lib/firestore";
import { logger } from "../lib/logger";

interface JobDetailScreenProps {
  route: any;
  navigation: any;
}

export default function JobDetailScreen({ route, navigation }: JobDetailScreenProps) {
  const { jobId } = route.params;
  const { user } = useAuth();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobDoc = await getDoc(doc(db, "jobs", jobId));
        if (jobDoc.exists()) {
          setJob({ id: jobDoc.id, ...jobDoc.data() } as JobPosting);
        }

        // Check if job is saved
        if (user) {
          const saved = await isJobSaved(user.uid, jobId);
          setIsSaved(saved);
        }
      } catch (error) {
        logger.error("Error fetching job:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId, user]);

  const handleToggleSave = async () => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to save jobs.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => navigation.navigate("SignIn") },
        ]
      );
      return;
    }

    setSavingJob(true);
    try {
      if (isSaved) {
        await unsaveJob(user.uid, jobId);
        setIsSaved(false);
      } else {
        await saveJob(user.uid, jobId);
        setIsSaved(true);
      }
    } catch (error) {
      logger.error("Error toggling save:", error);
      Alert.alert("Error", "Failed to save job. Please try again.");
    } finally {
      setSavingJob(false);
    }
  };

  const handleApply = async () => {
    if (!job) return;

    try {
      if (job.quickApplyEnabled && user) {
        // Navigate to quick apply screen
        navigation.navigate("QuickApply", { jobId: job.id });
      } else if (job.quickApplyEnabled && !user) {
        Alert.alert(
          "Sign In Required",
          "Please sign in to use Quick Apply.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Sign In", onPress: () => navigation.navigate("SignIn") },
          ]
        );
      } else if (job.applicationLink) {
        await Linking.openURL(job.applicationLink);
      } else if (job.applicationEmail) {
        await Linking.openURL(`mailto:${job.applicationEmail}?subject=Application: ${job.title}`);
      } else {
        Alert.alert("Apply", "No application method available for this job.");
      }
    } catch (error) {
      logger.error("Error opening application link:", error);
      Alert.alert(
        "Error",
        "Unable to open the application link. Please try again or contact the employer directly."
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {job.featured && (
          <View style={styles.featuredBanner}>
            <Text style={styles.featuredText}>Featured Opportunity</Text>
          </View>
        )}

        <View style={styles.titleRow}>
          <View style={styles.titleContent}>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={styles.employer}>{job.employerName}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, isSaved && styles.savedButton]}
            onPress={handleToggleSave}
            disabled={savingJob}
          >
            <Text style={styles.saveIcon}>{isSaved ? "🔖" : "📑"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={styles.metaValue}>{job.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>{job.employmentType}</Text>
          </View>
        </View>

        {job.salaryRange && (
          <View style={styles.salaryContainer}>
            <Text style={styles.salaryLabel}>Salary Range</Text>
            <Text style={styles.salaryValue}>{job.salaryRange}</Text>
          </View>
        )}

        <View style={styles.tags}>
          {job.remoteFlag && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Remote Friendly</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {job.responsibilities && job.responsibilities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Responsibilities</Text>
            {job.responsibilities.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {job.qualifications && job.qualifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Qualifications</Text>
            {job.qualifications.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {job.closingDate && (
          <View style={styles.closingDate}>
            <Text style={styles.closingLabel}>Application Deadline:</Text>
            <Text style={styles.closingValue}>{job.closingDate}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveFooterButton, isSaved && styles.savedFooterButton]}
          onPress={handleToggleSave}
          disabled={savingJob}
        >
          <Text style={styles.saveFooterText}>
            {savingJob ? "..." : isSaved ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>
            {job.quickApplyEnabled ? "Quick Apply" : "Apply Now"}
          </Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  featuredBanner: {
    backgroundColor: "#F59E0B",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  featuredText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "bold",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  employer: {
    fontSize: 16,
    color: "#14B8A6",
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  savedButton: {
    backgroundColor: "#14B8A620",
    borderColor: "#14B8A6",
  },
  saveIcon: {
    fontSize: 20,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  salaryContainer: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  salaryLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  salaryValue: {
    fontSize: 18,
    color: "#10B981",
    fontWeight: "600",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  indigenousTag: {
    backgroundColor: "#14B8A6",
  },
  quickApplyTag: {
    backgroundColor: "#8B5CF6",
  },
  tagText: {
    fontSize: 12,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#CBD5E1",
    lineHeight: 24,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bullet: {
    color: "#14B8A6",
    marginRight: 8,
    fontSize: 15,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: "#CBD5E1",
    lineHeight: 22,
  },
  closingDate: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  closingLabel: {
    fontSize: 14,
    color: "#94A3B8",
    marginRight: 8,
  },
  closingValue: {
    fontSize: 14,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1E293B",
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    flexDirection: "row",
    gap: 12,
  },
  saveFooterButton: {
    backgroundColor: "#0F172A",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  savedFooterButton: {
    backgroundColor: "#14B8A620",
    borderColor: "#14B8A6",
  },
  saveFooterText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#14B8A6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
});
