import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

export default {
  name: 'Segments',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const segments = ref([]);
    const loading = ref(true);
    const error = ref('');
    const statusFilter = ref('');
    const productionTypeFilter = ref('');
    const isTemplateFilter = ref('');
    const searchTerm = ref('');
    const sortBy = ref('createdAt');
    const sortOrder = ref('desc');

    const fetchSegments = async () => {
      loading.value = true;
      try {
        const params = {};
        if (statusFilter.value) params.status = statusFilter.value;
        if (productionTypeFilter.value) params.productionType = productionTypeFilter.value;
        if (isTemplateFilter.value !== '') params.isTemplate = isTemplateFilter.value;
        if (searchTerm.value) params.search = searchTerm.value;
        if (sortBy.value) params.sortBy = sortBy.value;
        if (sortOrder.value) params.order = sortOrder.value;

        const response = await api.getSegments(params);
        if (response.success) {
          segments.value = response.data.segments;
        }
      } catch (err) {
        error.value = 'Failed to load segments';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const getStatusColor = (status) => {
      const colors = {
        'proposal': 'bg-gray-700 text-gray-300',
        'in-consideration': 'bg-yellow-900 text-yellow-200',
        'in-review': 'bg-blue-900 text-blue-200',
        'approved': 'bg-green-900 text-green-200',
        'planning': 'bg-indigo-900 text-indigo-200',
        'scheduled': 'bg-purple-900 text-purple-200',
        'in-production': 'bg-orange-900 text-orange-200',
        'post-production': 'bg-pink-900 text-pink-200',
        'completed': 'bg-teal-900 text-teal-200',
        'on-hold': 'bg-gray-700 text-gray-400',
        'cancelled': 'bg-red-900 text-red-200'
      };
      return colors[status] || 'bg-gray-700 text-gray-200';
    };

    const getPriorityColor = (priority) => {
      const colors = {
        'low': 'text-gray-400',
        'medium': 'text-blue-400',
        'high': 'text-orange-400',
        'urgent': 'text-red-400'
      };
      return colors[priority] || 'text-gray-400';
    };

    const formatDate = (date) => {
      if (!date) return 'Not scheduled';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const navigateToSegment = (id) => {
      router.push(`/segments/${id}`);
    };

    const createNewSegment = () => {
      router.push('/segments/new');
    };

    const toggleUpvote = async (e, segment) => {
      e.stopPropagation();

      // Store previous state for rollback
      const previousCount = segment.upvoteCount || 0;
      const previousHasUpvoted = segment.hasUpvoted || false;

      // Optimistic update - toggle the state
      const segmentIndex = segments.value.findIndex(s => s._id === segment._id);
      if (segmentIndex !== -1) {
        segments.value[segmentIndex].hasUpvoted = !previousHasUpvoted;
        segments.value[segmentIndex].upvoteCount = previousHasUpvoted
          ? previousCount - 1
          : previousCount + 1;
      }

      try {
        const response = await api.toggleSegmentUpvote(segment._id);
        if (response.success && response.data) {
          // Update with server response to ensure consistency
          if (segmentIndex !== -1) {
            segments.value[segmentIndex].upvoteCount = response.data.upvoteCount;
            segments.value[segmentIndex].hasUpvoted = response.data.hasUpvoted;
          }
        }
      } catch (err) {
        // Revert on error
        if (segmentIndex !== -1) {
          segments.value[segmentIndex].upvoteCount = previousCount;
          segments.value[segmentIndex].hasUpvoted = previousHasUpvoted;
        }
        console.error('Failed to toggle upvote:', err);
      }
    };

    onMounted(() => {
      fetchSegments();
    });

    return {
      authStore,
      segments,
      loading,
      error,
      statusFilter,
      productionTypeFilter,
      isTemplateFilter,
      searchTerm,
      sortBy,
      sortOrder,
      fetchSegments,
      getStatusColor,
      getPriorityColor,
      formatDate,
      navigateToSegment,
      createNewSegment,
      toggleUpvote
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
          <div class="flex justify-between items-start">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <h1 class="text-4xl font-bold text-yellow-400">Segment Planner</h1>
                <info-helper topic-slug="upvoting-segments" size="md" />
              </div>
              <p class="text-gray-400">Manage production segments from concept to completion</p>
            </div>
            <div class="flex gap-3">
              <a href="/topics-generator.html"
                class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-md font-semibold transition flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Topics Generator
              </a>
              <button @click="createNewSegment"
                class="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-6 py-3 rounded-md font-semibold transition flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                New Segment
              </button>
            </div>
          </div>
        </div>

        <!-- Filters & Sort -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input v-model="searchTerm" @input="fetchSegments" type="text"
                placeholder="Title, description, tags..."
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select v-model="statusFilter" @change="fetchSegments"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">All Statuses</option>
                <option value="proposal">Proposal</option>
                <option value="in-consideration">In Consideration</option>
                <option value="in-review">In Review</option>
                <option value="approved">Approved</option>
                <option value="planning">Planning</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-production">In Production</option>
                <option value="post-production">Post Production</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Production Type</label>
              <select v-model="productionTypeFilter" @change="fetchSegments"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">All Types</option>
                <option value="in-person-interview">In-Person Interview</option>
                <option value="remote-interview">Remote Interview</option>
                <option value="solo-narration">Solo Narration</option>
                <option value="panel-discussion">Panel Discussion</option>
                <option value="roundtable">Roundtable</option>
                <option value="documentary-style">Documentary Style</option>
                <option value="pre-recorded">Pre-Recorded</option>
                <option value="live-recording">Live Recording</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select v-model="isTemplateFilter" @change="fetchSegments"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">All</option>
                <option value="true">Templates Only</option>
                <option value="false">Regular Segments</option>
              </select>
            </div>
            <div class="flex items-end">
              <button @click="fetchSegments"
                class="w-full px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition">
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading segments...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg">
          {{ error }}
        </div>

        <!-- Segments List -->
        <div v-else-if="segments.length" class="space-y-4">
          <div v-for="segment in segments" :key="segment._id"
            @click="navigateToSegment(segment._id)"
            class="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-yellow-400 transition cursor-pointer">

            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-xl font-bold text-yellow-400">{{ segment.title }}</h3>
                  <span v-if="segment.isTemplate" class="px-2 py-1 bg-purple-900 text-purple-200 text-xs rounded font-semibold">
                    TEMPLATE
                  </span>
                  <span v-if="segment.parentSegment" class="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded font-semibold">
                    VARIATION
                  </span>
                </div>
                <p class="text-gray-300 line-clamp-2">{{ segment.description }}</p>
              </div>

              <div class="flex flex-col items-end gap-2 ml-4">
                <span :class="getStatusColor(segment.status)" class="px-3 py-1 rounded text-xs font-semibold uppercase whitespace-nowrap">
                  {{ segment.status.replace(/-/g, ' ') }}
                </span>
                <button @click.stop="toggleUpvote($event, segment)"
                :class="[
                  'flex items-center text-sm transition-all duration-300 px-3 py-1 rounded',
                  segment.hasUpvoted
                    ? 'text-yellow-400 bg-yellow-900/30 hover:bg-yellow-900/50'
                    : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                ]">
                  <svg class="w-4 h-4 mr-1 transition-transform duration-300 hover:scale-125" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
                  </svg>
                  {{ segment.upvoteCount || 0 }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Production:</span>
                <span class="text-gray-300 ml-2">{{ segment.productionType.replace(/-/g, ' ') }}</span>
              </div>
              <div>
                <span class="text-gray-500">Location:</span>
                <span class="text-gray-300 ml-2">{{ segment.location.replace(/-/g, ' ') }}</span>
              </div>
              <div>
                <span class="text-gray-500">Scheduled:</span>
                <span class="text-gray-300 ml-2">{{ formatDate(segment.scheduledDate) }}</span>
              </div>
              <div>
                <span class="text-gray-500">Priority:</span>
                <span :class="getPriorityColor(segment.priority)" class="ml-2 font-semibold">
                  {{ segment.priority.toUpperCase() }}
                </span>
              </div>
            </div>

            <div v-if="segment.guestSpeakers && segment.guestSpeakers.length" class="mt-4 flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <span class="text-gray-400">Guest Speakers:</span>
              <span class="text-gray-300">{{ segment.guestSpeakers.length }}</span>
            </div>

            <div v-if="segment.variations && segment.variations.length" class="mt-4 flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              <span class="text-gray-400">Variations:</span>
              <span class="text-purple-300">{{ segment.variations.length }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <p class="text-gray-400 text-lg">No segments found</p>
          <p class="text-gray-500 mt-2">Create your first segment to get started</p>
          <button @click="createNewSegment" class="mt-6 bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-6 py-2 rounded-md font-semibold transition">
            Create Segment
          </button>
        </div>
      </div>
    </div>
  `
};
