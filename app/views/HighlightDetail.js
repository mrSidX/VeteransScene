import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';
import HighlightMediaManager from '../components/HighlightMediaManager.js';
import FollowButton from '../components/FollowButton.js';

export default {
  name: 'HighlightDetail',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    const highlightId = route.params.id;
    const highlight = ref(null);
    const loading = ref(true);
    const saving = ref(false);
    const error = ref('');
    const success = ref('');
    const activeTab = ref('basic');
    const isEditing = ref(false);
    const aiFetching = ref(false);
    const aiFetchError = ref('');

    // Form data for editing
    const editForm = ref({
      title: '',
      type: '',
      description: '',
      category: '',
      priority: '',
      status: '',
      personInfo: {},
      manualLinks: [],
      tags: [],
      displaySettings: {}
    });

    // Unsaved changes tracking
    const hasChanges = ref(false);
    const originalEditForm = ref(null);
    const navigationBlocked = ref(false);

    // Unsaved changes detection methods
    const handleBeforeUnload = (e) => {
      if (hasChanges.value && !navigationBlocked.value) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const setupUnsavedChangesDetection = () => {
      window.addEventListener('beforeunload', handleBeforeUnload);
    };

    const setupRouterGuard = () => {
      return router.beforeEach((to, from, next) => {
        if (hasChanges.value && from.path !== to.path) {
          const proceed = confirm('You have unsaved changes on this highlight. Do you want to leave without saving?\n\nClick OK to discard changes, or Cancel to stay on this page.');
          if (proceed) {
            navigationBlocked.value = true;
            next();
          } else {
            next(false);
          }
        } else {
          next();
        }
      });
    };

    const fetchHighlight = async () => {
      loading.value = true;
      error.value = '';
      try {
        const response = await api.getHighlightById(highlightId);
        if (response.success) {
          highlight.value = response.data.highlight;
          initEditForm();
        } else {
          error.value = response.message || 'Failed to load highlight';
        }
      } catch (err) {
        error.value = err.message || 'Error loading highlight';
        console.error('Error:', err);
      } finally {
        loading.value = false;
      }
    };

    const initEditForm = () => {
      if (!highlight.value) return;
      editForm.value = {
        title: highlight.value.title,
        type: highlight.value.type,
        description: highlight.value.description,
        category: highlight.value.category,
        priority: highlight.value.priority,
        status: highlight.value.status,
        personInfo: { ...highlight.value.personInfo },
        manualLinks: [...(highlight.value.manualLinks || [])],
        tags: [...(highlight.value.tags || [])],
        displaySettings: { ...highlight.value.displaySettings }
      };
    };

    const triggerAiFetch = async () => {
      if (!confirm('Fetch content from Grok AI? This may take a minute...')) return;

      aiFetching.value = true;
      aiFetchError.value = '';

      try {
        const response = await api.triggerHighlightAiFetch(highlightId, {
          title: editForm.value.title,
          description: editForm.value.description
        });

        if (response.success) {
          // Poll for status updates
          await pollAiFetchStatus();
        } else {
          aiFetchError.value = response.message || 'Failed to start AI fetch';
        }
      } catch (err) {
        aiFetchError.value = err.message || 'Error starting AI fetch';
        console.error('Error:', err);
      } finally {
        aiFetching.value = false;
      }
    };

    const pollAiFetchStatus = async () => {
      const maxAttempts = 60; // 2 minutes with 2-second intervals
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        try {
          const response = await api.getHighlightById(highlightId);
          if (response.success) {
            const updated = response.data.highlight;

            if (updated.status === 'ai-fetched') {
              highlight.value = updated;
              initEditForm();
              success.value = 'AI content fetched successfully!';
              activeTab.value = 'ai-content';
              break;
            } else if (updated.status === 'draft') {
              aiFetchError.value = updated.aiContent?.fetchError || 'AI fetch failed';
              break;
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        aiFetchError.value = 'AI fetch timed out. Please check back later.';
      }
    };

    const saveHighlight = async () => {
      if (!editForm.value.title.trim()) {
        error.value = 'Title is required';
        return;
      }

      saving.value = true;
      error.value = '';
      success.value = '';

      try {
        const response = await api.updateHighlight(highlightId, editForm.value);
        if (response.success) {
          highlight.value = response.data.highlight;
          success.value = 'Highlight saved successfully!';
          isEditing.value = false;
          setTimeout(() => { success.value = ''; }, 3000);
        } else {
          error.value = response.message || 'Failed to save highlight';
        }
      } catch (err) {
        error.value = err.message || 'Error saving highlight';
        console.error('Error:', err);
      } finally {
        saving.value = false;
      }
    };

    const deleteHighlight = async () => {
      if (!confirm('Are you sure? This cannot be undone.')) return;

      try {
        const response = await api.deleteHighlight(highlightId);
        if (response.success) {
          router.push('/highlights');
        } else {
          error.value = response.message || 'Failed to delete highlight';
        }
      } catch (err) {
        error.value = err.message || 'Error deleting highlight';
      }
    };

    const openRender = () => {
      if (highlight.value?.displaySettings?.visibleToPublic) {
        window.open(`/api/highlights/render/${highlightId}`, '_blank');
      } else {
        alert('This highlight is not visible to the public. Enable visibility in display settings.');
      }
    };

    const openOBSPreview = () => {
      // Get the current location but replace with admin.html
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      // Get the directory path (everything up to the filename)
      const dir = pathname.substring(0, pathname.lastIndexOf('/') + 1);
      const url = `${origin}${dir}admin.html#/highlight-obs/${highlightId}`;
      console.log('[OBS] Opening URL:', url);
      window.open(url, '_blank');
    };

    const cancelEdit = () => {
      initEditForm();
      isEditing.value = false;
    };

    onMounted(() => {
      fetchHighlight();
    });

    return {
      highlight,
      loading,
      saving,
      error,
      success,
      activeTab,
      isEditing,
      aiFetching,
      aiFetchError,
      editForm,
      highlightId,
      fetchHighlight,
      triggerAiFetch,
      saveHighlight,
      deleteHighlight,
      cancelEdit,
      openRender,
      openOBSPreview
    };
  },

  components: {
    HighlightMediaManager,
    FollowButton
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4" v-if="!loading && highlight">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8 flex justify-between items-start">
          <div>
            <router-link to="/highlights" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-4">
              ← Back to Highlights
            </router-link>
            <div class="flex items-center gap-3">
              <h1 class="text-4xl font-bold text-yellow-400">{{ highlight.title }}</h1>
              <follow-button v-if="highlight._id" resource-type="highlight" :resource-id="highlight._id" />
            </div>
          </div>
          <div class="flex gap-2">
            <button
              v-if="!isEditing"
              @click="isEditing = true"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
            >
              ✎ Edit
            </button>
            <button
              v-else
              @click="cancelEdit"
              class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition"
            >
              Cancel
            </button>
            <button
              @click="deleteHighlight"
              class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
            >
              🗑 Delete
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="error" class="bg-red-900 border border-red-700 rounded-lg p-4 mb-6 text-red-200">
          {{ error }}
        </div>
        <div v-if="success" class="bg-green-900 border border-green-700 rounded-lg p-4 mb-6 text-green-200">
          {{ success }}
        </div>

        <!-- Status & Type Badges -->
        <div class="flex gap-2 mb-6">
          <span class="bg-blue-900 text-blue-200 px-3 py-1 rounded text-sm font-semibold">{{ highlight.type }}</span>
          <span class="bg-purple-900 text-purple-200 px-3 py-1 rounded text-sm font-semibold">{{ highlight.status }}</span>
        </div>

        <!-- Tabs - Responsive & Scrollable on Mobile -->
        <div class="bg-gray-800 border-b border-gray-700 mb-6 overflow-x-auto">
          <div class="flex gap-0 min-w-min">
            <button
              @click="activeTab = 'basic'"
              :class="['px-3 md:px-6 py-3 font-semibold transition text-xs md:text-sm whitespace-nowrap flex-shrink-0', activeTab === 'basic' ? 'bg-gray-700 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300']"
            >
              Basic Info
            </button>
            <button
              @click="activeTab = 'ai-fetch'"
              :class="['px-3 md:px-6 py-3 font-semibold transition text-xs md:text-sm whitespace-nowrap flex-shrink-0', activeTab === 'ai-fetch' ? 'bg-gray-700 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300']"
            >
              AI Fetch
            </button>
            <button
              v-if="highlight.aiContent?.fetched"
              @click="activeTab = 'ai-content'"
              :class="['px-3 md:px-6 py-3 font-semibold transition text-xs md:text-sm whitespace-nowrap flex-shrink-0', activeTab === 'ai-content' ? 'bg-gray-700 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300']"
            >
              AI Content
            </button>
            <button
              @click="activeTab = 'media'"
              :class="['px-3 md:px-6 py-3 font-semibold transition text-xs md:text-sm whitespace-nowrap flex-shrink-0', activeTab === 'media' ? 'bg-gray-700 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300']"
            >
              Media
            </button>
            <button
              @click="activeTab = 'display'"
              :class="['px-3 md:px-6 py-3 font-semibold transition text-xs md:text-sm whitespace-nowrap flex-shrink-0', activeTab === 'display' ? 'bg-gray-700 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-300']"
            >
              Display
            </button>
          </div>
        </div>

        <!-- Basic Info Tab -->
        <div v-if="activeTab === 'basic'" class="bg-gray-800 border border-gray-700 rounded-lg p-8 space-y-6">
          <h2 class="text-2xl font-bold text-yellow-400 mb-6">Basic Information</h2>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Title</label>
            <input
              v-if="isEditing"
              v-model="editForm.title"
              type="text"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
            />
            <p v-else class="text-gray-100">{{ highlight.title }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select v-if="isEditing" v-model="editForm.type" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500">
                <option value="person">Person</option>
                <option value="unit">Military Unit</option>
                <option value="object">Equipment/Object</option>
                <option value="event">Historical Event</option>
                <option value="topic">Topic</option>
                <option value="memorial">Memorial</option>
              </select>
              <p v-else class="text-gray-100">{{ highlight.type }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select v-if="isEditing" v-model="editForm.category" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500">
                <option value="wwii">World War II</option>
                <option value="vietnam">Vietnam War</option>
                <option value="korea">Korean War</option>
                <option value="gulf-war">Gulf War</option>
                <option value="iraq">Iraq War</option>
                <option value="afghanistan">Afghanistan</option>
                <option value="modern">Modern</option>
                <option value="medal-of-honor">Medal of Honor</option>
                <option value="historical">Historical</option>
                <option value="other">Other</option>
              </select>
              <p v-else class="text-gray-100">{{ highlight.category }}</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              v-if="isEditing"
              v-model="editForm.description"
              rows="4"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
            ></textarea>
            <p v-else class="text-gray-100 whitespace-pre-wrap">{{ highlight.description || 'No description' }}</p>
          </div>

          <!-- Person Info -->
          <div v-if="highlight.type === 'person' && highlight.personInfo" class="space-y-4 border-t border-gray-700 pt-6">
            <h3 class="text-xl font-bold text-yellow-400">Person Information</h3>

            <div v-if="highlight.personInfo.fullName || highlight.personInfo.rank || highlight.personInfo.branch">
              <p v-if="highlight.personInfo.fullName"><span class="font-semibold">Name:</span> {{ highlight.personInfo.fullName }}</p>
              <p v-if="highlight.personInfo.rank"><span class="font-semibold">Rank:</span> {{ highlight.personInfo.rank }}</p>
              <p v-if="highlight.personInfo.branch"><span class="font-semibold">Branch:</span> {{ highlight.personInfo.branch }}</p>
            </div>
          </div>

          <!-- Metadata -->
          <div class="border-t border-gray-700 pt-6 text-sm text-gray-400 space-y-2">
            <p><span class="font-semibold">Created:</span> {{ new Date(highlight.createdAt).toLocaleDateString() }}</p>
            <p v-if="highlight.creator"><span class="font-semibold">By:</span> {{ highlight.creator.firstName }} {{ highlight.creator.lastName }}</p>
            <p v-if="highlight.lastModifiedBy"><span class="font-semibold">Last edited:</span> {{ highlight.lastModifiedBy.firstName }} {{ highlight.lastModifiedBy.lastName }}</p>
          </div>

          <!-- Save Button -->
          <div v-if="isEditing" class="border-t border-gray-700 pt-6">
            <button
              @click="saveHighlight"
              :disabled="saving"
              class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <!-- AI Fetch Tab -->
        <div v-if="activeTab === 'ai-fetch'" class="bg-gray-800 border border-gray-700 rounded-lg p-8 space-y-6">
          <h2 class="text-2xl font-bold text-yellow-400 mb-6">Fetch Content from Grok AI</h2>

          <div class="bg-blue-900 border border-blue-700 rounded-lg p-4 text-blue-200 mb-6">
            <p class="font-semibold mb-2">💡 How it works:</p>
            <p>Click the button below to have Grok AI research this {{ highlight.type }} and generate content including biography, facts, achievements, quotes, and timeline.</p>
          </div>

          <div v-if="aiFetchError" class="bg-red-900 border border-red-700 rounded-lg p-4 text-red-200 mb-6">
            {{ aiFetchError }}
          </div>

          <div v-if="highlight.status === 'pending-ai-fetch'" class="bg-yellow-900 border border-yellow-700 rounded-lg p-4 text-yellow-200 mb-6">
            <p class="font-semibold">⏳ AI fetch in progress...</p>
            <p>Please wait while Grok AI researches this highlight.</p>
          </div>

          <div v-if="highlight.status === 'ai-fetched'" class="bg-green-900 border border-green-700 rounded-lg p-4 text-green-200 mb-6">
            <p class="font-semibold">✓ Content fetched successfully!</p>
            <p>View the AI-generated content in the "AI Content" tab.</p>
          </div>

          <button
            @click="triggerAiFetch"
            :disabled="aiFetching || highlight.status === 'pending-ai-fetch'"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {{ aiFetching || highlight.status === 'pending-ai-fetch' ? '⏳ Fetching...' : '🔍 Fetch from Grok AI' }}
          </button>

          <div class="text-sm text-gray-400">
            <p class="font-semibold mb-2">Current status: <span class="text-gray-300">{{ highlight.status }}</span></p>
            <p v-if="highlight.aiContent?.fetchedAt" class="text-gray-400">
              Last fetched: {{ new Date(highlight.aiContent.fetchedAt).toLocaleString() }}
            </p>
          </div>
        </div>

        <!-- AI Content Tab -->
        <div v-if="activeTab === 'ai-content' && highlight.aiContent?.fetched" class="bg-gray-800 border border-gray-700 rounded-lg p-8 space-y-8">
          <h2 class="text-2xl font-bold text-yellow-400 mb-6">AI-Generated Content</h2>

          <!-- Biography -->
          <div v-if="highlight.aiContent.biography" class="space-y-3">
            <h3 class="text-xl font-bold text-yellow-400">Biography</h3>
            <p class="text-gray-300 leading-relaxed">{{ highlight.aiContent.biography }}</p>
          </div>

          <!-- Facts -->
          <div v-if="highlight.aiContent.facts && highlight.aiContent.facts.length" class="space-y-3">
            <h3 class="text-xl font-bold text-yellow-400">Key Facts</h3>
            <div class="grid gap-3">
              <div v-for="(fact, index) in highlight.aiContent.facts" :key="index" class="bg-gray-700 rounded p-4">
                <p class="text-gray-200 mb-2">{{ fact.text }}</p>
                <p v-if="fact.source" class="text-gray-400 text-sm italic">— {{ fact.source }}</p>
              </div>
            </div>
          </div>

          <!-- Achievements -->
          <div v-if="highlight.aiContent.achievements && highlight.aiContent.achievements.length" class="space-y-3">
            <h3 class="text-xl font-bold text-yellow-400">Achievements</h3>
            <div class="grid gap-3">
              <div v-for="(achievement, index) in highlight.aiContent.achievements" :key="index" class="bg-gray-700 rounded p-4">
                <p class="text-gray-200 font-semibold mb-1">{{ achievement.title }}</p>
                <p v-if="achievement.date" class="text-gray-400 text-sm mb-2">{{ achievement.date }}</p>
                <p v-if="achievement.description" class="text-gray-300">{{ achievement.description }}</p>
              </div>
            </div>
          </div>

          <!-- Quotes -->
          <div v-if="highlight.aiContent.quotes && highlight.aiContent.quotes.length" class="space-y-3">
            <h3 class="text-xl font-bold text-yellow-400">Notable Quotes</h3>
            <div class="grid gap-3">
              <div v-for="(quote, index) in highlight.aiContent.quotes" :key="index" class="bg-gray-700 rounded p-4 border-l-4 border-yellow-500">
                <p class="text-gray-200 italic mb-2">"{{ quote.text }}"</p>
                <p v-if="quote.context" class="text-gray-400 text-sm">— {{ quote.context }}</p>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div v-if="highlight.aiContent.timeline && highlight.aiContent.timeline.length" class="space-y-3">
            <h3 class="text-xl font-bold text-yellow-400">Timeline</h3>
            <div class="space-y-2">
              <div v-for="(item, index) in highlight.aiContent.timeline" :key="index" class="bg-gray-700 rounded p-4">
                <p class="text-gray-200 font-semibold">{{ item.date }}</p>
                <p v-if="item.event" class="text-gray-200 font-semibold">{{ item.event }}</p>
                <p v-if="item.description" class="text-gray-400">{{ item.description }}</p>
              </div>
            </div>
          </div>

          <!-- Sources -->
          <div v-if="highlight.aiContent.sources && highlight.aiContent.sources.length" class="space-y-3">
            <h3 class="text-xl font-bold text-yellow-400">Sources</h3>
            <ul class="space-y-2">
              <li v-for="(source, index) in highlight.aiContent.sources" :key="index">
                <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300">
                  {{ source.title || source.url }}
                </a>
                <span v-else class="text-gray-400">{{ source.title }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Display Settings Tab -->
        <div v-if="activeTab === 'display'" class="bg-gray-800 border border-gray-700 rounded-lg p-8 space-y-6">
          <h2 class="text-2xl font-bold text-yellow-400 mb-6">Display Settings</h2>

          <div class="space-y-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-if="isEditing"
                v-model="editForm.displaySettings.visibleToPublic"
                type="checkbox"
                class="w-4 h-4"
              />
              <input
                v-else
                :checked="highlight.displaySettings?.visibleToPublic"
                type="checkbox"
                disabled
                class="w-4 h-4"
              />
              <span class="text-gray-300">Visible to Public</span>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-if="isEditing"
                v-model="editForm.displaySettings.featured"
                type="checkbox"
                class="w-4 h-4"
              />
              <input
                v-else
                :checked="highlight.displaySettings?.featured"
                type="checkbox"
                disabled
                class="w-4 h-4"
              />
              <span class="text-gray-300">Featured Highlight</span>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-if="isEditing"
                v-model="editForm.displaySettings.enableSlideshow"
                type="checkbox"
                class="w-4 h-4"
              />
              <input
                v-else
                :checked="highlight.displaySettings?.enableSlideshow"
                type="checkbox"
                disabled
                class="w-4 h-4"
              />
              <span class="text-gray-300">Enable Slideshow</span>
            </label>
          </div>

          <div v-if="editForm.displaySettings.enableSlideshow || highlight.displaySettings?.enableSlideshow">
            <label class="block text-sm font-medium text-gray-300 mb-2">Slideshow Duration (seconds)</label>
            <input
              v-if="isEditing"
              v-model.number="editForm.displaySettings.slideshowDuration"
              type="number"
              min="3"
              max="60"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
            />
            <p v-else class="text-gray-100">{{ highlight.displaySettings?.slideshowDuration || 10 }} seconds</p>
          </div>

          <!-- View Buttons -->
          <div v-if="highlight.displaySettings?.visibleToPublic || highlight.aiContent?.fetched" class="border-t border-gray-700 pt-6 space-y-3">
            <button
              v-if="highlight.displaySettings?.visibleToPublic"
              @click="openRender"
              class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition"
            >
              👁 View Rendered Page
            </button>
            <button
              v-if="highlight.aiContent?.fetched"
              @click="openOBSPreview"
              class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded transition"
            >
              📺 View OBS Slideshow
            </button>
          </div>

          <!-- Save Button -->
          <div v-if="isEditing" class="border-t border-gray-700 pt-6">
            <button
              @click="saveHighlight"
              :disabled="saving"
              class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ saving ? 'Saving...' : 'Save Display Settings' }}
            </button>
          </div>
        </div>

        <!-- Media Tab -->
        <div v-if="activeTab === 'media'" class="bg-gray-800 border border-gray-700 rounded-lg p-8 space-y-6">
          <h2 class="text-2xl font-bold text-yellow-400 mb-6">Media Management</h2>

          <!-- AI-Suggested Images Info -->
          <div v-if="highlight.aiContent?.fetched && (highlight.media?.profileImage?.url || highlight.media?.gallery?.length)" class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p class="text-blue-300 text-sm">
              ℹ️ Images were suggested by AI during content generation.
              You can replace them with uploads or different URLs.
            </p>
          </div>

          <!-- Media Manager Component -->
          <highlight-media-manager
            :highlightId="highlightId"
            :profileImage="highlight.media?.profileImage"
            :gallery="highlight.media?.gallery || []"
            @update="fetchHighlight"
          />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="!loading && error" class="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div class="max-w-2xl mx-auto">
        <div class="bg-red-900 border border-red-700 rounded-lg p-8">
          <h2 class="text-2xl font-bold text-red-200 mb-4">Error Loading Highlight</h2>
          <p class="text-red-200 mb-6">{{ error }}</p>
          <router-link to="/highlights" class="inline-block bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-6 rounded transition">
            ← Back to Highlights
          </router-link>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
        <p class="text-gray-400">Loading highlight...</p>
      </div>
    </div>
  `
};
