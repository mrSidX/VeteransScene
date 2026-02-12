import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

export default {
  name: 'RecordingsBrowser',
  setup() {
    const authStore = useAuthStore();
    const recordings = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const success = ref(null);
    const sortBy = ref('createdAt');
    const sortOrder = ref('desc');
    const limit = ref(50);
    const currentPage = ref(1);
    const totalPages = ref(1);
    const downloading = ref({});
    const selectedRecording = ref(null);
    const previewUrl = ref(null);
    const deletingRecordingId = ref(null);
    const deleteConfirmation = ref(null);

    // Load recordings
    const loadRecordings = async () => {
      try {
        loading.value = true;
        error.value = null;

        const skip = (currentPage.value - 1) * limit.value;
        const response = await api.get('/recordings/list', {
          sortBy: sortBy.value,
          order: sortOrder.value,
          limit: limit.value,
          skip: skip
        });

        recordings.value = response.data.recordings;
        totalPages.value = response.data.pagination.pages;
      } catch (err) {
        error.value = err.message || 'Failed to load recordings';
        console.error('Load recordings error:', err);
      } finally {
        loading.value = false;
      }
    };

    // Format file size
    const formatFileSize = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (date) => {
      return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Format duration
    const formatDuration = (seconds) => {
      if (!seconds) return 'Unknown';
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      if (hrs > 0) {
        return `${hrs}h ${mins}m ${secs}s`;
      }
      return `${mins}m ${secs}s`;
    };

    // Get signed URL and preview/download
    const getRecordingUrl = async (recordingId, action = 'stream') => {
      try {
        const response = await api.get(`/recordings/${recordingId}/signed-url`, {
          forDownload: action === 'download'
        });
        return response.data.url;
      } catch (err) {
        error.value = `Failed to generate URL: ${err.message}`;
        console.error('Get URL error:', err);
        return null;
      }
    };

    // Preview recording
    const previewRecording = async (recording) => {
      try {
        selectedRecording.value = recording;
        loading.value = true;
        error.value = null;

        console.log('[RecordingsBrowser] Requesting signed URL for:', recording.id);
        const url = await getRecordingUrl(recording.id, 'stream');

        console.log('[RecordingsBrowser] Signed URL received:', {
          url: url.substring(0, 100) + '...',
          length: url.length
        });

        previewUrl.value = url;
      } catch (err) {
        console.error('[RecordingsBrowser] Preview error:', err);
        error.value = `Failed to load preview: ${err.message}`;
      } finally {
        loading.value = false;
      }
    };

    // Download recording
    const downloadRecording = async (recording) => {
      try {
        downloading.value[recording.id] = true;
        error.value = null;

        // Try S3 signed URL first
        const url = await getRecordingUrl(recording.id, 'download');

        if (url) {
          // Create a temporary link and trigger download
          const link = document.createElement('a');
          link.href = url;
          link.download = recording.filename || 'recording';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          success.value = `Downloading: ${recording.filename}`;
          setTimeout(() => {
            success.value = null;
          }, 3000);
        }
      } catch (err) {
        error.value = `Download failed: ${err.message}`;
        console.error('Download error:', err);
      } finally {
        downloading.value[recording.id] = false;
      }
    };

    // Close preview
    const closePreview = () => {
      selectedRecording.value = null;
      previewUrl.value = null;
    };

    // Delete recording
    const deleteRecording = async (recording) => {
      deleteConfirmation.value = recording;
    };

    // Confirm delete
    const confirmDelete = async () => {
      if (!deleteConfirmation.value) return;

      try {
        deletingRecordingId.value = deleteConfirmation.value.id;
        error.value = null;

        console.log('[RecordingsBrowser] Deleting recording:', deleteConfirmation.value.id);
        const response = await api.deleteRecording(deleteConfirmation.value.id);

        console.log('[RecordingsBrowser] Delete response:', response);

        success.value = `Recording "${deleteConfirmation.value.filename}" deleted successfully`;
        deleteConfirmation.value = null;

        // Reload recordings list after short delay
        setTimeout(() => {
          loadRecordings();
          setTimeout(() => {
            success.value = null;
          }, 2000);
        }, 500);
      } catch (err) {
        console.error('[RecordingsBrowser] Delete error:', err);
        // Check if it was actually successful (201/200 but JSON parse failed)
        if (err.status === 200 || (err.data && err.data.success)) {
          console.log('[RecordingsBrowser] Delete succeeded despite error, reloading...');
          success.value = `Recording deleted successfully`;
          deleteConfirmation.value = null;
          setTimeout(() => {
            loadRecordings();
          }, 500);
        } else {
          error.value = err.data?.message || err.message || 'Failed to delete recording';
        }
      } finally {
        deletingRecordingId.value = null;
      }
    };

    // Cancel delete
    const cancelDelete = () => {
      deleteConfirmation.value = null;
    };

    // Change sort
    const changeSortBy = (field) => {
      if (sortBy.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy.value = field;
        sortOrder.value = 'desc';
      }
      currentPage.value = 1;
      loadRecordings();
    };

    // Pagination
    const goToPage = (page) => {
      if (page > 0 && page <= totalPages.value) {
        currentPage.value = page;
        loadRecordings();
      }
    };

    // Check authorization
    const isAuthorized = computed(() => {
      return ['admin', 'moderator'].includes(authStore.user.value?.role);
    });

    onMounted(() => {
      if (isAuthorized.value) {
        loadRecordings();
      }
    });

    return {
      recordings,
      loading,
      error,
      success,
      sortBy,
      sortOrder,
      currentPage,
      totalPages,
      downloading,
      selectedRecording,
      previewUrl,
      deletingRecordingId,
      deleteConfirmation,
      isAuthorized,
      loadRecordings,
      formatFileSize,
      formatDate,
      formatDuration,
      previewRecording,
      downloadRecording,
      deleteRecording,
      confirmDelete,
      cancelDelete,
      closePreview,
      changeSortBy,
      goToPage
    };
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-white p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-2">Recordings Browser</h1>
        <p class="text-gray-400">View and download uploaded recordings</p>
      </div>

      <!-- Authorization check -->
      <div v-if="!isAuthorized" class="bg-red-900 border border-red-700 rounded p-4 mb-6">
        <p class="text-red-200">You do not have permission to access recordings. Admin or Moderator role required.</p>
      </div>

      <!-- Error alert -->
      <div v-if="error" class="bg-red-900 border border-red-700 rounded p-4 mb-6">
        <p class="text-red-200">{{ error }}</p>
        <button
          @click="error = null"
          class="mt-2 text-red-300 hover:text-red-100 text-sm underline"
        >
          Dismiss
        </button>
      </div>

      <!-- Success alert -->
      <div v-if="success" class="bg-green-900 border border-green-700 rounded p-4 mb-6">
        <p class="text-green-200">{{ success }}</p>
      </div>

      <!-- Controls -->
      <div v-if="isAuthorized && recordings.length > 0" class="bg-gray-800 rounded p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm text-gray-300 mb-2">Sort By</label>
            <select
              v-model="sortBy"
              @change="changeSortBy(sortBy)"
              class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
            >
              <option value="createdAt">Upload Date</option>
              <option value="size">File Size</option>
              <option value="originalName">Name</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-2">Order</label>
            <select
              v-model="sortOrder"
              @change="changeSortBy(sortBy)"
              class="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
          <div>
            <button
              @click="loadRecordings"
              :disabled="loading"
              class="w-full mt-6 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 text-gray-900 font-semibold py-2 px-4 rounded"
            >
              {{ loading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && recordings.length === 0 && isAuthorized" class="bg-gray-800 rounded p-8 text-center">
        <p class="text-gray-400 text-lg">No recordings found</p>
        <button
          @click="loadRecordings"
          class="mt-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold py-2 px-6 rounded"
        >
          Check Again
        </button>
      </div>

      <!-- Recordings table -->
      <div v-if="isAuthorized && recordings.length > 0" class="space-y-4 mb-6">
        <div v-for="recording in recordings" :key="recording.id" class="bg-gray-800 rounded p-4 hover:bg-gray-750 transition">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <!-- Filename -->
            <div>
              <p class="font-semibold truncate">{{ recording.filename }}</p>
              <p class="text-sm text-gray-400">{{ formatDate(recording.uploadedAt) }}</p>
            </div>

            <!-- Uploader -->
            <div class="hidden md:block">
              <p class="text-sm">{{ recording.uploadedBy?.firstName }} {{ recording.uploadedBy?.lastName }}</p>
              <p class="text-xs text-gray-400">{{ recording.uploadedBy?.email }}</p>
            </div>

            <!-- Size & Duration -->
            <div class="hidden md:block">
              <p class="text-sm">{{ formatFileSize(recording.size) }}</p>
              <p class="text-xs text-gray-400">{{ formatDuration(recording.duration) }}</p>
            </div>

            <!-- Segment -->
            <div class="hidden lg:block">
              <p class="text-sm truncate">{{ recording.segment?.title || 'Standalone' }}</p>
              <p class="text-xs text-gray-400">{{ recording.storageBackend }}</p>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button
                @click="previewRecording(recording)"
                class="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded text-sm font-semibold transition"
              >
                👁️ Preview
              </button>
              <button
                @click="downloadRecording(recording)"
                :disabled="downloading[recording.id]"
                class="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white py-2 px-3 rounded text-sm font-semibold transition"
              >
                {{ downloading[recording.id] ? '⬇️ ...' : '⬇️ Download' }}
              </button>
              <button
                @click="deleteRecording(recording)"
                :disabled="deletingRecordingId === recording.id"
                class="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white py-2 px-3 rounded text-sm font-semibold transition"
              >
                {{ deletingRecordingId === recording.id ? '⏳ ...' : '🗑️ Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="isAuthorized && totalPages > 1" class="flex justify-center gap-2 mb-6">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 px-4 py-2 rounded"
        >
          Previous
        </button>
        <span class="px-4 py-2">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 px-4 py-2 rounded"
        >
          Next
        </button>
      </div>

      <!-- Preview modal -->
      <div v-if="selectedRecording" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <!-- Modal header -->
          <div class="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-gray-800">
            <div>
              <h2 class="text-2xl font-bold">{{ selectedRecording.filename }}</h2>
              <p class="text-sm text-gray-400 mt-1">
                {{ formatFileSize(selectedRecording.size) }} • {{ formatDuration(selectedRecording.duration) }}
              </p>
            </div>
            <button
              @click="closePreview"
              class="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          <!-- Modal body -->
          <div class="p-6">
            <div v-if="loading" class="flex justify-center items-center py-12">
              <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
                <p class="mt-4 text-gray-300">Loading preview...</p>
              </div>
            </div>

            <div v-else-if="previewUrl" class="bg-black rounded">
              <video
                :src="previewUrl"
                controls
                class="w-full rounded"
                style="max-height: 500px;"
              ></video>
              <p class="text-xs text-gray-400 mt-2 text-center">Video preview (S3 presigned URL)</p>
            </div>

            <div v-else class="text-center py-12">
              <p class="text-gray-400">Unable to load preview</p>
            </div>

            <!-- Modal footer -->
            <div class="mt-6 flex gap-3">
              <button
                @click="downloadRecording(selectedRecording)"
                :disabled="downloading[selectedRecording.id]"
                class="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
              >
                {{ downloading[selectedRecording.id] ? '⬇️ Downloading...' : '⬇️ Download Recording' }}
              </button>
              <button
                @click="closePreview"
                class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete confirmation modal -->
      <div v-if="deleteConfirmation" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 rounded-lg max-w-md w-full">
          <!-- Modal header -->
          <div class="flex justify-between items-center p-6 border-b border-gray-700">
            <h2 class="text-2xl font-bold text-red-400">Delete Recording?</h2>
            <button
              @click="cancelDelete"
              class="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          <!-- Modal body -->
          <div class="p-6">
            <p class="text-gray-300 mb-4">
              Are you sure you want to delete this recording? This action cannot be undone.
            </p>
            <div class="bg-gray-700 rounded p-4 mb-4">
              <p class="text-sm text-gray-400">Filename</p>
              <p class="text-white font-semibold truncate">{{ deleteConfirmation.filename }}</p>
              <p class="text-sm text-gray-400 mt-3">Size</p>
              <p class="text-white">{{ formatFileSize(deleteConfirmation.size) }}</p>
              <p class="text-sm text-gray-400 mt-3">Storage</p>
              <p class="text-white">{{ deleteConfirmation.storageBackend }} - Will remove from database and {{ deleteConfirmation.storageBackend === 's3' ? 'S3 bucket' : 'local storage' }}</p>
            </div>
            <p class="text-xs text-red-300">⚠️ This will also clean up empty folder structures in S3</p>
          </div>

          <!-- Modal footer -->
          <div class="p-6 border-t border-gray-700 flex gap-3">
            <button
              @click="confirmDelete"
              :disabled="deletingRecordingId === deleteConfirmation.id"
              class="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
            >
              {{ deletingRecordingId === deleteConfirmation.id ? '⏳ Deleting...' : '🗑️ Delete Recording' }}
            </button>
            <button
              @click="cancelDelete"
              :disabled="deletingRecordingId === deleteConfirmation.id"
              class="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
