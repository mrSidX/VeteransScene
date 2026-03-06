import { ref, computed, onMounted } from 'vue';
import api from '../services/api.js';

export default {
  name: 'S3Browser',
  setup() {
    const objects = ref([]);
    const prefixes = ref([]);
    const currentPrefix = ref('');
    const nextToken = ref(null);
    const isTruncated = ref(false);
    const loading = ref(false);
    const loadingMore = ref(false);
    const stats = ref(null);
    const statsLoading = ref(false);
    const orphansOnly = ref(false);
    const selectedKeys = ref(new Set());
    const deleteConfirm = ref(null); // key string or 'bulk'
    const deleting = ref(false);
    const error = ref('');
    const playerModal = ref(null); // { url, key, mimeType }
    const playerLoading = ref(false);
    const backfilling = ref(false);
    const backfillResult = ref(null);

    const formatSize = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    };

    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleString();
    };

    const breadcrumbs = computed(() => {
      const parts = currentPrefix.value.split('/').filter(Boolean);
      const crumbs = [{ label: 'Root', prefix: '' }];
      let accumulated = '';
      for (const part of parts) {
        accumulated += part + '/';
        crumbs.push({ label: part, prefix: accumulated });
      }
      return crumbs;
    });

    const filteredObjects = computed(() => {
      if (!orphansOnly.value) return objects.value;
      return objects.value.filter(o => o.isOrphan);
    });

    const selectedOrphans = computed(() => {
      return [...selectedKeys.value].filter(key => {
        const obj = objects.value.find(o => o.key === key);
        return obj && obj.isOrphan;
      });
    });

    const allOrphansSelected = computed(() => {
      const orphans = objects.value.filter(o => o.isOrphan);
      return orphans.length > 0 && orphans.every(o => selectedKeys.value.has(o.key));
    });

    const toggleSelectAll = () => {
      const orphans = filteredObjects.value.filter(o => o.isOrphan);
      if (allOrphansSelected.value) {
        orphans.forEach(o => selectedKeys.value.delete(o.key));
      } else {
        orphans.forEach(o => selectedKeys.value.add(o.key));
      }
    };

    const toggleSelect = (key) => {
      if (selectedKeys.value.has(key)) {
        selectedKeys.value.delete(key);
      } else {
        selectedKeys.value.add(key);
      }
    };

    const getFileName = (key) => {
      const parts = key.split('/');
      return parts[parts.length - 1] || key;
    };

    const loadObjects = async (prefix = '', append = false) => {
      if (append) {
        loadingMore.value = true;
      } else {
        loading.value = true;
        selectedKeys.value = new Set();
      }
      error.value = '';

      try {
        const params = { prefix, limit: '200' };
        if (append && nextToken.value) {
          params.continuationToken = nextToken.value;
        }

        const result = await api.browseS3(params);

        if (append) {
          objects.value = [...objects.value, ...result.data.objects];
        } else {
          objects.value = result.data.objects;
          prefixes.value = result.data.prefixes;
          currentPrefix.value = result.data.currentPrefix;
        }
        nextToken.value = result.data.nextToken;
        isTruncated.value = result.data.isTruncated;
      } catch (err) {
        error.value = err.message || 'Failed to browse S3';
      } finally {
        loading.value = false;
        loadingMore.value = false;
      }
    };

    const navigateToPrefix = (prefix) => {
      loadObjects(prefix);
    };

    const loadStats = async () => {
      statsLoading.value = true;
      try {
        const result = await api.getS3Stats();
        stats.value = result.data;
      } catch (err) {
        console.error('Failed to load S3 stats:', err);
      } finally {
        statsLoading.value = false;
      }
    };

    const confirmDelete = (key) => {
      deleteConfirm.value = key;
    };

    const confirmBulkDelete = () => {
      if (selectedOrphans.value.length === 0) return;
      deleteConfirm.value = 'bulk';
    };

    const cancelDelete = () => {
      deleteConfirm.value = null;
    };

    const executeDelete = async () => {
      deleting.value = true;
      try {
        if (deleteConfirm.value === 'bulk') {
          const keys = [...selectedOrphans.value];
          for (const key of keys) {
            await api.deleteS3Object(key);
          }
          objects.value = objects.value.filter(o => !keys.includes(o.key));
          selectedKeys.value = new Set();
        } else {
          const key = deleteConfirm.value;
          await api.deleteS3Object(key);
          objects.value = objects.value.filter(o => o.key !== key);
          selectedKeys.value.delete(key);
        }
        deleteConfirm.value = null;
        // Refresh stats in background
        loadStats();
      } catch (err) {
        error.value = err.message || 'Failed to delete';
      } finally {
        deleting.value = false;
      }
    };

    const mediaExtensions = new Set([
      '.mp4', '.webm', '.mov', '.mkv', '.mp3', '.wav', '.ogg', '.m4a', '.flac'
    ]);

    const isMediaFile = (key) => {
      const ext = '.' + key.split('.').pop().toLowerCase();
      return mediaExtensions.has(ext);
    };

    const getMimeType = (key) => {
      const ext = '.' + key.split('.').pop().toLowerCase();
      const map = {
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
        '.mkv': 'video/x-matroska', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
        '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.flac': 'audio/flac'
      };
      return map[ext] || 'application/octet-stream';
    };

    const isVideoMime = (mime) => mime && mime.startsWith('video/');

    const playFile = async (key) => {
      playerLoading.value = true;
      try {
        const result = await api.getS3PresignedUrl(key);
        playerModal.value = {
          url: result.data.url,
          key,
          mimeType: getMimeType(key)
        };
      } catch (err) {
        error.value = err.message || 'Failed to get playback URL';
      } finally {
        playerLoading.value = false;
      }
    };

    const closePlayer = () => {
      playerModal.value = null;
    };

    const runBackfill = async () => {
      backfilling.value = true;
      backfillResult.value = null;
      try {
        const result = await api.backfillS3Recordings();
        backfillResult.value = result;
        // Refresh objects and stats
        loadObjects(currentPrefix.value);
        loadStats();
      } catch (err) {
        error.value = err.message || 'Backfill failed';
      } finally {
        backfilling.value = false;
      }
    };

    onMounted(() => {
      loadObjects('');
      loadStats();
    });

    return {
      objects, prefixes, currentPrefix, nextToken, isTruncated,
      loading, loadingMore, stats, statsLoading, orphansOnly,
      selectedKeys, deleteConfirm, deleting, error,
      playerModal, playerLoading, backfilling, backfillResult,
      formatSize, formatDate, breadcrumbs, filteredObjects,
      selectedOrphans, allOrphansSelected,
      toggleSelectAll, toggleSelect, getFileName,
      loadObjects, navigateToPrefix, loadStats,
      confirmDelete, confirmBulkDelete, cancelDelete, executeDelete,
      isMediaFile, playFile, closePlayer, isVideoMime,
      runBackfill
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 class="text-2xl font-bold text-yellow-400">S3 Bucket Browser</h1>
            <p class="text-gray-400 text-sm mt-1">Browse and manage S3 objects, identify orphaned files</p>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="orphansOnly" class="rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400">
              <span class="text-gray-300">Orphans only</span>
            </label>
            <button v-if="selectedOrphans.length > 0" @click="confirmBulkDelete"
              class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg font-medium transition">
              Delete Selected ({{ selectedOrphans.length }})
            </button>
            <button @click="runBackfill" :disabled="backfilling"
              class="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg font-medium transition disabled:opacity-50">
              {{ backfilling ? 'Backfilling...' : 'Backfill Tracked' }}
            </button>
            <button @click="loadStats" :disabled="statsLoading"
              class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
              {{ statsLoading ? 'Loading...' : 'Refresh Stats' }}
            </button>
          </div>
        </div>

        <!-- Stats Bar -->
        <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 uppercase">Total Objects</div>
            <div class="text-lg font-bold text-gray-100">{{ stats.totalObjects }}</div>
          </div>
          <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 uppercase">Total Size</div>
            <div class="text-lg font-bold text-gray-100">{{ formatSize(stats.totalSize) }}</div>
          </div>
          <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 uppercase">Tracked</div>
            <div class="text-lg font-bold text-green-400">{{ stats.trackedCount }}</div>
          </div>
          <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 uppercase">Orphans</div>
            <div class="text-lg font-bold text-red-400">{{ stats.orphanCount }}</div>
          </div>
          <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div class="text-xs text-gray-400 uppercase">Orphan Size</div>
            <div class="text-lg font-bold text-red-400">{{ formatSize(stats.orphanSize) }}</div>
          </div>
        </div>

        <!-- Backfill Result -->
        <div v-if="backfillResult" class="bg-green-900/50 border border-green-700 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span class="text-green-300 text-sm">{{ backfillResult.message }}</span>
          <button @click="backfillResult = null" class="text-green-400 hover:text-green-300">&times;</button>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span class="text-red-300 text-sm">{{ error }}</span>
          <button @click="error = ''" class="text-red-400 hover:text-red-300">&times;</button>
        </div>

        <!-- Breadcrumbs -->
        <div class="flex items-center gap-1 mb-4 text-sm flex-wrap bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
          <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          <template v-for="(crumb, i) in breadcrumbs" :key="crumb.prefix">
            <span v-if="i > 0" class="text-gray-600">/</span>
            <button @click="navigateToPrefix(crumb.prefix)"
              :class="i === breadcrumbs.length - 1 ? 'text-yellow-400 font-medium' : 'text-gray-400 hover:text-yellow-400'"
              class="transition">
              {{ crumb.label }}
            </button>
          </template>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-20">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
          <span class="ml-3 text-gray-400">Loading...</span>
        </div>

        <!-- Content -->
        <div v-else>
          <!-- Folders -->
          <div v-if="prefixes.length > 0 && !orphansOnly" class="mb-4">
            <div v-for="prefix in prefixes" :key="prefix"
              @click="navigateToPrefix(prefix)"
              class="flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg mb-2 cursor-pointer transition group">
              <svg class="w-5 h-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
              </svg>
              <span class="text-gray-200 group-hover:text-yellow-400 transition font-medium">
                {{ prefix.replace(currentPrefix, '').replace(/\\/$/, '') }}
              </span>
              <svg class="w-4 h-4 text-gray-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <!-- Select All -->
          <div v-if="filteredObjects.length > 0" class="flex items-center gap-3 px-4 py-2 mb-2">
            <label class="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" :checked="allOrphansSelected" @change="toggleSelectAll"
                class="rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400">
              Select all orphans
            </label>
            <span class="text-xs text-gray-500">{{ filteredObjects.length }} file(s)</span>
          </div>

          <!-- Files -->
          <div v-if="filteredObjects.length > 0" class="space-y-1">
            <div v-for="obj in filteredObjects" :key="obj.key"
              class="flex items-center gap-3 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition">
              <!-- Checkbox (orphans only) -->
              <input v-if="obj.isOrphan" type="checkbox" :checked="selectedKeys.has(obj.key)" @change="toggleSelect(obj.key)"
                class="rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400 flex-shrink-0">
              <div v-else class="w-4 flex-shrink-0"></div>

              <!-- File icon -->
              <svg class="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>

              <!-- File info -->
              <div class="flex-1 min-w-0">
                <div class="text-sm text-gray-200 truncate" :title="obj.key">{{ getFileName(obj.key) }}</div>
                <div class="text-xs text-gray-500 truncate">{{ obj.key }}</div>
              </div>

              <!-- Size -->
              <span class="text-xs text-gray-400 flex-shrink-0 hidden sm:block">{{ formatSize(obj.size) }}</span>

              <!-- Date -->
              <span class="text-xs text-gray-500 flex-shrink-0 hidden md:block w-36 text-right">{{ formatDate(obj.lastModified) }}</span>

              <!-- Status badge -->
              <span v-if="obj.isOrphan"
                class="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-400 border border-red-800 flex-shrink-0">
                Orphan
              </span>
              <span v-else
                class="px-2 py-0.5 text-xs rounded-full bg-green-900/50 text-green-400 border border-green-800 flex-shrink-0"
                :title="obj.dbRecord?.originalName || ''">
                Tracked
              </span>

              <!-- Play button (media files only) -->
              <button v-if="isMediaFile(obj.key)" @click="playFile(obj.key)"
                :disabled="playerLoading"
                class="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700 rounded transition flex-shrink-0"
                title="Play file">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>

              <!-- Delete button -->
              <button @click="confirmDelete(obj.key)"
                class="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition flex-shrink-0"
                title="Delete from S3">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="!loading && prefixes.length === 0" class="text-center py-20">
            <svg class="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <p class="text-gray-400">{{ orphansOnly ? 'No orphaned files in this prefix' : 'No objects found' }}</p>
          </div>

          <!-- Load More -->
          <div v-if="isTruncated && nextToken" class="mt-4 text-center">
            <button @click="loadObjects(currentPrefix, true)" :disabled="loadingMore"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition text-sm">
              {{ loadingMore ? 'Loading...' : 'Load More' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="deleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div @click="cancelDelete" class="absolute inset-0 bg-black bg-opacity-60"></div>
        <div class="relative bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-md w-full p-6">
          <h3 class="text-lg font-bold text-gray-100 mb-3">Confirm Delete</h3>
          <div v-if="deleteConfirm === 'bulk'" class="text-sm text-gray-300 mb-4">
            <p>Are you sure you want to delete <span class="font-bold text-red-400">{{ selectedOrphans.length }}</span> orphaned file(s) from S3?</p>
            <p class="text-gray-500 mt-2">This action cannot be undone.</p>
          </div>
          <div v-else class="text-sm text-gray-300 mb-4">
            <p>Delete this file from S3?</p>
            <p class="mt-2 text-xs text-gray-400 break-all bg-gray-900 rounded p-2 font-mono">{{ deleteConfirm }}</p>
            <p class="text-gray-500 mt-2">This action cannot be undone.</p>
          </div>
          <div class="flex justify-end gap-3">
            <button @click="cancelDelete"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition">
              Cancel
            </button>
            <button @click="executeDelete" :disabled="deleting"
              class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>

      <!-- Media Player Modal -->
      <div v-if="playerModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div @click="closePlayer" class="absolute inset-0 bg-black bg-opacity-80"></div>
        <div class="relative bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-4xl w-full p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-300 truncate pr-4" :title="playerModal.key">{{ playerModal.key.split('/').pop() }}</h3>
            <button @click="closePlayer" class="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <div class="bg-black rounded-lg overflow-hidden">
            <video v-if="isVideoMime(playerModal.mimeType)" :src="playerModal.url" controls autoplay
              class="w-full max-h-[70vh]" controlsList="nodownload">
              Your browser does not support video playback.
            </video>
            <audio v-else :src="playerModal.url" controls autoplay class="w-full p-4">
              Your browser does not support audio playback.
            </audio>
          </div>
          <p class="text-xs text-gray-500 mt-2">Presigned URL expires in 1 hour</p>
        </div>
      </div>
    </div>
  `
};
