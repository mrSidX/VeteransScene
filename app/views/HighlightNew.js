import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

export default {
  name: 'HighlightNew',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const loading = ref(false);
    const error = ref('');
    const successMessage = ref('');

    const formData = ref({
      title: '',
      type: 'person',
      description: '',
      category: 'other',
      priority: 'medium',
      tags: [],
      personInfo: {
        fullName: '',
        rank: '',
        branch: '',
        yearsOfService: {
          start: '',
          end: ''
        }
      },
      manualLinks: [{ title: '', url: '' }]
    });

    const newTag = ref('');
    const newLinkTitle = ref('');
    const newLinkUrl = ref('');

    const handleSubmit = async () => {
      // Validate
      if (!formData.value.title.trim()) {
        error.value = 'Title is required';
        return;
      }

      loading.value = true;
      error.value = '';
      successMessage.value = '';

      try {
        const payload = {
          ...formData.value,
          manualLinks: formData.value.manualLinks.filter(l => l.title && l.url)
        };

        const response = await api.createHighlight(payload);

        if (response.success) {
          successMessage.value = 'Highlight created successfully!';
          setTimeout(() => {
            router.push(`/highlights/${response.data.highlight._id}`);
          }, 1000);
        } else {
          error.value = response.message || 'Failed to create highlight';
        }
      } catch (err) {
        error.value = err.message || 'Error creating highlight';
        console.error('Error:', err);
      } finally {
        loading.value = false;
      }
    };

    const addTag = () => {
      if (newTag.value.trim() && !formData.value.tags.includes(newTag.value.trim())) {
        formData.value.tags.push(newTag.value.trim());
        newTag.value = '';
      }
    };

    const removeTag = (tag) => {
      const index = formData.value.tags.indexOf(tag);
      if (index > -1) {
        formData.value.tags.splice(index, 1);
      }
    };

    const addManualLink = () => {
      if (newLinkTitle.value.trim() && newLinkUrl.value.trim()) {
        formData.value.manualLinks.push({
          title: newLinkTitle.value.trim(),
          url: newLinkUrl.value.trim()
        });
        newLinkTitle.value = '';
        newLinkUrl.value = '';
      }
    };

    const removeManualLink = (index) => {
      formData.value.manualLinks.splice(index, 1);
    };

    const goBack = () => {
      router.push('/highlights');
    };

    return {
      loading,
      error,
      successMessage,
      formData,
      newTag,
      newLinkTitle,
      newLinkUrl,
      handleSubmit,
      addTag,
      removeTag,
      addManualLink,
      removeManualLink,
      goBack
    };
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-4 md:mb-6">
          <button @click="goBack" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-2 md:mb-4">
            ← Back to Tributes
          </button>
          <h1 class="text-4xl font-bold text-yellow-400">Create New Tribute</h1>
          <p class="text-gray-400 mt-2">Add a new tribute to feature military figures, units, events, or topics</p>
        </div>

        <!-- Messages -->
        <div v-if="error" class="bg-red-900 border border-red-700 rounded-lg p-3 md:p-4 mb-4 md:mb-6 text-red-200">
          {{ error }}
        </div>
        <div v-if="successMessage" class="bg-green-900 border border-green-700 rounded-lg p-3 md:p-4 mb-4 md:mb-6 text-green-200">
          {{ successMessage }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="bg-gray-800 border border-gray-700 rounded-lg p-4 md:p-6 space-y-4 md:space-y-6">

          <!-- Basic Information -->
          <div class="space-y-3 md:space-y-4">
            <h2 class="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2 md:pb-3">Basic Information</h2>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input
                v-model="formData.title"
                type="text"
                placeholder="e.g., General George Washington or WWI Battlefield Stories"
                required
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Type *</label>
                <select
                  v-model="formData.type"
                  required
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
                >
                  <option value="person">Person (Veteran/Military Figure)</option>
                  <option value="unit">Military Unit</option>
                  <option value="object">Equipment/Object</option>
                  <option value="event">Historical Event</option>
                  <option value="topic">Topic/Concept</option>
                  <option value="memorial">Memorial</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  v-model="formData.category"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
                >
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
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                v-model="formData.description"
                rows="4"
                placeholder="Provide context or details about this tribute (optional). This will help Grok AI generate more accurate content."
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  v-model="formData.priority"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Person-Specific Fields -->
          <div v-if="formData.type === 'person'" class="space-y-3 md:space-y-4 border-t border-gray-700 pt-4 md:pt-6">
            <h2 class="text-xl font-bold text-yellow-400">Person Information</h2>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                v-model="formData.personInfo.fullName"
                type="text"
                placeholder="Full name"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Rank</label>
                <input
                  v-model="formData.personInfo.rank"
                  type="text"
                  placeholder="e.g., General, Colonel, Sergeant"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Branch</label>
                <select
                  v-model="formData.personInfo.branch"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-yellow-500"
                >
                  <option value="">Select branch</option>
                  <option value="Army">Army</option>
                  <option value="Navy">Navy</option>
                  <option value="Air Force">Air Force</option>
                  <option value="Marines">Marines</option>
                  <option value="Coast Guard">Coast Guard</option>
                  <option value="Space Force">Space Force</option>
                  <option value="National Guard">National Guard</option>
                  <option value="Merchant Marines">Merchant Marines</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Service Start Year</label>
                <input
                  v-model.number="formData.personInfo.yearsOfService.start"
                  type="number"
                  min="1900"
                  :max="new Date().getFullYear()"
                  placeholder="1945"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Service End Year</label>
                <input
                  v-model.number="formData.personInfo.yearsOfService.end"
                  type="number"
                  min="1900"
                  :max="new Date().getFullYear()"
                  placeholder="1946 (optional)"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="space-y-3 md:space-y-4 border-t border-gray-700 pt-4 md:pt-6">
            <h2 class="text-xl font-bold text-yellow-400">Tags</h2>

            <div class="flex gap-1 md:gap-2">
              <input
                v-model="newTag"
                @keyup.enter="addTag"
                type="text"
                placeholder="Add a tag (e.g., combat, leadership, innovation)"
                class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
              <button
                @click="addTag"
                type="button"
                class="bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium py-2 px-4 rounded transition"
              >
                Add
              </button>
            </div>

            <div class="flex flex-wrap gap-1 md:gap-2">
              <div
                v-for="tag in formData.tags"
                :key="tag"
                class="bg-yellow-600 text-white px-2 md:px-3 py-1 rounded-full text-sm flex items-center gap-1 md:gap-2"
              >
                {{ tag }}
                <button
                  @click="removeTag(tag)"
                  type="button"
                  class="hover:text-yellow-200 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <!-- Manual Links -->
          <div class="space-y-3 md:space-y-4 border-t border-gray-700 pt-4 md:pt-6">
            <h2 class="text-xl font-bold text-yellow-400">Manual Source Links (Optional)</h2>
            <p class="text-gray-400 text-sm">Add reference links that Grok AI will use when researching this tribute</p>

            <div class="space-y-2 md:space-y-3">
              <div
                v-for="(link, index) in formData.manualLinks"
                :key="index"
                class="flex gap-1 md:gap-2"
              >
                <input
                  v-model="link.title"
                  type="text"
                  placeholder="Link title"
                  class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
                <input
                  v-model="link.url"
                  type="url"
                  placeholder="https://..."
                  class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
                <button
                  @click="removeManualLink(index)"
                  type="button"
                  class="bg-red-900 hover:bg-red-800 text-white px-3 py-2 rounded transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="flex gap-1 md:gap-2">
              <input
                v-model="newLinkTitle"
                type="text"
                placeholder="New link title"
                class="flex-1 px-3 md:px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
              <input
                v-model="newLinkUrl"
                type="url"
                placeholder="https://..."
                class="flex-1 px-3 md:px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
              <button
                @click="addManualLink"
                type="button"
                class="bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium py-2 px-3 md:px-4 rounded transition"
              >
                Add Link
              </button>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex flex-col-reverse sm:flex-row gap-2 md:gap-4 border-t border-gray-700 pt-4 md:pt-6">
            <button
              @click="goBack"
              type="button"
              class="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-100 font-bold py-3 px-6 rounded-lg transition min-h-[44px] flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              @click="handleSubmit"
              :disabled="loading || !formData.title.trim()"
              type="submit"
              class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
            >
              {{ loading ? 'Creating...' : 'Create Tribute' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
};
