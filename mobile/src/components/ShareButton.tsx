import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ShareableItem,
  shareItem,
  getSharePlatforms,
  ShareResult,
} from '@/lib/sharing';

export interface ShareButtonProps {
  item: ShareableItem;
  variant?: 'icon' | 'button' | 'dropdown';
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  shareCount?: number;
  onShareComplete?: (result: ShareResult) => void;
  style?: any;
}

export default function ShareButton({
  item,
  variant = 'icon',
  size = 'medium',
  showCount = false,
  shareCount = 0,
  onShareComplete,
  style,
}: ShareButtonProps) {
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const iconSizes = {
    small: 20,
    medium: 24,
    large: 28,
  };

  const handleShare = async () => {
    if (variant === 'dropdown') {
      setShowPlatformModal(true);
      return;
    }

    setIsSharing(true);
    try {
      const result = await shareItem(item);

      if (result.success) {
        Alert.alert(
          'Shared!',
          `Successfully shared via ${result.platform}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Share Failed',
          result.error || 'Could not share at this time',
          [{ text: 'OK' }]
        );
      }

      onShareComplete?.(result);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSharing(false);
    }
  };

  const handlePlatformShare = async (
    platform: ReturnType<typeof getSharePlatforms>[number]
  ) => {
    setShowPlatformModal(false);
    setIsSharing(true);

    try {
      const result = await platform.handler(item);

      if (result.success) {
        Alert.alert(
          'Shared!',
          platform.id === 'copy'
            ? 'Link copied to clipboard'
            : `Successfully shared to ${platform.name}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Share Failed',
          result.error || `Could not share to ${platform.name}`,
          [{ text: 'OK' }]
        );
      }

      onShareComplete?.(result);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSharing(false);
    }
  };

  const renderIconButton = () => (
    <TouchableOpacity
      onPress={handleShare}
      disabled={isSharing}
      style={[styles.iconButton, style]}
      activeOpacity={0.7}
    >
      {isSharing ? (
        <ActivityIndicator size="small" color="#14B8A6" />
      ) : (
        <View style={styles.iconContainer}>
          <Ionicons
            name="share-social-outline"
            size={iconSizes[size]}
            color="#14B8A6"
          />
          {showCount && shareCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {shareCount > 99 ? '99+' : shareCount}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderButton = () => (
    <TouchableOpacity
      onPress={handleShare}
      disabled={isSharing}
      style={[styles.button, style]}
      activeOpacity={0.7}
    >
      {isSharing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="share-social-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Share</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {variant === 'icon' || variant === 'dropdown' ? renderIconButton() : renderButton()}

      <Modal
        visible={showPlatformModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlatformModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlatformModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share via</Text>
              <TouchableOpacity onPress={() => setShowPlatformModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.platformList}>
              {getSharePlatforms().map((platform) => (
                <TouchableOpacity
                  key={platform.id}
                  style={styles.platformItem}
                  onPress={() => handlePlatformShare(platform)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.platformIcon,
                      { backgroundColor: platform.color },
                    ]}
                  >
                    <Ionicons name={platform.icon as any} size={24} color="#fff" />
                  </View>
                  <Text style={styles.platformName}>{platform.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  platformList: {
    padding: 20,
    gap: 16,
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});
