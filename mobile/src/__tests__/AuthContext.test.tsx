import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

// Test component that uses the auth context
function TestAuthConsumer() {
  const { user, role, loading, signIn, signUp, signOut: handleSignOut } = useAuth();

  if (loading) {
    return <Text testID="loading">Loading...</Text>;
  }

  return (
    <>
      <Text testID="user-status">{user ? 'logged-in' : 'logged-out'}</Text>
      <Text testID="user-role">{role || 'no-role'}</Text>
      <TouchableOpacity
        testID="sign-in-btn"
        onPress={() => signIn('test@example.com', 'password')}
      >
        <Text>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="sign-up-btn"
        onPress={() => signUp('new@example.com', 'password')}
      >
        <Text>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="sign-out-btn" onPress={handleSignOut}>
        <Text>Sign Out</Text>
      </TouchableOpacity>
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('renders children', async () => {
      const { getByText } = render(
        <AuthProvider>
          <Text>Child Content</Text>
        </AuthProvider>
      );

      expect(getByText('Child Content')).toBeTruthy();
    });

    it('provides initial loading state', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );

      // Should show loading initially
      expect(getByTestId('loading')).toBeTruthy();
    });

    it('provides logged out state after loading', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('user-status').props.children).toBe('logged-out');
      });
    });
  });

  describe('signIn', () => {
    it('calls signInWithEmailAndPassword with correct credentials', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('user-status')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('sign-in-btn'));
      });

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password'
      );
    });
  });

  describe('signUp', () => {
    it('calls createUserWithEmailAndPassword with correct credentials', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('user-status')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('sign-up-btn'));
      });

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@example.com',
        'password'
      );
    });
  });

  describe('signOut', () => {
    it('calls signOut from firebase', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('user-status')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('sign-out-btn'));
      });

      expect(signOut).toHaveBeenCalled();
    });
  });

  describe('useAuth hook', () => {
    it('provides context values', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
        expect(contextValue.loading).toBeDefined();
        expect(contextValue.signIn).toBeInstanceOf(Function);
        expect(contextValue.signUp).toBeInstanceOf(Function);
        expect(contextValue.signOut).toBeInstanceOf(Function);
        expect(contextValue.registerPushNotifications).toBeInstanceOf(Function);
      });
    });
  });
});
