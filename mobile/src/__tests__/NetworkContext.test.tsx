import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { NetworkProvider, useNetwork } from '../context/NetworkContext';
import NetInfo from '@react-native-community/netinfo';

// Test component that uses the network context
function TestNetworkConsumer() {
  const { isConnected, isInternetReachable, connectionType } = useNetwork();

  return (
    <>
      <Text testID="is-connected">{isConnected ? 'connected' : 'disconnected'}</Text>
      <Text testID="is-reachable">
        {isInternetReachable === null
          ? 'unknown'
          : isInternetReachable
          ? 'reachable'
          : 'not-reachable'}
      </Text>
      <Text testID="connection-type">{connectionType || 'none'}</Text>
    </>
  );
}

describe('NetworkContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to return connected state
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
  });

  describe('NetworkProvider', () => {
    it('renders children', () => {
      const { getByText } = render(
        <NetworkProvider>
          <Text>Child Content</Text>
        </NetworkProvider>
      );

      expect(getByText('Child Content')).toBeTruthy();
    });

    it('provides initial connected state', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <TestNetworkConsumer />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('is-connected').props.children).toBe('connected');
      });
    });

    it('subscribes to network state changes', () => {
      render(
        <NetworkProvider>
          <TestNetworkConsumer />
        </NetworkProvider>
      );

      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });

    it('fetches initial network state', () => {
      render(
        <NetworkProvider>
          <TestNetworkConsumer />
        </NetworkProvider>
      );

      expect(NetInfo.fetch).toHaveBeenCalled();
    });
  });

  describe('useNetwork hook', () => {
    it('provides network state values', async () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useNetwork();
        return null;
      }

      render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(contextValue).toBeDefined();
        expect(typeof contextValue.isConnected).toBe('boolean');
        expect(contextValue.isInternetReachable).toBeDefined();
      });
    });

    it('returns default values when used outside provider', () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useNetwork();
        return null;
      }

      render(<TestComponent />);

      expect(contextValue.isConnected).toBe(true); // Default value
    });
  });

  describe('network state updates', () => {
    it('updates when network becomes disconnected', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <TestNetworkConsumer />
        </NetworkProvider>
      );

      // Wait for initial state
      await waitFor(() => {
        expect(getByTestId('is-connected').props.children).toBe('connected');
      });

      // Simulate network disconnection
      await act(async () => {
        const listeners = (NetInfo.addEventListener as jest.Mock).mock.calls;
        if (listeners.length > 0) {
          const callback = listeners[0][0];
          callback({
            isConnected: false,
            isInternetReachable: false,
            type: 'none',
          });
        }
      });

      await waitFor(() => {
        expect(getByTestId('is-connected').props.children).toBe('disconnected');
      });
    });

    it('updates connection type', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <TestNetworkConsumer />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('connection-type').props.children).toBe('wifi');
      });

      // Simulate switching to cellular
      await act(async () => {
        const listeners = (NetInfo.addEventListener as jest.Mock).mock.calls;
        if (listeners.length > 0) {
          const callback = listeners[0][0];
          callback({
            isConnected: true,
            isInternetReachable: true,
            type: 'cellular',
          });
        }
      });

      await waitFor(() => {
        expect(getByTestId('connection-type').props.children).toBe('cellular');
      });
    });
  });
});
