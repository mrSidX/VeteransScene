import { ref, computed, onMounted } from 'vue';
import api from '../services/api.js';

export default {
  name: 'SuperAdminQueue',
  setup() {
    const requests = ref([]);
    const stats = ref({});
    const loading = ref(true);
    const error = ref(null);
    const activeFilter = ref('all');
    const statusFilter = ref('pending');
    const selectedRequest = ref(null);
    const selectedEntity = ref(null);
    const detailLoading = ref(false);
    const actionLoading = ref(false);
    const reviewNotes = ref('');
    const page = ref(1);
    const pagination = ref({ total: 0, pages: 1 });

    const filteredRequests = computed(() => {
      if (activeFilter.value === 'all') return requests.value;
      return requests.value.filter(r => r.entityType === activeFilter.value);
    });

    const fetchStats = async () => {
      try {
        const res = await api.get('/super-admin/queue/stats');
        if (res.success) stats.value = res.data;
      } catch (e) {
        console.error('Failed to load stats:', e);
      }
    };

    const fetchQueue = async () => {
      loading.value = true;
      error.value = null;
      try {
        const params = new URLSearchParams({ status: statusFilter.value, page: page.value, limit: 50 });
        if (activeFilter.value !== 'all') params.set('entityType', activeFilter.value);
        const res = await api.get(`/super-admin/queue?${params}`);
        if (res.success) {
          requests.value = res.data.requests;
          pagination.value = res.data.pagination;
        }
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    };

    const openDetail = async (req) => {
      selectedRequest.value = req;
      selectedEntity.value = null;
      reviewNotes.value = '';
      detailLoading.value = true;
      try {
        const res = await api.get(`/super-admin/queue/${req._id}`);
        if (res.success) {
          selectedRequest.value = res.data.request;
          selectedEntity.value = res.data.entity;
        }
      } catch (e) {
        console.error('Failed to load detail:', e);
      } finally {
        detailLoading.value = false;
      }
    };

    const closeDetail = () => {
      selectedRequest.value = null;
      selectedEntity.value = null;
      reviewNotes.value = '';
    };

    const approveDelete = async () => {
      if (!selectedRequest.value) return;
      if (!confirm('Permanently delete this item? This cannot be undone.')) return;
      actionLoading.value = true;
      try {
        const res = await api.post(`/super-admin/queue/${selectedRequest.value._id}/approve`, { notes: reviewNotes.value });
        if (res.success) {
          closeDetail();
          await Promise.all([fetchQueue(), fetchStats()]);
        }
      } catch (e) {
        alert('Failed to approve: ' + e.message);
      } finally {
        actionLoading.value = false;
      }
    };

    const restoreEntity = async () => {
      if (!selectedRequest.value) return;
      actionLoading.value = true;
      try {
        const res = await api.post(`/super-admin/queue/${selectedRequest.value._id}/restore`, { notes: reviewNotes.value });
        if (res.success) {
          closeDetail();
          await Promise.all([fetchQueue(), fetchStats()]);
        }
      } catch (e) {
        alert('Failed to restore: ' + e.message);
      } finally {
        actionLoading.value = false;
      }
    };

    const setFilter = (filter) => {
      activeFilter.value = filter;
      page.value = 1;
      fetchQueue();
    };

    const setStatus = (status) => {
      statusFilter.value = status;
      page.value = 1;
      fetchQueue();
    };

    const formatDate = (d) => {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    const entityIcon = (type) => {
      const icons = { segment: '📊', application: '📋', note: '📝', 'recording-session': '🎬', recording: '🎙️', 'dropbox-file': '🎙️', user: '👤' };
      return icons[type] || '📄';
    };

    const snapshotSummary = (req) => {
      const s = req.entitySnapshot;
      if (!s) return req.entityId;
      if (s.title) return s.title;
      if (s.name) return s.name;
      if (s.email) return `${s.name || ''} (${s.email})`.trim();
      if (s.filename) return s.filename;
      return req.entityId;
    };

    onMounted(async () => {
      await Promise.all([fetchQueue(), fetchStats()]);
    });

    return {
      requests, stats, loading, error, activeFilter, statusFilter,
      selectedRequest, selectedEntity, detailLoading, actionLoading,
      reviewNotes, page, pagination, filteredRequests,
      fetchQueue, openDetail, closeDetail, approveDelete, restoreEntity,
      setFilter, setStatus, formatDate, entityIcon, snapshotSummary
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100">
      <div class="max-w-6xl mx-auto px-4 py-8">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-yellow-400 flex items-center gap-3">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Super Admin Review Queue
            </h1>
            <p class="text-gray-400 text-sm mt-1">Review and approve deletion requests from admins</p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <button @click="setFilter('all')"
            :class="['rounded-lg p-3 text-center transition border', activeFilter === 'all' ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400' : 'bg-gray-800 border-gray-700 hover:border-gray-600']">
            <div class="text-2xl font-bold">{{ stats.total || 0 }}</div>
            <div class="text-xs text-gray-400">All Pending</div>
          </button>
          <button v-for="type in ['segment', 'application', 'recording', 'recording-session', 'note', 'user']" :key="type"
            @click="setFilter(type)"
            :class="['rounded-lg p-3 text-center transition border', activeFilter === type ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400' : 'bg-gray-800 border-gray-700 hover:border-gray-600']">
            <div class="text-2xl font-bold">{{ stats[type] || 0 }}</div>
            <div class="text-xs text-gray-400 capitalize">{{ type.replace('-', ' ') }}</div>
          </button>
        </div>

        <!-- Status Tabs -->
        <div class="flex gap-2 mb-4">
          <button v-for="s in ['pending', 'approved', 'restored']" :key="s"
            @click="setStatus(s)"
            :class="['px-4 py-2 rounded-lg text-sm font-medium transition', statusFilter === s ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-gray-200']">
            {{ s.charAt(0).toUpperCase() + s.slice(1) }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-16">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p class="text-gray-400">Loading queue...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
          {{ error }}
        </div>

        <!-- Empty -->
        <div v-else-if="requests.length === 0" class="text-center py-16">
          <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p class="text-gray-400 text-lg">No {{ statusFilter }} requests</p>
          <p class="text-gray-500 text-sm mt-1">All clear!</p>
        </div>

        <!-- Request List -->
        <div v-else class="space-y-2">
          <div v-for="req in requests" :key="req._id"
            @click="openDetail(req)"
            class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-yellow-500/50 cursor-pointer transition flex items-center gap-4">
            <!-- Icon -->
            <div class="text-2xl flex-shrink-0">{{ entityIcon(req.entityType) }}</div>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-gray-100 truncate">{{ snapshotSummary(req) }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 capitalize flex-shrink-0">{{ req.entityType.replace('-', ' ') }}</span>
              </div>
              <div class="text-sm text-gray-400">
                Requested by <span class="text-gray-300">{{ req.requestedBy?.firstName }} {{ req.requestedBy?.lastName }}</span>
                <span class="mx-2">·</span>
                {{ formatDate(req.createdAt) }}
              </div>
            </div>
            <!-- Status badge -->
            <div class="flex-shrink-0">
              <span v-if="req.status === 'pending'" class="px-3 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">Pending</span>
              <span v-else-if="req.status === 'approved'" class="px-3 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30">Deleted</span>
              <span v-else-if="req.status === 'restored'" class="px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400 border border-green-600/30">Restored</span>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.pages > 1" class="flex justify-center gap-2 mt-6">
          <button v-for="p in pagination.pages" :key="p"
            @click="page = p; fetchQueue()"
            :class="['px-3 py-1 rounded text-sm', page === p ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-gray-200']">
            {{ p }}
          </button>
        </div>
      </div>

      <!-- Detail Modal -->
      <div v-if="selectedRequest" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div @click="closeDetail" class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ entityIcon(selectedRequest.entityType) }}</span>
              <div>
                <h2 class="text-lg font-semibold text-gray-100">Review Deletion Request</h2>
                <p class="text-sm text-gray-400 capitalize">{{ selectedRequest.entityType.replace('-', ' ') }}</p>
              </div>
            </div>
            <button @click="closeDetail" class="p-2 hover:bg-gray-700 rounded-lg transition">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="px-6 py-5 space-y-5">
            <!-- Loading -->
            <div v-if="detailLoading" class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
            </div>

            <template v-else>
              <!-- Request Info -->
              <div class="bg-gray-900/50 rounded-lg p-4 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Requested by</span>
                  <span class="text-gray-200">{{ selectedRequest.requestedBy?.firstName }} {{ selectedRequest.requestedBy?.lastName }} ({{ selectedRequest.requestedBy?.email }})</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Date</span>
                  <span class="text-gray-200">{{ formatDate(selectedRequest.createdAt) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-400">Status</span>
                  <span :class="selectedRequest.status === 'pending' ? 'text-yellow-400' : selectedRequest.status === 'approved' ? 'text-red-400' : 'text-green-400'" class="capitalize font-medium">{{ selectedRequest.status }}</span>
                </div>
                <div v-if="selectedRequest.reviewedBy" class="flex justify-between text-sm">
                  <span class="text-gray-400">Reviewed by</span>
                  <span class="text-gray-200">{{ selectedRequest.reviewedBy?.firstName }} {{ selectedRequest.reviewedBy?.lastName }}</span>
                </div>
                <div v-if="selectedRequest.reviewNotes" class="flex justify-between text-sm">
                  <span class="text-gray-400">Notes</span>
                  <span class="text-gray-200">{{ selectedRequest.reviewNotes }}</span>
                </div>
              </div>

              <!-- Snapshot Data -->
              <div>
                <h3 class="text-sm font-semibold text-gray-300 mb-2">Saved Snapshot</h3>
                <div class="bg-gray-900/50 rounded-lg p-4">
                  <div v-for="(val, key) in selectedRequest.entitySnapshot" :key="key" class="flex justify-between text-sm py-1 border-b border-gray-800 last:border-0">
                    <span class="text-gray-400 capitalize">{{ key.replace(/([A-Z])/g, ' $1').trim() }}</span>
                    <span class="text-gray-200 text-right max-w-[60%] truncate">{{ val }}</span>
                  </div>
                </div>
              </div>

              <!-- Live Entity Data -->
              <div v-if="selectedEntity">
                <h3 class="text-sm font-semibold text-gray-300 mb-2">Live Entity Data</h3>
                <div class="bg-gray-900/50 rounded-lg p-4 text-sm text-gray-300 max-h-48 overflow-y-auto">
                  <pre class="whitespace-pre-wrap break-words text-xs">{{ JSON.stringify(selectedEntity, null, 2) }}</pre>
                </div>
              </div>
              <div v-else-if="!detailLoading" class="bg-gray-900/50 rounded-lg p-4 text-center text-gray-500 text-sm">
                Entity no longer exists in database
              </div>

              <!-- Review Notes -->
              <div v-if="selectedRequest.status === 'pending'">
                <label class="block text-sm font-medium text-gray-300 mb-2">Review Notes (optional)</label>
                <textarea v-model="reviewNotes" rows="2" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:border-yellow-500 focus:outline-none" placeholder="Add any notes about your decision..."></textarea>
              </div>

              <!-- Action Buttons -->
              <div v-if="selectedRequest.status === 'pending'" class="flex gap-3 pt-2">
                <button @click="restoreEntity" :disabled="actionLoading"
                  class="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Restore
                </button>
                <button @click="approveDelete" :disabled="actionLoading"
                  class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  Permanently Delete
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  `
};
