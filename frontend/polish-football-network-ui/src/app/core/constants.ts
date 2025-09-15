/**
 * Application constants
 */
export const APP_CONSTANTS = {
  APP_NAME: 'Polish Football Network',
  APP_SHORT_NAME: 'PFN',
  APP_DESCRIPTION: 'Interactive network visualization of Polish football clubs and their connections',

  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      VALIDATE: '/auth/validate',
    },
    CLUBS: {
      BASE: '/clubs',
      SEARCH: '/clubs/search',
      BY_ID: (id: number) => `/clubs/${id}`,
      CONNECTIONS: (id: number) => `/clubs/${id}/connections`,
    },
    CONNECTIONS: {
      BASE: '/connections',
      BY_CLUB: (clubId: number) => `/connections/by-club/${clubId}`,
    },
    GRAPH: {
      DATA: '/graph-data',
    },
    ADMIN: {
      CLUBS: '/admin/clubs',
      CONNECTIONS: '/admin/connections',
      DASHBOARD: '/admin/dashboard',
      UPLOAD_LOGO: (clubId: number) => `/admin/clubs/${clubId}/upload-logo`,
    },
  },

  // Local storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'pfn_auth_token',
    REFRESH_TOKEN: 'pfn_refresh_token',
    USER_DATA: 'pfn_user_data',
    USER_PREFERENCES: 'pfn_user_preferences',
    THEME: 'pfn_theme',
    LANGUAGE: 'pfn_language',
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    MAX_PAGES_DISPLAY: 7,
  },

  // File upload constraints
  FILE_UPLOAD: {
    MAX_SIZE_MB: 5,
    ALLOWED_TYPES: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.svg', '.png', '.jpg', '.jpeg', '.webp'],
  },

  // Graph visualization settings
  GRAPH: {
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 3.0,
    DEFAULT_ZOOM: 1.0,
    ANIMATION_DURATION: 300,
    NODE_SIZE: {
      MIN: 20,
      MAX: 60,
      DEFAULT: 40,
    },
    EDGE_WIDTH: {
      MIN: 1,
      MAX: 8,
      DEFAULT: 3,
    },
  },

  // Validation patterns
  VALIDATION: {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  },

  // HTTP settings
  HTTP: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },

  // Toast notification settings
  NOTIFICATIONS: {
    DURATION: {
      SUCCESS: 3000,
      ERROR: 5000,
      WARNING: 4000,
      INFO: 3000,
    },
    MAX_NOTIFICATIONS: 5,
  },

  // Theme settings
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
  },

  // Debounce delays
  DEBOUNCE: {
    SEARCH: 300,
    RESIZE: 250,
    SCROLL: 100,
  },

  // Cache durations (in milliseconds)
  CACHE: {
    GRAPH_DATA: 5 * 60 * 1000, // 5 minutes
    CLUB_LIST: 2 * 60 * 1000, // 2 minutes
    USER_DATA: 10 * 60 * 1000, // 10 minutes
  },
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  GENERAL: {
    UNKNOWN: 'An unexpected error occurred. Please try again.',
    NETWORK: 'Network error. Please check your connection and try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied. You do not have permission to access this resource.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION: 'Please check your input and try again.',
  },
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid username or password.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    LOGIN_REQUIRED: 'Please log in to access this page.',
    ACCESS_DENIED: 'You do not have permission to access this page.',
  },
  FORM: {
    REQUIRED: 'This field is required.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_URL: 'Please enter a valid URL.',
    INVALID_PASSWORD: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character.',
    PASSWORDS_NOT_MATCH: 'Passwords do not match.',
    MIN_LENGTH: (min: number) => `Minimum ${min} characters required.`,
    MAX_LENGTH: (max: number) => `Maximum ${max} characters allowed.`,
    INVALID_RANGE: (min: number, max: number) => `Value must be between ${min} and ${max}.`,
  },
  FILE: {
    INVALID_TYPE: 'Invalid file type. Please select a valid image file.',
    TOO_LARGE: (maxSizeMB: number) => `File size must be less than ${maxSizeMB}MB.`,
    UPLOAD_FAILED: 'File upload failed. Please try again.',
  },
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  GENERAL: {
    SAVED: 'Successfully saved.',
    DELETED: 'Successfully deleted.',
    UPDATED: 'Successfully updated.',
    CREATED: 'Successfully created.',
  },
  AUTH: {
    LOGIN: 'Successfully logged in.',
    LOGOUT: 'Successfully logged out.',
  },
  CLUB: {
    CREATED: 'Club created successfully.',
    UPDATED: 'Club updated successfully.',
    DELETED: 'Club deleted successfully.',
    LOGO_UPLOADED: 'Club logo uploaded successfully.',
  },
  CONNECTION: {
    CREATED: 'Connection created successfully.',
    UPDATED: 'Connection updated successfully.',
    DELETED: 'Connection deleted successfully.',
  },
} as const;
