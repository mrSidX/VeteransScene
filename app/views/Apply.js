import { ref } from 'vue';
import api from '../services/api.js';
import BranchSelector from '../components/BranchSelector.js';

export default {
  name: 'Apply',
  components: {
    BranchSelector
  },
  setup() {
    const formData = ref({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      state: '',
      branches: [],
      yearsOfService: {
        start: '',
        end: ''
      },
      rank: '',
      wars: [],
      tours: 0,
      deploymentLocations: [],
      applicationType: 'podcast-guest',
      story: '',
      additionalInfo: ''
    });

    const warInput = ref('');
    const deploymentInput = ref('');
    const loading = ref(false);
    const success = ref(false);
    const error = ref('');

    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];

    const addWar = () => {
      if (warInput.value.trim()) {
        formData.value.wars.push(warInput.value.trim());
        warInput.value = '';
      }
    };

    const removeWar = (index) => {
      formData.value.wars.splice(index, 1);
    };

    const addDeployment = () => {
      if (deploymentInput.value.trim()) {
        formData.value.deploymentLocations.push(deploymentInput.value.trim());
        deploymentInput.value = '';
      }
    };

    const removeDeployment = (index) => {
      formData.value.deploymentLocations.splice(index, 1);
    };

    const handleSubmit = async () => {
      error.value = '';

      // Validate at least one branch is selected
      if (!formData.value.branches || formData.value.branches.length === 0) {
        error.value = 'Please select at least one military branch';
        return;
      }

      loading.value = true;

      try {
        const response = await api.submitApplication(formData.value);

        if (response.success) {
          success.value = true;
          // Reset form
          Object.keys(formData.value).forEach(key => {
            if (Array.isArray(formData.value[key])) {
              formData.value[key] = [];
            } else if (typeof formData.value[key] === 'object') {
              Object.keys(formData.value[key]).forEach(subKey => {
                formData.value[key][subKey] = '';
              });
            } else if (typeof formData.value[key] === 'number') {
              formData.value[key] = 0;
            } else {
              formData.value[key] = '';
            }
          });
          formData.value.applicationType = 'podcast-guest';

          // Scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err) {
        error.value = err.message || 'Failed to submit application. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    return {
      formData,
      warInput,
      deploymentInput,
      loading,
      success,
      error,
      states,
      addWar,
      removeWar,
      addDeployment,
      removeDeployment,
      handleSubmit
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-12 px-4">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-yellow-400 mb-4">Apply to Participate</h1>
          <p class="text-gray-300">Share your story with Veteran's Scene</p>
        </div>

        <div v-if="success" class="bg-green-900 border border-green-700 text-green-200 px-6 py-4 rounded-lg mb-6">
          <h3 class="font-bold text-lg mb-2">Application Submitted Successfully!</h3>
          <p>Thank you for your interest. We will review your application and contact you soon.</p>
        </div>

        <div v-if="error" class="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6">
          {{ error }}
        </div>

        <form @submit.prevent="handleSubmit" class="bg-gray-800 rounded-lg shadow-xl p-8 space-y-8">
          <!-- Personal Information -->
          <div>
            <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Personal Information</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                <input v-model="formData.firstName" type="text" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                <input v-model="formData.lastName" type="text" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input v-model="formData.email" type="email" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Phone *</label>
                <input v-model="formData.phone" type="tel" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">State *</label>
                <select v-model="formData.state" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="">Select State</option>
                  <option v-for="state in states" :key="state" :value="state">{{ state }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Military Service -->
          <div>
            <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Military Service</h2>

            <BranchSelector v-model="formData.branches" required class="mb-8" />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Rank</label>
                <input v-model="formData.rank" type="text"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Service Start Year *</label>
                <input v-model.number="formData.yearsOfService.start" type="number" required min="1900" :max="new Date().getFullYear()"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Service End Year</label>
                <input v-model.number="formData.yearsOfService.end" type="number" min="1900" :max="new Date().getFullYear()"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Leave blank if currently serving" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Number of Tours</label>
                <input v-model.number="formData.tours" type="number" min="0"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
            </div>

            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">Wars/Conflicts Served</label>
              <div class="flex gap-2">
                <input v-model="warInput" type="text" @keyup.enter="addWar"
                  class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g., Vietnam, Gulf War, OEF, OIF" />
                <button type="button" @click="addWar"
                  class="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition">
                  Add
                </button>
              </div>
              <div v-if="formData.wars.length" class="mt-2 flex flex-wrap gap-2">
                <span v-for="(war, index) in formData.wars" :key="index"
                  class="inline-flex items-center gap-2 px-3 py-1 bg-gray-700 text-gray-200 rounded-full">
                  {{ war }}
                  <button type="button" @click="removeWar(index)" class="text-red-400 hover:text-red-300">×</button>
                </span>
              </div>
            </div>

            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">Deployment Locations</label>
              <div class="flex gap-2">
                <input v-model="deploymentInput" type="text" @keyup.enter="addDeployment"
                  class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g., Iraq, Afghanistan, Korea" />
                <button type="button" @click="addDeployment"
                  class="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-md font-semibold transition">
                  Add
                </button>
              </div>
              <div v-if="formData.deploymentLocations.length" class="mt-2 flex flex-wrap gap-2">
                <span v-for="(location, index) in formData.deploymentLocations" :key="index"
                  class="inline-flex items-center gap-2 px-3 py-1 bg-gray-700 text-gray-200 rounded-full">
                  {{ location }}
                  <button type="button" @click="removeDeployment(index)" class="text-red-400 hover:text-red-300">×</button>
                </span>
              </div>
            </div>
          </div>

          <!-- Application Details -->
          <div>
            <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">Application Details</h2>
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">I'm interested in *</label>
                <select v-model="formData.applicationType" required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="podcast-guest">Being a Podcast Guest</option>
                  <option value="volunteer">Volunteering</option>
                  <option value="participant">General Participation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Your Story *</label>
                <p class="text-sm text-gray-400 mb-2">Tell us about your military experience and what you'd like to share (max 5000 characters)</p>
                <textarea v-model="formData.story" required rows="8" maxlength="5000"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"></textarea>
                <p class="text-sm text-gray-400 mt-1">{{ formData.story.length }}/5000 characters</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Additional Information</label>
                <p class="text-sm text-gray-400 mb-2">Anything else you'd like us to know (max 2000 characters)</p>
                <textarea v-model="formData.additionalInfo" rows="4" maxlength="2000"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"></textarea>
                <p class="text-sm text-gray-400 mt-1">{{ formData.additionalInfo.length }}/2000 characters</p>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-6 border-t border-gray-700">
            <router-link to="/" class="text-yellow-400 hover:text-yellow-300">← Back to Home</router-link>
            <button type="submit" :disabled="loading"
              class="px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed">
              <span v-if="loading">Submitting...</span>
              <span v-else>Submit Application</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `
};
