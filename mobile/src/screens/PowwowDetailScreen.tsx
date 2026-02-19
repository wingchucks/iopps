import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getPowwow, formatTimestamp } from "../lib/firestore";
import type { PowwowEvent } from "../types";
import { logger } from "../lib/logger";

export default function PowwowDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { powwowId } = route.params as { powwowId: string };
  const [powwow, setPowwow] = useState<PowwowEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPowwow = async () => {
      try {
        const data = await getPowwow(powwowId);
        setPowwow(data);
      } catch (error) {
        logger.error("Error loading powwow:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPowwow();
  }, [powwowId]);

  const handleRegister = () => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to register for this event.",
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
    Alert.alert(
      "Registration",
      "Registration through the app is coming soon. Please visit the IOPPS website to register."
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (!powwow) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Pow wow not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Badges */}
        <View style={styles.badges}>
          {powwow.livestream && (
            <View style={styles.livestreamBadge}>
              <Text style={styles.livestreamText}>📺 Livestream Available</Text>
            </View>
          )}
          {powwow.season && (
            <View style={styles.seasonBadge}>
              <Text style={styles.seasonText}>{powwow.season}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{powwow.name}</Text>
        {powwow.host && <Text style={styles.host}>Hosted by {powwow.host}</Text>}

        {/* Key Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{powwow.location}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {powwow.dateRange ||
                  (powwow.startDate &&
                    `${formatTimestamp(powwow.startDate)}${
                      powwow.endDate ? ` - ${formatTimestamp(powwow.endDate)}` : ""
                    }`)}
              </Text>
            </View>
          </View>

          {powwow.registrationStatus && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📋</Text>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Registration</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      powwow.registrationStatus.toLowerCase().includes("open")
                        ? styles.registrationOpen
                        : styles.registrationClosed,
                    ]}
                  >
                    {powwow.registrationStatus}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Event</Text>
          <Text style={styles.description}>{powwow.description}</Text>
        </View>

        {/* Cultural Note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🪶</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Cultural Significance</Text>
            <Text style={styles.infoText}>
              Pow wows are important cultural gatherings that celebrate Indigenous
              heritage through dance, music, and community. Visitors are welcome
              to observe and participate respectfully.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer with Register Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>Register to Attend</Text>
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
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  livestreamBadge: {
    backgroundColor: "#EF444420",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  livestreamText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  seasonBadge: {
    backgroundColor: "#14B8A620",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  seasonText: {
    color: "#14B8A6",
    fontSize: 12,
    fontWeight: "600",
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  host: {
    fontSize: 16,
    color: "#EF4444",
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
  registrationOpen: {
    color: "#10B981",
  },
  registrationClosed: {
    color: "#F59E0B",
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
    backgroundColor: "#EF444420",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#94A3B8",
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
  registerButton: {
    backgroundColor: "#EF4444",
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
