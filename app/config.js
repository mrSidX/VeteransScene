// API Configuration
export const API_CONFIG = {
  // All API calls route to api.veteransscene.org
  BASE_URL: 'https://api.veteransscene.org/api',

  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',

    // Users
    USERS: '/users',

    // Applications
    APPLICATIONS: '/applications',
    APPLICATIONS_SUBMIT: '/applications/submit',
    APPLICATION_STATS: '/applications/stats/dashboard',
  }
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: "Veteran's Scene",
  VERSION: '1.0.0',
  TOKEN_KEY: 'vs_auth_token',
  USER_KEY: 'vs_user_data'
};
