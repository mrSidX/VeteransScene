import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

export default {
  name: 'RecordingSlots',
  setup() {
    const authStore = useAuthStore();
    const slots = ref([]);
    const loading = ref(true);
    const error = ref('');
    const saving = ref(false);

    // Create modal
    const showCreateModal = ref(false);
    const newSlot = ref({ name: '', description: '', maxSeats: 8 });

    // Detail / expanded slot
    const expandedSlotId = ref(null);
    const detailSlot = ref(null);
    const detailLoading = ref(false);

    // Assign segment modal
    const showAssignModal = ref(false);
    const assignSlotId = ref(null);
    const segments = ref([]);
    const segmentSearch = ref('');
    const segmentLoading = ref(false);
    const selectedSegmentId = ref('');

    // Assign seat modal
    const showSeatModal = ref(false);
    const seatSlotId = ref(null);
    const seatNumber = ref(null);
    const seatForm = ref({ name: '', email: '' });

    // Revealed URLs
    const revealedUrls = ref({});

    const toggleReveal = (key) => {
      revealedUrls.value[key] = !revealedUrls.value[key];
    };

    const maskUrl = (url) => {
      if (!url) return '';
      const q = url.indexOf('?');
      if (q === -1) return url;
      return url.substring(0, q + 1) + '***';
    };

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    };

    // ==========================================
    // Load
    // ==========================================
    const loadSlots = async () => {
      try {
        loading.value = true;
        error.value = '';
        const res = await api.getRecordingSlots();
        if (res.success) {
          slots.value = res.data.slots;
        }
      } catch (e) {
        error.value = e.message || 'Failed to load recording slots';
      } finally {
        loading.value = false;
      }
    };

    const loadSlotDetail = async (id) => {
      try {
        detailLoading.value = true;
        const res = await api.getRecordingSlot(id);
        if (res.success) {
          detailSlot.value = res.data.slot;
          // Also update in list
          const idx = slots.value.findIndex(s => s._id === id);
          if (idx !== -1) slots.value[idx] = res.data.slot;
        }
      } catch (e) {
        error.value = e.message;
      } finally {
        detailLoading.value = false;
      }
    };

    const toggleExpand = async (id) => {
      if (expandedSlotId.value === id) {
        expandedSlotId.value = null;
        detailSlot.value = null;
      } else {
        expandedSlotId.value = id;
        await loadSlotDetail(id);
      }
    };

    // ==========================================
    // Create
    // ==========================================
    const createSlot = async () => {
      try {
        saving.value = true;
        const res = await api.createRecordingSlot(newSlot.value);
        if (res.success) {
          slots.value.unshift(res.data.slot);
          showCreateModal.value = false;
          newSlot.value = { name: '', description: '', maxSeats: 8 };
        }
      } catch (e) {
        error.value = e.message;
      } finally {
        saving.value = false;
      }
    };

    // ==========================================
    // Delete
    // ==========================================
    const deleteSlot = async (id) => {
      if (!confirm('Delete this recording slot? This cannot be undone.')) return;
      try {
        const res = await api.deleteRecordingSlot(id);
        if (res.success) {
          slots.value = slots.value.filter(s => s._id !== id);
          if (expandedSlotId.value === id) {
            expandedSlotId.value = null;
            detailSlot.value = null;
          }
        }
      } catch (e) {
        error.value = e.message || 'Failed to delete slot';
      }
    };

    // ==========================================
    // Assign Segment
    // ==========================================
    const openAssignModal = async (slotId) => {
      assignSlotId.value = slotId;
      showAssignModal.value = true;
      selectedSegmentId.value = '';
      segmentSearch.value = '';
      try {
        segmentLoading.value = true;
        const res = await api.get('/segments?limit=100');
        if (res.success) {
          segments.value = res.data.segments;
        }
      } catch (e) {
        error.value = e.message;
      } finally {
        segmentLoading.value = false;
      }
    };

    const filteredSegments = computed(() => {
      if (!segmentSearch.value) return segments.value;
      const q = segmentSearch.value.toLowerCase();
      return segments.value.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.status && s.status.toLowerCase().includes(q))
      );
    });

    const confirmAssign = async () => {
      if (!selectedSegmentId.value) return;
      try {
        saving.value = true;
        const res = await api.assignSlotSegment(assignSlotId.value, selectedSegmentId.value);
        if (res.success) {
          showAssignModal.value = false;
          await loadSlots();
          if (expandedSlotId.value === assignSlotId.value) {
            await loadSlotDetail(assignSlotId.value);
          }
        }
      } catch (e) {
        error.value = e.message;
      } finally {
        saving.value = false;
      }
    };

    // ==========================================
    // Release Slot
    // ==========================================
    const releaseSlot = async (id) => {
      if (!confirm('Release this slot? All seat assignments will be cleared.')) return;
      try {
        const res = await api.releaseSlot(id);
        if (res.success) {
          await loadSlots();
          if (expandedSlotId.value === id) {
            await loadSlotDetail(id);
          }
        }
      } catch (e) {
        error.value = e.message;
      }
    };

    // ==========================================
    // Seat management
    // ==========================================
    const openSeatModal = (slotId, sNum) => {
      seatSlotId.value = slotId;
      seatNumber.value = sNum;
      seatForm.value = { name: '', email: '' };
      showSeatModal.value = true;
    };

    const confirmAssignSeat = async () => {
      try {
        saving.value = true;
        const res = await api.assignSlotSeat(seatSlotId.value, seatNumber.value, seatForm.value);
        if (res.success) {
          showSeatModal.value = false;
          await loadSlotDetail(seatSlotId.value);
        }
      } catch (e) {
        error.value = e.message;
      } finally {
        saving.value = false;
      }
    };

    const clearSeat = async (slotId, sNum) => {
      try {
        const res = await api.clearSlotSeat(slotId, sNum);
        if (res.success) {
          await loadSlotDetail(slotId);
        }
      } catch (e) {
        error.value = e.message;
      }
    };

    const addSeats = async (slotId) => {
      try {
        const res = await api.addSlotSeats(slotId, 1);
        if (res.success) {
          await loadSlotDetail(slotId);
        }
      } catch (e) {
        error.value = e.message;
      }
    };

    const regenerateRoom = async (slotId) => {
      if (!confirm('Regenerate room? All VDO.ninja URLs will change. OBS browser sources will need to be updated.')) return;
      try {
        const res = await api.regenerateSlotRoom(slotId);
        if (res.success) {
          await loadSlotDetail(slotId);
        }
      } catch (e) {
        error.value = e.message;
      }
    };

    // ==========================================
    // Status helpers
    // ==========================================
    const statusColor = (status) => {
      const map = {
        available: 'bg-green-900/50 text-green-300 border-green-700',
        assigned: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
        recording: 'bg-red-900/50 text-red-300 border-red-700',
        maintenance: 'bg-gray-700 text-gray-400 border-gray-600'
      };
      return map[status] || 'bg-gray-700 text-gray-300';
    };

    onMounted(loadSlots);

    return {
      slots, loading, error, saving,
      showCreateModal, newSlot, createSlot,
      expandedSlotId, detailSlot, detailLoading, toggleExpand,
      deleteSlot,
      showAssignModal, assignSlotId, segments, segmentSearch, segmentLoading,
      selectedSegmentId, filteredSegments, openAssignModal, confirmAssign,
      releaseSlot,
      showSeatModal, seatSlotId, seatNumber, seatForm,
      openSeatModal, confirmAssignSeat, clearSeat, addSeats,
      regenerateRoom,
      statusColor,
      revealedUrls, toggleReveal, maskUrl, copyToClipboard,
      authStore
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100">
      <div class="max-w-6xl mx-auto px-4 py-8">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 class="text-2xl font-bold text-yellow-400">Recording Slots</h1>
            <p class="text-gray-400 text-sm mt-1">Manage OBS recording slots with fixed VDO.ninja rooms and reusable seats</p>
          </div>
          <button @click="showCreateModal = true" class="bg-yellow-500 hover:bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 self-start">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            New Slot
          </button>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
          <span>{{ error }}</span>
          <button @click="error = ''" class="text-red-400 hover:text-red-300">&times;</button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-16">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
        </div>

        <!-- Empty state -->
        <div v-else-if="slots.length === 0" class="text-center py-16 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          <p class="text-lg">No recording slots yet</p>
          <p class="text-sm mt-1">Create a slot to get started with OBS recording management</p>
        </div>

        <!-- Slot list -->
        <div v-else class="space-y-4">
          <div v-for="slot in slots" :key="slot._id" class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <!-- Slot Header (always visible) -->
            <div class="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-750" @click="toggleExpand(slot._id)">
              <div class="flex items-center gap-4 min-w-0">
                <!-- Status badge -->
                <span :class="['px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap', statusColor(slot.status)]">
                  {{ slot.status }}
                </span>
                <div class="min-w-0">
                  <h3 class="text-lg font-semibold text-gray-100 truncate">{{ slot.name }}</h3>
                  <p class="text-sm text-gray-400 truncate">
                    {{ slot.occupiedCount || 0 }}/{{ slot.maxSeats }} seats occupied
                    <template v-if="slot.assignedSegment">
                      &middot; Segment: <span class="text-yellow-400">{{ slot.assignedSegment.title || slot.assignedSegment }}</span>
                    </template>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <!-- Quick actions -->
                <template v-if="slot.status === 'available'">
                  <button @click.stop="openAssignModal(slot._id)" class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition">Assign Segment</button>
                </template>
                <template v-else-if="slot.status === 'assigned'">
                  <button @click.stop="releaseSlot(slot._id)" class="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 px-3 py-1.5 rounded-lg transition">Release</button>
                </template>
                <!-- Expand icon -->
                <svg :class="['w-5 h-5 text-gray-400 transition-transform', expandedSlotId === slot._id ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>

            <!-- Expanded Detail -->
            <div v-if="expandedSlotId === slot._id && detailSlot" class="border-t border-gray-700 px-5 py-5 space-y-6">
              <!-- Loading -->
              <div v-if="detailLoading" class="flex justify-center py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
              </div>
              <template v-else>
                <!-- Description -->
                <p v-if="detailSlot.description" class="text-gray-400 text-sm">{{ detailSlot.description }}</p>

                <!-- Room URLs -->
                <div class="bg-gray-900 rounded-lg p-4 space-y-3">
                  <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Room Configuration</h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span class="text-gray-500">Room ID:</span>
                      <span class="ml-2 text-gray-200 font-mono">{{ detailSlot.roomId }}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">Password:</span>
                      <span class="ml-2 font-mono cursor-pointer" @click="toggleReveal('pwd-' + detailSlot._id)">
                        {{ revealedUrls['pwd-' + detailSlot._id] ? detailSlot.roomPassword : '********' }}
                      </span>
                    </div>
                  </div>
                  <!-- URL rows -->
                  <div v-for="(urlInfo, idx) in [
                    { label: 'Director URL', key: 'dir', url: detailSlot.directorUrl },
                    { label: 'OBS Grid (all participants)', key: 'grid', url: detailSlot.obsGridUrl },
                    { label: 'OBS Auto-Switch (active speaker)', key: 'auto', url: detailSlot.obsAutoSwitchUrl }
                  ]" :key="idx" class="flex items-center gap-2 text-sm">
                    <span class="text-gray-500 w-56 flex-shrink-0">{{ urlInfo.label }}:</span>
                    <code class="text-gray-300 font-mono text-xs truncate flex-1 cursor-pointer" @click="toggleReveal(urlInfo.key + '-' + detailSlot._id)">
                      {{ revealedUrls[urlInfo.key + '-' + detailSlot._id] ? urlInfo.url : maskUrl(urlInfo.url) }}
                    </code>
                    <button @click="copyToClipboard(urlInfo.url)" class="text-gray-500 hover:text-yellow-400 flex-shrink-0" title="Copy">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </button>
                  </div>
                  <div class="flex gap-2 mt-2">
                    <button @click="regenerateRoom(detailSlot._id)" class="text-xs text-gray-400 hover:text-yellow-400 border border-gray-600 hover:border-yellow-600 px-3 py-1 rounded transition">
                      Regenerate Room
                    </button>
                  </div>
                </div>

                <!-- Assigned Segment Info -->
                <div v-if="detailSlot.assignedSegment" class="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-semibold text-blue-300">Assigned Segment</h4>
                      <p class="text-lg text-gray-100 mt-1">{{ detailSlot.assignedSegment.title }}</p>
                      <p class="text-sm text-gray-400">
                        Status: {{ detailSlot.assignedSegment.status }}
                        <template v-if="detailSlot.assignedSegment.scheduledDate"> &middot; {{ new Date(detailSlot.assignedSegment.scheduledDate).toLocaleDateString() }}</template>
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <router-link :to="'/segments/' + detailSlot.assignedSegment._id" class="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg transition">View Segment</router-link>
                      <button @click="releaseSlot(detailSlot._id)" class="text-xs bg-gray-600 hover:bg-red-700 text-gray-200 px-3 py-1.5 rounded-lg transition">Release</button>
                    </div>
                  </div>
                </div>

                <!-- Seats -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Seats ({{ detailSlot.occupiedCount || 0 }}/{{ detailSlot.maxSeats }})</h4>
                    <button v-if="detailSlot.seats.length < 16" @click="addSeats(detailSlot._id)" class="text-xs text-gray-400 hover:text-yellow-400 border border-gray-600 hover:border-yellow-600 px-3 py-1 rounded transition">
                      + Add Seat
                    </button>
                  </div>
                  <div class="space-y-2">
                    <div v-for="seat in detailSlot.seats" :key="seat.seatNumber"
                      :class="['flex items-center gap-3 p-3 rounded-lg border text-sm', seat.occupied ? 'bg-gray-800 border-gray-600' : 'bg-gray-900/50 border-gray-700/50']">
                      <!-- Seat number -->
                      <span :class="['w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0', seat.occupied ? 'bg-yellow-600 text-gray-900' : 'bg-gray-700 text-gray-400']">
                        {{ seat.seatNumber }}
                      </span>
                      <!-- Participant info -->
                      <div class="flex-1 min-w-0">
                        <template v-if="seat.occupied && seat.assignedParticipant?.name">
                          <span class="text-gray-100 font-medium">{{ seat.assignedParticipant.name }}</span>
                          <span v-if="seat.assignedParticipant.email" class="text-gray-500 text-xs ml-2">{{ seat.assignedParticipant.email }}</span>
                        </template>
                        <span v-else class="text-gray-500 italic">Empty</span>
                      </div>
                      <!-- Seat URLs -->
                      <div class="flex items-center gap-1 flex-shrink-0">
                        <button @click="copyToClipboard(seat.joinUrl)" class="text-gray-500 hover:text-green-400 p-1" title="Copy Join URL">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                        </button>
                        <button @click="copyToClipboard(seat.viewUrl)" class="text-gray-500 hover:text-blue-400 p-1" title="Copy View URL (OBS)">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        </button>
                      </div>
                      <!-- Seat actions -->
                      <div class="flex items-center gap-1 flex-shrink-0">
                        <button v-if="!seat.occupied" @click="openSeatModal(detailSlot._id, seat.seatNumber)" class="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition">
                          Assign
                        </button>
                        <button v-else @click="clearSeat(detailSlot._id, seat.seatNumber)" class="text-xs bg-gray-700 hover:bg-red-800 text-gray-300 px-2 py-1 rounded transition">
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Slot actions footer -->
                <div class="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div class="text-xs text-gray-500">
                    Created {{ new Date(detailSlot.createdAt).toLocaleDateString() }}
                    <template v-if="detailSlot.createdBy"> by {{ detailSlot.createdBy.firstName }} {{ detailSlot.createdBy.lastName }}</template>
                  </div>
                  <div class="flex gap-2">
                    <button v-if="detailSlot.status === 'available'" @click="openAssignModal(detailSlot._id)" class="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition">Assign Segment</button>
                    <button v-if="authStore.isAdmin.value && (detailSlot.status === 'available' || detailSlot.status === 'maintenance')"
                      @click="deleteSlot(detailSlot._id)"
                      class="text-sm bg-red-800 hover:bg-red-700 text-red-200 px-4 py-2 rounded-lg transition">
                      Delete Slot
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Slot Modal -->
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" @click="showCreateModal = false"></div>
        <div class="relative bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-100">Create Recording Slot</h2>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Name *</label>
            <input v-model="newSlot.name" type="text" placeholder="e.g. Studio A" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-yellow-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Description</label>
            <input v-model="newSlot.description" type="text" placeholder="Optional description" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-yellow-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Number of Seats</label>
            <select v-model.number="newSlot.maxSeats" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-yellow-500 focus:outline-none">
              <option v-for="n in 16" :key="n" :value="n">{{ n }} seats</option>
            </select>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button @click="showCreateModal = false" class="px-4 py-2 text-gray-400 hover:text-gray-200 transition">Cancel</button>
            <button @click="createSlot" :disabled="saving || !newSlot.name" class="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 px-5 py-2 rounded-lg font-semibold transition">
              {{ saving ? 'Creating...' : 'Create Slot' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Assign Segment Modal -->
      <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" @click="showAssignModal = false"></div>
        <div class="relative bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg p-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-100">Assign Segment to Slot</h2>
          <div>
            <input v-model="segmentSearch" type="text" placeholder="Search segments..." class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-yellow-500 focus:outline-none">
          </div>
          <div v-if="segmentLoading" class="text-center py-4 text-gray-500">Loading segments...</div>
          <div v-else class="max-h-64 overflow-y-auto space-y-1">
            <div v-for="seg in filteredSegments" :key="seg._id"
              @click="selectedSegmentId = seg._id"
              :class="['flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition',
                selectedSegmentId === seg._id ? 'bg-blue-900/50 border border-blue-700' : 'hover:bg-gray-700 border border-transparent']">
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-100 truncate">{{ seg.title }}</p>
                <p class="text-xs text-gray-500">{{ seg.status }} &middot; {{ seg.productionType }}</p>
              </div>
              <svg v-if="selectedSegmentId === seg._id" class="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button @click="showAssignModal = false" class="px-4 py-2 text-gray-400 hover:text-gray-200 transition">Cancel</button>
            <button @click="confirmAssign" :disabled="saving || !selectedSegmentId" class="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold transition">
              {{ saving ? 'Assigning...' : 'Assign Segment' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Assign Seat Modal -->
      <div v-if="showSeatModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" @click="showSeatModal = false"></div>
        <div class="relative bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6 space-y-4">
          <h2 class="text-lg font-bold text-gray-100">Assign Seat {{ seatNumber }}</h2>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Name *</label>
            <input v-model="seatForm.name" type="text" placeholder="Participant name" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-yellow-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Email</label>
            <input v-model="seatForm.email" type="email" placeholder="Optional email" class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-yellow-500 focus:outline-none">
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button @click="showSeatModal = false" class="px-4 py-2 text-gray-400 hover:text-gray-200 transition">Cancel</button>
            <button @click="confirmAssignSeat" :disabled="saving || !seatForm.name" class="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 px-5 py-2 rounded-lg font-semibold transition">
              {{ saving ? 'Assigning...' : 'Assign Seat' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
