import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

export default {
  name: 'ObsMachines',
  setup() {
    const authStore = useAuthStore();
    const machines = ref([]);
    const loading = ref(true);
    const error = ref('');
    const saving = ref(false);
    const statusMsg = ref('');
    const statusType = ref('success');

    // Register modal
    const showRegisterModal = ref(false);
    const registerForm = ref({ hostname: '', displayName: '', host: '', wsPort: 4455, wsPassword: '', wsUrl: '', tags: '' });

    // Setup segment modal
    const showSetupModal = ref(false);
    const setupMachineId = ref(null);
    const setupForm = ref({ segmentId: '', layout: '' });
    const segments = ref([]);
    const segmentLoading = ref(false);
    const layouts = ref([]);
    const setupResult = ref(null);
    const settingUp = ref(false);

    // Machine detail / status
    const expandedMachineId = ref(null);
    const machineStatus = ref(null);
    const statusLoading = ref(false);

    // Scene collections
    const sceneCollections = ref(null);

    const flash = (msg, type = 'success') => {
      statusMsg.value = msg;
      statusType.value = type;
      setTimeout(() => { statusMsg.value = ''; }, 5000);
    };

    // ─── Load ─────────────────────────────────────────
    const fetchMachines = async () => {
      try {
        loading.value = true;
        const res = await api.get('/obs-machines');
        machines.value = res.data || [];
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    };

    const fetchLayouts = async () => {
      try {
        const res = await api.get('/obs-machines/layouts');
        layouts.value = res.data || [];
      } catch (e) {
        console.error('Failed to load layouts:', e);
      }
    };

    // ─── Register ─────────────────────────────────────
    const openRegister = () => {
      registerForm.value = { hostname: '', displayName: '', host: '', wsPort: 4455, wsPassword: '', wsUrl: '', tags: '' };
      showRegisterModal.value = true;
    };

    const submitRegister = async () => {
      try {
        saving.value = true;
        const data = { ...registerForm.value };
        if (data.tags) data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
        else data.tags = [];
        await api.post('/obs-machines', data);
        flash('OBS machine registered');
        showRegisterModal.value = false;
        await fetchMachines();
      } catch (e) {
        flash(e.message, 'error');
      } finally {
        saving.value = false;
      }
    };

    // ─── Delete ───────────────────────────────────────
    const deleteMachine = async (id) => {
      if (!confirm(`Delete OBS machine "${id}"?`)) return;
      try {
        await api.delete(`/obs-machines/${id}`);
        flash('Machine removed');
        if (expandedMachineId.value === id) expandedMachineId.value = null;
        await fetchMachines();
      } catch (e) {
        flash(e.message, 'error');
      }
    };

    // ─── Test Connection ──────────────────────────────
    const testConnection = async (id) => {
      try {
        flash(`Testing connection to ${id}...`, 'info');
        const res = await api.post(`/obs-machines/${id}/test`);
        flash(`Connected! OBS ${res.data.obsVersion}, WebSocket ${res.data.obsWebSocketVersion}`);
        await fetchMachines();
      } catch (e) {
        flash(`Connection failed: ${e.message}`, 'error');
      }
    };

    // ─── Refresh Status ───────────────────────────────
    const refreshStatus = async (id) => {
      try {
        statusLoading.value = true;
        const res = await api.post(`/obs-machines/${id}/status`);
        machineStatus.value = res.data;
        await fetchMachines();
      } catch (e) {
        flash(`Status failed: ${e.message}`, 'error');
        machineStatus.value = null;
      } finally {
        statusLoading.value = false;
      }
    };

    // ─── Expand / Collapse ────────────────────────────
    const toggleExpand = async (id) => {
      if (expandedMachineId.value === id) {
        expandedMachineId.value = null;
        machineStatus.value = null;
        return;
      }
      expandedMachineId.value = id;
      machineStatus.value = null;
      sceneCollections.value = null;
      await refreshStatus(id);
    };

    // ─── Scene Collections ────────────────────────────
    const fetchSceneCollections = async (id) => {
      try {
        const res = await api.get(`/obs-machines/${id}/scene-collections`);
        sceneCollections.value = res.data;
      } catch (e) {
        flash(`Failed to load collections: ${e.message}`, 'error');
      }
    };

    const switchCollection = async (id, name) => {
      try {
        await api.post(`/obs-machines/${id}/switch-collection`, { name });
        flash(`Switched to: ${name}`);
        await refreshStatus(id);
      } catch (e) {
        flash(`Switch failed: ${e.message}`, 'error');
      }
    };

    // ─── Scene Switching ──────────────────────────────
    const switchScene = async (id, sceneName) => {
      try {
        await api.post(`/obs-machines/${id}/switch-scene`, { sceneName });
        flash(`Scene: ${sceneName}`);
      } catch (e) {
        flash(e.message, 'error');
      }
    };

    // ─── Setup Segment ────────────────────────────────
    const openSetup = async (id) => {
      setupMachineId.value = id;
      setupForm.value = { segmentId: '', layout: '' };
      setupResult.value = null;
      showSetupModal.value = true;

      // Load segments
      try {
        segmentLoading.value = true;
        const res = await api.get('/segments?limit=100&sort=-updatedAt');
        const list = res.data?.segments || res.data || [];
        segments.value = list.filter(s => s.vdoNinja?.enabled || s.slotMapping?.lastSlotId);
      } catch (e) {
        console.error('Failed to load segments:', e);
        segments.value = [];
      } finally {
        segmentLoading.value = false;
      }
    };

    const submitSetup = async () => {
      if (!setupForm.value.segmentId) {
        flash('Select a segment', 'error');
        return;
      }
      try {
        settingUp.value = true;
        const body = { segmentId: setupForm.value.segmentId };
        if (setupForm.value.layout) body.layout = setupForm.value.layout;
        const res = await api.post(`/obs-machines/${setupMachineId.value}/setup-segment`, body);
        setupResult.value = res.data;
        flash('OBS configured successfully!');
        await fetchMachines();
      } catch (e) {
        flash(`Setup failed: ${e.message}`, 'error');
      } finally {
        settingUp.value = false;
      }
    };

    // ─── Recording Control ────────────────────────────
    const startRecording = async (id) => {
      try {
        await api.post(`/obs-machines/${id}/record/start`);
        flash('Recording started');
        await refreshStatus(id);
      } catch (e) {
        flash(`Failed: ${e.message}`, 'error');
      }
    };

    const stopRecording = async (id) => {
      try {
        const res = await api.post(`/obs-machines/${id}/record/stop`);
        flash(`Recording stopped. File: ${res.data?.outputPath || 'saved'}`);
        await refreshStatus(id);
      } catch (e) {
        flash(`Failed: ${e.message}`, 'error');
      }
    };

    onMounted(() => {
      fetchMachines();
      fetchLayouts();
    });

    return {
      machines, loading, error, saving, statusMsg, statusType,
      showRegisterModal, registerForm, openRegister, submitRegister,
      deleteMachine, testConnection, refreshStatus,
      expandedMachineId, machineStatus, statusLoading, toggleExpand,
      sceneCollections, fetchSceneCollections, switchCollection, switchScene,
      showSetupModal, setupMachineId, setupForm, segments, segmentLoading,
      layouts, setupResult, settingUp, openSetup, submitSetup,
      startRecording, stopRecording
    };
  },

  template: `
<div class="max-w-7xl mx-auto px-4 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-white">OBS Machines</h1>
      <p class="text-gray-400 text-sm mt-1">Manage remote OBS Studio instances via WebSocket</p>
    </div>
    <button @click="openRegister" class="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-4 py-2 rounded-lg transition">
      + Register Machine
    </button>
  </div>

  <!-- Flash message -->
  <div v-if="statusMsg" :class="[
    'mb-4 px-4 py-3 rounded-lg text-sm font-medium',
    statusType === 'error' ? 'bg-red-900/50 text-red-300 border border-red-700' :
    statusType === 'info' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
    'bg-green-900/50 text-green-300 border border-green-700'
  ]">
    {{ statusMsg }}
  </div>

  <!-- Loading -->
  <div v-if="loading" class="text-center py-12 text-gray-400">Loading...</div>

  <!-- Empty state -->
  <div v-else-if="machines.length === 0" class="text-center py-12">
    <p class="text-gray-400 text-lg mb-4">No OBS machines registered yet</p>
    <p class="text-gray-500 text-sm mb-6">Register a Windows machine running OBS Studio to get started</p>
    <button @click="openRegister" class="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-6 py-2 rounded-lg">
      Register First Machine
    </button>
  </div>

  <!-- Machine list -->
  <div v-else class="space-y-4">
    <div v-for="m in machines" :key="m._id"
         class="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <!-- Machine header row -->
      <div class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-750"
           @click="toggleExpand(m._id)">
        <div class="flex items-center gap-3">
          <!-- Status dot -->
          <span :class="[
            'w-3 h-3 rounded-full',
            m.status === 'online' ? 'bg-green-500' :
            m.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
          ]"></span>
          <div>
            <span class="text-white font-semibold">{{ m.displayName || m._id }}</span>
            <span class="text-gray-500 text-sm ml-2">({{ m._id }})</span>
          </div>
          <span v-if="m.obsVersion" class="text-gray-500 text-xs">OBS {{ m.obsVersion }}</span>
          <span v-if="m.currentSceneCollection" class="text-gray-500 text-xs ml-2">
            Collection: {{ m.currentSceneCollection }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span v-for="tag in (m.tags || [])" :key="tag"
                class="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">{{ tag }}</span>
          <span class="text-gray-500 text-xs">{{ m.host }}:{{ m.wsPort }}</span>
          <svg :class="['w-5 h-5 text-gray-500 transition-transform', expandedMachineId === m._id ? 'rotate-180' : '']"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>

      <!-- Expanded detail -->
      <div v-if="expandedMachineId === m._id" class="border-t border-gray-700 px-4 py-4">
        <!-- Action buttons -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button @click.stop="testConnection(m._id)"
                  class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition">
            Test Connection
          </button>
          <button @click.stop="refreshStatus(m._id)"
                  class="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition">
            Refresh Status
          </button>
          <button @click.stop="openSetup(m._id)"
                  class="px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded transition">
            Setup Segment
          </button>
          <button @click.stop="fetchSceneCollections(m._id)"
                  class="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition">
            Scene Collections
          </button>
          <button @click.stop="deleteMachine(m._id)"
                  class="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition ml-auto">
            Delete
          </button>
        </div>

        <!-- Status info -->
        <div v-if="statusLoading" class="text-gray-400 text-sm py-4">Loading status...</div>
        <div v-else-if="machineStatus" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="bg-gray-900 rounded p-3">
            <h4 class="text-gray-400 text-xs font-semibold uppercase mb-2">OBS Info</h4>
            <div class="text-sm text-gray-300 space-y-1">
              <div>Version: <span class="text-white">{{ machineStatus.obsVersion }}</span></div>
              <div>WebSocket: <span class="text-white">{{ machineStatus.obsWebSocketVersion }}</span></div>
              <div>Platform: <span class="text-white">{{ machineStatus.platform }}</span></div>
              <div>Current Scene: <span class="text-yellow-400">{{ machineStatus.currentScene }}</span></div>
              <div>Collection: <span class="text-white">{{ machineStatus.currentSceneCollection }}</span></div>
              <div>Profile: <span class="text-white">{{ machineStatus.currentProfile }}</span></div>
            </div>
          </div>

          <div class="bg-gray-900 rounded p-3">
            <h4 class="text-gray-400 text-xs font-semibold uppercase mb-2">Recording</h4>
            <div v-if="machineStatus.recording" class="text-sm space-y-2">
              <div class="flex items-center gap-2">
                <span :class="machineStatus.recording.active ? 'text-red-400' : 'text-gray-400'">
                  {{ machineStatus.recording.active ? 'RECORDING' : 'Stopped' }}
                </span>
                <span v-if="machineStatus.recording.paused" class="text-yellow-400">(Paused)</span>
              </div>
              <div v-if="machineStatus.recording.duration" class="text-gray-300">
                Duration: {{ machineStatus.recording.duration }}
              </div>
              <div class="flex gap-2 mt-2">
                <button v-if="!machineStatus.recording.active"
                        @click="startRecording(m._id)"
                        class="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded">
                  Start Recording
                </button>
                <button v-else
                        @click="stopRecording(m._id)"
                        class="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded">
                  Stop Recording
                </button>
              </div>
            </div>
            <div v-else class="text-sm text-gray-400">
              <p>Recording status unavailable</p>
              <button @click="startRecording(m._id)"
                      class="mt-2 px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded">
                Start Recording
              </button>
            </div>
          </div>

          <!-- Scenes in current collection -->
          <div class="bg-gray-900 rounded p-3 md:col-span-2">
            <h4 class="text-gray-400 text-xs font-semibold uppercase mb-2">Scenes</h4>
            <div class="flex flex-wrap gap-2">
              <button v-for="scene in machineStatus.scenes" :key="scene"
                      @click="switchScene(m._id, scene)"
                      :class="[
                        'px-3 py-1 text-sm rounded transition',
                        scene === machineStatus.currentScene
                          ? 'bg-yellow-500 text-gray-900 font-semibold'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      ]">
                {{ scene }}
              </button>
              <span v-if="!machineStatus.scenes?.length" class="text-gray-500 text-sm">No scenes</span>
            </div>
          </div>
        </div>

        <!-- Scene Collections list -->
        <div v-if="sceneCollections" class="bg-gray-900 rounded p-3 mb-4">
          <h4 class="text-gray-400 text-xs font-semibold uppercase mb-2">Scene Collections</h4>
          <div class="flex flex-wrap gap-2">
            <button v-for="col in sceneCollections.collections" :key="col"
                    @click="switchCollection(m._id, col)"
                    :class="[
                      'px-3 py-1.5 text-sm rounded transition',
                      col === sceneCollections.current
                        ? 'bg-yellow-500 text-gray-900 font-semibold'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    ]">
              {{ col }}
            </button>
          </div>
        </div>

        <!-- Machine details -->
        <div class="text-xs text-gray-500 mt-2">
          <span v-if="m.lastConnected">Last connected: {{ new Date(m.lastConnected).toLocaleString() }}</span>
          <span v-if="m.lastError" class="text-red-400 ml-4">Error: {{ m.lastError }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Register Modal -->
  <div v-if="showRegisterModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showRegisterModal = false">
    <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
      <h2 class="text-lg font-bold text-white mb-4">Register OBS Machine</h2>
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Hostname (ID) *</label>
          <input v-model="registerForm.hostname" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                 placeholder="e.g. b2emo-pc">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Display Name</label>
          <input v-model="registerForm.displayName" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                 placeholder="e.g. Studio A Recording PC">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Host / IP *</label>
          <input v-model="registerForm.host" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                 placeholder="e.g. 192.168.1.100 or b2emo-pc">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">WebSocket Port</label>
            <input v-model.number="registerForm.wsPort" type="number" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">WebSocket Password</label>
            <input v-model="registerForm.wsPassword" type="password" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                   placeholder="From OBS settings">
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">WebSocket URL Override</label>
          <input v-model="registerForm.wsUrl" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                 placeholder="e.g. wss://obs-socket.veteransscene.org">
          <p class="text-gray-500 text-xs mt-1">If set, overrides Host/Port for connection (use for reverse proxies)</p>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
          <input v-model="registerForm.tags" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                 placeholder="e.g. studio-a, main">
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <button @click="showRegisterModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
        <button @click="submitRegister" :disabled="saving"
                class="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded transition disabled:opacity-50">
          {{ saving ? 'Registering...' : 'Register' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Setup Segment Modal -->
  <div v-if="showSetupModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showSetupModal = false">
    <div class="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-700">
      <h2 class="text-lg font-bold text-white mb-4">Setup OBS for Segment</h2>
      <p class="text-gray-400 text-sm mb-4">
        Creates a new OBS scene collection with Browser Sources for each participant's video feed.
      </p>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Segment *</label>
          <select v-model="setupForm.segmentId" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm">
            <option value="">Select a segment...</option>
            <option v-for="s in segments" :key="s._id" :value="s._id">
              {{ s.title }} ({{ s.vdoNinja?.participants?.length || 0 }} participants)
            </option>
          </select>
          <p v-if="segmentLoading" class="text-gray-500 text-xs mt-1">Loading segments...</p>
          <p v-else-if="segments.length === 0" class="text-gray-500 text-xs mt-1">No segments with VDO.ninja or recording slots found</p>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">Layout Template (optional)</label>
          <select v-model="setupForm.layout" class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm">
            <option value="">Auto (all compatible layouts)</option>
            <option v-for="l in layouts" :key="l.key" :value="l.key">
              {{ l.label }} (up to {{ l.maxParticipants }})
            </option>
          </select>
          <p class="text-gray-500 text-xs mt-1">Leave blank to auto-generate scenes for all compatible layouts</p>
        </div>
      </div>

      <!-- Setup result -->
      <div v-if="setupResult" class="mt-4 bg-green-900/30 border border-green-700 rounded p-3">
        <h4 class="text-green-400 text-sm font-semibold mb-2">Setup Complete</h4>
        <div class="text-sm text-gray-300 space-y-1">
          <div>Collection: <span class="text-white">{{ setupResult.collectionName }}</span></div>
          <div>Participants: <span class="text-white">{{ setupResult.participantCount }}</span></div>
          <div class="mt-2">
            <span class="text-gray-400">Created scenes:</span>
            <ul class="ml-4 mt-1 space-y-1">
              <li v-for="scene in setupResult.scenes" :key="scene.sceneName || scene.layout"
                  :class="scene.error ? 'text-red-400' : 'text-green-300'">
                {{ scene.error ? scene.layout + ': ' + scene.error : scene.sceneName + ' (' + (scene.sources?.length || 0) + ' sources)' }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button @click="showSetupModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Close</button>
        <button @click="submitSetup" :disabled="settingUp || !setupForm.segmentId"
                class="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded transition disabled:opacity-50">
          {{ settingUp ? 'Setting up OBS...' : 'Setup OBS' }}
        </button>
      </div>
    </div>
  </div>
</div>
`
};
