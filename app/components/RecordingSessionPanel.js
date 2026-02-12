import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'RecordingSessionPanel',
  setup() {
    const router = useRouter();
    const sessions = ref([]);
    const loading = ref(true);
    const hasActiveSessions = ref(false);

    onMounted(async () => {
      await loadSessions();
    });

    const loadSessions = async () => {
      loading.value = true;
      try {
        const response = await window.api.getMySessions();
        if (response.success) {
          sessions.value = response.data.sessions || [];
          hasActiveSessions.value = sessions.value.some(s => s.status === 'active');
        }
      } catch (error) {
        console.error('Error loading recording sessions:', error);
      } finally {
        loading.value = false;
      }
    };

    const startRecording = (sessionId) => {
      router.push(`/recording/${sessionId}`);
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'active': return 'bg-green-900 text-green-200';
        case 'expired': return 'bg-red-900 text-red-200';
        case 'completed': return 'bg-blue-900 text-blue-200';
        default: return 'bg-gray-700 text-gray-300';
      }
    };

    const getStatusLabel = (status) => {
      switch (status) {
        case 'active': return '✓ Active';
        case 'expired': return '✗ Expired';
        case 'completed': return '✓ Completed';
        default: return status;
      }
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    return {
      sessions,
      loading,
      hasActiveSessions,
      startRecording,
      getStatusColor,
      getStatusLabel,
      formatDate,
      loadSessions
    };
  },
  template: `
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-yellow-400 flex items-center gap-2">
          🎥 Recording Sessions
        </h2>
        <button
          @click="loadSessions"
          class="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
        >
          Refresh
        </button>
      </div>

      <!-- No Sessions -->
      <div v-if="!loading && sessions.length === 0" class="text-center py-6">
        <p class="text-gray-400 mb-3">No recording sessions yet</p>
        <p class="text-sm text-gray-500">
          An administrator will grant you access to record videos. Once you have access, you'll see your sessions here.
        </p>
      </div>

      <!-- Sessions List -->
      <div v-else-if="!loading && sessions.length > 0" class="space-y-3">
        <div
          v-for="session in sessions"
          :key="session._id"
          class="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-yellow-400 transition"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <p class="font-semibold text-gray-100">{{ session.description || 'Recording Session' }}</p>
              <p class="text-sm text-gray-400">{{ session.purpose }}</p>
            </div>
            <span :class="['text-xs font-semibold px-2 py-1 rounded', getStatusColor(session.status)]">
              {{ getStatusLabel(session.status) }}
            </span>
          </div>

          <!-- Session Info -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400 mb-3">
            <div>
              <p class="text-gray-500">Type</p>
              <p class="font-semibold text-gray-200">{{ session.sessionType }}</p>
            </div>
            <div v-if="session.sessionType === 'time-limited'">
              <p class="text-gray-500">Expires</p>
              <p class="font-semibold text-gray-200">{{ formatDate(session.expiresAt) }}</p>
            </div>
            <div v-else-if="session.sessionType === 'one-time'">
              <p class="text-gray-500">Max Videos</p>
              <p class="font-semibold text-gray-200">{{ session.maxRecordings || 1 }}</p>
            </div>
            <div>
              <p class="text-gray-500">Created</p>
              <p class="font-semibold text-gray-200">{{ formatDate(session.createdAt) }}</p>
            </div>
          </div>

          <!-- Recording Progress -->
          <div v-if="session.recordingCount" class="mb-3">
            <p class="text-xs text-gray-500 mb-1">Recordings: {{ session.recordingCount }}/{{ session.maxRecordings || 'unlimited' }}</p>
            <div class="w-full bg-gray-600 rounded-full h-2">
              <div
                class="bg-yellow-400 h-2 rounded-full"
                :style="{ width: session.maxRecordings ? `${(session.recordingCount / session.maxRecordings) * 100}%` : '0%' }"
              ></div>
            </div>
          </div>

          <!-- Action Button -->
          <button
            v-if="session.status === 'active'"
            @click="startRecording(session._id)"
            class="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold py-2 px-4 rounded transition"
          >
            Start Recording
          </button>
          <button
            v-else
            disabled
            class="w-full bg-gray-600 text-gray-400 font-semibold py-2 px-4 rounded cursor-not-allowed"
          >
            Session {{ session.status }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else class="text-center py-6">
        <p class="text-gray-400">Loading sessions...</p>
      </div>
    </div>
  `
};
