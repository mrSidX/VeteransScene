// API Configuration
export const API_CONFIG = {
  // Use environment-based API URL
  BASE_URL: (() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Development: localhost, 127.0.0.1, or file protocol
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '' ||
        protocol === 'file:') {
      return 'http://localhost:5000/api';
    }

    // Production/Beta: use same domain with /api path (proxied by Apache)
    return `${protocol}//${hostname}/api`;
  })(),

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
