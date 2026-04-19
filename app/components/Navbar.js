import { useAuthStore } from '../stores/auth.js';
import { useRouter } from 'vue-router';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import NotificationBell from './NotificationBell.js';

export default {
  name: 'Navbar',
  components: {
    NotificationBell
  },
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();
    const showMobileMenu = ref(false);
    const showContentMenu = ref(false);
    const showRecordingMenu = ref(false);
    const showModerationMenu = ref(false);
    const showGuestsMenu = ref(false);
    const pendingDeletions = ref(0);
    let deletionPollInterval = null;

    const isTemporaryUser = computed(() => authStore.user.value?.isTemporary === true);

    const fetchDeletionCount = async () => {
      if (!authStore.isSuperAdmin.value) return;
      try {
        const res = await window.api.get('/super-admin/queue/stats');
        if (res.success) pendingDeletions.value = res.data.total || 0;
      } catch (e) { /* ignore */ }
    };

    onMounted(() => {
      if (authStore.isSuperAdmin.value) {
        fetchDeletionCount();
        deletionPollInterval = setInterval(fetchDeletionCount, 60000);
      }
    });

    onUnmounted(() => {
      if (deletionPollInterval) clearInterval(deletionPollInterval);
    });

    const handleLogout = async () => {
      authStore.logout();
      showMobileMenu.value = false;
      // Redirect to login page immediately
      await router.push({ name: 'Login' });
    };

    const closeMobileMenu = () => {
      showMobileMenu.value = false;
      showContentMenu.value = false;
      showRecordingMenu.value = false;
      showModerationMenu.value = false;
      showGuestsMenu.value = false;
    };

    const navigateTo = async (route) => {
      await router.push(route);
      closeMobileMenu();
    };

    const getAvatarUrl = () => {
      const user = authStore.user.value;
      if (!user?.profile?.avatarUrl || !user?.id) return '';
      const url = window.api.getAvatarUrl(user.id);
      return `${url}?v=${encodeURIComponent(user.profile.avatarUrl)}`;
    };

    return {
      authStore,
      handleLogout,
      showMobileMenu,
      showContentMenu,
      showRecordingMenu,
      showModerationMenu,
      showGuestsMenu,
      closeMobileMenu,
      navigateTo,
      getAvatarUrl,
      isTemporaryUser,
      pendingDeletions
    };
  },
  template: `
    <nav class="bg-gray-800 bg-opacity-95 border-b border-gray-700 sticky top-0 z-40 shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <img src="/assets/img/vs-logo.jpg" alt="Veteran's Scene Logo" class="w-10 h-10 rounded-lg">
          <router-link to="/" class="text-xl sm:text-2xl font-bold text-yellow-400 tracking-wide hover:text-yellow-300">
            Veteran's Scene
          </router-link>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-4">
          <!-- Guest Account Navigation -->
          <template v-if="authStore.isAuthenticated.value && isTemporaryUser">
            <router-link to="/guest-dashboard" class="py-2 text-yellow-400 font-semibold hover:text-yellow-300 transition">
              My Dashboard
            </router-link>
            <span class="text-gray-400 text-sm">Guest Account</span>
            <button @click="handleLogout" class="text-gray-300 hover:text-red-400 text-sm font-medium transition">
              Logout
            </button>
          </template>

          <template v-else-if="!authStore.isAuthenticated.value">
            <router-link to="/tributes" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Tributes
            </router-link>
            <router-link to="/login" class="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-md font-semibold transition">
              Login
            </router-link>
          </template>

          <template v-else-if="!isTemporaryUser">
            <router-link to="/dashboard" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Dashboard
            </router-link>

            <!-- Guests Dropdown -->
            <div v-if="authStore.isModerator.value" class="relative group">
              <button class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition flex items-center space-x-1">
                <span>Guests</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div class="absolute left-0 mt-0 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <router-link to="/applications" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  👤 Applicants
                </router-link>
                <router-link to="/readiness-checks" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm">
                  🎙️ Readiness Checks
                </router-link>
              </div>
            </div>

            <!-- Content Dropdown -->
            <div v-if="authStore.isModerator.value" class="relative group">
              <button class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition flex items-center space-x-1">
                <span>Content</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div class="absolute left-0 mt-0 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <router-link to="/segments" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  📊 Segments
                </router-link>
                <router-link to="/highlights" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  ⭐ Tributes
                </router-link>
                <router-link to="/prompt-templates" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  🎯 Prompt Templates
                </router-link>
                <router-link to="/dropbox" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  📁 Dropbox
                </router-link>
                <router-link to="/help-topics" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  ❓ Help Topics
                </router-link>
                <a href="/assets/docs/Veteran_Interview_Guide.pdf" target="_blank" rel="noopener" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  📘 Interview Guide
                </a>
                <!-- Recording section divider -->
                <div class="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-900/50 border-b border-gray-700">Recording</div>
                <router-link to="/recording-slots" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  🎚️ Recording Slots
                </router-link>
                <router-link to="/obs-machines" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  🖥️ OBS Machines
                </router-link>
                <router-link to="/recordings-browser" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  🎬 Browse Recordings
                </router-link>
                <router-link to="/recording-access" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  🎥 Grant Recording Access
                </router-link>
                <router-link to="/storage" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  💾 Storage
                </router-link>
                <router-link v-if="authStore.isAdmin.value" to="/s3-browser" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm">
                  ☁️ S3 Browser
                </router-link>
              </div>
            </div>

            <!-- Moderation Dropdown -->
            <div v-if="authStore.isModerator.value" class="relative group">
              <button class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition flex items-center space-x-1">
                <span>Moderation</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div class="absolute left-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <router-link to="/mail" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  📧 Mail
                </router-link>
                <router-link to="/flags" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm">
                  🚩 Flags
                </router-link>
              </div>
            </div>

            <router-link v-if="authStore.isAdmin.value" to="/users" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Users
            </router-link>

            <router-link v-if="authStore.isAdmin.value" to="/security" class="py-2 text-red-400 hover:text-red-300 font-medium transition">
              Security
            </router-link>

            <!-- Super Admin Review Queue -->
            <router-link v-if="authStore.isSuperAdmin.value" to="/super-admin" class="py-2 text-purple-400 hover:text-purple-300 font-medium transition flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Review
              <span v-if="pendingDeletions > 0" class="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{{ pendingDeletions }}</span>
            </router-link>

            <!-- Notification Bell -->
            <notification-bell />

            <div class="relative group">
              <button class="flex items-center space-x-2 py-2 px-2 rounded-lg hover:bg-gray-700 transition">
                <!-- Avatar Image -->
                <div v-if="authStore.user.value?.profile?.avatarUrl" class="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600">
                  <img :src="getAvatarUrl()" :alt="authStore.user.value.firstName" class="w-full h-full object-cover">
                </div>
                <!-- Avatar Fallback (Initials) -->
                <div v-else class="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-gray-900 text-xs font-bold">
                  {{ (authStore.user.value?.firstName || 'U')[0] }}{{ (authStore.user.value?.lastName || '')[0] }}
                </div>
                <span class="text-gray-300">{{ authStore.user.value?.firstName }}</span>
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div class="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <!-- Profile Header -->
                <div class="px-4 py-3 border-b border-gray-700 flex items-center space-x-3">
                  <div v-if="authStore.user.value?.profile?.avatarUrl" class="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex-shrink-0">
                    <img :src="getAvatarUrl()" :alt="authStore.user.value.firstName" class="w-full h-full object-cover">
                  </div>
                  <div v-else class="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center text-gray-900 text-sm font-bold flex-shrink-0">
                    {{ (authStore.user.value?.firstName || 'U')[0] }}{{ (authStore.user.value?.lastName || '')[0] }}
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-100">{{ authStore.user.value?.firstName }} {{ authStore.user.value?.lastName }}</p>
                    <p class="text-xs text-gray-400">{{ authStore.user.value?.email }}</p>
                  </div>
                </div>
                <!-- Menu Items -->
                <router-link to="/profile" class="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  My Profile
                </router-link>
                <router-link to="/my-applications" class="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  My Applications
                </router-link>
                <router-link v-if="authStore.isAdmin.value" to="/site-settings" class="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  <span class="inline-flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Site Settings
                  </span>
                </router-link>
                <button @click="handleLogout" class="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-red-400 transition text-sm border-t border-gray-700">
                  Logout
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Mobile: Login button when not authenticated -->
        <router-link v-if="!authStore.isAuthenticated.value" to="/login" class="md:hidden bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-md font-semibold text-sm transition">
          Login
        </router-link>

        <!-- Mobile Menu Button -->
        <button @click="showMobileMenu = true" v-if="authStore.isAuthenticated.value" class="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-700 transition">
          <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </nav>

    <!-- Mobile Menu Panel -->
    <div v-if="showMobileMenu" class="fixed inset-0 z-50 md:hidden">
      <!-- Backdrop -->
      <div @click="closeMobileMenu" class="absolute inset-0 bg-black bg-opacity-50"></div>

      <!-- Menu Panel (slides from right) -->
      <div class="absolute right-0 top-0 h-full w-64 bg-gray-800 shadow-xl overflow-y-auto">
        <!-- Close Button -->
        <div class="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <span class="text-lg font-semibold text-gray-100">Menu</span>
          <button @click="closeMobileMenu" class="p-2 hover:bg-gray-700 rounded-lg transition">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- User Profile Section -->
        <div v-if="authStore.user.value" class="px-4 py-4 border-b border-gray-700 flex items-center space-x-3">
          <div v-if="authStore.user.value?.profile?.avatarUrl" class="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex-shrink-0">
            <img :src="getAvatarUrl()" :alt="authStore.user.value.firstName" class="w-full h-full object-cover">
          </div>
          <div v-else class="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center text-gray-900 text-sm font-bold flex-shrink-0">
            {{ (authStore.user.value?.firstName || 'U')[0] }}{{ (authStore.user.value?.lastName || '')[0] }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-100 truncate">{{ authStore.user.value?.firstName }} {{ authStore.user.value?.lastName }}</p>
            <p class="text-xs text-gray-400 truncate">{{ authStore.user.value?.email }}</p>
          </div>
        </div>

        <!-- Notifications Link (Mobile) -->
        <div class="px-4 py-3 border-b border-gray-700">
          <router-link @click="closeMobileMenu" to="/notifications" class="flex items-center gap-2 text-gray-300 hover:text-yellow-400 transition font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            Notifications
          </router-link>
        </div>

        <!-- Navigation Links -->
        <div class="px-2 py-4 space-y-1">
          <!-- Dashboard -->
          <router-link @click="closeMobileMenu" to="/dashboard" class="block px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg font-medium min-h-[44px] flex items-center">
            Dashboard
          </router-link>

          <!-- Guests Menu (Expandable) -->
          <div v-if="authStore.isModerator.value">
            <button @click="showGuestsMenu = !showGuestsMenu" class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg font-medium min-h-[44px] flex items-center justify-between">
              <span>Guests</span>
              <svg :class="['w-4 h-4 transition-transform', showGuestsMenu ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div v-if="showGuestsMenu" class="pl-4 space-y-1">
              <router-link @click="closeMobileMenu" to="/applications" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg text-sm">
                👤 Applicants
              </router-link>
              <router-link @click="closeMobileMenu" to="/readiness-checks" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg text-sm">
                🎙️ Readiness Checks
              </router-link>
            </div>
          </div>

          <!-- Content Menu (Expandable) -->
          <div v-if="authStore.isModerator.value">
            <button @click="showContentMenu = !showContentMenu" class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg font-medium min-h-[44px] flex items-center justify-between">
              <span>Content</span>
              <svg :class="['w-4 h-4 transition-transform', showContentMenu ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div v-if="showContentMenu" class="pl-4 space-y-1">
              <router-link @click="closeMobileMenu" to="/segments" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                📊 Segments
              </router-link>
              <router-link @click="closeMobileMenu" to="/highlights" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                ⭐ Tributes
              </router-link>
              <router-link @click="closeMobileMenu" to="/prompt-templates" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                🎯 Prompt Templates
              </router-link>
              <router-link @click="closeMobileMenu" to="/dropbox" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                📁 Dropbox
              </router-link>
              <router-link @click="closeMobileMenu" to="/help-topics" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                ❓ Help Topics
              </router-link>
              <a @click="closeMobileMenu" href="/assets/docs/Veteran_Interview_Guide.pdf" target="_blank" rel="noopener" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                📘 Interview Guide
              </a>
              <!-- Recording sub-section -->
              <div class="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recording</div>
              <router-link @click="closeMobileMenu" to="/recording-slots" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                🎚️ Recording Slots
              </router-link>
              <router-link @click="closeMobileMenu" to="/obs-machines" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                🖥️ OBS Machines
              </router-link>
              <router-link @click="closeMobileMenu" to="/recordings-browser" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                🎬 Browse Recordings
              </router-link>
              <router-link @click="closeMobileMenu" to="/recording-access" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                🎥 Grant Recording Access
              </router-link>
              <router-link @click="closeMobileMenu" to="/storage" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                💾 Storage
              </router-link>
              <router-link v-if="authStore.isAdmin.value" @click="closeMobileMenu" to="/s3-browser" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                ☁️ S3 Browser
              </router-link>
            </div>
          </div>

          <!-- Moderation Menu (Expandable) -->
          <div v-if="authStore.isModerator.value">
            <button @click="showModerationMenu = !showModerationMenu" class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg font-medium min-h-[44px] flex items-center justify-between">
              <span>Moderation</span>
              <svg :class="['w-4 h-4 transition-transform', showModerationMenu ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div v-if="showModerationMenu" class="pl-4 space-y-1">
              <router-link @click="closeMobileMenu" to="/mail" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                📧 Mail
              </router-link>
              <router-link @click="closeMobileMenu" to="/flags" class="block px-4 py-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg min-h-[44px] flex items-center">
                🚩 Flags
              </router-link>
            </div>
          </div>

          <!-- Users (Admin Only) -->
          <router-link v-if="authStore.isAdmin.value" @click="closeMobileMenu" to="/users" class="block px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg font-medium min-h-[44px] flex items-center">
            Users
          </router-link>

          <!-- Security (Admin Only) -->
          <router-link v-if="authStore.isAdmin.value" @click="closeMobileMenu" to="/security" class="block px-4 py-3 text-red-400 hover:bg-gray-700 hover:text-red-300 transition rounded-lg font-medium min-h-[44px] flex items-center">
            Security
          </router-link>

          <!-- Super Admin Review Queue -->
          <router-link v-if="authStore.isSuperAdmin.value" @click="closeMobileMenu" to="/super-admin" class="block px-4 py-3 text-purple-400 hover:bg-gray-700 hover:text-purple-300 transition rounded-lg font-medium min-h-[44px] flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            Review Queue
            <span v-if="pendingDeletions > 0" class="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{{ pendingDeletions }}</span>
          </router-link>

          <!-- Site Settings (Admin Only) -->
          <router-link v-if="authStore.isAdmin.value" @click="closeMobileMenu" to="/site-settings" class="block px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg font-medium min-h-[44px] flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Site Settings
          </router-link>

          <!-- Profile -->
          <router-link @click="closeMobileMenu" to="/profile" class="block px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg font-medium min-h-[44px] flex items-center">
            My Profile
          </router-link>

          <!-- My Applications -->
          <router-link @click="closeMobileMenu" to="/my-applications" class="block px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition rounded-lg font-medium min-h-[44px] flex items-center">
            My Applications
          </router-link>
        </div>

        <!-- Logout Button -->
        <div class="border-t border-gray-700 px-2 py-4">
          <button @click="handleLogout" class="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-700 hover:text-red-300 transition rounded-lg font-medium min-h-[44px] flex items-center">
            Logout
          </button>
        </div>
      </div>
    </div>
  `
};
