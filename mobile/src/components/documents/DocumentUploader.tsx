import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { uploadResume } from "../../lib/storage";
import { logger } from "../../lib/logger";

interface DocumentUploaderProps {
    userId: string;
    currentDocumentUrl?: string | null;
    currentDocumentName?: string | null;
    onUploadComplete: (url: string, name: string) => void;
    onRemove: () => void;
    label?: string;
}

export default function DocumentUploader({
    userId,
    currentDocumentUrl,
    currentDocumentName,
    onUploadComplete,
    onRemove,
    label = "Resume",
}: DocumentUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const file = result.assets[0];
                handleUpload(file.uri, file.name);
            }
        } catch (error) {
            logger.error("Error picking document:", error);
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const handleUpload = async (uri: string, name: string) => {
        setUploading(true);
        setProgress(0);
        try {
            const result = await uploadResume(userId, uri, name, (p) => {
                setProgress(p.progress);
            });
            onUploadComplete(result.downloadURL, name);
            Alert.alert("Success", `${label} uploaded successfully!`);
        } catch (error) {
            logger.error("Error uploading document:", error);
            Alert.alert("Error", `Failed to upload ${label}. Please try again.`);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    const handleRemove = () => {
        Alert.alert(
            `Remove ${label}`,
            `Are you sure you want to remove your ${label.toLowerCase()}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: onRemove,
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>

            {currentDocumentUrl ? (
                <View style={styles.fileContainer}>
                    <View style={styles.fileInfo}>
                        <Text style={styles.fileIcon}>📄</Text>
                        <Text style={styles.fileName} numberOfLines={1}>
                            {currentDocumentName || label}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={handleRemove}
                        disabled={uploading}
                    >
                        <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickDocument}
                    disabled={uploading}
                >
                    {uploading ? (
                        <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="small" color="#94A3B8" />
                            <Text style={styles.uploadingText}>{Math.round(progress)}%</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.uploadIcon}>📎</Text>
                            <Text style={styles.uploadText}>Upload {label} (PDF, DOC)</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}

            {uploading && (
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
            )}

            <Text style={styles.hint}>
                Supported formats: PDF, DOC, DOCX. Max size: 5MB.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        color: "#F8FAFC",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    fileContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#1E293B",
        borderWidth: 1,
        borderColor: "#14B8A6",
        borderRadius: 12,
        padding: 14,
    },
    fileInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    fileIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    fileName: {
        color: "#F8FAFC",
        fontSize: 14,
        flex: 1,
    },
    removeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    removeText: {
        color: "#EF4444",
        fontSize: 14,
        fontWeight: "500",
    },
    uploadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1E293B",
        borderWidth: 1,
        borderColor: "#334155",
        borderRadius: 12,
        padding: 14,
        borderStyle: "dashed",
        height: 54,
    },
    uploadIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    uploadText: {
        color: "#94A3B8",
        fontSize: 14,
    },
    uploadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    uploadingText: {
        color: "#94A3B8",
        fontSize: 12,
    },
    progressBarBg: {
        height: 2,
        backgroundColor: "#1E293B",
        borderRadius: 1,
        marginTop: 8,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#14B8A6",
    },
    hint: {
        color: "#64748B",
        fontSize: 12,
        marginTop: 4,
    },
});
