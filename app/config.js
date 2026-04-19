// API Configuration
// Auto-detect: localhost/127.0.0.1/file:// → local API, else production.
// Override with `?api=http://host:port/api` for ad-hoc testing.
function resolveApiBase() {
  try {
    const qs = new URLSearchParams(window.location.search);
    const override = qs.get('api');
    if (override) return override.replace(/\/$/, '');
    const host = window.location.hostname;
    const isLocal = !host || host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.endsWith('.local');
    if (isLocal) return 'http://localhost:5000/api';
  } catch (_) { /* fall through */ }
  return 'https://api.veteransscene.org/api';
}

export const API_CONFIG = {
  BASE_URL: resolveApiBase(),

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
