import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import {
  getVendorByUserId,
  getVendorStats,
  updateVendorProfile,
} from "../lib/firestore";
import type { VendorProfile } from "../types";
import { logger } from "../lib/logger";

const WEB_DASHBOARD_URL = "https://iopps.ca/organization/shop/dashboard";

type TabType = "overview" | "profile";

export default function VendorDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [stats, setStats] = useState({ viewCount: 0, productsCount: 0 });
  const [isNewVendor, setIsNewVendor] = useState(false);

  // Form state for editing profile
  const [formData, setFormData] = useState({
    businessName: "",
    tagline: "",
    category: "",
    location: "",
    region: "",
    about: "",
    contactEmail: "",
    contactPhone: "",
    websiteUrl: "",
    instagram: "",
    facebook: "",
  });

  const loadData = async () => {
    if (!user) return;
    try {
      const vendorData = await getVendorByUserId(user.uid);
      if (vendorData) {
        setVendor(vendorData);
        setFormData({
          businessName: vendorData.businessName || "",
          tagline: vendorData.tagline || "",
          category: vendorData.category || "",
          location: vendorData.location || "",
          region: vendorData.region || "",
          about: vendorData.about || "",
          contactEmail: vendorData.contactEmail || "",
          contactPhone: vendorData.contactPhone || "",
          websiteUrl: vendorData.websiteUrl || "",
          instagram: vendorData.instagram || "",
          facebook: vendorData.facebook || "",
        });
        const vendorStats = await getVendorStats(vendorData.id);
        setStats(vendorStats);
        setIsNewVendor(false);
      } else {
        setIsNewVendor(true);
        setActiveTab("profile");
      }
    } catch (error) {
      logger.error("Error loading vendor dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveProfile = async () => {
    if (!vendor) {
      Alert.alert("Info", "Please create your profile on the web first.");
      return;
    }

    setSaving(true);
    try {
      await updateVendorProfile(vendor.id, {
        businessName: formData.businessName,
        tagline: formData.tagline,
        category: formData.category,
        location: formData.location,
        region: formData.region,
        about: formData.about,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        websiteUrl: formData.websiteUrl,
        instagram: formData.instagram,
        facebook: formData.facebook,
      });
      Alert.alert("Success", "Profile updated successfully!");
      await loadData();
    } catch (error) {
      logger.error("Error saving vendor profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (active?: boolean) => {
    return active ? "#22C55E" : "#F59E0B";
  };

  const getStatusText = (active?: boolean) => {
    return active ? "Active" : "Draft";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // New vendor - show create prompt
  if (isNewVendor) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.newVendorContainer}>
          <Text style={styles.newVendorIcon}>🏪</Text>
          <Text style={styles.newVendorTitle}>List Your Business</Text>
          <Text style={styles.newVendorText}>
            Create your Shop Indigenous business profile to connect with customers across North America.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => Linking.openURL(WEB_DASHBOARD_URL)}
          >
            <Text style={styles.createButtonText}>Create Profile on Web</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#14B8A6"
        />
      }
    >
      {/* Header with Status */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {vendor?.logoUrl ? (
            <Image source={{ uri: vendor.logoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>
                {(vendor?.businessName || "V").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.businessName}>{vendor?.businessName}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(vendor?.active) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(vendor?.active) },
                ]}
              >
                {getStatusText(vendor?.active)}
              </Text>
            </View>
          </View>
        </View>
        {vendor?.tagline && (
          <Text style={styles.tagline}>{vendor.tagline}</Text>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.tabActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "profile" && styles.tabActive]}
          onPress={() => setActiveTab("profile")}
        >
          <Text style={[styles.tabText, activeTab === "profile" && styles.tabTextActive]}>
            Edit Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.viewCount}</Text>
              <Text style={styles.statLabel}>Profile Views</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.productsCount}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{vendor?.region || "-"}</Text>
              <Text style={styles.statLabel}>Region</Text>
            </View>
          </View>

          {/* Quick Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Details</Text>
            <View style={styles.infoCard}>
              {vendor?.category && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>{vendor.category}</Text>
                </View>
              )}
              {vendor?.location && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{vendor.location}</Text>
                </View>
              )}
              {vendor?.contactEmail && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{vendor.contactEmail}</Text>
                </View>
              )}
              {vendor?.websiteUrl && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Website</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(vendor.websiteUrl!)}>
                    <Text style={[styles.infoValue, styles.linkText]}>
                      {vendor.websiteUrl}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Linking.openURL(WEB_DASHBOARD_URL)}
            >
              <Text style={styles.actionIcon}>📦</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Manage Products</Text>
                <Text style={styles.actionSubtitle}>Add or edit products on web</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Linking.openURL(WEB_DASHBOARD_URL)}
            >
              <Text style={styles.actionIcon}>💳</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Subscription</Text>
                <Text style={styles.actionSubtitle}>Manage billing on web</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
            {vendor?.active && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() =>
                  (navigation as any).navigate("VendorDetail", { vendorId: vendor.id })
                }
              >
                <Text style={styles.actionIcon}>👁️</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>View Listing</Text>
                  <Text style={styles.actionSubtitle}>See your public profile</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(text) => setFormData({ ...formData, businessName: text })}
              placeholder="Your business name"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tagline</Text>
            <TextInput
              style={styles.input}
              value={formData.tagline}
              onChangeText={(text) => setFormData({ ...formData, tagline: text })}
              placeholder="A short tagline"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.input}
              value={formData.category}
              onChangeText={(text) => setFormData({ ...formData, category: text })}
              placeholder="e.g., Art & Crafts, Food, Clothing"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>City/Town</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="City"
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Province/State</Text>
              <TextInput
                style={styles.input}
                value={formData.region}
                onChangeText={(text) => setFormData({ ...formData, region: text })}
                placeholder="Province"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>About Your Business</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.about}
              onChangeText={(text) => setFormData({ ...formData, about: text })}
              placeholder="Tell customers about your business..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.formSectionTitle}>Contact & Social</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.contactEmail}
              onChangeText={(text) => setFormData({ ...formData, contactEmail: text })}
              placeholder="contact@yourbusiness.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.contactPhone}
              onChangeText={(text) => setFormData({ ...formData, contactPhone: text })}
              placeholder="(555) 123-4567"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Website</Text>
            <TextInput
              style={styles.input}
              value={formData.websiteUrl}
              onChangeText={(text) => setFormData({ ...formData, websiteUrl: text })}
              placeholder="https://yourbusiness.com"
              placeholderTextColor="#64748B"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Instagram</Text>
            <TextInput
              style={styles.input}
              value={formData.instagram}
              onChangeText={(text) => setFormData({ ...formData, instagram: text })}
              placeholder="@yourbusiness"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Facebook</Text>
            <TextInput
              style={styles.input}
              value={formData.facebook}
              onChangeText={(text) => setFormData({ ...formData, facebook: text })}
              placeholder="facebook.com/yourbusiness"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.webEditButton}
            onPress={() => Linking.openURL(WEB_DASHBOARD_URL)}
          >
            <Text style={styles.webEditButtonText}>
              Edit Full Profile on Web (Logo, Images, etc.)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
    fontSize: 14,
  },
  newVendorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  newVendorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  newVendorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  newVendorText: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 32,
    marginBottom: 32,
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  header: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoPlaceholderText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagline: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 12,
    fontStyle: "italic",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#14B8A6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  tabTextActive: {
    color: "#0F172A",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#14B8A6",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  infoValue: {
    fontSize: 14,
    color: "#F8FAFC",
    fontWeight: "500",
  },
  linkText: {
    color: "#14B8A6",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 24,
    color: "#64748B",
  },
  formSection: {
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginTop: 24,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#334155",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  saveButton: {
    backgroundColor: "#14B8A6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  webEditButton: {
    marginTop: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
  },
  webEditButtonText: {
    fontSize: 14,
    color: "#94A3B8",
  },
});
