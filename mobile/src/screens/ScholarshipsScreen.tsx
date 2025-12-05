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
import { listScholarships, formatTimestamp } from "../lib/firestore";
import type { Scholarship } from "../types";
import { logger } from "../lib/logger";

export default function ScholarshipsScreen() {
  const navigation = useNavigation();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const loadScholarships = async () => {
    try {
      const data = await listScholarships(50);
      setScholarships(data);
    } catch (error) {
      logger.error("Error loading scholarships:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadScholarships();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadScholarships();
  };

  const filteredScholarships = scholarships.filter((s) => {
    if (filter === "all") return true;
    return s.type.toLowerCase() === filter;
  });

  const renderScholarshipCard = ({ item }: { item: Scholarship }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        (navigation as any).navigate("ScholarshipDetail", {
          scholarshipId: item.id,
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{item.level}</Text>
        </View>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.provider}>{item.provider}</Text>

      {item.amount && (
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Award:</Text>
          <Text style={styles.amountText}>{item.amount}</Text>
        </View>
      )}

      <Text style={styles.description} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.footer}>
        {item.deadline && (
          <View style={styles.deadlineRow}>
            <Text style={styles.deadlineIcon}>⏰</Text>
            <Text style={styles.deadlineText}>
              Deadline: {formatTimestamp(item.deadline)}
            </Text>
          </View>
        )}
        {item.region && (
          <View style={styles.regionRow}>
            <Text style={styles.regionIcon}>📍</Text>
            <Text style={styles.regionText}>{item.region}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading scholarships...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scholarships & Grants</Text>
        <Text style={styles.headerSubtitle}>
          Educational funding opportunities for Indigenous learners
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {["all", "scholarship", "grant", "bursary"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredScholarships.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎓</Text>
          <Text style={styles.emptyTitle}>No scholarships found</Text>
          <Text style={styles.emptyText}>
            {scholarships.length === 0
              ? "Check back soon for new opportunities."
              : "Try selecting a different filter."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredScholarships}
          renderItem={renderScholarshipCard}
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
    backgroundColor: "#F59E0B20",
  },
  filterText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#F59E0B",
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
  typeBadge: {
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "600",
  },
  levelBadge: {
    backgroundColor: "#3B82F620",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    color: "#3B82F6",
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  provider: {
    fontSize: 14,
    color: "#F59E0B",
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: "#64748B",
    marginRight: 6,
  },
  amountText: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
    gap: 6,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deadlineIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  deadlineText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  regionIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  regionText: {
    fontSize: 13,
    color: "#94A3B8",
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
