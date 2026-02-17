import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

export default {
  name: 'GuestDashboard',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    // Form state
    const showConversionForm = ref(false);
    const conversionForm = ref({
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      preferAnonymous: false,
      anonymousHandle: ''
    });

    // UI state
    const isLoading = ref(false);
    const sessions = ref([]);
    const loadingError = ref('');
    const conversionError = ref('');
    const conversionSuccess = ref(false);

    // Computed properties
    const completedSteps = computed(() => {
      let count = 0;
      if (sessions.value.length > 0) count++; // Has recorded
      if (conversionSuccess.value || !authStore.user.value?.isTemporary) count++; // Set password
      // Add more completion logic as needed
      return count;
    });

    const progressPercent = computed(() => {
      return Math.round((completedSteps.value / 4) * 100);
    });

    const passwordsMatch = computed(() => {
      if (!conversionForm.value.password) return true; // Empty is OK for now
      return conversionForm.value.password === conversionForm.value.confirmPassword;
    });

    const passwordValid = computed(() => {
      const pwd = conversionForm.value.password;
      if (!pwd) return false;
      return (
        pwd.length >= 8 &&
        /[A-Z]/.test(pwd) &&
        /[a-z]/.test(pwd) &&
        /[0-9]/.test(pwd)
      );
    });

    const canSubmitConversion = computed(() => {
      return (
        passwordValid.value &&
        passwordsMatch.value &&
        !isLoading.value
      );
    });

    // Load recording sessions
    onMounted(async () => {
      try {
        const response = await window.api.get('/recordings/sessions/my-sessions');
        if (response.success) {
          sessions.value = response.data.sessions || [];
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
        loadingError.value = 'Failed to load your recording sessions';
      }
    });

    // Handle conversion form submission
    const submitConversion = async () => {
      if (!canSubmitConversion.value) return;

      isLoading.value = true;
      conversionError.value = '';

      try {
        const payload = {
          password: conversionForm.value.password,
          firstName: conversionForm.value.firstName || undefined,
          lastName: conversionForm.value.lastName || undefined
        };

        if (conversionForm.value.preferAnonymous && conversionForm.value.anonymousHandle) {
          payload.anonymousHandle = conversionForm.value.anonymousHandle;
        }

        const response = await window.api.completeRegistration(payload);

        if (response.success) {
          // Update auth store
          authStore.setToken(response.data.token);
          authStore.setUser(response.data.user);
          conversionSuccess.value = true;

          // Redirect after a brief moment
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        }
      } catch (error) {
        console.error('Error completing registration:', error);
        conversionError.value = error.message || 'Failed to complete registration';
      } finally {
        isLoading.value = false;
      }
    };

    return {
      authStore,
      showConversionForm,
      conversionForm,
      isLoading,
      sessions,
      loadingError,
      conversionError,
      conversionSuccess,
      completedSteps,
      progressPercent,
      passwordsMatch,
      passwordValid,
      canSubmitConversion,
      submitConversion
    };
  },

  template: `
    <div class="min-h-screen bg-gradient-to-b from-blue-950 to-slate-900 py-8 px-4">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">Welcome to Veteran's Scene</h1>
          <p class="text-gray-300">Your temporary guest account is ready to go</p>
        </div>

        <!-- Progress Tracker -->
        <div class="bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-blue-700">
          <h2 class="text-lg font-semibold text-white mb-4">Account Setup Progress</h2>

          <div class="mb-4">
            <div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                class="bg-gradient-to-r from-blue-500 to-yellow-400 h-full transition-all duration-500"
                :style="{ width: progressPercent + '%' }"
              ></div>
            </div>
            <p class="text-right text-sm text-gray-300 mt-2">{{ progressPercent }}% Complete</p>
          </div>

          <!-- Steps -->
          <div class="space-y-3">
            <!-- Step 1: Record -->
            <div class="flex items-center gap-3">
              <div :class="[
                'w-8 h-8 rounded-full flex items-center justify-center font-bold',
                sessions.length > 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-gray-400'
              ]">
                <span v-if="sessions.length > 0">✓</span>
                <span v-else>🎬</span>
              </div>
              <div>
                <p class="text-white font-semibold">Record Your Story</p>
                <p v-if="sessions.length > 0" class="text-sm text-emerald-300">Completed - {{ sessions.length }} session(s)</p>
                <p v-else class="text-sm text-gray-400">Record a video or audio message</p>
              </div>
            </div>

            <!-- Step 2: Password -->
            <div class="flex items-center gap-3">
              <div :class="[
                'w-8 h-8 rounded-full flex items-center justify-center font-bold',
                !authStore.user?.isTemporary
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 text-white'
              ]">
                <span v-if="!authStore.user?.isTemporary">✓</span>
                <span v-else>🔐</span>
              </div>
              <div>
                <p class="text-white font-semibold">Set Your Password</p>
                <p v-if="!authStore.user?.isTemporary" class="text-sm text-emerald-300">Completed</p>
                <p v-else class="text-sm text-gray-400">Create a secure password for your account</p>
              </div>
            </div>

            <!-- Step 3: Photo -->
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-slate-700 text-gray-400">
                📷
              </div>
              <div>
                <p class="text-white font-semibold">Add a Profile Photo</p>
                <p class="text-sm text-gray-400">Coming soon - personalize your profile</p>
              </div>
            </div>

            <!-- Step 4: Member -->
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-slate-700 text-gray-400">
                🎖️
              </div>
              <div>
                <p class="text-white font-semibold">Full Member</p>
                <p class="text-sm text-gray-400">Unlock all platform features</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Sessions -->
        <div v-if="sessions.length > 0" class="bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-blue-700">
          <h2 class="text-lg font-semibold text-white mb-4">Your Recording Sessions</h2>

          <div class="space-y-3">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="bg-slate-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p class="text-white font-semibold">{{ session.description || 'Recording Session' }}</p>
                <p class="text-sm text-gray-400">
                  Status: <span class="text-blue-300 font-semibold">{{ session.status }}</span>
                </p>
                <p v-if="session.recordingsCompleted" class="text-sm text-gray-400">
                  Recordings: {{ session.recordingsCompleted }}
                </p>
              </div>
              <router-link
                :to="'/recording/' + session.id"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Record Now
              </router-link>
            </div>
          </div>
        </div>

        <!-- Loading Error -->
        <div v-if="loadingError" class="bg-red-900 border border-red-600 rounded-xl p-4 mb-8">
          <p class="text-red-200">{{ loadingError }}</p>
        </div>

        <!-- Conversion Form Panel -->
        <div class="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-xl shadow-lg p-6 border border-yellow-600">
          <div v-if="!conversionSuccess" class="space-y-6">
            <div>
              <h2 class="text-xl font-bold text-white mb-2">Convert to Full Account</h2>
              <p class="text-yellow-100">
                You're currently using a temporary guest account. Complete these steps to unlock full access:
              </p>
            </div>

            <!-- Toggle Form Button -->
            <div v-if="!showConversionForm">
              <button
                @click="showConversionForm = true"
                class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-lg"
              >
                ⬇️ Complete My Account Setup
              </button>
            </div>

            <!-- Conversion Form -->
            <div v-else class="space-y-4">
              <p class="text-yellow-100 text-sm font-semibold">All fields below are required</p>

              <!-- Error Message -->
              <div v-if="conversionError" class="bg-red-900 border border-red-600 rounded-lg p-3">
                <p class="text-red-200">{{ conversionError }}</p>
              </div>

              <!-- Password Field -->
              <div>
                <label class="block text-white font-semibold mb-2">New Password *</label>
                <input
                  v-model="conversionForm.password"
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                  class="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <p v-if="conversionForm.password" class="text-sm mt-1" :class="passwordValid ? 'text-emerald-300' : 'text-red-300'">
                  <span v-if="conversionForm.password.length >= 8" class="block">✓ At least 8 characters</span>
                  <span v-if="!/[A-Z]/.test(conversionForm.password)" class="block text-red-300">✗ Needs uppercase letter</span>
                  <span v-if="!/[a-z]/.test(conversionForm.password)" class="block text-red-300">✗ Needs lowercase letter</span>
                  <span v-if="!/[0-9]/.test(conversionForm.password)" class="block text-red-300">✗ Needs a number</span>
                  <span v-if="conversionForm.password.length >= 8 && /[A-Z]/.test(conversionForm.password) && /[a-z]/.test(conversionForm.password) && /[0-9]/.test(conversionForm.password)" class="block text-emerald-300">✓ Strong password</span>
                </p>
              </div>

              <!-- Confirm Password -->
              <div>
                <label class="block text-white font-semibold mb-2">Confirm Password *</label>
                <input
                  v-model="conversionForm.confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  class="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <p v-if="conversionForm.confirmPassword && !passwordsMatch" class="text-sm text-red-300 mt-1">
                  ✗ Passwords don't match
                </p>
              </div>

              <!-- Name Fields -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-white font-semibold mb-2">First Name</label>
                  <input
                    v-model="conversionForm.firstName"
                    type="text"
                    placeholder="Optional"
                    class="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-white font-semibold mb-2">Last Name</label>
                  <input
                    v-model="conversionForm.lastName"
                    type="text"
                    placeholder="Optional"
                    class="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <!-- Anonymous Option -->
              <div class="space-y-3">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    v-model="conversionForm.preferAnonymous"
                    type="checkbox"
                    class="w-4 h-4"
                  />
                  <span class="text-white font-semibold">I prefer to remain anonymous</span>
                </label>

                <!-- Anonymous Handle (shown if checkbox is checked) -->
                <div v-if="conversionForm.preferAnonymous">
                  <label class="block text-white font-semibold mb-2">Anonymous Handle</label>
                  <input
                    v-model="conversionForm.anonymousHandle"
                    type="text"
                    placeholder="e.g., SoldierStories, VeteranVoice"
                    maxlength="50"
                    class="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  <p class="text-sm text-gray-400 mt-1">This name will appear publicly instead of your real name</p>
                </div>
              </div>

              <!-- Submit Button -->
              <button
                @click="submitConversion"
                :disabled="!canSubmitConversion"
                :class="[
                  'w-full px-6 py-3 font-bold rounded-lg transition text-lg',
                  canSubmitConversion
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-600 text-gray-400 cursor-not-allowed'
                ]"
              >
                <span v-if="isLoading" class="inline-block">⏳ Converting...</span>
                <span v-else>✓ Complete Account Setup</span>
              </button>

              <!-- Cancel Button -->
              <button
                v-if="!isLoading"
                @click="showConversionForm = false"
                class="w-full px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Success Message -->
          <div v-else class="text-center space-y-4">
            <div class="text-5xl mb-4">✅</div>
            <h3 class="text-2xl font-bold text-white">Account Converted!</h3>
            <p class="text-yellow-100">Your temporary account is now a full member account.</p>
            <p class="text-sm text-yellow-200">Redirecting you to your dashboard...</p>
          </div>
        </div>

        <!-- Info Box -->
        <div class="mt-8 bg-blue-900 border border-blue-600 rounded-xl p-4">
          <p class="text-blue-200 text-sm">
            <strong>Note:</strong> Your temporary account gives you access to record right away.
            When ready, complete your account setup above to unlock all features and keep your account permanently.
          </p>
        </div>
      </div>
    </div>
  `
};
