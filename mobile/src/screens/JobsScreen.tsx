import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Keyboard,
} from "react-native";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { JobPosting } from "../types";

interface JobsScreenProps {
  navigation: any;
}

type SortOption = "newest" | "oldest" | "salary";
type EmploymentType = "all" | "Full-time" | "Part-time" | "Contract" | "Temporary" | "Internship";

interface Filters {
  employmentType: EmploymentType;
  remoteOnly: boolean;
  indigenousOnly: boolean;
  location: string;
  sortBy: SortOption;
}

const DEFAULT_FILTERS: Filters = {
  employmentType: "all",
  remoteOnly: false,
  indigenousOnly: false,
  location: "",
  sortBy: "newest",
};

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "all",
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
];

export default function JobsScreen({ navigation }: JobsScreenProps) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const fetchJobs = async () => {
    try {
      const jobsQuery = query(
        collection(db, "jobs"),
        where("active", "==", true),
        orderBy("createdAt", "desc"),
        limit(100)
      );

      const snapshot = await getDocs(jobsQuery);
      const jobsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as JobPosting[];

      setJobs(jobsList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  // Filter and search jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          (job.employerName?.toLowerCase() || "").includes(query) ||
          job.location.toLowerCase().includes(query) ||
          (job.description?.toLowerCase() || "").includes(query)
      );
    }

    // Employment type filter
    if (filters.employmentType !== "all") {
      result = result.filter((job) => job.employmentType === filters.employmentType);
    }

    // Remote only filter
    if (filters.remoteOnly) {
      result = result.filter((job) => job.remoteFlag === true);
    }

    // Indigenous preference filter
    if (filters.indigenousOnly) {
      result = result.filter((job) => job.indigenousPreference === true);
    }

    // Location filter
    if (filters.location.trim()) {
      const loc = filters.location.toLowerCase();
      result = result.filter((job) => job.location.toLowerCase().includes(loc));
    }

    // Sort
    switch (filters.sortBy) {
      case "oldest":
        result.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateA.getTime() - dateB.getTime();
        });
        break;
      case "salary":
        // Sort by salary (jobs with salary first, then by amount if parseable)
        result.sort((a, b) => {
          if (a.salaryRange && !b.salaryRange) return -1;
          if (!a.salaryRange && b.salaryRange) return 1;
          return 0;
        });
        break;
      case "newest":
      default:
        // Already sorted by newest from Firestore
        break;
    }

    // Always put featured jobs first
    result.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });

    return result;
  }, [jobs, searchQuery, filters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.employmentType !== "all" ||
      filters.remoteOnly ||
      filters.indigenousOnly ||
      filters.location.trim() !== "" ||
      filters.sortBy !== "newest"
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.employmentType !== "all") count++;
    if (filters.remoteOnly) count++;
    if (filters.indigenousOnly) count++;
    if (filters.location.trim()) count++;
    if (filters.sortBy !== "newest") count++;
    return count;
  }, [filters]);

  const openFilterModal = () => {
    setTempFilters(filters);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setTempFilters(DEFAULT_FILTERS);
    setFilterModalVisible(false);
  };

  const renderJob = useCallback(
    ({ item }: { item: JobPosting }) => (
      <TouchableOpacity
        style={[styles.jobCard, item.featured && styles.featuredCard]}
        onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}
      >
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        <Text style={styles.jobTitle}>{item.title}</Text>
        <Text style={styles.employerName}>{item.employerName}</Text>
        <View style={styles.jobMeta}>
          <Text style={styles.location}>{item.location}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.employmentType}>{item.employmentType}</Text>
        </View>
        {item.salaryRange && <Text style={styles.salary}>{item.salaryRange}</Text>}
        <View style={styles.tags}>
          {item.remoteFlag && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Remote</Text>
            </View>
          )}
          {item.indigenousPreference && (
            <View style={[styles.tag, styles.indigenousTag]}>
              <Text style={styles.tagText}>Indigenous Preference</Text>
            </View>
          )}
          {item.quickApplyEnabled && (
            <View style={[styles.tag, styles.quickApplyTag]}>
              <Text style={styles.tagText}>Quick Apply</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading opportunities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, companies, locations..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={openFilterModal}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersContent}
          >
            {filters.employmentType !== "all" && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{filters.employmentType}</Text>
              </View>
            )}
            {filters.remoteOnly && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>Remote</Text>
              </View>
            )}
            {filters.indigenousOnly && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>Indigenous Pref.</Text>
              </View>
            )}
            {filters.location.trim() && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>📍 {filters.location}</Text>
              </View>
            )}
            {filters.sortBy !== "newest" && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  Sort: {filters.sortBy === "oldest" ? "Oldest" : "Salary"}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
        </Text>
      </View>

      {/* Jobs List */}
      <FlatList
        data={filteredJobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No jobs match your search</Text>
            <Text style={styles.emptySubtext}>
              {hasActiveFilters ? "Try adjusting your filters" : "Try a different search term"}
            </Text>
            {(searchQuery || hasActiveFilters) && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery("");
                  clearFilters();
                }}
              >
                <Text style={styles.clearSearchText}>Clear search & filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={applyFilters}>
              <Text style={styles.modalApply}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Employment Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Employment Type</Text>
              <View style={styles.filterOptions}>
                {EMPLOYMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      tempFilters.employmentType === type && styles.filterOptionActive,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, employmentType: type })}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilters.employmentType === type && styles.filterOptionTextActive,
                      ]}
                    >
                      {type === "all" ? "All Types" : type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., Toronto, Vancouver, Remote"
                placeholderTextColor="#64748B"
                value={tempFilters.location}
                onChangeText={(text) => setTempFilters({ ...tempFilters, location: text })}
              />
            </View>

            {/* Toggles */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Preferences</Text>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setTempFilters({ ...tempFilters, remoteOnly: !tempFilters.remoteOnly })}
              >
                <View>
                  <Text style={styles.toggleLabel}>Remote Jobs Only</Text>
                  <Text style={styles.toggleDescription}>Show only remote-friendly positions</Text>
                </View>
                <View
                  style={[styles.toggle, tempFilters.remoteOnly && styles.toggleActive]}
                >
                  <View
                    style={[
                      styles.toggleHandle,
                      tempFilters.remoteOnly && styles.toggleHandleActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() =>
                  setTempFilters({ ...tempFilters, indigenousOnly: !tempFilters.indigenousOnly })
                }
              >
                <View>
                  <Text style={styles.toggleLabel}>Indigenous Preference</Text>
                  <Text style={styles.toggleDescription}>
                    Show jobs with Indigenous preference
                  </Text>
                </View>
                <View
                  style={[styles.toggle, tempFilters.indigenousOnly && styles.toggleActive]}
                >
                  <View
                    style={[
                      styles.toggleHandle,
                      tempFilters.indigenousOnly && styles.toggleHandleActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Sort */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: "newest", label: "Newest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "salary", label: "Salary Listed" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempFilters.sortBy === option.value && styles.filterOptionActive,
                    ]}
                    onPress={() =>
                      setTempFilters({ ...tempFilters, sortBy: option.value as SortOption })
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilters.sortBy === option.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Clear All Button */}
            <TouchableOpacity style={styles.clearAllFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearAllFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  loadingText: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 14,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: "#F8FAFC",
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: "#64748B",
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterButtonActive: {
    backgroundColor: "#14B8A620",
    borderColor: "#14B8A6",
  },
  filterIcon: {
    fontSize: 18,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#14B8A6",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "700",
  },

  // Active Filters
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  activeFiltersContent: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#14B8A620",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#14B8A640",
  },
  filterChipText: {
    color: "#14B8A6",
    fontSize: 12,
    fontWeight: "500",
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "500",
  },

  // Results
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    color: "#64748B",
    fontSize: 13,
  },

  // List
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  jobCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  featuredCard: {
    borderColor: "#F59E0B",
    borderWidth: 2,
  },
  featuredBadge: {
    position: "absolute",
    top: -1,
    right: 12,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  featuredText: {
    color: "#0F172A",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  employerName: {
    fontSize: 14,
    color: "#14B8A6",
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  location: {
    fontSize: 13,
    color: "#94A3B8",
  },
  separator: {
    color: "#475569",
    marginHorizontal: 8,
  },
  employmentType: {
    fontSize: 13,
    color: "#94A3B8",
  },
  salary: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
    marginBottom: 8,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indigenousTag: {
    backgroundColor: "#14B8A6",
  },
  quickApplyTag: {
    backgroundColor: "#8B5CF6",
  },
  tagText: {
    fontSize: 11,
    color: "#F8FAFC",
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  clearSearchButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  clearSearchText: {
    color: "#14B8A6",
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  modalCancel: {
    color: "#94A3B8",
    fontSize: 16,
  },
  modalTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
  },
  modalApply: {
    color: "#14B8A6",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 28,
  },
  filterSectionTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterOptionActive: {
    backgroundColor: "#14B8A620",
    borderColor: "#14B8A6",
  },
  filterOptionText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "500",
  },
  filterOptionTextActive: {
    color: "#14B8A6",
  },
  filterInput: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#F8FAFC",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleLabel: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  toggleDescription: {
    color: "#64748B",
    fontSize: 13,
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: "#334155",
    borderRadius: 14,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#14B8A6",
  },
  toggleHandle: {
    width: 24,
    height: 24,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  toggleHandleActive: {
    transform: [{ translateX: 22 }],
  },
  clearAllFiltersButton: {
    backgroundColor: "#EF444420",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40,
  },
  clearAllFiltersText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "600",
  },
});
