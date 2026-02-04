export default {
  name: 'InfoHelper',
  props: {
    topicSlug: String,
    title: String,
    content: String,
    videoUrl: String,
    trigger: {
      type: String,
      default: 'icon',
      validator: v => ['icon', 'button', 'link'].includes(v)
    },
    position: {
      type: String,
      default: 'modal',
      validator: v => ['modal', 'tooltip', 'inline'].includes(v)
    },
    iconType: {
      type: String,
      default: 'info',
      validator: v => ['info', 'help', 'question', 'video'].includes(v)
    },
    size: {
      type: String,
      default: 'md',
      validator: v => ['sm', 'md', 'lg'].includes(v)
    },
    buttonText: {
      type: String,
      default: 'Help'
    }
  },
  data() {
    return {
      showModal: false,
      showTooltip: false,
      showInline: false,
      loading: false,
      error: null,
      helpData: null,
      videoEmbedId: null
    };
  },
  computed: {
    displayTitle() {
      return this.helpData?.title || this.title;
    },
    displayContent() {
      return this.helpData?.content || this.content;
    },
    displayVideoUrl() {
      return this.helpData?.videoUrl || this.videoUrl;
    },
    displayVideoEmbedId() {
      return this.helpData?.videoEmbedId || this.videoEmbedId;
    },
    displayIcon() {
      return this.helpData?.icon || this.iconType;
    },
    iconSizes() {
      return { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
    },
    buttonSizeClass() {
      const sizes = { sm: 'px-2 py-1 text-xs', md: 'px-3 py-2 text-sm', lg: 'px-4 py-2 text-base' };
      return sizes[this.size] || sizes.md;
    }
  },
  methods: {
    getIconSvg(type) {
      const icons = {
        info: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        help: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        question: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        video: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
      };
      return icons[type] || icons.info;
    },
    async fetchHelpTopic() {
      if (!this.topicSlug || this.helpData) return;

      this.loading = true;
      this.error = null;
      try {
        const response = await window.api.getHelpTopic(this.topicSlug, { recordView: 'true' });
        if (response.success) {
          this.helpData = response.data;
          this.videoEmbedId = response.data.videoEmbedId;
        }
      } catch (err) {
        this.error = err.message || 'Failed to load help topic';
        console.error('Help topic fetch error:', err);
      } finally {
        this.loading = false;
      }
    },
    extractVideoId(url) {
      if (!url) return null;
      const youtubeIdRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
      const match = url.match(youtubeIdRegex);
      return match && match[1] ? match[1] : null;
    },
    openModal() {
      this.fetchHelpTopic();
      if (this.position === 'modal') {
        this.showModal = true;
      } else if (this.position === 'tooltip') {
        this.showTooltip = true;
      } else if (this.position === 'inline') {
        this.showInline = !this.showInline;
      }
    },
    closeModal() {
      this.showModal = false;
    },
    closeTooltip() {
      this.showTooltip = false;
    },
    handleKeyDown(e) {
      if (e.key === 'Escape' && this.showModal) {
        this.closeModal();
      }
    }
  },
  mounted() {
    // Extract video ID if videoUrl provided
    if (this.videoUrl && !this.videoEmbedId) {
      this.videoEmbedId = this.extractVideoId(this.videoUrl);
    }
    document.addEventListener('keydown', this.handleKeyDown);
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  },
  template: `
    <div class="inline-flex items-center">
      <!-- Trigger Button/Icon -->
      <button
        v-if="trigger === 'icon'"
        @click="openModal"
        class="inline-flex items-center justify-center rounded-full border border-blue-400/50 hover:border-blue-300 bg-blue-50/10 hover:bg-blue-50/20 text-blue-400 hover:text-blue-300 transition-all hover:shadow-md hover:shadow-blue-400/20 group relative cursor-help"
        :class="[iconSizes[size]]"
        type="button"
        :title="displayTitle || 'Click for help'"
      >
        <!-- Small info indicator -->
        <span class="text-xs font-bold leading-none group-hover:scale-110 transition-transform">?</span>

        <!-- Tooltip on hover -->
        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-gray-700 shadow-lg">
          {{ displayTitle || 'Help' }}
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
      </button>

      <button
        v-else-if="trigger === 'button'"
        @click="openModal"
        class="inline-flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
        :class="[buttonSizeClass]"
        type="button"
      >
        <div :class="[iconSizes[size]]" v-html="getIconSvg(displayIcon)"></div>
        <span>{{ buttonText }}</span>
      </button>

      <button
        v-else-if="trigger === 'link'"
        @click="openModal"
        class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline transition-colors text-sm"
        type="button"
      >
        <div :class="[iconSizes.sm]" v-html="getIconSvg(displayIcon)"></div>
        <span>{{ buttonText }}</span>
      </button>

      <!-- Modal Display -->
      <div
        v-if="showModal && position === 'modal'"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <div class="bg-gray-800 text-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
          <!-- Header -->
          <div class="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-2xl font-bold">{{ displayTitle || 'Help' }}</h2>
            <button
              @click="closeModal"
              class="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              type="button"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-4">
            <div v-if="loading" class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>

            <div v-else-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
              {{ error }}
            </div>

            <div v-else>
              <!-- Content Text -->
              <div class="text-gray-300 whitespace-pre-wrap mb-6 leading-relaxed">
                {{ displayContent }}
              </div>

              <!-- Video Embed -->
              <div v-if="displayVideoEmbedId" class="mb-6">
                <h3 class="text-lg font-semibold text-white mb-3">Video Tutorial</h3>
                <div class="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                  <iframe
                    :src="'https://www.youtube.com/embed/' + displayVideoEmbedId"
                    class="w-full h-full"
                    allowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex justify-end">
            <button
              @click="closeModal"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- Tooltip Display -->
      <div
        v-if="showTooltip && position === 'tooltip'"
        class="fixed bg-gray-900 text-white rounded-lg p-4 max-w-xs border border-gray-700 shadow-xl z-50 ml-2"
        style="min-width: 300px;"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold text-white mb-2">{{ displayTitle || 'Help' }}</h3>
            <p class="text-gray-300 text-sm leading-relaxed">{{ displayContent }}</p>
          </div>
          <button
            @click="closeTooltip"
            class="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Inline Display -->
      <div v-if="position === 'inline'" class="w-full">
        <button
          @click="showInline = !showInline"
          class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium mb-2"
          type="button"
        >
          <div :class="[iconSizes.sm]" v-html="getIconSvg(displayIcon)"></div>
          <span>{{ showInline ? 'Hide Help' : 'Show Help' }}</span>
        </button>

        <div v-if="showInline" class="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-4">
          <div v-if="loading" class="flex items-center justify-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>

          <div v-else-if="error" class="text-red-400 text-sm">
            {{ error }}
          </div>

          <div v-else>
            <h3 class="font-semibold text-blue-200 mb-2">{{ displayTitle || 'Help' }}</h3>
            <p class="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {{ displayContent }}
            </p>
            <div v-if="displayVideoEmbedId" class="mt-4">
              <a
                :href="'https://youtu.be/' + displayVideoEmbedId"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Watch Video Tutorial →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
