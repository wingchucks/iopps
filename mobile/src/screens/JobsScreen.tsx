import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { JobPosting } from "../types";

interface JobsScreenProps {
  navigation: any;
}

export default function JobsScreen({ navigation }: JobsScreenProps) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    try {
      const jobsQuery = query(
        collection(db, "jobs"),
        where("active", "==", true),
        orderBy("createdAt", "desc"),
        limit(50)
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

  const renderJob = ({ item }: { item: JobPosting }) => (
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
      {item.salaryRange && (
        <Text style={styles.salary}>{item.salaryRange}</Text>
      )}
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
      </View>
    </TouchableOpacity>
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
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14B8A6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jobs available right now</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
      />
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
  listContent: {
    padding: 16,
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
  tagText: {
    fontSize: 11,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 8,
  },
});
