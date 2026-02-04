import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

export default {
  name: 'Highlights',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const highlights = ref([]);
    const loading = ref(true);
    const error = ref('');
    const typeFilter = ref('');
    const statusFilter = ref('');
    const categoryFilter = ref('');
    const searchTerm = ref('');
    const page = ref(1);
    const limit = ref(20);
    const total = ref(0);
    const totalPages = ref(0);
    const statusCounts = ref({});
    const typeCounts = ref({});

    const fetchHighlights = async () => {
      loading.value = true;
      error.value = '';
      try {
        const params = {
          page: page.value,
          limit: limit.value
        };
        if (typeFilter.value) params.type = typeFilter.value;
        if (statusFilter.value) params.status = statusFilter.value;
        if (categoryFilter.value) params.category = categoryFilter.value;
        if (searchTerm.value) params.search = searchTerm.value;

        const response = await api.getHighlights(params);
        if (response.success) {
          highlights.value = response.data.highlights;
          total.value = response.data.pagination.total;
          totalPages.value = response.data.pagination.pages;
          statusCounts.value = response.data.statusCounts;
          typeCounts.value = response.data.typeCounts;
        } else {
          error.value = response.message || 'Failed to load highlights';
        }
      } catch (err) {
        error.value = err.message || 'Failed to load highlights';
        console.error('Error fetching highlights:', err);
      } finally {
        loading.value = false;
      }
    };

    const getStatusColor = (status) => {
      const colors = {
        'draft': 'bg-gray-700 text-gray-300',
        'pending-ai-fetch': 'bg-yellow-900 text-yellow-200',
        'ai-fetched': 'bg-blue-900 text-blue-200',
        'reviewing': 'bg-purple-900 text-purple-200',
        'published': 'bg-green-900 text-green-200',
        'archived': 'bg-gray-600 text-gray-300'
      };
      return colors[status] || 'bg-gray-700 text-gray-200';
    };

    const getTypeIcon = (type) => {
      const icons = {
        'person': '👤',
        'unit': '🪖',
        'object': '✈️',
        'event': '📅',
        'topic': '📚',
        'memorial': '🕯️'
      };
      return icons[type] || '📋';
    };

    const getTypeLabel = (type) => {
      const labels = {
        'person': 'Person',
        'unit': 'Military Unit',
        'object': 'Equipment/Object',
        'event': 'Historical Event',
        'topic': 'Topic',
        'memorial': 'Memorial'
      };
      return labels[type] || type;
    };

    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const navigateToHighlight = (id) => {
      router.push(`/highlights/${id}`);
    };

    const createNewHighlight = () => {
      router.push('/highlights/new');
    };

    const onFilterChange = () => {
      page.value = 1;
      fetchHighlights();
    };

    const goToPage = (newPage) => {
      if (newPage >= 1 && newPage <= totalPages.value) {
        page.value = newPage;
        fetchHighlights();
      }
    };

    onMounted(() => {
      fetchHighlights();
    });

    return {
      highlights,
      loading,
      error,
      typeFilter,
      statusFilter,
      categoryFilter,
      searchTerm,
      page,
      total,
      totalPages,
      statusCounts,
      typeCounts,
      getStatusColor,
      getTypeIcon,
      getTypeLabel,
      formatDate,
      navigateToHighlight,
      createNewHighlight,
      onFilterChange,
      goToPage,
      fetchHighlights
    };
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8 flex justify-between items-center">
          <div>
            <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-2">
              ← Back to Dashboard
            </router-link>
            <h1 class="text-4xl font-bold text-yellow-400">Highlights</h1>
            <p class="text-gray-400 mt-2">Manage featured content about military figures, topics, and events</p>
          </div>
          <button
            @click="createNewHighlight"
            class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            + New Highlight
          </button>
        </div>

        <!-- Filters -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                v-model="searchTerm"
                @input="onFilterChange"
                type="text"
                placeholder="Search highlights..."
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                v-model="typeFilter"
                @change="onFilterChange"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
              >
                <option value="">All Types</option>
                <option value="person">Person</option>
                <option value="unit">Military Unit</option>
                <option value="object">Equipment/Object</option>
                <option value="event">Historical Event</option>
                <option value="topic">Topic</option>
                <option value="memorial">Memorial</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                v-model="statusFilter"
                @change="onFilterChange"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending-ai-fetch">Pending AI Fetch</option>
                <option value="ai-fetched">AI Fetched</option>
                <option value="reviewing">Reviewing</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                v-model="categoryFilter"
                @change="onFilterChange"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
              >
                <option value="">All Categories</option>
                <option value="wwii">World War II</option>
                <option value="vietnam">Vietnam War</option>
                <option value="korea">Korean War</option>
                <option value="gulf-war">Gulf War</option>
                <option value="iraq">Iraq War</option>
                <option value="afghanistan">Afghanistan</option>
                <option value="modern">Modern</option>
                <option value="medal-of-honor">Medal of Honor</option>
                <option value="historical">Historical</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="flex items-end">
              <button
                @click="onFilterChange"
                class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-800 border border-gray-700 rounded p-4">
            <p class="text-gray-400 text-sm">Total Highlights</p>
            <p class="text-2xl font-bold text-yellow-400">{{ total }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded p-4">
            <p class="text-gray-400 text-sm">Published</p>
            <p class="text-2xl font-bold text-green-400">{{ statusCounts['published'] || 0 }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded p-4">
            <p class="text-gray-400 text-sm">AI Fetched</p>
            <p class="text-2xl font-bold text-blue-400">{{ statusCounts['ai-fetched'] || 0 }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded p-4">
            <p class="text-gray-400 text-sm">In Progress</p>
            <p class="text-2xl font-bold text-yellow-400">{{ (statusCounts['draft'] || 0) + (statusCounts['pending-ai-fetch'] || 0) }}</p>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading highlights...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
          <p class="text-red-200">{{ error }}</p>
        </div>

        <!-- Results Grid -->
        <div v-else-if="highlights.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div
            v-for="highlight in highlights"
            :key="highlight._id"
            @click="navigateToHighlight(highlight._id)"
            class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden cursor-pointer hover:border-yellow-500 transition hover:shadow-lg hover:shadow-yellow-500/20 flex flex-col h-full"
          >
            <!-- Profile Image -->
            <div v-if="highlight.media?.profileImage?.url" class="w-full h-48 bg-gray-900 overflow-hidden">
              <img
                :src="highlight.media.profileImage.url"
                :alt="highlight.media.profileImage.altText || highlight.title"
                class="w-full h-full object-cover"
              />
            </div>
            <div v-else class="w-full h-48 bg-gray-700 flex items-center justify-center text-gray-500 text-3xl">
              {{ getTypeIcon(highlight.type) }}
            </div>

            <!-- Content -->
            <div class="p-6 flex flex-col flex-1">
              <!-- Type Icon & Title -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{{ getTypeLabel(highlight.type) }}</span>
                  </div>
                  <h3 class="text-lg font-bold text-yellow-400 line-clamp-2">{{ highlight.title }}</h3>
                </div>
              </div>

              <!-- Status Badge -->
              <div :class="['text-xs font-semibold px-3 py-1 rounded inline-block mb-4', getStatusColor(highlight.status)]">
                {{ highlight.status }}
              </div>

              <!-- Description -->
              <p v-if="highlight.description" class="text-gray-400 text-sm line-clamp-2 mb-4">{{ highlight.description }}</p>

              <!-- Person Info (if applicable) -->
              <div v-if="highlight.type === 'person' && highlight.personInfo" class="mb-4 text-sm text-gray-400 space-y-1 border-t border-gray-700 pt-3">
                <div v-if="highlight.personInfo.rank"><span class="font-semibold">Rank:</span> {{ highlight.personInfo.rank }}</div>
                <div v-if="highlight.personInfo.branch"><span class="font-semibold">Branch:</span> {{ highlight.personInfo.branch }}</div>
              </div>

              <!-- AI Content Badge -->
              <div v-if="highlight.aiContent?.fetched" class="mb-4">
                <div class="inline-flex items-center gap-2 text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                  <span>✓</span>
                  <span>AI Enhanced</span>
                </div>
              </div>

              <!-- Featured Star -->
              <div v-if="highlight.displaySettings?.featured" class="flex items-center gap-2 text-xs text-yellow-400 mb-4">
                <span class="text-lg">⭐</span>
                <span>Featured</span>
              </div>

              <!-- Meta Info -->
              <div class="text-xs text-gray-500 space-y-1 border-t border-gray-700 pt-3 mt-auto">
                <div>Created: {{ formatDate(highlight.createdAt) }}</div>
                <div v-if="highlight.creator">By: {{ highlight.creator.firstName }} {{ highlight.creator.lastName }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12 bg-gray-800 border border-gray-700 rounded-lg">
          <p class="text-gray-400 text-lg mb-4">No highlights found</p>
          <button
            @click="createNewHighlight"
            class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            Create Your First Highlight
          </button>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-8">
          <button
            @click="goToPage(page - 1)"
            :disabled="page === 1"
            class="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            ← Previous
          </button>

          <div class="flex gap-1">
            <button
              v-for="p in Math.min(5, totalPages)"
              :key="p"
              @click="goToPage(p)"
              :class="[
                'px-3 py-2 rounded transition',
                p === page
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 border border-gray-700 text-gray-100 hover:bg-gray-700'
              ]"
            >
              {{ p }}
            </button>
          </div>

          <button
            @click="goToPage(page + 1)"
            :disabled="page === totalPages"
            class="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  `
};
