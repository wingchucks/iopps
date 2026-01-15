import React, { useRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet } from "react-native";
import { NavigationContainer, NavigationContainerRef, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import { AuthProvider } from "./src/context/AuthContext";
import { NotificationProvider, useNotifications } from "./src/context/NotificationContext";
import { BadgeProvider, useBadges } from "./src/context/BadgeContext";
import { ToastProvider } from "./src/context/ToastContext";
import { NetworkProvider } from "./src/context/NetworkContext";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Main screens
import JobsScreen from "./src/screens/JobsScreen";
import JobDetailScreen from "./src/screens/JobDetailScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SignInScreen from "./src/screens/SignInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import QuickApplyScreen from "./src/screens/QuickApplyScreen";

// Explore screens
import ExploreScreen from "./src/screens/ExploreScreen";
import ConferencesScreen from "./src/screens/ConferencesScreen";
import ConferenceDetailScreen from "./src/screens/ConferenceDetailScreen";
import ScholarshipsScreen from "./src/screens/ScholarshipsScreen";
import ScholarshipDetailScreen from "./src/screens/ScholarshipDetailScreen";
import ShopScreen from "./src/screens/ShopScreen";
import VendorDetailScreen from "./src/screens/VendorDetailScreen";
import PowwowsScreen from "./src/screens/PowwowsScreen";
import PowwowDetailScreen from "./src/screens/PowwowDetailScreen";
import LiveStreamsScreen from "./src/screens/LiveStreamsScreen";

// Member screens
import SavedJobsScreen from "./src/screens/SavedJobsScreen";
import JobAlertsScreen from "./src/screens/JobAlertsScreen";
import ApplicationsScreen from "./src/screens/ApplicationsScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";

// Messaging screens
import MessagesScreen from "./src/screens/MessagesScreen";
import ConversationScreen from "./src/screens/ConversationScreen";

// Notifications
import NotificationsScreen from "./src/screens/NotificationsScreen";

// Employer/Vendor Dashboard screens
import EmployerDashboardScreen from "./src/screens/EmployerDashboardScreen";
import EmployerApplicationsScreen from "./src/screens/EmployerApplicationsScreen";
import EmployerJobsScreen from "./src/screens/EmployerJobsScreen";
import ApplicationDetailScreen from "./src/screens/ApplicationDetailScreen";
import VendorDashboardScreen from "./src/screens/VendorDashboardScreen";

// Tab icon components with badge support
function JobsIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>💼</Text>
    </View>
  );
}

function ExploreIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>🧭</Text>
    </View>
  );
}

function MessagesIconWithBadge({ focused }: { focused: boolean }) {
  const { counts } = useBadges();
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>💬</Text>
      {counts.messages > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {counts.messages > 99 ? "99+" : counts.messages}
          </Text>
        </View>
      )}
    </View>
  );
}

function ProfileIconWithBadge({ focused }: { focused: boolean }) {
  const { counts } = useBadges();
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>👤</Text>
      {counts.notifications > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {counts.notifications > 99 ? "99+" : counts.notifications}
          </Text>
        </View>
      )}
    </View>
  );
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Default header options
const defaultHeaderOptions = {
  headerStyle: {
    backgroundColor: "#0F172A",
  },
  headerTintColor: "#F8FAFC",
  headerTitleStyle: {
    fontWeight: "600" as const,
  },
};

// Deep linking configuration
const prefix = Linking.createURL("/");
const linking: LinkingOptions<any> = {
  prefixes: [prefix, "iopps://", "https://iopps.ca"],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Jobs: "jobs",
          Explore: "explore",
          Messages: "messages",
          Profile: "profile",
        },
      },
      JobDetail: "job/:jobId",
      ConferenceDetail: "conference/:conferenceId",
      ScholarshipDetail: "scholarship/:scholarshipId",
      VendorDetail: "vendor/:vendorId",
      PowwowDetail: "powwow/:powwowId",
      Conversation: "conversation/:conversationId",
      Notifications: "notifications",
      Applications: "applications",
      ApplicationDetail: "application/:applicationId",
      SavedJobs: "saved-jobs",
      JobAlerts: "job-alerts",
      EditProfile: "edit-profile",
      SignIn: "sign-in",
      SignUp: "sign-up",
    },
  },
};

// Bottom tab navigator for main app screens
function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        ...defaultHeaderOptions,
        tabBarStyle: {
          backgroundColor: "#1E293B",
          borderTopColor: "#334155",
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: "#14B8A6",
        tabBarInactiveTintColor: "#64748B",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          title: "Jobs",
          headerTitle: "IOPPS",
          tabBarIcon: JobsIcon,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: "Explore",
          tabBarIcon: ExploreIcon,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: "Messages",
          tabBarIcon: MessagesIconWithBadge,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ProfileIconWithBadge,
        }}
      />
    </Tab.Navigator>
  );
}

// Root stack navigator
function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
      {/* Main Tabs */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />

      {/* Job Flow */}
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{
          title: "Job Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="QuickApply"
        component={QuickApplyScreen}
        options={{
          title: "Quick Apply",
          headerBackTitle: "Back",
        }}
      />

      {/* Explore Screens */}
      <Stack.Screen
        name="Conferences"
        component={ConferencesScreen}
        options={{
          title: "Conferences",
          headerBackTitle: "Explore",
        }}
      />
      <Stack.Screen
        name="ConferenceDetail"
        component={ConferenceDetailScreen}
        options={{
          title: "Event Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Scholarships"
        component={ScholarshipsScreen}
        options={{
          title: "Scholarships",
          headerBackTitle: "Explore",
        }}
      />
      <Stack.Screen
        name="ScholarshipDetail"
        component={ScholarshipDetailScreen}
        options={{
          title: "Scholarship Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          title: "Shop Indigenous",
          headerBackTitle: "Explore",
        }}
      />
      <Stack.Screen
        name="VendorDetail"
        component={VendorDetailScreen}
        options={{
          title: "Vendor",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="Powwows"
        component={PowwowsScreen}
        options={{
          title: "Pow Wows",
          headerBackTitle: "Explore",
        }}
      />
      <Stack.Screen
        name="PowwowDetail"
        component={PowwowDetailScreen}
        options={{
          title: "Event Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="LiveStreams"
        component={LiveStreamsScreen}
        options={{
          title: "Live Streams",
          headerBackTitle: "Explore",
        }}
      />

      {/* Member Screens */}
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: "Edit Profile",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="SavedJobs"
        component={SavedJobsScreen}
        options={{
          title: "Saved Jobs",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="JobAlerts"
        component={JobAlertsScreen}
        options={{
          title: "Job Alerts",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="Applications"
        component={ApplicationsScreen}
        options={{
          title: "My Applications",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: "Notifications",
          headerBackTitle: "Back",
        }}
      />

      {/* Messaging */}
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{
          title: "Conversation",
          headerBackTitle: "Messages",
        }}
      />

      {/* Auth Screens (Modal) */}
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{
          title: "Sign In",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{
          title: "Create Account",
          presentation: "modal",
        }}
      />

      {/* Employer Dashboard Screens */}
      <Stack.Screen
        name="EmployerDashboard"
        component={EmployerDashboardScreen}
        options={{
          title: "Employer Dashboard",
          headerBackTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="EmployerApplications"
        component={EmployerApplicationsScreen}
        options={{
          title: "Applications",
          headerBackTitle: "Dashboard",
        }}
      />
      <Stack.Screen
        name="EmployerJobs"
        component={EmployerJobsScreen}
        options={{
          title: "My Job Postings",
          headerBackTitle: "Dashboard",
        }}
      />
      <Stack.Screen
        name="ApplicationDetail"
        component={ApplicationDetailScreen}
        options={{
          title: "Application Details",
          headerBackTitle: "Back",
        }}
      />

      {/* Vendor Dashboard Screen */}
      <Stack.Screen
        name="VendorDashboard"
        component={VendorDashboardScreen}
        options={{
          title: "Vendor Dashboard",
          headerBackTitle: "Profile",
        }}
      />
    </Stack.Navigator>
  );
}

// Navigation wrapper that passes ref to NotificationContext
function NavigationWrapper() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const { setNavigationRef } = useNotifications();

  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
    }
  }, [setNavigationRef]);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        if (navigationRef.current) {
          setNavigationRef(navigationRef.current);
        }
      }}
    >
      <RootNavigator />
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NetworkProvider>
          <AuthProvider>
            <BadgeProvider>
              <NotificationProvider>
                <ToastProvider>
                  <NavigationWrapper />
                </ToastProvider>
              </NotificationProvider>
            </BadgeProvider>
          </AuthProvider>
        </NetworkProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconText: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconTextFocused: {
    opacity: 1,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
