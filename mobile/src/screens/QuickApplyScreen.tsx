import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { applyToJob } from "../lib/jobs";
import { getMemberProfile, type MemberProfile } from "../lib/profile";
import { logger } from "../lib/logger";

interface QuickApplyScreenProps {
  route: any;
  navigation: any;
}

export default function QuickApplyScreen({ route, navigation }: QuickApplyScreenProps) {
  const {
    jobId,
    requiresResume = false,
    requiresCoverLetter = false,
    requiresReferences = false,
  } = route.params;
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [references, setReferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      try {
        const data = await getMemberProfile(user.uid);
        setProfile(data);
      } catch (error) {
        logger.error("Error loading profile for Quick Apply:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be signed in to apply");
      return;
    }

    // The website checks the same requirements again when the application arrives.
    if (requiresResume && !profile?.resumeUrl) {
      Alert.alert("Resume Required", "This job needs a resume. Add one to your profile, then apply.");
      return;
    }

    if (requiresCoverLetter && !coverLetter.trim()) {
      Alert.alert("Error", "Please add a cover letter");
      return;
    }

    if (requiresReferences && !references.trim()) {
      Alert.alert("Error", "Please add your references");
      return;
    }

    setLoading(true);
    try {
      const { created } = await applyToJob(jobId, {
        useProfileResume: !!profile?.resumeUrl,
        coverLetter: coverLetter.trim(),
        references: references.trim(),
      });

      Alert.alert(
        created ? "Success" : "Already Applied",
        created
          ? "Your application has been submitted!"
          : "You have already applied to this job. Your original application is saved.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      logger.error("Error submitting application:", error);
      Alert.alert(
        "Error",
        error instanceof ApiError ? error.message : "Failed to submit application. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Apply</Text>
        <Text style={styles.subtitle}>Submit your application quickly</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Your Email</Text>
          <TextInput
            style={styles.input}
            value={user?.email || ""}
            editable={false}
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Resume Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Resume</Text>
          {profile?.resumeUrl ? (
            <View style={styles.resumeAttached}>
              <Text style={styles.resumeIcon}>📄</Text>
              <View style={styles.resumeInfo}>
                <Text style={styles.resumeName} numberOfLines={1}>
                  {profile.resumeFileName || "Resume attached"}
                </Text>
                <TouchableOpacity
                  onPress={() => profile.resumeUrl && Linking.openURL(profile.resumeUrl)}
                >
                  <Text style={styles.resumeViewLink}>View resume</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.resumeCheckmark}>✓</Text>
            </View>
          ) : (
            <View style={styles.noResume}>
              <Text style={styles.noResumeIcon}>📎</Text>
              <View style={styles.noResumeContent}>
                <Text style={styles.noResumeText}>No resume on file</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("EditProfile" as never)}
                >
                  <Text style={styles.addResumeLink}>Add resume in profile →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cover Letter{requiresCoverLetter ? " *" : " (optional)"}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us why you're a great fit for this role..."
            placeholderTextColor="#64748B"
            value={coverLetter}
            onChangeText={setCoverLetter}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>

        {requiresReferences && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>References *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Names and contact details, shared with their permission"
              placeholderTextColor="#64748B"
              value={references}
              onChangeText={setReferences}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Application</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {!profile?.resumeUrl && (
        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Applications with a resume are more likely to get responses. Consider adding one to your profile.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 20,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E2E8F0",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#F8FAFC",
  },
  textArea: {
    minHeight: 150,
    paddingTop: 16,
  },
  submitButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "500",
  },
  // Resume section styles
  resumeAttached: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14B8A620",
    borderWidth: 1,
    borderColor: "#14B8A640",
    borderRadius: 12,
    padding: 16,
  },
  resumeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  resumeInfo: {
    flex: 1,
  },
  resumeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 2,
  },
  resumeViewLink: {
    fontSize: 13,
    color: "#14B8A6",
  },
  resumeCheckmark: {
    fontSize: 18,
    color: "#14B8A6",
  },
  noResume: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 16,
  },
  noResumeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  noResumeContent: {
    flex: 1,
  },
  noResumeText: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 2,
  },
  addResumeLink: {
    fontSize: 13,
    color: "#14B8A6",
    fontWeight: "500",
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#F59E0B20",
    borderWidth: 1,
    borderColor: "#F59E0B40",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#FDE68A",
    lineHeight: 20,
  },
});
