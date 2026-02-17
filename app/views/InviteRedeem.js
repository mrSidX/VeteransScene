import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

export default {
  name: 'InviteRedeem',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    const state = ref('loading'); // 'loading', 'success', 'error', 'already_redeemed'
    const errorMessage = ref('');
    const userData = ref(null);
    const sessionId = ref(null);

    onMounted(async () => {
      try {
        const token = route.params.token;

        if (!token) {
          state.value = 'error';
          errorMessage.value = 'No invitation token provided';
          return;
        }

        // Redeem the invitation token
        const response = await window.api.redeemInvitation(token);

        if (response.success) {
          // Store auth token and user data
          authStore.setToken(response.data.token);
          authStore.setUser(response.data.user);
          userData.value = response.data.user;
          sessionId.value = response.data.sessionId;

          state.value = 'success';

          // Redirect to recording studio after a brief delay
          setTimeout(() => {
            if (sessionId.value) {
              router.push(`/recording/${sessionId.value}`);
            } else {
              router.push('/');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error redeeming invitation:', error);

        if (error.data?.code === 'already_redeemed') {
          state.value = 'already_redeemed';
          errorMessage.value = 'This invitation has already been redeemed. Please log in with your account.';
        } else {
          state.value = 'error';
          errorMessage.value = error.message || 'Failed to redeem invitation. The link may be expired or invalid.';
        }
      }
    });

    return {
      state,
      errorMessage,
      userData
    };
  },

  template: `
    <div class="min-h-screen bg-gradient-to-b from-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Loading State -->
        <div v-if="state === 'loading'" class="bg-slate-800 rounded-xl shadow-2xl p-8 border border-blue-700">
          <div class="text-center">
            <div class="inline-block">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-yellow-400"></div>
            </div>
            <h2 class="text-2xl font-bold text-white mt-6 mb-2">Processing Your Invitation</h2>
            <p class="text-gray-300">Please wait while we prepare your recording session...</p>
          </div>
        </div>

        <!-- Success State -->
        <div v-else-if="state === 'success'" class="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-xl shadow-2xl p-8 border border-emerald-500">
          <div class="text-center">
            <div class="text-5xl mb-4">✅</div>
            <h2 class="text-2xl font-bold text-white mb-2">Invitation Accepted!</h2>
            <p class="text-emerald-100 mb-6">
              Welcome! Your recording session is ready. Redirecting you now...
            </p>
            <div class="bg-emerald-950 rounded-lg p-4 text-left mb-6">
              <p class="text-sm text-emerald-200 mb-2">
                <span class="font-semibold">Account Type:</span>
                <span v-if="userData?.isTemporary" class="text-yellow-300">Temporary Guest Account</span>
                <span v-else class="text-emerald-300">Your Existing Account</span>
              </p>
              <p class="text-sm text-emerald-200">
                <span class="font-semibold">Email:</span> {{ userData?.email }}
              </p>
            </div>
            <p class="text-sm text-emerald-100">
              If you aren't redirected automatically,
              <router-link to="/" class="text-yellow-400 hover:text-yellow-300 font-semibold">click here</router-link>.
            </p>
          </div>
        </div>

        <!-- Already Redeemed State -->
        <div v-else-if="state === 'already_redeemed'" class="bg-amber-900 rounded-xl shadow-2xl p-8 border border-amber-600">
          <div class="text-center">
            <div class="text-4xl mb-4">⚠️</div>
            <h2 class="text-2xl font-bold text-white mb-2">Invitation Already Used</h2>
            <p class="text-amber-100 mb-6">{{ errorMessage }}</p>
            <div class="space-y-3">
              <router-link to="/login" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition">
                Sign In to Your Account
              </router-link>
              <router-link to="/" class="block w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition">
                Return to Home
              </router-link>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="state === 'error'" class="bg-red-900 rounded-xl shadow-2xl p-8 border border-red-600">
          <div class="text-center">
            <div class="text-4xl mb-4">❌</div>
            <h2 class="text-2xl font-bold text-white mb-2">Invalid Invitation</h2>
            <p class="text-red-100 mb-6">{{ errorMessage }}</p>
            <div class="space-y-3">
              <router-link to="/apply" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition">
                Submit Your Application
              </router-link>
              <router-link to="/" class="block w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition">
                Return to Home
              </router-link>
            </div>
          </div>
        </div>

        <!-- Branding Footer -->
        <div class="text-center mt-8">
          <p class="text-gray-400 text-sm">Veteran's Scene Podcast Platform</p>
        </div>
      </div>
    </div>
  `
};
