export default {
  name: 'HelpTopics',
  template: `
    <div class="container mx-auto px-4 py-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <router-link to="/dashboard" class="text-gray-400 hover:text-gray-200 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </router-link>
          <h1 class="text-3xl font-bold text-white">Help Topics</h1>
        </div>
        <button
          @click="openCreateModal"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition"
        >
          + Create Help Topic
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Search -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search title, content, tags..."
            class="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          >

          <!-- Category Filter -->
          <select
            v-model="selectedCategory"
            class="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="getting-started">Getting Started</option>
            <option value="applications">Applications</option>
            <option value="segments">Segments</option>
            <option value="user-management">User Management</option>
            <option value="production">Production</option>
            <option value="technical">Technical</option>
            <option value="email">Email</option>
            <option value="general">General</option>
          </select>

          <!-- Status Filter -->
          <select
            v-model="selectedStatus"
            class="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <!-- Refresh Button -->
          <button
            @click="loadHelpTopics"
            class="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTopics.length === 0" class="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
        <svg class="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-gray-400">No help topics found. Create one to get started!</p>
      </div>

      <!-- Topics Table -->
      <div v-else class="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
        <table class="w-full">
          <thead class="bg-gray-900 border-b border-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-300">Title</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-300">Slug</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-300">Category</th>
              <th class="px-6 py-3 text-center text-sm font-semibold text-gray-300">Status</th>
              <th class="px-6 py-3 text-center text-sm font-semibold text-gray-300">Views</th>
              <th class="px-6 py-3 text-center text-sm font-semibold text-gray-300">Video</th>
              <th class="px-6 py-3 text-center text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="topic in filteredTopics" :key="topic._id" class="border-b border-gray-700 hover:bg-gray-750 transition">
              <td class="px-6 py-3 text-white">{{ topic.title }}</td>
              <td class="px-6 py-3 text-gray-400 font-mono text-sm">{{ topic.slug }}</td>
              <td class="px-6 py-3">
                <span class="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs font-medium">
                  {{ topic.category }}
                </span>
              </td>
              <td class="px-6 py-3 text-center">
                <span
                  class="px-2 py-1 rounded text-xs font-medium"
                  :class="{
                    'bg-green-900/50 text-green-300': topic.status === 'published',
                    'bg-yellow-900/50 text-yellow-300': topic.status === 'draft',
                    'bg-gray-700 text-gray-400': topic.status === 'archived'
                  }"
                >
                  {{ topic.status }}
                </span>
              </td>
              <td class="px-6 py-3 text-center text-gray-400">{{ topic.viewCount || 0 }}</td>
              <td class="px-6 py-3 text-center">
                <svg v-if="topic.videoUrl" class="w-5 h-5 text-red-500 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
                </svg>
              </td>
              <td class="px-6 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="editTopic(topic)"
                    class="p-1 hover:bg-gray-700 rounded transition"
                    title="Edit"
                  >
                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  <button
                    @click="deleteTopic(topic)"
                    class="p-1 hover:bg-gray-700 rounded transition"
                    title="Delete"
                  >
                    <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create/Edit Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-gray-800 text-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
          <!-- Header -->
          <div class="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-2xl font-bold">{{ editingId ? 'Edit Help Topic' : 'Create Help Topic' }}</h2>
            <button @click="closeModal" class="p-1 hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-4 space-y-4">
            <!-- Slug -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Slug</label>
              <input
                v-model="form.slug"
                type="text"
                placeholder="e.g., dashboard-overview"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              >
            </div>

            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Title</label>
              <input
                v-model="form.title"
                type="text"
                placeholder="Help topic title"
                maxlength="200"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              >
              <p class="text-xs text-gray-500 mt-1">{{ form.title.length }}/200</p>
            </div>

            <!-- Content -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Content</label>
              <textarea
                v-model="form.content"
                placeholder="Help text content"
                maxlength="5000"
                rows="6"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">{{ form.content.length }}/5000</p>
            </div>

            <!-- Video URL -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">YouTube URL (optional)</label>
              <input
                v-model="form.videoUrl"
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              >
            </div>

            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                v-model="form.category"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="getting-started">Getting Started</option>
                <option value="applications">Applications</option>
                <option value="segments">Segments</option>
                <option value="user-management">User Management</option>
                <option value="production">Production</option>
                <option value="technical">Technical</option>
                <option value="email">Email</option>
                <option value="general">General</option>
              </select>
            </div>

            <!-- Tags -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
              <input
                v-model="form.tagsInput"
                type="text"
                placeholder="e.g., tutorial, video, basics"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              >
            </div>

            <!-- Display Context -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Display Context</label>
              <div class="grid grid-cols-2 gap-2">
                <label v-for="ctx in displayContextOptions" :key="ctx" class="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    :value="ctx"
                    v-model="form.displayContext"
                    class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
                  >
                  <span class="ml-2 text-sm text-gray-300">{{ ctx }}</span>
                </label>
              </div>
            </div>

            <!-- Display Order -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Display Order</label>
              <input
                v-model.number="form.displayOrder"
                type="number"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
            </div>

            <!-- Status -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                v-model="form.status"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <!-- Icon -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Icon</label>
              <select
                v-model="form.icon"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="info">Info</option>
                <option value="help">Help</option>
                <option value="video">Video</option>
                <option value="question">Question</option>
                <option value="lightbulb">Lightbulb</option>
                <option value="book">Book</option>
              </select>
            </div>
          </div>

          <!-- Footer -->
          <div class="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex justify-end gap-3">
            <button
              @click="closeModal"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              @click="saveTopic"
              :disabled="saving"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors font-medium"
            >
              {{ saving ? 'Saving...' : (editingId ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-gray-800 text-white rounded-lg max-w-md w-full border-2 border-red-700 shadow-2xl">
          <div class="px-6 py-4">
            <h2 class="text-xl font-bold text-red-400 mb-3">Delete Help Topic?</h2>
            <p class="text-gray-300 mb-6">
              Are you sure you want to delete "{{ topicToDelete?.title }}"? This action cannot be undone.
            </p>
          </div>
          <div class="bg-gray-900 border-t border-gray-700 px-6 py-4 flex justify-end gap-3">
            <button
              @click="showDeleteConfirm = false"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="confirmDelete"
              :disabled="deleting"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      helpTopics: [],
      loading: false,
      saving: false,
      deleting: false,
      showModal: false,
      showDeleteConfirm: false,
      editingId: null,
      topicToDelete: null,
      searchQuery: '',
      selectedCategory: '',
      selectedStatus: '',
      displayContextOptions: [
        'dashboard', 'applications-list', 'application-detail',
        'segments-list', 'segment-detail', 'segment-new',
        'users-list', 'user-detail',
        'email-templates', 'email-lists', 'email-send',
        'flags', 'todos', 'calendar', 'dropbox', 'vdo-ninja'
      ],
      form: {
        slug: '',
        title: '',
        content: '',
        videoUrl: '',
        category: 'general',
        tagsInput: '',
        displayContext: [],
        displayOrder: 0,
        status: 'published',
        icon: 'info'
      }
    };
  },
  computed: {
    filteredTopics() {
      return this.helpTopics.filter(topic => {
        const matchesSearch = !this.searchQuery ||
          topic.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          topic.content.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (topic.tags && topic.tags.some(t => t.toLowerCase().includes(this.searchQuery.toLowerCase())));

        const matchesCategory = !this.selectedCategory || topic.category === this.selectedCategory;
        const matchesStatus = !this.selectedStatus || topic.status === this.selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
      });
    }
  },
  methods: {
    async loadHelpTopics() {
      this.loading = true;
      try {
        const response = await window.api.getHelpTopics({ limit: 100 });
        console.log('Help topics loaded:', response);
        if (response.success) {
          this.helpTopics = response.data;
          console.log('Topics count:', this.helpTopics.length);
        }
      } catch (err) {
        console.error('Error loading help topics:', err);
        alert('Failed to load help topics: ' + err.message);
      } finally {
        this.loading = false;
      }
    },
    openCreateModal() {
      this.editingId = null;
      this.form = {
        slug: '',
        title: '',
        content: '',
        videoUrl: '',
        category: 'general',
        tagsInput: '',
        displayContext: [],
        displayOrder: 0,
        status: 'published',
        icon: 'info'
      };
      this.showModal = true;
    },
    editTopic(topic) {
      this.editingId = topic._id;
      this.form = {
        slug: topic.slug,
        title: topic.title,
        content: topic.content,
        videoUrl: topic.videoUrl || '',
        category: topic.category,
        tagsInput: (topic.tags || []).join(', '),
        displayContext: [...(topic.displayContext || [])],
        displayOrder: topic.displayOrder || 0,
        status: topic.status,
        icon: topic.icon
      };
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.editingId = null;
    },
    async saveTopic() {
      if (!this.form.slug || !this.form.title || !this.form.content) {
        alert('Slug, title, and content are required');
        return;
      }

      this.saving = true;
      try {
        const data = {
          slug: this.form.slug,
          title: this.form.title,
          content: this.form.content,
          videoUrl: this.form.videoUrl,
          category: this.form.category,
          tags: this.form.tagsInput.split(',').map(t => t.trim()).filter(t => t),
          displayContext: this.form.displayContext,
          displayOrder: this.form.displayOrder,
          status: this.form.status,
          icon: this.form.icon
        };

        let response;
        if (this.editingId) {
          console.log('Updating topic:', this.editingId, data);
          response = await window.api.updateHelpTopic(this.editingId, data);
        } else {
          console.log('Creating new topic:', data);
          response = await window.api.createHelpTopic(data);
        }

        console.log('API Response:', response);
        if (response.success) {
          console.log('Save successful, reloading topics...');
          this.closeModal();
          await this.loadHelpTopics();
        } else {
          alert('Failed to save: ' + response.message);
        }
      } catch (err) {
        console.error('Save error:', err);
        alert('Failed to save help topic: ' + err.message);
      } finally {
        this.saving = false;
      }
    },
    deleteTopic(topic) {
      this.topicToDelete = topic;
      this.showDeleteConfirm = true;
    },
    async confirmDelete() {
      if (!this.topicToDelete) return;

      this.deleting = true;
      try {
        const response = await window.api.deleteHelpTopic(this.topicToDelete._id);
        if (response.success) {
          this.showDeleteConfirm = false;
          this.topicToDelete = null;
          await this.loadHelpTopics();
        }
      } catch (err) {
        alert('Failed to delete help topic: ' + err.message);
      } finally {
        this.deleting = false;
      }
    }
  },
  mounted() {
    this.loadHelpTopics();
  }
};
