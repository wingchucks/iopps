import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,
});

export function useNetwork() {
  return useContext(NetworkContext);
}

function OfflineBanner({ isVisible }: { isVisible: boolean }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isVisible ? 0 : -60,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
  }, [isVisible]);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          paddingTop: insets.top + 8,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={isVisible ? "auto" : "none"}
    >
      <View style={styles.bannerContent}>
        <Text style={styles.bannerIcon}>📡</Text>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>No Internet Connection</Text>
          <Text style={styles.bannerSubtitle}>
            Some features may be unavailable
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function ReconnectedBanner({
  isVisible,
  onHide,
}: {
  isVisible: boolean;
  onHide: () => void;
}) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isVisible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -60,
          duration: 200,
          useNativeDriver: true,
        }).start(onHide);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.reconnectedBanner,
        {
          paddingTop: insets.top + 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.bannerContent}>
        <Text style={styles.bannerIcon}>✓</Text>
        <Text style={styles.reconnectedText}>Back online</Text>
      </View>
    </Animated.View>
  );
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [networkState, setNetworkState] = useState<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
  });
  const [showOffline, setShowOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable;

      setNetworkState({
        isConnected,
        isInternetReachable,
        connectionType: state.type,
      });

      // Show offline banner when disconnected
      if (!isConnected || isInternetReachable === false) {
        setShowOffline(true);
        wasOffline.current = true;
      } else {
        setShowOffline(false);
        // Show reconnected banner if we were previously offline
        if (wasOffline.current) {
          setShowReconnected(true);
          wasOffline.current = false;
        }
      }
    });

    // Initial fetch
    NetInfo.fetch().then((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
      <OfflineBanner isVisible={showOffline} />
      <ReconnectedBanner
        isVisible={showReconnected}
        onHide={() => setShowReconnected(false)}
      />
    </NetworkContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#DC2626",
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 9998,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  reconnectedBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#059669",
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 9998,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bannerTextContainer: {
    alignItems: "center",
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bannerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  reconnectedText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
