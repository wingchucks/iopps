import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RetryableView, InlineRetry } from '../components/RetryableView';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text testID="child-content">Child Content</Text>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByTestId('child-content')).toBeTruthy();
  });

  it('renders error UI when child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText("We're sorry, but something unexpected happened. Please try again.")).toBeTruthy();
  });

  it('renders custom fallback when provided and error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<Text>Custom Fallback</Text>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom Fallback')).toBeTruthy();
  });

  it('shows retry button', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Try Again')).toBeTruthy();
  });

  it('resets error state when retry is pressed', () => {
    let shouldThrow = true;

    function TestComponent() {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <Text testID="recovered">Recovered!</Text>;
    }

    const { getByText, queryByTestId, rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Should show error state
    expect(getByText('Something went wrong')).toBeTruthy();

    // Fix the error before retrying
    shouldThrow = false;

    // Press retry
    fireEvent.press(getByText('Try Again'));

    // Force re-render
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Should show recovered content
    expect(queryByTestId('recovered')).toBeTruthy();
  });
});

describe('RetryableView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with error message', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <RetryableView error="Test error message" onRetry={onRetry} />
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Test error message')).toBeTruthy();
  });

  it('renders with Error object', () => {
    const onRetry = jest.fn();
    const error = new Error('Error object message');
    const { getByText } = render(
      <RetryableView error={error} onRetry={onRetry} />
    );

    expect(getByText('Error object message')).toBeTruthy();
  });

  it('renders with custom title', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <RetryableView
        error="Error"
        onRetry={onRetry}
        title="Custom Title"
      />
    );

    expect(getByText('Custom Title')).toBeTruthy();
  });

  it('renders with custom message', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <RetryableView
        error="Original error"
        onRetry={onRetry}
        message="Custom message"
      />
    );

    expect(getByText('Custom message')).toBeTruthy();
  });

  it('calls onRetry when button pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <RetryableView error="Error" onRetry={onRetry} />
    );

    fireEvent.press(getByText('Try Again'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isRetrying is true', () => {
    const onRetry = jest.fn();
    const { queryByText } = render(
      <RetryableView error="Error" onRetry={onRetry} isRetrying={true} />
    );

    // Should not show "Try Again" text when retrying
    expect(queryByText('Try Again')).toBeNull();
  });

  it('disables button when isRetrying is true', () => {
    const onRetry = jest.fn();
    const { UNSAFE_getByType } = render(
      <RetryableView error="Error" onRetry={onRetry} isRetrying={true} />
    );

    // The button should be disabled
    const touchables = UNSAFE_getByType(require('react-native').TouchableOpacity);
    expect(touchables.props.disabled).toBe(true);
  });

  it('renders default message when error is null', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <RetryableView error={null} onRetry={onRetry} />
    );

    expect(getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
  });
});

describe('InlineRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default message', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<InlineRetry onRetry={onRetry} />);

    expect(getByText('Failed to load')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('renders with custom message', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <InlineRetry onRetry={onRetry} message="Custom error" />
    );

    expect(getByText('Custom error')).toBeTruthy();
  });

  it('calls onRetry when button pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<InlineRetry onRetry={onRetry} />);

    fireEvent.press(getByText('Retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isRetrying is true', () => {
    const onRetry = jest.fn();
    const { queryByText } = render(
      <InlineRetry onRetry={onRetry} isRetrying={true} />
    );

    // Should not show "Retry" text when retrying
    expect(queryByText('Retry')).toBeNull();
  });
});
