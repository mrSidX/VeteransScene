import { ref, onMounted, computed } from 'vue';
import api from '../services/api.js';

export default {
  name: 'DropboxSettings',
  setup() {
    const settings = ref(null);
    const loading = ref(true);
    const saving = ref(false);
    const error = ref('');
    const success = ref('');
    const runningCleanup = ref(false);
    const cleanupResult = ref(null);

    // Form data
    const formData = ref({
      activeBackend: 'local',
      backends: {
        local: {
          basePath: 'uploads/dropbox',
          maxTotalStorage: 10 * 1024 * 1024 * 1024
        }
      },
      limits: {
        maxFileSize: 100 * 1024 * 1024,
        maxFilesPerSegment: 50,
        maxFilesPerUser: 200,
        maxStoragePerUser: 1024 * 1024 * 1024
      },
      allowedExtensions: [],
      autoDelete: {
        enabled: false,
        period: 'monthly',
        customDays: 30,
        excludeSegmentStatuses: []
      },
      features: {
        resumableUploads: true,
        thumbnailGeneration: true
      }
    });

    // Extension input
    const newExtension = ref('');

    // Storage size helpers
    const maxFileSizeMB = computed({
      get: () => Math.round(formData.value.limits.maxFileSize / (1024 * 1024)),
      set: (val) => { formData.value.limits.maxFileSize = val * 1024 * 1024; }
    });

    const maxStoragePerUserGB = computed({
      get: () => (formData.value.limits.maxStoragePerUser / (1024 * 1024 * 1024)).toFixed(1),
      set: (val) => { formData.value.limits.maxStoragePerUser = parseFloat(val) * 1024 * 1024 * 1024; }
    });

    const maxTotalStorageGB = computed({
      get: () => (formData.value.backends.local.maxTotalStorage / (1024 * 1024 * 1024)).toFixed(1),
      set: (val) => { formData.value.backends.local.maxTotalStorage = parseFloat(val) * 1024 * 1024 * 1024; }
    });

    const segmentStatuses = [
      'proposal',
      'in-consideration',
      'in-review',
      'approved',
      'planning',
      'scheduled',
      'in-production',
      'post-production',
      'completed',
      'on-hold',
      'cancelled'
    ];

    const periodOptions = [
      { value: 'hourly', label: 'Hourly' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'custom', label: 'Custom Days' }
    ];

    const fetchSettings = async () => {
      try {
        loading.value = true;
        error.value = '';
        const response = await api.getDropboxSettings();
        if (response.success) {
          settings.value = response.data.settings;
          // Populate form data
          Object.assign(formData.value, {
            activeBackend: settings.value.activeBackend,
            backends: settings.value.backends,
            limits: settings.value.limits,
            allowedExtensions: settings.value.allowedExtensions || [],
            autoDelete: settings.value.autoDelete || formData.value.autoDelete,
            features: settings.value.features || formData.value.features
          });
        }
      } catch (err) {
        error.value = 'Failed to load settings: ' + err.message;
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const saveSettings = async () => {
      try {
        saving.value = true;
        error.value = '';
        success.value = '';

        const response = await api.updateDropboxSettings(formData.value);
        if (response.success) {
          success.value = 'Settings saved successfully';
          settings.value = response.data.settings;
          setTimeout(() => { success.value = ''; }, 3000);
        }
      } catch (err) {
        error.value = 'Failed to save settings: ' + err.message;
      } finally {
        saving.value = false;
      }
    };

    const addExtension = () => {
      const ext = newExtension.value.trim().toLowerCase().replace('.', '');
      if (ext && !formData.value.allowedExtensions.includes(ext)) {
        formData.value.allowedExtensions.push(ext);
        newExtension.value = '';
      }
    };

    const removeExtension = (ext) => {
      const idx = formData.value.allowedExtensions.indexOf(ext);
      if (idx > -1) {
        formData.value.allowedExtensions.splice(idx, 1);
      }
    };

    const toggleExcludedStatus = (status) => {
      const idx = formData.value.autoDelete.excludeSegmentStatuses.indexOf(status);
      if (idx > -1) {
        formData.value.autoDelete.excludeSegmentStatuses.splice(idx, 1);
      } else {
        formData.value.autoDelete.excludeSegmentStatuses.push(status);
      }
    };

    const runCleanup = async (dryRun = false) => {
      try {
        runningCleanup.value = true;
        cleanupResult.value = null;
        error.value = '';

        const response = await api.triggerDropboxCleanup({ dryRun });
        if (response.success) {
          cleanupResult.value = {
            dryRun,
            ...response.data
          };
        }
      } catch (err) {
        error.value = 'Cleanup failed: ' + err.message;
      } finally {
        runningCleanup.value = false;
      }
    };

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    onMounted(() => {
      fetchSettings();
    });

    return {
      settings,
      loading,
      saving,
      error,
      success,
      formData,
      newExtension,
      maxFileSizeMB,
      maxStoragePerUserGB,
      maxTotalStorageGB,
      segmentStatuses,
      periodOptions,
      runningCleanup,
      cleanupResult,
      saveSettings,
      addExtension,
      removeExtension,
      toggleExcludedStatus,
      runCleanup,
      formatBytes
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <router-link to="/dropbox" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-4">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to File Browser
          </router-link>
          <h1 class="text-3xl font-bold text-yellow-400 mb-2">Dropbox Settings</h1>
          <p class="text-gray-400">Configure file storage, limits, and automatic cleanup</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading settings...</p>
        </div>

        <div v-else>
          <!-- Messages -->
          <div v-if="error" class="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {{ error }}
          </div>
          <div v-if="success" class="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
            {{ success }}
          </div>

          <!-- Storage Backend -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Storage Backend</h2>

            <div class="mb-4">
              <label class="block text-sm text-gray-400 mb-2">Active Backend</label>
              <select
                v-model="formData.activeBackend"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="local">Local Filesystem</option>
                <option value="s3" disabled>Amazon S3 (Coming Soon)</option>
                <option value="google-drive" disabled>Google Drive (Coming Soon)</option>
              </select>
            </div>

            <div v-if="formData.activeBackend === 'local'" class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">Base Path</label>
                <input
                  v-model="formData.backends.local.basePath"
                  type="text"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <p class="text-xs text-gray-500 mt-1">Relative to API root directory</p>
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-2">Max Total Storage (GB)</label>
                <input
                  v-model="maxTotalStorageGB"
                  type="number"
                  min="1"
                  step="0.1"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>

          <!-- Upload Limits -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Upload Limits</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">Max File Size (MB)</label>
                <input
                  v-model="maxFileSizeMB"
                  type="number"
                  min="1"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-2">Max Files Per Segment</label>
                <input
                  v-model.number="formData.limits.maxFilesPerSegment"
                  type="number"
                  min="1"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-2">Max Files Per User</label>
                <input
                  v-model.number="formData.limits.maxFilesPerUser"
                  type="number"
                  min="1"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-2">Max Storage Per User (GB)</label>
                <input
                  v-model="maxStoragePerUserGB"
                  type="number"
                  min="0.1"
                  step="0.1"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>

          <!-- Allowed File Types -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Allowed File Extensions</h2>

            <div class="flex gap-2 mb-4">
              <input
                v-model="newExtension"
                type="text"
                placeholder="e.g., pdf, mp4, jpg"
                class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                @keyup.enter="addExtension"
              />
              <button
                @click="addExtension"
                class="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded font-semibold transition"
              >
                Add
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="ext in formData.allowedExtensions"
                :key="ext"
                class="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-300 rounded"
              >
                .{{ ext }}
                <button @click="removeExtension(ext)" class="text-gray-500 hover:text-red-400">&times;</button>
              </span>
              <span v-if="formData.allowedExtensions.length === 0" class="text-gray-500 text-sm">
                No restrictions - all file types allowed
              </span>
            </div>
          </div>

          <!-- Auto-Delete Settings -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Auto-Delete Settings</h2>

            <div class="mb-4">
              <label class="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  @click="formData.autoDelete.enabled = !formData.autoDelete.enabled"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    formData.autoDelete.enabled ? 'bg-yellow-600' : 'bg-gray-600'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      formData.autoDelete.enabled ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  ></span>
                </button>
                <span class="text-gray-300">Enable automatic file cleanup</span>
              </label>
            </div>

            <div v-if="formData.autoDelete.enabled" class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">Delete files older than</label>
                <select
                  v-model="formData.autoDelete.period"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option v-for="opt in periodOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div v-if="formData.autoDelete.period === 'custom'">
                <label class="block text-sm text-gray-400 mb-2">Custom Days</label>
                <input
                  v-model.number="formData.autoDelete.customDays"
                  type="number"
                  min="1"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm text-gray-400 mb-2">Exclude files from segments with these statuses</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="status in segmentStatuses"
                    :key="status"
                    @click="toggleExcludedStatus(status)"
                    :class="[
                      'px-3 py-1 rounded text-sm transition',
                      formData.autoDelete.excludeSegmentStatuses.includes(status)
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    ]"
                  >
                    {{ status.replace(/-/g, ' ') }}
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-2">Files from segments with selected statuses will not be auto-deleted</p>
              </div>
            </div>
          </div>

          <!-- Manual Cleanup -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Manual Cleanup</h2>

            <div class="flex gap-4 mb-4">
              <button
                @click="runCleanup(true)"
                :disabled="runningCleanup"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-semibold transition"
              >
                {{ runningCleanup ? 'Running...' : 'Dry Run (Preview)' }}
              </button>
              <button
                @click="runCleanup(false)"
                :disabled="runningCleanup"
                class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded font-semibold transition"
              >
                {{ runningCleanup ? 'Running...' : 'Run Cleanup Now' }}
              </button>
            </div>

            <div v-if="cleanupResult" class="p-4 bg-gray-900 rounded-lg">
              <h3 class="font-semibold text-gray-300 mb-2">
                {{ cleanupResult.dryRun ? 'Dry Run Results (No files deleted)' : 'Cleanup Results' }}
              </h3>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">Files {{ cleanupResult.dryRun ? 'would be' : '' }} deleted:</span>
                  <span class="ml-2 text-gray-200">{{ cleanupResult.filesDeleted }}</span>
                </div>
                <div>
                  <span class="text-gray-500">Space {{ cleanupResult.dryRun ? 'would be' : '' }} freed:</span>
                  <span class="ml-2 text-gray-200">{{ formatBytes(cleanupResult.bytesFreed) }}</span>
                </div>
                <div v-if="cleanupResult.errors?.length > 0">
                  <span class="text-red-400">Errors: {{ cleanupResult.errors.length }}</span>
                </div>
              </div>
            </div>

            <div v-if="settings?.autoDelete?.lastCleanupAt" class="mt-4 text-sm text-gray-500">
              Last cleanup: {{ new Date(settings.autoDelete.lastCleanupAt).toLocaleString() }}
              ({{ settings.autoDelete.lastCleanupStats?.filesDeleted || 0 }} files,
              {{ formatBytes(settings.autoDelete.lastCleanupStats?.bytesFreed || 0) }})
            </div>
          </div>

          <!-- Features -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Features</h2>

            <div class="space-y-3">
              <label class="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  @click="formData.features.resumableUploads = !formData.features.resumableUploads"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    formData.features.resumableUploads ? 'bg-green-600' : 'bg-gray-600'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      formData.features.resumableUploads ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  ></span>
                </button>
                <span class="text-gray-300">Resumable Uploads (TUS protocol)</span>
              </label>

              <label class="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  @click="formData.features.thumbnailGeneration = !formData.features.thumbnailGeneration"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    formData.features.thumbnailGeneration ? 'bg-green-600' : 'bg-gray-600'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      formData.features.thumbnailGeneration ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  ></span>
                </button>
                <span class="text-gray-300">Thumbnail Generation for Images</span>
              </label>
            </div>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end">
            <button
              @click="saveSettings"
              :disabled="saving"
              class="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 rounded-lg font-bold transition"
            >
              {{ saving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
