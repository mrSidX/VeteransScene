import { ref, computed } from 'vue';
import api from '../services/api.js';

export default {
  name: 'Apply',
  setup() {
    const showOptional = ref(false);
    const loading = ref(false);
    const success = ref(false);
    const error = ref('');
    const anonymousPasscode = ref('');
    const anonymousHandle = ref('');

    const formData = ref({
      // REQUIRED
      email: '',
      phone: '',
      preferredContact: '',

      // OPTIONAL - Basic Info
      firstName: '',
      lastName: '',
      state: '',

      // OPTIONAL - Military (shown if user expands)
      branches: [],
      yearsOfService: { start: '', end: '' },
      rank: '',

      // OPTIONAL - Story
      story: '',

      // Other options
      applicationType: 'podcast-guest',
      preferAnonymous: false,
      alias: ''
    });

    const branchInput = ref('');
    const socialMedia = ref('');

    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];

    // Validate: at least one contact method
    const hasContactMethod = computed(() => {
      return (
        (formData.value.email && formData.value.email.trim()) ||
        (formData.value.phone && formData.value.phone.trim()) ||
        (formData.value.preferredContact && formData.value.preferredContact.trim())
      );
    });

    const addBranch = () => {
      if (branchInput.value.trim() && !formData.value.branches.includes(branchInput.value.trim())) {
        formData.value.branches.push(branchInput.value.trim());
        branchInput.value = '';
      }
    };

    const removeBranch = (index) => {
      formData.value.branches.splice(index, 1);
    };

    const copyCredentials = async () => {
      const credentials = `Handle: ${anonymousHandle.value}\nPasscode: ${anonymousPasscode.value}`;
      try {
        await navigator.clipboard.writeText(credentials);
        alert('✓ Credentials copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    const handleSubmit = async () => {
      error.value = '';

      // Validate contact info
      if (!hasContactMethod.value) {
        error.value = '📧 Please provide at least one way to contact you: email, phone, or other contact method.';
        return;
      }

      loading.value = true;

      try {
        const response = await api.submitApplication(formData.value);

        if (response.success) {
          success.value = true;

          // Capture anonymous credentials if returned
          if (response.data?.isAnonymous && response.data?.loginPasscode) {
            anonymousPasscode.value = response.data.loginPasscode;
            anonymousHandle.value = response.data.anonymousHandle;
          }

          // Only reset form if not anonymous (don't auto-dismiss for anonymous users)
          if (!response.data?.isAnonymous) {
            setTimeout(() => {
              Object.keys(formData.value).forEach(key => {
                if (Array.isArray(formData.value[key])) {
                  formData.value[key] = [];
                } else if (typeof formData.value[key] === 'object') {
                  Object.keys(formData.value[key]).forEach(subKey => {
                    formData.value[key][subKey] = '';
                  });
                } else if (typeof formData.value[key] === 'number') {
                  formData.value[key] = 0;
                } else if (typeof formData.value[key] === 'boolean') {
                  formData.value[key] = false;
                } else {
                  formData.value[key] = '';
                }
              });
              formData.value.applicationType = 'podcast-guest';
              success.value = false;
              showOptional.value = false;
            }, 2000);
          }
        }
      } catch (err) {
        error.value = err.message || 'Failed to submit application. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    return {
      formData,
      showOptional,
      loading,
      success,
      error,
      hasContactMethod,
      states,
      branchInput,
      socialMedia,
      anonymousPasscode,
      anonymousHandle,
      addBranch,
      removeBranch,
      copyCredentials,
      handleSubmit
    };
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 py-8 md:py-12 px-4">
      <div class="max-w-2xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">Join Veteran's Scene</h1>
          <p class="text-gray-400 text-sm md:text-base">Share your story • Connect with veterans • Be heard</p>
        </div>

        <!-- Success Message - Anonymous Account Created -->
        <div v-if="success && anonymousPasscode" class="space-y-6">

          <!-- Main Success Banner -->
          <div class="bg-gradient-to-r from-purple-900 to-purple-800 border-l-4 border-purple-300 rounded-lg p-6 md:p-8 shadow-lg">
            <h3 class="font-bold text-2xl md:text-3xl text-purple-200 mb-2">🎉 Your Anonymous Account is Ready!</h3>
            <p class="text-purple-100 text-sm md:text-base">Your application has been submitted and your secure account has been created.</p>
          </div>

          <!-- Your Login Code Section - Most Important -->
          <div class="bg-gray-800 border-2 border-yellow-400 rounded-lg p-6 md:p-8">
            <p class="text-gray-300 text-xs md:text-sm font-semibold uppercase tracking-wide mb-4">Your Unique Login Code</p>

            <div class="space-y-6">
              <!-- Handle Display -->
              <div>
                <p class="text-gray-400 text-sm mb-2">📝 Your Handle (Username):</p>
                <div class="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div class="text-3xl md:text-4xl font-mono font-bold text-yellow-300 break-all">{{ anonymousHandle }}</div>
                </div>
              </div>

              <!-- Passcode Display - LARGE AND PROMINENT -->
              <div>
                <p class="text-gray-400 text-sm mb-2">🔐 Your Passcode (6 Digits):</p>
                <div class="bg-gradient-to-b from-yellow-900 to-yellow-950 p-6 md:p-8 rounded-lg border-2 border-yellow-500 shadow-lg">
                  <div class="text-5xl md:text-6xl font-mono font-black text-yellow-300 tracking-widest text-center">{{ anonymousPasscode }}</div>
                  <p class="text-yellow-200 text-xs md:text-sm text-center mt-3 font-semibold">Do not share this code with anyone</p>
                </div>
              </div>

              <!-- Copy and Store -->
              <div class="flex flex-col sm:flex-row gap-3">
                <button @click="copyCredentials" class="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-3 md:py-4 rounded-lg transition flex items-center justify-center gap-2 min-h-[44px]">
                  <span>📋</span>
                  <span>Copy Login Code</span>
                </button>
                <a href="/app.html#/login" class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-4 py-3 md:py-4 rounded-lg transition flex items-center justify-center gap-2 min-h-[44px]">
                  <span>→</span>
                  <span>Go to Login Now</span>
                </a>
              </div>
            </div>
          </div>

          <!-- How to Login Instructions -->
          <div class="bg-blue-900/30 border border-blue-700 rounded-lg p-6 md:p-8">
            <h4 class="font-bold text-blue-300 mb-4 flex items-center gap-2">
              <span>📖</span>
              <span>How to Log In - 3 Simple Steps</span>
            </h4>

            <div class="space-y-4">
              <!-- Step 1 -->
              <div class="flex gap-4">
                <div class="flex-shrink-0">
                  <div class="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">1</div>
                </div>
                <div>
                  <p class="font-semibold text-blue-200 mb-1">Go to the Login Page</p>
                  <p class="text-blue-100 text-sm">Visit the Veterans Scene login page and click the <span class="bg-purple-600 px-2 py-1 rounded text-xs font-mono">🔒 Anonymous</span> tab</p>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="flex gap-4">
                <div class="flex-shrink-0">
                  <div class="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">2</div>
                </div>
                <div>
                  <p class="font-semibold text-blue-200 mb-1">Enter Your Handle</p>
                  <p class="text-blue-100 text-sm">Type in your handle: <span class="font-mono bg-gray-800 px-2 py-1 rounded text-yellow-300">{{ anonymousHandle }}</span></p>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="flex gap-4">
                <div class="flex-shrink-0">
                  <div class="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">3</div>
                </div>
                <div>
                  <p class="font-semibold text-blue-200 mb-1">Enter Your Passcode</p>
                  <p class="text-blue-100 text-sm">Type in your 6-digit passcode: <span class="font-mono bg-gray-800 px-2 py-1 rounded text-yellow-300 font-bold">{{ anonymousPasscode }}</span></p>
                </div>
              </div>
            </div>
          </div>

          <!-- Critical Information Box -->
          <div class="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <h4 class="font-bold text-red-300 mb-3 flex items-center gap-2">
              <span>⚠️</span>
              <span>IMPORTANT - Please Read</span>
            </h4>

            <ul class="space-y-2 text-sm text-red-100">
              <li class="flex gap-2">
                <span class="text-red-400 font-bold">•</span>
                <span><strong>Save this information now</strong> - Write it down or take a screenshot. This will NOT be emailed to you.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-red-400 font-bold">•</span>
                <span><strong>Keep your passcode private</strong> - Only you should know it. Do not share it with anyone.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-red-400 font-bold">•</span>
                <span><strong>Your identity is protected</strong> - We will never reveal your real name or contact information.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-red-400 font-bold">•</span>
                <span><strong>Lost your code?</strong> - If you forget this information, you'll need to submit a new anonymous application.</span>
              </li>
            </ul>
          </div>

          <!-- Call to Action -->
          <div class="text-center">
            <p class="text-gray-400 text-sm mb-4">Ready to access your dashboard?</p>
            <a href="/app.html#/login" class="inline-block bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-lg transition text-lg min-h-[44px] flex items-center">
              📱 Open Login Page Now →
            </a>
          </div>
        </div>

        <!-- Success Message - Regular Application -->
        <div v-else-if="success" class="bg-green-900 border-l-4 border-green-400 rounded-lg p-6 mb-8">
          <h3 class="font-bold text-lg text-green-300 mb-2">✓ Application Submitted!</h3>
          <p class="text-green-200 text-sm">Thank you for joining us. We'll reach out soon to discuss your participation.</p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-900 border-l-4 border-red-400 rounded-lg p-4 mb-6">
          <p class="text-red-200 text-sm">{{ error }}</p>
        </div>

        <!-- Main Form -->
        <div v-if="!success" class="space-y-6">

          <!-- SECTION 1: Contact Information (REQUIRED) -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 md:p-8">
            <div class="flex items-start gap-3 mb-6">
              <span class="text-2xl">📧</span>
              <div class="flex-1">
                <h2 class="text-xl md:text-2xl font-bold text-white">How Can We Reach You?</h2>
                <p class="text-gray-400 text-sm mt-1">At least one contact method required</p>
              </div>
            </div>

            <div class="space-y-4">
              <!-- Email -->
              <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">Email (Optional)</label>
                <input
                  v-model="formData.email"
                  type="email"
                  placeholder="your@email.com"
                  class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                />
              </div>

              <!-- Phone -->
              <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">Phone (Optional)</label>
                <input
                  v-model="formData.phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                />
              </div>

              <!-- Other Contact (social media, etc) -->
              <div>
                <label class="block text-sm font-semibold text-gray-300 mb-2">Other Contact Method (Optional)</label>
                <input
                  v-model="formData.preferredContact"
                  type="text"
                  placeholder="e.g., @twitter, Instagram handle, Facebook"
                  class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                />
                <p class="text-xs text-gray-400 mt-1">Social media, Discord, or any way you prefer we contact you</p>
              </div>

              <!-- Anonymous Option -->
              <div class="bg-gray-700 rounded-lg p-4">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    v-model="formData.preferAnonymous"
                    type="checkbox"
                    class="w-5 h-5 rounded bg-gray-600 border-gray-500 accent-yellow-400 cursor-pointer"
                  />
                  <span class="text-sm font-medium text-gray-300">Keep my name private / Use an alias</span>
                </label>
                <input
                  v-if="formData.preferAnonymous"
                  v-model="formData.alias"
                  type="text"
                  placeholder="Your alias or handle (optional)"
                  class="w-full mt-3 px-4 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:border-yellow-400 transition text-sm"
                />
              </div>
            </div>
          </div>

          <!-- SECTION 2: Tell Us More (OPTIONAL TOGGLE) -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <button
              @click="showOptional = !showOptional"
              class="w-full px-6 md:px-8 py-4 flex items-center justify-between hover:bg-gray-750 transition group"
            >
              <div class="flex items-center gap-3 text-left">
                <span class="text-2xl">✨</span>
                <div>
                  <h3 class="font-bold text-white group-hover:text-yellow-400 transition">Tell Us More (Optional)</h3>
                  <p class="text-xs text-gray-400">Share more about yourself at your own pace</p>
                </div>
              </div>
              <span :class="['text-2xl transition-transform', showOptional ? 'rotate-180' : '']">▼</span>
            </button>

            <!-- Optional Fields (Collapsible) -->
            <div v-if="showOptional" class="border-t border-gray-700 px-6 md:px-8 py-6 space-y-5 bg-gray-750">

              <!-- Basic Info -->
              <div class="space-y-4">
                <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <span>👤</span> Basic Information
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    v-model="formData.firstName"
                    type="text"
                    placeholder="First Name"
                    class="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 transition text-sm"
                  />
                  <input
                    v-model="formData.lastName"
                    type="text"
                    placeholder="Last Name"
                    class="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 transition text-sm"
                  />
                </div>
                <select
                  v-model="formData.state"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 transition text-sm"
                >
                  <option value="">Select State (optional)</option>
                  <option v-for="state in states" :key="state" :value="state">{{ state }}</option>
                </select>
              </div>

              <!-- Military Service -->
              <div class="space-y-4 pt-4 border-t border-gray-600">
                <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <span>🎖️</span> Military Service
                </h4>

                <!-- Branches -->
                <div>
                  <label class="text-xs text-gray-400 mb-2 block">Branches</label>
                  <div class="flex gap-2 mb-2">
                    <input
                      v-model="branchInput"
                      @keyup.enter="addBranch"
                      type="text"
                      placeholder="e.g., Army, Navy, Marines..."
                      class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-yellow-400 transition text-sm"
                    />
                    <button
                      @click="addBranch"
                      class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-semibold rounded text-sm transition"
                    >
                      Add
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="(branch, i) in formData.branches" :key="i" class="bg-yellow-600 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                      {{ branch }}
                      <button @click="removeBranch(i)" class="hover:text-red-700">✕</button>
                    </span>
                  </div>
                </div>

                <!-- Years of Service -->
                <div class="grid grid-cols-2 gap-3">
                  <input
                    v-model="formData.yearsOfService.start"
                    type="number"
                    placeholder="Start Year"
                    class="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-yellow-400 transition text-sm"
                  />
                  <input
                    v-model="formData.yearsOfService.end"
                    type="number"
                    placeholder="End Year"
                    class="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-yellow-400 transition text-sm"
                  />
                </div>

                <!-- Rank -->
                <input
                  v-model="formData.rank"
                  type="text"
                  placeholder="Rank or Title (optional)"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-yellow-400 transition text-sm"
                />
              </div>

              <!-- Your Story -->
              <div class="space-y-4 pt-4 border-t border-gray-600">
                <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <span>📖</span> Your Story
                </h4>
                <textarea
                  v-model="formData.story"
                  placeholder="What's your story? What would you like to talk about? Don't worry about grammar—just share what matters to you."
                  rows="4"
                  class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 transition text-sm resize-none"
                ></textarea>
                <p class="text-xs text-gray-400">{{ formData.story.length }}/1000 characters</p>
              </div>

              <!-- Application Type -->
              <div class="space-y-3 pt-4 border-t border-gray-600">
                <h4 class="text-sm font-semibold text-gray-300">Why are you interested?</h4>
                <select
                  v-model="formData.applicationType"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-yellow-400 transition text-sm"
                >
                  <option value="podcast-guest">Podcast Guest / Tell My Story</option>
                  <option value="community-member">Community Member / Connect with Others</option>
                  <option value="contributor">Contributor / Share Expertise</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="space-y-3">
            <button
              @click="handleSubmit"
              :disabled="!hasContactMethod || loading"
              class="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 text-gray-900 font-bold py-4 px-6 rounded-lg transition duration-200 text-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="!loading">🚀 Submit Application</span>
              <span v-else>⏳ Submitting...</span>
            </button>
            <p class="text-center text-xs text-gray-400">
              No hidden requirements • No pressure to share more than you're comfortable with
            </p>
          </div>
        </div>
      </div>
    </div>
  `
};
