import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  limit,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";

interface QuickApplyScreenProps {
  route: any;
  navigation: any;
}

export default function QuickApplyScreen({ route, navigation }: QuickApplyScreenProps) {
  const { jobId } = route.params;
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be signed in to apply");
      return;
    }

    if (!coverLetter.trim()) {
      Alert.alert("Error", "Please add a cover letter");
      return;
    }

    setLoading(true);
    try {
      // Check for duplicate application
      const applicationsRef = collection(db, "applications");
      const duplicateQuery = query(
        applicationsRef,
        where("memberId", "==", user.uid),
        where("jobId", "==", jobId),
        limit(1)
      );
      const duplicateSnap = await getDocs(duplicateQuery);

      if (!duplicateSnap.empty) {
        Alert.alert("Already Applied", "You have already applied to this job");
        setLoading(false);
        return;
      }

      // Get job details to find employerId
      const jobRef = doc(db, "jobs", jobId);
      const jobSnap = await getDoc(jobRef);

      if (!jobSnap.exists()) {
        Alert.alert("Error", "Job not found");
        setLoading(false);
        return;
      }

      const jobData = jobSnap.data();
      const employerId = jobData.employerId;

      // Create application
      const applicationData = {
        jobId,
        memberId: user.uid,
        employerId,
        memberEmail: user.email || "",
        memberDisplayName: user.displayName || "",
        coverLetter: coverLetter.trim(),
        status: "submitted",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(applicationsRef, applicationData);

      // Increment application count on job
      await updateDoc(jobRef, {
        applicationsCount: increment(1),
      });

      Alert.alert(
        "Success",
        "Your application has been submitted!",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting application:", error);
      Alert.alert("Error", "Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cover Letter *</Text>
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

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Note: For the best results, attach your resume and provide a detailed
          cover letter explaining your qualifications and interest in this position.
        </Text>
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
    padding: 20,
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
  infoBox: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#14B8A6",
  },
  infoText: {
    fontSize: 13,
    color: "#CBD5E1",
    lineHeight: 20,
  },
});
