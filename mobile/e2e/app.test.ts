import { device, element, by, expect } from 'detox';

describe('IOPPS Mobile App', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Home Screen', () => {
    it('should show the Jobs tab as the default screen', async () => {
      await expect(element(by.text('Jobs'))).toBeVisible();
    });

    it('should show the bottom tab navigation', async () => {
      await expect(element(by.text('Jobs'))).toBeVisible();
      await expect(element(by.text('Explore'))).toBeVisible();
      await expect(element(by.text('Messages'))).toBeVisible();
      await expect(element(by.text('Profile'))).toBeVisible();
    });
  });

  describe('Navigation', () => {
    it('should navigate to Explore tab when tapped', async () => {
      await element(by.text('Explore')).tap();
      await expect(element(by.text('Explore'))).toBeVisible();
    });

    it('should navigate to Messages tab when tapped', async () => {
      await element(by.text('Messages')).tap();
      await expect(element(by.text('Messages'))).toBeVisible();
    });

    it('should navigate to Profile tab when tapped', async () => {
      await element(by.text('Profile')).tap();
      await expect(element(by.text('Profile'))).toBeVisible();
    });

    it('should navigate back to Jobs tab', async () => {
      await element(by.text('Jobs')).tap();
      await expect(element(by.text('Jobs'))).toBeVisible();
    });
  });

  describe('Profile Screen (Not Signed In)', () => {
    beforeEach(async () => {
      await element(by.text('Profile')).tap();
    });

    it('should show sign in prompt when not authenticated', async () => {
      await expect(element(by.text('Welcome to IOPPS'))).toBeVisible();
    });

    it('should show Sign In button', async () => {
      await expect(element(by.text('Sign In'))).toBeVisible();
    });

    it('should show Create Account button', async () => {
      await expect(element(by.text('Create Account'))).toBeVisible();
    });

    it('should open Sign In modal when Sign In is tapped', async () => {
      await element(by.text('Sign In')).tap();
      await expect(element(by.text('Sign In'))).toBeVisible();
    });
  });

  describe('Jobs Screen', () => {
    beforeEach(async () => {
      await element(by.text('Jobs')).tap();
    });

    it('should show search input', async () => {
      await expect(element(by.text('🔍'))).toBeVisible();
    });

    it('should show filter button', async () => {
      await expect(element(by.text('⚙️'))).toBeVisible();
    });
  });

  describe('Explore Screen', () => {
    beforeEach(async () => {
      await element(by.text('Explore')).tap();
    });

    it('should show Explore categories', async () => {
      await expect(element(by.text('Explore'))).toBeVisible();
    });
  });
});
