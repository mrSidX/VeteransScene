import { ref, computed, onMounted } from 'vue';
import api from '../services/api.js';

export default {
  name: 'SegmentFiles',
  props: {
    segmentId: {
      type: String,
      required: true
    }
  },
  emits: ['refresh'],
  setup(props, { emit }) {
    const files = ref([]);
    const loading = ref(true);
    const uploading = ref(false);
    const uploadProgress = ref(0);
    const error = ref('');
    const dragOver = ref(false);
    const selectedFile = ref(null);
    const showDeleteModal = ref(false);
    const fileToDelete = ref(null);
    const deleting = ref(false);

    // Pagination
    const page = ref(1);
    const limit = ref(20);
    const total = ref(0);

    const totalPages = computed(() => Math.ceil(total.value / limit.value));

    const fetchFiles = async () => {
      try {
        loading.value = true;
        error.value = '';
        const response = await api.getSegmentFiles(props.segmentId, {
          page: page.value,
          limit: limit.value
        });
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

    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
        uploadFile(file);
      }
    };

    const handleDrop = (event) => {
      event.preventDefault();
      dragOver.value = false;
      const file = event.dataTransfer.files[0];
      if (file) {
        uploadFile(file);
      }
    };

    const handleDragOver = (event) => {
      event.preventDefault();
      dragOver.value = true;
    };

    const handleDragLeave = () => {
      dragOver.value = false;
    };

    const uploadFile = async (file) => {
      try {
        uploading.value = true;
        uploadProgress.value = 0;
        error.value = '';

        const response = await api.uploadSegmentFile(props.segmentId, file, (progress) => {
          uploadProgress.value = progress;
        });

        if (response.success) {
          await fetchFiles();
          emit('refresh');
        }
      } catch (err) {
        error.value = 'Upload failed: ' + err.message;
      } finally {
        uploading.value = false;
        uploadProgress.value = 0;
      }
    };

    const downloadFile = async (file) => {
      try {
        await api.downloadDropboxFile(file._id, file.originalName);
      } catch (err) {
        error.value = 'Download failed: ' + err.message;
      }
    };

    const confirmDelete = (file) => {
      fileToDelete.value = file;
      showDeleteModal.value = true;
    };

    const deleteFile = async () => {
      if (!fileToDelete.value) return;

      try {
        deleting.value = true;
        const response = await api.deleteDropboxFile(fileToDelete.value._id);
        if (response.success) {
          await fetchFiles();
          emit('refresh');
        }
      } catch (err) {
        error.value = 'Delete failed: ' + err.message;
      } finally {
        deleting.value = false;
        showDeleteModal.value = false;
        fileToDelete.value = null;
      }
    };

    const cancelDelete = () => {
      showDeleteModal.value = false;
      fileToDelete.value = null;
    };

    const getFileIcon = (mimeType) => {
      if (mimeType.startsWith('image/')) {
        return `<svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>`;
      } else if (mimeType.startsWith('video/')) {
        return `<svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>`;
      } else if (mimeType.startsWith('audio/')) {
        return `<svg class="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
        </svg>`;
      } else if (mimeType.includes('pdf')) {
        return `<svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>`;
      }
      return `<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>`;
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

    const prevPage = () => {
      if (page.value > 1) {
        page.value--;
        fetchFiles();
      }
    };

    const nextPage = () => {
      if (page.value < totalPages.value) {
        page.value++;
        fetchFiles();
      }
    };

    onMounted(() => {
      fetchFiles();
    });

    return {
      files,
      loading,
      uploading,
      uploadProgress,
      error,
      dragOver,
      selectedFile,
      showDeleteModal,
      fileToDelete,
      deleting,
      page,
      total,
      totalPages,
      fetchFiles,
      handleFileSelect,
      handleDrop,
      handleDragOver,
      handleDragLeave,
      downloadFile,
      confirmDelete,
      deleteFile,
      cancelDelete,
      getFileIcon,
      formatDate,
      prevPage,
      nextPage
    };
  },
  template: `
    <div class="bg-gray-800 border border-green-500/30 rounded-xl p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-600/20 rounded-lg">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">Files</h2>
            <p class="text-sm text-gray-400">{{ total }} file{{ total !== 1 ? 's' : '' }} attached</p>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
        {{ error }}
        <button @click="error = ''" class="float-right text-red-400 hover:text-red-300">&times;</button>
      </div>

      <!-- Upload Area -->
      <div
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        :class="[
          'relative border-2 border-dashed rounded-xl p-6 mb-6 text-center transition-all duration-300',
          dragOver ? 'border-green-400 bg-green-900/20' : 'border-gray-600 hover:border-gray-500 bg-gray-900/30'
        ]"
      >
        <input
          type="file"
          @change="handleFileSelect"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          :disabled="uploading"
        />

        <div v-if="uploading" class="space-y-3">
          <div class="w-16 h-16 mx-auto rounded-full bg-green-900/50 flex items-center justify-center">
            <svg class="w-8 h-8 text-green-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </div>
          <p class="text-green-400 font-medium">Uploading... {{ uploadProgress }}%</p>
          <div class="w-full max-w-xs mx-auto bg-gray-700 rounded-full h-2">
            <div
              class="bg-green-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: uploadProgress + '%' }"
            ></div>
          </div>
        </div>

        <div v-else class="space-y-2">
          <svg class="w-12 h-12 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          <p class="text-gray-400">
            <span class="text-green-400 font-medium">Click to upload</span> or drag and drop
          </p>
          <p class="text-gray-500 text-sm">Images, videos, documents up to 100MB</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
        <p class="mt-2 text-gray-400 text-sm">Loading files...</p>
      </div>

      <!-- Files List -->
      <div v-else-if="files.length > 0" class="space-y-3">
        <div
          v-for="file in files"
          :key="file._id"
          class="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors group"
        >
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <!-- File Icon/Thumbnail -->
            <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden">
              <div v-if="file.isImage && file.thumbnailUrl">
                <img :src="file.thumbnailUrl" :alt="file.originalName" class="w-full h-full object-cover" />
              </div>
              <div v-else v-html="getFileIcon(file.mimeType)"></div>
            </div>

            <!-- File Info -->
            <div class="flex-1 min-w-0">
              <p class="text-gray-200 font-medium truncate" :title="file.originalName">
                {{ file.originalName }}
              </p>
              <div class="flex items-center gap-3 text-xs text-gray-500">
                <span>{{ file.sizeFormatted }}</span>
                <span>&bull;</span>
                <span>{{ formatDate(file.createdAt) }}</span>
                <span v-if="file.uploadedBy">&bull;</span>
                <span v-if="file.uploadedBy">{{ file.uploadedBy.firstName }} {{ file.uploadedBy.lastName }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click="downloadFile(file)"
              class="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              title="Download"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </button>
            <button
              @click="confirmDelete(file)"
              class="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 pt-4">
          <button
            @click="prevPage"
            :disabled="page === 1"
            class="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded transition-colors"
          >
            Previous
          </button>
          <span class="text-gray-400 text-sm">
            Page {{ page }} of {{ totalPages }}
          </span>
          <button
            @click="nextPage"
            :disabled="page === totalPages"
            class="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-8">
        <svg class="w-16 h-16 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <p class="text-gray-400">No files uploaded yet</p>
        <p class="text-gray-500 text-sm mt-1">Drag and drop files above to get started</p>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
          <h3 class="text-xl font-bold text-red-400 mb-4">Delete File</h3>
          <p class="text-gray-300 mb-2">Are you sure you want to delete this file?</p>
          <p class="text-gray-400 text-sm mb-4 truncate">{{ fileToDelete?.originalName }}</p>
          <p class="text-yellow-500 text-sm mb-6">This action cannot be undone.</p>

          <div class="flex gap-3">
            <button
              @click="deleteFile"
              :disabled="deleting"
              class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-md font-semibold transition"
            >
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
            <button
              @click="cancelDelete"
              :disabled="deleting"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
