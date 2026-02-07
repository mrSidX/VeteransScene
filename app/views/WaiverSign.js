import { ref, reactive, onMounted, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { useRouter, useRoute } from 'https://unpkg.com/vue-router@4/dist/vue-router.esm-browser.js';
import { useAuthStore } from '../stores/auth.js';
import ApiService from '../services/api.js';

export default {
  name: 'WaiverSign',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    const applicationId = route.params.applicationId;
    const loading = ref(true);
    const submitting = ref(false);
    const error = ref(null);
    const success = ref(false);

    const waiver = reactive({
      application: null,
      waiverText: '',
      existingWaiver: null,
      applicationStatus: 'not_signed'
    });

    const form = reactive({
      fullName: '',
      email: '',
      consentType: 'audio_video',
      signatureName: ''
    });

    const canSign = computed(() => {
      return form.fullName && form.email && form.consentType && form.signatureName;
    });

    const currentDateTime = computed(() => {
      const now = new Date();
      return now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    });

    onMounted(async () => {
      try {
        // Check if user is authenticated
        if (!authStore.isAuthenticated.value) {
          router.push('/login');
          return;
        }

        loading.value = true;

        // Fetch waiver form
        const response = await ApiService.get(`/waivers/${applicationId}`);

        if (response.success) {
          waiver.application = response.data.application;
          waiver.waiverText = response.data.waiverText;
          waiver.existingWaiver = response.data.existingWaiver;
          waiver.applicationStatus = response.data.applicationStatus;

          // Pre-fill form with application data
          form.fullName = `${waiver.application.firstName} ${waiver.application.lastName}`;
          form.email = waiver.application.email;

          // If already signed, show existing signature
          if (waiver.existingWaiver) {
            form.signatureName = waiver.existingWaiver.signatureName;
            form.consentType = waiver.existingWaiver.consentType;
          }
        } else {
          error.value = response.message || 'Failed to load waiver';
        }
      } catch (err) {
        console.error('Error loading waiver:', err);
        error.value = err.message || 'Error loading waiver form';
      } finally {
        loading.value = false;
      }
    });

    const handleSubmit = async () => {
      if (!canSign.value) {
        error.value = 'Please fill in all required fields';
        return;
      }

      try {
        submitting.value = true;
        error.value = null;

        const response = await ApiService.post(
          `/waivers/${applicationId}/sign`,
          form
        );

        if (response.success) {
          success.value = true;
          waiver.existingWaiver = response.data.waiver;
          console.log('✅ Waiver signed successfully');
        } else {
          error.value = response.message || 'Failed to sign waiver';
        }
      } catch (err) {
        console.error('Error signing waiver:', err);
        error.value = err.message || 'Error signing waiver';
      } finally {
        submitting.value = false;
      }
    };

    const downloadPDF = async () => {
      try {
        // Create a temporary link and trigger download
        const pdfUrl = `/api/waivers/${applicationId}/download-pdf`;
        const token = localStorage.getItem('vs_auth_token');

        const response = await fetch(pdfUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to download PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `waiver-signed-${applicationId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Error downloading PDF:', err);
        error.value = 'Failed to download PDF';
      }
    };

    const goBack = () => {
      router.back();
    };

    return {
      applicationId,
      loading,
      submitting,
      error,
      success,
      waiver,
      form,
      canSign,
      currentDateTime,
      handleSubmit,
      downloadPDF,
      goBack
    };
  },
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <!-- Back Button -->
        <button
          @click="goBack"
          class="mb-6 flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back
        </button>

        <!-- Header -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">Media Release & Waiver</h1>
          <p class="text-slate-300">Please review and sign below</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <div class="inline-block animate-spin mb-4">
            <div class="h-8 w-8 border-4 border-slate-400 border-t-yellow-500 rounded-full"></div>
          </div>
          <p class="text-slate-300">Loading waiver...</p>
        </div>

        <!-- Error Message -->
        <div v-else-if="error && !success" class="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          {{ error }}
        </div>

        <!-- Success State -->
        <div v-if="success" class="mb-8 p-6 bg-green-500/20 border border-green-500 rounded-lg">
          <div class="flex items-start gap-4">
            <svg class="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <div class="flex-1">
              <h3 class="font-bold text-green-400 text-lg">Waiver Signed Successfully! ✅</h3>
              <p class="text-green-300 mt-2">Your waiver has been electronically signed and recorded.</p>
              <button
                @click="downloadPDF"
                class="mt-4 inline-block px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold rounded-lg transition"
              >
                📥 Download Signed Waiver (PDF)
              </button>
            </div>
          </div>
        </div>

        <!-- Waiver Content -->
        <div v-else class="space-y-8">
          <!-- Waiver Text -->
          <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6 md:p-8">
            <div class="prose prose-invert max-w-none">
              <div class="text-slate-300 whitespace-pre-wrap text-sm md:text-base leading-relaxed">
                {{ waiver.waiverText }}
              </div>
            </div>
          </div>

          <!-- Signature Form -->
          <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6 md:p-8">
            <h2 class="text-2xl font-bold text-yellow-400 mb-6">Participant Signature</h2>

            <!-- Existing Waiver Notice -->
            <div v-if="waiver.existingWaiver" class="mb-6 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
              <p class="text-blue-200">
                <strong>Note:</strong> This waiver has already been signed on {{ new Date(waiver.existingWaiver.signedDate).toLocaleDateString() }}.
                You can view or re-download it below.
              </p>
            </div>

            <div class="space-y-6">
              <!-- Full Name -->
              <div>
                <label class="block text-sm font-semibold text-slate-300 mb-2">Full Name</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  disabled
                  class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
                />
                <p class="text-xs text-slate-400 mt-1">Auto-filled from your application</p>
              </div>

              <!-- Email -->
              <div>
                <label class="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                <input
                  v-model="form.email"
                  type="email"
                  disabled
                  class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
                />
                <p class="text-xs text-slate-400 mt-1">Auto-filled from your application</p>
              </div>

              <!-- Consent Type -->
              <div>
                <label class="block text-sm font-semibold text-slate-300 mb-3">I consent to</label>
                <div class="space-y-3">
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input
                      v-model="form.consentType"
                      type="radio"
                      value="audio"
                      :disabled="waiver.existingWaiver"
                      class="w-4 h-4 accent-yellow-500"
                    />
                    <span class="text-slate-300 group-hover:text-white transition">Audio Recording Only</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input
                      v-model="form.consentType"
                      type="radio"
                      value="video"
                      :disabled="waiver.existingWaiver"
                      class="w-4 h-4 accent-yellow-500"
                    />
                    <span class="text-slate-300 group-hover:text-white transition">Video Recording Only</span>
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input
                      v-model="form.consentType"
                      type="radio"
                      value="audio_video"
                      :disabled="waiver.existingWaiver"
                      class="w-4 h-4 accent-yellow-500"
                    />
                    <span class="text-slate-300 group-hover:text-white transition">Audio & Video Recording</span>
                  </label>
                </div>
              </div>

              <!-- Signature (Typed Name) -->
              <div>
                <label class="block text-sm font-semibold text-slate-300 mb-2">
                  Your Signature (Type Your Name)
                </label>
                <input
                  v-model="form.signatureName"
                  type="text"
                  placeholder="Sign by typing your full name"
                  :disabled="waiver.existingWaiver"
                  class="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:border-yellow-500 focus:outline-none transition"
                />
                <p class="text-xs text-slate-400 mt-2">
                  By typing your name, you are electronically signing this waiver. This is legally binding.
                </p>
              </div>

              <!-- Date/Time Stamp -->
              <div class="p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <p class="text-sm text-slate-400">
                  <strong>Current Date & Time:</strong><br />
                  {{ currentDateTime }}
                </p>
              </div>

              <!-- Terms Acknowledgment -->
              <div class="p-4 bg-amber-500/20 border border-amber-500 rounded-lg">
                <p class="text-sm text-amber-200">
                  ✓ I have read and understood the waiver
                  <br />✓ I agree to all terms and conditions
                  <br />✓ I am signing this electronically and understand it is legally binding
                </p>
              </div>

              <!-- Submit Button -->
              <button
                v-if="!waiver.existingWaiver"
                @click="handleSubmit"
                :disabled="!canSign || submitting"
                class="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold rounded-lg transition flex items-center justify-center gap-2"
              >
                <span v-if="!submitting">🔒 Sign & Submit Waiver</span>
                <span v-else class="flex items-center gap-2">
                  <div class="animate-spin">
                    <div class="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full"></div>
                  </div>
                  Signing...
                </span>
              </button>

              <!-- Download Existing Waiver -->
              <button
                v-else
                @click="downloadPDF"
                class="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
              >
                📥 Download Signed Waiver (PDF)
              </button>
            </div>
          </div>

          <!-- Information Banner -->
          <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 class="font-bold text-slate-200 mb-3">ℹ️ Important Information</h3>
            <ul class="text-sm text-slate-300 space-y-2">
              <li>• This waiver is legally binding once you sign</li>
              <li>• Your signature will be recorded electronically with date/time and IP address</li>
              <li>• You will receive a PDF copy of your signed waiver</li>
              <li>• Keep a copy for your records</li>
              <li>• If you have questions, contact us before signing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `
};
