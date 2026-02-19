import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Linking,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../lib/firestore";
import { AccountState } from "../services/accountState";
import type { UserProfile } from "../types";
import { logger } from "../lib/logger";

const PRIVACY_POLICY_URL = "https://iopps.ca/privacy";
const HELP_SUPPORT_URL = "https://iopps.ca/contact";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const {
    user,
    role,
    signOut,
    accountState,
    employerProfile,
    canAccessEmployerDashboard,
    isEmployerPending,
    refreshAccountState,
  } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Reload profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadProfile();
        // Also refresh account state in case employer was approved
        refreshAccountState();
      }
    }, [user, refreshAccountState])
  );

  const loadProfile = async () => {
    if (!user) return;
    setLoadError(false);
    try {
      const data = await getUserProfile(user.uid);
      setProfile(data);
    } catch (error) {
      logger.error("Error loading profile:", error);
      setLoadError(true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProfile();
      await refreshAccountState();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.notSignedIn}>
          <Text style={styles.title}>Welcome to IOPPS</Text>
          <Text style={styles.subtitle}>
            Indigenous Opportunities & Partnerships Platform
          </Text>
          <Text style={styles.description}>
            Sign in to save jobs, track applications, and get personalized recommendations.
          </Text>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => (navigation as any).navigate("SignIn")}
            accessibilityLabel="Sign in to your account"
            accessibilityRole="button"
            testID="profile-signin-button"
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => (navigation as any).navigate("SignUp")}
            accessibilityLabel="Create a new account"
            accessibilityRole="button"
            testID="profile-signup-button"
          >
            <Text style={styles.signUpButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayName = profile?.displayName || employerProfile?.organizationName || user.email?.split("@")[0] || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Determine the role badge text based on account state
  const getRoleBadgeText = () => {
    switch (accountState) {
      case AccountState.EMPLOYER_APPROVED:
        return "Employer";
      case AccountState.EMPLOYER_PENDING:
        return "Employer (Pending)";
      case AccountState.VENDOR:
        return "Vendor";
      case AccountState.ADMIN:
        return "Admin";
      default:
        return "Community Member";
    }
  };

  // Get badge style based on account state
  const getRoleBadgeStyle = () => {
    if (isEmployerPending) {
      return [styles.roleBadge, styles.roleBadgePending];
    }
    return styles.roleBadge;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#14B8A6"
          colors={["#14B8A6"]}
        />
      }
    >
      {/* Error Banner */}
      {loadError && (
        <TouchableOpacity style={styles.errorBanner} onPress={handleRefresh}>
          <Text style={styles.errorBannerIcon}>⚠️</Text>
          <View style={styles.errorBannerContent}>
            <Text style={styles.errorBannerTitle}>Failed to load profile</Text>
            <Text style={styles.errorBannerText}>Tap to retry</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Pending Employer Banner */}
      {isEmployerPending && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerIcon}>⏳</Text>
          <View style={styles.pendingBannerContent}>
            <Text style={styles.pendingBannerTitle}>Application Pending</Text>
            <Text style={styles.pendingBannerText}>
              Your employer account is being reviewed. You can set up your organization profile while we review your application.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.header}>
        {profile?.photoURL || employerProfile?.logoUrl ? (
          <Image
            source={{ uri: profile?.photoURL || employerProfile?.logoUrl }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
        )}
        <Text style={styles.displayName} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
        <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">{user.email}</Text>
        {profile?.location && (
          <Text style={styles.location} numberOfLines={1} ellipsizeMode="tail">📍 {profile.location}</Text>
        )}
        <View style={getRoleBadgeStyle()}>
          <Text style={[styles.roleText, isEmployerPending && styles.roleTextPending]}>
            {getRoleBadgeText()}
          </Text>
        </View>
      </View>

      {/* Employer Dashboard Access - Show for pending AND approved employers */}
      {canAccessEmployerDashboard && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employer Dashboard</Text>
          <TouchableOpacity
            style={[styles.dashboardCard, isEmployerPending && styles.dashboardCardPending]}
            onPress={() => (navigation as any).navigate("EmployerDashboard")}
          >
            <View style={styles.dashboardCardContent}>
              <Text style={styles.dashboardIcon}>🏢</Text>
              <View style={styles.dashboardTextContainer}>
                <Text style={styles.dashboardTitle}>
                  {isEmployerPending ? "Employer Dashboard" : "Employer Dashboard"}
                </Text>
                <Text style={styles.dashboardSubtitle}>
                  {isEmployerPending
                    ? "Set up your organization profile"
                    : "Manage jobs, applications & more"}
                </Text>
              </View>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Vendor Dashboard - Only for vendors and admins */}
      {(role === "vendor" || role === "admin") && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendor Dashboard</Text>
          <TouchableOpacity
            style={styles.dashboardCard}
            onPress={() => (navigation as any).navigate("VendorDashboard")}
          >
            <View style={styles.dashboardCardContent}>
              <Text style={styles.dashboardIcon}>🛍️</Text>
              <View style={styles.dashboardTextContainer}>
                <Text style={styles.dashboardTitle}>Vendor Dashboard</Text>
                <Text style={styles.dashboardSubtitle}>Manage your shop profile</Text>
              </View>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Community Member Features - Only show for community members (not employers) */}
      {accountState === AccountState.COMMUNITY && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate("EditProfile")}
            accessibilityLabel="Edit Profile"
            accessibilityRole="button"
            testID="profile-edit-button"
          >
            <Text style={styles.menuItemIcon}>✏️</Text>
            <Text style={styles.menuItemText}>Edit Profile</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate("SavedJobs")}
            accessibilityLabel="Saved Jobs"
            accessibilityRole="button"
            testID="profile-saved-jobs"
          >
            <Text style={styles.menuItemIcon}>🔖</Text>
            <Text style={styles.menuItemText}>Saved Jobs</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate("Applications")}
            accessibilityLabel="My Applications"
            accessibilityRole="button"
            testID="profile-applications"
          >
            <Text style={styles.menuItemIcon}>📋</Text>
            <Text style={styles.menuItemText}>My Applications</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate("JobAlerts")}
            accessibilityLabel="Job Alerts"
            accessibilityRole="button"
            testID="profile-job-alerts"
          >
            <Text style={styles.menuItemIcon}>🔔</Text>
            <Text style={styles.menuItemText}>Job Alerts</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Employer-specific menu items */}
      {canAccessEmployerDashboard && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organization</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL("https://iopps.ca/organization/profile")}
          >
            <Text style={styles.menuItemIcon}>🏢</Text>
            <Text style={styles.menuItemText}>Edit Organization Profile</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {!isEmployerPending && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL("https://iopps.ca/organization/jobs/new")}
            >
              <Text style={styles.menuItemIcon}>📝</Text>
              <Text style={styles.menuItemText}>Post a Job</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate("Notifications")}
        >
          <Text style={styles.menuItemIcon}>📢</Text>
          <Text style={styles.menuItemText}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
        >
          <Text style={styles.menuItemIcon}>🔒</Text>
          <Text style={styles.menuItemText}>Privacy Policy</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Linking.openURL(HELP_SUPPORT_URL)}
        >
          <Text style={styles.menuItemIcon}>❓</Text>
          <Text style={styles.menuItemText}>Help & Support</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        accessibilityLabel="Sign out of your account"
        accessibilityRole="button"
        testID="profile-signout-button"
      >
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version} accessibilityLabel="App version 1.2.0">IOPPS Mobile v1.2.0</Text>
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
  notSignedIn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#14B8A6",
    textAlign: "center",
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  signInButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
  },
  signInButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  signUpButton: {
    borderWidth: 2,
    borderColor: "#14B8A6",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
  },
  signUpButtonText: {
    color: "#14B8A6",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  // Pending Employer Banner
  pendingBanner: {
    flexDirection: "row",
    backgroundColor: "#F59E0B20",
    borderWidth: 1,
    borderColor: "#F59E0B40",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pendingBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pendingBannerContent: {
    flex: 1,
  },
  pendingBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FCD34D",
    marginBottom: 4,
  },
  pendingBannerText: {
    fontSize: 14,
    color: "#FDE68A",
    lineHeight: 20,
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#14B8A6",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
  },
  displayName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgePending: {
    backgroundColor: "#F59E0B20",
    borderWidth: 1,
    borderColor: "#F59E0B40",
  },
  roleText: {
    fontSize: 12,
    color: "#14B8A6",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  roleTextPending: {
    color: "#FCD34D",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: "#F8FAFC",
  },
  menuArrow: {
    fontSize: 20,
    color: "#64748B",
  },
  dashboardCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#14B8A620",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#14B8A640",
  },
  dashboardCardPending: {
    backgroundColor: "#F59E0B15",
    borderColor: "#F59E0B30",
  },
  dashboardCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  dashboardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  dashboardTextContainer: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 2,
  },
  dashboardSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
  },
  signOutButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  signOutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  version: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
  },
  // Error Banner
  errorBanner: {
    flexDirection: "row",
    backgroundColor: "#EF444420",
    borderWidth: 1,
    borderColor: "#EF444440",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  errorBannerContent: {
    flex: 1,
  },
  errorBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FCA5A5",
    marginBottom: 4,
  },
  errorBannerText: {
    fontSize: 14,
    color: "#FCA5A5",
  },
});
