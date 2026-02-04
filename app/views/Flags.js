export default {
  name: 'Flags',
  template: `
    <div class="container mx-auto px-4 py-6">
      <!-- Back to Dashboard -->
      <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-4">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </router-link>

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">Flags</h1>
          <p class="text-gray-400 text-sm">Manage flagged items and issues</p>
        </div>
        <button
          v-if="user.role === 'admin' || user.role === 'moderator'"
          @click="showCreateModal = true"
          class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-medium rounded-lg transition-colors"
        >
          + Raise Flag
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
            <select
              v-model="filters.status"
              @change="loadFlags"
              class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Priority</label>
            <select
              v-model="filters.priority"
              @change="loadFlags"
              class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Flag Type</label>
            <select
              v-model="filters.flagType"
              @change="loadFlags"
              class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="needs_attention">Needs Attention</option>
              <option value="raise_issue">Raise Issue</option>
              <option value="seeking_approval">Seeking Approval</option>
              <option value="urgent_response">Urgent Response</option>
              <option value="needs_review">Needs Review</option>
              <option value="technical_issue">Technical Issue</option>
              <option value="content_violation">Content Violation</option>
              <option value="follow_up">Follow Up</option>
              <option value="clarification_needed">Clarification Needed</option>
              <option value="escalate">Escalate</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Assignment</label>
            <select
              v-model="filters.assignedTo"
              @change="loadFlags"
              class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
            >
              <option value="">All Flags</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>

      <!-- Flags List -->
      <div v-else-if="flags.length > 0" class="space-y-3">
        <div
          v-for="flag in flags"
          :key="flag._id"
          @click="navigateToFlag(flag._id)"
          :class="[
            'bg-gray-800 border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg',
            getPriorityBorderClass(flag.priority)
          ]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span :class="getPriorityBadge(flag.priority)" class="px-2 py-1 text-xs font-bold rounded">
                  {{ flag.priority.toUpperCase() }}
                </span>
                <span :class="getStatusBadge(flag.status)" class="px-2 py-1 text-xs rounded">
                  {{ formatStatus(flag.status) }}
                </span>
                <span class="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                  {{ formatFlagType(flag.flagType) }}
                </span>
                <span class="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded">
                  {{ flag.resourceType }}
                </span>
              </div>
              <h3 class="text-white font-semibold text-lg mb-1">{{ flag.title }}</h3>
              <p v-if="flag.description" class="text-gray-400 text-sm mb-2 line-clamp-2">{{ flag.description }}</p>
              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span>Raised by {{ getUserName(flag.raisedBy) }}</span>
                <span>•</span>
                <span>{{ formatDate(flag.createdAt) }}</span>
                <span v-if="flag.assignedTo && flag.assignedTo.length > 0">•</span>
                <span v-if="flag.assignedTo && flag.assignedTo.length > 0" class="text-yellow-400">
                  Assigned to {{ flag.assignedTo.map(u => getUserName(u)).join(', ') }}
                </span>
              </div>
            </div>
            <div class="flex-shrink-0">
              <button
                @click.stop="deleteFlag(flag)"
                v-if="user.role === 'admin' || flag.raisedBy._id === user._id"
                class="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                title="Delete flag"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <div class="inline-block p-4 bg-gray-800 rounded-full mb-4">
          <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">No flags found</h3>
        <p class="text-gray-400 mb-6">No flags match your current filters</p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.pages > 1" class="flex items-center justify-center gap-2 mt-6">
        <button
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page === 1"
          class="px-3 py-1 bg-gray-800 border border-gray-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Previous
        </button>
        <span class="text-gray-400 text-sm">
          Page {{ pagination.page }} of {{ pagination.pages }}
        </span>
        <button
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page === pagination.pages"
          class="px-3 py-1 bg-gray-800 border border-gray-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Next
        </button>
      </div>

      <!-- Create Flag Modal -->
      <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click.self="closeCreateModal">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white">Raise a Flag</h2>
            <button @click="closeCreateModal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>

          <form @submit.prevent="createFlag" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Resource Type <span class="text-gray-500">(optional)</span></label>
                <select
                  v-model="flagForm.resourceType"
                  :disabled="!!$route?.query?.resourceType"
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">General Flag (no resource)</option>
                  <option value="Segment">Segment</option>
                  <option value="ParticipantApplication">Application</option>
                  <option value="User">User</option>
                </select>
                <p v-if="$route?.query?.resourceTitle" class="text-xs text-gray-500 mt-1">
                  {{ $route.query.resourceTitle }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Resource ID <span class="text-gray-500">(optional)</span></label>
                <input
                  v-model="flagForm.resourceId"
                  type="text"
                  :disabled="!!$route?.query?.resourceId || !flagForm.resourceType"
                  :placeholder="flagForm.resourceType ? 'Auto-filled from source' : 'N/A - General flag'"
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed font-mono text-xs"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Flag Type *</label>
                <select
                  v-model="flagForm.flagType"
                  required
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
                >
                  <option value="">Select type...</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="raise_issue">Raise Issue</option>
                  <option value="seeking_approval">Seeking Approval</option>
                  <option value="urgent_response">Urgent Response</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="technical_issue">Technical Issue</option>
                  <option value="content_violation">Content Violation</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="clarification_needed">Clarification Needed</option>
                  <option value="escalate">Escalate</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Priority *</label>
                <select
                  v-model="flagForm.priority"
                  required
                  class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Title *</label>
              <input
                v-model="flagForm.title"
                type="text"
                required
                maxlength="200"
                placeholder="Brief description of the issue"
                class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                v-model="flagForm.description"
                rows="4"
                maxlength="2000"
                placeholder="Detailed explanation of why this flag was raised..."
                class="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 resize-none"
              ></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="closeCreateModal"
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-gray-900 font-medium text-sm rounded transition-colors"
              >
                {{ creating ? 'Creating...' : 'Create Flag' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      flags: [],
      loading: true,
      filters: {
        status: '',
        priority: '',
        flagType: '',
        assignedTo: ''
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 1
      },
      showCreateModal: false,
      creating: false,
      flagForm: {
        resourceType: '',
        resourceId: '',
        flagType: '',
        priority: 'medium',
        title: '',
        description: ''
      },
      user: JSON.parse(localStorage.getItem('vs_user_data') || localStorage.getItem('user') || '{}')
    };
  },

  async mounted() {
    await this.loadFlags();

    // Check if resource data was passed via query params
    if (this.$route?.query?.resourceType && this.$route?.query?.resourceId) {
      this.flagForm.resourceType = this.$route.query.resourceType;
      this.flagForm.resourceId = this.$route.query.resourceId;
      this.showCreateModal = true;

      // Set a helpful title if resource title was provided
      if (this.$route.query.resourceTitle) {
        this.flagForm.title = `Issue with ${this.$route.query.resourceTitle}`;
      }
    }
  },

  methods: {
    async loadFlags() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters
        };

        // Remove empty filter values
        Object.keys(params).forEach(key => {
          if (params[key] === '') delete params[key];
        });

        const response = await window.api.getFlags(params);
        if (response.success) {
          this.flags = response.data;
          this.pagination = response.pagination;
        }
      } catch (err) {
        console.error('Load flags error:', err);
        this.$root.showToast?.('Failed to load flags', 'error');
      } finally {
        this.loading = false;
      }
    },

    async createFlag() {
      this.creating = true;
      try {
        const response = await window.api.createFlag(this.flagForm);
        if (response.success) {
          this.$root.showToast?.('Flag created successfully', 'success');
          this.closeCreateModal();
          await this.loadFlags();
        }
      } catch (err) {
        console.error('Create flag error:', err);
        this.$root.showToast?.(err.message || 'Failed to create flag', 'error');
      } finally {
        this.creating = false;
      }
    },

    async deleteFlag(flag) {
      if (!confirm(`Are you sure you want to delete this flag?\n\n"${flag.title}"\n\nThis will also delete all associated comments.`)) {
        return;
      }

      try {
        const response = await window.api.deleteFlag(flag._id);
        if (response.success) {
          this.$root.showToast?.('Flag deleted', 'success');
          await this.loadFlags();
        }
      } catch (err) {
        console.error('Delete flag error:', err);
        this.$root.showToast?.('Failed to delete flag', 'error');
      }
    },

    closeCreateModal() {
      this.showCreateModal = false;
      this.flagForm = {
        resourceType: '',
        resourceId: '',
        flagType: '',
        priority: 'medium',
        title: '',
        description: ''
      };
    },

    changePage(page) {
      this.pagination.page = page;
      this.loadFlags();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    navigateToFlag(id) {
      if (this.$router) {
        this.$router.push(`/flags/${id}`);
      } else {
        window.location.href = `#/flags/${id}`;
      }
    },

    getPriorityBorderClass(priority) {
      const classes = {
        urgent: 'border-l-4 border-red-500',
        high: 'border-l-4 border-orange-500',
        medium: 'border-l-4 border-yellow-500',
        low: 'border-l-4 border-gray-500'
      };
      return classes[priority] || 'border-gray-700';
    },

    getPriorityBadge(priority) {
      const classes = {
        urgent: 'bg-red-600 text-white',
        high: 'bg-orange-600 text-white',
        medium: 'bg-yellow-600 text-gray-900',
        low: 'bg-gray-600 text-gray-300'
      };
      return classes[priority] || 'bg-gray-600 text-gray-300';
    },

    getStatusBadge(status) {
      const classes = {
        open: 'bg-blue-900/30 text-blue-300',
        in_progress: 'bg-yellow-900/30 text-yellow-300',
        resolved: 'bg-green-900/30 text-green-300',
        dismissed: 'bg-gray-600 text-gray-300',
        escalated: 'bg-red-900/30 text-red-300'
      };
      return classes[status] || 'bg-gray-600 text-gray-300';
    },

    formatStatus(status) {
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    formatFlagType(type) {
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    },

    getUserName(user) {
      if (!user) return 'Unknown';
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      if (user.name) return user.name; // Fallback for old data
      return user.email || 'Unknown';
    }
  }
};
