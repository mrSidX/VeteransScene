import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

export default {
  name: 'ParticipantDashboard',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const loading = ref(true);
    const error = ref('');
    const dashboardData = ref(null);
    const showPasswordBanner = ref(false);

    const user = computed(() => authStore.user.value);
    const fullName = computed(() => user.value ? `${user.value.firstName} ${user.value.lastName}` : '');

    const loadDashboard = async () => {
      try {
        loading.value = true;
        error.value = '';

        const response = await api.getDashboardData();
        if (response.success) {
          dashboardData.value = response.data;
          showPasswordBanner.value = !response.data.user.hasChangedPassword;
        }
      } catch (err) {
        error.value = err.message || 'Failed to load dashboard';
        console.error('Dashboard error:', err);
      } finally {
        loading.value = false;
      }
    };

    const goToProfile = () => {
      router.push('/profile');
    };

    const goToMyApplications = () => {
      router.push('/my-applications');
    };

    const goToChangePassword = () => {
      router.push('/profile?tab=password');
    };

    onMounted(() => {
      loadDashboard();
    });

    return {
      loading,
      error,
      dashboardData,
      showPasswordBanner,
      user,
      fullName,
      goToProfile,
      goToMyApplications,
      goToChangePassword
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div class="max-w-6xl mx-auto">
        <!-- Password Change Banner -->
        <div v-if="showPasswordBanner" class="mb-6 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg p-4 md:p-6">
          <div class="flex items-start gap-4">
            <div class="text-yellow-500 text-2xl">🔐</div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-yellow-400 mb-2">Welcome! Set Your Password</h3>
              <p class="text-sm text-gray-300 mb-4">
                You're currently using a one-time login code. For better security, please create a permanent password for easier future access.
              </p>
              <button
                @click="goToChangePassword"
                class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition"
              >
                Create Password Now →
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center min-h-96">
          <div class="text-center">
            <div class="animate-spin text-4xl mb-4">⟳</div>
            <p class="text-gray-400">Loading your dashboard...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-if="error && !loading" class="bg-red-900/50 border border-red-600 text-red-200 px-6 py-4 rounded-lg mb-6">
          {{ error }}
        </div>

        <!-- Dashboard Content -->
        <div v-if="dashboardData && !loading" class="space-y-6 md:space-y-8">
          <!-- Welcome Header -->
          <div class="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 md:p-8 shadow-lg">
            <div class="flex items-start justify-between gap-6">
              <div>
                <h1 class="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">
                  Welcome back, {{ fullName }}! 👋
                </h1>
                <p class="text-gray-300">
                  Your participant dashboard
                </p>
              </div>
              <div v-if="user?.profile?.avatarUrl" class="hidden md:block">
                <img
                  :src="user.profile.avatarUrl"
                  :alt="fullName"
                  class="w-20 h-20 rounded-full object-cover border-4 border-yellow-400"
                />
              </div>
            </div>
          </div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- My Segments -->
            <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 class="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                My Segments ({{ dashboardData.segmentCount }})
              </h2>

              <div v-if="dashboardData.segments.length === 0" class="text-center py-12">
                <div class="text-4xl mb-3">🎬</div>
                <p class="text-gray-400">No segments assigned yet</p>
                <p class="text-sm text-gray-500 mt-2">Check back soon for your upcoming segments</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="segment in dashboardData.segments"
                  :key="segment.id"
                  class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition cursor-pointer"
                  @click="router.push('/admin/segments/' + segment.id)"
                >
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <h3 class="font-semibold text-white">{{ segment.title }}</h3>
                    <span class="text-xs font-medium px-3 py-1 rounded-full"
                      :class="{
                        'bg-blue-600 text-blue-100': segment.status === 'proposal',
                        'bg-purple-600 text-purple-100': segment.status === 'in-consideration',
                        'bg-indigo-600 text-indigo-100': segment.status === 'in-review',
                        'bg-green-600 text-green-100': segment.status === 'approved',
                        'bg-cyan-600 text-cyan-100': segment.status === 'planning',
                        'bg-orange-600 text-orange-100': segment.status === 'scheduled',
                        'bg-red-600 text-red-100': segment.status === 'completed'
                      }"
                    >
                      {{ segment.status }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-400 mb-2">{{ segment.productionType }}</p>
                  <p v-if="segment.scheduledDate" class="text-xs text-gray-500">
                    📅 {{ new Date(segment.scheduledDate).toLocaleDateString() }}
                  </p>
                </div>
              </div>
            </div>

            <!-- My Applications -->
            <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 class="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                </svg>
                My Applications ({{ dashboardData.applicationCount }})
              </h2>

              <div v-if="dashboardData.applications.length === 0" class="text-center py-12">
                <div class="text-4xl mb-3">📋</div>
                <p class="text-gray-400">No applications found</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="app in dashboardData.applications"
                  :key="app.id"
                  class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition cursor-pointer"
                  @click="goToMyApplications"
                >
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <h3 class="font-semibold text-white">{{ app.firstName }} {{ app.lastName }}</h3>
                    <span class="text-xs font-medium px-3 py-1 rounded-full"
                      :class="{
                        'bg-blue-600 text-blue-100': app.status === 'new',
                        'bg-yellow-600 text-yellow-100': app.status === 'reviewing',
                        'bg-purple-600 text-purple-100': app.status === 'contacted',
                        'bg-green-600 text-green-100': app.status === 'scheduled',
                        'bg-emerald-600 text-emerald-100': app.status === 'completed',
                        'bg-red-600 text-red-100': app.status === 'declined'
                      }"
                    >
                      {{ app.status }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-400">{{ app.email }}</p>
                </div>
              </div>

              <button
                @click="goToMyApplications"
                class="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                View All Applications →
              </button>
            </div>

            <!-- Profile Completeness -->
            <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 class="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Profile Completeness
              </h2>

              <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-400">Overall Progress</span>
                  <span class="text-lg font-bold text-yellow-400">{{ dashboardData.user.profileCompleteness }}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-3">
                  <div
                    class="bg-gradient-to-r from-blue-500 to-yellow-400 h-3 rounded-full transition-all"
                    :style="{ width: dashboardData.user.profileCompleteness + '%' }"
                  ></div>
                </div>
              </div>

              <p class="text-sm text-gray-400 mb-4">
                Complete your profile to improve your visibility and opportunities.
              </p>

              <button
                @click="goToProfile"
                class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
              >
                Edit Profile →
              </button>
            </div>

            <!-- Resources -->
            <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 class="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Resources
              </h2>

              <div class="space-y-3">
                <div class="bg-gray-700 rounded-lg p-4">
                  <h3 class="font-semibold text-white mb-2">🎙️ Podcast Setup Guide</h3>
                  <p class="text-sm text-gray-400 mb-3">Learn how to prepare for your podcast appearance</p>
                  <a href="#" class="text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                    Read Guide →
                  </a>
                </div>

                <div class="bg-gray-700 rounded-lg p-4">
                  <h3 class="font-semibold text-white mb-2">🎬 Interview Prep</h3>
                  <p class="text-sm text-gray-400 mb-3">Tips for giving a great interview</p>
                  <a href="#" class="text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                    View Tips →
                  </a>
                </div>

                <div class="bg-gray-700 rounded-lg p-4">
                  <h3 class="font-semibold text-white mb-2">❓ Get Help</h3>
                  <p class="text-sm text-gray-400 mb-3">Contact our support team</p>
                  <a href="mailto:support@veteransscene.org" class="text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                    Send Email →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
