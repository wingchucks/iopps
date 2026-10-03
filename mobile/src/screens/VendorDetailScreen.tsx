import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { getVendor } from "../lib/listings";
import type { VendorProfile } from "../types";
import { logger } from "../lib/logger";

export default function VendorDetailScreen() {
  const route = useRoute();
  const { vendorId } = route.params as { vendorId: string };
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVendor = async () => {
      try {
        const data = await getVendor(vendorId);
        setVendor(data);
      } catch (error) {
        logger.error("Error loading vendor:", error);
      } finally {
        setLoading(false);
      }
    };
    loadVendor();
  }, [vendorId]);

  const openLink = (url: string | undefined) => {
    if (url) {
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      Linking.openURL(fullUrl);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Vendor not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Hero Image or Logo */}
        {vendor.heroImageUrl ? (
          <Image source={{ uri: vendor.heroImageUrl }} style={styles.heroImage} />
        ) : vendor.logoUrl ? (
          <View style={styles.logoContainer}>
            <Image source={{ uri: vendor.logoUrl }} style={styles.largeLogo} />
          </View>
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>
              {(vendor.businessName || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Badges */}
        {(vendor.featured || !!vendor.category) && (
          <View style={styles.badges}>
            {vendor.featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
            {!!vendor.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{vendor.category}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.businessName}>{vendor.businessName}</Text>

        {/* Location */}
        {!!vendor.location && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>{vendor.location}</Text>
            </View>
          </View>
        )}

        {/* About */}
        {!!vendor.about && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>{vendor.about}</Text>
          </View>
        )}

        {/* Contact & Social */}
        {!!(vendor.websiteUrl || vendor.instagram || vendor.facebook) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connect</Text>
            <View style={styles.socialLinks}>
              {!!vendor.websiteUrl && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => openLink(vendor.websiteUrl)}
                >
                  <Text style={styles.socialIcon}>🌐</Text>
                  <Text style={styles.socialText}>Website</Text>
                </TouchableOpacity>
              )}
              {!!vendor.instagram && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() =>
                    openLink(
                      vendor.instagram.startsWith("http")
                        ? vendor.instagram
                        : `https://instagram.com/${vendor.instagram.replace(/^@/, "")}`
                    )
                  }
                >
                  <Text style={styles.socialIcon}>📸</Text>
                  <Text style={styles.socialText}>Instagram</Text>
                </TouchableOpacity>
              )}
              {!!vendor.facebook && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => openLink(vendor.facebook)}
                >
                  <Text style={styles.socialIcon}>👤</Text>
                  <Text style={styles.socialText}>Facebook</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Contact Info */}
        {!!(vendor.contactEmail || vendor.contactPhone) && (
          <View style={styles.contactCard}>
            {!!vendor.contactEmail && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`mailto:${vendor.contactEmail}`)}
              >
                <Text style={styles.contactIcon}>✉️</Text>
                <Text style={styles.contactText}>{vendor.contactEmail}</Text>
              </TouchableOpacity>
            )}
            {!!vendor.contactPhone && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`tel:${vendor.contactPhone}`)}
              >
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactText}>{vendor.contactPhone}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer with Visit Shop Button */}
      {!!vendor.websiteUrl && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.visitButton}
            onPress={() => openLink(vendor.websiteUrl)}
          >
            <Text style={styles.visitButtonText}>Visit Shop</Text>
          </TouchableOpacity>
        </View>
      )}
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
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  heroImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#1E293B",
  },
  logoContainer: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#1E293B",
  },
  largeLogo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  logoPlaceholder: {
    height: 150,
    backgroundColor: "#EC489920",
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 64,
    fontWeight: "700",
    color: "#EC4899",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 20,
    paddingBottom: 0,
  },
  featuredBadge: {
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  featuredText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: "#64748B20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  businessName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoCard: {
    backgroundColor: "#1E293B",
    margin: 20,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#F8FAFC",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: "#94A3B8",
    lineHeight: 24,
  },
  socialLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  socialButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  socialIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  socialText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "500",
  },
  contactCard: {
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: "#14B8A6",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    padding: 16,
    paddingBottom: 32,
  },
  visitButton: {
    backgroundColor: "#EC4899",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  visitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
