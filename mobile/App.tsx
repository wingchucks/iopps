import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { AuthProvider } from "./src/context/AuthContext";

// Screens
import JobsScreen from "./src/screens/JobsScreen";
import JobDetailScreen from "./src/screens/JobDetailScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SignInScreen from "./src/screens/SignInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icon component
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: { [key: string]: string } = {
    Jobs: "briefcase",
    Search: "search",
    Profile: "user",
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabIconText, focused && styles.tabIconTextFocused]}>
        {name === "Jobs" ? "💼" : name === "Search" ? "🔍" : "👤"}
      </Text>
    </View>
  );
}

// Main tab navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: "#14B8A6",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#1E293B",
          borderTopColor: "#334155",
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#0F172A",
        },
        headerTintColor: "#F8FAFC",
        headerTitleStyle: {
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          title: "Opportunities",
          headerTitle: "IOPPS",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
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
        contentStyle: {
          backgroundColor: "#0F172A",
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: "Job Details" }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: "Sign In" }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: "Create Account" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconText: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconTextFocused: {
    opacity: 1,
  },
});
