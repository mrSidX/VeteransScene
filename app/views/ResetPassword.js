import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../services/api.js';
import { useAuthStore } from '../stores/auth.js';

export default {
  name: 'ResetPassword',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    const token = ref('');
    const newPassword = ref('');
    const confirmPassword = ref('');
    const error = ref('');
    const success = ref('');
    const loading = ref(false);
    const tokenValid = ref(true);

    onMounted(() => {
      console.log('ResetPassword component mounted');
      // Get token from URL query parameter
      token.value = route.query.token || '';
      console.log('Token from URL:', token.value ? 'present (length: ' + token.value.length + ')' : 'missing');

      if (!token.value) {
        error.value = 'Invalid or missing reset token. Please request a new password reset link.';
        tokenValid.value = false;
        console.warn('No token provided');
      } else {
        console.log('Token validated, form ready');
      }
    });

    const validatePassword = () => {
      if (newPassword.value.length < 8) {
        return 'Password must be at least 8 characters long';
      }
      if (newPassword.value !== confirmPassword.value) {
        return 'Passwords do not match';
      }
      return null;
    };

    // Check if form is valid
    const isFormValid = computed(() => {
      const checks = {
        passwordLength: newPassword.value.length >= 8,
        confirmLength: confirmPassword.value.length >= 8,
        passwordsMatch: newPassword.value === confirmPassword.value,
        tokenValid: tokenValid.value
      };
      const result = checks.passwordLength && checks.confirmLength && checks.passwordsMatch && checks.tokenValid;
      if (!result) {
        console.log('isFormValid computed:', checks, 'result:', result);
        console.log('newPassword value:', JSON.stringify(newPassword.value));
        console.log('confirmPassword value:', JSON.stringify(confirmPassword.value));
        console.log('Are they equal?', newPassword.value === confirmPassword.value);
      }
      return result;
    });

    const handleSubmit = async () => {
      console.log('===== Reset password form submitted =====');
      console.log('isFormValid:', isFormValid.value);
      console.log('loading:', loading.value);
      console.log('success:', success.value);
      console.log('Token:', token.value ? 'present' : 'missing');
      console.log('New password length:', newPassword.value.length);
      console.log('Passwords match:', newPassword.value === confirmPassword.value);

      error.value = '';
      success.value = '';

      // Validate passwords
      const validationError = validatePassword();
      if (validationError) {
        console.error('Validation error:', validationError);
        error.value = validationError;
        return;
      }

      loading.value = true;

      try {
        console.log('Calling reset-password API...');
        const data = await api.post('/auth/reset-password', {
          token: token.value,
          newPassword: newPassword.value
        }, { auth: false });

        console.log('API response:', data);

        if (data.success) {
          success.value = 'Password reset successful! Redirecting to login...';
          console.log('Password reset successful');

          // Redirect to login after 2 seconds
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          error.value = data.message || 'Failed to reset password';
          console.error('Reset failed:', data.message);
        }
      } catch (err) {
        console.error('Reset password error:', err);
        error.value = err.message || 'An error occurred. Please try again.';
        if (err.message && err.message.includes('Invalid or expired')) {
          tokenValid.value = false;
        }
      } finally {
        loading.value = false;
      }
    };

    const requestNewLink = () => {
      router.push('/forgot-password');
    };

    const isButtonDisabled = () => {
      const disabled = !isFormValid.value || loading.value || success.value !== '';
      console.log('isButtonDisabled called:', {
        isFormValid: isFormValid.value,
        loading: loading.value,
        success: success.value,
        result: disabled
      });
      return disabled;
    };

    return {
      token,
      newPassword,
      confirmPassword,
      error,
      success,
      loading,
      tokenValid,
      isFormValid,
      isButtonDisabled,
      handleSubmit,
      requestNewLink
    };
  },
  template: `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12">
      <div class="max-w-md w-full space-y-8">
        <!-- Back to Home Button -->
        <div class="flex justify-start">
          <a href="/" class="inline-flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition font-medium text-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Veterans Scene - Home
          </a>
        </div>

        <div>
          <img src="/assets/img/vs-logo.jpg" alt="Logo" class="mx-auto h-16 w-16 rounded-lg">
          <h2 class="mt-6 text-center text-3xl font-extrabold text-yellow-400">
            Reset Your Password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-400">
            Enter your new password below
          </p>
        </div>

        <form v-if="tokenValid" @submit.prevent="handleSubmit" class="mt-8 space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl">
          <!-- Debug Info Box -->
          <div class="bg-blue-900/20 border border-blue-700 rounded p-3 text-xs text-blue-300 space-y-1">
            <div><strong>Form Status:</strong></div>
            <div>• Token: <span class="font-mono text-yellow-400">{{ token ? '✓ present' : '✗ missing' }}</span></div>
            <div>• Password: <span class="font-mono text-yellow-400">{{ newPassword.length }}/8 chars</span></div>
            <div>• Match: <span class="font-mono text-yellow-400">{{ newPassword === confirmPassword ? '✓ yes' : '✗ no' }}</span></div>
            <div>• isFormValid: <span class="font-mono text-yellow-400">{{ isFormValid }}</span></div>
            <div>• loading: <span class="font-mono text-yellow-400">{{ loading }}</span></div>
            <div>• success: <span class="font-mono text-yellow-400">'{{ success }}'</span></div>
            <div>• isButtonDisabled(): <span class="font-mono text-yellow-400">{{ isButtonDisabled() }}</span></div>
          </div>

          <div v-if="error" class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded font-semibold">
            ❌ {{ error }}
          </div>

          <div v-if="success" class="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded font-semibold">
            ✅ {{ success }}
          </div>

          <div class="space-y-4">
            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                v-model="newPassword"
                type="password"
                required
                minlength="8"
                class="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                placeholder="Min. 8 characters"
              />
              <p class="mt-1 text-xs text-gray-400">Must be at least 8 characters long</p>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                required
                minlength="8"
                class="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="isButtonDisabled()"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-yellow-400 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <span v-if="loading">🔄 Resetting Password...</span>
              <span v-else>✓ Reset Password</span>
            </button>
            <p v-if="!isFormValid && newPassword.length > 0" class="mt-2 text-xs text-red-400">
              ⚠️ Passwords must be 8+ characters and match
            </p>
          </div>

          <div class="text-center">
            <a href="/login" class="text-sm text-yellow-400 hover:text-yellow-300">
              ← Back to Login
            </a>
          </div>
        </form>

        <div v-else class="mt-8 bg-gray-800 p-8 rounded-lg shadow-xl">
          <div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
            {{ error }}
          </div>

          <button
            @click="requestNewLink"
            class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-yellow-400 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition"
          >
            Request New Reset Link
          </button>

          <div class="mt-4 text-center">
            <a href="/login" class="text-sm text-yellow-400 hover:text-yellow-300">
              ← Back to Login
            </a>
          </div>
        </div>

        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 class="text-sm font-medium text-gray-300 mb-2">Password Requirements:</h3>
          <ul class="text-xs text-gray-400 space-y-1">
            <li>• Minimum 8 characters</li>
            <li>• Should contain a mix of letters and numbers</li>
            <li>• Avoid using common words or personal information</li>
          </ul>
        </div>
      </div>
    </div>
  `
};
