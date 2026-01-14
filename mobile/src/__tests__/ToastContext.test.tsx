import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, Button } from 'react-native';
import { ToastProvider, useToast } from '../context/ToastContext';

// Test component that uses the toast context
function TestToastConsumer() {
  const { showToast, hideToast } = useToast();

  return (
    <>
      <Button
        testID="show-success"
        title="Success"
        onPress={() => showToast('Success message', 'success')}
      />
      <Button
        testID="show-error"
        title="Error"
        onPress={() => showToast('Error message', 'error')}
      />
      <Button
        testID="show-warning"
        title="Warning"
        onPress={() => showToast('Warning message', 'warning')}
      />
      <Button
        testID="show-info"
        title="Info"
        onPress={() => showToast('Info message', 'info')}
      />
      <Button
        testID="show-with-action"
        title="With Action"
        onPress={() =>
          showToast('Action message', 'info', {
            label: 'Retry',
            onPress: () => {},
          })
        }
      />
    </>
  );
}

describe('ToastContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('renders children', () => {
      const { getByText } = render(
        <ToastProvider>
          <Text>Child Content</Text>
        </ToastProvider>
      );

      expect(getByText('Child Content')).toBeTruthy();
    });
  });

  describe('showToast', () => {
    it('shows success toast', () => {
      const { getByTestId, getByText } = render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );

      act(() => {
        fireEvent.press(getByTestId('show-success'));
        jest.runAllTimers();
      });

      expect(getByText('Success message')).toBeTruthy();
    });

    it('shows error toast', () => {
      const { getByTestId, getByText } = render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );

      act(() => {
        fireEvent.press(getByTestId('show-error'));
        jest.runAllTimers();
      });

      expect(getByText('Error message')).toBeTruthy();
    });

    it('shows warning toast', () => {
      const { getByTestId, getByText } = render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );

      act(() => {
        fireEvent.press(getByTestId('show-warning'));
        jest.runAllTimers();
      });

      expect(getByText('Warning message')).toBeTruthy();
    });

    it('shows info toast', () => {
      const { getByTestId, getByText } = render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );

      act(() => {
        fireEvent.press(getByTestId('show-info'));
        jest.runAllTimers();
      });

      expect(getByText('Info message')).toBeTruthy();
    });

    it('shows toast with action button', () => {
      const { getByTestId, getByText } = render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );

      act(() => {
        fireEvent.press(getByTestId('show-with-action'));
        jest.runAllTimers();
      });

      expect(getByText('Action message')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('shows multiple toasts', () => {
      const { getByTestId, getByText } = render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );

      act(() => {
        fireEvent.press(getByTestId('show-success'));
        fireEvent.press(getByTestId('show-error'));
        jest.runAllTimers();
      });

      expect(getByText('Success message')).toBeTruthy();
      expect(getByText('Error message')).toBeTruthy();
    });
  });

  describe('useToast hook', () => {
    it('throws error when used outside provider', () => {
      // Temporarily suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        function TestComponent() {
          useToast();
          return null;
        }
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('provides showToast and hideToast functions', () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useToast();
        return null;
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(contextValue.showToast).toBeInstanceOf(Function);
      expect(contextValue.hideToast).toBeInstanceOf(Function);
    });
  });
});
