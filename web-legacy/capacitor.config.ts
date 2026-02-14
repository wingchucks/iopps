import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ca.iopps.app',
  appName: 'IOPPS',
  webDir: 'out',
  server: {
    url: 'https://iopps.ca',
    cleartext: true
  }
};

export default config;
