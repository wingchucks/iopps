import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  checkBiometricCapabilities,
  getBiometricTypeName,
  authenticateWithBiometrics,
  isBiometricLoginEnabled,
  enableBiometricLogin,
  disableBiometricLogin,
  biometricLogin,
} from '../lib/biometrics';

describe('Biometrics utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkBiometricCapabilities', () => {
    it('should return capabilities when biometrics available', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const result = await checkBiometricCapabilities();

      expect(result.isAvailable).toBe(true);
      expect(result.hasFingerprint).toBe(true);
      expect(result.hasFaceId).toBe(true);
    });

    it('should return unavailable when no hardware', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      const result = await checkBiometricCapabilities();

      expect(result.isAvailable).toBe(false);
    });
  });

  describe('getBiometricTypeName', () => {
    it('should return Face ID when available', () => {
      const capabilities = {
        isAvailable: true,
        biometricTypes: [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION],
        hasFaceId: true,
        hasFingerprint: false,
        hasIris: false,
      };

      expect(getBiometricTypeName(capabilities)).toBe('Face ID');
    });

    it('should return Fingerprint when available', () => {
      const capabilities = {
        isAvailable: true,
        biometricTypes: [LocalAuthentication.AuthenticationType.FINGERPRINT],
        hasFaceId: false,
        hasFingerprint: true,
        hasIris: false,
      };

      expect(getBiometricTypeName(capabilities)).toBe('Fingerprint');
    });
  });

  describe('authenticateWithBiometrics', () => {
    it('should return success when authentication succeeds', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await authenticateWithBiometrics();

      expect(result.success).toBe(true);
    });

    it('should return error when authentication fails', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const result = await authenticateWithBiometrics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication cancelled');
    });
  });

  describe('isBiometricLoginEnabled', () => {
    it('should return true when enabled', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');

      const result = await isBiometricLoginEnabled();
      expect(result).toBe(true);
    });

    it('should return false when not enabled', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await isBiometricLoginEnabled();
      expect(result).toBe(false);
    });
  });

  describe('disableBiometricLogin', () => {
    it('should delete stored keys', async () => {
      await disableBiometricLogin();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    });
  });
});
