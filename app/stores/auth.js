import { reactive, computed } from 'vue';
import api from '../services/api.js';
import { APP_CONFIG } from '../config.js';

const state = reactive({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null
});

// Normalize user data to always have roles array
const normalizeUser = (user) => {
  if (!user) return user;

  // Ensure roles is always an array
  if (!Array.isArray(user.roles)) {
    if (user.role) {
      user.roles = [user.role];
    } else {
      user.roles = ['user'];
    }
  }

  console.log('Normalized user roles:', user.roles);
  return user;
};

// Initialize from localStorage
const initAuth = () => {
  const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
  const userStr = localStorage.getItem(APP_CONFIG.USER_KEY);

  if (token && userStr) {
    try {
      state.token = token;
      state.user = normalizeUser(JSON.parse(userStr));
      state.isAuthenticated = true;
      console.log('Auth initialized from localStorage, user roles:', state.user.roles);
    } catch (e) {
      console.error('Error parsing user data:', e);
      api.logout();
    }
  }
};

// Initialize on load
initAuth();

export const useAuthStore = () => {
  const login = async (email, password) => {
    state.loading = true;
    state.error = null;

    try {
      const response = await api.login(email, password);
      if (response.success) {
        state.user = normalizeUser(response.data.user);
        state.token = response.data.token;
        state.isAuthenticated = true;
        console.log('User logged in. Roles:', state.user.roles);
      }
      return response;
    } catch (error) {
      state.error = error.message;
      throw error;
    } finally {
      state.loading = false;
    }
  };

  const logout = () => {
    api.logout();
    state.user = null;
    state.token = null;
    state.isAuthenticated = false;
    state.error = null;
  };

  const setUser = (user) => {
    state.user = normalizeUser(user);
    localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(state.user));
  };

  const setToken = (token) => {
    state.token = token;
    localStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
    state.isAuthenticated = true;
  };

  const fetchProfile = async () => {
    try {
      const response = await api.getProfile();
      if (response.success) {
        state.user = normalizeUser(response.data.user);
        localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(state.user));
        console.log('Profile fetched. User roles:', state.user.roles);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      logout();
    }
  };

  // Support both single role and multiple roles
  const hasRole = (role) => {
    if (!state.user) return false;
    const userRoles = Array.isArray(state.user.roles) ? state.user.roles : [state.user.role];
    return userRoles.includes(role);
  };

  const hasAnyRole = (...roles) => {
    if (!state.user) return false;
    const userRoles = Array.isArray(state.user.roles) ? state.user.roles : [state.user.role];
    return roles.some(role => userRoles.includes(role));
  };

  const isAdmin = computed(() => hasRole('admin'));
  const isModerator = computed(() => hasAnyRole('moderator', 'admin'));

  return {
    // State
    user: computed(() => state.user),
    token: computed(() => state.token),
    isAuthenticated: computed(() => state.isAuthenticated),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    isAdmin,
    isModerator,

    // Role checking methods
    hasRole,
    hasAnyRole,

    // Actions
    login,
    logout,
    setUser,
    setToken,
    fetchProfile
  };
};
