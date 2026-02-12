import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../services/api.js';

export default {
  name: 'SegmentNew',
  setup() {
    const router = useRouter();
    const route = useRoute();

    const loading = ref(false);
    const error = ref('');
    const templateId = ref(route.query.template || null);
    const templateSegment = ref(null);

    const formData = ref({
      title: '',
      description: '',
      productionType: 'in-person-interview',
      location: 'studio',
      locationDetails: '',
      status: 'proposal',
      priority: 'medium',
      scheduledDate: '',
      estimatedDuration: '',
      targetAudience: '',
      goals: '',
      resources: '',
      notes: '',
      tags: '',
      isTemplate: false
    });

    const loadTemplate = async () => {
      if (!templateId.value) return;

      try {
        const response = await api.getSegmentById(templateId.value);
        if (response.success) {
          templateSegment.value = response.data.segment;

          // Pre-fill form with template data
          formData.value = {
            title: `${templateSegment.value.title} - Variation`,
            description: templateSegment.value.description,
            productionType: templateSegment.value.productionType,
            location: templateSegment.value.location,
            locationDetails: templateSegment.value.locationDetails || '',
            status: 'planning',
            priority: 'medium',
            scheduledDate: '',
            estimatedDuration: templateSegment.value.estimatedDuration || '',
            targetAudience: templateSegment.value.targetAudience || '',
            goals: templateSegment.value.goals || '',
            resources: templateSegment.value.resources || '',
            notes: '',
            tags: templateSegment.value.tags?.join(', ') || '',
            isTemplate: false
          };
        }
      } catch (err) {
        console.error('Failed to load template:', err);
      }
    };

    const handleSubmit = async () => {
      if (!formData.value.title || !formData.value.description) {
        alert('Title and description are required');
        return;
      }

      try {
        loading.value = true;
        error.value = '';

        // Parse scheduled date to avoid timezone issues
        let scheduledDateISO = null;
        if (formData.value.scheduledDate) {
          const [year, month, day] = formData.value.scheduledDate.split('-').map(Number);
          // Create date at noon local time to avoid day boundary issues
          const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
          scheduledDateISO = localDate.toISOString();
        }

        const submitData = {
          ...formData.value,
          tags: formData.value.tags.split(',').map(t => t.trim()).filter(t => t),
          scheduledDate: scheduledDateISO,
          estimatedDuration: formData.value.estimatedDuration ? parseInt(formData.value.estimatedDuration) : null
        };

        let response;
        if (templateId.value) {
          // Create as variation
          response = await api.createSegmentVariation(templateId.value, submitData);
        } else {
          // Create as new segment
          response = await api.createSegment(submitData);
        }

        if (response.success) {
          alert('Segment created successfully!');
          router.push(`/segments/${response.data.segment._id}`);
        }
      } catch (err) {
        error.value = err.message || 'Failed to create segment';
        alert('Failed to create segment: ' + error.value);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadTemplate();
    });

    return {
      loading,
      error,
      formData,
      templateSegment,
      handleSubmit
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-4 md:mb-6">
          <router-link to="/segments" class="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-4">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Segments
          </router-link>
          <h1 class="text-3xl sm:text-4xl font-bold text-yellow-400 mb-2">
            {{ templateSegment ? 'Create Variation' : 'Create New Segment' }}
          </h1>
          <p class="text-gray-400 text-sm sm:text-base">
            {{ templateSegment ? \`Based on template: \${templateSegment.title}\` : 'Plan a new production segment' }}
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4 md:space-y-6">
          <!-- Error Message -->
          <div v-if="error" class="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg">
            {{ error }}
          </div>

          <!-- Basic Information -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Basic Information</h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Title <span class="text-red-400">*</span>
                </label>
                <input v-model="formData.title" type="text" required
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Enter segment title" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Description <span class="text-red-400">*</span>
                </label>
                <textarea v-model="formData.description" rows="4" required
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Describe the segment concept, story, or theme..."></textarea>
                <p class="text-xs text-gray-400 mt-1">{{ formData.description.length }} / 5000 characters</p>
              </div>

              <div class="flex items-center gap-3">
                <input v-model="formData.isTemplate" type="checkbox" id="isTemplate"
                  class="w-5 h-5 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500" />
                <label for="isTemplate" class="text-gray-300">
                  Mark as Template
                  <span class="text-sm text-gray-400 ml-2">(Can be used to create variations later)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Production Details -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Production Details</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Production Type <span class="text-red-400">*</span>
                </label>
                <select v-model="formData.productionType" required
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="in-person-interview">In-Person Interview</option>
                  <option value="remote-interview">Remote Interview</option>
                  <option value="solo-narration">Solo Narration</option>
                  <option value="panel-discussion">Panel Discussion</option>
                  <option value="roundtable">Roundtable</option>
                  <option value="documentary-style">Documentary Style</option>
                  <option value="pre-recorded">Pre-Recorded</option>
                  <option value="live-recording">Live Recording</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Location Type <span class="text-red-400">*</span>
                </label>
                <select v-model="formData.location" required
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="on-location">On Location</option>
                  <option value="studio">Studio</option>
                  <option value="remote-video">Remote Video (Zoom, etc.)</option>
                  <option value="remote-audio">Remote Audio (Phone, Podcast)</option>
                  <option value="phone-call">Phone Call</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="tbd">To Be Determined</option>
                </select>
              </div>

              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Location Details
                </label>
                <input v-model="formData.locationDetails" type="text"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Specific venue, address, Zoom link, etc." />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Estimated Duration (minutes)
                </label>
                <input v-model="formData.estimatedDuration" type="number" min="1"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="60" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Scheduled Date
                </label>
                <input v-model="formData.scheduledDate" type="date"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
            </div>
          </div>

          <!-- Status & Priority -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Status & Priority</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select v-model="formData.status"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="proposal">Proposal</option>
                  <option value="in-consideration">In Consideration</option>
                  <option value="in-review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="planning">Planning</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select v-model="formData.priority"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Planning Details -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 class="text-xl font-bold text-yellow-400 mb-4">Planning & Goals</h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Target Audience
                </label>
                <textarea v-model="formData.targetAudience" rows="2"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Who is this segment intended for? (e.g., Active duty, Veterans, Families)"></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Goals & Objectives
                </label>
                <textarea v-model="formData.goals" rows="3"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="What do you hope to achieve with this segment?"></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Resources Needed
                </label>
                <textarea v-model="formData.resources" rows="3"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Equipment, team members, budget, locations, etc."></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Internal Notes
                </label>
                <textarea v-model="formData.notes" rows="3"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Internal notes, reminders, or special considerations..."></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Tags
                </label>
                <input v-model="formData.tags" type="text"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="tag1, tag2, tag3" />
                <p class="text-xs text-gray-400 mt-1">Separate tags with commas</p>
              </div>
            </div>
          </div>

          <!-- Submit Buttons -->
          <div class="flex flex-col-reverse sm:flex-row gap-2 md:gap-4">
            <button type="submit" :disabled="loading"
              class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 md:px-6 py-2.5 md:py-3 rounded-md font-bold transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center">
              {{ loading ? 'Creating...' : 'Create Segment' }}
            </button>
            <button type="button" @click="router.push('/segments')"
              class="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md font-semibold transition min-h-[44px] flex items-center justify-center">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `
};
