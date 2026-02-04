import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api.js';

export default {
  name: 'HighlightDisplayPremium',
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
      } finally {
        loading.value = false;
      }
    };

    const parseContent = (content) => {
      if (!content) return [];
      return content.split('\n\n').filter(p => p.trim());
    };

    onMounted(() => {
      fetchHighlight();
    });

    return { highlight, loading, error, parseContent };
  },
  template: `
    <div class="h-screen bg-black text-white flex flex-col p-0">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center h-full">
        <p class="text-red-400 text-2xl">Error: {{ error }}</p>
      </div>

      <!-- Main Display -->
      <div v-else-if="highlight" class="flex flex-col h-full justify-between p-12">
        <!-- Top Section: Image and Title Bar -->
        <div class="flex gap-12 items-start mb-8">
          <!-- Portrait Image -->
          <div v-if="highlight.media && highlight.media.profileImage && highlight.media.profileImage.url" class="flex-shrink-0">
            <img
              :src="highlight.media.profileImage.url"
              :alt="highlight.media.profileImage.altText || highlight.title"
              class="w-72 h-96 object-cover rounded-xl shadow-2xl border-4 border-yellow-400"
            >
          </div>

          <!-- Title and Info -->
          <div class="flex-grow">
            <div class="border-l-8 border-yellow-400 pl-8 py-4">
              <h1 class="text-7xl font-black text-white mb-3 tracking-tight">
                {{ highlight.title }}
              </h1>
              <div v-if="highlight.subtitle" class="text-3xl text-yellow-400 font-light mb-4">
                {{ highlight.subtitle }}
              </div>

              <!-- Person Info -->
              <div v-if="highlight.personInfo" class="space-y-2 text-gray-300 text-lg mt-6">
                <p v-if="highlight.personInfo.rank" class="text-xl font-semibold">
                  {{ highlight.personInfo.rank }}
                </p>
                <p v-if="highlight.personInfo.branch" class="text-lg">
                  {{ highlight.personInfo.branch }}
                </p>
                <p v-if="highlight.personInfo.yearsOfService && highlight.personInfo.yearsOfService.start" class="text-lg">
                  Service: {{ highlight.personInfo.yearsOfService.start }}<span v-if="highlight.personInfo.yearsOfService.end">-{{ highlight.personInfo.yearsOfService.end }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Middle Section: Content -->
        <div class="flex-grow overflow-hidden mb-8">
          <div v-if="highlight.aiContent" class="space-y-6">
            <div v-for="(paragraph, index) in parseContent(highlight.aiContent)" :key="index">
              <p class="text-2xl leading-relaxed text-gray-100 font-light">
                {{ paragraph }}
              </p>
            </div>
          </div>
        </div>

        <!-- Bottom Section: Tags and Branding -->
        <div class="flex items-end justify-between border-t border-yellow-400/30 pt-8">
          <div v-if="highlight.tags && highlight.tags.length > 0" class="flex gap-3 flex-wrap">
            <span v-for="tag in highlight.tags" :key="tag" class="px-3 py-1 bg-yellow-400/20 text-yellow-300 text-sm font-medium">
              {{ tag }}
            </span>
          </div>
          <div class="text-right text-gray-500 text-sm">
            Veteran's Scene
          </div>
        </div>
      </div>
    </div>
  `
};
