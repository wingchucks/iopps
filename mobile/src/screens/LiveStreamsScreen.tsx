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
import { listLiveStreams } from "../lib/firestore";
import type { LiveStreamEvent } from "../types";
import { logger } from "../lib/logger";

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  "Live Now": { color: "#EF4444", bg: "#EF444420" },
  Upcoming: { color: "#F59E0B", bg: "#F59E0B20" },
  Replay: { color: "#3B82F6", bg: "#3B82F620" },
};

export default function LiveStreamsScreen() {
  const [streams, setStreams] = useState<LiveStreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const loadStreams = async () => {
    try {
      const data = await listLiveStreams(50);
      setStreams(data);
    } catch (error) {
      logger.error("Error loading live streams:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStreams();
  };

  const filteredStreams = streams.filter((s) => {
    if (filter === "all") return true;
    return s.status.toLowerCase() === filter.toLowerCase();
  });

  const renderStreamCard = ({ item }: { item: LiveStreamEvent }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.Upcoming;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          // For now, open the platform URL if available
          if (item.platform && item.platform.startsWith("http")) {
            Linking.openURL(item.platform);
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {item.status === "Live Now" && "🔴 "}
              {item.status}
            </Text>
          </View>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.host}>Hosted by {item.host}</Text>

        {item.startTime && (
          <View style={styles.timeRow}>
            <Text style={styles.timeIcon}>🕐</Text>
            <Text style={styles.timeText}>{item.startTime}</Text>
          </View>
        )}

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        {item.platform && (
          <View style={styles.platformRow}>
            <Text style={styles.platformLabel}>Platform:</Text>
            <Text style={styles.platformText}>{item.platform}</Text>
          </View>
        )}

        {item.status === "Live Now" && (
          <TouchableOpacity style={styles.watchButton}>
            <Text style={styles.watchButtonText}>Watch Now</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading streams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Streams</Text>
        <Text style={styles.headerSubtitle}>
          Watch live broadcasts and replays
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {["all", "Live Now", "Upcoming", "Replay"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter.toLowerCase() === f.toLowerCase() && styles.filterActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter.toLowerCase() === f.toLowerCase() &&
                  styles.filterTextActive,
              ]}
            >
              {f === "all" ? "All" : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredStreams.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📺</Text>
          <Text style={styles.emptyTitle}>No streams found</Text>
          <Text style={styles.emptyText}>
            {streams.length === 0
              ? "Check back soon for live broadcasts."
              : "Try selecting a different filter."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStreams}
          renderItem={renderStreamCard}
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#1E293B",
  },
  filterActive: {
    backgroundColor: "#06B6D420",
  },
  filterText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#06B6D4",
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: "#64748B20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  host: {
    fontSize: 14,
    color: "#06B6D4",
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  timeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  timeText: {
    fontSize: 13,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  description: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 12,
  },
  platformRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  platformLabel: {
    fontSize: 13,
    color: "#64748B",
    marginRight: 6,
  },
  platformText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  watchButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  watchButtonText: {
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
