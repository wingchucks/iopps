import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

interface ExploreCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  screen: string;
  color: string;
}

const CATEGORIES: ExploreCategory[] = [
  {
    id: "conferences",
    title: "Conferences",
    description: "Career fairs, hiring events & summits",
    icon: "🎪",
    screen: "Conferences",
    color: "#8B5CF6",
  },
  {
    id: "scholarships",
    title: "Scholarships",
    description: "Grants, bursaries & educational funding",
    icon: "🎓",
    screen: "Scholarships",
    color: "#F59E0B",
  },
  {
    id: "shop",
    title: "Shop Indigenous",
    description: "Indigenous-owned businesses & artisans",
    icon: "🛍️",
    screen: "Shop",
    color: "#EC4899",
  },
  {
    id: "powwows",
    title: "Pow Wows",
    description: "Cultural gatherings & community events",
    icon: "🪶",
    screen: "Powwows",
    color: "#EF4444",
  },
  {
    id: "livestreams",
    title: "Live Streams",
    description: "Watch live broadcasts & replays",
    icon: "📺",
    screen: "LiveStreams",
    color: "#06B6D4",
  },
];

export default function ExploreScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>
          Discover opportunities beyond job postings
        </Text>
      </View>

      <View style={styles.grid}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.card}
            onPress={() => (navigation as any).navigate(category.screen)}
            accessibilityLabel={`${category.title}: ${category.description}`}
            accessibilityRole="button"
            accessibilityHint={`Tap to explore ${category.title.toLowerCase()}`}
            testID={`explore-${category.id}`}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: `${category.color}20` }]}
              accessibilityElementsHidden
            >
              <Text style={styles.icon}>{category.icon}</Text>
            </View>
            <Text style={styles.cardTitle}>{category.title}</Text>
            <Text style={styles.cardDescription}>{category.description}</Text>
            <View style={[styles.arrow, { backgroundColor: `${category.color}20` }]} accessibilityElementsHidden>
              <Text style={[styles.arrowText, { color: category.color }]}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Featured Section */}
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>What is IOPPS?</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            IOPPS (Indigenous Opportunities & Partnerships Platform) connects
            Indigenous job seekers with employers committed to reconciliation
            and inclusive hiring practices.
          </Text>
          <View style={styles.pillars}>
            <View style={styles.pillar}>
              <Text style={styles.pillarIcon}>💼</Text>
              <Text style={styles.pillarText}>Jobs</Text>
            </View>
            <View style={styles.pillar}>
              <Text style={styles.pillarIcon}>🎓</Text>
              <Text style={styles.pillarText}>Education</Text>
            </View>
            <View style={styles.pillar}>
              <Text style={styles.pillarIcon}>🤝</Text>
              <Text style={styles.pillarText}>Community</Text>
            </View>
            <View style={styles.pillar}>
              <Text style={styles.pillarIcon}>💡</Text>
              <Text style={styles.pillarText}>Support</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#334155",
    position: "relative",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#94A3B8",
    paddingRight: 40,
  },
  arrow: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    fontSize: 18,
    fontWeight: "600",
  },
  featuredSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  infoText: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 22,
    marginBottom: 20,
  },
  pillars: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pillar: {
    alignItems: "center",
    flex: 1,
  },
  pillarIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  pillarText: {
    fontSize: 11,
    color: "#F8FAFC",
    fontWeight: "500",
  },
});
