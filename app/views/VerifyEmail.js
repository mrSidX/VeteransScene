import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../services/api.js';

export default {
  name: 'VerifyEmail',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const loading = ref(true);
    const success = ref(false);
    const error = ref('');
    const message = ref('');

    const verifyEmail = async () => {
      try {
        loading.value = true;
        error.value = '';
        success.value = false;

        const token = route.query.token;
        console.log('Verify email called with token:', token ? 'present' : 'missing');

        if (!token) {
          error.value = 'No verification token provided. Invalid or expired link.';
          loading.value = false;
          return;
        }

        // Call API to verify email
        console.log('Calling verify-email API...');
        const response = await api.post('/auth/verify-email', { token }, { auth: false });
        console.log('Verify response:', response);

        if (response.success) {
          success.value = true;
          message.value = response.message || 'Email verified successfully!';
          console.log('Email verified successfully');

          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          error.value = response.message || 'Verification failed. Please try again.';
        }
      } catch (err) {
        console.error('Verification error:', err);
        error.value = err.message || 'Failed to verify email. Token may be expired or invalid.';
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      console.log('VerifyEmail component mounted');
      verifyEmail();
    });

    return {
      loading,
      success,
      error,
      message
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full">
        <!-- Loading State -->
        <div v-if="loading" class="text-center">
          <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-yellow-300 mb-6"></div>
          <h1 class="text-3xl font-bold text-white mb-2">Verifying Email...</h1>
          <p class="text-gray-400">Please wait while we confirm your email address.</p>
        </div>

        <!-- Success State -->
        <div v-else-if="success" class="bg-gray-800 border-2 border-green-600 rounded-lg p-8 text-center">
          <div class="text-6xl mb-4">✅</div>
          <h1 class="text-3xl font-bold text-green-400 mb-2">Email Verified!</h1>
          <p class="text-gray-300 mb-6">{{ message }}</p>
          <div class="bg-green-900/30 border border-green-600 rounded-lg p-4 mb-6">
            <p class="text-sm text-green-300">
              Your account is now fully activated. You can log in with your credentials.
            </p>
          </div>
          <p class="text-gray-400 text-sm">
            Redirecting to login in 3 seconds...
          </p>
          <router-link to="/" class="inline-block mt-6 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-bold transition">
            Go to Login
          </router-link>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-gray-800 border-2 border-red-600 rounded-lg p-8 text-center">
          <div class="text-6xl mb-4">❌</div>
          <h1 class="text-3xl font-bold text-red-400 mb-2">Verification Failed</h1>
          <div class="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
            <p class="text-sm text-red-300">{{ error }}</p>
          </div>
          <p class="text-gray-400 text-sm mb-6">
            The verification link may be expired or invalid. Please try registering again or contact support.
          </p>
          <div class="flex gap-3">
            <router-link to="/" class="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-bold transition">
              Back to Login
            </router-link>
          </div>
        </div>

        <!-- Fallback (should not show) -->
        <div v-else class="text-center text-gray-400">
          Processing...
        </div>
      </div>
    </div>
  `
};
