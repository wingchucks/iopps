import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { listPowwows, formatTimestamp } from "../lib/firestore";
import type { PowwowEvent } from "../types";
import { logger } from "../lib/logger";

export default function PowwowsScreen() {
  const navigation = useNavigation();
  const [powwows, setPowwows] = useState<PowwowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPowwows = async () => {
    try {
      const data = await listPowwows(50);
      setPowwows(data);
    } catch (error) {
      logger.error("Error loading powwows:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPowwows();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPowwows();
  };

  const renderPowwowCard = ({ item }: { item: PowwowEvent }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        (navigation as any).navigate("PowwowDetail", { powwowId: item.id })
      }
    >
      <View style={styles.cardHeader}>
        {item.livestream && (
          <View style={styles.livestreamBadge}>
            <Text style={styles.livestreamText}>📺 Livestream</Text>
          </View>
        )}
        {item.season && (
          <View style={styles.seasonBadge}>
            <Text style={styles.seasonText}>{item.season}</Text>
          </View>
        )}
      </View>

      <Text style={styles.name}>{item.name}</Text>
      {item.host && <Text style={styles.host}>Hosted by {item.host}</Text>}

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateIcon}>📅</Text>
        <Text style={styles.dateText}>
          {item.dateRange ||
            (item.startDate &&
              `${formatTimestamp(item.startDate)}${
                item.endDate ? ` - ${formatTimestamp(item.endDate)}` : ""
              }`)}
        </Text>
      </View>

      {item.registrationStatus && (
        <View style={styles.registrationRow}>
          <Text style={styles.registrationLabel}>Registration:</Text>
          <Text
            style={[
              styles.registrationStatus,
              item.registrationStatus.toLowerCase().includes("open")
                ? styles.registrationOpen
                : styles.registrationClosed,
            ]}
          >
            {item.registrationStatus}
          </Text>
        </View>
      )}

      <Text style={styles.description} numberOfLines={3}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading pow wows...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pow Wows</Text>
        <Text style={styles.headerSubtitle}>
          Cultural gatherings and community celebrations
        </Text>
      </View>

      {powwows.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🪶</Text>
          <Text style={styles.emptyTitle}>No upcoming pow wows</Text>
          <Text style={styles.emptyText}>
            Check back soon for cultural gatherings and community events.
          </Text>
        </View>
      ) : (
        <FlatList
          data={powwows}
          renderItem={renderPowwowCard}
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
  cardHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  livestreamBadge: {
    backgroundColor: "#EF444420",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  livestreamText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "600",
  },
  seasonBadge: {
    backgroundColor: "#14B8A620",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seasonText: {
    color: "#14B8A6",
    fontSize: 11,
    fontWeight: "600",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  host: {
    fontSize: 14,
    color: "#EF4444",
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
    marginBottom: 12,
  },
  dateIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  dateText: {
    fontSize: 14,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  registrationRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  registrationLabel: {
    fontSize: 13,
    color: "#64748B",
    marginRight: 6,
  },
  registrationStatus: {
    fontSize: 13,
    fontWeight: "600",
  },
  registrationOpen: {
    color: "#10B981",
  },
  registrationClosed: {
    color: "#F59E0B",
  },
  description: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
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
