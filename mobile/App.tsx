import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/context/AuthContext";
import JobsScreen from "./src/screens/JobsScreen";
import JobDetailScreen from "./src/screens/JobDetailScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SignInScreen from "./src/screens/SignInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import QuickApplyScreen from "./src/screens/QuickApplyScreen";

// Tab icon components
function JobsIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>💼</Text>
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

// Bottom tab navigator for main app screens
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0F172A",
        },
        headerTintColor: "#F8FAFC",
        headerTitleStyle: {
          fontWeight: "600",
        },
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
          title: "Opportunities",
          headerTitle: "IOPPS",
          tabBarIcon: JobsIcon,
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
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0F172A",
        },
        headerTintColor: "#F8FAFC",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
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

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
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
