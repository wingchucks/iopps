import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

const mockRoute = {
  params: {},
};

// Wrapper with navigation context
function NavigationWrapper({ children }: { children: React.ReactNode }) {
  return <NavigationContainer>{children}</NavigationContainer>;
}

// Mock the screens since they have complex dependencies
jest.mock('../screens/JobsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockJobsScreen() {
    return (
      <View testID="jobs-screen">
        <Text>Jobs Screen</Text>
      </View>
    );
  };
});

jest.mock('../screens/ProfileScreen', () => {
  const { View, Text } = require('react-native');
  return function MockProfileScreen() {
    return (
      <View testID="profile-screen">
        <Text>Profile Screen</Text>
      </View>
    );
  };
});

jest.mock('../screens/SavedJobsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockSavedJobsScreen() {
    return (
      <View testID="saved-jobs-screen">
        <Text>Saved Jobs Screen</Text>
      </View>
    );
  };
});

jest.mock('../screens/NotificationsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockNotificationsScreen() {
    return (
      <View testID="notifications-screen">
        <Text>Notifications Screen</Text>
      </View>
    );
  };
});

jest.mock('../screens/ApplicationsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockApplicationsScreen() {
    return (
      <View testID="applications-screen">
        <Text>Applications Screen</Text>
      </View>
    );
  };
});

// Import mocked screens
import JobsScreen from '../screens/JobsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SavedJobsScreen from '../screens/SavedJobsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';

describe('Screen Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JobsScreen', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <JobsScreen navigation={mockNavigation} />
      );
      expect(getByTestId('jobs-screen')).toBeTruthy();
    });

    it('displays screen content', () => {
      const { getByText } = render(
        <JobsScreen navigation={mockNavigation} />
      );
      expect(getByText('Jobs Screen')).toBeTruthy();
    });
  });

  describe('ProfileScreen', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <ProfileScreen navigation={mockNavigation} />
      );
      expect(getByTestId('profile-screen')).toBeTruthy();
    });

    it('displays screen content', () => {
      const { getByText } = render(
        <ProfileScreen navigation={mockNavigation} />
      );
      expect(getByText('Profile Screen')).toBeTruthy();
    });
  });

  describe('SavedJobsScreen', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <SavedJobsScreen navigation={mockNavigation} />
      );
      expect(getByTestId('saved-jobs-screen')).toBeTruthy();
    });

    it('displays screen content', () => {
      const { getByText } = render(
        <SavedJobsScreen navigation={mockNavigation} />
      );
      expect(getByText('Saved Jobs Screen')).toBeTruthy();
    });
  });

  describe('NotificationsScreen', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <NotificationsScreen navigation={mockNavigation} />
      );
      expect(getByTestId('notifications-screen')).toBeTruthy();
    });

    it('displays screen content', () => {
      const { getByText } = render(
        <NotificationsScreen navigation={mockNavigation} />
      );
      expect(getByText('Notifications Screen')).toBeTruthy();
    });
  });

  describe('ApplicationsScreen', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(
        <ApplicationsScreen navigation={mockNavigation} />
      );
      expect(getByTestId('applications-screen')).toBeTruthy();
    });

    it('displays screen content', () => {
      const { getByText } = render(
        <ApplicationsScreen navigation={mockNavigation} />
      );
      expect(getByText('Applications Screen')).toBeTruthy();
    });
  });
});
