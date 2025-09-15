import { AppConfig } from '../app/core/models';

export const environment: AppConfig = {
  production: true,
  apiUrl: 'https://api.polishfootballnetwork.com/api',
  version: '1.0.0',
  buildTimestamp: new Date().toISOString(),
  supportEmail: 'support@polishfootballnetwork.com',
  features: {
    enableDarkMode: true,
    enableNotifications: true,
    enableAnalytics: true,
    enableExperimentalFeatures: false,
    maintenanceMode: false,
  },
};
