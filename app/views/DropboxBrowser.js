import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api.js';

export default {
  name: 'DropboxBrowser',
  setup() {
    const router = useRouter();

    // Data
    const files = ref([]);
    const segments = ref([]);
    const users = ref([]);
    const stats = ref(null);
    const loading = ref(true);
    const loadingStats = ref(true);
    const error = ref('');

    // Filters
    const filters = ref({
      segment: '',
      uploadedBy: '',
      mimeType: '',
      search: ''
    });

    // Pagination
    const page = ref(1);
    const limit = ref(20);
    const total = ref(0);
    const sortBy = ref('createdAt');
    const sortOrder = ref('desc');

    // Bulk selection
    const selectedFiles = ref([]);
    const selectAll = ref(false);

    const totalPages = computed(() => Math.ceil(total.value / limit.value));

    const fetchFiles = async () => {
      try {
        loading.value = true;
        error.value = '';

        const params = {
          page: page.value,
          limit: limit.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value
        };

        if (filters.value.segment) params.segment = filters.value.segment;
        if (filters.value.uploadedBy) params.uploadedBy = filters.value.uploadedBy;
        if (filters.value.mimeType) params.mimeType = filters.value.mimeType;
        if (filters.value.search) params.search = filters.value.search;

        const response = await api.browseDropboxFiles(params);
        if (response.success) {
          files.value = response.data.files;
          total.value = response.data.pagination.total;
        }
      } catch (err) {
        error.value = 'Failed to load files: ' + err.message;
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const fetchStats = async () => {
      try {
        loadingStats.value = true;
        const response = await api.getDropboxStats();
        if (response.success) {
          stats.value = response.data;
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        loadingStats.value = false;
      }
    };

    const fetchFilters = async () => {
      try {
        // Fetch segments for filter dropdown
        const segmentResponse = await api.getSegments({ limit: 100 });
        if (segmentResponse.success) {
          segments.value = segmentResponse.data.segments;
        }

        // Fetch users for filter dropdown
        const userResponse = await api.getUsers({ limit: 100 });
        if (userResponse.success) {
          users.value = userResponse.data.users;
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    };

    const applyFilters = () => {
      page.value = 1;
      fetchFiles();
    };

    const clearFilters = () => {
      filters.value = {
        segment: '',
        uploadedBy: '',
        mimeType: '',
        search: ''
      };
      page.value = 1;
      fetchFiles();
    };

    const changePage = (newPage) => {
      page.value = newPage;
      fetchFiles();
    };

    const changeSort = (field) => {
      if (sortBy.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy.value = field;
        sortOrder.value = 'desc';
      }
      fetchFiles();
    };

    const toggleSelectAll = () => {
      if (selectAll.value) {
        selectedFiles.value = files.value.map(f => f._id);
      } else {
        selectedFiles.value = [];
      }
    };

    const toggleFileSelection = (fileId) => {
      const idx = selectedFiles.value.indexOf(fileId);
      if (idx > -1) {
        selectedFiles.value.splice(idx, 1);
      } else {
        selectedFiles.value.push(fileId);
      }
    };

    const downloadFile = async (file) => {
      try {
        await api.downloadDropboxFile(file._id, file.originalName);
      } catch (err) {
        alert('Download failed: ' + err.message);
      }
    };

    const deleteFile = async (file) => {
      if (!confirm(`Are you sure you want to delete "${file.originalName}"?`)) return;

      try {
        const response = await api.deleteDropboxFile(file._id);
        if (response.success) {
          await fetchFiles();
          await fetchStats();
        }
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    };

    const viewSegment = (segmentId) => {
      router.push(`/segments/${segmentId}`);
    };

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (date) => {
      if (!date) return 'Unknown';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getFileTypeIcon = (mimeType) => {
      if (mimeType.startsWith('image/')) return 'text-green-400';
      if (mimeType.startsWith('video/')) return 'text-purple-400';
      if (mimeType.startsWith('audio/')) return 'text-yellow-400';
      if (mimeType.includes('pdf')) return 'text-red-400';
      return 'text-gray-400';
    };

    const mimeTypeOptions = [
      { value: '', label: 'All Types' },
      { value: 'image/*', label: 'Images' },
      { value: 'video/*', label: 'Videos' },
      { value: 'audio/*', label: 'Audio' },
      { value: 'application/pdf', label: 'PDF Documents' },
      { value: 'application/*', label: 'Documents' }
    ];

    watch(selectAll, toggleSelectAll);

    onMounted(() => {
      fetchFiles();
      fetchStats();
      fetchFilters();
    });

    return {
      files,
      segments,
      users,
      stats,
      loading,
      loadingStats,
      error,
      filters,
      page,
      limit,
      total,
      totalPages,
      sortBy,
      sortOrder,
      selectedFiles,
      selectAll,
      mimeTypeOptions,
      fetchFiles,
      applyFilters,
      clearFilters,
      changePage,
      changeSort,
      toggleFileSelection,
      downloadFile,
      deleteFile,
      viewSegment,
      formatBytes,
      formatDate,
      getFileTypeIcon
    };
  },
  template: `
    <div class="w-full px-2 sm:px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Back Button -->
        <router-link to="/dashboard" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-2 md:mb-3">
          <svg class="w-5 h-5 mr-1.5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          <span class="text-xs md:text-sm">Back</span>
        </router-link>

        <!-- Header -->
        <div class="mb-3 md:mb-4">
          <h1 class="text-xl md:text-3xl font-bold text-yellow-400 mb-1 md:mb-2">Dropbox Files</h1>
          <p class="text-xs text-gray-400 hidden sm:block">Manage all uploaded files across segments</p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-3 mb-3 md:mb-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-2.5 md:p-4">
            <div class="flex items-center justify-between gap-1.5 md:gap-3">
              <div class="min-w-0">
                <p class="text-gray-400 text-xs">Total Files</p>
                <p class="text-lg md:text-2xl font-bold text-white">
                  {{ loadingStats ? '...' : stats?.totalFiles || 0 }}
                </p>
              </div>
              <div class="p-1.5 md:p-3 bg-blue-900/50 rounded-lg flex-shrink-0">
                <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-gray-800 border border-gray-700 rounded-lg p-2.5 md:p-4">
            <div class="flex items-center justify-between gap-1.5 md:gap-3">
              <div class="min-w-0">
                <p class="text-gray-400 text-xs">Total Storage</p>
                <p class="text-lg md:text-2xl font-bold text-white">
                  {{ loadingStats ? '...' : formatBytes(stats?.totalSize || 0) }}
                </p>
              </div>
              <div class="p-1.5 md:p-3 bg-green-900/50 rounded-lg flex-shrink-0">
                <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-gray-800 border border-gray-700 rounded-lg p-2.5 md:p-4">
            <div class="flex items-center justify-between gap-1.5 md:gap-3">
              <div class="min-w-0">
                <p class="text-gray-400 text-xs">Avg File Size</p>
                <p class="text-lg md:text-2xl font-bold text-white">
                  {{ loadingStats ? '...' : formatBytes(stats?.averageFileSize || 0) }}
                </p>
              </div>
              <div class="p-1.5 md:p-3 bg-purple-900/50 rounded-lg flex-shrink-0">
                <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-gray-800 border border-gray-700 rounded-lg p-2.5 md:p-4">
            <div class="flex items-center justify-between gap-1.5 md:gap-3">
              <div class="min-w-0">
                <p class="text-gray-400 text-xs">Auto-Cleanup</p>
                <p class="text-lg md:text-2xl font-bold" :class="stats?.cleanup?.enabled ? 'text-green-400' : 'text-gray-500'">
                  {{ loadingStats ? '...' : (stats?.cleanup?.enabled ? 'Enabled' : 'Disabled') }}
                </p>
              </div>
              <div class="p-1.5 md:p-3 bg-yellow-900/50 rounded-lg flex-shrink-0">
                <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-2.5 md:p-4 mb-3 md:mb-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 md:gap-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Search</label>
              <input
                v-model="filters.search"
                type="text"
                placeholder="Search..."
                class="w-full px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 border border-gray-600 rounded text-xs md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                @keyup.enter="applyFilters"
              />
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Segment</label>
              <select
                v-model="filters.segment"
                class="w-full px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 border border-gray-600 rounded text-xs md:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">All Segments</option>
                <option v-for="seg in segments" :key="seg._id" :value="seg._id">
                  {{ seg.title }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Uploaded By</label>
              <select
                v-model="filters.uploadedBy"
                class="w-full px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 border border-gray-600 rounded text-xs md:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">All Users</option>
                <option v-for="user in users" :key="user._id" :value="user._id">
                  {{ user.firstName }} {{ user.lastName }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Type</label>
              <select
                v-model="filters.mimeType"
                class="w-full px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 border border-gray-600 rounded text-xs md:text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option v-for="opt in mimeTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="flex items-end gap-1 md:gap-2">
              <button
                @click="applyFilters"
                class="flex-1 px-2 md:px-4 py-1.5 md:py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded font-semibold transition text-xs md:text-sm min-h-[44px] flex items-center justify-center"
              >
                Filter
              </button>
              <button
                @click="clearFilters"
                class="px-2 md:px-4 py-1.5 md:py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded font-semibold transition text-xs md:text-sm min-h-[44px] flex items-center justify-center"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="mb-3 md:mb-4 p-2.5 md:p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-xs">
          {{ error }}
        </div>

        <!-- Files Table -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-900">
                <tr>
                  <th class="px-2 md:px-4 py-1.5 md:py-2 text-left">
                    <input
                      type="checkbox"
                      v-model="selectAll"
                      class="w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500"
                    />
                  </th>
                  <th
                    @click="changeSort('originalName')"
                    class="px-2 md:px-4 py-1.5 md:py-2 text-left text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-200"
                  >
                    File <span v-if="sortBy === 'originalName'" class="text-yellow-400">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-2 md:px-4 py-1.5 md:py-2 text-left text-xs font-semibold text-gray-400">Seg</th>
                  <th class="px-2 md:px-4 py-1.5 md:py-2 text-left text-xs font-semibold text-gray-400 hidden sm:table-cell">User</th>
                  <th
                    @click="changeSort('size')"
                    class="px-2 md:px-4 py-1.5 md:py-2 text-left text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-200"
                  >
                    Size <span v-if="sortBy === 'size'" class="text-yellow-400">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th
                    @click="changeSort('createdAt')"
                    class="px-2 md:px-4 py-1.5 md:py-2 text-left text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-200 hidden lg:table-cell"
                  >
                    Date <span v-if="sortBy === 'createdAt'" class="text-yellow-400">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="px-2 md:px-4 py-1.5 md:py-2 text-right text-xs font-semibold text-gray-400">Act</th>
                </tr>
              </thead>

              <tbody v-if="loading" class="divide-y divide-gray-700">
                <tr>
                  <td colspan="7" class="px-4 py-6 md:py-8 text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                    <p class="mt-2 text-xs md:text-sm text-gray-400">Loading...</p>
                  </td>
                </tr>
              </tbody>

              <tbody v-else-if="files.length === 0" class="divide-y divide-gray-700">
                <tr>
                  <td colspan="7" class="px-4 py-6 md:py-8 text-center text-xs md:text-sm text-gray-400">
                    No files found
                  </td>
                </tr>
              </tbody>

              <tbody v-else class="divide-y divide-gray-700">
                <tr v-for="file in files" :key="file._id" class="hover:bg-gray-750">
                  <td class="px-2 md:px-4 py-2 md:py-3">
                    <input
                      type="checkbox"
                      :checked="selectedFiles.includes(file._id)"
                      @change="toggleFileSelection(file._id)"
                      class="w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500"
                    />
                  </td>
                  <td class="px-2 md:px-4 py-1.5 md:py-2">
                    <div class="flex items-center gap-1.5 md:gap-2">
                      <div :class="['w-6 h-6 md:w-8 md:h-8 rounded flex items-center justify-center bg-gray-700 flex-shrink-0', getFileTypeIcon(file.mimeType)]">
                        <svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>
                      <div class="min-w-0">
                        <p class="text-gray-200 text-xs truncate" :title="file.originalName">{{ file.originalName }}</p>
                        <p class="text-xs text-gray-500 hidden sm:block">{{ file.mimeType }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-2 md:px-4 py-1.5 md:py-2 text-xs">
                    <button
                      v-if="file.segment"
                      @click="viewSegment(file.segment._id)"
                      class="text-yellow-400 hover:text-yellow-300 truncate max-w-[100px] block"
                      :title="file.segment.title"
                    >
                      {{ file.segment.title }}
                    </button>
                    <span v-else class="text-gray-500">-</span>
                  </td>
                  <td class="px-2 md:px-4 py-1.5 md:py-2 text-xs hidden sm:table-cell">
                    <span v-if="file.uploadedBy" class="text-gray-300 truncate block">
                      {{ file.uploadedBy.firstName }}
                    </span>
                    <span v-else class="text-gray-500">-</span>
                  </td>
                  <td class="px-2 md:px-4 py-1.5 md:py-2 text-gray-400 text-xs">
                    {{ file.sizeFormatted }}
                  </td>
                  <td class="px-2 md:px-4 py-1.5 md:py-2 text-gray-400 text-xs hidden lg:table-cell">
                    {{ formatDate(file.createdAt) }}
                  </td>
                  <td class="px-2 md:px-4 py-1.5 md:py-2 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        @click="downloadFile(file)"
                        class="p-1.5 md:p-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition flex-shrink-0 min-h-[36px] w-[36px] flex items-center justify-center"
                        title="Download"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                      </button>
                      <button
                        @click="deleteFile(file)"
                        class="p-1.5 md:p-2 bg-red-600 hover:bg-red-500 text-white rounded transition flex-shrink-0 min-h-[36px] w-[36px] flex items-center justify-center"
                        title="Delete"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="px-2 md:px-4 py-2 md:py-3 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-3">
            <div class="text-xs md:text-sm text-gray-400 hidden sm:block">
              Showing {{ (page - 1) * limit + 1 }} - {{ Math.min(page * limit, total) }} of {{ total }}
            </div>
            <div class="flex items-center gap-1 md:gap-2">
              <button
                @click="changePage(page - 1)"
                :disabled="page === 1"
                class="px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded transition text-xs md:text-sm min-h-[36px]"
              >
                ◀
              </button>
              <span class="text-gray-400 text-xs md:text-sm min-w-max">
                {{ page }}/{{ totalPages }}
              </span>
              <button
                @click="changePage(page + 1)"
                :disabled="page === totalPages"
                class="px-2 md:px-3 py-1.5 md:py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded transition text-xs md:text-sm min-h-[36px]"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        <!-- Settings Link -->
        <div class="mt-4 md:mt-6 text-center">
          <router-link
            to="/dropbox/settings"
            class="text-yellow-400 hover:text-yellow-300 text-xs md:text-sm"
          >
            Settings
          </router-link>
        </div>
      </div>
    </div>
  `
};
