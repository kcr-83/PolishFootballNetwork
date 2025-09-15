import { AppConfig } from '../app/core/models';

export const environment: AppConfig = {
  production: false,
  apiUrl: 'https://localhost:7076/api',
  version: '1.0.0',
  buildTimestamp: new Date().toISOString(),
  supportEmail: 'support@polishfootballnetwork.com',
  features: {
    enableDarkMode: true,
    enableNotifications: true,
    enableAnalytics: false,
    enableExperimentalFeatures: true,
    maintenanceMode: false,
  },
};
