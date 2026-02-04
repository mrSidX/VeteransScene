import { useAuthStore } from '../stores/auth.js';
import { useRouter } from 'vue-router';

export default {
  name: 'Navbar',
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    const handleLogout = async () => {
      authStore.logout();
      // Redirect to login page immediately
      await router.push({ name: 'Login' });
    };

    return {
      authStore,
      handleLogout
    };
  },
  template: `
    <nav class="bg-gray-800 bg-opacity-95 border-b border-gray-700 sticky top-0 z-50 shadow-md">
      <div class="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <img src="/assets/img/vs-logo.jpg" alt="Veteran's Scene Logo" class="w-10 h-10 rounded-lg">
          <router-link :to="authStore.isAuthenticated.value ? '/dashboard' : '/'" class="text-2xl font-bold text-yellow-400 tracking-wide hover:text-yellow-300">
            Veteran's Scene Admin
          </router-link>
        </div>

        <div class="hidden md:flex items-center space-x-4">
          <template v-if="!authStore.isAuthenticated.value">
            <router-link to="/login" class="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-md font-semibold transition">
              Login
            </router-link>
          </template>

          <template v-else>
            <router-link to="/dashboard" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Dashboard
            </router-link>

            <router-link v-if="authStore.isModerator.value" to="/applications" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Guest Applicants
            </router-link>

            <!-- Content Dropdown -->
            <div v-if="authStore.isModerator.value" class="relative group">
              <button class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition flex items-center space-x-1">
                <span>Content</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div class="absolute left-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <router-link to="/segments" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  📊 Segments
                </router-link>
                <router-link to="/highlights" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm border-b border-gray-700">
                  ⭐ Highlights
                </router-link>
                <router-link to="/prompt-templates" class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm">
                  🎯 Prompt Templates
                </router-link>
              </div>
            </div>

            <router-link v-if="authStore.isModerator.value" to="/flags" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Flags
            </router-link>

            <router-link v-if="authStore.isModerator.value" to="/mail" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Mail
            </router-link>

            <router-link v-if="authStore.isModerator.value" to="/dropbox" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Dropbox
            </router-link>

            <router-link v-if="authStore.isModerator.value" to="/help-topics" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Help Topics
            </router-link>

            <router-link v-if="authStore.isAdmin.value" to="/users" class="py-2 text-gray-300 hover:text-yellow-400 font-medium transition">
              Users
            </router-link>

            <div class="relative group">
              <button class="flex items-center space-x-2 py-2 px-2 rounded-lg hover:bg-gray-700 transition">
                <!-- Avatar Image -->
                <div v-if="authStore.user.value?.avatarUrl" class="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600">
                  <img :src="authStore.user.value.avatarUrl" :alt="authStore.user.value.firstName" class="w-full h-full object-cover">
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
                  <div v-if="authStore.user.value?.avatarUrl" class="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex-shrink-0">
                    <img :src="authStore.user.value.avatarUrl" :alt="authStore.user.value.firstName" class="w-full h-full object-cover">
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
                <router-link to="/profile" class="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-yellow-400 transition text-sm">
                  My Profile
                </router-link>
                <button @click="handleLogout" class="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-red-400 transition text-sm border-t border-gray-700">
                  Logout
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </nav>
  `
};
