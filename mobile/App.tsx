import React, { useRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/context/AuthContext";
import { NotificationProvider, useNotifications } from "./src/context/NotificationContext";

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

// Messaging screens
import MessagesScreen from "./src/screens/MessagesScreen";
import ConversationScreen from "./src/screens/ConversationScreen";

// Notifications
import NotificationsScreen from "./src/screens/NotificationsScreen";

// Tab icon components
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

function MessagesIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>💬</Text>
    </View>
  );
}

function ProfileIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>👤</Text>
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

// Bottom tab navigator for main app screens
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...defaultHeaderOptions,
        tabBarStyle: {
          backgroundColor: "#1E293B",
          borderTopColor: "#334155",
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
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
          tabBarIcon: MessagesIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ProfileIcon,
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
      <AuthProvider>
        <NotificationProvider>
          <NavigationWrapper />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconTextFocused: {
    opacity: 1,
  },
});
