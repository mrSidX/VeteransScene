import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import api from '../services/api.js';

export default {
  name: 'SiteSettings',
  setup() {
    const authStore = useAuthStore();
    const isSuperAdmin = authStore.isSuperAdmin;

    const activeSection = ref('highlights');
    const setSection = (s) => { activeSection.value = s; };

    // --- Feature flags ---
    const features = ref({ costTransparencyEnabled: false, stripeMode: 'test' });
    const featuresLoading = ref(false);
    const featuresSaving = ref(false);
    const featuresError = ref('');
    const featuresStatus = ref('');

    const loadFeatures = async () => {
      featuresLoading.value = true;
      featuresError.value = '';
      try {
        const res = await api.get('/site-settings', { auth: false });
        if (res.success) features.value = { ...features.value, ...res.data };
      } catch (err) {
        featuresError.value = err.message || 'Failed to load features';
      } finally {
        featuresLoading.value = false;
      }
    };

    const saveFeatures = async () => {
      if (!isSuperAdmin.value) return;
      featuresSaving.value = true;
      featuresError.value = '';
      featuresStatus.value = '';
      try {
        const res = await api.put('/site-settings', features.value);
        if (res.success) {
          features.value = { ...features.value, ...res.data };
          featuresStatus.value = 'Saved';
          setTimeout(() => { featuresStatus.value = ''; }, 2000);
        }
      } catch (err) {
        featuresError.value = err.message || 'Failed to save features';
      } finally {
        featuresSaving.value = false;
      }
    };

    onMounted(loadFeatures);

    return {
      activeSection, setSection, isSuperAdmin,
      features, featuresLoading, featuresSaving, featuresError, featuresStatus,
      saveFeatures
    };
  },
  template: `
    <div class="container mx-auto px-4 py-6 max-w-5xl">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-2 bg-gray-700 rounded-lg">
            <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">Site Settings</h1>
            <p class="text-gray-400 text-sm">Configure site-wide assets and display options</p>
          </div>
        </div>
      </div>

      <!-- Settings Navigation -->
      <div class="flex gap-2 mb-6 border-b border-gray-700 pb-3 flex-wrap">
        <button
          @click="setSection('highlights')"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            activeSection === 'highlights'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
          ]"
        >
          Highlights Display
        </button>
        <button
          @click="setSection('branding')"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            activeSection === 'branding'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
          ]"
        >
          Branding
        </button>
        <button
          @click="setSection('general')"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            activeSection === 'general'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
          ]"
        >
          General
        </button>
        <button
          v-if="isSuperAdmin"
          @click="setSection('features')"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5',
            activeSection === 'features'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          Features
          <span class="text-xs px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200">Super Admin</span>
        </button>
      </div>

      <!-- Highlights Display Settings -->
      <div v-if="activeSection === 'highlights'" class="space-y-6">
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Highlights OBS Template</h2>
          <p class="text-gray-400 text-sm mb-6">Configure the branding and assets shown on the highlight OBS display overlay.</p>

          <div class="space-y-5">
            <!-- Logo Asset -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Logo Graphic</label>
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden">
                  <img src="/assets/img/vs-logo.jpg" alt="Current logo" class="w-full h-full object-cover" />
                </div>
                <div class="text-gray-500 text-sm">
                  <p>Current: <code class="text-gray-400">/assets/img/vs-logo.jpg</code></p>
                  <p class="text-xs mt-1">Logo upload and selection coming soon</p>
                </div>
              </div>
            </div>

            <!-- Domain Name -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Display Domain</label>
              <input
                type="text"
                value="VeteransScene.org"
                disabled
                class="w-full max-w-sm bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-4 py-2.5 text-sm cursor-not-allowed"
              />
              <p class="text-gray-500 text-xs mt-1">Editable domain text coming soon</p>
            </div>

            <!-- Branding Position -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Branding Position</label>
              <div class="flex gap-3">
                <span class="px-3 py-1.5 bg-yellow-600/20 border border-yellow-500/40 text-yellow-400 rounded-lg text-sm font-medium">Top Right</span>
                <span class="px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-500 rounded-lg text-sm">Top Left</span>
                <span class="px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-500 rounded-lg text-sm">Bottom Right</span>
                <span class="px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-500 rounded-lg text-sm">Bottom Left</span>
              </div>
              <p class="text-gray-500 text-xs mt-1">Position selection coming soon</p>
            </div>

            <!-- Preview -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Preview</label>
              <div class="relative bg-gray-900 border border-gray-600 rounded-lg overflow-hidden" style="aspect-ratio: 16/9; max-width: 640px;">
                <div class="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                  1920 x 1080 OBS Layout
                </div>
                <!-- Mini branding preview (top-right) -->
                <div class="absolute top-2 right-2 flex items-center gap-1.5 bg-gray-800/90 px-2 py-1 rounded border border-yellow-500/40">
                  <div class="w-5 h-5 bg-gray-700 rounded overflow-hidden">
                    <img src="/assets/img/vs-logo.jpg" alt="Logo" class="w-full h-full object-cover" />
                  </div>
                  <span class="text-yellow-400 text-xs font-bold">VeteransScene.org</span>
                </div>
                <!-- Profile area indicator -->
                <div class="absolute left-0 top-0 bottom-0 w-[30%] border-r border-dashed border-gray-600 flex items-center justify-center">
                  <span class="text-gray-600 text-xs">Profile Image</span>
                </div>
                <!-- Content area indicator -->
                <div class="absolute right-0 top-0 bottom-0 w-[70%] flex items-center justify-center">
                  <span class="text-gray-600 text-xs">Content Slides</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Branding Settings (placeholder) -->
      <div v-if="activeSection === 'branding'" class="space-y-6">
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 class="text-lg font-semibold text-white mb-2">Branding Assets</h2>
          <p class="text-gray-400 text-sm">Manage site-wide logos, colors, and branding materials.</p>
          <div class="mt-6 p-8 border-2 border-dashed border-gray-600 rounded-lg text-center">
            <svg class="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p class="text-gray-500 text-sm">Branding asset management coming soon</p>
          </div>
        </div>
      </div>

      <!-- General Settings (placeholder) -->
      <div v-if="activeSection === 'general'" class="space-y-6">
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 class="text-lg font-semibold text-white mb-2">General Settings</h2>
          <p class="text-gray-400 text-sm">Site-wide configuration options.</p>
          <div class="mt-6 p-8 border-2 border-dashed border-gray-600 rounded-lg text-center">
            <svg class="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
            <p class="text-gray-500 text-sm">General settings coming soon</p>
          </div>
        </div>
      </div>

      <!-- Features (Super Admin only) -->
      <div v-if="activeSection === 'features' && isSuperAdmin" class="space-y-6">
        <div class="bg-gray-800 border border-purple-800/50 rounded-xl p-6">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-lg font-semibold text-white">Public-Facing Features</h2>
            <span class="text-xs px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/60">Super Admin Only</span>
          </div>
          <p class="text-gray-400 text-sm mb-6">
            Toggle which optional public pages are accessible to visitors. Changes take effect immediately.
          </p>

          <div v-if="featuresLoading" class="text-gray-500 text-sm">Loading...</div>
          <div v-else class="space-y-5">

            <!-- Cost Transparency toggle -->
            <div class="p-4 rounded-lg bg-gray-900/60 border border-gray-700">
              <div class="flex items-start gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="font-semibold text-white">Cost Transparency</h3>
                    <span v-if="features.costTransparencyEnabled" class="text-xs px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">Enabled</span>
                    <span v-else class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">Hidden</span>
                  </div>
                  <p class="text-sm text-gray-400 mt-1">
                    Show the public <code class="text-teal-400">/transparency/costs</code> page (listing operating expenses and sponsorship options) and any front-facing links to it.
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    Admins can still manage expenses at <code class="text-gray-400">/expense-manager</code> regardless of this setting.
                  </p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    class="sr-only peer"
                    v-model="features.costTransparencyEnabled"
                  />
                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <!-- Quick links -->
              <div class="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-2">
                <router-link
                  to="/transparency/costs"
                  class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-teal-900/40 hover:bg-teal-900/60 text-teal-300 border border-teal-700/50 transition-all"
                >
                  <span>🏛️</span>
                  <span>View Transparency Page</span>
                  <span class="text-teal-400">→</span>
                </router-link>
                <router-link
                  v-if="isSuperAdmin.value"
                  to="/expense-manager"
                  class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-700/50 transition-all"
                >
                  <span>⚙️</span>
                  <span>Open Expense Manager</span>
                  <span class="text-purple-400">→</span>
                </router-link>
              </div>
            </div>

            <!-- Stripe Mode toggle -->
            <div class="p-4 rounded-lg bg-gray-900/60 border border-gray-700">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-white">Stripe Mode</h3>
                <span :class="['text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wide', features.stripeMode === 'live' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' : 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50']">
                  {{ features.stripeMode }}
                </span>
              </div>
              <p class="text-sm text-gray-400 mb-3">
                Switch between test and live Stripe keys for contribution payments. In
                <span class="text-yellow-300 font-semibold">test</span> mode no real charges happen — use
                <code class="text-gray-400">4242 4242 4242 4242</code> with any future date and CVC to simulate a payment.
              </p>
              <p class="text-xs text-gray-500 mb-3">
                Secret keys are stored server-side only. Publishable keys are served to the frontend via
                <code class="text-gray-400">/api/site-settings/stripe-public-key</code>.
              </p>
              <div class="flex gap-2">
                <button
                  @click="features.stripeMode = 'test'"
                  :class="['px-4 py-2 rounded-lg text-sm font-semibold transition-all', features.stripeMode === 'test' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700']"
                >
                  Test Mode
                </button>
                <button
                  @click="features.stripeMode = 'live'"
                  :class="['px-4 py-2 rounded-lg text-sm font-semibold transition-all', features.stripeMode === 'live' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700']"
                >
                  Live Mode
                </button>
              </div>
              <div v-if="features.stripeMode === 'live'" class="mt-3 text-xs text-amber-300 bg-amber-900/20 border border-amber-800/60 rounded p-2">
                ⚠ Live mode processes real payments. Make sure <code>STRIPE_LIVE_SECRET_KEY</code> and <code>STRIPE_LIVE_WEBHOOK_SECRET</code> are set in the server's <code>.env</code> file.
              </div>
            </div>

            <div v-if="featuresError" class="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
              {{ featuresError }}
            </div>

            <div class="flex items-center gap-3">
              <button
                @click="saveFeatures"
                :disabled="featuresSaving"
                class="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold"
              >
                {{ featuresSaving ? 'Saving...' : 'Save Changes' }}
              </button>
              <span v-if="featuresStatus" class="text-sm text-emerald-400">{{ featuresStatus }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
