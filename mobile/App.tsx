import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDFZxqF7b6j7KwINbHHqYWZNrVBE8zTeEo",
  authDomain: "iopps-c2224.firebaseapp.com",
  projectId: "iopps-c2224",
  storageBucket: "iopps-c2224.firebasestorage.app",
  messagingSenderId: "95180813480",
  appId: "1:95180813480:web:f70a794b6f7d324f83be9d",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

interface Job {
  id: string;
  title: string;
  employerName: string;
  location: string;
  employmentType: string;
  featured?: boolean;
  salaryRange?: string;
  status?: string;
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      console.log("Fetching jobs from Firestore...");

      // Simple query without ordering to avoid index issues on mobile
      const jobsQuery = query(
        collection(db, "jobs"),
        where("status", "==", "active"),
        limit(50)
      );

      const snapshot = await getDocs(jobsQuery);
      console.log("Got", snapshot.docs.length, "jobs");

      const jobsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "Untitled",
        employerName: doc.data().employerName || "Unknown",
        location: doc.data().location || "N/A",
        employmentType: doc.data().employmentType || "N/A",
        featured: doc.data().featured || false,
        salaryRange: doc.data().salaryRange || "",
      }));

      // Sort by featured first, then alphabetically
      jobsList.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.title.localeCompare(b.title);
      });

      setJobs(jobsList);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching jobs:", err);
      setError(err.message || "Failed to load jobs");
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>IOPPS</Text>
          <Text style={styles.headerSubtitle}>Indigenous Opportunities</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.loadingText}>Loading opportunities...</Text>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>IOPPS</Text>
          <Text style={styles.headerSubtitle}>Indigenous Opportunities</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Error loading jobs</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchJobs(); }}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>IOPPS</Text>
        <Text style={styles.headerSubtitle}>Indigenous Opportunities</Text>
        <Text style={styles.jobCount}>{jobs.length} active jobs</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14B8A6"
            colors={["#14B8A6"]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.jobCard, item.featured && styles.featuredCard]}>
            {item.featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>FEATURED</Text>
              </View>
            )}
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.employer}>{item.employerName}</Text>
            <Text style={styles.meta}>
              {item.location} • {item.employmentType}
            </Text>
            {item.salaryRange ? (
              <Text style={styles.salary}>{item.salaryRange}</Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jobs available</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
      />
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#14B8A6",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  jobCount: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
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
    top: 0,
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
    fontWeight: "700",
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  employer: {
    fontSize: 14,
    color: "#14B8A6",
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: "#94A3B8",
  },
  salary: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "500",
    marginTop: 8,
  },
  loadingText: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 14,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorDetail: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: "#14B8A6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
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
