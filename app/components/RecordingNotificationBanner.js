import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'RecordingNotificationBanner',
  setup() {
    const router = useRouter();
    const sessions = ref([]);
    const loading = ref(true);

    onMounted(async () => {
      await loadSessions();
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

    const startRecording = (sessionId) => {
      router.push(`/recording/${sessionId}`);
    };

    const getMessage = (session) => {
      switch (session.sessionType) {
        case 'one-time':
          return 'You were selected to share your story! Record one video to participate.';
        case 'time-limited':
          return `You were granted permission to record! Available until ${new Date(session.expiresAt).toLocaleDateString()}`;
        case 'unlimited':
          return 'You were granted permission to record multiple videos!';
        default:
          return 'You have a recording session available!';
      }
    };

    return {
      sessions,
      loading,
      startRecording,
      getMessage
    };
  },
  template: `
    <div v-if="!loading && sessions.length > 0" class="mb-6">
      <div
        v-for="session in sessions"
        :key="session._id"
        :class="[
          'rounded-lg p-4 md:p-6 border-l-4 flex items-center justify-between gap-4',
          session.status === 'active'
            ? 'bg-green-900/30 border-green-500 text-green-100'
            : 'bg-gray-700/30 border-gray-500 text-gray-300'
        ]"
      >
        <div class="flex-1">
          <p class="font-semibold text-base md:text-lg">🎬 {{ getMessage(session) }}</p>
          <p v-if="session.purpose" class="text-sm text-gray-300 mt-1">{{ session.purpose }}</p>
        </div>
        <button
          v-if="session.status === 'active'"
          @click="startRecording(session._id)"
          class="flex-shrink-0 bg-green-500 hover:bg-green-400 text-gray-900 font-bold py-2 px-4 md:px-6 rounded-lg transition whitespace-nowrap min-h-[44px] flex items-center"
        >
          Record Now →
        </button>
        <div v-else class="flex-shrink-0 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm font-semibold">
          {{ session.status }}
        </div>
      </div>
    </div>
  `
};
