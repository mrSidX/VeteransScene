import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { API_CONFIG } from '../config.js';

export default {
  name: 'WaiverPublic',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const token = ref(route.params.token);
    const loading = ref(true);
    const submitting = ref(false);
    const error = ref('');
    const success = ref(false);

    const waiver = reactive({
      application: null,
      waiverText: '',
      waiverVersion: '',
      existingWaiver: null,
      applicationStatus: 'not_signed'
    });

    const form = reactive({
      fullName: '',
      email: '',
      consentType: 'audio_video',
      signatureName: '',
      consentToElectronicSignature: false,
      agreedToTerms: false
    });

    const canSign = computed(() => {
      return form.fullName &&
        form.email &&
        form.consentType &&
        form.signatureName &&
        form.consentToElectronicSignature &&
        form.agreedToTerms;
    });

    const currentDateTime = computed(() => {
      return new Date().toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    });

    const apiBase = API_CONFIG.BASE_URL;

    onMounted(async () => {
      try {
        loading.value = true;
        const response = await fetch(`${apiBase}/waivers/public/${token.value}`);
        const data = await response.json();

        if (data.success) {
          waiver.application = data.data.application;
          waiver.waiverText = data.data.waiverText;
          waiver.waiverVersion = data.data.waiverVersion;
          waiver.existingWaiver = data.data.existingWaiver;
          waiver.applicationStatus = data.data.applicationStatus;

          // Pre-fill from application
          form.fullName = `${waiver.application.firstName || ''} ${waiver.application.lastName || ''}`.trim();
          form.email = waiver.application.email || '';

          if (waiver.existingWaiver) {
            form.signatureName = waiver.existingWaiver.signatureName;
            form.consentType = waiver.existingWaiver.consentType;
          }
        } else {
          error.value = data.message || 'Failed to load waiver';
        }
      } catch (err) {
        error.value = 'Unable to load waiver. The link may be invalid or expired.';
      } finally {
        loading.value = false;
      }
    });

    const handleSignWaiver = async () => {
      error.value = '';

      if (!canSign.value) {
        error.value = 'Please complete all required fields and checkboxes';
        return;
      }

      submitting.value = true;

      try {
        const response = await fetch(`${apiBase}/waivers/public/${token.value}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            consentType: form.consentType,
            signatureName: form.signatureName,
            consentToElectronicSignature: String(form.consentToElectronicSignature),
            agreedToTerms: String(form.agreedToTerms)
          })
        });

        const data = await response.json();

        if (data.success) {
          success.value = true;
          waiver.existingWaiver = data.data.waiver;
        } else {
          error.value = data.message || 'Error signing waiver';
        }
      } catch (err) {
        error.value = 'Error signing waiver. Please try again.';
      } finally {
        submitting.value = false;
      }
    };

    const downloadPDF = async () => {
      try {
        const response = await fetch(`${apiBase}/waivers/public/${token.value}/download-pdf`);

        if (!response.ok) throw new Error('Failed to download PDF');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `veterans-scene-waiver-signed.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        error.value = 'Failed to download PDF';
      }
    };

    const handlePrintWaiver = () => {
      window.print();
    };

    return {
      token, loading, submitting, error, success,
      waiver, form, canSign, currentDateTime,
      handleSignWaiver, downloadPDF, handlePrintWaiver
    };
  },

  template: `
    <div class="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div class="max-w-3xl mx-auto print:max-w-4xl">

        <!-- Loading -->
        <div v-if="loading" class="text-center py-20">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p class="mt-4 text-gray-400">Loading waiver...</p>
        </div>

        <!-- Invalid/Expired Link -->
        <div v-else-if="error && !waiver.application" class="text-center py-20">
          <div class="text-6xl mb-6 text-red-400">!</div>
          <h2 class="text-2xl font-bold text-red-400 mb-4">Unable to Load Waiver</h2>
          <p class="text-gray-400 max-w-md mx-auto">{{ error }}</p>
          <p class="text-gray-500 mt-4 text-sm">If you believe this is an error, please contact Veterans Scene at veteransscene@gmail.com</p>
        </div>

        <!-- Success State -->
        <div v-else-if="success" class="text-center py-12">
          <div class="bg-green-900/30 border border-green-600 rounded-xl p-10 max-w-lg mx-auto">
            <div class="text-6xl mb-4 text-green-400">&#10003;</div>
            <h2 class="text-2xl font-bold text-green-400 mb-4">Waiver Signed Successfully</h2>
            <p class="text-gray-300 mb-2">Thank you for signing the media release waiver.</p>
            <p class="text-gray-400 text-sm mb-6">Your electronic signature has been recorded and is legally binding.</p>

            <div v-if="waiver.existingWaiver?.documentHash" class="text-left bg-gray-800/50 rounded-lg p-4 mb-6 text-xs">
              <p class="text-gray-500 mb-1">Document Hash (SHA-256):</p>
              <p class="text-gray-400 font-mono break-all">{{ waiver.existingWaiver.documentHash }}</p>
            </div>

            <button
              @click="downloadPDF"
              class="w-full py-3 px-6 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-bold rounded-lg transition"
            >
              Download Signed Waiver (PDF)
            </button>
            <p class="text-gray-500 text-xs mt-3">Keep a copy for your records</p>
          </div>
        </div>

        <!-- Waiver Content -->
        <div v-else>
          <!-- Header -->
          <div class="text-center mb-8 print:mb-4">
            <h1 class="text-3xl font-bold text-yellow-400 mb-2">Release of Liability, Media Consent & Trauma-Informed Participation Agreement</h1>
            <p class="text-gray-400 text-sm">Veterans Scene | veteransscene.org | veteransscene@gmail.com</p>
          </div>

          <!-- Error banner -->
          <div v-if="error" class="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {{ error }}
          </div>

          <!-- Already signed notice -->
          <div v-if="waiver.existingWaiver && waiver.existingWaiver.status === 'signed'" class="mb-6 p-6 bg-green-900/30 border border-green-600 rounded-lg">
            <h3 class="font-bold text-green-400 mb-2">This waiver has already been signed</h3>
            <p class="text-gray-300 text-sm mb-3">
              Signed on {{ new Date(waiver.existingWaiver.signedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}
              by {{ waiver.existingWaiver.signatureName }}
            </p>
            <button
              @click="downloadPDF"
              class="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition"
            >
              Download Signed Copy (PDF)
            </button>
          </div>

          <!-- Main waiver body -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-8 print:bg-white print:text-black print:border-black">
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
                <p class="text-gray-300 print:text-black">You agree that your typed or electronic signature is legally binding and equivalent to a handwritten signature under applicable law, including the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. 7001 et seq.) and the Uniform Electronic Transactions Act (UETA).</p>
              </section>

              <!-- Signing Section (only if not already signed) -->
              <div v-if="!waiver.existingWaiver || waiver.existingWaiver.status !== 'signed'" class="border-t border-gray-700 pt-8 mt-8 print:hidden">

                <!-- Media Consent Type -->
                <section class="mb-8">
                  <h3 class="text-lg font-bold mb-4 text-yellow-400">Media Consent Type</h3>
                  <div class="space-y-3">
                    <label class="flex items-center cursor-pointer group">
                      <input v-model="form.consentType" type="radio" value="audio" class="w-4 h-4 accent-yellow-500" />
                      <span class="ml-3 text-gray-300 group-hover:text-white transition">Audio Recording Only</span>
                    </label>
                    <label class="flex items-center cursor-pointer group">
                      <input v-model="form.consentType" type="radio" value="video" class="w-4 h-4 accent-yellow-500" />
                      <span class="ml-3 text-gray-300 group-hover:text-white transition">Video Recording Only</span>
                    </label>
                    <label class="flex items-center cursor-pointer group">
                      <input v-model="form.consentType" type="radio" value="audio_video" class="w-4 h-4 accent-yellow-500" />
                      <span class="ml-3 text-gray-300 group-hover:text-white transition">Audio & Video Recording</span>
                    </label>
                  </div>
                </section>

                <!-- Participant Info -->
                <section class="mb-8">
                  <h3 class="text-lg font-bold mb-4 text-yellow-400">Participant Information & Signature</h3>

                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                      <input
                        v-model="form.fullName"
                        type="text"
                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                        placeholder="Enter your full legal name"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                      <input
                        v-model="form.email"
                        type="email"
                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-yellow-500 focus:outline-none"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-300 mb-1">Signature (Type Your Full Legal Name)</label>
                      <input
                        v-model="form.signatureName"
                        type="text"
                        class="w-full bg-gray-700 border-2 border-yellow-600/50 rounded-lg px-4 py-3 text-white italic text-lg focus:border-yellow-500 focus:outline-none"
                        placeholder="Type your full legal name as your signature"
                      />
                    </div>

                    <div class="p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                      <p class="text-sm text-gray-400">
                        <strong>Date & Time:</strong> {{ currentDateTime }}
                      </p>
                    </div>
                  </div>
                </section>

                <!-- Legal Checkboxes -->
                <section class="mb-8 space-y-4">
                  <label class="flex items-start gap-3 cursor-pointer group">
                    <input
                      v-model="form.consentToElectronicSignature"
                      type="checkbox"
                      class="w-5 h-5 mt-0.5 accent-yellow-500 flex-shrink-0"
                    />
                    <span class="text-sm text-gray-300 group-hover:text-white transition">
                      <strong>I consent to electronic signature.</strong> I understand that my typed name constitutes a legally binding electronic signature under the E-SIGN Act (15 U.S.C. 7001 et seq.) and UETA, equivalent to a handwritten signature.
                    </span>
                  </label>

                  <label class="flex items-start gap-3 cursor-pointer group">
                    <input
                      v-model="form.agreedToTerms"
                      type="checkbox"
                      class="w-5 h-5 mt-0.5 accent-yellow-500 flex-shrink-0"
                    />
                    <span class="text-sm text-gray-300 group-hover:text-white transition">
                      <strong>I have read, understood, and agree to all terms</strong> of this Release of Liability, Media Consent & Trauma-Informed Participation Agreement. I am at least 18 years of age.
                    </span>
                  </label>
                </section>

                <!-- Submit -->
                <button
                  @click="handleSignWaiver"
                  :disabled="!canSign || submitting"
                  class="w-full py-4 px-6 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold text-lg rounded-lg transition"
                >
                  <span v-if="!submitting">Sign & Submit Waiver</span>
                  <span v-else class="flex items-center justify-center gap-2">
                    <div class="animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full"></div>
                    Signing...
                  </span>
                </button>

                <p class="text-center text-xs text-gray-500 mt-3">
                  Your IP address, browser information, and timestamp will be recorded as part of the signing audit trail.
                </p>
              </div>
            </div>
          </div>

          <!-- Print button (for unsigned waiver review) -->
          <div class="mt-6 text-center print:hidden">
            <button
              @click="handlePrintWaiver"
              class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
            >
              Print Waiver
            </button>
          </div>

          <!-- Footer -->
          <div class="mt-8 text-center text-xs text-gray-500 print:mt-4">
            <p>Veterans Scene | veteransscene.org | veteransscene@gmail.com</p>
            <p class="mt-2">This is not affiliated with or endorsed by the U.S. Department of Veterans Affairs.</p>
          </div>
        </div>
      </div>
    </div>
  `
};
