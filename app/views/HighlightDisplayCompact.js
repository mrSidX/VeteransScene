import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api.js';

export default {
  name: 'HighlightDisplayCompact',
  setup() {
    const route = useRoute();
    const highlight = ref(null);
    const loading = ref(true);
    const error = ref('');

    const fetchHighlight = async () => {
      try {
        const highlightId = route.params.id;
        const response = await api.getHighlightById(highlightId);
        if (response.success) {
          highlight.value = response.data.highlight;
        }
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const parseContent = (content) => {
      if (!content) return [];
      const lines = content.split('\n').filter(l => l.trim());
      return lines.slice(0, 8); // Limit to first 8 lines for compact view
    };

    onMounted(() => {
      fetchHighlight();
    });

    return { highlight, loading, error, parseContent };
  },
  template: `
    <div class="h-full bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>

      <!-- Main Content -->
      <div v-else-if="highlight && !error" class="h-full flex flex-col">
        <!-- Header with Image -->
        <div class="flex gap-4 mb-4 pb-4 border-b border-yellow-400/50">
          <!-- Portrait Image (small) -->
          <div v-if="highlight.media && highlight.media.profileImage && highlight.media.profileImage.url" class="flex-shrink-0">
            <img
              :src="highlight.media.profileImage.url"
              :alt="highlight.media.profileImage.altText || highlight.title"
              class="w-32 h-40 object-cover rounded-lg shadow-lg border-2 border-yellow-400/50"
            >
          </div>

          <!-- Title -->
          <div class="flex-grow">
            <h2 class="text-3xl font-bold text-white">{{ highlight.title }}</h2>
            <p v-if="highlight.subtitle" class="text-lg text-yellow-400 mt-1">{{ highlight.subtitle }}</p>
            <div v-if="highlight.personInfo" class="text-xs text-gray-400 mt-2 space-y-1">
              <p v-if="highlight.personInfo.rank">{{ highlight.personInfo.rank }}</p>
              <p v-if="highlight.personInfo.branch">{{ highlight.personInfo.branch }}</p>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-grow overflow-hidden">
          <div v-if="highlight.aiContent" class="space-y-3">
            <div v-for="(line, index) in parseContent(highlight.aiContent)" :key="index">
              <p class="text-lg leading-relaxed text-gray-100">{{ line }}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="highlight.tags && highlight.tags.length > 0" class="mt-4 pt-4 border-t border-yellow-400/30 flex gap-2 flex-wrap">
          <span v-for="tag in highlight.tags.slice(0, 3)" :key="tag" class="px-2 py-1 bg-yellow-400/10 text-yellow-400 text-xs">
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- Error -->
      <div v-else class="flex items-center justify-center h-full">
        <p class="text-gray-400">{{ error || 'No content' }}</p>
      </div>
    </div>
  `
};
