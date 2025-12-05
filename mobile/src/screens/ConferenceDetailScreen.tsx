import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { getConference, formatTimestamp } from "../lib/firestore";
import type { Conference } from "../types";
import { logger } from "../lib/logger";

export default function ConferenceDetailScreen() {
  const route = useRoute();
  const { conferenceId } = route.params as { conferenceId: string };
  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConference = async () => {
      try {
        const data = await getConference(conferenceId);
        setConference(data);
      } catch (error) {
        logger.error("Error loading conference:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConference();
  }, [conferenceId]);

  const handleRegister = () => {
    const link = conference?.registrationLink || conference?.registrationUrl;
    if (link) {
      Linking.openURL(link);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (!conference) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Conference not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {conference.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured Event</Text>
          </View>
        )}

        <Text style={styles.title}>{conference.title}</Text>
        <Text style={styles.organizer}>
          Hosted by {conference.organizerName || conference.employerName}
        </Text>

        {/* Key Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{conference.location}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {formatTimestamp(conference.startDate)}
                {conference.endDate && ` - ${formatTimestamp(conference.endDate)}`}
              </Text>
            </View>
          </View>

          {conference.format && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🎯</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Format</Text>
                  <Text style={styles.detailValue}>{conference.format}</Text>
                </View>
              </View>
            </>
          )}

          {conference.cost && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💰</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Cost</Text>
                  <Text style={[styles.detailValue, styles.costValue]}>
                    {conference.cost}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Event</Text>
          <Text style={styles.description}>{conference.description}</Text>
        </View>
      </ScrollView>

      {/* Footer with Register Button */}
      {(conference.registrationLink || conference.registrationUrl) && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <Text style={styles.registerButtonText}>Register Now</Text>
          </TouchableOpacity>
        </View>
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
  featuredBadge: {
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  featuredText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  organizer: {
    fontSize: 16,
    color: "#8B5CF6",
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
  costValue: {
    color: "#10B981",
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
  registerButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
