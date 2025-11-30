import React from 'react';
import { render } from '@testing-library/react-native';
import {
  Skeleton,
  JobCardSkeleton,
  JobListSkeleton,
  MessageSkeleton,
  MessageListSkeleton,
  NotificationSkeleton,
  ProfileHeaderSkeleton,
} from '../components/Skeleton';

describe('Skeleton components', () => {
  describe('Skeleton', () => {
    it('renders with default props', () => {
      const { toJSON } = render(<Skeleton />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with custom dimensions', () => {
      const { toJSON } = render(
        <Skeleton width={100} height={50} borderRadius={10} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('JobCardSkeleton', () => {
    it('renders job card skeleton', () => {
      const { toJSON } = render(<JobCardSkeleton />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('JobListSkeleton', () => {
    it('renders multiple job skeletons', () => {
      const { getAllByTestId, toJSON } = render(<JobListSkeleton count={3} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders default count of 5', () => {
      const { toJSON } = render(<JobListSkeleton />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('MessageSkeleton', () => {
    it('renders message skeleton', () => {
      const { toJSON } = render(<MessageSkeleton />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('MessageListSkeleton', () => {
    it('renders multiple message skeletons', () => {
      const { toJSON } = render(<MessageListSkeleton count={4} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('NotificationSkeleton', () => {
    it('renders notification skeleton', () => {
      const { toJSON } = render(<NotificationSkeleton />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('ProfileHeaderSkeleton', () => {
    it('renders profile header skeleton', () => {
      const { toJSON } = render(<ProfileHeaderSkeleton />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
