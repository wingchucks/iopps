import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DocumentUploader from "../components/documents/DocumentUploader";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUserProfile } from "../lib/firestore";
import { uploadProfilePhoto } from "../lib/storage";
import type { UserProfile } from "../types";
import { logger } from "../lib/logger";

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [website, setWebsite] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);

  // Validation constants
  const MAX_DISPLAY_NAME = 50;
  const MAX_PHONE = 20;
  const MAX_LOCATION = 100;
  const MAX_BIO = 500;
  const MAX_URL = 200;

  // URL validation helper
  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (optional field)
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Phone validation helper (accepts various formats)
  const isValidPhone = (phoneNum: string): boolean => {
    if (!phoneNum.trim()) return true; // Empty is valid (optional field)
    // Accept digits, spaces, dashes, parentheses, and + for international
    const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
    return phoneRegex.test(phoneNum);
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const data = await getUserProfile(user.uid);
      if (data) {
        setProfile(data);
        setDisplayName(data.displayName || "");
        setPhone(data.phone || "");
        setLocation(data.location || "");
        setBio(data.bio || "");
        setLinkedIn(data.linkedIn || "");
        setWebsite(data.website || "");
        setResumeUrl(data.resumeUrl || null);
        setResumeName(data.resumeName || null);
        if (data.photoURL) {
          setSelectedImage(data.photoURL);
        }
      }
    } catch (error) {
      logger.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to select a profile photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your camera to take a profile photo."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const showImageOptions = () => {
    Alert.alert("Profile Photo", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickImage },
      ...(selectedImage
        ? [
          {
            text: "Remove Photo",
            style: "destructive" as const,
            onPress: () => {
              setSelectedImage(null);
              setImageChanged(true);
            },
          },
        ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };



  const handleSave = async () => {
    if (!user) return;

    // Validate inputs
    const errors: string[] = [];

    if (displayName.length > MAX_DISPLAY_NAME) {
      errors.push(`Display name must be ${MAX_DISPLAY_NAME} characters or less`);
    }

    if (!isValidPhone(phone)) {
      errors.push("Please enter a valid phone number");
    }

    if (location.length > MAX_LOCATION) {
      errors.push(`Location must be ${MAX_LOCATION} characters or less`);
    }

    if (bio.length > MAX_BIO) {
      errors.push(`Bio must be ${MAX_BIO} characters or less`);
    }

    if (linkedIn.trim() && !isValidUrl(linkedIn)) {
      errors.push("Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/yourprofile)");
    }

    if (website.trim() && !isValidUrl(website)) {
      errors.push("Please enter a valid website URL (e.g., https://yourwebsite.com)");
    }

    if (errors.length > 0) {
      Alert.alert("Validation Error", errors.join("\n\n"));
      return;
    }

    setSaving(true);
    try {
      let photoURL = profile.photoURL;

      // Upload new photo if changed
      if (imageChanged && selectedImage && !selectedImage.startsWith("http")) {
        setUploadProgress(0);
        try {
          const uploadResult = await uploadProfilePhoto(
            user.uid,
            selectedImage,
            (progress) => setUploadProgress(progress.progress)
          );
          photoURL = uploadResult.downloadURL;
        } catch (error) {
          logger.error("Error uploading photo:", error);
          Alert.alert("Warning", "Failed to upload photo, but other changes will be saved.");
        }
        setUploadProgress(null);
      } else if (imageChanged && !selectedImage) {
        photoURL = undefined;
      }

      const updates: Partial<UserProfile> = {
        displayName: displayName.trim(),
        phone: phone.trim(),
        location: location.trim(),
        bio: bio.trim(),
        linkedIn: linkedIn.trim(),
        website: website.trim(),
        photoURL,
        resumeUrl: resumeUrl || undefined,
        resumeName: resumeName || undefined,
      };

      await updateUserProfile(user.uid, updates);
      Alert.alert("Success", "Your profile has been updated.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      logger.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Please sign in to edit your profile</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Upload Progress */}
        {uploadProgress !== null && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(uploadProgress)}% uploading...</Text>
          </View>
        )}

        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={showImageOptions}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>
                  {displayName?.charAt(0).toUpperCase() ||
                    user.email?.charAt(0).toUpperCase() ||
                    "?"}
                </Text>
              </View>
            )}
            <View style={styles.photoEditBadge}>
              <Text style={styles.photoEditIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Tap to change photo</Text>
        </View>

        {/* Email (read-only) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{user.email}</Text>
          </View>
          <Text style={styles.fieldHint}>Email cannot be changed</Text>
        </View>

        {/* Display Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name"
            placeholderTextColor="#64748B"
            autoCapitalize="words"
            maxLength={MAX_DISPLAY_NAME}
          />
          <Text style={styles.charCount}>{displayName.length}/{MAX_DISPLAY_NAME}</Text>
        </View>

        {/* Phone */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 555-5555"
            placeholderTextColor="#64748B"
            keyboardType="phone-pad"
            maxLength={MAX_PHONE}
          />
        </View>

        {/* Location */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="City, Province"
            placeholderTextColor="#64748B"
            maxLength={MAX_LOCATION}
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell employers about yourself..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={MAX_BIO}
          />
          <Text style={[styles.charCount, bio.length >= MAX_BIO && styles.charCountLimit]}>
            {bio.length}/{MAX_BIO}
          </Text>
        </View>

        {/* Resume Upload */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Resume</Text>
          <DocumentUploader
            userId={user.uid}
            currentDocumentUrl={resumeUrl}
            currentDocumentName={resumeName}
            onUploadComplete={(url, name) => {
              setResumeUrl(url);
              setResumeName(name);
            }}
            onRemove={() => {
              setResumeUrl(null);
              setResumeName(null);
            }}
            label="Resume"
          />
          <Text style={styles.fieldHint}>Your resume will be used for Quick Apply</Text>
        </View>

        {/* LinkedIn */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>LinkedIn Profile</Text>
          <TextInput
            style={styles.input}
            value={linkedIn}
            onChangeText={setLinkedIn}
            placeholder="https://linkedin.com/in/yourprofile"
            placeholderTextColor="#64748B"
            keyboardType="url"
            autoCapitalize="none"
            maxLength={MAX_URL}
          />
          <Text style={styles.fieldHint}>Include full URL with https://</Text>
        </View>

        {/* Website */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Personal Website</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://yourwebsite.com"
            placeholderTextColor="#64748B"
            keyboardType="url"
            autoCapitalize="none"
            maxLength={MAX_URL}
          />
          <Text style={styles.fieldHint}>Include full URL with https://</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 20,
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
  },

  // Progress
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#1E293B",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#14B8A6",
  },
  progressText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  // Photo Section
  photoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  photoContainer: {
    position: "relative",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#14B8A6",
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#14B8A6",
  },
  photoPlaceholderText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#0F172A",
  },
  photoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1E293B",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0F172A",
  },
  photoEditIcon: {
    fontSize: 16,
  },
  photoHint: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 8,
  },

  // Fields
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#F8FAFC",
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  readOnlyField: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    opacity: 0.6,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#94A3B8",
  },
  fieldHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  charCountLimit: {
    color: "#F59E0B",
  },




  // Buttons
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#1E293B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cancelButtonText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#14B8A6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
});
