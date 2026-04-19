import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'RecordingNotificationBanner',
  setup() {
    const router = useRouter();
    const sessions = ref([]);
    const loading = ref(true);

    // Saved recordings tracked in localStorage
    const savedRecordings = ref([]);

    const loadSavedRecordings = () => {
      try {
        savedRecordings.value = JSON.parse(localStorage.getItem('vs_saved_recordings') || '[]');
      } catch (e) {
        savedRecordings.value = [];
      }
    };

    const dismissSavedRecording = (index) => {
      savedRecordings.value.splice(index, 1);
      localStorage.setItem('vs_saved_recordings', JSON.stringify(savedRecordings.value));
    };

    const clearAllSavedRecordings = () => {
      savedRecordings.value = [];
      localStorage.removeItem('vs_saved_recordings');
    };

    const goToUpload = (sessionId) => {
      router.push('/recording/' + sessionId + '?tab=upload');
    };

    onMounted(async () => {
      await loadSessions();
      loadSavedRecordings();
    });

    const loadSessions = async () => {
      try {
        const response = await window.api.getMySessions();
        if (response.success) {
          sessions.value = response.data.sessions || [];
        }
      } catch (error) {
        console.error('Error loading recording sessions:', error);
      } finally {
        loading.value = false;
      }
    };

    // Pick the best session to feature: prefer unlimited, then the one with most remaining
    const primarySession = computed(() => {
      const active = sessions.value.filter(s => s.status === 'active');
      if (active.length === 0) return null;

      // Prefer unlimited first
      const unlimited = active.find(s => s.sessionType === 'unlimited');
      if (unlimited) return unlimited;

      // Then the one with the most recordings remaining
      return active.sort((a, b) => {
        const remA = a.maxRecordings - a.recordingsCompleted;
        const remB = b.maxRecordings - b.recordingsCompleted;
        return remB - remA;
      })[0];
    });

    // Total remaining across all limited sessions (non-unlimited)
    const limitedSessions = computed(() => {
      return sessions.value.filter(s => s.status === 'active' && s.sessionType !== 'unlimited');
    });

    const totalRemaining = computed(() => {
      return limitedSessions.value.reduce((sum, s) => sum + (s.maxRecordings - s.recordingsCompleted), 0);
    });

    const hasUnlimited = computed(() => {
      return sessions.value.some(s => s.status === 'active' && s.sessionType === 'unlimited');
    });

    const startRecording = (sessionId) => {
      router.push(`/recording/${sessionId}`);
    };

    const getMessage = () => {
      if (hasUnlimited.value) {
        return 'You have unlimited recording access!';
      }
      const session = primarySession.value;
      if (!session) return '';

      if (session.sessionType === 'one-time') {
        return 'You were selected to share your story! Record one video to participate.';
      }
      if (session.sessionType === 'time-limited') {
        return `You have recording access until ${new Date(session.expiresAt).toLocaleDateString()}`;
      }
      return 'You have a recording session available!';
    };

    const getRemainingText = () => {
      if (hasUnlimited.value) {
        // If they also have limited sessions, mention those too
        if (limitedSessions.value.length > 0) {
          return `Unlimited recordings + ${totalRemaining.value} additional from other sessions`;
        }
        return 'Record as many times as you need';
      }
      const remaining = totalRemaining.value;
      if (remaining === 1) return '1 recording remaining';
      return `${remaining} recordings remaining`;
    };

    return {
      sessions,
      loading,
      primarySession,
      hasUnlimited,
      totalRemaining,
      startRecording,
      getMessage,
      getRemainingText,
      savedRecordings,
      dismissSavedRecording,
      clearAllSavedRecordings,
      goToUpload
    };
  },
  template: `
    <div>
      <!-- Active recording session banner -->
      <div v-if="!loading && primarySession" class="mb-6">
        <div class="rounded-lg p-4 md:p-6 border-l-4 bg-green-900/30 border-green-500 text-green-100">
          <div class="flex items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-base md:text-lg truncate">
                <span class="mr-1">&#x1F3AC;</span> {{ getMessage() }}
              </p>
              <p class="text-sm text-green-300/80 mt-1">{{ getRemainingText() }}</p>
              <p v-if="primarySession.purpose" class="text-sm text-gray-400 mt-0.5">{{ primarySession.purpose }}</p>
            </div>
            <button
              @click="startRecording(primarySession._id)"
              class="flex-shrink-0 bg-green-500 hover:bg-green-400 text-gray-900 font-bold py-2 px-4 md:px-6 rounded-lg transition whitespace-nowrap min-h-[44px] flex items-center"
            >
              Record Now &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Saved recordings reminder banner -->
      <div v-if="savedRecordings.length > 0" class="mb-6">
        <div class="rounded-lg p-4 md:p-6 border-l-4 bg-blue-900/30 border-blue-500 text-blue-100">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-base md:text-lg">
                &#x1F4BE; You have {{ savedRecordings.length }} saved recording{{ savedRecordings.length > 1 ? 's' : '' }} to upload
              </p>
              <p class="text-sm text-blue-300/80 mt-1">
                These recordings were saved to your Downloads folder. Use the Upload option in the Recording Studio to submit them.
              </p>
              <ul class="mt-2 space-y-1">
                <li v-for="(rec, i) in savedRecordings" :key="i" class="text-sm text-gray-400 flex items-center gap-2">
                  <span>{{ rec.mediaType === 'audio' ? '&#x1F399;' : '&#x1F3AC;' }}</span>
                  <span class="truncate">{{ rec.filename }}</span>
                  <span class="text-gray-500 flex-shrink-0">&#8212; {{ new Date(rec.timestamp).toLocaleDateString() }}</span>
                  <button @click="dismissSavedRecording(i)" class="text-gray-500 hover:text-red-400 ml-1 flex-shrink-0" title="Dismiss">&#x2715;</button>
                </li>
              </ul>
            </div>
            <div class="flex flex-col gap-2 flex-shrink-0">
              <button
                v-if="primarySession"
                @click="goToUpload(primarySession._id)"
                class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 md:px-6 rounded-lg transition whitespace-nowrap min-h-[44px] flex items-center">
                Upload Now &rarr;
              </button>
              <button
                @click="clearAllSavedRecordings"
                class="text-gray-400 hover:text-gray-200 text-xs text-center transition">
                Dismiss all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
