import { ref, computed, onMounted } from 'vue';

export default {
  name: 'StorageManager',
  setup() {
    const loading = ref(true);
    const error = ref(null);
    const successMsg = ref(null);
    const config = ref(null);
    const diskStatuses = ref([]);
    const totals = ref({ total: 0, used: 0, available: 0, percentUsed: 0 });

    // Add disk form
    const showAddForm = ref(false);
    const addForm = ref({
      label: '',
      type: 'local',
      purpose: ['all'],
      // Local
      path: '',
      maxUsagePercent: 90,
      reservedBytes: 1073741824,
      // S3
      s3Config: { bucket: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '', endpoint: '', prefix: '' },
      // FTP/SFTP
      ftpConfig: { protocol: 'sftp', host: '', port: 22, username: '', password: '', privateKeyPath: '', secure: false, basePath: '/' },
      // Recording Agent (and agent-path)
      agentConfig: { host: '', port: 3100, secret: '', useSSL: false, agentPath: '' }
    });

    // Registered agents (phone-home agents)
    const registeredAgents = ref([]);
    const loadingAgents = ref(false);
    const selectedAgentId = ref(null);
    const showManualAgentEntry = ref(false);

    // Manual agent registration
    const showRegisterAgentForm = ref(false);
    const registerAgentForm = ref({ host: '', port: 3100, secret: '', useSSL: false, displayName: '' });
    const registeringAgent = ref(false);
    const registerAgentError = ref(null);

    // Agent disk discovery
    const discoveringAgentDisks = ref(false);
    const discoveredAgentDisks = ref([]);
    const agentDiscoveryError = ref(null);

    // Unmounted block devices on agent
    const unmountedDevices = ref([]);
    const mountingDevice = ref(null);

    // Local drive discovery
    const localDrives = ref([]);
    const loadingLocalDrives = ref(false);
    const localDriveError = ref(null);

    // Testing
    const testingDiskId = ref(null);
    const testResult = ref(null);

    // Settings form
    const settingsForm = ref({ warningThresholdPercent: 85, criticalThresholdPercent: 95 });

    const formatBytes = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      if (bytes === Infinity) return 'Unlimited';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const typeBadge = (type) => {
      const badges = {
        'local': { label: 'Local', color: 'bg-green-500/20 text-green-400' },
        's3': { label: 'S3', color: 'bg-blue-500/20 text-blue-400' },
        'sftp': { label: 'SFTP', color: 'bg-purple-500/20 text-purple-400' },
        'ftp': { label: 'FTP', color: 'bg-orange-500/20 text-orange-400' },
        'recording-agent': { label: 'Agent', color: 'bg-red-500/20 text-red-400' },
        'agent-path': { label: 'Agent Drive', color: 'bg-orange-500/20 text-orange-300' }
      };
      return badges[type] || badges['local'];
    };

    const diskSummary = (disk) => {
      const type = disk.type || 'local';
      if (type === 'local') return disk.path || '';
      if (type === 's3') return `s3://${disk.bucket || ''}${disk.prefix ? '/' + disk.prefix : ''}`;
      if (type === 'sftp' || type === 'ftp') return `${disk.host || ''}:${disk.port || 22}${disk.basePath || ''}`;
      if (type === 'recording-agent') return `${disk.host || ''}:${disk.port || 3100}`;
      if (type === 'agent-path') return `${disk.host || ''}:${disk.port || 3100}${disk.agentPath || ''}`;
      return '';
    };

    const isAgentType = computed(() => {
      return addForm.value.type === 'recording-agent' || addForm.value.type === 'agent-path';
    });

    const isAgentPathType = computed(() => addForm.value.type === 'agent-path');

    const resetAddForm = () => {
      addForm.value = {
        label: '',
        type: 'local',
        purpose: ['all'],
        path: '',
        maxUsagePercent: 90,
        reservedBytes: 1073741824,
        s3Config: { bucket: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '', endpoint: '', prefix: '' },
        ftpConfig: { protocol: 'sftp', host: '', port: 22, username: '', password: '', privateKeyPath: '', secure: false, basePath: '/' },
        agentConfig: { host: '', port: 3100, secret: '', useSSL: false, agentPath: '' }
      };
      selectedAgentId.value = null;
      showManualAgentEntry.value = false;
      discoveredAgentDisks.value = [];
      agentDiscoveryError.value = null;
    };

    const onTypeChange = () => {
      const t = addForm.value.type;
      if (t === 'ftp') {
        addForm.value.ftpConfig.protocol = 'ftp';
        addForm.value.ftpConfig.port = 21;
      } else if (t === 'sftp') {
        addForm.value.ftpConfig.protocol = 'sftp';
        addForm.value.ftpConfig.port = 22;
      }
      // Load registered agents when switching to an agent type
      if (t === 'recording-agent' || t === 'agent-path') {
        selectedAgentId.value = null;
        showManualAgentEntry.value = false;
        discoveredAgentDisks.value = [];
        agentDiscoveryError.value = null;
        loadRegisteredAgents();
      }
    };

    const canAddDisk = computed(() => {
      const f = addForm.value;
      if (!f.label) return false;
      if (f.type === 'local') return !!f.path;
      if (f.type === 's3') return !!(f.s3Config.bucket && f.s3Config.accessKeyId && f.s3Config.secretAccessKey);
      if (f.type === 'sftp' || f.type === 'ftp') return !!(f.ftpConfig.host && f.ftpConfig.username);
      if (f.type === 'recording-agent') return !!f.agentConfig.host;
      if (f.type === 'agent-path') return !!(f.agentConfig.host && f.agentConfig.agentPath);
      return false;
    });

    // Load registered agents from the registry
    const loadRegisteredAgents = async () => {
      loadingAgents.value = true;
      try {
        const res = await window.api.getRegisteredAgents();
        if (res.success) {
          registeredAgents.value = res.data.agents || [];
        }
      } catch (err) {
        console.warn('Could not load registered agents:', err.message);
        registeredAgents.value = [];
      } finally {
        loadingAgents.value = false;
      }
    };

    // Select a registered agent — fills in connection details and auto-discovers drives
    const selectAgent = async (agent) => {
      selectedAgentId.value = agent.id;
      addForm.value.agentConfig.host = agent.host;
      addForm.value.agentConfig.port = agent.port;
      addForm.value.agentConfig.secret = agent.secret || '';
      addForm.value.agentConfig.useSSL = agent.useSSL || false;

      if (!addForm.value.label) {
        addForm.value.label = agent.displayName || agent.id;
      }

      // For agent-path type, auto-discover drives from the selected agent
      if (addForm.value.type === 'agent-path') {
        await discoverAgentDrives();
      }
    };

    // Discover drives from the currently configured agent
    const discoverAgentDrives = async () => {
      discoveringAgentDisks.value = true;
      agentDiscoveryError.value = null;
      discoveredAgentDisks.value = [];
      unmountedDevices.value = [];

      try {
        let res;
        if (selectedAgentId.value) {
          res = await window.api.getAgentDrives(selectedAgentId.value);
        } else if (addForm.value.agentConfig.host) {
          const cfg = addForm.value.agentConfig;
          res = await window.api.getAgentDisks({ host: cfg.host, port: cfg.port, secret: cfg.secret, useSSL: cfg.useSSL });
        } else {
          agentDiscoveryError.value = 'Select an agent or enter the host manually first';
          return;
        }

        if (res.success && res.data?.disks) {
          discoveredAgentDisks.value = res.data.disks;
          if (!res.data.agentOnline) {
            agentDiscoveryError.value = 'Agent is offline or unreachable';
          } else if (res.data.disks.length === 0) {
            agentDiscoveryError.value = 'Agent reported no mounted filesystems';
          }
        } else {
          agentDiscoveryError.value = 'Could not get drive list from agent';
        }

        // Also fetch block devices to find unmounted external drives
        if (selectedAgentId.value) {
          try {
            const blkRes = await window.api.getAgentBlockDevices(selectedAgentId.value);
            if (blkRes.success && blkRes.data?.devices) {
              unmountedDevices.value = blkRes.data.devices.filter(d => !d.mounted && d.fstype);
            }
          } catch (blkErr) {
            console.warn('Could not fetch block devices:', blkErr.message);
          }
        }
      } catch (err) {
        agentDiscoveryError.value = err.message || 'Failed to contact agent';
      } finally {
        discoveringAgentDisks.value = false;
      }
    };

    // Mount an unmounted device on the agent
    const mountAgentDevice = async (device) => {
      if (!selectedAgentId.value) return;
      mountingDevice.value = device.name;
      try {
        const res = await window.api.mountAgentDevice(selectedAgentId.value, device.name);
        if (res.success) {
          // Refresh the drive list to show the newly mounted drive
          await discoverAgentDrives();
        }
      } catch (err) {
        agentDiscoveryError.value = `Mount failed: ${err.message}`;
      } finally {
        mountingDevice.value = null;
      }
    };

    // Select a discovered drive as the target path
    const selectDiscoveredDrive = (drive) => {
      addForm.value.agentConfig.agentPath = drive.path;
      if (!addForm.value.label || addForm.value.label === (selectedAgentId.value || '')) {
        const agent = registeredAgents.value.find(a => a.id === selectedAgentId.value);
        const agentName = agent?.displayName || agent?.id || addForm.value.agentConfig.host || '';
        const driveLabel = drive.isRemovable ? 'USB Drive' : drive.label || drive.path;
        addForm.value.label = agentName ? `${agentName} — ${driveLabel}` : driveLabel;
      }
    };

    // Register an agent manually
    const registerAgent = async () => {
      registeringAgent.value = true;
      registerAgentError.value = null;
      try {
        const f = registerAgentForm.value;
        const res = await window.api.registerAgent({
          host: f.host,
          port: f.port || 3100,
          secret: f.secret,
          useSSL: f.useSSL,
          displayName: f.displayName || f.host
        });
        if (res.success) {
          showRegisterAgentForm.value = false;
          registerAgentForm.value = { host: '', port: 3100, secret: '', useSSL: false, displayName: '' };
          await loadRegisteredAgents();
          // Auto-select the newly registered agent
          const newAgent = registeredAgents.value.find(a => a.id === res.data.agentId);
          if (newAgent) selectAgent(newAgent);
        }
      } catch (err) {
        registerAgentError.value = err.message || 'Failed to register agent';
      } finally {
        registeringAgent.value = false;
      }
    };

    // Scan local drives on the main server
    const scanLocalDrives = async () => {
      loadingLocalDrives.value = true;
      localDriveError.value = null;
      localDrives.value = [];
      try {
        const res = await window.api.getLocalDrives();
        if (res.success && res.data?.drives) {
          localDrives.value = res.data.drives;
          if (res.data.drives.length === 0) {
            localDriveError.value = 'No usable drives found';
          }
        }
      } catch (err) {
        localDriveError.value = err.message || 'Failed to scan drives';
      } finally {
        loadingLocalDrives.value = false;
      }
    };

    const selectLocalDrive = (drive) => {
      addForm.value.path = drive.mountPoint;
      if (!addForm.value.label) {
        addForm.value.label = drive.isRemovable ? `USB Drive (${drive.mountPoint})` : drive.label || drive.mountPoint;
      }
    };

    const timeSince = (date) => {
      if (!date) return 'never';
      const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
      if (secs < 60) return 'just now';
      if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
      if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
      return `${Math.floor(secs / 86400)}d ago`;
    };

    const formatDiscoveredBytes = (bytes) => {
      if (!bytes) return '';
      const gb = bytes / 1024 / 1024 / 1024;
      if (gb >= 1) return gb.toFixed(1) + ' GB';
      const mb = bytes / 1024 / 1024;
      return mb.toFixed(0) + ' MB';
    };

    const loadData = async () => {
      try {
        loading.value = true;
        error.value = null;

        const [statusRes, configRes] = await Promise.all([
          window.api.getFullDiskStatus(),
          window.api.getStorageDiskConfig()
        ]);

        if (statusRes.success) {
          diskStatuses.value = statusRes.data.disks;
          totals.value = statusRes.data.totals;
        }

        if (configRes.success) {
          config.value = configRes.data;
          settingsForm.value.warningThresholdPercent = configRes.data.warningThresholdPercent;
          settingsForm.value.criticalThresholdPercent = configRes.data.criticalThresholdPercent;
        }
      } catch (err) {
        error.value = err.message || 'Failed to load storage data';
      } finally {
        loading.value = false;
      }
    };

    const addDisk = async () => {
      try {
        error.value = null;
        const f = addForm.value;

        const payload = {
          label: f.label,
          type: f.type,
          purpose: f.purpose
        };

        if (f.type === 'local') {
          payload.path = f.path;
          payload.maxUsagePercent = f.maxUsagePercent;
          payload.reservedBytes = f.reservedBytes;
        } else if (f.type === 's3') {
          payload.s3Config = { ...f.s3Config };
        } else if (f.type === 'sftp' || f.type === 'ftp') {
          payload.ftpConfig = { ...f.ftpConfig };
        } else if (f.type === 'recording-agent' || f.type === 'agent-path') {
          payload.agentConfig = { ...f.agentConfig };
        }

        const res = await window.api.addStorageDisk(payload);
        if (res.success) {
          successMsg.value = 'Storage location added successfully';
          showAddForm.value = false;
          resetAddForm();
          await loadData();
          setTimeout(() => { successMsg.value = null; }, 3000);
        }
      } catch (err) {
        error.value = err.message || 'Failed to add storage location';
      }
    };

    const removeDisk = async (diskId, label) => {
      if (!confirm(`Remove "${label}"? This only removes the config, not the files.`)) return;
      try {
        error.value = null;
        const res = await window.api.removeStorageDisk(diskId);
        if (res.success) {
          successMsg.value = 'Storage location removed';
          await loadData();
          setTimeout(() => { successMsg.value = null; }, 3000);
        }
      } catch (err) {
        error.value = err.message || 'Failed to remove storage location';
      }
    };

    const testDiskAction = async (diskId) => {
      try {
        testingDiskId.value = diskId;
        testResult.value = null;
        const res = await window.api.testStorageDisk(diskId);
        if (res.success) {
          testResult.value = res.data;
        }
      } catch (err) {
        testResult.value = { diskId, success: false, message: err.message || 'Test failed' };
      } finally {
        testingDiskId.value = null;
      }
    };

    const moveDisk = async (diskId, direction) => {
      const disks = config.value.disks.slice().sort((a, b) => a.priority - b.priority);
      const idx = disks.findIndex(d => d.id === diskId);
      if (idx < 0) return;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= disks.length) return;

      [disks[idx], disks[newIdx]] = [disks[newIdx], disks[idx]];
      const order = disks.map(d => d.id);

      try {
        error.value = null;
        const res = await window.api.reorderStorageDisks(order);
        if (res.success) await loadData();
      } catch (err) {
        error.value = err.message || 'Failed to reorder';
      }
    };

    const saveSettings = async () => {
      try {
        error.value = null;
        const res = await window.api.updateStorageDiskConfig(settingsForm.value);
        if (res.success) {
          successMsg.value = 'Settings saved';
          await loadData();
          setTimeout(() => { successMsg.value = null; }, 3000);
        }
      } catch (err) {
        error.value = err.message || 'Failed to save settings';
      }
    };

    onMounted(loadData);

    return {
      loading, error, successMsg, config, diskStatuses, totals,
      showAddForm, addForm, testingDiskId, testResult, settingsForm,
      registeredAgents, loadingAgents, selectedAgentId, showManualAgentEntry,
      discoveringAgentDisks, discoveredAgentDisks, agentDiscoveryError,
      isAgentType, isAgentPathType,
      showRegisterAgentForm, registerAgentForm, registeringAgent, registerAgentError,
      localDrives, loadingLocalDrives, localDriveError,
      formatBytes, typeBadge, diskSummary, canAddDisk, onTypeChange,
      loadData, addDisk, removeDisk, resetAddForm,
      testDiskAction, moveDisk, saveSettings,
      loadRegisteredAgents, selectAgent, discoverAgentDrives, selectDiscoveredDrive,
      registerAgent, scanLocalDrives, selectLocalDrive,
      unmountedDevices, mountingDevice, mountAgentDevice,
      timeSince, formatDiscoveredBytes
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 p-4 md:p-6">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-yellow-400">Storage Manager</h1>
            <p class="text-gray-400 text-sm mt-1">Manage storage locations and monitor capacity</p>
          </div>
          <div class="flex gap-2">
            <button @click="loadData" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition">
              Refresh
            </button>
            <button @click="showAddForm = !showAddForm" class="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold transition">
              + Add Location
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="error" class="bg-red-600/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4">{{ error }}</div>
        <div v-if="successMsg" class="bg-green-600/20 border border-green-500 text-green-300 px-4 py-3 rounded-lg mb-4">{{ successMsg }}</div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-20">
          <div class="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-gray-400">Loading storage data...</p>
        </div>

        <template v-if="!loading">
          <!-- Aggregate Overview (local disks only) -->
          <div v-if="totals.total > 0" class="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h2 class="text-lg font-semibold text-white mb-3">Local Storage Total</h2>
            <div class="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p class="text-gray-400 text-sm">Total Capacity</p>
                <p class="text-white text-xl font-bold">{{ formatBytes(totals.total) }}</p>
              </div>
              <div>
                <p class="text-gray-400 text-sm">Used</p>
                <p class="text-white text-xl font-bold">{{ formatBytes(totals.used) }}</p>
              </div>
              <div>
                <p class="text-gray-400 text-sm">Available</p>
                <p class="text-xl font-bold" :class="totals.percentUsed >= 95 ? 'text-red-400' : totals.percentUsed >= 85 ? 'text-yellow-400' : 'text-green-400'">
                  {{ formatBytes(totals.available) }}
                </p>
              </div>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-4">
              <div class="h-4 rounded-full transition-all duration-500"
                :class="totals.percentUsed >= 95 ? 'bg-red-500' : totals.percentUsed >= 85 ? 'bg-yellow-500' : 'bg-green-500'"
                :style="{ width: totals.percentUsed + '%' }">
              </div>
            </div>
            <p class="text-gray-400 text-sm mt-1 text-right">{{ totals.percentUsed }}% used</p>
          </div>

          <!-- ─── Add Location Form ─────────────────────────────────────────── -->
          <div v-if="showAddForm" class="bg-gray-800 rounded-lg p-6 mb-6 border border-yellow-500/30">
            <h3 class="text-lg font-semibold text-yellow-400 mb-4">Add Storage Location</h3>

            <!-- Type + Label + Purpose row -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-gray-300 text-sm mb-1">Type</label>
                <select v-model="addForm.type" @change="onTypeChange"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none">
                  <option value="local">Local Disk</option>
                  <option value="s3">Amazon S3</option>
                  <option value="sftp">SFTP</option>
                  <option value="ftp">FTP</option>
                  <option value="recording-agent">Recording Agent (whole agent)</option>
                  <option value="agent-path">Agent Drive (specific path on agent)</option>
                </select>
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Label</label>
                <input v-model="addForm.label" type="text" placeholder="e.g. bb9e — USB Drive"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Purpose</label>
                <select v-model="addForm.purpose" multiple
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none">
                  <option value="all">All</option>
                  <option value="recordings">Recordings</option>
                  <option value="dropbox">Dropbox</option>
                </select>
              </div>
            </div>

            <!-- LOCAL fields -->
            <div v-if="addForm.type === 'local'" class="mb-4">
              <!-- Drive picker -->
              <div class="bg-gray-700/30 rounded-lg p-3 mb-3 border border-gray-600">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-300 font-medium">
                    {{ localDrives.length > 0 ? 'Select a drive' : 'Detect local drives' }}
                  </span>
                  <button @click="scanLocalDrives" :disabled="loadingLocalDrives"
                    class="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded text-xs transition font-medium">
                    {{ loadingLocalDrives ? 'Scanning...' : localDrives.length > 0 ? '&#x21bb; Rescan' : 'Scan Drives' }}
                  </button>
                </div>

                <p v-if="localDriveError" class="text-xs text-red-400 mb-2">{{ localDriveError }}</p>

                <div v-if="localDrives.length > 0" class="space-y-1.5">
                  <div v-for="drive in localDrives" :key="drive.mountPoint"
                    @click="selectLocalDrive(drive)"
                    class="flex items-center justify-between p-2 rounded cursor-pointer transition border"
                    :class="addForm.path === drive.mountPoint
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-white'
                      : 'bg-gray-800 border-gray-600 hover:border-yellow-500/40 text-gray-300'">
                    <div class="flex items-center gap-2 min-w-0">
                      <span v-if="drive.isRemovable"
                        class="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">USB</span>
                      <span v-else class="text-gray-500 text-xs shrink-0 font-mono">HDD</span>
                      <span class="font-mono text-xs truncate">{{ drive.mountPoint }}</span>
                      <span v-if="drive.label && drive.label !== drive.mountPoint" class="text-gray-500 text-xs">({{ drive.label }})</span>
                    </div>
                    <div class="text-xs shrink-0 ml-2">
                      <span :class="drive.percentUsed >= 90 ? 'text-red-400' : drive.percentUsed >= 75 ? 'text-yellow-400' : 'text-green-400'">
                        {{ formatDiscoveredBytes(drive.available) }} free
                      </span>
                      <span class="text-gray-600"> / {{ formatDiscoveredBytes(drive.total) }}</span>
                    </div>
                  </div>
                </div>

                <p v-else-if="!loadingLocalDrives && !localDriveError" class="text-xs text-gray-500">
                  Click Scan Drives to detect mounted filesystems on this server.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-300 text-sm mb-1">Path <span class="text-gray-500 font-normal">(auto-filled above, or enter manually)</span></label>
                  <input v-model="addForm.path" type="text" placeholder="/mnt/storage"
                    class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none font-mono text-sm" />
                </div>
                <div>
                  <label class="block text-gray-300 text-sm mb-1">Max Usage %</label>
                  <input v-model.number="addForm.maxUsagePercent" type="number" min="50" max="99"
                    class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
                </div>
              </div>
            </div>

            <!-- S3 fields -->
            <div v-if="addForm.type === 's3'" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-gray-300 text-sm mb-1">Bucket</label>
                <input v-model="addForm.s3Config.bucket" type="text" placeholder="my-bucket"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Region</label>
                <input v-model="addForm.s3Config.region" type="text" placeholder="us-east-1"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Access Key ID</label>
                <input v-model="addForm.s3Config.accessKeyId" type="text" placeholder="AKIAIOSFODNN7EXAMPLE"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Secret Access Key</label>
                <input v-model="addForm.s3Config.secretAccessKey" type="password" placeholder="Secret key"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Endpoint <span class="text-gray-500">(optional, for MinIO etc.)</span></label>
                <input v-model="addForm.s3Config.endpoint" type="text" placeholder="https://minio.example.com"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Key Prefix <span class="text-gray-500">(optional)</span></label>
                <input v-model="addForm.s3Config.prefix" type="text" placeholder="uploads/"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
            </div>

            <!-- SFTP/FTP fields -->
            <div v-if="addForm.type === 'sftp' || addForm.type === 'ftp'" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-gray-300 text-sm mb-1">Host</label>
                <input v-model="addForm.ftpConfig.host" type="text" placeholder="sftp.example.com"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Port</label>
                <input v-model.number="addForm.ftpConfig.port" type="number"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Username</label>
                <input v-model="addForm.ftpConfig.username" type="text" placeholder="user"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Password</label>
                <input v-model="addForm.ftpConfig.password" type="password" placeholder="Password"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div v-if="addForm.type === 'sftp'">
                <label class="block text-gray-300 text-sm mb-1">Private Key Path <span class="text-gray-500">(optional)</span></label>
                <input v-model="addForm.ftpConfig.privateKeyPath" type="text" placeholder="/home/user/.ssh/id_rsa"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
              <div v-if="addForm.type === 'ftp'" class="flex items-center gap-2 pt-6">
                <input v-model="addForm.ftpConfig.secure" type="checkbox" id="ftp-secure" class="accent-yellow-400" />
                <label for="ftp-secure" class="text-gray-300 text-sm">Use TLS (FTPS)</label>
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Base Path</label>
                <input v-model="addForm.ftpConfig.basePath" type="text" placeholder="/"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
              </div>
            </div>

            <!-- ── RECORDING AGENT / AGENT-PATH ─────────────────────────── -->
            <div v-if="isAgentType" class="mb-4">
              <p class="text-xs text-gray-400 mb-3">
                <template v-if="isAgentPathType">
                  Routes recordings to a <strong class="text-gray-200">specific drive on a Recording Agent</strong> (e.g. a USB drive or local SSD).
                  When set as a segment's primary storage, new recordings save directly to that path.
                </template>
                <template v-else>
                  Links to a <strong class="text-gray-200">Recording Agent machine</strong> — recordings stay on the agent's default storage location.
                </template>
              </p>

              <!-- ── Registered agent picker ── -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-200">Select an agent</span>
                  <div class="flex items-center gap-3">
                    <button @click="loadRegisteredAgents" :disabled="loadingAgents"
                      class="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition">
                      {{ loadingAgents ? 'Loading...' : '&#x21bb; Refresh' }}
                    </button>
                    <button @click="showRegisterAgentForm = !showRegisterAgentForm"
                      class="text-xs text-yellow-400 hover:text-yellow-300 transition">
                      {{ showRegisterAgentForm ? 'Hide' : '+ Register' }}
                    </button>
                    <button @click="showManualAgentEntry = !showManualAgentEntry"
                      class="text-xs text-gray-400 hover:text-gray-300 transition">
                      {{ showManualAgentEntry ? 'Hide manual entry' : 'Enter manually' }}
                    </button>
                  </div>
                </div>

                <!-- Loading state -->
                <div v-if="loadingAgents" class="py-6 text-center text-gray-500 text-sm">
                  <div class="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Discovering agents...
                </div>

                <!-- No agents registered yet -->
                <div v-else-if="registeredAgents.length === 0 && !showManualAgentEntry && !showRegisterAgentForm"
                  class="bg-gray-700/30 border border-gray-600 border-dashed rounded-lg p-4 text-center">
                  <p class="text-gray-400 text-sm mb-1">No agents have registered yet.</p>
                  <p class="text-gray-500 text-xs mb-3">
                    Once a Recording Agent starts up with <code class="text-yellow-300">HOME_BASE_URL</code> configured,
                    it will appear here automatically.
                  </p>
                  <button @click="showRegisterAgentForm = true"
                    class="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded text-xs font-semibold transition">
                    Register Agent
                  </button>
                </div>

                <!-- Manual agent registration form -->
                <div v-if="showRegisterAgentForm" class="bg-gray-700/30 rounded-lg p-3 mb-3 border border-yellow-500/30">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-medium text-yellow-400">Register Agent</span>
                    <button @click="showRegisterAgentForm = false" class="text-gray-400 hover:text-gray-300 text-xs">Cancel</button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label class="block text-gray-300 text-xs mb-1">Agent Host / IP *</label>
                      <input v-model="registerAgentForm.host" type="text" placeholder="bb9e or 192.168.1.50"
                        class="w-full bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:border-yellow-400 focus:outline-none text-sm" />
                    </div>
                    <div>
                      <label class="block text-gray-300 text-xs mb-1">Port</label>
                      <input v-model.number="registerAgentForm.port" type="number" placeholder="3100"
                        class="w-full bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:border-yellow-400 focus:outline-none text-sm" />
                    </div>
                    <div>
                      <label class="block text-gray-300 text-xs mb-1">API Secret</label>
                      <input v-model="registerAgentForm.secret" type="password" placeholder="x-api-secret value"
                        class="w-full bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:border-yellow-400 focus:outline-none text-sm" />
                    </div>
                    <div>
                      <label class="block text-gray-300 text-xs mb-1">Display Name</label>
                      <input v-model="registerAgentForm.displayName" type="text" placeholder="e.g. Studio PC"
                        class="w-full bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:border-yellow-400 focus:outline-none text-sm" />
                    </div>
                  </div>
                  <div class="flex items-center gap-3 mb-3">
                    <input v-model="registerAgentForm.useSSL" type="checkbox" id="reg-agent-ssl" class="accent-yellow-400" />
                    <label for="reg-agent-ssl" class="text-gray-300 text-sm">Use HTTPS</label>
                  </div>
                  <p v-if="registerAgentError" class="text-xs text-red-400 mb-2">{{ registerAgentError }}</p>
                  <button @click="registerAgent" :disabled="!registerAgentForm.host || registeringAgent"
                    class="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-gray-900 rounded text-xs font-semibold transition">
                    {{ registeringAgent ? 'Registering...' : 'Register' }}
                  </button>
                </div>

                <!-- Agent cards -->
                <div v-else-if="registeredAgents.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div v-for="agent in registeredAgents" :key="agent.id"
                    @click="selectAgent(agent)"
                    class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition border"
                    :class="selectedAgentId === agent.id
                      ? 'bg-yellow-500/15 border-yellow-500/60 ring-1 ring-yellow-500/40'
                      : 'bg-gray-700/40 border-gray-600 hover:border-yellow-500/30'">
                    <!-- Online dot -->
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      :class="agent.isOnline ? 'bg-green-400' : 'bg-gray-500'"></span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-white text-sm font-semibold truncate">{{ agent.displayName }}</span>
                        <span v-if="agent.isOnline" class="text-green-400 text-xs">online</span>
                        <span v-else class="text-gray-500 text-xs">offline</span>
                      </div>
                      <div class="text-gray-400 text-xs font-mono truncate">{{ agent.host }}:{{ agent.port }}</div>
                      <div class="text-gray-500 text-xs">
                        v{{ agent.version || '?' }} &middot; {{ timeSince(agent.lastSeen) }}
                      </div>
                    </div>
                    <!-- Selected checkmark -->
                    <span v-if="selectedAgentId === agent.id" class="text-yellow-400 text-lg flex-shrink-0">&#x2713;</span>
                  </div>
                </div>
              </div>

              <!-- Manual entry (collapsed by default) -->
              <div v-if="showManualAgentEntry" class="bg-gray-700/30 rounded-lg p-3 mb-4 border border-gray-600">
                <p class="text-xs text-gray-400 mb-3">
                  Enter connection details manually. The agent must have the same API secret configured in its <code class="text-yellow-300">.env</code>.
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-gray-300 text-xs mb-1">Agent Host / IP</label>
                    <input v-model="addForm.agentConfig.host" type="text" placeholder="bb9e or 192.168.1.50"
                      class="w-full bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:border-yellow-400 focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-gray-300 text-xs mb-1">Port</label>
                    <input v-model.number="addForm.agentConfig.port" type="number" placeholder="3100"
                      class="w-full bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:border-yellow-400 focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label class="block text-gray-300 text-xs mb-1">API Secret <span class="text-gray-500">(optional)</span></label>
                    <input v-model="addForm.agentConfig.secret" type="password" placeholder="x-api-secret value"
                      class="w-full bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:border-yellow-400 focus:outline-none text-sm" />
                  </div>
                  <div class="flex items-center gap-2 pt-4">
                    <input v-model="addForm.agentConfig.useSSL" type="checkbox" id="agent-ssl" class="accent-yellow-400" />
                    <label for="agent-ssl" class="text-gray-300 text-sm">Use HTTPS</label>
                  </div>
                </div>
              </div>

              <!-- ── Drive picker (agent-path only) ── -->
              <div v-if="isAgentPathType">
                <!-- Discover button — shown when agent is selected or manual host is filled -->
                <div v-if="selectedAgentId || (showManualAgentEntry && addForm.agentConfig.host)"
                  class="bg-gray-700/30 rounded-lg p-3 mb-3 border border-gray-600">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-300 font-medium">
                      {{ discoveredAgentDisks.length > 0 ? 'Select a drive' : 'Detect drives on agent' }}
                    </span>
                    <button @click="discoverAgentDrives" :disabled="discoveringAgentDisks"
                      class="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded text-xs transition font-medium">
                      {{ discoveringAgentDisks ? 'Scanning...' : discoveredAgentDisks.length > 0 ? '&#x21bb; Rescan' : 'Scan Drives' }}
                    </button>
                  </div>

                  <p v-if="agentDiscoveryError" class="text-xs text-red-400 mb-2">{{ agentDiscoveryError }}</p>

                  <div v-if="discoveredAgentDisks.length > 0" class="space-y-1.5">
                    <div v-for="drive in discoveredAgentDisks" :key="drive.path"
                      @click="selectDiscoveredDrive(drive)"
                      class="flex items-center justify-between p-2 rounded cursor-pointer transition border"
                      :class="addForm.agentConfig.agentPath === drive.path
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-white'
                        : 'bg-gray-800 border-gray-600 hover:border-yellow-500/40 text-gray-300'">
                      <div class="flex items-center gap-2 min-w-0">
                        <span v-if="drive.isRemovable"
                          class="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">USB</span>
                        <span v-else-if="drive.isRecordingsDir"
                          class="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">REC</span>
                        <span v-else class="text-gray-500 text-xs shrink-0 font-mono">HDD</span>
                        <span class="font-mono text-xs truncate">{{ drive.path }}</span>
                        <span v-if="drive.label && drive.label !== drive.path" class="text-gray-500 text-xs">({{ drive.label }})</span>
                      </div>
                      <div class="text-xs shrink-0 ml-2">
                        <span :class="drive.percentUsed >= 90 ? 'text-red-400' : drive.percentUsed >= 75 ? 'text-yellow-400' : 'text-green-400'">
                          {{ formatDiscoveredBytes(drive.available) }} free
                        </span>
                        <span class="text-gray-600"> / {{ formatDiscoveredBytes(drive.total) }}</span>
                      </div>
                    </div>
                  </div>

                  <p v-else-if="!discoveringAgentDisks && !agentDiscoveryError" class="text-xs text-gray-500">
                    Click Scan Drives to detect mounted filesystems on the agent.
                  </p>

                  <!-- Unmounted external drives -->
                  <div v-if="unmountedDevices.length > 0" class="mt-3 border-t border-gray-600 pt-3">
                    <p class="text-xs text-gray-400 font-medium mb-2">
                      Unmounted external drives ({{ unmountedDevices.length }})
                    </p>
                    <div class="space-y-1.5">
                      <div v-for="dev in unmountedDevices" :key="dev.name"
                        class="flex items-center justify-between p-2 rounded bg-gray-800 border border-dashed border-gray-600 text-gray-400">
                        <div class="flex items-center gap-2 min-w-0">
                          <span v-if="dev.isUsb || dev.isRemovable"
                            class="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">USB</span>
                          <span v-else class="text-gray-500 text-xs shrink-0 font-mono">EXT</span>
                          <span class="font-mono text-xs truncate">{{ dev.name }}</span>
                          <span v-if="dev.model" class="text-gray-500 text-xs truncate">({{ dev.model }})</span>
                          <span v-if="dev.label" class="text-gray-500 text-xs">[{{ dev.label }}]</span>
                          <span class="text-gray-600 text-xs">{{ dev.fstype }}</span>
                        </div>
                        <div class="flex items-center gap-2 shrink-0 ml-2">
                          <span class="text-xs text-gray-500">{{ formatDiscoveredBytes(dev.size) }}</span>
                          <button @click="mountAgentDevice(dev)"
                            :disabled="mountingDevice === dev.name"
                            class="px-2 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded text-xs font-medium transition">
                            {{ mountingDevice === dev.name ? 'Mounting...' : 'Mount' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Path field (auto-filled from drive selection, or editable) -->
                <div>
                  <label class="block text-gray-300 text-sm mb-1">
                    Path on Agent
                    <span class="text-gray-500 font-normal ml-1">(auto-filled above, or enter manually)</span>
                  </label>
                  <input v-model="addForm.agentConfig.agentPath" type="text" placeholder="/media/usb0/recordings"
                    class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none font-mono text-sm" />
                  <p class="text-xs text-gray-500 mt-1">Absolute path on the agent machine where recordings will be stored.</p>
                </div>
              </div>
            </div>

            <div class="flex gap-3 mt-2">
              <button @click="addDisk" :disabled="!canAddDisk"
                class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                Add Location
              </button>
              <button @click="showAddForm = false; resetAddForm()" class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm transition">
                Cancel
              </button>
            </div>
          </div>

          <!-- Disk List -->
          <div class="space-y-4 mb-8">
            <div v-for="(disk, index) in diskStatuses" :key="disk.id"
              class="bg-gray-800 rounded-lg p-5 border transition"
              :class="disk.isOnline ? 'border-gray-700' : 'border-red-500/50'">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="w-3 h-3 rounded-full flex-shrink-0"
                    :class="disk.isOnline ? 'bg-green-400' : 'bg-red-500'"></span>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-white font-semibold">{{ disk.label }}</h3>
                      <span class="text-xs px-2 py-0.5 rounded font-medium" :class="typeBadge(disk.type || 'local').color">
                        {{ typeBadge(disk.type || 'local').label }}
                      </span>
                      <span v-if="index === 0" class="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded">Primary</span>
                      <span v-if="!disk.enabled" class="bg-gray-600 text-gray-400 text-xs px-2 py-0.5 rounded">Disabled</span>
                      <span v-if="!disk.isOnline" class="bg-red-600/30 text-red-400 text-xs px-2 py-0.5 rounded">Offline</span>
                    </div>
                    <p class="text-gray-500 text-xs font-mono mt-0.5">{{ diskSummary(disk) }}</p>
                  </div>
                </div>
                <div class="flex gap-1">
                  <button @click="moveDisk(disk.id, -1)" :disabled="index === 0"
                    class="text-gray-400 hover:text-white disabled:opacity-30 p-1 text-sm" title="Move up">&#x25B2;</button>
                  <button @click="moveDisk(disk.id, 1)" :disabled="index === diskStatuses.length - 1"
                    class="text-gray-400 hover:text-white disabled:opacity-30 p-1 text-sm" title="Move down">&#x25BC;</button>
                  <button @click="testDiskAction(disk.id)" :disabled="testingDiskId === disk.id"
                    class="text-blue-400 hover:text-blue-300 disabled:opacity-50 px-2 py-1 text-sm" title="Test">
                    {{ testingDiskId === disk.id ? '...' : 'Test' }}
                  </button>
                  <button @click="removeDisk(disk.id, disk.label)"
                    class="text-red-400 hover:text-red-300 px-2 py-1 text-sm" title="Remove">Remove</button>
                </div>
              </div>

              <!-- Space bar (local disks) -->
              <div v-if="(disk.type || 'local') === 'local' && disk.isOnline" class="mb-2">
                <div class="w-full bg-gray-700 rounded-full h-3">
                  <div class="h-3 rounded-full transition-all duration-500"
                    :class="disk.percentUsed >= 95 ? 'bg-red-500' : disk.percentUsed >= 85 ? 'bg-yellow-500' : 'bg-green-500'"
                    :style="{ width: disk.percentUsed + '%' }">
                  </div>
                </div>
                <div class="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{{ formatBytes(disk.used) }} used</span>
                  <span>{{ formatBytes(disk.available) }} free</span>
                  <span>{{ formatBytes(disk.total) }} total</span>
                </div>
              </div>

              <!-- Remote disk info -->
              <div v-if="(disk.type || 'local') !== 'local' && disk.isOnline" class="mb-2">
                <div class="flex items-center gap-2 text-sm text-gray-300">
                  <span class="text-green-400">Connected</span>
                  <span v-if="disk.type === 's3'">&#x2014; {{ disk.region || 'us-east-1' }}</span>
                  <span v-if="disk.serverVersion"> &#x2014; v{{ disk.serverVersion }}</span>
                </div>
                <div v-if="disk.type === 'recording-agent' && disk.diskInfo" class="mt-2">
                  <div class="text-xs text-gray-400 mb-1">Recordings Disk ({{ disk.diskInfo.recordingsDir || disk.diskInfo.mountPoint }})</div>
                  <div class="w-full bg-gray-700 rounded-full h-3">
                    <div class="h-3 rounded-full transition-all duration-500"
                      :class="(disk.diskInfo.total > 0 ? Math.round(disk.diskInfo.used / disk.diskInfo.total * 100) : 0) >= 95 ? 'bg-red-500' : (disk.diskInfo.total > 0 ? Math.round(disk.diskInfo.used / disk.diskInfo.total * 100) : 0) >= 85 ? 'bg-yellow-500' : 'bg-green-500'"
                      :style="{ width: (disk.diskInfo.total > 0 ? Math.round(disk.diskInfo.used / disk.diskInfo.total * 100) : 0) + '%' }">
                    </div>
                  </div>
                  <div class="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{{ formatBytes(disk.diskInfo.used) }} used</span>
                    <span>{{ formatBytes(disk.diskInfo.available) }} free</span>
                    <span>{{ formatBytes(disk.diskInfo.total) }} total</span>
                  </div>
                </div>
              </div>

              <!-- Disk details -->
              <div class="flex gap-4 text-xs text-gray-500 mt-2 flex-wrap">
                <span>Priority: {{ disk.priority }}</span>
                <span v-if="(disk.type || 'local') === 'local'">Max: {{ disk.maxUsagePercent }}%</span>
                <span v-if="(disk.type || 'local') === 'local'">Reserved: {{ formatBytes(disk.reservedBytes) }}</span>
                <span>Purpose: {{ disk.purpose ? disk.purpose.join(', ') : 'all' }}</span>
              </div>

              <!-- Test result -->
              <div v-if="testResult && testResult.diskId === disk.id" class="mt-3 text-sm px-3 py-2 rounded"
                :class="testResult.success ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'">
                {{ testResult.message }}
              </div>
            </div>
          </div>

          <!-- Global Settings -->
          <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 class="text-lg font-semibold text-white mb-4">Threshold Settings</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-300 text-sm mb-1">Warning Threshold (%)</label>
                <input v-model.number="settingsForm.warningThresholdPercent" type="number" min="50" max="99"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
                <p class="text-gray-500 text-xs mt-1">Show warning when disk usage exceeds this percentage</p>
              </div>
              <div>
                <label class="block text-gray-300 text-sm mb-1">Critical Threshold (%)</label>
                <input v-model.number="settingsForm.criticalThresholdPercent" type="number" min="70" max="99"
                  class="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 focus:outline-none" />
                <p class="text-gray-500 text-xs mt-1">Block recordings when disk usage exceeds this percentage</p>
              </div>
            </div>
            <button @click="saveSettings" class="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold mt-4 transition">
              Save Settings
            </button>
          </div>
        </template>
      </div>
    </div>
  `
};
