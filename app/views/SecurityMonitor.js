import { ref, onMounted } from 'vue';

export default {
  name: 'SecurityMonitor',
  setup() {
    const securityData = ref(null);
    const loading = ref(false);
    const error = ref('');
    const banIpInput = ref('');
    const banMessage = ref('');
    const banSuccess = ref(false);

    const formatBytes = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    };

    const loadSecurity = async () => {
      if (loading.value) return;
      loading.value = true;
      error.value = '';
      try {
        const response = await window.api.get('/security/overview');
        securityData.value = response.data;
      } catch (err) {
        console.error('Error loading security data:', err);
        error.value = err.message || 'Failed to load security data';
      } finally {
        loading.value = false;
      }
    };

    const banIp = async () => {
      if (!banIpInput.value) return;
      banMessage.value = '';
      try {
        const response = await window.api.post('/security/ban-ip', { ip: banIpInput.value });
        banSuccess.value = true;
        banMessage.value = response.data?.message || `IP ${banIpInput.value} banned`;
        banIpInput.value = '';
        await loadSecurity();
      } catch (err) {
        banSuccess.value = false;
        banMessage.value = err.message || 'Failed to ban IP';
      }
    };

    const unbanIp = async (ip) => {
      const targetIp = ip || banIpInput.value;
      if (!targetIp) return;
      banMessage.value = '';
      try {
        const response = await window.api.post('/security/unban-ip', { ip: targetIp });
        banSuccess.value = true;
        banMessage.value = response.data?.message || `IP ${targetIp} unbanned`;
        banIpInput.value = '';
        await loadSecurity();
      } catch (err) {
        banSuccess.value = false;
        banMessage.value = err.message || 'Failed to unban IP';
      }
    };

    const quickBan = async (ip) => {
      banIpInput.value = ip;
      await banIp();
    };

    // Login attempts
    const loginData = ref(null);
    const loginLoading = ref(false);

    const loadLoginAttempts = async () => {
      loginLoading.value = true;
      try {
        const response = await window.api.get('/security/login-attempts');
        loginData.value = response.data;
      } catch (err) {
        console.error('Error loading login attempts:', err);
      } finally {
        loginLoading.value = false;
      }
    };

    onMounted(() => {
      loadSecurity();
      loadLoginAttempts();
    });

    return {
      securityData, loading, error,
      banIpInput, banMessage, banSuccess,
      formatBytes, loadSecurity, banIp, unbanIp, quickBan,
      loginData, loginLoading, loadLoginAttempts
    };
  },
  template: `
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-yellow-400">Security Monitor</h1>
        <button @click="loadSecurity" :disabled="loading" class="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition disabled:opacity-50">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="loading && !securityData" class="text-center py-12 text-gray-400">Loading security data...</div>
      <div v-else-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

      <template v-if="securityData">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p class="text-sm text-gray-400">Failed SSH Attempts</p>
            <p class="text-2xl font-bold text-red-400">{{ securityData.sshAttempts?.totalFailed || 0 }}</p>
          </div>
          <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p class="text-sm text-gray-400">Currently Banned</p>
            <p class="text-2xl font-bold text-yellow-400">{{ securityData.fail2ban?.currentlyBanned || 0 }}</p>
          </div>
          <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p class="text-sm text-gray-400">Total Banned</p>
            <p class="text-2xl font-bold text-orange-400">{{ securityData.fail2ban?.totalBanned || 0 }}</p>
          </div>
          <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p class="text-sm text-gray-400">Memory Usage</p>
            <p class="text-2xl font-bold text-purple-400">{{ securityData.systemResources?.memory?.usedPercent || 0 }}%</p>
          </div>
        </div>

        <!-- Ban/Unban Controls -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 class="text-lg font-bold text-white mb-4">IP Ban Controls</h3>
          <div class="flex flex-col sm:flex-row gap-4 items-end">
            <div class="flex-1 w-full">
              <label class="block text-sm text-gray-400 mb-1">IP Address</label>
              <input v-model="banIpInput" @keyup.enter="banIp" placeholder="e.g. 192.168.1.100" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent" />
            </div>
            <div class="flex gap-2">
              <button @click="banIp" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap">Ban IP</button>
              <button @click="unbanIp()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">Unban IP</button>
            </div>
          </div>
          <p v-if="banMessage" class="mt-2 text-sm" :class="banSuccess ? 'text-green-400' : 'text-red-400'">{{ banMessage }}</p>
        </div>

        <!-- Banned IPs -->
        <div v-if="securityData.fail2ban?.bannedIps?.length" class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 class="text-lg font-bold text-white mb-4">Currently Banned IPs</h3>
          <div class="flex flex-wrap gap-2">
            <span v-for="ip in securityData.fail2ban.bannedIps" :key="ip" class="inline-flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-700 rounded-full text-red-300 text-sm">
              {{ ip }}
              <button @click="unbanIp(ip)" class="text-red-400 hover:text-red-200 text-lg leading-none">&times;</button>
            </span>
          </div>
        </div>

        <!-- Top Offending IPs -->
        <div v-if="securityData.sshAttempts?.byIp?.length" class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 class="text-lg font-bold text-white mb-4">Top Offending IPs</h3>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-900">
                <tr>
                  <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">IP Address</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Attempts</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                <tr v-for="entry in securityData.sshAttempts.byIp.slice(0, 20)" :key="entry.ip" class="hover:bg-gray-700 transition">
                  <td class="px-4 py-3 font-mono text-gray-200">{{ entry.ip }}</td>
                  <td class="px-4 py-3 text-red-400 font-bold">{{ entry.count }}</td>
                  <td class="px-4 py-3">
                    <button @click="quickBan(entry.ip)" class="text-sm text-red-400 hover:text-red-300 transition">Ban</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent SSH Attempts -->
        <div v-if="securityData.sshAttempts?.recent?.length" class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 class="text-lg font-bold text-white mb-4">Recent Failed SSH Attempts</h3>
          <div class="overflow-x-auto max-h-96 overflow-y-auto">
            <table class="w-full">
              <thead class="bg-gray-900 sticky top-0">
                <tr>
                  <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Time</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Username</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">IP</th>
                  <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Valid User</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                <tr v-for="(attempt, i) in securityData.sshAttempts.recent.slice(0, 50)" :key="i" class="hover:bg-gray-700 transition">
                  <td class="px-4 py-2 text-sm text-gray-400">{{ attempt.timestamp }}</td>
                  <td class="px-4 py-2 font-mono text-gray-200">{{ attempt.username }}</td>
                  <td class="px-4 py-2 font-mono text-gray-200">{{ attempt.ip }}</td>
                  <td class="px-4 py-2">
                    <span :class="attempt.valid ? 'text-yellow-400' : 'text-gray-500'">{{ attempt.valid ? 'Yes' : 'No' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Web Login Attempts -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold text-white">Web Login Attempts</h3>
            <button @click="loadLoginAttempts" class="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition">Refresh</button>
          </div>
          <div v-if="loginLoading && !loginData" class="text-gray-400 text-sm">Loading...</div>
          <template v-else-if="loginData">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div class="bg-gray-900 rounded p-3">
                <p class="text-xs text-gray-400">24h Success</p>
                <p class="text-lg font-bold text-green-400">{{ loginData.stats?.last24h?.success || 0 }}</p>
              </div>
              <div class="bg-gray-900 rounded p-3">
                <p class="text-xs text-gray-400">24h Failed</p>
                <p class="text-lg font-bold text-red-400">{{ loginData.stats?.last24h?.failed || 0 }}</p>
              </div>
              <div class="bg-gray-900 rounded p-3">
                <p class="text-xs text-gray-400">7d Success</p>
                <p class="text-lg font-bold text-green-400">{{ loginData.stats?.last7d?.success || 0 }}</p>
              </div>
              <div class="bg-gray-900 rounded p-3">
                <p class="text-xs text-gray-400">7d Failed</p>
                <p class="text-lg font-bold text-red-400">{{ loginData.stats?.last7d?.failed || 0 }}</p>
              </div>
            </div>
            <div v-if="loginData.topFailedIps?.length" class="mb-4">
              <p class="text-sm text-gray-400 mb-2">Top Failed IPs (7d)</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="entry in loginData.topFailedIps" :key="entry.ip" class="inline-flex items-center gap-1 px-2 py-1 bg-red-900/20 border border-red-800 rounded text-sm text-red-300">
                  {{ entry.ip }} <span class="text-red-500 font-bold">{{ entry.count }}</span>
                </span>
              </div>
            </div>
            <div v-if="loginData.topFailedEmails?.length" class="mb-4">
              <p class="text-sm text-gray-400 mb-2">Top Failed Emails (7d)</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="entry in loginData.topFailedEmails" :key="entry.email" class="inline-flex items-center gap-1 px-2 py-1 bg-orange-900/20 border border-orange-800 rounded text-sm text-orange-300">
                  {{ entry.email }} <span class="text-orange-500 font-bold">{{ entry.count }}</span>
                </span>
              </div>
            </div>
            <div v-if="loginData.attempts?.length" class="overflow-x-auto max-h-72 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-900 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left text-gray-400">Time</th>
                    <th class="px-3 py-2 text-left text-gray-400">Email</th>
                    <th class="px-3 py-2 text-left text-gray-400">Method</th>
                    <th class="px-3 py-2 text-left text-gray-400">IP</th>
                    <th class="px-3 py-2 text-left text-gray-400">Result</th>
                    <th class="px-3 py-2 text-left text-gray-400">Reason</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                  <tr v-for="a in loginData.attempts.slice(0, 50)" :key="a._id" class="hover:bg-gray-700">
                    <td class="px-3 py-1 text-gray-400 whitespace-nowrap">{{ new Date(a.createdAt).toLocaleString() }}</td>
                    <td class="px-3 py-1 text-gray-200">{{ a.email }}</td>
                    <td class="px-3 py-1 text-gray-300">{{ a.method }}</td>
                    <td class="px-3 py-1 font-mono text-gray-300">{{ a.ip }}</td>
                    <td class="px-3 py-1">
                      <span :class="a.success ? 'text-green-400' : 'text-red-400'">{{ a.success ? 'OK' : 'FAIL' }}</span>
                    </td>
                    <td class="px-3 py-1 text-gray-500">{{ a.reason || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-gray-500 text-sm">No login attempts recorded yet.</p>
          </template>
        </div>

        <!-- System Resources -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 class="text-lg font-bold text-white mb-4">System Resources</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p class="text-sm text-gray-400">CPU</p>
              <p class="text-white">{{ securityData.systemResources?.cpu?.count }} cores - {{ securityData.systemResources?.cpu?.model }}</p>
              <p class="text-sm text-gray-400 mt-1">Load: {{ securityData.systemResources?.cpu?.loadAvg?.map(l => l.toFixed(2)).join(', ') }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-400">Memory</p>
              <p class="text-white">{{ formatBytes(securityData.systemResources?.memory?.used) }} / {{ formatBytes(securityData.systemResources?.memory?.total) }}</p>
              <div class="mt-1 w-full bg-gray-700 rounded-full h-2">
                <div class="h-2 rounded-full transition-all" :class="parseFloat(securityData.systemResources?.memory?.usedPercent) > 80 ? 'bg-red-500' : parseFloat(securityData.systemResources?.memory?.usedPercent) > 60 ? 'bg-yellow-500' : 'bg-green-500'" :style="{ width: securityData.systemResources?.memory?.usedPercent + '%' }"></div>
              </div>
            </div>
          </div>
          <div v-if="securityData.systemResources?.topProcesses?.length">
            <p class="text-sm text-gray-400 mb-2">Top Processes (by CPU)</p>
            <div class="overflow-x-auto max-h-64 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-900 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left text-gray-400">PID</th>
                    <th class="px-3 py-2 text-left text-gray-400">User</th>
                    <th class="px-3 py-2 text-left text-gray-400">CPU%</th>
                    <th class="px-3 py-2 text-left text-gray-400">MEM%</th>
                    <th class="px-3 py-2 text-left text-gray-400">Command</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                  <tr v-for="proc in securityData.systemResources.topProcesses" :key="proc.pid" class="hover:bg-gray-700">
                    <td class="px-3 py-1 text-gray-300">{{ proc.pid }}</td>
                    <td class="px-3 py-1 text-gray-300">{{ proc.user }}</td>
                    <td class="px-3 py-1" :class="proc.cpu > 50 ? 'text-red-400' : 'text-gray-300'">{{ proc.cpu }}%</td>
                    <td class="px-3 py-1 text-gray-300">{{ proc.mem }}%</td>
                    <td class="px-3 py-1 text-gray-400 truncate max-w-xs">{{ proc.command }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </div>
  `
};
