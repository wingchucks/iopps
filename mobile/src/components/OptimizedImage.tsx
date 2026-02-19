import React, { useState, useCallback, memo } from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleSheet,
  View,
  ViewStyle,
  ActivityIndicator,
  Animated,
} from 'react-native';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  width?: number;
  height?: number;
  placeholder?: string;
  fallback?: string;
  showLoader?: boolean;
  fadeIn?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Optimized image component with:
 * - Lazy loading
 * - Placeholder support
 * - Error fallback
 * - Fade-in animation
 * - Loading indicator
 */
function OptimizedImageComponent({
  uri,
  width,
  height,
  placeholder,
  fallback,
  showLoader = true,
  fadeIn = true,
  style,
  containerStyle,
  ...props
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    if (fadeIn) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeIn, fadeAnim]);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  // Determine the source
  const imageSource = error && fallback
    ? { uri: fallback }
    : { uri: uri };

  // Calculate dimensions
  const imageStyle: ImageStyle = {
    width: width || '100%',
    height: height || '100%',
    ...(style as ImageStyle),
  };

  return (
    <View style={[styles.container, { width, height }, containerStyle]}>
      {/* Placeholder while loading */}
      {loading && placeholder && (
        <Image
          source={{ uri: placeholder }}
          style={[styles.placeholder, imageStyle]}
          blurRadius={10}
        />
      )}

      {/* Loading indicator */}
      {loading && showLoader && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#14B8A6" />
        </View>
      )}

      {/* Main image */}
      <Animated.Image
        {...props}
        source={imageSource}
        style={[
          imageStyle,
          fadeIn && { opacity: fadeAnim },
        ]}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        progressiveRenderingEnabled={true}
      />
    </View>
  );
}

export const OptimizedImage = memo(OptimizedImageComponent);

/**
 * Avatar image with circular styling
 */
interface AvatarImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  size?: number;
}

function AvatarImageComponent({
  size = 48,
  style,
  containerStyle,
  ...props
}: AvatarImageProps) {
  return (
    <OptimizedImage
      {...props}
      width={size}
      height={size}
      style={[{ borderRadius: size / 2 }, style]}
      containerStyle={[{ borderRadius: size / 2, overflow: 'hidden' }, containerStyle]}
      fallback="https://via.placeholder.com/100/1E293B/94A3B8?text=?"
    />
  );
}

export const AvatarImage = memo(AvatarImageComponent);

/**
 * Company logo image with consistent styling
 */
interface LogoImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  size?: number;
}

function LogoImageComponent({
  size = 56,
  style,
  containerStyle,
  ...props
}: LogoImageProps) {
  return (
    <OptimizedImage
      {...props}
      width={size}
      height={size}
      style={[{ borderRadius: 12 }, style]}
      containerStyle={[
        {
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#1E293B',
        },
        containerStyle,
      ]}
      fallback="https://via.placeholder.com/100/1E293B/94A3B8?text=Logo"
    />
  );
}

export const LogoImage = memo(LogoImageComponent);

/**
 * Banner/hero image with aspect ratio
 */
interface BannerImageProps extends Omit<OptimizedImageProps, 'height'> {
  aspectRatio?: number;
}

function BannerImageComponent({
  aspectRatio = 16 / 9,
  width = 100,
  style,
  containerStyle,
  ...props
}: BannerImageProps) {
  const numericWidth = typeof width === 'number' ? width : 100;
  const height = numericWidth / aspectRatio;

  return (
    <OptimizedImage
      {...props}
      width={width}
      height={height}
      style={[{ borderRadius: 12 }, style]}
      containerStyle={[
        {
          borderRadius: 12,
          overflow: 'hidden',
        },
        containerStyle,
      ]}
      fallback="https://via.placeholder.com/800x450/1E293B/94A3B8?text=Image"
    />
  );
}

export const BannerImage = memo(BannerImageComponent);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
});
