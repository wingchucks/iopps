import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { listVendors } from "../lib/firestore";
import type { VendorProfile } from "../types";
import { logger } from "../lib/logger";

export default function ShopScreen() {
  const navigation = useNavigation();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const loadVendors = async () => {
    try {
      const data = await listVendors(50);
      setVendors(data);
    } catch (error) {
      logger.error("Error loading vendors:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadVendors();
  };

  const categories: string[] = ["all", ...new Set(vendors.map((v) => v.category).filter((c): c is string => Boolean(c)))];

  const filteredVendors = vendors.filter((v) => {
    if (filter === "all") return true;
    return v.category?.toLowerCase() === filter.toLowerCase();
  });

  const renderVendorCard = ({ item }: { item: VendorProfile }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        (navigation as any).navigate("VendorDetail", { vendorId: item.id })
      }
    >
      <View style={styles.cardHeader}>
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>
              {item.businessName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.cardHeaderInfo}>
          {item.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
          {item.isIndigenousOwned && (
            <View style={styles.indigenousBadge}>
              <Text style={styles.indigenousText}>Indigenous Owned</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.businessName}>{item.businessName}</Text>
      {item.tagline && <Text style={styles.tagline}>{item.tagline}</Text>}

      <View style={styles.metaRow}>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
        {item.location && (
          <Text style={styles.location}>📍 {item.location}</Text>
        )}
      </View>

      {item.about && (
        <Text style={styles.about} numberOfLines={2}>
          {item.about}
        </Text>
      )}

      <View style={styles.tagsRow}>
        {item.shipsCanadaWide && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>🚚 Ships Canada-Wide</Text>
          </View>
        )}
        {item.isOnlineOnly && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>🌐 Online Store</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading vendors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop Indigenous</Text>
        <Text style={styles.headerSubtitle}>
          Support Indigenous-owned businesses and artisans
        </Text>
      </View>

      {/* Category Filters */}
      <FlatList
        data={categories.slice(0, 5)}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterButton, filter === item && styles.filterActive]}
            onPress={() => setFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.filterTextActive,
              ]}
            >
              {item === "all" ? "All" : item}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
      />

      {filteredVendors.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyTitle}>No vendors found</Text>
          <Text style={styles.emptyText}>
            {vendors.length === 0
              ? "Check back soon for Indigenous businesses."
              : "Try selecting a different category."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredVendors}
          renderItem={renderVendorCard}
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
  filterList: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    marginRight: 8,
  },
  filterActive: {
    backgroundColor: "#EC489920",
  },
  filterText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#EC4899",
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
    marginBottom: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#EC489920",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#EC4899",
  },
  cardHeaderInfo: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "flex-start",
  },
  featuredBadge: {
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "600",
  },
  indigenousBadge: {
    backgroundColor: "#14B8A620",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  indigenousText: {
    color: "#14B8A6",
    fontSize: 10,
    fontWeight: "600",
  },
  businessName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: "#EC4899",
    marginBottom: 8,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#64748B20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  location: {
    fontSize: 13,
    color: "#94A3B8",
  },
  about: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
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
