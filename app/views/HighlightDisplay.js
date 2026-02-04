import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api.js';

export default {
  name: 'HighlightDisplay',
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
        } else {
          error.value = 'Highlight not found';
        }
      } catch (err) {
        error.value = err.message || 'Failed to load highlight';
        console.error('Error loading highlight:', err);
      } finally {
        loading.value = false;
      }
    };

    const parseContent = (content) => {
      if (!content) return [];
      // Split by double newlines to get paragraphs
      return content.split('\n\n').filter(p => p.trim());
    };

    onMounted(() => {
      fetchHighlight();
    });

    return {
      highlight,
      loading,
      error,
      parseContent
    };
  },
  template: `
    <div class="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8 flex flex-col justify-center">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p class="text-gray-400 text-lg">Loading highlight...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="text-red-400 text-2xl mb-2">⚠️ Error</p>
          <p class="text-gray-400">{{ error }}</p>
        </div>
      </div>

      <!-- Main Display -->
      <div v-else-if="highlight" class="max-w-4xl mx-auto w-full">
        <!-- Image and Text Container -->
        <div class="flex gap-12 items-start mb-12">
          <!-- Portrait Image (if available) -->
          <div v-if="highlight.media && highlight.media.profileImage && highlight.media.profileImage.url" class="flex-shrink-0">
            <img
              :src="highlight.media.profileImage.url"
              :alt="highlight.media.profileImage.altText || highlight.title"
              class="w-64 h-80 object-cover rounded-lg shadow-2xl border-4 border-yellow-400/50"
            >
          </div>

          <!-- Header Section -->
          <div class="flex-grow border-b border-yellow-400/30 pb-8">
            <!-- Person/Title -->
            <h1 class="text-5xl font-bold text-white mb-2 drop-shadow-lg">
              {{ highlight.title }}
            </h1>

            <!-- Subtitle if present -->
            <p v-if="highlight.subtitle" class="text-2xl text-yellow-400 font-light mb-4">
              {{ highlight.subtitle }}
            </p>

            <!-- Person Info if available -->
            <div v-if="highlight.personInfo" class="space-y-1 text-gray-300 text-sm">
              <p v-if="highlight.personInfo.rank">
                <span class="font-semibold">Rank:</span> {{ highlight.personInfo.rank }}
              </p>
              <p v-if="highlight.personInfo.branch">
                <span class="font-semibold">Branch:</span> {{ highlight.personInfo.branch }}
              </p>
              <p v-if="highlight.personInfo.yearsOfService && highlight.personInfo.yearsOfService.start">
                <span class="font-semibold">Service:</span>
                {{ highlight.personInfo.yearsOfService.start }}<span v-if="highlight.personInfo.yearsOfService.end">-{{ highlight.personInfo.yearsOfService.end }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Content Sections -->
        <div v-if="highlight.aiContent" class="space-y-8 mb-12">
          <!-- Main Content -->
          <div class="prose prose-invert max-w-none">
            <div v-for="(paragraph, index) in parseContent(highlight.aiContent)" :key="index" class="mb-6">
              <p class="text-xl leading-relaxed text-gray-100 font-light">
                {{ paragraph }}
              </p>
            </div>
          </div>
        </div>

        <!-- Metadata Footer -->
        <div v-if="highlight.tags && highlight.tags.length > 0" class="mt-12 pt-8 border-t border-yellow-400/20 flex gap-3 flex-wrap justify-center">
          <span v-for="tag in highlight.tags" :key="tag" class="px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full text-sm text-yellow-300">
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex items-center justify-center h-full">
        <p class="text-gray-400 text-lg">No highlight content available</p>
      </div>
    </div>
  `
};
