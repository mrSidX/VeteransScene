import { ref, reactive, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { useAuthStore } from '../stores/auth.js';
import ApiService from '../services/api.js';

export default {
  name: 'MyApplications',
  setup() {
    const authStore = useAuthStore();
    const applications = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const expandedApplicationId = ref(null);

    const statusConfig = {
      new: { color: 'bg-blue-100 border-blue-400', badge: 'bg-blue-500', label: 'New' },
      reviewing: { color: 'bg-amber-100 border-amber-400', badge: 'bg-amber-500', label: 'Reviewing' },
      contacted: { color: 'bg-purple-100 border-purple-400', badge: 'bg-purple-500', label: 'Contacted' },
      scheduled: { color: 'bg-green-100 border-green-400', badge: 'bg-green-500', label: 'Scheduled' },
      completed: { color: 'bg-emerald-100 border-emerald-400', badge: 'bg-emerald-500', label: 'Completed' },
      declined: { color: 'bg-red-100 border-red-400', badge: 'bg-red-500', label: 'Not Moving Forward' },
      archived: { color: 'bg-gray-100 border-gray-400', badge: 'bg-gray-500', label: 'Archived' }
    };

    const statusFlow = ['new', 'reviewing', 'contacted', 'scheduled', 'completed'];

    onMounted(async () => {
      try {
        loading.value = true;
        const response = await ApiService.get('/applications/my-applications');
        if (response.success) {
          applications.value = response.data.applications || [];
        } else {
          error.value = response.message || 'Failed to load applications';
        }
      } catch (err) {
        console.error('Error loading applications:', err);
        error.value = err.message || 'Error loading your applications';
      } finally {
        loading.value = false;
      }
    });

    const toggleApplication = (appId) => {
      expandedApplicationId.value = expandedApplicationId.value === appId ? null : appId;
    };

    const getNextStep = (status) => {
      const nextSteps = {
        new: 'Your application is in our queue. We typically review applications within 5-7 business days.',
        reviewing: 'Our team is reviewing your application. We\'ll be in touch soon!',
        contacted: 'We\'ve reached out! Please check your email and respond to our message.',
        scheduled: 'Your interview has been scheduled! Check below for date and details.',
        completed: 'Thank you for participating in Veteran\'s Scene!',
        declined: 'Thank you for your interest. Feel free to apply again in the future.',
        archived: 'Your application has been archived.'
      };
      return nextSteps[status] || 'Check back for updates';
    };

    const getStatusIndex = (status) => {
      return statusFlow.indexOf(status);
    };

    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    };

    return {
      applications,
      loading,
      error,
      expandedApplicationId,
      statusConfig,
      statusFlow,
      toggleApplication,
      getNextStep,
      getStatusIndex,
      formatDate
    };
  },
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-12">
          <h1 class="text-4xl font-bold text-white mb-2">My Applications</h1>
          <p class="text-slate-300">Track your Veteran's Scene application status in real-time</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          <p>{{ error }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin">
            <div class="h-8 w-8 border-4 border-slate-400 border-t-yellow-500 rounded-full"></div>
          </div>
          <p class="mt-4 text-slate-300">Loading your applications...</p>
        </div>

        <!-- No Applications -->
        <div v-else-if="applications.length === 0" class="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
          <p class="text-slate-300 mb-4">You haven't submitted any applications yet.</p>
          <a href="#/apply" class="inline-block px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold rounded-lg transition">
            Submit Application
          </a>
        </div>

        <!-- Applications List -->
        <div v-else class="space-y-6">
          <div
            v-for="app in applications"
            :key="app._id"
            class="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition"
          >
            <!-- Application Header (Clickable) -->
            <button
              @click="toggleApplication(app._id)"
              class="w-full px-6 py-4 text-left hover:bg-slate-800/80 transition flex items-center justify-between"
            >
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h2 class="text-xl font-bold text-white">
                    {{ app.firstName }} {{ app.lastName }}
                  </h2>
                  <span :class="['px-3 py-1 rounded-full text-xs font-bold text-white', statusConfig[app.status]?.badge]">
                    {{ statusConfig[app.status]?.label }}
                  </span>
                </div>
                <p class="text-sm text-slate-400">Applied {{ formatDate(app.submittedAt) }}</p>
              </div>
              <svg :class="['w-5 h-5 text-slate-400 transition transform', expandedApplicationId === app._id ? 'rotate-180' : '']"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </button>

            <!-- Expanded Details -->
            <div v-if="expandedApplicationId === app._id" class="border-t border-slate-700 px-6 py-6 bg-slate-900/50">
              <!-- Application Info -->
              <div class="mb-8">
                <h3 class="text-lg font-semibold text-yellow-500 mb-4">Application Details</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-slate-400">Type</p>
                    <p class="text-white font-medium">{{ app.applicationType.replace('-', ' ') }}</p>
                  </div>
                  <div>
                    <p class="text-slate-400">Branch</p>
                    <p class="text-white font-medium">{{ app.branches?.[0] || app.branch || 'Not specified' }}</p>
                  </div>
                  <div>
                    <p class="text-slate-400">Email</p>
                    <p class="text-white font-medium">{{ app.email }}</p>
                  </div>
                  <div>
                    <p class="text-slate-400">Phone</p>
                    <p class="text-white font-medium">{{ app.phone || 'Not provided' }}</p>
                  </div>
                </div>
              </div>

              <!-- Status Timeline -->
              <div class="mb-8">
                <h3 class="text-lg font-semibold text-yellow-500 mb-4">Application Status</h3>
                <div class="relative">
                  <!-- Timeline -->
                  <div class="space-y-4">
                    <div class="flex items-start gap-4">
                      <div class="flex flex-col items-center">
                        <div class="w-4 h-4 bg-yellow-500 rounded-full mt-1"></div>
                        <div class="w-1 h-16 bg-slate-600 my-1"></div>
                      </div>
                      <div>
                        <p class="font-semibold text-white">Submitted</p>
                        <p class="text-sm text-slate-400">{{ formatDate(app.submittedAt) }}</p>
                        <p class="text-sm text-slate-500 mt-1">Your application was received successfully</p>
                      </div>
                    </div>

                    <!-- Status milestones -->
                    <div v-for="(status, idx) in ['reviewing', 'contacted', 'scheduled', 'completed']" :key="status" class="flex items-start gap-4">
                      <div class="flex flex-col items-center">
                        <div :class="['w-4 h-4 rounded-full', getStatusIndex(app.status) >= statusFlow.indexOf(status) ? 'bg-yellow-500' : 'bg-slate-600']"></div>
                        <div v-if="status !== 'completed'" class="w-1 h-16 bg-slate-600 my-1"></div>
                      </div>
                      <div>
                        <p class="font-semibold text-white capitalize">{{ status.replace('-', ' ') }}</p>
                        <p v-if="app.status === status" class="text-sm text-yellow-400">Currently here</p>
                        <p v-else-if="getStatusIndex(app.status) > statusFlow.indexOf(status)" class="text-sm text-green-400">Completed</p>
                        <p v-else class="text-sm text-slate-500">Pending</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Next Steps -->
              <div :class="['p-4 rounded-lg border', statusConfig[app.status]?.color]">
                <h4 class="font-semibold text-slate-900 mb-2">Next Steps</h4>
                <p class="text-sm text-slate-700">{{ getNextStep(app.status) }}</p>
              </div>

              <!-- Scheduled Info -->
              <div v-if="app.scheduledDate" class="mt-8 p-4 bg-green-500/10 border border-green-500 rounded-lg">
                <h4 class="font-semibold text-green-400 mb-2">📅 Interview Scheduled</h4>
                <p class="text-white font-bold text-lg">{{ formatDate(app.scheduledDate) }}</p>
                <p class="text-sm text-slate-300 mt-2">Check your email for detailed instructions</p>
              </div>

              <!-- Waiver Status -->
              <div class="mt-8 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <h4 class="font-semibold text-slate-200 mb-3">📋 Media Release & Waiver</h4>
                <p v-if="app.waiver" :class="['font-medium mb-3', {
                  'text-green-400': app.waiver.status === 'signed',
                  'text-amber-400': app.waiver.status === 'pending',
                  'text-red-400': app.waiver.status === 'declined',
                  'text-slate-400': app.waiver.status === 'not_signed'
                }]">
                  Status: {{ app.waiver.status.replace('_', ' ').charAt(0).toUpperCase() + app.waiver.status.slice(1) }}
                </p>
                <p v-else class="font-medium text-slate-400 mb-3">Status: Not Signed</p>

                <!-- Waiver Buttons -->
                <div class="space-y-2">
                  <router-link
                    :to="'/waiver/' + app._id"
                    class="inline-block w-full text-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold rounded-lg transition"
                  >
                    {{ app.waiver?.status === 'signed' ? '📄 View Signed Waiver' : '✍️ Review & Sign Waiver' }}
                  </router-link>
                </div>

                <p v-if="!app.waiver || app.waiver.status === 'not_signed'" class="text-sm text-slate-400 mt-3">
                  ℹ️ The waiver must be signed before your interview can be scheduled.
                </p>
              </div>

              <!-- Contact Info -->
              <div class="mt-8 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <h4 class="font-semibold text-slate-200 mb-3">Questions?</h4>
                <p class="text-sm text-slate-300">
                  If you have any questions about your application status, please reach out to our team.
                </p>
                <a href="mailto:hello@veteransscene.org" class="inline-block mt-3 text-yellow-400 hover:text-yellow-300 font-semibold">
                  Contact Us →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
