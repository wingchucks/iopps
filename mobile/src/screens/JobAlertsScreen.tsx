import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import {
  getMemberJobAlerts,
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
} from "../lib/firestore";
import type { JobAlert, JobAlertFrequency } from "../types";
import { logger } from "../lib/logger";

export default function JobAlertsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [alertName, setAlertName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [frequency, setFrequency] = useState<JobAlertFrequency>("daily");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAlerts = async () => {
    if (!user) return;
    try {
      const data = await getMemberJobAlerts(user.uid);
      setAlerts(data);
    } catch (error) {
      logger.error("Error loading job alerts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const handleToggle = async (alert: JobAlert) => {
    try {
      await updateJobAlert(alert.id, { active: !alert.active });
      setAlerts(
        alerts.map((a) =>
          a.id === alert.id ? { ...a, active: !a.active } : a
        )
      );
    } catch (error) {
      logger.error("Error toggling alert:", error);
      Alert.alert("Error", "Failed to update alert");
    }
  };

  const handleDelete = (alert: JobAlert) => {
    Alert.alert(
      "Delete Alert",
      "Are you sure you want to delete this alert?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteJobAlert(alert.id);
              setAlerts(alerts.filter((a) => a.id !== alert.id));
            } catch (error) {
              logger.error("Error deleting alert:", error);
              Alert.alert("Error", "Failed to delete alert");
            }
          },
        },
      ]
    );
  };

  const handleCreateAlert = async () => {
    if (!user) return;
    if (!keyword.trim() && !location.trim()) {
      Alert.alert("Required", "Please enter a keyword or location");
      return;
    }

    setSaving(true);
    try {
      const newAlert: Omit<JobAlert, "id"> = {
        memberId: user.uid,
        alertName: alertName.trim() || undefined,
        keyword: keyword.trim() || undefined,
        location: location.trim() || undefined,
        frequency,
        remoteOnly,
        indigenousOnly,
        active: true,
      };
      const id = await createJobAlert(newAlert);
      setAlerts([{ ...newAlert, id } as JobAlert, ...alerts]);
      setModalVisible(false);
      resetForm();
    } catch (error) {
      logger.error("Error creating alert:", error);
      Alert.alert("Error", "Failed to create alert");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setAlertName("");
    setKeyword("");
    setLocation("");
    setFrequency("daily");
    setRemoteOnly(false);
    setIndigenousOnly(false);
  };

  const renderAlertCard = ({ item }: { item: JobAlert }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>
            {item.alertName || item.keyword || "Job Alert"}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.active ? styles.activeBadge : styles.pausedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.active ? styles.activeText : styles.pausedText,
              ]}
            >
              {item.active ? "Active" : "Paused"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardDetails}>
        {item.keyword && (
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Keywords: </Text>
            {item.keyword}
          </Text>
        )}
        {item.location && (
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Location: </Text>
            {item.location}
          </Text>
        )}
        <Text style={styles.detailText}>
          <Text style={styles.detailLabel}>Frequency: </Text>
          <Text style={styles.frequencyText}>{item.frequency}</Text>
        </Text>
      </View>

      <View style={styles.tagsRow}>
        {item.remoteOnly && (
          <View style={styles.filterTag}>
            <Text style={styles.filterTagText}>Remote Only</Text>
          </View>
        )}
        {item.indigenousOnly && (
          <View style={styles.filterTag}>
            <Text style={styles.filterTagText}>Indigenous Only</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggle(item)}
        >
          <Text
            style={[
              styles.actionText,
              item.active ? styles.pauseText : styles.resumeText,
            ]}
          >
            {item.active ? "Pause" : "Resume"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>Sign in Required</Text>
        <Text style={styles.messageText}>
          Please sign in to manage your job alerts.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => (navigation as any).navigate("SignIn")}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Job Alerts</Text>
          <Text style={styles.headerSubtitle}>
            Get notified when new jobs match your criteria
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No job alerts yet</Text>
          <Text style={styles.emptyText}>
            Create alerts to get notified when new jobs match your interests.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.browseButtonText}>Create Alert</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlertCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#14B8A6"
            />
          }
        />
      )}

      {/* Create Alert Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Job Alert</Text>
            <TouchableOpacity onPress={handleCreateAlert} disabled={saving}>
              <Text
                style={[styles.saveText, saving && styles.saveTextDisabled]}
              >
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Alert Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={alertName}
                onChangeText={setAlertName}
                placeholder="e.g., Software Developer Jobs"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Keywords</Text>
              <TextInput
                style={styles.input}
                value={keyword}
                onChangeText={setKeyword}
                placeholder="e.g., developer, manager, designer"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Toronto, Vancouver, Remote"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Frequency</Text>
              <View style={styles.frequencyOptions}>
                {(["instant", "daily", "weekly"] as JobAlertFrequency[]).map(
                  (f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.frequencyOption,
                        frequency === f && styles.frequencyOptionActive,
                      ]}
                      onPress={() => setFrequency(f)}
                    >
                      <Text
                        style={[
                          styles.frequencyOptionText,
                          frequency === f && styles.frequencyOptionTextActive,
                        ]}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Filters</Text>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRemoteOnly(!remoteOnly)}
              >
                <View
                  style={[styles.checkbox, remoteOnly && styles.checkboxActive]}
                >
                  {remoteOnly && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Remote jobs only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIndigenousOnly(!indigenousOnly)}
              >
                <View
                  style={[
                    styles.checkbox,
                    indigenousOnly && styles.checkboxActive,
                  ]}
                >
                  {indigenousOnly && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Indigenous preference jobs only
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  createButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "#10B98120",
  },
  pausedBadge: {
    backgroundColor: "#64748B20",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activeText: {
    color: "#10B981",
  },
  pausedText: {
    color: "#64748B",
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 4,
  },
  detailLabel: {
    color: "#64748B",
  },
  frequencyText: {
    textTransform: "capitalize",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  filterTag: {
    backgroundColor: "#14B8A620",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterTagText: {
    fontSize: 11,
    color: "#14B8A6",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pauseText: {
    color: "#F59E0B",
  },
  resumeText: {
    color: "#10B981",
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  signInButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  cancelText: {
    fontSize: 16,
    color: "#94A3B8",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#14B8A6",
  },
  saveTextDisabled: {
    color: "#64748B",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#F8FAFC",
  },
  frequencyOptions: {
    flexDirection: "row",
    gap: 12,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    alignItems: "center",
  },
  frequencyOptionActive: {
    backgroundColor: "#14B8A620",
    borderColor: "#14B8A6",
  },
  frequencyOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
  },
  frequencyOptionTextActive: {
    color: "#14B8A6",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#334155",
    borderRadius: 6,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#14B8A6",
    borderColor: "#14B8A6",
  },
  checkmark: {
    color: "#0F172A",
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#F8FAFC",
  },
});
