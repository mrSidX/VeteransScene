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

    const fetchApplications = async () => {
      loading.value = true;
      try {
        const params = {};
        if (statusFilter.value) params.status = statusFilter.value;
        if (searchTerm.value) params.search = searchTerm.value;

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

    onMounted(() => {
      fetchApplications();
    });

    return {
      applications,
      loading,
      error,
      statusFilter,
      searchTerm,
      fetchApplications,
      getStatusColor
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="mb-8">
          <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-4">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Dashboard
          </router-link>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <h1 class="text-4xl font-bold text-yellow-400">Guest Applicants</h1>
                <info-helper topic-slug="creating-applications" size="md" />
              </div>
              <p class="text-gray-400">Manage and review guest speaker applicants</p>
            </div>
            <a href="/apply.html" target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-md transition self-start">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Create Application
            </a>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input v-model="searchTerm" @input="fetchApplications" type="text"
                placeholder="Name, email, or story..."
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select v-model="statusFilter" @change="fetchApplications"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
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
            <div class="flex items-end">
              <button @click="fetchApplications"
                class="w-full px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition">
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading applicants...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg">
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
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                <tr v-for="app in applications" :key="app._id" class="hover:bg-gray-750">
                  <td class="px-6 py-4">
                    <router-link :to="'/applications/' + app._id" class="block">
                      <div class="font-medium text-yellow-400 hover:text-yellow-300 cursor-pointer">
                        {{ app.firstName }} {{ app.lastName }}
                      </div>
                      <div class="text-sm text-gray-400">{{ app.email }}</div>
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
          <div class="md:hidden space-y-4">
            <router-link
              v-for="app in applications"
              :key="app._id"
              :to="'/applications/' + app._id"
              class="block bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-yellow-400 transition">

              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h3 class="font-bold text-yellow-400 text-lg">
                    {{ app.firstName }} {{ app.lastName }}
                  </h3>
                  <p class="text-sm text-gray-400 break-all">{{ app.email }}</p>
                </div>
                <span :class="getStatusColor(app.status)" class="px-2 py-1 rounded text-xs font-semibold uppercase ml-2 flex-shrink-0">
                  {{ app.status }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3 text-sm mb-2">
                <div>
                  <span class="text-gray-500 block mb-1">Branch:</span>
                  <BranchBadges :branches="app.branches || (app.branch ? [app.branch] : [])" size="sm" />
                </div>
                <div>
                  <span class="text-gray-500">Type:</span>
                  <span class="text-gray-300 ml-1">{{ app.applicationType }}</span>
                </div>
              </div>

              <div class="mt-3 flex justify-end">
                <span class="text-yellow-400 text-sm font-medium">
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
