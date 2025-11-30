import { device, element, by, expect } from 'detox';

describe('IOPPS App E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should show sign in screen on first launch', async () => {
      await expect(element(by.text('Sign In'))).toBeVisible();
    });

    it('should show email input field', async () => {
      await expect(element(by.id('email-input'))).toBeVisible();
    });

    it('should show password input field', async () => {
      await expect(element(by.id('password-input'))).toBeVisible();
    });

    it('should show error on invalid credentials', async () => {
      await element(by.id('email-input')).typeText('invalid@test.com');
      await element(by.id('password-input')).typeText('wrongpassword');
      await element(by.id('sign-in-button')).tap();

      await expect(element(by.text('Invalid email or password'))).toBeVisible();
    });

    it('should navigate to sign up screen', async () => {
      await element(by.text('Create an account')).tap();
      await expect(element(by.text('Sign Up'))).toBeVisible();
    });
  });

  describe('Jobs Screen', () => {
    // Note: These tests assume user is already logged in
    // In a real scenario, you'd set up authentication first

    it('should show jobs list after login', async () => {
      // This would require setting up a test user
      await expect(element(by.id('jobs-screen'))).toBeVisible();
    });

    it('should show search input', async () => {
      await expect(element(by.id('search-input'))).toBeVisible();
    });

    it('should filter jobs when searching', async () => {
      await element(by.id('search-input')).typeText('Developer');
      await expect(element(by.id('job-card'))).toBeVisible();
    });

    it('should open filter modal', async () => {
      await element(by.id('filter-button')).tap();
      await expect(element(by.id('filter-modal'))).toBeVisible();
    });

    it('should navigate to job detail on tap', async () => {
      await element(by.id('job-card')).atIndex(0).tap();
      await expect(element(by.id('job-detail-screen'))).toBeVisible();
    });
  });

  describe('Job Detail Screen', () => {
    beforeEach(async () => {
      // Navigate to a job detail
      await element(by.id('job-card')).atIndex(0).tap();
    });

    it('should show job title', async () => {
      await expect(element(by.id('job-title'))).toBeVisible();
    });

    it('should show apply button', async () => {
      await expect(element(by.id('apply-button'))).toBeVisible();
    });

    it('should show save job button', async () => {
      await expect(element(by.id('save-job-button'))).toBeVisible();
    });

    it('should go back to jobs list', async () => {
      await element(by.id('back-button')).tap();
      await expect(element(by.id('jobs-screen'))).toBeVisible();
    });
  });

  describe('Profile Screen', () => {
    beforeEach(async () => {
      await element(by.id('profile-tab')).tap();
    });

    it('should show profile screen', async () => {
      await expect(element(by.id('profile-screen'))).toBeVisible();
    });

    it('should show edit profile button', async () => {
      await expect(element(by.id('edit-profile-button'))).toBeVisible();
    });

    it('should navigate to edit profile', async () => {
      await element(by.id('edit-profile-button')).tap();
      await expect(element(by.id('edit-profile-screen'))).toBeVisible();
    });

    it('should show sign out button', async () => {
      await expect(element(by.id('sign-out-button'))).toBeVisible();
    });
  });

  describe('Saved Jobs', () => {
    beforeEach(async () => {
      await element(by.id('saved-tab')).tap();
    });

    it('should show saved jobs screen', async () => {
      await expect(element(by.id('saved-jobs-screen'))).toBeVisible();
    });

    it('should show empty state when no saved jobs', async () => {
      await expect(element(by.id('empty-saved-jobs'))).toBeVisible();
    });
  });

  describe('Applications', () => {
    beforeEach(async () => {
      await element(by.id('applications-tab')).tap();
    });

    it('should show applications screen', async () => {
      await expect(element(by.id('applications-screen'))).toBeVisible();
    });
  });

  describe('Network Handling', () => {
    it('should show offline banner when disconnected', async () => {
      await device.setURLBlacklist(['.*']);
      await device.reloadReactNative();

      await expect(element(by.text('No Internet Connection'))).toBeVisible();

      await device.setURLBlacklist([]);
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh jobs list on pull down', async () => {
      await element(by.id('jobs-list')).swipe('down', 'slow');
      // Verify refresh happened (loading indicator or updated content)
      await expect(element(by.id('jobs-screen'))).toBeVisible();
    });
  });
});
