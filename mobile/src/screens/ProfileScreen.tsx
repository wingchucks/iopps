import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, role, signOut } = useAuth();

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
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => (navigation as any).navigate("SignUp")}
          >
            <Text style={styles.signUpButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.email?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{role || "User"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemIcon}>✏️</Text>
          <Text style={styles.menuItemText}>Edit Profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate("SavedJobs")}
        >
          <Text style={styles.menuItemIcon}>🔖</Text>
          <Text style={styles.menuItemText}>Saved Jobs</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate("Applications")}
        >
          <Text style={styles.menuItemIcon}>📋</Text>
          <Text style={styles.menuItemText}>My Applications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate("JobAlerts")}
        >
          <Text style={styles.menuItemIcon}>🔔</Text>
          <Text style={styles.menuItemText}>Job Alerts</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

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

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemIcon}>🔒</Text>
          <Text style={styles.menuItemText}>Privacy</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemIcon}>❓</Text>
          <Text style={styles.menuItemText}>Help & Support</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>IOPPS Mobile v1.1.0</Text>
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
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
  },
  email: {
    fontSize: 16,
    color: "#F8FAFC",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    color: "#14B8A6",
    fontWeight: "600",
    textTransform: "capitalize",
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
});
