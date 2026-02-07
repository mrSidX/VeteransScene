import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  name: 'Waiver',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const applicationId = ref(route.params.applicationId);
    const fullName = ref('');
    const email = ref('');
    const consentType = ref('audio_video');
    const signature = ref('');
    const agreeToTerms = ref(false);
    const loading = ref(false);
    const error = ref('');
    const success = ref(false);
    const applicantInfo = ref(null);

    // Load applicant info from API
    const loadApplicantInfo = async () => {
      try {
        console.log('[Waiver] Loading applicant info for:', applicationId.value);
        const url = `${window.api.baseURL}/waivers/${applicationId.value}`;
        console.log('[Waiver] API URL:', url);

        const response = await fetch(url);
        console.log('[Waiver] Response status:', response.status);

        const data = await response.json();
        console.log('[Waiver] Response data:', data);

        if (data.success) {
          applicantInfo.value = data.data.application;
          fullName.value = `${data.data.application.firstName} ${data.data.application.lastName}`;
          email.value = data.data.application.email;
          console.log('[Waiver] Loaded applicant info:', applicantInfo.value);
        } else {
          error.value = 'Failed to load application: ' + data.message;
          console.error('[Waiver] API error:', data.message);
        }
      } catch (err) {
        error.value = 'Error loading waiver: ' + err.message;
        console.error('[Waiver] Error loading applicant info:', err);
      }
    };

    // Sign waiver
    const handleSignWaiver = async () => {
      error.value = '';

      if (!signature.value.trim()) {
        error.value = 'Please enter your signature';
        return;
      }

      if (!agreeToTerms.value) {
        error.value = 'You must agree to the terms';
        return;
      }

      loading.value = true;

      try {
        const response = await fetch(`${window.api.baseURL}/waivers/${applicationId.value}/sign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fullName: fullName.value,
            email: email.value,
            consentType: consentType.value,
            signature: signature.value
          })
        });

        const data = await response.json();

        if (data.success) {
          success.value = true;
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          error.value = data.message || 'Error signing waiver';
        }
      } catch (err) {
        console.error('Error signing waiver:', err);
        error.value = 'Error signing waiver. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    // Print waiver
    const handlePrintWaiver = () => {
      window.print();
    };

    return {
      applicationId,
      fullName,
      email,
      consentType,
      signature,
      agreeToTerms,
      loading,
      error,
      success,
      applicantInfo,
      handleSignWaiver,
      handlePrintWaiver,
      loadApplicantInfo
    };
  },

  mounted() {
    this.loadApplicantInfo();
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div class="max-w-3xl mx-auto print:max-w-4xl">

        <!-- Debug Info (remove later) -->
        <div v-if="error" class="mb-4 p-4 bg-red-900 border border-red-700 rounded text-red-200">
          <strong>Error:</strong> {{ error }}
        </div>

        <!-- Loading State -->
        <div v-if="loading && !applicantInfo" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading waiver...</p>
        </div>

        <!-- Waiver Content (only show if loaded) -->
        <div v-if="applicantInfo || !loading">
        <!-- Header with Logo -->
        <div class="text-center mb-8 print:mb-4">
          <img src="/assets/img/vs-logo.jpg" alt="Veterans Scene Logo" class="h-16 w-16 mx-auto rounded-lg mb-4">
          <h1 class="text-3xl font-bold text-yellow-400 mb-2">Release of Liability, Media Consent & Trauma-Informed Participation Agreement</h1>
          <p class="text-gray-400 text-sm">Veterans Scene | veteransscene.org | veteransscene@gmail.com</p>
        </div>

        <!-- Main Content -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-8 print:bg-white print:text-black print:border-black">
          <!-- Waiver Content -->
          <div class="waiver-content space-y-6">
            <section>
              <h2 class="text-xl font-bold mb-3 print:text-black">1. Voluntary Participation</h2>
              <p class="text-gray-300 print:text-black">Participation in Veterans Scene podcasts, interviews, or recordings is entirely voluntary. You may refuse to answer any question, request a break, or stop participation at any time without penalty.</p>
            </section>

            <section>
              <h2 class="text-xl font-bold mb-3 print:text-black">2. Trauma-Informed & PTSD-Aware Participation</h2>
              <p class="text-gray-300 print:text-black">You are not required to discuss trauma, combat experiences, PTSD, or any subject that causes discomfort.</p>
              <p class="text-gray-300 print:text-black mt-2">You acknowledge that:</p>
              <ul class="list-disc list-inside text-gray-300 print:text-black mt-2 space-y-1">
                <li>This podcast is not mental health treatment or therapy</li>
                <li>You are responsible for your personal well-being before, during, and after participation</li>
                <li>You are encouraged to seek professional support if participation brings up distressing emotions</li>
              </ul>
            </section>

            <section>
              <h2 class="text-xl font-bold mb-3 print:text-black">3. Recording & Media Consent</h2>
              <p class="text-gray-300 print:text-black">You voluntarily grant Veterans Scene permission to:</p>
              <ul class="list-disc list-inside text-gray-300 print:text-black mt-2 space-y-1">
                <li>Record your audio and/or video</li>
                <li>Edit recordings for clarity, length, or production quality</li>
                <li>Distribute recordings in whole or in part via podcasts, websites, social media, streaming platforms, promotional materials, or archival use</li>
              </ul>
              <p class="text-gray-300 print:text-black mt-2">You understand that recordings may be publicly accessible and shared indefinitely.</p>
            </section>

            <section>
              <h2 class="text-xl font-bold mb-3 print:text-black">4. Release of Liability</h2>
              <p class="text-gray-300 print:text-black">You release and hold harmless Veterans Scene, its volunteers, affiliates, and partners from any claims, demands, or liabilities arising from participation, including but not limited to emotional distress, reputational impact, or use of recorded statements.</p>
            </section>

            <section>
              <h2 class="text-xl font-bold mb-3 print:text-black">5. No Compensation or Ownership</h2>
              <p class="text-gray-300 print:text-black">You understand that participation is voluntary and unpaid. You do not retain ownership or editorial control over final published content unless otherwise agreed to in writing.</p>
            </section>

            <section>
              <h2 class="text-xl font-bold mb-3 print:text-black">6. Withdrawal of Consent</h2>
              <p class="text-gray-300 print:text-black">You may request withdrawal of consent prior to publication. Once content has been published or distributed, complete removal cannot be guaranteed.</p>
            </section>

            <section>
              <h2 class="text-xl font-bold mb-3 print:text-black">7. Electronic Signature Consent</h2>
              <p class="text-gray-300 print:text-black">You agree that your typed or electronic signature is legally binding and equivalent to a handwritten signature under applicable law, including the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN Act).</p>
            </section>

            <!-- Consent Type Selection -->
            <section v-if="!success" class="border-t border-gray-700 pt-6 mt-6 print:hidden">
              <h3 class="text-lg font-bold mb-4">Media Consent Type</h3>
              <div class="space-y-3">
                <label class="flex items-center cursor-pointer">
                  <input v-model="consentType" type="radio" value="audio" class="w-4 h-4">
                  <span class="ml-3">Audio Only</span>
                </label>
                <label class="flex items-center cursor-pointer">
                  <input v-model="consentType" type="radio" value="video" class="w-4 h-4">
                  <span class="ml-3">Video Only</span>
                </label>
                <label class="flex items-center cursor-pointer">
                  <input v-model="consentType" type="radio" value="audio_video" class="w-4 h-4">
                  <span class="ml-3">Audio & Video</span>
                </label>
              </div>
            </section>

            <!-- Signature Section -->
            <section v-if="!success" class="border-t border-gray-700 pt-6 mt-6 print:hidden">
              <h3 class="text-lg font-bold mb-4">Participant Information & Signature</h3>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    v-model="fullName"
                    type="text"
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium mb-1">Email</label>
                  <input
                    v-model="email"
                    type="email"
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium mb-1">Signature (Type Your Name)</label>
                  <input
                    v-model="signature"
                    type="text"
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white italic"
                    placeholder="Type your signature here"
                  />
                  <p class="text-xs text-gray-400 mt-1">Your typed signature is legally binding</p>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="text"
                    :value="new Date().toLocaleDateString('en-US')"
                    disabled
                    class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-400"
                  />
                </div>

                <div>
                  <label class="flex items-center cursor-pointer">
                    <input v-model="agreeToTerms" type="checkbox" class="w-4 h-4">
                    <span class="ml-3 text-sm">I agree to all terms and conditions above</span>
                  </label>
                </div>
              </div>

              <!-- Error Message -->
              <div v-if="error" class="mt-4 p-4 bg-red-900 border border-red-700 text-red-200 rounded">
                {{ error }}
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-4 mt-6">
                <button
                  @click="handleSignWaiver"
                  :disabled="loading"
                  class="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-gray-900 font-medium py-3 rounded transition"
                >
                  {{ loading ? 'Signing...' : 'Sign Waiver' }}
                </button>
                <button
                  @click="handlePrintWaiver"
                  class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded transition"
                >
                  Print Waiver
                </button>
              </div>
            </section>
          </div>

          <!-- Success Message -->
          <div v-if="success" class="text-center py-12">
            <div class="text-6xl mb-4">✓</div>
            <h2 class="text-2xl font-bold text-green-400 mb-2">Waiver Signed Successfully!</h2>
            <p class="text-gray-400">Thank you for participating. You will be redirected shortly...</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-8 text-center text-xs text-gray-500 print:mt-4">
          <p>Veterans Scene | veteransscene.org | veteransscene@gmail.com</p>
          <p class="mt-2">This information is provided by veteran volunteers and is not affiliated with or endorsed by the U.S. Department of Veterans Affairs.</p>
        </div>
        </div>
      </div>
    </div>
  `
};
