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
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getScholarship, formatTimestamp } from "../lib/firestore";
import { logger } from "../lib/logger";
import type { Scholarship } from "../types";

export default function ScholarshipDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { scholarshipId } = route.params as { scholarshipId: string };
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScholarship = async () => {
      try {
        const data = await getScholarship(scholarshipId);
        setScholarship(data);
      } catch (error) {
        logger.error("Error loading scholarship", error);
      } finally {
        setLoading(false);
      }
    };
    loadScholarship();
  }, [scholarshipId]);

  const handleApply = async () => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to apply for scholarships.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => (navigation as any).navigate("SignIn"),
          },
        ]
      );
      return;
    }

    // Open scholarship on IOPPS website for application
    const scholarshipUrl = `https://iopps.ca/scholarships/${scholarshipId}`;
    try {
      const supported = await Linking.canOpenURL(scholarshipUrl);
      if (supported) {
        await Linking.openURL(scholarshipUrl);
      } else {
        Alert.alert(
          "Unable to Open",
          "Could not open the scholarship application page. Please visit iopps.ca directly."
        );
      }
    } catch (error) {
      logger.error("Error opening scholarship URL", error);
      Alert.alert(
        "Error",
        "Something went wrong. Please try again or visit iopps.ca directly."
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (!scholarship) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Scholarship not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Type & Level Badges */}
        <View style={styles.badges}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{scholarship.type}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{scholarship.level}</Text>
          </View>
        </View>

        <Text style={styles.title}>{scholarship.title}</Text>
        <Text style={styles.provider}>Provided by {scholarship.provider}</Text>

        {/* Key Details Card */}
        <View style={styles.detailsCard}>
          {scholarship.amount && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>💰</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Award Amount</Text>
                <Text style={[styles.detailValue, styles.amountValue]}>
                  {scholarship.amount}
                </Text>
              </View>
            </View>
          )}

          {scholarship.deadline && (
            <>
              {scholarship.amount && <View style={styles.divider} />}
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>⏰</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Application Deadline</Text>
                  <Text style={[styles.detailValue, styles.deadlineValue]}>
                    {formatTimestamp(scholarship.deadline)}
                  </Text>
                </View>
              </View>
            </>
          )}

          {scholarship.region && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Eligibility Region</Text>
                  <Text style={styles.detailValue}>{scholarship.region}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Scholarship</Text>
          <Text style={styles.description}>{scholarship.description}</Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Make sure to review all eligibility requirements before applying.
            Prepare your documents, including transcripts and personal statements,
            ahead of time.
          </Text>
        </View>
      </ScrollView>

      {/* Footer with Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Now</Text>
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
  centered: {
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
    paddingBottom: 100,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  typeBadge: {
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
  },
  levelBadge: {
    backgroundColor: "#3B82F620",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  levelText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  provider: {
    fontSize: 16,
    color: "#F59E0B",
    marginBottom: 24,
  },
  detailsCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  amountValue: {
    color: "#10B981",
    fontSize: 20,
    fontWeight: "700",
  },
  deadlineValue: {
    color: "#EF4444",
  },
  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 16,
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
    color: "#94A3B8",
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: "#14B8A620",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#14B8A6",
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    padding: 16,
    paddingBottom: 32,
  },
  applyButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
});
