import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { listConferences, formatTimestamp } from "../lib/firestore";
import type { Conference } from "../types";
import { logger } from "../lib/logger";

export default function ConferencesScreen() {
  const navigation = useNavigation();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConferences = async () => {
    try {
      const data = await listConferences(50);
      setConferences(data);
    } catch (error) {
      logger.error("Error loading conferences:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConferences();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadConferences();
  };

  const handleRegister = (conference: Conference) => {
    const link = conference.registrationLink || conference.registrationUrl;
    if (link) {
      Linking.openURL(link);
    }
  };

  const renderConferenceCard = ({ item }: { item: Conference }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        (navigation as any).navigate("ConferenceDetail", { conferenceId: item.id })
      }
    >
      {item.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.organizer}>
        {item.organizerName || item.employerName}
      </Text>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        {item.format && (
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🎯</Text>
            <Text style={styles.detailText}>{item.format}</Text>
          </View>
        )}
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateIcon}>📅</Text>
        <Text style={styles.dateText}>
          {formatTimestamp(item.startDate)}
          {item.endDate && ` - ${formatTimestamp(item.endDate)}`}
        </Text>
      </View>

      {item.cost && (
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Cost:</Text>
          <Text style={styles.costText}>{item.cost}</Text>
        </View>
      )}

      <Text style={styles.description} numberOfLines={3}>
        {item.description}
      </Text>

      {(item.registrationLink || item.registrationUrl) && (
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => handleRegister(item)}
        >
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading conferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conferences & Events</Text>
        <Text style={styles.headerSubtitle}>
          Career fairs, hiring events, and professional summits
        </Text>
      </View>

      {conferences.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎪</Text>
          <Text style={styles.emptyTitle}>No upcoming conferences</Text>
          <Text style={styles.emptyText}>
            Check back soon for new events and opportunities.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conferences}
          renderItem={renderConferenceCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#14B8A6"
            />
          }
        />
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  featuredBadge: {
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  featuredText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  organizer: {
    fontSize: 14,
    color: "#8B5CF6",
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dateIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  dateText: {
    fontSize: 13,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  costRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 13,
    color: "#64748B",
    marginRight: 6,
  },
  costText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 12,
  },
  registerButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
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
    color: "#94A3B8",
    textAlign: "center",
  },
});
