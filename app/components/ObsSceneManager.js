import { ref, computed, watch, onMounted } from 'vue';
import api from '../services/api.js';

export default {
  name: 'ObsSceneManager',
  props: {
    segmentId: {
      type: String,
      required: true
    },
    vdoNinja: {
      type: Object,
      default: null
    }
  },
  emits: ['refresh'],
  setup(props, { emit }) {
    // State
    const loading = ref(false);
    const sceneInstances = ref([]);
    const themes = ref([]);
    const templates = ref({});
    const selectedTheme = ref(null);
    const selectedTemplate = ref('lower-third');
    const showThemeEditor = ref(false);
    const showWebhookInfo = ref(false);
    const webhookUrls = ref([]);

    // Theme editor state
    const editingTheme = ref(null);
    const themeForm = ref({
      name: '',
      description: '',
      colors: {
        primary: '#fbbf24',
        secondary: '#1f2937',
        background: 'rgba(0,0,0,0.85)',
        text: '#ffffff',
        accent: '#fbbf24'
      },
      typography: {
        fontFamily: 'Inter',
        nameSize: '28px',
        titleSize: '16px'
      },
      layout: {
        position: 'bottom-left',
        padding: '16px 24px',
        margin: '40px',
        borderRadius: '8px',
        accentBarWidth: '6px'
      },
      animation: {
        entrance: 'slide-left',
        duration: '0.5s'
      }
    });

    const hasVdoSession = computed(() => {
      return props.vdoNinja?.sessionCreated && props.vdoNinja?.participants?.length > 0;
    });

    const hasSceneInstances = computed(() => {
      return sceneInstances.value.length > 0;
    });

    // Fetch templates
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/obs/templates');
        if (response.success) {
          templates.value = response.data.templates;
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };

    // Fetch themes
    const fetchThemes = async () => {
      try {
        const response = await api.get('/obs/themes');
        if (response.success) {
          themes.value = response.data.themes;
        }
      } catch (err) {
        console.error('Failed to fetch themes:', err);
      }
    };

    // Fetch scene instances
    const fetchSceneInstances = async () => {
      try {
        loading.value = true;
        const response = await api.get(`/obs/segments/${props.segmentId}/instances`);
        if (response.success) {
          sceneInstances.value = response.data.instances;
        }
      } catch (err) {
        console.error('Failed to fetch scene instances:', err);
      } finally {
        loading.value = false;
      }
    };

    // Create scene instances for all participants
    const createSceneInstances = async () => {
      try {
        loading.value = true;
        const response = await api.post(`/obs/segments/${props.segmentId}/instances`, {
          themeId: selectedTheme.value,
          template: selectedTemplate.value
        });
        if (response.success) {
          sceneInstances.value = response.data.instances;
          alert(`Created ${response.data.instances.length} scene instances!`);
        }
      } catch (err) {
        alert('Failed to create scene instances: ' + err.message);
      } finally {
        loading.value = false;
      }
    };

    // Control scene visibility
    const controlScene = async (instanceId, action) => {
      try {
        const response = await api.post(`/obs/control/${instanceId}`, { action });
        if (response.success) {
          // Update local state
          const instance = sceneInstances.value.find(i => i._id === instanceId);
          if (instance) {
            instance.state.visible = response.data.visible;
          }
        }
      } catch (err) {
        alert('Failed to control scene: ' + err.message);
      }
    };

    // Show all scenes
    const showAllScenes = async () => {
      try {
        const actions = sceneInstances.value.map(i => ({
          instanceId: i._id,
          action: 'show'
        }));
        await api.post('/obs/control/batch', { actions });
        sceneInstances.value.forEach(i => i.state.visible = true);
      } catch (err) {
        alert('Failed to show all scenes: ' + err.message);
      }
    };

    // Hide all scenes
    const hideAllScenes = async () => {
      try {
        const actions = sceneInstances.value.map(i => ({
          instanceId: i._id,
          action: 'hide'
        }));
        await api.post('/obs/control/batch', { actions });
        sceneInstances.value.forEach(i => i.state.visible = false);
      } catch (err) {
        alert('Failed to hide all scenes: ' + err.message);
      }
    };

    // Update scene instance template
    const updateSceneTemplate = async (instanceId, template) => {
      try {
        const response = await api.put(`/obs/instances/${instanceId}`, {
          state: { template }
        });
        if (response.success) {
          const instance = sceneInstances.value.find(i => i._id === instanceId);
          if (instance) {
            instance.state.template = template;
          }
        }
      } catch (err) {
        alert('Failed to update template: ' + err.message);
      }
    };

    // Update scene instance theme
    const updateSceneTheme = async (instanceId, themeId) => {
      try {
        const response = await api.put(`/obs/instances/${instanceId}`, {
          theme: themeId || null
        });
        if (response.success) {
          await fetchSceneInstances();
        }
      } catch (err) {
        alert('Failed to update theme: ' + err.message);
      }
    };

    // Delete scene instance
    const deleteSceneInstance = async (instanceId) => {
      if (!confirm('Delete this scene instance?')) return;
      try {
        await api.delete(`/obs/instances/${instanceId}`);
        sceneInstances.value = sceneInstances.value.filter(i => i._id !== instanceId);
      } catch (err) {
        alert('Failed to delete scene instance: ' + err.message);
      }
    };

    // Fetch webhook URLs
    const fetchWebhookUrls = async () => {
      try {
        const response = await api.get(`/obs/segments/${props.segmentId}/webhooks`);
        if (response.success) {
          webhookUrls.value = response.data.webhooks;
          showWebhookInfo.value = true;
        }
      } catch (err) {
        alert('Failed to fetch webhook URLs: ' + err.message);
      }
    };

    // Theme management
    const openThemeEditor = (theme = null) => {
      if (theme) {
        editingTheme.value = theme;
        themeForm.value = {
          name: theme.name,
          description: theme.description || '',
          colors: { ...theme.colors },
          typography: { ...theme.typography },
          layout: { ...theme.layout },
          animation: { ...theme.animation }
        };
      } else {
        editingTheme.value = null;
        themeForm.value = {
          name: '',
          description: '',
          colors: {
            primary: '#fbbf24',
            secondary: '#1f2937',
            background: 'rgba(0,0,0,0.85)',
            text: '#ffffff',
            accent: '#fbbf24'
          },
          typography: {
            fontFamily: 'Inter',
            nameSize: '28px',
            titleSize: '16px'
          },
          layout: {
            position: 'bottom-left',
            padding: '16px 24px',
            margin: '40px',
            borderRadius: '8px',
            accentBarWidth: '6px'
          },
          animation: {
            entrance: 'slide-left',
            duration: '0.5s'
          }
        };
      }
      showThemeEditor.value = true;
    };

    const saveTheme = async () => {
      try {
        if (!themeForm.value.name.trim()) {
          alert('Please enter a theme name');
          return;
        }

        if (editingTheme.value) {
          await api.put(`/obs/themes/${editingTheme.value._id}`, themeForm.value);
        } else {
          await api.post('/obs/themes', themeForm.value);
        }

        await fetchThemes();
        showThemeEditor.value = false;
        alert('Theme saved successfully!');
      } catch (err) {
        alert('Failed to save theme: ' + err.message);
      }
    };

    const deleteTheme = async (themeId) => {
      if (!confirm('Delete this theme?')) return;
      try {
        await api.delete(`/obs/themes/${themeId}`);
        await fetchThemes();
      } catch (err) {
        alert('Failed to delete theme: ' + err.message);
      }
    };

    const duplicateTheme = async (themeId) => {
      try {
        await api.post(`/obs/themes/${themeId}/duplicate`);
        await fetchThemes();
        alert('Theme duplicated!');
      } catch (err) {
        alert('Failed to duplicate theme: ' + err.message);
      }
    };

    // Clipboard copy
    const copyToClipboard = async (text, label) => {
      try {
        await navigator.clipboard.writeText(text);
        alert(`${label} copied!`);
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert(`${label} copied!`);
      }
    };

    // Open URL in new tab
    const openUrl = (url) => {
      window.open(url, '_blank');
    };

    // Initialize
    onMounted(() => {
      fetchTemplates();
      fetchThemes();
      if (hasVdoSession.value) {
        fetchSceneInstances();
      }
    });

    // Watch for VDO session changes
    watch(() => props.vdoNinja?.sessionCreated, (newVal) => {
      if (newVal) {
        fetchSceneInstances();
      }
    });

    return {
      loading,
      sceneInstances,
      themes,
      templates,
      selectedTheme,
      selectedTemplate,
      showThemeEditor,
      showWebhookInfo,
      webhookUrls,
      editingTheme,
      themeForm,
      hasVdoSession,
      hasSceneInstances,
      createSceneInstances,
      controlScene,
      showAllScenes,
      hideAllScenes,
      updateSceneTemplate,
      updateSceneTheme,
      deleteSceneInstance,
      fetchWebhookUrls,
      openThemeEditor,
      saveTheme,
      deleteTheme,
      duplicateTheme,
      copyToClipboard,
      openUrl,
      fetchSceneInstances
    };
  },
  template: `
    <div class="bg-gray-800 border border-blue-500/30 rounded-xl p-6 shadow-lg">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-600/20 rounded-lg">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">OBS Scene Manager</h2>
            <p class="text-sm text-gray-400">Control overlays and lower-thirds for streaming</p>
          </div>
          <span v-if="hasSceneInstances" class="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded-full font-semibold border border-green-500/30">
            {{ sceneInstances.length }} SCENES
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="openThemeEditor()"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105"
          >
            + New Theme
          </button>
          <button
            v-if="hasSceneInstances"
            @click="fetchWebhookUrls"
            class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105"
          >
            Stream Deck URLs
          </button>
        </div>
      </div>

      <!-- No VDO Session Warning -->
      <div v-if="!hasVdoSession" class="text-center py-10 bg-gray-900/50 rounded-xl border border-gray-700/50">
        <div class="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="text-gray-400 text-lg mb-2">VDO.ninja Session Required</p>
        <p class="text-gray-500 text-sm">Scene management requires participants from a VDO.ninja session.</p>
      </div>

      <!-- Scene Management -->
      <div v-else>
        <!-- Create Scenes Section -->
        <div v-if="!hasSceneInstances" class="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 class="font-semibold text-gray-300 mb-4">Initialize OBS Scenes</h3>
          <p class="text-gray-400 text-sm mb-4">
            Create individual scene instances for each VDO.ninja participant. These scenes can be controlled
            via the web interface, Stream Deck webhooks, or API calls.
          </p>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">Template</label>
              <select v-model="selectedTemplate" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300">
                <option v-for="(tpl, key) in templates" :key="key" :value="key">
                  {{ tpl.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2">Theme (Optional)</label>
              <select v-model="selectedTheme" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300">
                <option :value="null">Default Theme</option>
                <option v-for="theme in themes" :key="theme._id" :value="theme._id">
                  {{ theme.name }}
                </option>
              </select>
            </div>
          </div>

          <button
            @click="createSceneInstances"
            :disabled="loading"
            class="w-full px-4 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-lg font-semibold transition disabled:opacity-50"
          >
            <span v-if="loading">Creating Scenes...</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Create Scene Instances for All Participants
            </span>
          </button>
        </div>

        <!-- Scene Instances -->
        <div v-else>
          <!-- Bulk Controls -->
          <div class="flex items-center justify-between mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
            <span class="text-gray-400 text-sm">Bulk Actions:</span>
            <div class="flex items-center gap-2">
              <button
                @click="showAllScenes"
                class="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-semibold transition"
              >
                Show All
              </button>
              <button
                @click="hideAllScenes"
                class="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-semibold transition"
              >
                Hide All
              </button>
              <button
                @click="fetchSceneInstances"
                class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-semibold transition"
              >
                Refresh
              </button>
            </div>
          </div>

          <!-- Scene Cards -->
          <div class="space-y-4">
            <div
              v-for="instance in sceneInstances"
              :key="instance._id"
              class="p-4 bg-gray-900 rounded-lg border transition-colors"
              :class="instance.state.visible ? 'border-green-600' : 'border-gray-700'"
            >
              <!-- Header -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <button
                    @click="controlScene(instance._id, 'toggle')"
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      instance.state.visible
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                    ]"
                    :title="instance.state.visible ? 'Click to hide' : 'Click to show'"
                  >
                    <svg v-if="instance.state.visible" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                    </svg>
                    <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/>
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                    </svg>
                  </button>

                  <div>
                    <span class="font-semibold text-gray-200">{{ instance.participant.name }}</span>
                    <div class="flex items-center gap-2 text-xs">
                      <span class="text-gray-500">{{ instance.participant.role }}</span>
                      <span v-if="instance.state.visible" class="text-green-400">VISIBLE</span>
                      <span v-else class="text-gray-500">HIDDEN</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Template Select -->
                  <select
                    :value="instance.state.template"
                    @change="updateSceneTemplate(instance._id, $event.target.value)"
                    class="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300"
                  >
                    <option v-for="(tpl, key) in templates" :key="key" :value="key">
                      {{ tpl.name }}
                    </option>
                  </select>

                  <!-- Theme Select -->
                  <select
                    :value="instance.theme?._id || ''"
                    @change="updateSceneTheme(instance._id, $event.target.value)"
                    class="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300"
                  >
                    <option value="">Default</option>
                    <option v-for="theme in themes" :key="theme._id" :value="theme._id">
                      {{ theme.name }}
                    </option>
                  </select>

                  <button
                    @click="deleteSceneInstance(instance._id)"
                    class="px-2 py-1 bg-red-700 hover:bg-red-600 text-red-200 rounded text-xs font-semibold transition"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <!-- URLs -->
              <div class="space-y-2 pt-3 border-t border-gray-700">
                <!-- OBS Browser Source URL -->
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 w-24 flex-shrink-0">OBS Source:</span>
                  <div class="flex-1 px-2 py-1 bg-gray-800 rounded text-xs font-mono text-blue-300 truncate">
                    {{ instance.urls?.render }}
                  </div>
                  <button
                    @click="copyToClipboard(instance.urls?.render, 'OBS URL')"
                    class="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold transition flex-shrink-0"
                  >
                    Copy
                  </button>
                  <button
                    @click="openUrl(instance.urls?.render + '?forceShow=true')"
                    class="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold transition flex-shrink-0"
                  >
                    Preview
                  </button>
                </div>

                <!-- Webhook URL -->
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 w-24 flex-shrink-0">Webhook:</span>
                  <div class="flex-1 px-2 py-1 bg-gray-800 rounded text-xs font-mono text-orange-300 truncate">
                    {{ instance.urls?.webhook }}
                  </div>
                  <button
                    @click="copyToClipboard(instance.urls?.webhook, 'Webhook URL')"
                    class="px-2 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded text-xs font-semibold transition flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Themes Section -->
      <div v-if="themes.length > 0" class="mt-6 pt-6 border-t border-gray-700">
        <h3 class="font-semibold text-gray-300 mb-3">Available Themes</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div
            v-for="theme in themes"
            :key="theme._id"
            class="p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-600 transition"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-gray-300 text-sm">{{ theme.name }}</span>
              <div class="flex items-center gap-1">
                <button
                  @click="openThemeEditor(theme)"
                  class="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200"
                  title="Edit"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button
                  @click="duplicateTheme(theme._id)"
                  class="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200"
                  title="Duplicate"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </button>
                <button
                  v-if="!theme.isDefault"
                  @click="deleteTheme(theme._id)"
                  class="p-1 hover:bg-red-900 rounded text-gray-400 hover:text-red-300"
                  title="Delete"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
            <!-- Color preview -->
            <div class="flex items-center gap-1">
              <div
                class="w-6 h-6 rounded"
                :style="{ background: theme.colors?.background || 'rgba(0,0,0,0.85)' }"
                title="Background"
              ></div>
              <div
                class="w-6 h-6 rounded"
                :style="{ background: theme.colors?.accent || '#fbbf24' }"
                title="Accent"
              ></div>
              <div
                class="w-6 h-6 rounded border border-gray-600"
                :style="{ background: theme.colors?.text || '#ffffff' }"
                title="Text"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Theme Editor Modal -->
      <div v-if="showThemeEditor" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold text-yellow-400 mb-4">
            {{ editingTheme ? 'Edit Theme' : 'Create New Theme' }}
          </h3>

          <div class="space-y-4">
            <!-- Basic Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Theme Name</label>
                <input v-model="themeForm.name" type="text"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300"
                  placeholder="My Custom Theme" />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-1">Description</label>
                <input v-model="themeForm.description" type="text"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300"
                  placeholder="Optional description" />
              </div>
            </div>

            <!-- Colors -->
            <div>
              <h4 class="font-semibold text-gray-300 mb-2">Colors</h4>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Background</label>
                  <input v-model="themeForm.colors.background" type="text"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
                    placeholder="rgba(0,0,0,0.85)" />
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Text Color</label>
                  <div class="flex gap-2">
                    <input v-model="themeForm.colors.text" type="color"
                      class="w-10 h-10 rounded cursor-pointer" />
                    <input v-model="themeForm.colors.text" type="text"
                      class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm" />
                  </div>
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Accent Color</label>
                  <div class="flex gap-2">
                    <input v-model="themeForm.colors.accent" type="color"
                      class="w-10 h-10 rounded cursor-pointer" />
                    <input v-model="themeForm.colors.accent" type="text"
                      class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Typography -->
            <div>
              <h4 class="font-semibold text-gray-300 mb-2">Typography</h4>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Font Family</label>
                  <select v-model="themeForm.typography.fontFamily"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm">
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Oswald">Oswald</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Name Size</label>
                  <input v-model="themeForm.typography.nameSize" type="text"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
                    placeholder="28px" />
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Title Size</label>
                  <input v-model="themeForm.typography.titleSize" type="text"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
                    placeholder="16px" />
                </div>
              </div>
            </div>

            <!-- Layout -->
            <div>
              <h4 class="font-semibold text-gray-300 mb-2">Layout</h4>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Position</label>
                  <select v-model="themeForm.layout.position"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm">
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-center">Top Center</option>
                    <option value="center">Center</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Padding</label>
                  <input v-model="themeForm.layout.padding" type="text"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
                    placeholder="16px 24px" />
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Border Radius</label>
                  <input v-model="themeForm.layout.borderRadius" type="text"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
                    placeholder="8px" />
                </div>
              </div>
            </div>

            <!-- Animation -->
            <div>
              <h4 class="font-semibold text-gray-300 mb-2">Animation</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Entrance Animation</label>
                  <select v-model="themeForm.animation.entrance"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm">
                    <option value="none">None</option>
                    <option value="fade">Fade</option>
                    <option value="slide-left">Slide Left</option>
                    <option value="slide-right">Slide Right</option>
                    <option value="slide-up">Slide Up</option>
                    <option value="slide-down">Slide Down</option>
                    <option value="scale">Scale</option>
                    <option value="bounce">Bounce</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Duration</label>
                  <input v-model="themeForm.animation.duration" type="text"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
                    placeholder="0.5s" />
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button @click="saveTheme"
              class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-md font-semibold transition">
              Save Theme
            </button>
            <button @click="showThemeEditor = false"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-semibold transition">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Webhook Info Modal -->
      <div v-if="showWebhookInfo" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold text-yellow-400 mb-4">Stream Deck Webhook URLs</h3>
          <p class="text-gray-400 text-sm mb-4">
            Configure these webhooks in Stream Deck to control scene visibility. Use POST requests with the specified body for each action.
          </p>

          <div class="space-y-4">
            <div v-for="webhook in webhookUrls" :key="webhook.webhookUrl" class="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <span class="font-semibold text-gray-200">{{ webhook.participantName }}</span>
                <span class="text-xs text-gray-500 uppercase">{{ webhook.role }}</span>
              </div>

              <div class="space-y-2">
                <div>
                  <span class="text-xs text-gray-500">Webhook URL:</span>
                  <div class="flex items-center gap-2 mt-1">
                    <code class="flex-1 px-2 py-1 bg-gray-800 rounded text-xs text-orange-300 truncate">
                      {{ webhook.webhookUrl }}
                    </code>
                    <button
                      @click="copyToClipboard(webhook.webhookUrl, 'Webhook URL')"
                      class="px-2 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded text-xs font-semibold transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-2 mt-3">
                  <div class="p-2 bg-gray-800 rounded">
                    <span class="block text-xs text-green-400 mb-1">SHOW</span>
                    <code class="text-xs text-gray-400">{"action":"show"}</code>
                  </div>
                  <div class="p-2 bg-gray-800 rounded">
                    <span class="block text-xs text-red-400 mb-1">HIDE</span>
                    <code class="text-xs text-gray-400">{"action":"hide"}</code>
                  </div>
                  <div class="p-2 bg-gray-800 rounded">
                    <span class="block text-xs text-blue-400 mb-1">TOGGLE</span>
                    <code class="text-xs text-gray-400">{"action":"toggle"}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button @click="showWebhookInfo = false"
            class="w-full mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-semibold transition">
            Close
          </button>
        </div>
      </div>
    </div>
  `
};
