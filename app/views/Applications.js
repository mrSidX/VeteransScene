import { ref, onMounted } from 'vue';
import api from '../services/api.js';
import BranchBadges from '../components/BranchBadges.js';

export default {
  name: 'Applications',
  components: {
    BranchBadges
  },
  setup() {
    const applications = ref([]);
    const loading = ref(true);
    const error = ref('');
    const statusFilter = ref('');
    const searchTerm = ref('');
    const anonymousFilter = ref('');

    const fetchApplications = async () => {
      loading.value = true;
      try {
        const params = {};
        if (statusFilter.value) params.status = statusFilter.value;
        if (searchTerm.value) params.search = searchTerm.value;
        if (anonymousFilter.value) params.anonymous = anonymousFilter.value;

        const response = await api.getApplications(params);
        if (response.success) {
          applications.value = response.data.applications;
        }
      } catch (err) {
        error.value = 'Failed to load applicants';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    // Helper to mask email
    const maskEmail = (email) => {
      if (!email || !email.includes('@')) return 'No email';
      const [user, domain] = email.split('@');
      return `${user.substring(0, 2)}***@***.${domain.split('.')[1]}`;
    };

    const getStatusColor = (status) => {
      const colors = {
        'new': 'bg-green-900 text-green-200',
        'reviewing': 'bg-yellow-900 text-yellow-200',
        'contacted': 'bg-blue-900 text-blue-200',
        'scheduled': 'bg-indigo-900 text-indigo-200',
        'completed': 'bg-purple-900 text-purple-200',
        'declined': 'bg-red-900 text-red-200',
        'archived': 'bg-gray-700 text-gray-300'
      };
      return colors[status] || 'bg-gray-700 text-gray-200';
    };

    const getWaiverInfo = (app) => {
      const status = app.waiver?.status || 'not_signed';
      const map = {
        'signed':     { icon: '\u2714', label: 'Signed', cls: 'text-green-400', bg: 'bg-green-900/50 border-green-700' },
        'pending':    { icon: '\u23F3', label: 'Pending', cls: 'text-yellow-400', bg: 'bg-yellow-900/50 border-yellow-700' },
        'declined':   { icon: '\u2718', label: 'Declined', cls: 'text-red-400', bg: 'bg-red-900/50 border-red-700' },
        'not_signed': { icon: '\u2014', label: 'No Waiver', cls: 'text-gray-500', bg: 'bg-gray-800/50 border-gray-700' }
      };
      return map[status] || map['not_signed'];
    };

    onMounted(() => {
      fetchApplications();
    });

    return {
      applications,
      loading,
      error,
      statusFilter,
      searchTerm,
      anonymousFilter,
      fetchApplications,
      getStatusColor,
      getWaiverInfo,
      maskEmail
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-6 md:py-8 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="mb-4 md:mb-6">
          <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-2 text-xs md:text-sm">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Dashboard
          </router-link>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
            <div>
              <div class="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                <h1 class="text-3xl md:text-4xl font-bold text-yellow-400">Guest Applicants</h1>
                <info-helper topic-slug="creating-applications" size="md" />
              </div>
              <p class="text-xs md:text-sm text-gray-400">Manage and review guest speaker applicants</p>
            </div>
            <a href="/apply.html" target="_blank"
              class="inline-flex items-center justify-center gap-1.5 px-2.5 md:px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-md transition text-xs md:text-sm h-10 md:h-auto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              <span class="hidden sm:inline">Create Application</span>
              <span class="sm:hidden">Apply</span>
            </a>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4 mb-3 md:mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
            <div>
              <label class="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">Search</label>
              <input v-model="searchTerm" @input="fetchApplications" type="text"
                placeholder="Name, email..."
                class="w-full px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" />
            </div>
            <div>
              <label class="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">Status</label>
              <select v-model="statusFilter" @change="fetchApplications"
                class="w-full px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="contacted">Contacted</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label class="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">Privacy</label>
              <select v-model="anonymousFilter" @change="fetchApplications"
                class="w-full px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">All Applications</option>
                <option value="true">Anonymous Only</option>
                <option value="false">Non-Anonymous Only</option>
              </select>
            </div>
            <div class="flex items-end">
              <button @click="fetchApplications"
                class="w-full px-2 md:px-4 py-1.5 md:py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition text-xs md:text-sm h-10 md:h-auto flex items-center justify-center">
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-8 md:py-12">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
          <p class="mt-3 text-xs md:text-sm text-gray-400">Loading applicants...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-900 border border-red-700 text-red-200 px-3 md:px-6 py-3 md:py-4 rounded-lg text-xs md:text-sm">
          {{ error }}
        </div>

        <!-- Applicants List -->
        <div v-else-if="applications.length">

          <!-- Desktop Table View (hidden on mobile) -->
          <div class="hidden md:block bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-900">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Branch</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Waiver</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                <tr v-for="app in applications" :key="app._id" class="hover:bg-gray-750">
                  <td class="px-6 py-4">
                    <router-link :to="'/applications/' + app._id" class="block">
                      <div class="font-medium text-yellow-400 hover:text-yellow-300 cursor-pointer flex items-center gap-2">
                        <span v-if="app.preferAnonymous" class="px-2 py-0.5 bg-purple-900 text-purple-200 rounded text-xs">🔒 Anon</span>
                        <span>{{ app.preferAnonymous ? (app.alias || '[Anonymous]') : (app.firstName + ' ' + app.lastName) }}</span>
                      </div>
                      <div class="text-sm text-gray-400">{{ app.preferAnonymous ? maskEmail(app.email) : app.email }}</div>
                    </router-link>
                  </td>
                  <td class="px-6 py-4">
                    <BranchBadges :branches="app.branches || (app.branch ? [app.branch] : [])" size="sm" />
                  </td>
                  <td class="px-6 py-4">{{ app.applicationType }}</td>
                  <td class="px-6 py-4">
                    <span :class="getStatusColor(app.status)" class="px-2 py-1 rounded text-xs font-semibold uppercase">
                      {{ app.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span :class="[getWaiverInfo(app).bg]"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium"
                      :title="app.waiver?.signedDate ? 'Signed ' + new Date(app.waiver.signedDate).toLocaleDateString() : ''">
                      <span :class="getWaiverInfo(app).cls">{{ getWaiverInfo(app).icon }}</span>
                      <span :class="getWaiverInfo(app).cls">{{ getWaiverInfo(app).label }}</span>
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-400">
                    {{ new Date(app.createdAt).toLocaleDateString() }}
                  </td>
                  <td class="px-6 py-4">
                    <router-link :to="'/applications/' + app._id"
                      class="text-yellow-400 hover:text-yellow-300 font-medium whitespace-nowrap">
                      View Details →
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Card View (visible on mobile only) -->
          <div class="md:hidden space-y-2 md:space-y-4">
            <router-link
              v-for="app in applications"
              :key="app._id"
              :to="'/applications/' + app._id"
              class="block bg-gray-800 border border-gray-700 rounded-lg p-2.5 md:p-4 hover:border-yellow-400 transition">

              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5 md:gap-2 mb-2 md:mb-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <h3 class="font-bold text-yellow-400 text-sm md:text-lg break-words truncate">
                      {{ app.preferAnonymous ? (app.alias || '[Anonymous]') : (app.firstName + ' ' + app.lastName) }}
                    </h3>
                    <span v-if="app.preferAnonymous" class="px-1.5 py-0.25 bg-purple-900 text-purple-200 rounded text-xs flex-shrink-0">🔒</span>
                  </div>
                  <p class="text-xs md:text-sm text-gray-400 truncate">{{ app.preferAnonymous ? maskEmail(app.email) : app.email }}</p>
                </div>
                <div class="flex items-center gap-1.5 flex-shrink-0 self-start">
                  <span :class="getStatusColor(app.status)" class="px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-semibold uppercase">
                    {{ app.status }}
                  </span>
                  <span :class="[getWaiverInfo(app).bg]"
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs font-medium"
                    :title="getWaiverInfo(app).label">
                    <span :class="getWaiverInfo(app).cls">{{ getWaiverInfo(app).icon }}</span>
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3 text-xs md:text-sm mb-1.5 md:mb-2">
                <div>
                  <span class="text-gray-500 text-xs mb-0.5 block">Branch:</span>
                  <BranchBadges :branches="app.branches || (app.branch ? [app.branch] : [])" size="sm" />
                </div>
                <div>
                  <span class="text-gray-500 text-xs">Type:</span>
                  <span class="text-gray-300 ml-1 text-xs">{{ app.applicationType }}</span>
                </div>
              </div>

              <div class="flex justify-end mt-1.5 md:mt-2">
                <span class="text-yellow-400 text-xs md:text-sm font-medium">
                  View Details →
                </span>
              </div>
            </router-link>
          </div>

        </div>

        <!-- Empty State -->
        <div v-else class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <p class="text-gray-400 text-lg">No applicants found</p>
          <p class="text-gray-500 mt-2">Try adjusting your filters or check back later</p>
        </div>
      </div>
    </div>
  `
};
