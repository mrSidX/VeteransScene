import { ref, computed, onMounted } from 'vue';
import api from '../services/api.js';

export default {
  name: 'ReadinessChecks',
  setup() {
    const items = ref([]);
    const loading = ref(true);
    const error = ref('');

    // Filters
    const verdictFilter = ref('');
    const linkedFilter = ref('');

    // Detail modal
    const selected = ref(null);

    // Link-to-application modal
    const linking = ref(null);
    const applicationIdToLink = ref('');
    const linkError = ref('');
    const applications = ref([]);
    const applicationsLoading = ref(false);
    const appSearch = ref('');

    const filteredApplications = computed(() => {
      const q = appSearch.value.trim().toLowerCase();
      if (!q) return applications.value;
      return applications.value.filter(a => {
        const haystack = [
          a.firstName, a.lastName, a.alias, a.email, a.status,
          `${a.firstName || ''} ${a.lastName || ''}`
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    });

    const applicationLabel = (a) => {
      const name = a.alias || `${a.firstName || ''} ${a.lastName || ''}`.trim() || '(no name)';
      return `${name}${a.email ? ' — ' + a.email : ''}`;
    };

    const fetchItems = async () => {
      loading.value = true;
      error.value = '';
      try {
        const params = {};
        if (verdictFilter.value) params.verdict = verdictFilter.value;
        if (linkedFilter.value) params.linked = linkedFilter.value;
        const resp = await api.listGuestAssessments(params);
        if (resp.success) items.value = resp.data;
      } catch (err) {
        error.value = 'Failed to load readiness checks: ' + err.message;
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';
    const formatMbps = (v) => (v == null ? '—' : v.toFixed(1) + ' Mbps');

    const verdictBadge = (v) => ({
      pass:   'bg-green-900/40 text-green-300 border border-green-500',
      review: 'bg-yellow-900/40 text-yellow-300 border border-yellow-500',
      fail:   'bg-red-900/40 text-red-300 border border-red-500'
    })[v] || 'bg-gray-800 text-gray-300 border border-gray-600';

    const verdictLabel = (v) => ({
      pass: '✓ Pass',
      review: '⚠ Review',
      fail: '✗ Fail'
    })[v] || v;

    const tierColor = (t) => ({
      green: 'text-green-400',
      yellow: 'text-yellow-400',
      red: 'text-red-400'
    })[t] || 'text-gray-400';

    const identityLabel = (it) => {
      if (it.linkedApplication) {
        const a = it.linkedApplication;
        return (a.alias || `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email) + ' (linked)';
      }
      if (it.submittedAnonymously) return 'Anonymous';
      return it.handle || it.email || 'Unknown';
    };

    const openDetail = (it) => { selected.value = it; };
    const closeDetail = () => { selected.value = null; };

    const loadApplications = async () => {
      if (applications.value.length > 0) return; // cache
      applicationsLoading.value = true;
      try {
        const resp = await api.getApplications({ limit: 500 });
        if (resp.success) {
          const list = Array.isArray(resp.data) ? resp.data : (resp.data?.applications || resp.data?.items || []);
          applications.value = list;
        }
      } catch (err) {
        linkError.value = 'Could not load applications: ' + err.message;
      } finally {
        applicationsLoading.value = false;
      }
    };

    const openLink = (it) => {
      linking.value = it;
      applicationIdToLink.value = '';
      appSearch.value = '';
      linkError.value = '';
      loadApplications();
    };
    const closeLink = () => { linking.value = null; };
    const selectApplication = (a) => { applicationIdToLink.value = a._id; };

    const submitLink = async () => {
      linkError.value = '';
      if (!applicationIdToLink.value.trim()) {
        linkError.value = 'Application ID is required';
        return;
      }
      try {
        const resp = await api.linkGuestAssessment(linking.value._id, applicationIdToLink.value.trim());
        if (resp.success) {
          closeLink();
          await fetchItems();
        } else {
          linkError.value = resp.message || 'Link failed';
        }
      } catch (err) {
        linkError.value = err.message || 'Link failed';
      }
    };

    onMounted(fetchItems);

    return {
      items, loading, error,
      verdictFilter, linkedFilter, fetchItems,
      selected, openDetail, closeDetail,
      linking, applicationIdToLink, linkError, openLink, closeLink, submitLink,
      applications, applicationsLoading, appSearch, filteredApplications,
      applicationLabel, selectApplication,
      formatDate, formatMbps, verdictBadge, verdictLabel, tierColor, identityLabel
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-7xl mx-auto">
        <div class="mb-6">
          <h1 class="text-4xl font-bold text-yellow-400">Studio Readiness Checks</h1>
          <p class="text-gray-400 mt-2">Guest-submitted reports of network, camera/mic, and system readiness. Used to decide whether a guest can be scheduled.</p>
        </div>

        <!-- Filters -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label class="text-xs text-gray-400 block mb-1">Verdict</label>
            <select v-model="verdictFilter" @change="fetchItems"
              class="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-gray-100">
              <option value="">All</option>
              <option value="pass">Pass</option>
              <option value="review">Needs review</option>
              <option value="fail">Fail</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Linked to applicant?</label>
            <select v-model="linkedFilter" @change="fetchItems"
              class="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-gray-100">
              <option value="">All</option>
              <option value="true">Linked</option>
              <option value="false">Unlinked (anonymous)</option>
            </select>
          </div>
          <button @click="fetchItems" class="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2 rounded">Refresh</button>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400">Loading...</div>
        <div v-if="error" class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">{{ error }}</div>

        <div v-if="!loading && items.length === 0" class="text-center py-12 text-gray-400">
          No readiness checks match these filters.
        </div>

        <!-- Table -->
        <div v-if="!loading && items.length > 0" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-900 text-gray-300 uppercase text-xs">
              <tr>
                <th class="text-left px-4 py-3">Verdict</th>
                <th class="text-left px-4 py-3">Submitted by</th>
                <th class="text-left px-4 py-3">Download</th>
                <th class="text-left px-4 py-3">Upload</th>
                <th class="text-left px-4 py-3">CPU</th>
                <th class="text-left px-4 py-3">RAM</th>
                <th class="text-left px-4 py-3">Cam/Mic</th>
                <th class="text-left px-4 py-3">Submitted</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in items" :key="it._id" class="border-t border-gray-700 hover:bg-gray-900/50">
                <td class="px-4 py-3">
                  <span :class="verdictBadge(it.verdict)" class="inline-block px-2 py-1 rounded text-xs font-semibold">
                    {{ verdictLabel(it.verdict) }}
                  </span>
                </td>
                <td class="px-4 py-3">{{ identityLabel(it) }}</td>
                <td class="px-4 py-3 font-mono" :class="tierColor(it.network?.downloadTier)">{{ formatMbps(it.network?.downloadMbps) }}</td>
                <td class="px-4 py-3 font-mono" :class="tierColor(it.network?.uploadTier)">{{ formatMbps(it.network?.uploadMbps) }}</td>
                <td class="px-4 py-3 font-mono" :class="tierColor(it.system?.cpuTier)">{{ it.system?.cpuCores ?? '—' }}</td>
                <td class="px-4 py-3 font-mono" :class="tierColor(it.system?.ramTier)">{{ it.system?.ramGb ? it.system.ramGb + ' GB' : '?' }}</td>
                <td class="px-4 py-3">
                  <span :class="it.devices?.hasCamera ? 'text-green-400' : 'text-red-400'">{{ it.devices?.hasCamera ? 'C' : '—' }}</span>
                  /
                  <span :class="it.devices?.hasMicrophone ? 'text-green-400' : 'text-red-400'">{{ it.devices?.hasMicrophone ? 'M' : '—' }}</span>
                </td>
                <td class="px-4 py-3 text-gray-400">{{ formatDate(it.createdAt) }}</td>
                <td class="px-4 py-3 text-right">
                  <button @click="openDetail(it)" class="text-yellow-400 hover:text-yellow-300 text-xs mr-3">Details</button>
                  <button v-if="!it.linkedApplication" @click="openLink(it)" class="text-blue-400 hover:text-blue-300 text-xs">Link…</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Detail modal -->
        <div v-if="selected" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" @click.self="closeDetail">
          <div class="bg-gray-800 border border-gray-600 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h2 class="text-2xl font-bold text-yellow-400">Readiness check detail</h2>
                  <p class="text-xs text-gray-500 font-mono mt-1">{{ selected._id }}</p>
                </div>
                <button @click="closeDetail" class="text-gray-400 hover:text-gray-200 text-2xl">&times;</button>
              </div>

              <div :class="verdictBadge(selected.verdict)" class="rounded-lg p-4 mb-4 border-2 text-center">
                <div class="text-2xl font-bold">{{ verdictLabel(selected.verdict) }}</div>
                <p v-if="selected.verdictReasons?.length" class="mt-2 text-sm">{{ selected.verdictReasons.join(' · ') }}</p>
              </div>

              <h3 class="text-sm font-semibold text-gray-300 uppercase mb-2">Submitter</h3>
              <div class="bg-gray-900 rounded p-3 mb-4 text-sm space-y-1">
                <div><span class="text-gray-500">Identity:</span> {{ identityLabel(selected) }}</div>
                <div v-if="selected.email"><span class="text-gray-500">Email:</span> {{ selected.email }}</div>
                <div v-if="selected.handle"><span class="text-gray-500">Handle:</span> {{ selected.handle }}</div>
                <div v-if="selected.linkedApplication"><span class="text-gray-500">Linked application:</span>
                  <router-link :to="'/applications/' + selected.linkedApplication._id" class="text-yellow-400 hover:underline">open →</router-link>
                </div>
                <div><span class="text-gray-500">Submitted:</span> {{ formatDate(selected.createdAt) }}</div>
                <div><span class="text-gray-500">IP:</span> {{ selected.ipAddress || '—' }}</div>
                <div><span class="text-gray-500">Time on page:</span> {{ selected.timeOnPageMs ? Math.round(selected.timeOnPageMs / 1000) + 's' : '—' }}</div>
              </div>

              <h3 class="text-sm font-semibold text-gray-300 uppercase mb-2">Network</h3>
              <div class="bg-gray-900 rounded p-3 mb-4 text-sm space-y-1">
                <div>Download: <span class="font-mono" :class="tierColor(selected.network?.downloadTier)">{{ formatMbps(selected.network?.downloadMbps) }}</span></div>
                <div>Upload: <span class="font-mono" :class="tierColor(selected.network?.uploadTier)">{{ formatMbps(selected.network?.uploadMbps) }}</span></div>
                <div v-if="selected.network?.effectiveType">Effective type: {{ selected.network.effectiveType }}</div>
                <div v-if="selected.network?.rttMs">RTT: {{ selected.network.rttMs }} ms</div>
              </div>

              <h3 class="text-sm font-semibold text-gray-300 uppercase mb-2">System</h3>
              <div class="bg-gray-900 rounded p-3 mb-4 text-sm space-y-1">
                <div>CPU cores: <span class="font-mono" :class="tierColor(selected.system?.cpuTier)">{{ selected.system?.cpuCores ?? '—' }}</span></div>
                <div>RAM: <span class="font-mono" :class="tierColor(selected.system?.ramTier)">{{ selected.system?.ramGb ? selected.system.ramGb + ' GB' : 'unknown' }}</span></div>
                <div v-if="selected.system?.storageQuotaGb">Storage quota: {{ selected.system.storageQuotaGb }} GB</div>
                <div v-if="selected.system?.osName">OS: {{ selected.system.osName }} {{ selected.system.osVersion || '' }}</div>
                <div v-if="selected.system?.browserName">Browser: {{ selected.system.browserName }} {{ selected.system.browserVersion || '' }}</div>
                <div v-if="selected.system?.deviceModel">Model: {{ selected.system.deviceModel }} <span class="text-gray-500">({{ selected.system.deviceModelSource }})</span></div>
                <div v-if="selected.system?.screenWidth">Screen: {{ selected.system.screenWidth }}×{{ selected.system.screenHeight }}</div>
              </div>

              <h3 class="text-sm font-semibold text-gray-300 uppercase mb-2">Devices</h3>
              <div class="bg-gray-900 rounded p-3 mb-4 text-sm space-y-1">
                <div>Camera: <span :class="selected.devices?.hasCamera ? 'text-green-400' : 'text-red-400'">{{ selected.devices?.hasCamera ? '✓ present' : '✗ missing' }}</span> <span v-if="selected.devices?.cameraLabel" class="text-gray-500">— {{ selected.devices.cameraLabel }}</span></div>
                <div>Microphone: <span :class="selected.devices?.hasMicrophone ? 'text-green-400' : 'text-red-400'">{{ selected.devices?.hasMicrophone ? '✓ present' : '✗ missing' }}</span> <span v-if="selected.devices?.microphoneLabel" class="text-gray-500">— {{ selected.devices.microphoneLabel }}</span></div>
                <div>Audio level detected: <span :class="selected.devices?.audioLevelDetected ? 'text-green-400' : 'text-gray-400'">{{ selected.devices?.audioLevelDetected ? 'yes' : 'no' }}</span></div>
              </div>

              <div class="flex justify-end space-x-3 mt-6">
                <button v-if="!selected.linkedApplication" @click="openLink(selected)" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded">Link to application…</button>
                <button @click="closeDetail" class="bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded">Close</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Link modal -->
        <div v-if="linking" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" @click.self="closeLink">
          <div class="bg-gray-800 border border-gray-600 rounded-lg max-w-lg w-full p-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-2">Link to application</h2>
            <p class="text-sm text-gray-400 mb-4">Pick the applicant this readiness check belongs to.</p>

            <input v-model="appSearch" type="text" placeholder="Search by name, email, or status…"
              class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-gray-100 mb-3"/>

            <div class="border border-gray-700 rounded max-h-72 overflow-y-auto bg-gray-900">
              <div v-if="applicationsLoading" class="p-4 text-center text-gray-400 text-sm">Loading applications…</div>
              <div v-else-if="filteredApplications.length === 0" class="p-4 text-center text-gray-500 text-sm">No applications match.</div>
              <button v-else
                v-for="a in filteredApplications" :key="a._id"
                @click="selectApplication(a)"
                type="button"
                :class="[
                  'w-full text-left px-3 py-2 border-b border-gray-800 hover:bg-gray-800 transition',
                  applicationIdToLink === a._id ? 'bg-yellow-900/30 border-l-4 border-l-yellow-400' : ''
                ]">
                <div class="flex justify-between items-start gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="text-gray-100 font-medium truncate">{{ applicationLabel(a) }}</div>
                    <div class="text-xs text-gray-500 font-mono truncate">{{ a._id }}</div>
                  </div>
                  <span v-if="a.status" class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 flex-shrink-0 uppercase">{{ a.status }}</span>
                </div>
              </button>
            </div>

            <div v-if="linkError" class="mt-3 bg-red-900/40 border border-red-500 rounded p-2 text-red-200 text-sm">{{ linkError }}</div>
            <div class="flex justify-end space-x-3 mt-5">
              <button @click="closeLink" class="bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded">Cancel</button>
              <button @click="submitLink" :disabled="!applicationIdToLink"
                :class="['font-semibold px-4 py-2 rounded',
                  applicationIdToLink ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900' : 'bg-gray-700 text-gray-500 cursor-not-allowed']">
                Link
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
};
